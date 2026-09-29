-- 20260929001200_postgis_foundation_and_evidence.sql
-- JALDRISHTI CHUNK 2 — PostGIS Database Foundation and Relationships

begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

--------------------------------------------------------------------------------
-- 1. Administrative Geometries & Columns (districts, blocks, villages)
--------------------------------------------------------------------------------

-- Ensure geom column on districts
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'districts' and column_name = 'geom'
  ) then
    alter table public.districts add column geom extensions.geometry(MultiPolygon, 4326);
    update public.districts set geom = boundary where geom is null and boundary is not null;
  end if;
end;
$$;

create index if not exists districts_geom_gist on public.districts using gist (geom);
create index if not exists districts_boundary_gist on public.districts using gist (boundary);

-- Ensure geom column on blocks
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'blocks' and column_name = 'geom'
  ) then
    alter table public.blocks add column geom extensions.geometry(MultiPolygon, 4326);
    update public.blocks set geom = boundary where geom is null and boundary is not null;
  end if;
end;
$$;

create index if not exists blocks_geom_gist on public.blocks using gist (geom);
create index if not exists blocks_boundary_gist on public.blocks using gist (boundary);

-- Ensure geom column on villages
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'villages' and column_name = 'geom'
  ) then
    alter table public.villages add column geom extensions.geometry(MultiPolygon, 4326);
    update public.villages set geom = boundary where geom is null and boundary is not null;
  end if;
end;
$$;

create index if not exists villages_geom_gist on public.villages using gist (geom);
create index if not exists villages_boundary_gist on public.villages using gist (boundary);

--------------------------------------------------------------------------------
-- 2. Watershed Relationships & Geometry
--------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'district_id'
  ) then
    alter table public.watersheds add column district_id uuid references public.districts(id) on delete set null;
  end if;
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'village_id'
  ) then
    alter table public.watersheds add column village_id uuid references public.villages(id) on delete set null;
  end if;
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'watersheds' and column_name = 'geom'
  ) then
    alter table public.watersheds add column geom extensions.geometry(MultiPolygon, 4326);
    update public.watersheds set geom = boundary where geom is null and boundary is not null;
  end if;
end;
$$;

create index if not exists watersheds_boundary_gist on public.watersheds using gist (boundary);
create index if not exists watersheds_geom_gist on public.watersheds using gist (geom);
create index if not exists watersheds_district_id_idx on public.watersheds (district_id);
create index if not exists watersheds_village_id_idx on public.watersheds (village_id);

--------------------------------------------------------------------------------
-- 3. Interventions Geometry & Relationship
--------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'interventions' and column_name = 'village_id'
  ) then
    alter table public.interventions add column village_id uuid references public.villages(id) on delete set null;
  end if;
end;
$$;

create index if not exists interventions_location_gist on public.interventions using gist (location);
create index if not exists interventions_watershed_id_idx on public.interventions (watershed_id);
create index if not exists interventions_village_id_idx on public.interventions (village_id);

--------------------------------------------------------------------------------
-- 4. Evidence Table & PostGIS Point Geometry
--------------------------------------------------------------------------------

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  intervention_id uuid references public.interventions(id) on delete set null,
  title text not null default 'Field Photo',
  description text,
  category text not null default 'Water Structure',
  district text,
  block text,
  village text,
  latitude numeric,
  longitude numeric,
  location extensions.geometry(Point, 4326),
  image_url text,
  thumbnail_url text,
  storage_path text,
  uploaded_by uuid references auth.users(id) on delete set null,
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING', 'VERIFIED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_location_valid check (location is null or extensions.st_isvalid(location))
);

-- Trigger to maintain location from latitude/longitude and vice versa
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
create index if not exists evidence_uploaded_by_idx on public.evidence (uploaded_by);
create index if not exists evidence_verification_status_idx on public.evidence (verification_status);

--------------------------------------------------------------------------------
-- 5. Satellite Scenes & Observations Geometries & Relationships
--------------------------------------------------------------------------------

