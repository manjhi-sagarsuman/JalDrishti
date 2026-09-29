-- Small internal development dataset for end-to-end SIH26015 demonstrations.
-- All records are replaceable and carry metadata.isDemo = true. Coordinates and
-- measurements are for development only and are not government observations.

begin;

insert into public.states (id, code, name, boundary, metadata)
values (
  '10000000-0000-4000-8000-000000000001', 'MH', 'Maharashtra',
  extensions.st_geomfromtext('MULTIPOLYGON(((72.6 15.6, 80.9 15.6, 80.9 21.5, 79.8 21.5, 79.8 22.1, 76.2 22.1, 72.6 20.8, 72.6 15.6)))', 4326),
  jsonb_build_object('isDemo', true, 'dataset_status', 'internal_development')
)
on conflict (id) do update set name = excluded.name, boundary = excluded.boundary, metadata = excluded.metadata;

insert into public.districts (id, state_id, code, name, boundary, metadata)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'PUN', 'Pune', extensions.st_geomfromtext('MULTIPOLYGON(((73.2 17.8, 74.4 17.8, 74.4 19.2, 73.2 19.2, 73.2 17.8)))', 4326), jsonb_build_object('isDemo', true)),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'NSK', 'Nashik', extensions.st_geomfromtext('MULTIPOLYGON(((73.2 19.2, 74.6 19.2, 74.6 20.5, 73.2 20.5, 73.2 19.2)))', 4326), jsonb_build_object('isDemo', true)),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'NGP', 'Nagpur', extensions.st_geomfromtext('MULTIPOLYGON(((78.4 20.7, 79.5 20.7, 79.5 21.8, 78.4 21.8, 78.4 20.7)))', 4326), jsonb_build_object('isDemo', true))
on conflict (id) do update set name = excluded.name, boundary = excluded.boundary, metadata = excluded.metadata;

insert into public.blocks (id, district_id, code, name, boundary, metadata)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'MUL', 'Mulshi', extensions.st_geomfromtext('MULTIPOLYGON(((73.35 18.35, 73.8 18.35, 73.8 18.75, 73.35 18.75, 73.35 18.35)))', 4326), jsonb_build_object('isDemo', true)),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'MAV', 'Maval', extensions.st_geomfromtext('MULTIPOLYGON(((73.55 18.75, 74.05 18.75, 74.05 19.15, 73.55 19.15, 73.55 18.75)))', 4326), jsonb_build_object('isDemo', true)),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'SIN', 'Sinnar', extensions.st_geomfromtext('MULTIPOLYGON(((73.8 19.75, 74.35 19.75, 74.35 20.15, 73.8 20.15, 73.8 19.75)))', 4326), jsonb_build_object('isDemo', true)),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', 'HIN', 'Hingna', extensions.st_geomfromtext('MULTIPOLYGON(((78.7 20.85, 79.2 20.85, 79.2 21.25, 78.7 21.25, 78.7 20.85)))', 4326), jsonb_build_object('isDemo', true))
on conflict (id) do update set name = excluded.name, boundary = excluded.boundary, metadata = excluded.metadata;

insert into public.villages (id, block_id, code, name, boundary, metadata)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'MUL001', 'Paud', extensions.st_geomfromtext('MULTIPOLYGON(((73.48 18.48, 73.62 18.48, 73.62 18.62, 73.48 18.62, 73.48 18.48)))', 4326), jsonb_build_object('isDemo', true, 'latitude', 18.55, 'longitude', 73.55)),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'MAV001', 'Kamshet', extensions.st_geomfromtext('MULTIPOLYGON(((73.72 18.88, 73.86 18.88, 73.86 19.02, 73.72 19.02, 73.72 18.88)))', 4326), jsonb_build_object('isDemo', true, 'latitude', 18.95, 'longitude', 73.79)),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'SIN001', 'Wavi', extensions.st_geomfromtext('MULTIPOLYGON(((74.02 19.88, 74.16 19.88, 74.16 20.02, 74.02 20.02, 74.02 19.88)))', 4326), jsonb_build_object('isDemo', true, 'latitude', 19.95, 'longitude', 74.09)),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'HIN001', 'Digdoh', extensions.st_geomfromtext('MULTIPOLYGON(((78.88 20.98, 79.02 20.98, 79.02 21.12, 78.88 21.12, 78.88 20.98)))', 4326), jsonb_build_object('isDemo', true, 'latitude', 21.05, 'longitude', 78.95)),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', 'HIN002', 'Waddhamna', extensions.st_geomfromtext('MULTIPOLYGON(((79.02 21.12, 79.16 21.12, 79.16 21.26, 79.02 21.26, 79.02 21.12)))', 4326), jsonb_build_object('isDemo', true, 'latitude', 21.19, 'longitude', 79.09))
on conflict (id) do update set name = excluded.name, boundary = excluded.boundary, metadata = excluded.metadata;

