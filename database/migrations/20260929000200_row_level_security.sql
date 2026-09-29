-- Scope-aware baseline policies for JalDrishti application roles.
-- Access defaults to deny. These policies require a provisioned public.profiles row.

begin;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select p.role
  from public.profiles as p
  where p.user_id = (select auth.uid())
    and p.status = 'ACTIVE'
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select coalesce(public.current_user_role() = 'ADMIN', false)
$$;

create or replace function public.can_access_admin_area(
  target_state_id uuid,
  target_district_id uuid,
  target_block_id uuid,
  target_village_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.user_id = (select auth.uid())
      and p.status = 'ACTIVE'
      and (
        p.role = 'ADMIN'
        or p.role = 'GIS_ANALYST'
        or (p.role = 'STATE_OFFICER' and p.state_id = target_state_id)
        or (
          p.role = 'DISTRICT_OFFICER'
          and p.state_id = target_state_id
          and (target_district_id is null or p.district_id = target_district_id)
        )
        or (
          p.role = 'FIELD_OFFICER'
          and p.state_id = target_state_id
          and (target_district_id is null or p.district_id = target_district_id)
          and (target_block_id is null or p.block_id = target_block_id)
          and (target_village_id is null or p.village_id = target_village_id)
        )
      )
  )
$$;

create or replace function public.can_access_watershed(target_watershed_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select case
    when public.current_user_role() in ('ADMIN', 'GIS_ANALYST') then true
    else exists (
      select 1
      from public.watershed_villages as wv
      join public.villages as v on v.id = wv.village_id
      join public.blocks as b on b.id = v.block_id
      join public.districts as d on d.id = b.district_id
      where wv.watershed_id = target_watershed_id
        and public.can_access_admin_area(d.state_id, d.id, b.id, v.id)
    )
  end
$$;

create or replace function public.can_manage_watershed(target_watershed_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.current_user_role() in ('ADMIN', 'STATE_OFFICER', 'DISTRICT_OFFICER', 'GIS_ANALYST')
    and public.can_access_watershed(target_watershed_id)
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.can_access_admin_area(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.can_access_watershed(uuid) from public, anon;
revoke all on function public.can_manage_watershed(uuid) from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.can_access_admin_area(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.can_access_watershed(uuid) to authenticated;
grant execute on function public.can_manage_watershed(uuid) to authenticated;

alter table public.states enable row level security;
alter table public.districts enable row level security;
alter table public.blocks enable row level security;
alter table public.villages enable row level security;
alter table public.profiles enable row level security;
alter table public.watersheds enable row level security;
alter table public.watershed_villages enable row level security;
alter table public.sub_watersheds enable row level security;
alter table public.intervention_types enable row level security;
alter table public.interventions enable row level security;
alter table public.data_sources enable row level security;
alter table public.geo_photos enable row level security;
alter table public.satellite_scenes enable row level security;
alter table public.satellite_observations enable row level security;
alter table public.indicators enable row level security;
alter table public.change_analysis enable row level security;

create policy states_scoped_read on public.states
  for select to authenticated
  using (public.can_access_admin_area(id, null, null, null));
create policy states_admin_manage on public.states
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy districts_scoped_read on public.districts
  for select to authenticated
  using (public.can_access_admin_area(state_id, id, null, null));
create policy districts_admin_manage on public.districts
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy blocks_scoped_read on public.blocks
  for select to authenticated
  using (
    exists (
      select 1 from public.districts as d
      where d.id = public.blocks.district_id
        and public.can_access_admin_area(d.state_id, d.id, public.blocks.id, null)
    )
  );
create policy blocks_admin_manage on public.blocks
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy villages_scoped_read on public.villages
  for select to authenticated
  using (
    exists (
      select 1
      from public.blocks as b
      join public.districts as d on d.id = b.district_id
      where b.id = public.villages.block_id
        and public.can_access_admin_area(d.state_id, d.id, b.id, public.villages.id)
    )
  );
create policy villages_admin_manage on public.villages
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy profiles_self_or_admin_read on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());
create policy profiles_admin_manage on public.profiles
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy watersheds_scoped_read on public.watersheds
  for select to authenticated
  using (public.can_access_watershed(id));
create policy watersheds_admin_manage on public.watersheds
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy watershed_villages_scoped_read on public.watershed_villages
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy watershed_villages_admin_manage on public.watershed_villages
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy sub_watersheds_scoped_read on public.sub_watersheds
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy sub_watersheds_scoped_manage on public.sub_watersheds
  for all to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));

create policy intervention_types_authenticated_read on public.intervention_types
  for select to authenticated using (true);
create policy intervention_types_admin_manage on public.intervention_types
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy interventions_scoped_read on public.interventions
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy interventions_scoped_manage on public.interventions
  for all to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));

create policy data_sources_authenticated_read on public.data_sources
  for select to authenticated using (true);
create policy data_sources_admin_or_gis_manage on public.data_sources
  for all to authenticated
  using (public.current_user_role() in ('ADMIN', 'GIS_ANALYST'))
  with check (public.current_user_role() in ('ADMIN', 'GIS_ANALYST'));

create policy geo_photos_scoped_read on public.geo_photos
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy geo_photos_submit_pending on public.geo_photos
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and verification_status = 'PENDING'
    and public.can_access_watershed(watershed_id)
  );
create policy geo_photos_owner_edit_pending on public.geo_photos
  for update to authenticated
  using (
    created_by = (select auth.uid())
    and verification_status = 'PENDING'
    and public.can_access_watershed(watershed_id)
  )
  with check (
    created_by = (select auth.uid())
    and verification_status = 'PENDING'
    and public.can_access_watershed(watershed_id)
  );
create policy geo_photos_scoped_verify on public.geo_photos
  for update to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));
create policy geo_photos_owner_delete_pending on public.geo_photos
  for delete to authenticated
  using (
    (created_by = (select auth.uid()) and verification_status = 'PENDING')
    or public.is_platform_admin()
  );

create policy satellite_scenes_scoped_read on public.satellite_scenes
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy satellite_scenes_scoped_manage on public.satellite_scenes
  for all to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));

create policy satellite_observations_scoped_read on public.satellite_observations
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy satellite_observations_scoped_manage on public.satellite_observations
  for all to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));

create policy indicators_scoped_read on public.indicators
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy indicators_scoped_manage on public.indicators
  for all to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));

create policy change_analysis_scoped_read on public.change_analysis
  for select to authenticated
  using (public.can_access_watershed(watershed_id));
create policy change_analysis_scoped_manage on public.change_analysis
  for all to authenticated
  using (public.can_manage_watershed(watershed_id))
  with check (public.can_manage_watershed(watershed_id));

-- New tables receive no access for anon/PUBLIC. Authenticated SQL privileges are
-- further restricted by the RLS policies above. The service_role retains its
-- Supabase-managed bypass for trusted server-side operations.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'states', 'districts', 'blocks', 'villages', 'profiles', 'watersheds',
    'watershed_villages', 'sub_watersheds', 'intervention_types', 'interventions',
    'data_sources', 'geo_photos', 'satellite_scenes', 'satellite_observations',
    'indicators', 'change_analysis'
  ] loop
    execute format('revoke all on table public.%I from anon, public', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

commit;
