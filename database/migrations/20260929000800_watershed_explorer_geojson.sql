-- RLS-respecting watershed boundaries and linked GIS features for the explorer/map routes.

create or replace function public.get_watershed_explorer_feature_collection()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with features as (
    select jsonb_build_object(
      'type', 'Feature', 'id', watershed.id,
      'geometry', extensions.st_asgeojson(watershed.boundary)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'watershed-boundary', 'title', watershed.name,
        'watershed_id', watershed.id, 'code', watershed.code,
        'status', watershed.status, 'area_sq_km', watershed.area_sq_km
      )
    ) as feature, watershed.updated_at as sort_date
    from public.watersheds as watershed
    order by watershed.updated_at desc
    limit 2000
  ), linked_photos as (
    select jsonb_build_object(
      'type', 'Feature', 'id', photo.id,
      'geometry', extensions.st_asgeojson(photo.location)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'geo-tagged-photos', 'title', photo.file_name,
        'image_id', photo.id, 'watershed_id', photo.watershed_id,
        'captured_at', photo.captured_at, 'verification_status', photo.verification_status,
        'gps_validation', photo.gps_validation
      )
    ) as feature, photo.captured_at as sort_date
    from public.geo_photos as photo
    where photo.location is not null
    order by photo.captured_at desc nulls last
    limit 5000
  ), linked_interventions as (
    select jsonb_build_object(
      'type', 'Feature', 'id', intervention.id,
      'geometry', extensions.st_asgeojson(intervention.location)::jsonb,
      'properties', jsonb_build_object(
        'layerId', 'interventions', 'title', intervention.name,
        'intervention_id', intervention.id, 'watershed_id', intervention.watershed_id,
        'status', intervention.status, 'implementation_date', coalesce(intervention.actual_start, intervention.planned_start),
        'type', intervention_type.name
      )
    ) as feature, intervention.created_at as sort_date
    from public.interventions as intervention
    join public.intervention_types as intervention_type on intervention_type.id = intervention.intervention_type_id
    where intervention.location is not null
    order by intervention.created_at desc
    limit 5000
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(feature order by sort_date desc nulls last), '[]'::jsonb)
  )
  from (
    select feature, sort_date from features
    union all
    select feature, sort_date from linked_photos
    union all
    select feature, sort_date from linked_interventions
  ) as all_features
$function$;

revoke all on function public.get_watershed_explorer_feature_collection() from public, anon;
grant execute on function public.get_watershed_explorer_feature_collection() to authenticated;
