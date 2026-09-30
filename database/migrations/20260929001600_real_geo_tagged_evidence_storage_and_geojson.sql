-- Migration: 20260929001600_real_geo_tagged_evidence_storage_and_geojson.sql
-- JALDRISHTI CHUNK 6: Real Geo-Tagged Evidence Foundation, Storage Policies, and RPC

create extension if not exists postgis with schema extensions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'geo-photos',
  'geo-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Field Photo',
  description text,
  category text not null default 'Water Structure',
  watershed_id uuid references public.watersheds(id) on delete restrict,
  intervention_id uuid references public.interventions(id) on delete set null,
  district text,
  block text,
  village text,
  latitude numeric,
  longitude numeric,
  location extensions.geometry(Point, 4326),
  captured_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING', 'VERIFIED', 'REJECTED')),
  storage_path text,
  image_url text,
  thumbnail_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'evidence_latitude_range'
  ) then
    alter table public.evidence add constraint evidence_latitude_range
      check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'evidence_longitude_range'
  ) then
    alter table public.evidence add constraint evidence_longitude_range
      check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;
end $$;

create or replace function public.sync_evidence_geometry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.location is not null and (new.latitude is null or new.longitude is null) then
    new.longitude := extensions.st_x(new.location);
    new.latitude := extensions.st_y(new.location);
  elsif new.latitude is not null and new.longitude is not null and new.location is null then
    new.location := extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326);
  elsif new.latitude is not null and new.longitude is not null and new.location is not null then
    if new.longitude <> extensions.st_x(new.location) or new.latitude <> extensions.st_y(new.location) then
      new.location := extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326);
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_evidence_sync_geometry on public.evidence;
create trigger trg_evidence_sync_geometry
before insert or update on public.evidence
for each row
execute function public.sync_evidence_geometry();

create index if not exists evidence_location_gist on public.evidence using gist (location);
create index if not exists evidence_watershed_id_idx on public.evidence (watershed_id);
create index if not exists evidence_intervention_id_idx on public.evidence (intervention_id);
create index if not exists evidence_verification_status_idx on public.evidence (verification_status);
create index if not exists evidence_captured_at_idx on public.evidence (captured_at desc);

alter table public.evidence enable row level security;

drop policy if exists evidence_select_authenticated on public.evidence;
create policy evidence_select_authenticated on public.evidence
  for select to authenticated
  using (true);

drop policy if exists evidence_select_public on public.evidence;
create policy evidence_select_public on public.evidence
  for select to anon
  using (true);

drop policy if exists evidence_insert_authenticated on public.evidence;
create policy evidence_insert_authenticated on public.evidence
  for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists evidence_update_authenticated on public.evidence;
create policy evidence_update_authenticated on public.evidence
  for update to authenticated
  using (
    auth.uid() = uploaded_by
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('ADMINISTRATOR', 'NODAL_OFFICER', 'GIS_ANALYST', 'VERIFIER')
    )
  );

drop policy if exists geo_photos_storage_upload on storage.objects;
create policy geo_photos_storage_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'geo-photos'
  );

drop policy if exists geo_photos_storage_select on storage.objects;
create policy geo_photos_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'geo-photos'
  );

create or replace function public.get_geo_photo_feature_collection(
  target_watershed_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'id', e.id,
          'geometry', extensions.st_asgeojson(e.location)::jsonb,
          'properties', jsonb_build_object(
            'layerId', 'geo-tagged-photos',
            'id', e.id,
            'image_id', e.id,
            'title', e.title,
            'description', e.description,
            'category', e.category,
            'watershed_id', e.watershed_id,
            'watershed', coalesce(w.name, ''),
            'intervention_id', e.intervention_id,
            'district', coalesce(e.district, ''),
            'block', coalesce(e.block, ''),
            'village', coalesce(e.village, ''),
            'latitude', coalesce(e.latitude, extensions.st_y(e.location)),
            'longitude', coalesce(e.longitude, extensions.st_x(e.location)),
            'captured_at', e.captured_at,
            'date', to_char(e.captured_at, 'YYYY-MM-DD'),
            'uploaded_by', e.uploaded_by,
            'verification_status', e.verification_status,
            'status', e.verification_status,
            'storage_path', e.storage_path,
            'thumbnail_url', coalesce(e.thumbnail_url, e.image_url)
          )
        )
        order by e.captured_at desc
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.evidence e
  left join public.watersheds w on e.watershed_id = w.id
  where e.location is not null
    and (target_watershed_id is null or e.watershed_id = target_watershed_id);

  return result;
end;
$$;

grant execute on function public.get_geo_photo_feature_collection(uuid) to authenticated, anon;
