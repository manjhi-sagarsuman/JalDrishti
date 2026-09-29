-- Private evidence image storage and an RLS-respecting GeoJSON map response.
-- Apply after the initial schema and row-level security migrations.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'geo-photos',
  'geo-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create policy geo_photos_storage_upload_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'geo-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_role() is not null
  );

create policy geo_photos_storage_read_scoped on storage.objects
  for select to authenticated
  using (
    bucket_id = 'geo-photos'
    and exists (
      select 1
      from public.geo_photos as photo
      where photo.storage_path = storage.objects.name
        and public.can_access_watershed(photo.watershed_id)
    )
  );

create policy geo_photos_storage_delete_own_pending_or_orphan on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'geo-photos'
    and (
      public.is_platform_admin()
      or (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and not exists (
          select 1 from public.geo_photos as photo where photo.storage_path = storage.objects.name
        )
      )
      or exists (
        select 1
        from public.geo_photos as photo
        where photo.storage_path = storage.objects.name
          and photo.created_by = (select auth.uid())
          and photo.verification_status = 'PENDING'
      )
    )
  );

create or replace function public.get_geo_photo_feature_collection()
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
          'id', photo.id,
          'geometry', extensions.st_asgeojson(photo.location)::jsonb,
          'properties', jsonb_build_object(
            'layerId', 'geo-tagged-photos',
            'title', photo.file_name,
            'image_id', photo.id,
            'watershed_id', photo.watershed_id,
            'captured_at', photo.captured_at,
            'verification_status', photo.verification_status,
            'gps_validation', photo.gps_validation
          )
        ) order by photo.created_at desc
      ),
      '[]'::jsonb
    )
  )
  from (
    select photo.*
    from public.geo_photos as photo
    where photo.location is not null
    order by photo.created_at desc
    limit 250
  ) as photo;
$function$;

revoke all on function public.get_geo_photo_feature_collection() from public, anon;
grant execute on function public.get_geo_photo_feature_collection() to authenticated;
