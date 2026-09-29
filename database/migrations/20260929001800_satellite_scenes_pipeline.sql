-- Migration: 20260929001800_satellite_scenes_pipeline.sql
-- JALDRISHTI CHUNK 8: Satellite Scene Data Pipeline & GeoJSON Footprints
-- Real satellite scene pipeline supporting Landsat and Sentinel STAC references
-- Stores geometry as geometry(MultiPolygon, 4326), no large rasters in database rows.

create extension if not exists postgis schema extensions;

-- Ensure satellite_scenes has all canonical Chunk 8 fields
alter table public.satellite_scenes
  add column if not exists scene_id text,
  add column if not exists watershed_code text,
  add column if not exists acquisition_date timestamptz,
  add column if not exists cloud_cover numeric(5, 2) check (cloud_cover between 0 and 100),
  add column if not exists crs text default 'EPSG:4326',
  add column if not exists asset_reference_path text,
  add column if not exists source_provenance jsonb default '{}'::jsonb check (jsonb_typeof(source_provenance) = 'object');

-- Backfill / sync existing fields with canonical Chunk 8 fields
update public.satellite_scenes s
set
  scene_id = coalesce(s.scene_id, s.scene_identifier),
  acquisition_date = coalesce(s.acquisition_date, s.acquired_at),
  cloud_cover = coalesce(s.cloud_cover, s.cloud_cover_percent),
  asset_reference_path = coalesce(s.asset_reference_path, s.asset_path),
  watershed_code = coalesce(s.watershed_code, w.code)
from public.watersheds w
where s.watershed_id = w.id
  and (s.scene_id is null or s.acquisition_date is null or s.cloud_cover is null or s.asset_reference_path is null or s.watershed_code is null);

-- Keep scene_id and scene_identifier synchronized
create or replace function public.sync_satellite_scene_fields()
returns trigger
language plpgsql
as $$
begin
  if new.scene_id is not null and new.scene_identifier is null then
    new.scene_identifier := new.scene_id;
  elsif new.scene_identifier is not null and new.scene_id is null then
    new.scene_id := new.scene_identifier;
  end if;

  if new.acquisition_date is not null and new.acquired_at is null then
    new.acquired_at := new.acquisition_date;
  elsif new.acquired_at is not null and new.acquisition_date is null then
    new.acquisition_date := new.acquired_at;
  end if;

  if new.cloud_cover is not null and new.cloud_cover_percent is null then
    new.cloud_cover_percent := new.cloud_cover;
  elsif new.cloud_cover_percent is not null and new.cloud_cover is null then
    new.cloud_cover := new.cloud_cover_percent;
  end if;

  if new.asset_reference_path is not null and new.asset_path is null then
    new.asset_path := new.asset_reference_path;
  elsif new.asset_path is not null and new.asset_reference_path is null then
    new.asset_reference_path := new.asset_path;
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

drop trigger if exists trg_sync_satellite_scene_fields on public.satellite_scenes;
create trigger trg_sync_satellite_scene_fields
before insert or update on public.satellite_scenes
for each row execute function public.sync_satellite_scene_fields();

-- Spatial and attribute indexes
create index if not exists idx_satellite_scenes_platform on public.satellite_scenes(platform);
create index if not exists idx_satellite_scenes_sensor on public.satellite_scenes(sensor);
create index if not exists idx_satellite_scenes_acquisition_date on public.satellite_scenes(acquisition_date desc);
create index if not exists idx_satellite_scenes_watershed_code on public.satellite_scenes(watershed_code);
create index if not exists idx_satellite_scenes_footprint on public.satellite_scenes using gist(footprint);

-- Updated get_satellite_scene_footprint_feature_collection() conforming strictly to Chunk 8 requirements
create or replace function public.get_satellite_scene_footprint_feature_collection()
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
          'id', scene.id,
          'geometry', extensions.st_asgeojson(scene.footprint)::jsonb,
          'properties', jsonb_build_object(
            'layerId', 'satellite-scenes',
            'sceneId', coalesce(scene.scene_id, scene.scene_identifier),
            'title', coalesce(scene.scene_id, scene.scene_identifier),
            'platform', scene.platform,
            'sensor', scene.sensor,
            'acquisitionDate', coalesce(scene.acquisition_date, scene.acquired_at),
            'cloudCover', coalesce(scene.cloud_cover, scene.cloud_cover_percent),
            'watershed', coalesce(scene.watershed_code, w.code, 'Unknown'),
            'assetReference', coalesce(scene.asset_reference_path, scene.asset_path),
            'crs', scene.crs,
            'status', scene.status
          )
        ) order by coalesce(scene.acquisition_date, scene.acquired_at) desc
      ),
      '[]'::jsonb
    )
  )
  from public.satellite_scenes as scene
  left join public.watersheds as w on scene.watershed_id = w.id
  where scene.footprint is not null
    and scene.status in ('REGISTERED', 'READY');