insert into public.watersheds (id, code, name, status, boundary, area_sq_km, metadata)
values
  ('50000000-0000-4000-8000-000000000001', 'MH-PUN-MUL-001', 'Paud Upper Catchment', 'ACTIVE', extensions.st_geomfromtext('MULTIPOLYGON(((73.49 18.49, 73.61 18.49, 73.61 18.61, 73.49 18.61, 73.49 18.49)))', 4326), 14.2, jsonb_build_object('isDemo', true, 'latitude', 18.55, 'longitude', 73.55)),
  ('50000000-0000-4000-8000-000000000002', 'MH-PUN-MAV-001', 'Kamshet Valley', 'ACTIVE', extensions.st_geomfromtext('MULTIPOLYGON(((73.73 18.89, 73.85 18.89, 73.85 19.01, 73.73 19.01, 73.73 18.89)))', 4326), 11.8, jsonb_build_object('isDemo', true, 'latitude', 18.95, 'longitude', 73.79)),
  ('50000000-0000-4000-8000-000000000003', 'MH-NSK-SIN-001', 'Wavi Micro Watershed', 'PLANNED', extensions.st_geomfromtext('MULTIPOLYGON(((74.03 19.89, 74.15 19.89, 74.15 20.01, 74.03 20.01, 74.03 19.89)))', 4326), 9.6, jsonb_build_object('isDemo', true, 'latitude', 19.95, 'longitude', 74.09)),
  ('50000000-0000-4000-8000-000000000004', 'MH-NGP-HIN-001', 'Digdoh Drainage Catchment', 'ACTIVE', extensions.st_geomfromtext('MULTIPOLYGON(((78.89 20.99, 79.01 20.99, 79.01 21.11, 78.89 21.11, 78.89 20.99)))', 4326), 12.4, jsonb_build_object('isDemo', true, 'latitude', 21.05, 'longitude', 78.95))
;

insert into public.watershed_villages (watershed_id, village_id, coverage_percent, is_primary)
values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 100, true),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 100, true),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 100, true),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 80, true),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000005', 20, false)
on conflict (watershed_id, village_id) do update set coverage_percent = excluded.coverage_percent, is_primary = excluded.is_primary;

insert into public.data_sources (id, code, name, organization, license, description, metadata)
values (
  '60000000-0000-4000-8000-000000000001', 'SIH26015_INTERNAL_DEVELOPMENT', 'SIH26015 Development Dataset', 'JalDrishti project team', 'Internal development use', 'Replaceable Maharashtra hierarchy and monitoring records for end-to-end application verification.', jsonb_build_object('isDemo', true, 'source_date', '2026-09-29', 'access_date', '2026-09-29', 'crs', 'EPSG:4326', 'processing', 'Manually authored valid geometries and linked relational records; not an official government dataset.')
)
on conflict (id) do update set name = excluded.name, metadata = excluded.metadata;

