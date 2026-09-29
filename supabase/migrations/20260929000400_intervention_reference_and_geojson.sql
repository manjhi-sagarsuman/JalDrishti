-- Shared intervention type catalog and an RLS-respecting intervention map response.
-- The category rows are reference values, not government implementation records.

insert into public.intervention_types (code, name, description)
values
  ('WATER_CONSERVATION_STRUCTURE', 'Water Conservation Structure', 'Reference category for water conservation structures.'),
  ('CHECK_DAM', 'Check Dam', 'Reference category for check dams.'),
  ('FARM_POND', 'Farm Pond', 'Reference category for farm ponds.'),
  ('CONTOUR_BUND', 'Contour Bund', 'Reference category for contour bunds.'),
  ('DRAINAGE_TREATMENT', 'Drainage Treatment', 'Reference category for drainage treatment.'),
  ('PLANTATION', 'Plantation', 'Reference category for plantation.'),
  ('SOIL_CONSERVATION', 'Soil Conservation', 'Reference category for soil conservation.'),
  ('OTHER', 'Other', 'Reference category for other interventions.')
on conflict (code) do nothing;

create or replace function public.get_intervention_feature_collection()
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
          'id', intervention.id,
          'geometry', extensions.st_asgeojson(intervention.location)::jsonb,
          'properties', jsonb_build_object(
            'layerId', 'interventions',
            'title', intervention.name,
            'intervention_id', intervention.id,
            'watershed_id', intervention.watershed_id,
            'status', intervention.status,
            'type', intervention_type.name
          )
        ) order by intervention.created_at desc
      ),
      '[]'::jsonb
    )
  )
  from (
    select * from public.interventions
    where location is not null
    order by created_at desc
    limit 1000
  ) as intervention
  join public.intervention_types as intervention_type on intervention_type.id = intervention.intervention_type_id;
$function$;

revoke all on function public.get_intervention_feature_collection() from public, anon;
grant execute on function public.get_intervention_feature_collection() to authenticated;
