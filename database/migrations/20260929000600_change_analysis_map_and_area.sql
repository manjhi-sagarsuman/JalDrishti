-- GeoJSON map features and area derived from the recorded affected polygon.
-- The function executes as the caller so existing change_analysis RLS applies.

create or replace function public.get_change_analysis_feature_collection()
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
          'id', analysis.id,
          'geometry', extensions.st_asgeojson(analysis.affected_area)::jsonb,
          'properties', jsonb_build_object(
            'layerId', 'vegetation-change',
            'title', coalesce(analysis.summary, 'Recorded change analysis'),
            'change_analysis_id', analysis.id,
            'watershed_id', analysis.watershed_id,
            'status', analysis.status,
            'observed_change', analysis.observed_change,
            'affected_area_ha', round((extensions.st_area(analysis.affected_area::extensions.geography) / 10000)::numeric, 2)
          )
        ) order by analysis.created_at desc
      ),
      '[]'::jsonb
    )
  )
  from (
    select * from public.change_analysis
    where affected_area is not null
    order by created_at desc
    limit 3000
  ) as analysis;
$function$;

revoke all on function public.get_change_analysis_feature_collection() from public, anon;
grant execute on function public.get_change_analysis_feature_collection() to authenticated;