insert into public.interventions (id, watershed_id, village_id, intervention_type_id, code, name, description, status, location, actual_start, metadata)
select seed.id, seed.watershed_id, seed.village_id, intervention_types.id, seed.code, seed.name, seed.description, seed.status, extensions.st_geomfromtext(seed.location_wkt, 4326), seed.actual_start, jsonb_build_object('isDemo', true, 'data_source_id', '60000000-0000-4000-8000-000000000001')
from (values
  ('70000000-0000-4000-8000-000000000001'::uuid, '50000000-0000-4000-8000-000000000001'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 'CHECK_DAM', 'MH-PUN-MUL-INT-001', 'Paud check dam', 'Water conservation structure record for workflow verification.', 'COMPLETED', 'POINT(73.55 18.55)', '2025-06-15'::date),
  ('70000000-0000-4000-8000-000000000002'::uuid, '50000000-0000-4000-8000-000000000002'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 'FARM_POND', 'MH-PUN-MAV-INT-001', 'Kamshet farm pond', 'Farm pond record for workflow verification.', 'IN_PROGRESS', 'POINT(73.79 18.95)', '2025-09-10'::date),
  ('70000000-0000-4000-8000-000000000003'::uuid, '50000000-0000-4000-8000-000000000003'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 'CONTOUR_BUND', 'MH-NSK-SIN-INT-001', 'Wavi contour bund', 'Soil and moisture conservation record for workflow verification.', 'PLANNED', 'POINT(74.09 19.95)', null),
  ('70000000-0000-4000-8000-000000000004'::uuid, '50000000-0000-4000-8000-000000000004'::uuid, '40000000-0000-4000-8000-000000000004'::uuid, 'DRAINAGE_TREATMENT', 'MH-NGP-HIN-INT-001', 'Digdoh drainage treatment', 'Drainage treatment record for workflow verification.', 'APPROVED', 'POINT(78.95 21.05)', null)
) as seed(id, watershed_id, village_id, type_code, code, name, description, status, location_wkt, actual_start)
join public.intervention_types on intervention_types.code = seed.type_code
on conflict (id) do update set name = excluded.name, description = excluded.description, status = excluded.status, location = excluded.location, metadata = excluded.metadata;