$function$;

revoke all on function public.get_satellite_scene_footprint_feature_collection() from public, anon;
grant execute on function public.get_satellite_scene_footprint_feature_collection() to anon, authenticated;

-- Also ensure get_public_map_features carries identical properties for satellite-scenes layer
create or replace function public.get_public_map_features(requested_layer text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with features as (
    select jsonb_build_object(
      'type', 'Feature',
      'id', district.id,
      'geometry', extensions.st_asgeojson(district.geom)::jsonb,
      'properties', jsonb_build_object('layerId', 'district-boundary', 'title', district.name, 'code', district.code, 'level', 'district')
    ) as feature
    from public.districts as district
    where requested_layer = 'districts' and district.geom is not null
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', block.id,
      'geometry', extensions.st_asgeojson(block.geom)::jsonb,
      'properties', jsonb_build_object('layerId', 'block-boundary', 'title', block.name, 'code', block.code, 'district_id', block.district_id, 'level', 'block')
    )
    from public.blocks as block
    where requested_layer = 'blocks' and block.geom is not null
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', village.id,
      'geometry', extensions.st_asgeojson(village.geom)::jsonb,
      'properties', jsonb_build_object('layerId', 'village-boundary', 'title', village.name, 'code', village.code, 'block_id', village.block_id, 'level', 'village')
    )
    from public.villages as village
    where requested_layer = 'villages' and village.geom is not null
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', watershed.id,
      'geometry', extensions.st_asgeojson(watershed.boundary)::jsonb,
      'properties', jsonb_build_object('layerId', 'watershed-boundary', 'title', watershed.name, 'code', watershed.code, 'area_km2', watershed.area_km2, 'status', watershed.status)
    )
    from public.watersheds as watershed
    where requested_layer = 'watersheds' and watershed.status in ('PLANNED', 'ACTIVE') and coalesce((watershed.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', intervention.id,
      'geometry', extensions.st_asgeojson(intervention.location)::jsonb,
      'properties', jsonb_build_object('layerId', 'interventions', 'title', intervention.name, 'code', intervention.code, 'status', intervention.status, 'watershed_id', intervention.watershed_id)
    )
    from public.interventions as intervention
    where requested_layer = 'interventions' and intervention.location is not null and intervention.status <> 'CANCELLED' and coalesce((intervention.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', photo.id,
      'geometry', extensions.st_asgeojson(photo.location)::jsonb,
      'properties', jsonb_build_object('layerId', 'geo-tagged-photos', 'title', photo.file_name, 'watershed_id', photo.watershed_id, 'captured_at', photo.captured_at, 'verification_status', photo.verification_status)
    )
    from public.geo_photos as photo
    where requested_layer = 'evidence' and photo.location is not null and photo.verification_status = 'VERIFIED' and coalesce((photo.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', scene.id,
      'geometry', extensions.st_asgeojson(scene.footprint)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'satellite-scenes',
        'sceneId', coalesce(scene.scene_id, scene.scene_identifier),
        'title', coalesce(scene.scene_id, scene.scene_identifier),
        'platform', scene.platform,
        'sensor', scene.sensor,
        'acquisitionDate', coalesce(scene.acquisition_date, scene.acquired_at),
        'cloudCover', coalesce(scene.cloud_cover, scene.cloud_cover_percent),
        'watershed', coalesce(scene.watershed_code, w.code, 'Unknown'),
        'assetReference', coalesce(scene.asset_reference_path, scene.asset_path),
        'crs', scene.crs,
        'status', scene.status
      )
    )
    from public.satellite_scenes as scene
    left join public.watersheds as w on scene.watershed_id = w.id
    where requested_layer = 'satellite-scenes' and scene.status in ('REGISTERED', 'READY') and coalesce((scene.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object(
      'type', 'Feature',
      'id', analysis.id,
      'geometry', extensions.st_asgeojson(analysis.affected_area)::jsonb,
      'properties', jsonb_build_object('layerId', 'vegetation-change', 'title', coalesce(analysis.summary, 'Recorded change analysis'), 'watershed_id', analysis.watershed_id, 'status', analysis.status, 'observed_change', analysis.observed_change)
    )
    from public.change_analysis as analysis
    where requested_layer = 'change-analysis' and analysis.affected_area is not null and analysis.status in ('COMPLETED', 'REVIEWED') and coalesce((analysis.metadata->>'isDemo')::boolean, false) = false
  )
  select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(feature), '[]'::jsonb)) from features;
$function$;

revoke all on function public.get_public_map_features(text) from public, anon;
grant execute on function public.get_public_map_features(text) to anon, authenticated;
