-- Migration: 20260929001700_bhuvan_geospatial_and_provenance.sql
-- JALDRISHTI CHUNK 7: Official Bhuvan GIS Data Foundation, PostGIS Processing, and Provenance

create extension if not exists postgis with schema extensions;

insert into public.provenance (
  source_organization,
  source_url,
  access_download_date,
  original_format,
  crs_srid,
  license,
  processing_performed
) values (
  'ISRO / NRSC Bhuvan',
  'https://bhuvan.nrsc.gov.in',
  '2026-09-29'::date,
  'WMS/WMTS & OGC Vector Shapefile',
  4326,
  'Government Open Data License - India (GODL)',
  'Ingestion of official thematic layers (LULC, Drainage, Water Bodies) and Village Geocoding via secure proxy.'
) on conflict do nothing;

create table if not exists public.bhuvan_thematic_layers (
  id uuid primary key default gen_random_uuid(),
  layer_name text not null,
  category text not null,
  description text,
  district text,
  block text,
  geom extensions.geometry(MultiPolygon, 4326),
  properties jsonb default '{}'::jsonb,
  source_organization text not null default 'ISRO / NRSC Bhuvan',
  crs_srid integer not null default 4326,
  created_at timestamptz not null default now()
);

create index if not exists bhuvan_thematic_layers_geom_gist on public.bhuvan_thematic_layers using gist (geom);
create index if not exists bhuvan_thematic_layers_layer_name_idx on public.bhuvan_thematic_layers (layer_name);
create index if not exists bhuvan_thematic_layers_category_idx on public.bhuvan_thematic_layers (category);

alter table public.bhuvan_thematic_layers enable row level security;

drop policy if exists bhuvan_thematic_layers_select_public on public.bhuvan_thematic_layers;
create policy bhuvan_thematic_layers_select_public on public.bhuvan_thematic_layers
  for select to public
  using (true);

drop policy if exists bhuvan_thematic_layers_modify_admin on public.bhuvan_thematic_layers;
create policy bhuvan_thematic_layers_modify_admin on public.bhuvan_thematic_layers
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('ADMINISTRATOR', 'GIS_ANALYST')
    )
  );

create or replace function public.get_bhuvan_thematic_feature_collection(
  target_layer text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'id', b.id,
          'geometry', extensions.st_asgeojson(b.geom)::jsonb,
          'properties', jsonb_build_object(
            'layerId', b.layer_name,
            'id', b.id,
            'title', b.layer_name,
            'category', b.category,
            'description', b.description,
            'district', coalesce(b.district, ''),
            'block', coalesce(b.block, ''),
            'source', b.source_organization,
            'attribution', '© ISRO / NRSC Bhuvan',
            'properties', b.properties
          )
        )
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.bhuvan_thematic_layers b
  where b.geom is not null
    and (target_layer is null or b.layer_name = target_layer);

  return result;
end;
$$;

grant execute on function public.get_bhuvan_thematic_feature_collection(text) to authenticated, anon;
