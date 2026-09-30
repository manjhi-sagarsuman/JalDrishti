-- Migration: 20260929001900_satellite_indicators_pipeline.sql
-- JALDRISHTI CHUNK 9: Reproducible Satellite Indicator Pipeline (NDVI, NDWI, LULC)
-- Stores observations in satellite_observations with full provenance, CRS, band/index methods.

-- Ensure satellite_observations table has all canonical Chunk 9 fields
alter table public.satellite_observations
  add column if not exists scene_id uuid references public.satellite_scenes(id) on delete cascade,
  add column if not exists watershed_code text,
  add column if not exists indicator text check (indicator in ('NDVI', 'NDWI', 'LULC', 'LAND_USE', 'WATER_INDEX', 'VEGETATION_INDEX')),
  add column if not exists observation_date timestamptz,
  add column if not exists processing_method text,
  add column if not exists crs text default 'EPSG:4326',
  add column if not exists product_version text,
  add column if not exists source text default 'Satellite Observation';

-- Backfill / sync existing fields
update public.satellite_observations o
set
  scene_id = coalesce(o.scene_id, o.satellite_scene_id),
  indicator = coalesce(o.indicator, case
    when upper(o.observation_code) like '%NDVI%' or upper(o.observation_code) like '%VEG%' then 'NDVI'
    when upper(o.observation_code) like '%NDWI%' or upper(o.observation_code) like '%WATER%' then 'NDWI'
    when upper(o.observation_code) like '%LULC%' or upper(o.observation_code) like '%LAND%' then 'LULC'
    else 'NDVI'
  end),
  observation_date = coalesce(o.observation_date, o.observed_at),
  watershed_code = coalesce(o.watershed_code, w.code)
from public.watersheds w
where o.watershed_id = w.id
  and (o.scene_id is null or o.indicator is null or o.observation_date is null or o.watershed_code is null);

-- Trigger to maintain synchronization between canonical and legacy fields
create or replace function public.sync_satellite_observation_fields()
returns trigger
language plpgsql
as $$
begin
  if new.scene_id is not null and new.satellite_scene_id is null then
    new.satellite_scene_id := new.scene_id;
  elsif new.satellite_scene_id is not null and new.scene_id is null then
    new.scene_id := new.satellite_scene_id;
  end if;

  if new.indicator is not null and new.observation_code is null then
    new.observation_code := new.indicator;
  elsif new.observation_code is not null and new.indicator is null then
    new.indicator := case
      when upper(new.observation_code) like '%NDVI%' or upper(new.observation_code) like '%VEG%' then 'NDVI'
      when upper(new.observation_code) like '%NDWI%' or upper(new.observation_code) like '%WATER%' then 'NDWI'
      when upper(new.observation_code) like '%LULC%' or upper(new.observation_code) like '%LAND%' then 'LULC'
      else 'NDVI'
    end;
  end if;

  if new.observation_date is not null and new.observed_at is null then
    new.observed_at := new.observation_date;
  elsif new.observed_at is not null and new.observation_date is null then
    new.observation_date := new.observed_at;
  end if;

  if new.watershed_code is null and new.watershed_id is not null then
    select code into new.watershed_code from public.watersheds where id = new.watershed_id;
  end if;

  if new.crs is null then
    new.crs := 'EPSG:4326';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_satellite_observation_fields on public.satellite_observations;
create trigger trg_sync_satellite_observation_fields
before insert or update on public.satellite_observations
for each row execute function public.sync_satellite_observation_fields();

-- Indexes for indicator queries and temporal analytics
create index if not exists idx_satellite_obs_indicator on public.satellite_observations(indicator);
create index if not exists idx_satellite_obs_obs_date on public.satellite_observations(observation_date desc);
create index if not exists idx_satellite_obs_watershed_code on public.satellite_observations(watershed_code);
create index if not exists idx_satellite_obs_scene_id on public.satellite_observations(scene_id);

-- Ensure RLS allows read access to authenticated and anonymous users
drop policy if exists "public_read_satellite_observations" on public.satellite_observations;
create policy "public_read_satellite_observations" on public.satellite_observations for select using (true);
