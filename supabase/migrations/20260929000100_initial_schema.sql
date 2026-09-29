-- JalDrishti SIH26015 initial schema.
-- Geographic coordinates use WGS 84 (EPSG:4326). Do area/length calculations
-- after transforming to an appropriate projected CRS or casting to geography.

begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_extension as e
    join pg_catalog.pg_namespace as n on n.oid = e.extnamespace
    where e.extname = 'postgis' and n.nspname = 'extensions'
  ) then
    raise exception 'PostGIS is already installed outside the extensions schema. Review the existing project before applying this migration.';
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.states (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint states_boundary_valid check (extensions.st_isvalid(boundary))
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete restrict,
  code text not null,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_id, code),
  unique (id, state_id),
  constraint districts_boundary_valid check (extensions.st_isvalid(boundary))
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete restrict,
  code text not null,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, code),
  unique (id, district_id),
  constraint blocks_boundary_valid check (extensions.st_isvalid(boundary))
);

create table public.villages (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete restrict,
  code text not null,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, code),
  unique (id, block_id),
  constraint villages_boundary_valid check (extensions.st_isvalid(boundary))
);

-- Supabase Auth owns identity credentials. This table stores application profile
-- metadata and role scope; users cannot assign or change their own role.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('ADMIN', 'STATE_OFFICER', 'DISTRICT_OFFICER', 'FIELD_OFFICER', 'GIS_ANALYST')),
  state_id uuid references public.states(id) on delete restrict,
  district_id uuid,
  block_id uuid,
  village_id uuid,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_district_state_fk foreign key (district_id, state_id)
    references public.districts(id, state_id) on delete restrict,
  constraint profiles_block_district_fk foreign key (block_id, district_id)
    references public.blocks(id, district_id) on delete restrict,
  constraint profiles_village_block_fk foreign key (village_id, block_id)
    references public.villages(id, block_id) on delete restrict,
  constraint profiles_scope_order check (
    (district_id is null or state_id is not null)
    and (block_id is null or district_id is not null)
    and (village_id is null or block_id is not null)
  )
);

create table public.watersheds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('PLANNED', 'ACTIVE', 'ARCHIVED')),
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  area_sq_km numeric(14, 4) check (area_sq_km is null or area_sq_km >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, code),
  constraint watersheds_boundary_valid check (extensions.st_isvalid(boundary))
);

create table public.watershed_villages (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete cascade,
  village_id uuid not null references public.villages(id) on delete restrict,
  coverage_percent numeric(5, 2) check (coverage_percent between 0 and 100),
  is_primary boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (watershed_id, village_id)
);

create unique index watershed_villages_one_primary_idx
  on public.watershed_villages (watershed_id) where is_primary;

create table public.sub_watersheds (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watershed_id, code),
  unique (id, watershed_id),
  constraint sub_watersheds_boundary_valid check (extensions.st_isvalid(boundary))
);

create table public.intervention_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  sub_watershed_id uuid,
  village_id uuid,
  intervention_type_id uuid not null references public.intervention_types(id) on delete restrict,
  code text,
  name text not null,
  description text,
  status text not null default 'PLANNED' check (status in ('PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  location extensions.geometry(Geometry, 4326),
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, watershed_id),
  constraint interventions_sub_watershed_fk foreign key (sub_watershed_id, watershed_id)
    references public.sub_watersheds(id, watershed_id) on delete restrict,
  constraint interventions_village_watershed_fk foreign key (watershed_id, village_id)
    references public.watershed_villages(watershed_id, village_id) on delete restrict,
  constraint interventions_date_order check (planned_end is null or planned_start is null or planned_end >= planned_start),
  constraint interventions_actual_date_order check (actual_end is null or actual_start is null or actual_end >= actual_start),
  constraint interventions_location_valid check (location is null or extensions.st_isvalid(location))
);

create unique index interventions_watershed_code_idx
  on public.interventions (watershed_id, code) where code is not null;

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  organization text,
  source_url text,
  license text,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'RETIRED')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.data_sources is 'Provenance metadata only; never store credentials or access tokens in source_url or metadata.';

create table public.geo_photos (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  intervention_id uuid,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-fA-F]{64}$'),
  location extensions.geometry(Point, 4326),
  captured_at timestamptz,
  gps_accuracy_m numeric(10, 2) check (gps_accuracy_m is null or gps_accuracy_m >= 0),
  gps_validation text not null default 'PENDING' check (gps_validation in ('PENDING', 'VALID', 'MISSING', 'INVALID')),
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING', 'VERIFIED', 'REJECTED')),
  notes text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geo_photos_intervention_watershed_fk foreign key (intervention_id, watershed_id)
    references public.interventions(id, watershed_id) on delete restrict,
  constraint geo_photos_location_valid check (location is null or extensions.st_isvalid(location))
);

