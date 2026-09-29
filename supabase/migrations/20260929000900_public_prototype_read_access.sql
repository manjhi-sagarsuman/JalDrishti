-- Public read-only access for the prototype. Writes and role-scoped access remain protected.

begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'states', 'districts', 'blocks', 'villages', 'watersheds',
    'watershed_villages', 'sub_watersheds', 'intervention_types',
    'interventions', 'data_sources', 'satellite_scenes',
    'satellite_observations', 'indicators', 'change_analysis', 'geo_photos'
  ] loop
    execute format('grant select on table public.%I to anon', table_name);
  end loop;
end;
$$;

create policy states_public_read on public.states for select to anon using (status = 'ACTIVE');
create policy districts_public_read on public.districts for select to anon using (status = 'ACTIVE');
create policy blocks_public_read on public.blocks for select to anon using (status = 'ACTIVE');
create policy villages_public_read on public.villages for select to anon using (status = 'ACTIVE');
create policy watersheds_public_read on public.watersheds for select to anon using (status in ('PLANNED', 'ACTIVE'));
create policy watershed_villages_public_read on public.watershed_villages for select to anon using (true);
create policy sub_watersheds_public_read on public.sub_watersheds for select to anon using (status = 'ACTIVE');
create policy intervention_types_public_read on public.intervention_types for select to anon using (status = 'ACTIVE');
create policy interventions_public_read on public.interventions for select to anon using (status <> 'CANCELLED');
create policy data_sources_public_read on public.data_sources for select to anon using (status = 'ACTIVE');
create policy satellite_scenes_public_read on public.satellite_scenes for select to anon using (status in ('REGISTERED', 'READY'));
create policy satellite_observations_public_read on public.satellite_observations for select to anon using (status = 'AVAILABLE');
create policy indicators_public_read on public.indicators for select to anon using (status not in ('REJECTED', 'ARCHIVED'));
create policy change_analysis_public_read on public.change_analysis for select to anon using (status in ('COMPLETED', 'REVIEWED'));
create policy geo_photos_public_read on public.geo_photos for select to anon using (verification_status = 'VERIFIED');

grant execute on function public.get_watershed_explorer_feature_collection() to anon;
grant execute on function public.get_intervention_feature_collection() to anon;
grant execute on function public.get_geo_photo_feature_collection() to anon;
grant execute on function public.get_change_analysis_feature_collection() to anon;
grant execute on function public.get_satellite_scene_footprint_feature_collection() to anon;

create policy geo_photos_storage_public_verified_read on storage.objects
  for select to anon
  using (
    bucket_id = 'geo-photos'
    and exists (
      select 1
      from public.geo_photos as photo
      where photo.storage_path = storage.objects.name
        and photo.verification_status = 'VERIFIED'
    )
  );

commit;