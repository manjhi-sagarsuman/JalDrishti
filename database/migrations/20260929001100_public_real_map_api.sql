-- GeoJSON source for the public map API. Development records marked in metadata
-- are excluded; real imported records without that flag remain eligible.

create or replace function public.get_public_map_features(requested_layer text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with features as (
    select jsonb_build_object('type', 'Feature', 'id', district.id, 'geometry', extensions.st_asgeojson(district.boundary)::jsonb, 'properties', jsonb_build_object('layerId', 'district-boundary', 'title', district.name, 'code', district.code, 'state_id', district.state_id)) as feature
    from public.districts as district
    where requested_layer = 'districts' and district.status = 'ACTIVE' and coalesce((district.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', block.id, 'geometry', extensions.st_asgeojson(block.boundary)::jsonb, 'properties', jsonb_build_object('layerId', 'block-boundary', 'title', block.name, 'code', block.code, 'district_id', block.district_id))
    from public.blocks as block
    where requested_layer = 'blocks' and block.status = 'ACTIVE' and coalesce((block.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', village.id, 'geometry', extensions.st_asgeojson(village.boundary)::jsonb, 'properties', jsonb_build_object('layerId', 'village-boundary', 'title', village.name, 'code', village.code, 'block_id', village.block_id))
    from public.villages as village
    where requested_layer = 'villages' and village.status = 'ACTIVE' and coalesce((village.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', watershed.id, 'geometry', extensions.st_asgeojson(watershed.boundary)::jsonb, 'properties', jsonb_build_object('layerId', 'watershed-boundary', 'title', watershed.name, 'code', watershed.code, 'status', watershed.status, 'area_sq_km', watershed.area_sq_km))
    from public.watersheds as watershed
    where requested_layer = 'watersheds' and watershed.status in ('PLANNED', 'ACTIVE') and coalesce((watershed.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', intervention.id, 'geometry', extensions.st_asgeojson(intervention.location)::jsonb, 'properties', jsonb_build_object('layerId', 'interventions', 'title', intervention.name, 'code', intervention.code, 'status', intervention.status, 'watershed_id', intervention.watershed_id))
    from public.interventions as intervention
    where requested_layer = 'interventions' and intervention.location is not null and intervention.status <> 'CANCELLED' and coalesce((intervention.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', photo.id, 'geometry', extensions.st_asgeojson(photo.location)::jsonb, 'properties', jsonb_build_object('layerId', 'geo-tagged-photos', 'title', photo.file_name, 'watershed_id', photo.watershed_id, 'captured_at', photo.captured_at, 'verification_status', photo.verification_status))
    from public.geo_photos as photo
    where requested_layer = 'evidence' and photo.location is not null and photo.verification_status = 'VERIFIED' and coalesce((photo.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', scene.id, 'geometry', extensions.st_asgeojson(scene.footprint)::jsonb, 'properties', jsonb_build_object('layerId', 'satellite-scenes', 'title', scene.scene_identifier, 'scene_id', scene.id, 'watershed_id', scene.watershed_id, 'acquired_at', scene.acquired_at, 'platform', scene.platform, 'sensor', scene.sensor))
    from public.satellite_scenes as scene
    where requested_layer = 'satellite-scenes' and scene.status in ('REGISTERED', 'READY') and coalesce((scene.metadata->>'isDemo')::boolean, false) = false
    union all
    select jsonb_build_object('type', 'Feature', 'id', analysis.id, 'geometry', extensions.st_asgeojson(analysis.affected_area)::jsonb, 'properties', jsonb_build_object('layerId', 'vegetation-change', 'title', coalesce(analysis.summary, 'Recorded change analysis'), 'watershed_id', analysis.watershed_id, 'status', analysis.status, 'observed_change', analysis.observed_change))
    from public.change_analysis as analysis
    where requested_layer = 'change-analysis' and analysis.affected_area is not null and analysis.status in ('COMPLETED', 'REVIEWED') and coalesce((analysis.metadata->>'isDemo')::boolean, false) = false
  )
  select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(feature), '[]'::jsonb)) from features;
$function$;

revoke all on function public.get_public_map_features(text) from public, anon;
grant execute on function public.get_public_map_features(text) to anon, authenticated;