insert into public.geo_photos (id, watershed_id, intervention_id, storage_path, file_name, mime_type, captured_at, location, gps_validation, verification_status, notes, metadata)
values
  ('80000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'development/maharashtra/paud-check-dam-01.jpg', 'paud-check-dam-01.jpg', 'image/jpeg', '2025-06-20T09:30:00Z', extensions.st_geomfromtext('POINT(73.55 18.55)', 4326), 'VALID', 'VERIFIED', 'Development evidence record; image asset pending replacement.', jsonb_build_object('isDemo', true, 'observation_type', 'Water Structure')),
  ('80000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'development/maharashtra/kamshet-farm-pond-01.jpg', 'kamshet-farm-pond-01.jpg', 'image/jpeg', '2025-09-15T10:00:00Z', extensions.st_geomfromtext('POINT(73.79 18.95)', 4326), 'VALID', 'VERIFIED', 'Development evidence record; image asset pending replacement.', jsonb_build_object('isDemo', true, 'observation_type', 'Water Structure'))
on conflict (id) do update set notes = excluded.notes, metadata = excluded.metadata, verification_status = excluded.verification_status;

insert into public.satellite_scenes (id, watershed_id, data_source_id, scene_identifier, platform, sensor, acquired_at, cloud_cover_percent, footprint, asset_path, status, metadata)
values
  ('90000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'SIH-MH-PUN-MUL-2025-01', 'Sentinel-2', 'MSI', '2025-01-15T00:00:00Z', 12, extensions.st_geomfromtext('MULTIPOLYGON(((73.48 18.48, 73.62 18.48, 73.62 18.62, 73.48 18.62, 73.48 18.48)))', 4326), 'development/maharashtra/scenes/MH-PUN-MUL-2025-01', 'READY', jsonb_build_object('isDemo', true, 'processing_level', 'development_record', 'crs', 'EPSG:4326')),
  ('90000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'SIH-MH-PUN-MUL-2025-09', 'Sentinel-2', 'MSI', '2025-09-15T00:00:00Z', 9, extensions.st_geomfromtext('MULTIPOLYGON(((73.48 18.48, 73.62 18.48, 73.62 18.62, 73.48 18.62, 73.48 18.48)))', 4326), 'development/maharashtra/scenes/MH-PUN-MUL-2025-09', 'READY', jsonb_build_object('isDemo', true, 'processing_level', 'development_record', 'crs', 'EPSG:4326')),
  ('90000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'SIH-MH-PUN-MAV-2025-01', 'Sentinel-2', 'MSI', '2025-01-15T00:00:00Z', 14, extensions.st_geomfromtext('MULTIPOLYGON(((73.73 18.89, 73.85 18.89, 73.85 19.01, 73.73 19.01, 73.73 18.89)))', 4326), 'development/maharashtra/scenes/MH-PUN-MAV-2025-01', 'READY', jsonb_build_object('isDemo', true, 'processing_level', 'development_record', 'crs', 'EPSG:4326')),
  ('90000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'SIH-MH-PUN-MAV-2025-09', 'Sentinel-2', 'MSI', '2025-09-15T00:00:00Z', 11, extensions.st_geomfromtext('MULTIPOLYGON(((73.73 18.89, 73.85 18.89, 73.85 19.01, 73.73 19.01, 73.73 18.89)))', 4326), 'development/maharashtra/scenes/MH-PUN-MAV-2025-09', 'READY', jsonb_build_object('isDemo', true, 'processing_level', 'development_record', 'crs', 'EPSG:4326'))
on conflict (id) do update set status = excluded.status, metadata = excluded.metadata;

insert into public.satellite_observations (id, watershed_id, satellite_scene_id, data_source_id, observation_code, observed_at, statistic, value, unit, raster_asset_path, status, quality_metadata)
values
  ('91000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'NDVI', '2025-01-15T00:00:00Z', 'mean', 0.42, 'index', null, 'AVAILABLE', jsonb_build_object('isDemo', true)),
  ('91000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'NDVI', '2025-09-15T00:00:00Z', 'mean', 0.48, 'index', null, 'AVAILABLE', jsonb_build_object('isDemo', true)),
  ('91000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'NDWI', '2025-01-15T00:00:00Z', 'mean', 0.18, 'index', null, 'AVAILABLE', jsonb_build_object('isDemo', true)),
  ('91000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'NDWI', '2025-09-15T00:00:00Z', 'mean', 0.23, 'index', null, 'AVAILABLE', jsonb_build_object('isDemo', true)),
  ('91000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001', 'NDVI', '2025-01-15T00:00:00Z', 'mean', 0.39, 'index', null, 'AVAILABLE', jsonb_build_object('isDemo', true)),
  ('91000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001', 'NDVI', '2025-09-15T00:00:00Z', 'mean', 0.44, 'index', null, 'AVAILABLE', jsonb_build_object('isDemo', true))
on conflict (id) do update set value = excluded.value, quality_metadata = excluded.quality_metadata;

insert into public.indicators (id, watershed_id, source_observation_id, data_source_id, indicator_code, name, observed_at, value, unit, status, quality_metadata)
values
  ('92000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'NDVI', 'Normalized Difference Vegetation Index', '2025-01-15T00:00:00Z', 0.42, 'index', 'VALIDATED', jsonb_build_object('isDemo', true)),
  ('92000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'NDVI', 'Normalized Difference Vegetation Index', '2025-09-15T00:00:00Z', 0.48, 'index', 'VALIDATED', jsonb_build_object('isDemo', true)),
  ('92000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000001', 'NDVI', 'Normalized Difference Vegetation Index', '2025-01-15T00:00:00Z', 0.39, 'index', 'VALIDATED', jsonb_build_object('isDemo', true)),
  ('92000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000001', 'NDVI', 'Normalized Difference Vegetation Index', '2025-09-15T00:00:00Z', 0.44, 'index', 'VALIDATED', jsonb_build_object('isDemo', true))
on conflict (id) do update set value = excluded.value, quality_metadata = excluded.quality_metadata;

insert into public.change_analysis (id, watershed_id, baseline_indicator_id, comparison_indicator_id, status, observed_change, affected_area, summary, results, metadata)
values
  ('93000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', 'REVIEWED', 0.06, extensions.st_geomfromtext('MULTIPOLYGON(((73.50 18.50, 73.60 18.50, 73.60 18.60, 73.50 18.60, 73.50 18.50)))', 4326), 'Observed change in NDVI between recorded dates.', jsonb_build_object('indicator', 'NDVI'), jsonb_build_object('isDemo', true, 'processing_method', 'Development comparison record')),
  ('93000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000004', 'REVIEWED', 0.05, extensions.st_geomfromtext('MULTIPOLYGON(((73.74 18.90, 73.84 18.90, 73.84 19.00, 73.74 19.00, 73.74 18.90)))', 4326), 'Observed change in NDVI between recorded dates.', jsonb_build_object('indicator', 'NDVI'), jsonb_build_object('isDemo', true, 'processing_method', 'Development comparison record'))
on conflict (id) do update set observed_change = excluded.observed_change, status = excluded.status, summary = excluded.summary, metadata = excluded.metadata;

commit;