create index if not exists satellite_scenes_footprint_gist on public.satellite_scenes using gist (footprint);
create index if not exists satellite_scenes_watershed_id_idx on public.satellite_scenes (watershed_id);
create index if not exists satellite_observations_scene_id_idx on public.satellite_observations (scene_id);
create index if not exists satellite_observations_watershed_id_idx on public.satellite_observations (watershed_id);

--------------------------------------------------------------------------------
-- 6. Change Analysis Geometry & Relationships
--------------------------------------------------------------------------------

create index if not exists change_analysis_affected_area_gist on public.change_analysis using gist (affected_area);
create index if not exists change_analysis_watershed_id_idx on public.change_analysis (watershed_id);

--------------------------------------------------------------------------------
-- 7. Provenance Table
--------------------------------------------------------------------------------

create table if not exists public.provenance (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  organization text,
  license text,
  source_url text,
  dataset_type text,
  description text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill provenance from data_sources if data_sources exists
insert into public.provenance (id, source_name, organization, source_url, description, metadata, created_at, updated_at)
select ds.id, ds.name, ds.organization, ds.source_url, ds.description, ds.metadata, ds.created_at, ds.updated_at
from public.data_sources as ds
on conflict (id) do nothing;

--------------------------------------------------------------------------------
-- 8. Row-Level Security Policies
--------------------------------------------------------------------------------

alter table public.evidence enable row level security;
alter table public.provenance enable row level security;

-- Public / Anonymous & Authenticated read access for GIS baselayers and evidence
drop policy if exists "public_read_districts" on public.districts;
create policy "public_read_districts" on public.districts for select using (true);

drop policy if exists "public_read_blocks" on public.blocks;
create policy "public_read_blocks" on public.blocks for select using (true);

drop policy if exists "public_read_villages" on public.villages;
create policy "public_read_villages" on public.villages for select using (true);

drop policy if exists "public_read_watersheds" on public.watersheds;
create policy "public_read_watersheds" on public.watersheds for select using (true);

drop policy if exists "public_read_interventions" on public.interventions;
create policy "public_read_interventions" on public.interventions for select using (true);

drop policy if exists "public_read_evidence" on public.evidence;
create policy "public_read_evidence" on public.evidence for select using (true);

drop policy if exists "public_read_satellite_scenes" on public.satellite_scenes;
create policy "public_read_satellite_scenes" on public.satellite_scenes for select using (true);

drop policy if exists "public_read_satellite_observations" on public.satellite_observations;
create policy "public_read_satellite_observations" on public.satellite_observations for select using (true);

drop policy if exists "public_read_change_analysis" on public.change_analysis;
create policy "public_read_change_analysis" on public.change_analysis for select using (true);

drop policy if exists "public_read_provenance" on public.provenance;
create policy "public_read_provenance" on public.provenance for select using (true);

-- Authenticated evidence uploads and author modifications
drop policy if exists "authenticated_upload_evidence" on public.evidence;
create policy "authenticated_upload_evidence" on public.evidence
for insert to authenticated
with check (
  (uploaded_by is null or uploaded_by = (select auth.uid()))
);

drop policy if exists "authenticated_modify_own_evidence" on public.evidence;
create policy "authenticated_modify_own_evidence" on public.evidence
for update to authenticated
using (
  uploaded_by = (select auth.uid())
  or exists (
    select 1 from public.profiles as p
    where p.user_id = (select auth.uid()) and p.role in ('ADMINISTRATOR', 'ADMIN')
  )
);

-- Administrative write operations on core GIS layers
drop policy if exists "admin_manage_evidence" on public.evidence;
create policy "admin_manage_evidence" on public.evidence
for all to authenticated
using (
  exists (
    select 1 from public.profiles as p
    where p.user_id = (select auth.uid()) and p.role in ('ADMINISTRATOR', 'ADMIN')
  )
);

drop policy if exists "admin_manage_provenance" on public.provenance;
create policy "admin_manage_provenance" on public.provenance
for all to authenticated
using (
  exists (
    select 1 from public.profiles as p
    where p.user_id = (select auth.uid()) and p.role in ('ADMINISTRATOR', 'ADMIN')
  )
);

commit;
