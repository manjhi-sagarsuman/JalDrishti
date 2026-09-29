# SIH26015 database migrations

These migrations define the PostgreSQL + PostGIS schema and reference catalog for JalDrishti. They create tables, constraints, indexes, update timestamps, and row-level security. They contain no administrative, watershed, or intervention implementation records and do not apply any changes to Supabase until explicitly run.

## Migration files

- `migrations/20260929000100_initial_schema.sql` enables PostGIS in the `extensions` schema and creates the administrative hierarchy, watershed links, interventions, evidence, satellite, indicator, provenance, and profile tables.
- `migrations/20260929000200_row_level_security.sql` adds scope-aware read/write policies for the application roles.
- `migrations/20260929000300_geo_photos_storage.sql` creates the private `geo-photos` bucket, scoped Storage policies, and an RLS-respecting GeoJSON RPC for evidence map points.
- `migrations/20260929000400_intervention_reference_and_geojson.sql` adds the intervention type reference catalog and an RLS-respecting GeoJSON RPC for intervention locations. The catalog contains categories only; it adds no implementation records.
- `migrations/20260929000500_satellite_scene_temporal_metadata.sql` adds optional spatial resolution and observation-period metadata to satellite scenes. Existing scenes are left NULL where metadata was not supplied.
- `migrations/20260929000600_change_analysis_map_and_area.sql` exposes RLS-scoped change-area GeoJSON and calculates polygon area in hectares from its stored WGS84 geometry.
- `migrations/20260929000700_satellite_scene_footprint_geojson.sql` exposes RLS-scoped satellite scene footprint GeoJSON for before/after spatial comparison panels.

Administrative boundaries and watershed polygons, footprints, intervention geometries, photo points, and change areas use PostGIS geometry with SRID 4326 (WGS 84). Transform to a suitable projected CRS or use `geography` for distance/area calculations; raw degree units are not metres.

The administrative chain is represented by `states → districts → blocks → villages`. Watersheds can span villages, so `watershed_villages` is a many-to-many link rather than storing one village directly on a watershed. Intervention and photo composite foreign keys ensure linked records remain within the same watershed.

`profiles` references Supabase's managed `auth.users` identity table. The role and administrative scope are stored in application-owned profile metadata; RLS prevents users from assigning or editing their own role. A trusted provisioning workflow must create each profile. New users without an active profile have no application table access. Role values are `ADMIN`, `STATE_OFFICER`, `DISTRICT_OFFICER`, `FIELD_OFFICER`, and `GIS_ANALYST`.

RLS is enabled on every application table. Unauthenticated `anon` access is revoked. Read access requires an active profile and is limited by assigned state/district/block/village scope; GIS analysts and admins have broad read access. Scoped officers and GIS analysts can manage watershed analysis records within scope. Field officers can submit their own pending photos; verification is reserved for scoped managers. Evidence image objects are private, uploaded into a user-specific folder, and readable only for evidence records permitted by the user's watershed scope. Administrative reference data and watershed/village assignments are admin-managed.

No demo or government records are included. Do not put secrets or access tokens in data-source URLs or JSON metadata.

## Apply through Supabase CLI

Supabase CLI tracks and applies migration files from `supabase/migrations/`. This repository keeps the requested canonical SQL under `database/migrations/`; copy those reviewed files into the CLI directory before applying so Supabase can record the migration history. Keep the copies byte-for-byte identical and commit both paths after synchronization.

From the repository root in PowerShell:

```powershell
# Run once if the repository has not been initialized for the Supabase CLI.
supabase init

Copy-Item database/migrations/*.sql supabase/migrations/

# Test against a disposable local Supabase database (requires Docker).
supabase start
supabase db reset

# After review and local verification, link the intended shared project.
supabase link --project-ref <project-ref>
supabase db push
```

`supabase db reset` recreates the local database, so use it only for a disposable local stack. Do not run a reset against the shared project. Before `db push`, confirm the linked project is the intended project and check its existing migration history. These are initial migrations for a clean project; if the remote project already has tables or PostGIS enabled in a different schema, stop and reconcile its state before applying. Do not create or alter tables manually in Supabase Studio; make schema changes in reviewed SQL migrations.

The Supabase CLI is not installed by this phase. Install it using the official Supabase CLI instructions before running the commands above.
