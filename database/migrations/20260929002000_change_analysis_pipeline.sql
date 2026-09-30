-- Migration: 20260929002000_change_analysis_pipeline.sql
-- JALDRISHTI CHUNK 10: Before/After Change Analysis Pipeline
-- Connects real observations to reproducible change calculation, documented interpretation,
-- MultiPolygon(4326) affected geometry, and get_change_analysis_feature_collection() RPC.

-- Ensure change_analysis table has all required Chunk 10 fields
alter table public.change_analysis
  add column if not exists watershed_code text,
  add column if not exists before_indicator text,
  add column if not exists before_date timestamptz,
  add column if not exists before_value numeric,
  add column if not exists after_indicator text,
  add column if not exists after_date timestamptz,
  add column if not exists after_value numeric,
  add column if not exists processing_method text;

-- Make legacy indicator foreign key columns nullable to support direct observation comparisons
alter table public.change_analysis
  alter column baseline_indicator_id drop not null,
  alter column comparison_indicator_id drop not null;

-- Drop obsolete distinct check if present or recreate to permit nulls
alter table public.change_analysis
  drop constraint if exists change_analysis_distinct_indicators;

alter table public.change_analysis
  add constraint change_analysis_distinct_indicators
  check (
    baseline_indicator_id is null or comparison_indicator_id is null or baseline_indicator_id <> comparison_indicator_id
  );

-- Ensure affected_area is geometry(MultiPolygon, 4326)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'change_analysis' and column_name = 'affected_area'
  ) then
    alter table public.change_analysis add column affected_area extensions.geometry(MultiPolygon, 4326);
  end if;
end $$;

-- Add indexes for change analysis lookups
create index if not exists idx_change_analysis_watershed_code on public.change_analysis(watershed_code);
create index if not exists idx_change_analysis_dates on public.change_analysis(before_date, after_date);
create index if not exists idx_change_analysis_indicators on public.change_analysis(before_indicator, after_indicator);
create index if not exists idx_change_analysis_affected_area on public.change_analysis using gist(affected_area);

-- Create or update get_change_analysis_feature_collection() RPC
-- Returns GeoJSON with layerId: 'vegetation-change'
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
            'watershed_code', coalesce(analysis.watershed_code, w.code),
            'status', analysis.status,
            'before_indicator', analysis.before_indicator,
            'before_date', analysis.before_date,
            'before_value', analysis.before_value,
            'after_indicator', analysis.after_indicator,
            'after_date', analysis.after_date,
            'after_value', analysis.after_value,
            'observed_change', analysis.observed_change,
            'processing_method', analysis.processing_method,
            'summary', analysis.summary,
            'affected_area_ha', case
              when analysis.affected_area is not null
              then round((extensions.st_area(analysis.affected_area::extensions.geography) / 10000)::numeric, 2)
              else null
            end
          )
        ) order by analysis.created_at desc
      ),
      '[]'::jsonb
    )
  )
  from public.change_analysis as analysis
  left join public.watersheds as w on analysis.watershed_id = w.id
  where analysis.affected_area is not null;
$function$;

-- Update permissions
revoke all on function public.get_change_analysis_feature_collection() from public;
grant execute on function public.get_change_analysis_feature_collection() to anon, authenticated;

-- Ensure RLS policy permits reading change_analysis
drop policy if exists "public_read_change_analysis" on public.change_analysis;
create policy "public_read_change_analysis" on public.change_analysis for select using (true);
