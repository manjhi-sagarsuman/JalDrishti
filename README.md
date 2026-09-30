# JalDrishti (SIH26015) — Geospatial Watershed Monitoring & Evaluation Platform

JalDrishti is an end-to-end geospatial monitoring, temporal change detection, and geo-tagged field evidence platform designed for watershed interventions, water bodies restoration, and environmental indicators across India.

---

## 1. System Architecture

```
                                  [ User / Field Officer / GIS Analyst ]
                                                     │
                                                     ▼
                                       ┌──────────────────────────┐
                                       │   React 19 + TypeScript  │
                                       │   Vite + Tailwind CSS    │
                                       │   MapLibre GL Geospatial │
                                       └─────────────┬────────────┘
                                                     │
                                ┌────────────────────┴────────────────────┐
                                ▼                                         ▼
                     ┌──────────────────────┐                  ┌──────────────────────┐
                     │   lib/api.ts Client  │                  │   Supabase Client    │
                     │  FastAPI / Services  │                  │   PostGIS / Storage  │
                     └──────────┬───────────┘                  └──────────┬───────────┘
                                │                                         │
                                ▼                                         ▼
                     ┌──────────────────────┐                  ┌──────────────────────┐
                     │  Remote Sensing      │                  │  PostGIS Geometries  │
                     │  (NDVI, NDWI, NDVI-Δ)│                  │  & Geo-Photos Bucket │
                     └──────────────────────┘                  └──────────────────────┘
```

- **Frontend Client**: React 19, TypeScript, Vite, Tailwind CSS, MapLibre GL, Recharts, Lucide Icons.
- **Geospatial & Cartography**: MapLibre GL JS engine with multi-layer overlays (watershed polygons, drainage networks, geo-tagged photo markers, raster satellite footprints, and administrative boundaries).
- **Backend & Database Services**: Supabase with PostgreSQL + PostGIS extension, RPC geospatial pipelines, and Supabase Storage for geo-tagged evidence photos.
- **Analytics & Remote Sensing**: NDVI (Normalized Difference Vegetation Index), NDWI (Normalized Difference Water Index), temporal raster change detection, and source-attributed draft AI insights.

---

## 2. Prerequisites

- **Node.js**: `v20.x` or later
- **npm**: `v10.x` or later
- **PostgreSQL / PostGIS** (or Supabase project instance)

---

## 3. Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```env
# Application Mode
VITE_PROTOTYPE_MODE=true

# Supabase Credentials (Required for live database features)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_SUPABASE_STORAGE_BUCKET=geo-photos

# Optional Map & API Configuration
VITE_API_BASE_URL=
VITE_MAP_STYLE_URL=
VITE_SATELLITE_STYLE_URL=
VITE_TERRAIN_STYLE_URL=
```

---

## 4. Installation & Development

### Install Dependencies
```bash
npm install
```

### Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## 5. Available Application Routes

| Route | Description |
|---|---|
| `/` or `/dashboard` | Executive overview, operational summaries, KPI counters, and interactive mini-map |
| `/map` or `/gis/map-layers` | Full-screen interactive MapLibre GIS viewer with layer toggles, legend, and search |
| `/watersheds` or `/watersheds/:id` | Watershed explorer with boundary polygons, drainage indicators, and interventions |
| `/interventions` or `/interventions/:id`| Registration, spatial coordinates, and progress tracking for watershed works |
| `/geo-evidence` or `/geo-evidence/:id` | Gallery of geo-tagged field observations with GPS verification |
| `/upload` | Geo-tagged field photo upload with automatic metadata extraction |
| `/analytics` or `/analysis/analytics` | Statistical charts for vegetation, water coverage, and hydrological change |
| `/analysis/satellite-data` | Satellite scene metadata, footprints, and acquisition observation catalogs |
| `/analysis/change-detection` | Dual-date temporal comparison for NDVI and NDWI indicators |
| `/intelligence/ai-insights` | Source-attributed AI interpretation with confidence ratings and reasoning |
| `/reports` | Comprehensive watershed performance and intervention verification reports |
| `/system/data-management` | Data management workspace and spatial integrity validations |
| `/system/settings` | Custom user preferences (base map style, units, coordinate formats) |

---

## 6. Database & Migration Setup

Database migration scripts are located in `database/migrations/`:

1. `20260929000100_initial_schema.sql` — Base tables, PostGIS extensions, and schema definitions.
2. `20260929000200_row_level_security.sql` — Row Level Security (RLS) policies.
3. `20260929000300_geo_photos_storage.sql` — Storage bucket configuration for geo-tagged photos.
4. `20260929000400_intervention_reference_and_geojson.sql` — Interventions GeoJSON serialization.
5. `20260929000800_watershed_explorer_geojson.sql` — Watershed boundary and feature RPCs.
6. `20260929001000_seed_maharashtra_development_dataset.sql` — Starter baseline seed data.

### Seed Dataset Import
To seed local or remote Supabase instances with the starter dataset:
```bash
SUPABASE_URL="https://your-ref.supabase.co" SUPABASE_SERVICE_ROLE_KEY="your-key" npm run import:starter-data
```

---

## 7. Remote Sensing & Indicator Calculations

- **NDVI (Normalized Difference Vegetation Index)**:
  $$\text{NDVI} = \frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$$
- **NDWI (Normalized Difference Water Index)**:
  $$\text{NDWI} = \frac{\text{GREEN} - \text{NIR}}{\text{GREEN} + \text{NIR}}$$
- **Change Detection**:
  $$\Delta \text{Index} = \text{Index}_{\text{Post-Intervention}} - \text{Index}_{\text{Pre-Intervention}}$$

---

## 8. Demonstration Data Disclaimer

> [!NOTE]
> All sample raster scenes, pre-computed indices, and sample geo-tagged photos bundled in the demo workspace are provided strictly for **demonstration and testing purposes**. Synthetic or demonstration records are explicitly labelled and should not be used as official government field audits.

---

## 9. Security & Compliance

- Secrets and service role keys are excluded from source control and client bundles.
- Client requests only use publishable anonymous keys and authenticated user session tokens.
- All uploads validate MIME types (`image/jpeg`, `image/png`, `image/webp`) and limit file sizes to $\le 10\text{ MB}$.
