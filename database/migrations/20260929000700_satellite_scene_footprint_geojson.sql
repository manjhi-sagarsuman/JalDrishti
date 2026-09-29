-- RLS-respecting GeoJSON footprints for temporal comparison map panels.

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
            'title', scene.scene_identifier,
            'scene_id', scene.id,
            'watershed_id', scene.watershed_id,
            'acquired_at', scene.acquired_at,
            'platform', scene.platform,
            'sensor', scene.sensor
          )
        ) order by scene.acquired_at desc
      ),
      '[]'::jsonb
    )
  )
  from (
    select * from public.satellite_scenes
    order by acquired_at desc
    limit 5000
  ) as scene;
$function$;

revoke all on function public.get_satellite_scene_footprint_feature_collection() from public, anon;
grant execute on function public.get_satellite_scene_footprint_feature_collection() to authenticated;
