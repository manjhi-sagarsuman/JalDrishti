-- Migration: 20260929002100_unified_map_api.sql
-- JALDRISHTI CHUNK 11: Unified Map API RPC
-- Centralized PostGIS GeoJSON endpoints supporting:
-- districts, blocks, villages, watersheds, interventions, evidence, satellite-scenes, change-analysis.
-- Preserves required GeoJSON properties: layerId, title, code, district, block, village.

create or replace function public.get_public_map_features(requested_layer text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with features as (
    -- 1. Districts
    select jsonb_build_object(
      'type', 'Feature',
      'id', district.id,
      'geometry', extensions.st_asgeojson(coalesce(district.geom, district.boundary))::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'district-boundary',
        'title', district.name,
        'code', district.code,
        'district', district.name,
        'block', null,
        'village', null,
        'state_id', district.state_id,
        'status', district.status
      )
    ) as feature
    from public.districts as district
    where requested_layer = 'districts'
      and district.status = 'ACTIVE'
      and coalesce((district.metadata->>'isDemo')::boolean, false) = false
      and coalesce(district.geom, district.boundary) is not null

    union all

    -- 2. Blocks
    select jsonb_build_object(
      'type', 'Feature',
      'id', block.id,
      'geometry', extensions.st_asgeojson(coalesce(block.geom, block.boundary))::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'block-boundary',
        'title', block.name,
        'code', block.code,
        'district', district.name,
        'block', block.name,
        'village', null,
        'district_id', block.district_id,
        'status', block.status
      )
    )
    from public.blocks as block
    left join public.districts as district on block.district_id = district.id
    where requested_layer = 'blocks'
      and block.status = 'ACTIVE'
      and coalesce((block.metadata->>'isDemo')::boolean, false) = false
      and coalesce(block.geom, block.boundary) is not null

    union all

    -- 3. Villages
    select jsonb_build_object(
      'type', 'Feature',
      'id', village.id,
      'geometry', extensions.st_asgeojson(coalesce(village.geom, village.boundary))::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'village-boundary',
        'title', village.name,
        'code', village.code,
        'district', district.name,
        'block', block.name,
        'village', village.name,
        'block_id', village.block_id,
        'status', village.status
      )
    )
    from public.villages as village
    left join public.blocks as block on village.block_id = block.id
    left join public.districts as district on block.district_id = district.id
    where requested_layer = 'villages'
      and village.status = 'ACTIVE'
      and coalesce((village.metadata->>'isDemo')::boolean, false) = false
      and coalesce(village.geom, village.boundary) is not null

    union all

    -- 4. Watersheds
    select jsonb_build_object(
      'type', 'Feature',
      'id', watershed.id,
      'geometry', extensions.st_asgeojson(watershed.boundary)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'watershed-boundary',
        'title', watershed.name,
        'code', watershed.code,
        'district', area.district_name,
        'block', area.block_name,
        'village', area.village_name,
        'watershed_id', watershed.id,
        'status', watershed.status,
        'area_sq_km', coalesce(watershed.area_sq_km, watershed.area_km2)
      )
    )
    from public.watersheds as watershed
    left join lateral (
      select
        d.name as district_name,
        b.name as block_name,
        v.name as village_name
      from public.watershed_villages wv
      join public.villages v on wv.village_id = v.id
      left join public.blocks b on v.block_id = b.id
      left join public.districts d on b.district_id = d.id
      where wv.watershed_id = watershed.id
      limit 1
    ) area on true
    where requested_layer = 'watersheds'
      and watershed.status in ('PLANNED', 'ACTIVE')
      and coalesce((watershed.metadata->>'isDemo')::boolean, false) = false
      and watershed.boundary is not null

    union all

    -- 5. Interventions
    select jsonb_build_object(
      'type', 'Feature',
      'id', intervention.id,
      'geometry', extensions.st_asgeojson(intervention.location)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'interventions',
        'title', intervention.name,
        'code', intervention.code,
        'district', coalesce(d.name, v.district),
        'block', coalesce(b.name, v.block),
        'village', coalesce(v.name, intervention.village_id::text),
        'watershed', w.name,
        'status', intervention.status,
        'type', intervention.type,
        'watershed_id', intervention.watershed_id
      )
    )
    from public.interventions as intervention
    left join public.watersheds as w on intervention.watershed_id = w.id
    left join public.villages as v on intervention.village_id = v.id
    left join public.blocks as b on v.block_id = b.id
    left join public.districts as d on b.district_id = d.id
    where requested_layer = 'interventions'
      and intervention.location is not null
      and intervention.status <> 'CANCELLED'
      and coalesce((intervention.metadata->>'isDemo')::boolean, false) = false

    union all

    -- 6. Evidence (geo_photos)
    select jsonb_build_object(
      'type', 'Feature',
      'id', photo.id,
      'geometry', extensions.st_asgeojson(photo.location)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'geo-tagged-photos',
        'title', photo.file_name,
        'code', photo.id::text,
        'district', photo.district,
        'block', photo.block,
        'village', photo.village,
        'watershed_id', photo.watershed_id,
        'captured_at', photo.captured_at,
        'verification_status', photo.verification_status
      )
    )
    from public.geo_photos as photo
    where requested_layer = 'evidence'
      and photo.location is not null
      and photo.verification_status = 'VERIFIED'
      and coalesce((photo.metadata->>'isDemo')::boolean, false) = false

    union all

    -- 7. Satellite Scenes
    select jsonb_build_object(
      'type', 'Feature',
      'id', scene.id,
      'geometry', extensions.st_asgeojson(scene.footprint)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'satellite-scenes',
        'title', scene.scene_identifier,
        'code', scene.scene_identifier,
        'district', area.district_name,
        'block', area.block_name,
        'village', area.village_name,
        'scene_id', scene.id,
        'watershed_id', scene.watershed_id,
        'watershed', w.name,
        'acquired_at', scene.acquired_at,
        'platform', scene.platform,
        'sensor', scene.sensor,
        'cloud_cover', scene.cloud_cover_percent
      )
    )
    from public.satellite_scenes as scene
    left join public.watersheds as w on scene.watershed_id = w.id
    left join lateral (
      select
        d.name as district_name,
        b.name as block_name,
        v.name as village_name
      from public.watershed_villages wv
      join public.villages v on wv.village_id = v.id
      left join public.blocks b on v.block_id = b.id
      left join public.districts d on b.district_id = d.id
      where wv.watershed_id = scene.watershed_id
      limit 1
    ) area on true
    where requested_layer = 'satellite-scenes'
      and scene.status in ('REGISTERED', 'READY')
      and coalesce((scene.metadata->>'isDemo')::boolean, false) = false
      and scene.footprint is not null

    union all

    -- 8. Change Analysis
    select jsonb_build_object(
      'type', 'Feature',
      'id', analysis.id,
      'geometry', extensions.st_asgeojson(analysis.affected_area)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'vegetation-change',
        'title', coalesce(analysis.summary, 'Recorded change analysis'),
        'code', coalesce(analysis.watershed_code, w.code, analysis.id::text),
        'district', area.district_name,
        'block', area.block_name,
        'village', area.village_name,
        'watershed_id', analysis.watershed_id,
        'status', analysis.status,
        'observed_change', analysis.observed_change,
        'processing_method', analysis.processing_method,
        'summary', analysis.summary,
        'affected_area_ha', case
          when analysis.affected_area is not null
          then round((extensions.st_area(analysis.affected_area::extensions.geography) / 10000)::numeric, 2)
          else null
        end
      )
    )
    from public.change_analysis as analysis
    left join public.watersheds as w on analysis.watershed_id = w.id
    left join lateral (
      select
        d.name as district_name,
        b.name as block_name,
        v.name as village_name
      from public.watershed_villages wv
      join public.villages v on wv.village_id = v.id
      left join public.blocks b on v.block_id = b.id
      left join public.districts d on b.district_id = d.id
      where wv.watershed_id = analysis.watershed_id
      limit 1
    ) area on true
    where requested_layer = 'change-analysis'
      and analysis.affected_area is not null
      and analysis.status in ('COMPLETED', 'REVIEWED')
      and coalesce((analysis.metadata->>'isDemo')::boolean, false) = false
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(feature), '[]'::jsonb)
  )
  from features;
$function$;

revoke all on function public.get_public_map_features(text) from public;
grant execute on function public.get_public_map_features(text) to anon, authenticated;
