-- 20260929001500_real_intervention_postgis_foundation.sql
-- JALDRISHTI CHUNK 5 — Real Intervention PostGIS Schema & FeatureCollection RPC

begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

--------------------------------------------------------------------------------
-- 1. Ensure Reference Intervention Types Catalog Contains Required Categories
--------------------------------------------------------------------------------

create table if not exists public.intervention_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'RETIRED')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.intervention_types (code, name, description)
values
  ('CHECK_DAM', 'Check Dam', 'Barrier across a drainage ditch, stream, or channel to lower water velocity and reduce soil erosion.'),
  ('FARM_POND', 'Farm Pond', 'Dug-out or embankment pond constructed on agricultural land to harvest rainwater.'),
  ('CONTOUR_BUND', 'Contour Bund', 'Embankment constructed along natural contour lines to intercept and store surface runoff.'),
  ('PERCOLATION_TANK', 'Percolation Tank', 'Artificially created surface water body designed to submerge permeable land for recharging groundwater.'),
  ('RECHARGE_STRUCTURE', 'Recharge Structure', 'Engineered subsurface or surface groundwater recharge pit, shaft, or injection well.'),
  ('WATERSHED_TREATMENT', 'Watershed Treatment', 'Catchment and drainage area soil-water biological and vegetative conservation treatment.'),
  ('OTHER', 'Other', 'Other verified official watershed intervention.')
on conflict (code) do update set
  name = excluded.name,
  description = coalesce(public.intervention_types.description, excluded.description);

--------------------------------------------------------------------------------
-- 2. Interventions Table Column Alignment
--------------------------------------------------------------------------------

do $$
begin
  -- village_id
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'village_id'
  ) then
    alter table public.interventions add column village_id uuid references public.villages(id) on delete set null;
  end if;

  -- type (text representation matching standard nomenclature)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'type'
  ) then
    alter table public.interventions add column type text;
  end if;

  -- latitude
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'latitude'
  ) then
    alter table public.interventions add column latitude numeric(10, 7);
  end if;

  -- longitude
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'longitude'
  ) then
    alter table public.interventions add column longitude numeric(10, 7);
  end if;

  -- start_date
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'start_date'
  ) then
    alter table public.interventions add column start_date date;
    update public.interventions set start_date = coalesce(actual_start, planned_start) where start_date is null;
  end if;

  -- completion_date
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'completion_date'
  ) then
    alter table public.interventions add column completion_date date;
    update public.interventions set completion_date = actual_end where completion_date is null;
  end if;

  -- source
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'source'
  ) then
    alter table public.interventions add column source text;
  end if;

  -- provenance
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'provenance'
  ) then
    alter table public.interventions add column provenance text;
  end if;

  -- provenance_id
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'provenance_id'
  ) then
    alter table public.interventions add column provenance_id uuid references public.provenance(id) on delete set null;
  end if;
end;
$$;

-- Spatial and relational indexing
create index if not exists interventions_location_gist on public.interventions using gist (location);
create index if not exists interventions_village_id_idx on public.interventions (village_id);
create index if not exists interventions_watershed_id_idx on public.interventions (watershed_id);
create index if not exists interventions_type_idx on public.interventions (type);
create index if not exists interventions_status_idx on public.interventions (status);

--------------------------------------------------------------------------------
-- 3. Trigger for Spatial Synchronization & Date Alignment
--------------------------------------------------------------------------------

create or replace function public.fn_interventions_sync_spatial_and_dates()
returns trigger
language plpgsql
as $function$
begin
  -- 1. Sync geometry <-> latitude/longitude
  if NEW.location is not null then
    NEW.latitude := extensions.st_y(NEW.location)::numeric(10, 7);
    NEW.longitude := extensions.st_x(NEW.location)::numeric(10, 7);
  elsif NEW.latitude is not null and NEW.longitude is not null then
    NEW.location := extensions.st_setsrid(extensions.st_makepoint(NEW.longitude, NEW.latitude), 4326);
  end if;

  -- 2. Sync start_date and completion_date
  if NEW.start_date is not null and NEW.planned_start is null then
    NEW.planned_start := NEW.start_date;
  elsif NEW.planned_start is not null and NEW.start_date is null then
    NEW.start_date := NEW.planned_start;
  end if;

  if NEW.completion_date is not null and NEW.actual_end is null then
    NEW.actual_end := NEW.completion_date;
  elsif NEW.actual_end is not null and NEW.completion_date is null then
    NEW.completion_date := NEW.actual_end;
  end if;

  -- 3. Sync intervention type text <-> intervention_type_id
  if NEW.type is not null and NEW.intervention_type_id is null then
    select id into NEW.intervention_type_id
    from public.intervention_types
    where upper(name) = upper(NEW.type) or upper(code) = upper(replace(NEW.type, ' ', '_'))
    limit 1;
  elsif NEW.intervention_type_id is not null and (NEW.type is null or NEW.type = '') then
    select name into NEW.type
    from public.intervention_types
    where id = NEW.intervention_type_id;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$function$;

drop trigger if exists trg_interventions_sync_spatial_and_dates on public.interventions;
create trigger trg_interventions_sync_spatial_and_dates
before insert or update on public.interventions
for each row
execute function public.fn_interventions_sync_spatial_and_dates();

--------------------------------------------------------------------------------
-- 4. Authoritative Intervention FeatureCollection RPC
--------------------------------------------------------------------------------

create or replace function public.get_intervention_feature_collection(
  target_watershed_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'id', i.id,
          'geometry', extensions.st_asgeojson(i.location)::jsonb,
          'properties', jsonb_build_object(
            'layerId', 'interventions',
            'code', coalesce(i.code, 'INT-' || upper(substr(i.id::text, 1, 8))),
            'name', i.name,
            'title', i.name,
            'type', coalesce(i.type, it.name, 'Intervention'),
            'status', i.status,
            'district', coalesce(d.name, ''),
            'block', coalesce(b.name, ''),
            'village', coalesce(v.name, ''),
            'watershed', coalesce(w.watershed_name, w.name, ''),
            'intervention_id', i.id,
            'watershed_id', i.watershed_id,
            'village_id', i.village_id,
            'latitude', i.latitude,
            'longitude', i.longitude,
            'start_date', i.start_date,
            'completion_date', i.completion_date,
            'implementation_date', coalesce(i.completion_date, i.start_date, i.actual_end, i.planned_start)
          )
        ) order by coalesce(i.completion_date, i.start_date, i.created_at) desc
      ),
      '[]'::jsonb
    )
  )
  from public.interventions as i
  left join public.watersheds as w on w.id = i.watershed_id
  left join public.villages as v on v.id = coalesce(i.village_id, w.village_id)
  left join public.blocks as b on b.id = coalesce(v.block_id, w.block_id)
  left join public.districts as d on d.id = coalesce(b.district_id, w.district_id)
  left join public.intervention_types as it on it.id = i.intervention_type_id
  where i.location is not null
    and (target_watershed_id is null or i.watershed_id = target_watershed_id);
$function$;

-- Permissions: allow public and authenticated read access for map exploration
grant execute on function public.get_intervention_feature_collection(uuid) to authenticated, anon;

-- Ensure RLS policy allows public read for interventions
drop policy if exists "public_read_interventions" on public.interventions;
create policy "public_read_interventions" on public.interventions for select using (true);

commit;
