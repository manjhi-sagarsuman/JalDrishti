# JalDrishti – Supabase/API/Map Starter Dataset

Generated: 2026-09-29
Scope: Pune district, Maharashtra; Junnar + Mulshi starter records.

## Important
This package is deliberately hybrid:
- `administrative.csv` is a small source-backed sample using Maharashtra LGD-linked identifiers and public village coordinates.
- `watersheds.*`, `interventions.csv`, `geo_tagged_photos.csv`, `photos/*`, `satellite_scenes.csv`, `satellite_observations.csv`, and `change_analysis.csv` contain clearly marked DEMO/SYNTHETIC records intended to make the existing Supabase/API/map flow work immediately.
- The generated polygons are not official watershed boundaries, and placeholder photos are not field evidence.

## Files
- administrative.csv
- watersheds.geojson
- watersheds.csv
- interventions.csv
- geo_tagged_photos.csv
- photos/*.jpg
- satellite_scenes.csv
- satellite_observations.csv
- change_analysis.csv
- provenance.csv

## Recommended import order
1. administrative.csv
2. watersheds.geojson / watersheds.csv
3. interventions.csv
4. geo_tagged_photos.csv + photos/
5. satellite_scenes.csv
6. satellite_observations.csv
7. change_analysis.csv
8. provenance.csv

## Production data sources
- LGD: https://data.gov.in/catalog/local-government-directory-lgd
- Maharashtra village boundaries (official NWDP GeoJSON ZIP): https://nwdp.nwic.gov.in/dataset/9bad17f2-9d88-428d-98ad-831ef01ae2e4/resource/41bc7681-d90c-4338-8fdc-35f5f98bc417/download/vb_soi_mh_geojson.zip
- Maharashtra village boundary catalog page: https://www.nwdp.nwic.gov.in/dataset/village-boundary
- DataMeet Maharashtra village boundaries: https://projects.datameet.org/indian_village_boundaries/mh/
- Bhuvan PMKSY / watershed viewer: https://bhuvan-app1.nrsc.gov.in/pmksy/index.php
- Sentinel-2 SR Harmonized (Earth Engine): https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED

## No secrets
No passwords, service-role keys, API keys, or private credentials are included.
