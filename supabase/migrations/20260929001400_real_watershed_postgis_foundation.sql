-- 20260929001400_real_watershed_postgis_foundation.sql
-- JALDRISHTI CHUNK 4 — Real Watershed Data Foundation & Explorer RPC

begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

--------------------------------------------------------------------------------
-- 1. Watersheds Table Column Alignment for Official ISRO/Bhuvan Data
--------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'watershed_code'
  ) then
    alter table public.watersheds add column watershed_code text;
    update public.watersheds set watershed_code = code where watershed_code is null;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'watershed_name'
  ) then
    alter table public.watersheds add column watershed_name text;
    update public.watersheds set watershed_name = name where watershed_name is null;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'linked_village_code'
  ) then
    alter table public.watersheds add column linked_village_code text;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'area_km2'
  ) then
    alter table public.watersheds add column area_km2 numeric(14, 4);
    update public.watersheds set area_km2 = area_sq_km where area_km2 is null;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'centroid_latitude'
  ) then
    alter table public.watersheds add column centroid_latitude numeric(10, 7);
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'centroid_longitude'
  ) then
    alter table public.watersheds add column centroid_longitude numeric(10, 7);
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'source'
  ) then
    alter table public.watersheds add column source text;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'provenance'
  ) then
    alter table public.watersheds add column provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object');
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'provenance_id'
  ) then
    alter table public.watersheds add column provenance_id uuid references public.provenance(id) on delete set null;
  end if;
end;
$$;

create index if not exists watersheds_code_idx on public.watersheds (watershed_code);
create index if not exists watersheds_linked_village_code_idx on public.watersheds (linked_village_code);

--------------------------------------------------------------------------------
-- 2. Trigger to Sync Geometry Centroid, Area, and Field Aliases
--------------------------------------------------------------------------------

create or replace function public.sync_watershed_geometry_and_codes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Sync code and watershed_code
  if new.watershed_code is not null and new.code is null then
    new.code := new.watershed_code;
  elsif new.code is not null and new.watershed_code is null then
    new.watershed_code := new.code;
  end if;

  -- Sync name and watershed_name
  if new.watershed_name is not null and new.name is null then
    new.name := new.watershed_name;
  elsif new.name is not null and new.watershed_name is null then
    new.watershed_name := new.name;
  end if;

  -- Sync area_km2 and area_sq_km
  if new.area_km2 is not null and new.area_sq_km is null then
    new.area_sq_km := new.area_km2;
  elsif new.area_sq_km is not null and new.area_km2 is null then
    new.area_km2 := new.area_sq_km;
  end if;

  -- Compute centroid and area if boundary exists
  if new.boundary is not null then
    if new.centroid_latitude is null or new.centroid_longitude is null then
      new.centroid_latitude := round(extensions.st_y(extensions.st_centroid(new.boundary))::numeric, 7);
      new.centroid_longitude := round(extensions.st_x(extensions.st_centroid(new.boundary))::numeric, 7);
    end if;

    if new.area_km2 is null then
      new.area_km2 := round((extensions.st_area(new.boundary::extensions.geography) / 1000000.0)::numeric, 4);
      new.area_sq_km := new.area_km2;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_watersheds_sync_geometry on public.watersheds;
create trigger trg_watersheds_sync_geometry
before insert or update on public.watersheds
for each row
execute function public.sync_watershed_geometry_and_codes();

--------------------------------------------------------------------------------
-- 3. Update get_watershed_explorer_feature_collection() RPC
--------------------------------------------------------------------------------

create or replace function public.get_watershed_explorer_feature_collection()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with watershed_features as (
    select jsonb_build_object(
      'type', 'Feature',
      'id', watershed.id,
      'geometry', extensions.st_asgeojson(watershed.boundary)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'watershed-boundary',
        'title', coalesce(watershed.watershed_name, watershed.name),
        'code', coalesce(watershed.watershed_code, watershed.code),
        'district', coalesce(d.name, watershed.metadata->>'district', ''),
        'block', coalesce(b.name, watershed.metadata->>'block', ''),
        'village', coalesce(v.name, watershed.metadata->>'village', ''),
        'areaKm2', coalesce(watershed.area_km2, watershed.area_sq_km, (watershed.metadata->>'area_km2')::numeric),
        'status', watershed.status,
        'centroid_latitude', coalesce(watershed.centroid_latitude, (watershed.metadata->>'centroid_latitude')::numeric),
        'centroid_longitude', coalesce(watershed.centroid_longitude, (watershed.metadata->>'centroid_longitude')::numeric),
        'watershed_id', watershed.id
      )
    ) as feature,
    watershed.updated_at as sort_date
    from public.watersheds as watershed
    left join public.districts as d on d.id = watershed.district_id
    left join public.villages as v on v.id = watershed.village_id or (watershed.linked_village_code is not null and v.code = watershed.linked_village_code)
    left join public.blocks as b on b.id = v.block_id
    where watershed.boundary is not null
    order by watershed.updated_at desc
    limit 2000
  ), linked_photos as (
    select jsonb_build_object(
      'type', 'Feature',
      'id', photo.id,
      'geometry', extensions.st_asgeojson(photo.location)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'geo-tagged-photos',
        'title', coalesce(photo.title, photo.file_name, 'Field Evidence'),
        'image_id', photo.id,
        'watershed_id', photo.watershed_id,
        'captured_at', photo.captured_at,
        'verification_status', photo.verification_status,
        'gps_validation', photo.gps_validation
      )
    ) as feature,
    photo.captured_at as sort_date
    from public.geo_photos as photo
    where photo.location is not null
    order by photo.captured_at desc nulls last
    limit 5000
  ), linked_interventions as (
    select jsonb_build_object(
      'type', 'Feature',
      'id', intervention.id,
      'geometry', extensions.st_asgeojson(intervention.location)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'interventions',
        'title', intervention.name,
        'intervention_id', intervention.id,
        'watershed_id', intervention.watershed_id,
        'status', intervention.status,
        'implementation_date', coalesce(intervention.actual_start, intervention.planned_start),
        'type', coalesce(intervention_type.name, 'Water Conservation')
      )
    ) as feature,
    intervention.created_at as sort_date
    from public.interventions as intervention
    left join public.intervention_types as intervention_type on intervention_type.id = intervention.intervention_type_id
    where intervention.location is not null
    order by intervention.created_at desc
    limit 5000
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(feature order by sort_date desc nulls last), '[]'::jsonb)
  )
  from (
    select feature, sort_date from watershed_features
    union all
    select feature, sort_date from linked_photos
    union all
    select feature, sort_date from linked_interventions
  ) as all_features;
$function$;

grant execute on function public.get_watershed_explorer_feature_collection() to authenticated, anon;

commit;