create table public.satellite_scenes (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  data_source_id uuid references public.data_sources(id) on delete set null,
  scene_identifier text not null,
  platform text,
  sensor text,
  acquired_at timestamptz not null,
  cloud_cover_percent numeric(5, 2) check (cloud_cover_percent between 0 and 100),
  footprint extensions.geometry(MultiPolygon, 4326) not null,
  asset_path text,
  status text not null default 'REGISTERED' check (status in ('REGISTERED', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watershed_id, scene_identifier),
  unique (id, watershed_id),
  constraint satellite_scenes_footprint_valid check (extensions.st_isvalid(footprint))
);

create table public.satellite_observations (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  satellite_scene_id uuid not null,
  data_source_id uuid references public.data_sources(id) on delete set null,
  observation_code text not null,
  observed_at timestamptz not null,
  statistic text,
  value numeric,
  unit text,
  raster_asset_path text,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'PROCESSING', 'FAILED', 'ARCHIVED')),
  quality_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(quality_metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint satellite_observations_scene_watershed_fk foreign key (satellite_scene_id, watershed_id)
    references public.satellite_scenes(id, watershed_id) on delete cascade,
  unique (watershed_id, satellite_scene_id, observation_code, observed_at),
  unique (id, watershed_id)
);

create table public.indicators (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  source_observation_id uuid,
  data_source_id uuid references public.data_sources(id) on delete set null,
  indicator_code text not null,
  name text not null,
  observed_at timestamptz not null,
  value numeric not null,
  unit text not null,
  status text not null default 'UNREVIEWED' check (status in ('UNREVIEWED', 'VALIDATED', 'REJECTED', 'ARCHIVED')),
  quality_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(quality_metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint indicators_source_observation_fk foreign key (source_observation_id, watershed_id)
    references public.satellite_observations(id, watershed_id) on delete restrict,
  unique (watershed_id, indicator_code, observed_at),
  unique (id, watershed_id)
);

create table public.change_analysis (
  id uuid primary key default gen_random_uuid(),
  watershed_id uuid not null references public.watersheds(id) on delete restrict,
  baseline_indicator_id uuid not null,
  comparison_indicator_id uuid not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEWED')),
  observed_change numeric,
  affected_area extensions.geometry(MultiPolygon, 4326),
  summary text,
  results jsonb not null default '{}'::jsonb check (jsonb_typeof(results) = 'object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint change_analysis_baseline_fk foreign key (baseline_indicator_id, watershed_id)
    references public.indicators(id, watershed_id) on delete restrict,
  constraint change_analysis_comparison_fk foreign key (comparison_indicator_id, watershed_id)
    references public.indicators(id, watershed_id) on delete restrict,
  constraint change_analysis_distinct_indicators check (baseline_indicator_id <> comparison_indicator_id),
  constraint change_analysis_area_valid check (affected_area is null or extensions.st_isvalid(affected_area))
);

-- Administrative hierarchy lookup indexes (unique constraints already index codes).
create index districts_state_status_idx on public.districts (state_id, status);
create index blocks_district_status_idx on public.blocks (district_id, status);
create index villages_block_status_idx on public.villages (block_id, status);
create index profiles_scope_idx on public.profiles (state_id, district_id, block_id, village_id);
create index watershed_villages_village_idx on public.watershed_villages (village_id);
create index sub_watersheds_watershed_status_idx on public.sub_watersheds (watershed_id, status);
create index interventions_watershed_status_idx on public.interventions (watershed_id, status);
create index interventions_type_idx on public.interventions (intervention_type_id);
create index interventions_location_gix on public.interventions using gist (location);
create index geo_photos_watershed_status_captured_idx on public.geo_photos (watershed_id, verification_status, captured_at desc);
create index geo_photos_intervention_idx on public.geo_photos (intervention_id);
create index geo_photos_location_gix on public.geo_photos using gist (location);
create index satellite_scenes_watershed_acquired_idx on public.satellite_scenes (watershed_id, acquired_at desc);
create index satellite_scenes_source_idx on public.satellite_scenes (data_source_id);
create index satellite_scenes_footprint_gix on public.satellite_scenes using gist (footprint);
create index satellite_observations_watershed_time_idx on public.satellite_observations (watershed_id, observed_at desc);
create index satellite_observations_scene_idx on public.satellite_observations (satellite_scene_id);
create index indicators_watershed_code_time_idx on public.indicators (watershed_id, indicator_code, observed_at desc);
create index indicators_source_idx on public.indicators (data_source_id);
create index change_analysis_watershed_status_idx on public.change_analysis (watershed_id, status, created_at desc);
create index change_analysis_area_gix on public.change_analysis using gist (affected_area);

create index states_boundary_gix on public.states using gist (boundary);
create index districts_boundary_gix on public.districts using gist (boundary);
create index blocks_boundary_gix on public.blocks using gist (boundary);
create index villages_boundary_gix on public.villages using gist (boundary);
create index watersheds_boundary_gix on public.watersheds using gist (boundary);
create index sub_watersheds_boundary_gix on public.sub_watersheds using gist (boundary);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'states', 'districts', 'blocks', 'villages', 'profiles', 'watersheds',
    'sub_watersheds', 'intervention_types', 'interventions', 'data_sources',
    'geo_photos', 'satellite_scenes', 'satellite_observations', 'indicators', 'change_analysis'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

commit;
