# JalDrishti (SIH26015) — Implementation Plan for a VS Code AI Coding Agent

Stack: React + Vite + TypeScript · Tailwind · Lucide · MapLibre GL JS · Recharts · Supabase/PostGIS (optional switch) · Python pipeline (GeoPandas, Rasterio, Shapely, OpenCV).
Design source of truth: the "Reference Analysis" and design system agreed earlier (Part 2 layout: dark navy sidebar, slim top bar, light content).

---

## How to use this document

1. Work **one section at a time**, in order. Each section has: what to build, files, what to hardcode, assets, what only you can do, dependencies, a **copy-paste PROMPT**, and a **verification gate**.
2. Paste the PROMPT into your agent chat (Copilot Agent, Cursor, Claude Code, Cline, etc.). Every prompt begins with "Read AGENTS.md first" so it works even in a fresh chat.
3. Do the **"Only you can do"** steps *before* pasting the prompt if they are marked BEFORE, and *after* if marked AFTER.
4. Do not move on until the verification gate passes. Commit after every section (`git add -A && git commit -m "S6: map core"`). If the agent damages something, `git restore .` or `git reset --hard HEAD`.
5. Text in `<ANGLE_BRACKETS>` inside a prompt is something **you** must replace before pasting.

### Prerequisites (install once)

| Tool | Why | Check |
|---|---|---|
| Node.js 20+ and npm | Frontend | `node -v` |
| Git + a GitHub account | Version control, deployment | `git --version` |
| VS Code + your AI agent extension | Coding | — |
| Python 3.11+ | Data pipeline (S5), optional AI API (S16) | `python --version` |
| QGIS (free) | Inspecting/cleaning GIS data by hand | open it |
| Docker Desktop + Supabase CLI | Only for S15 (optional local backend) | `docker -v`, `supabase -v` |
| Chrome + a real Android/iOS phone | Responsive testing | — |

### Suggested 3-day mapping (from your brief)

| Day | Sections |
|---|---|
| 0 (before hackathon or evening before) | S0–S5 (setup, design system, shell, data layer, **real data collection**) |
| 1 | S6 Map core, S7 Dashboard, S8 Watersheds, S9 Interventions |
| 2 | S10 Field Evidence, S11 Satellite + Before/After, S12 Analytics/Decision, S13 Provenance |
| 3 | S14 Reports, S15 Supabase (only if time), S16 AI (only if stable), S17 Responsive, S18 Testing, S19 Polish/Deploy |

Real data collection (S5) is the biggest schedule risk. **Start it first**, in parallel with S1–S4.

### What your repo already contains (from the tree you pasted)

`src/App.tsx, main.tsx, index.css, App.css` · `components/{Navbar,Sidebar,StatCard}.tsx` · `components/skeleton/DashboardSkeleton.tsx` · `layouts/DashboardLayout.tsx` · `maps/MapView.tsx` · `pages/{AnalysisPage,Dashboard,ImagesPage,Login,MapPage,PublicHome,ReportsPage}.tsx` · `services/api.ts` · `types/watershed.ts` · empty folders `charts/, hooks/, components/ui/, public/icons, public/images` · `public/logos/jaldrishti-icon.png`.
I could not see the *contents* of these files or your `package.json`, so **S0 is a read-only audit** and every later prompt says "extend existing files, don't duplicate". `zod` appears in `node_modules` but may only be an ESLint transitive dependency — S1 adds it explicitly.

### Global conventions (enforced by AGENTS.md in S0)

- No invented government data, URLs, statistics, or photos presented as official. Unknown real values are written as `TODO_REAL:<what is needed>`; a script (S18) fails the build if any remain in shipped data.
- Anything not from an official source has `isDemo: true` and renders a purple **DEMO DATA** badge.
- Wording: "observed change", "association", "candidate area for further assessment". Never "impact", "caused", "due to the intervention", "effectiveness score".
- Every chart/KPI/analysis has a source caption + provenance chip; every analysis view has the **Limitation** callout.

---

# SECTION 0 — Ground rules and repository audit

**Build:** an `AGENTS.md` rulebook that every later prompt relies on, plus a read-only audit of what exists.

**Files:** create `AGENTS.md` (root), `docs/AUDIT.md`. Optionally copy `AGENTS.md` to the file your agent actually reads: `.github/copilot-instructions.md` (Copilot), `CLAUDE.md` (Claude Code), `.cursor/rules/jaldrishti.mdc` (Cursor).

**Hardcode by hand:** nothing yet.

**Assets/links:** none.

**Only you can do:**
1. BEFORE: `git init` if the repo isn't tracked; commit the current state (`git add -A && git commit -m "baseline"`).
2. AFTER: read `docs/AUDIT.md` and confirm the agent's findings match what you see in `package.json`.
3. Copy `AGENTS.md` to your agent's rules file (see above).

**Dependencies/config:** none.

### PROMPT 0A — audit (read-only)

```text
You are working in an existing Vite + React + TypeScript project called JalDrishti (Smart India Hackathon 2026, problem SIH26015: GIS-based watershed decision-support platform).

TASK: Perform a READ-ONLY audit. Do NOT modify, install, delete or rename anything except creating docs/AUDIT.md.

1. Read package.json, vite.config.*, tsconfig*.json, eslint config, index.html, src/main.tsx, src/App.tsx, src/index.css, and every file under src/ (components, layouts, maps, pages, services, types).
2. In docs/AUDIT.md report:
   - Installed dependencies and versions (explicitly: tailwindcss and which integration @tailwindcss/vite or postcss, react-router-dom, maplibre-gl, recharts, lucide-react, zod, any UI library).
   - For each existing source file: purpose, what it currently renders, whether it uses hardcoded data, and whether it is a placeholder.
   - Routing: how pages are wired today.
   - Problems: unused files (e.g. default Vite demo files), missing dependencies, TypeScript strictness, lint errors (run `npm run lint` and `npx tsc --noEmit` and include the output).
   - A gap list versus this target: pages Dashboard, Map View, Watersheds (explorer+detail), Interventions (list+detail), Field Evidence (geo-tagged photos), Analysis (satellite + before/after), Analytics, Decision Support, Provenance, Reports, AI Image Intelligence, Settings, Login, Public Home.
3. Do not propose code. End with a numbered list of the 10 highest-risk gaps.
```

### PROMPT 0B — create the rulebook

```text
Create AGENTS.md at the repo root with EXACTLY the following rules (keep wording; you may format as Markdown):

PROJECT: JalDrishti — GeoAI Watershed Intelligence, SIH26015. A GIS decision-support and monitoring platform for the Ministry of Rural Development / DoLR. Users: ADMIN, STATE_OFFICER, DISTRICT_OFFICER, FIELD_OFFICER, GIS_ANALYST.
STACK (do not add others without asking): React, Vite, TypeScript (strict), Tailwind CSS, lucide-react (only icon library), maplibre-gl (plain, no react-map-gl), recharts, react-router-dom, zod, turf (individual @turf/* packages only), date-fns, @react-pdf/renderer (reports only, lazy-loaded), Supabase JS (optional, behind a flag).
STRUCTURE: src/{components/ui, components/<feature>, features, pages, layouts, maps, charts, hooks, services, types, lib, config, data}; public/{data,images,logos,icons,fonts}; pipeline/ (Python); supabase/.
RULES:
1. TypeScript strict, no `any`, no ts-ignore. Functional components, named exports for components, one component per file.
2. Styling only via Tailwind classes that use design tokens defined in src/index.css. No hardcoded hex colors or px font sizes in components. Body text min 14px; 12px only for map labels/captions. Icons only from lucide-react.
3. All data access goes through src/services/api.ts (DataRepository interface). Components never fetch directly. Data source switch: VITE_DATA_SOURCE=mock|supabase.
4. NEVER invent real-looking government data, dataset URLs, statistics, coordinates, names or photos. If a real value is needed and unknown, write TODO_REAL:<description>. Values that are not from an official source must carry isDemo: true and render <DemoBadge/>.
5. WORDING: use "observed change", "association", "candidate area for further assessment". Forbidden phrases anywhere in UI text: "impact of the intervention", "caused", "due to the intervention", "impact score", "effectiveness score", "proves". Every analysis view must render <LimitationNote/>.
6. Every chart, KPI and analytic output must show a source caption and a <ProvenanceChip provenanceId=.../> that resolves in public/data/provenance.json.
7. Accessibility: semantic HTML, visible focus ring, aria-labels on icon buttons, color is never the only signal (use shape/text), contrast >= 4.5:1 for text, respect prefers-reduced-motion.
8. Every data-loading view implements loading (skeleton), empty, and error (with retry) states.
9. Work ONLY on the section the user names. Do not refactor unrelated files. If you must touch a file outside the stated list, say so and why.
10. Before finishing any task run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and report results honestly, including failures. Do not claim something works unless you ran it.
11. Do not add dependencies without listing them and the reason first. Do not commit secrets; use .env.local.
12. Prefer small commits. Suggested message format: "S<number>: <summary>".
```

**Verify:** `AGENTS.md` and `docs/AUDIT.md` exist; the audit lists your real dependency versions; `git status` shows only those two files (plus optional rules-file copy). Commit.

---

# SECTION 1 — Project setup, dependencies, folder structure

**Build:** working toolchain, dependencies, path alias `@/`, fonts (bundled, offline-safe), env file, scripts, empty folder skeleton, cleanup of default Vite demo code.

**Files:** modify `package.json`, `vite.config.ts`, `tsconfig.app.json`, `index.html`, `src/main.tsx`, `src/index.css`; create `.env.example`, `.gitignore` additions, `vitest.config.ts` (or config inside vite config), `src/test/setup.ts`, `scripts/check-placeholders.mjs` (stub), folder skeleton with `.gitkeep`.

**Hardcode by hand:** `index.html` `<title>` and description text (agent proposes, you approve).

**Assets/links:** favicon → `public/favicon.svg` or `.png` (you export from your logo file; see S5H).

**Only you can do:**
1. BEFORE: confirm `node -v` ≥ 20.
2. Decide: keep or delete `src/assets/hero.png` (agent will ask; it may be your own image).
3. AFTER: `npm install` locally, run `npm run dev`, open `http://localhost:5173`.
4. Create the GitHub repo and push (`git remote add origin … && git push -u origin main`).

**Dependencies/config:** runtime `react-router-dom maplibre-gl recharts lucide-react clsx tailwind-merge zod date-fns exifr @turf/bbox @turf/area @turf/buffer @turf/distance @turf/boolean-point-in-polygon @turf/nearest-point-on-line @turf/helpers @fontsource-variable/inter @fontsource/noto-sans-devanagari`; types `@types/geojson`; dev `vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier`. (`@react-pdf/renderer` is added in S14, `@supabase/supabase-js` in S15.)

### PROMPT 1

```text
Read AGENTS.md and docs/AUDIT.md first. Section 1: project setup. Do not build any UI yet.

1. Dependencies: detect what is installed (see docs/AUDIT.md). Install only what is missing. Runtime: react-router-dom maplibre-gl recharts lucide-react clsx tailwind-merge zod date-fns exifr @turf/bbox @turf/area @turf/buffer @turf/distance @turf/boolean-point-in-polygon @turf/nearest-point-on-line @turf/helpers @fontsource-variable/inter @fontsource/noto-sans-devanagari. Types: @types/geojson. Dev: vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier. Ensure Tailwind is installed and working; if the audit shows Tailwind v4 use the @tailwindcss/vite plugin and `@import "tailwindcss";` in src/index.css; if v3 keep its config. Report the versions you end up with.
2. Add path alias `@` -> `src` in vite.config.ts and tsconfig.app.json. Enable TypeScript strict mode.
3. package.json scripts: dev, build, preview, lint, typecheck (tsc -b --noEmit or equivalent), test (vitest run), test:watch, check:placeholders (node scripts/check-placeholders.mjs), format.
4. Create scripts/check-placeholders.mjs: recursively scan public/data/**/*.json and src/data/**/* for the string "TODO_REAL"; print each file+line; exit code 1 if any found. (It will be wired into CI/final checks later.)
5. Create the folder skeleton with .gitkeep where empty: src/{components/ui,features,hooks,charts,lib,config,data,test}, public/{data,images/photos,images/branding,icons,fonts,logos}, pipeline/, docs/.
6. Import fonts in src/main.tsx: '@fontsource-variable/inter' and '@fontsource/noto-sans-devanagari/400.css' and '/700.css'. Do NOT load fonts from a CDN.
7. Create .env.example with: VITE_DATA_SOURCE=mock, VITE_SUPABASE_URL=, VITE_SUPABASE_ANON_KEY=, VITE_APP_ENV=development. Ensure .env.local, node_modules, dist, pipeline/raw, pipeline/.venv, *.tif, *.tiff are in .gitignore (raw satellite files must never be committed).
8. Vitest: jsdom environment, setup file src/test/setup.ts importing @testing-library/jest-dom, plus one smoke test that renders <App/> inside a MemoryRouter and asserts something stable.
9. index.html: lang="en", title "JalDrishti — GeoAI Watershed Intelligence", meta description, theme-color #0B2D5B, favicon link to /favicon.svg (leave a TODO note if the file is missing; do not generate a fake logo).
10. Remove Vite demo leftovers (App.css contents, react.svg, vite.svg usage). For src/assets/hero.png: do NOT delete; list where it is used and ask me.
11. Run typecheck, lint, test, build. Report the exact output summary.
```

**Verify:** `npm run dev` opens with no console errors; `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` all pass; `npm ls maplibre-gl recharts react-router-dom` lists them; `git status` clean after commit.

---

# SECTION 2 — Design system and base UI kit

**Build:** design tokens in CSS, and a reusable component kit used by every page, plus a hidden gallery route to review it.

**Files:** modify `src/index.css`; create `src/lib/cn.ts`; create in `src/components/ui/`: `Button, IconButton, Badge, StatusBadge (planned/in-progress/completed/needs-verification), VerificationBadge, GpsBadge, DemoBadge, Card, StatCard (move/extend existing components/StatCard.tsx), Input, Select, DateRangeInput, Checkbox, Switch, Slider, Tabs, SegmentedControl, Table (sortable, sticky header), Pagination, Modal, Drawer (right and bottom-sheet variants), Tooltip, Skeleton, Spinner, EmptyState, ErrorState, Alert, LimitationNote, ProvenanceChip (popover), ProgressBar, Breadcrumbs`; `src/pages/dev/UiGallery.tsx` (route `/dev/ui`, dev-only).

**Hardcode by hand:** the token values (below) and the fixed Limitation text. Nothing else.

**Assets/links:** none (icons come from Lucide).

**Only you can do:**
1. AFTER: open `/dev/ui` side-by-side with the reference PDFs (button hierarchy page, Part 2) and judge look and feel. Note any adjustments and send them as a follow-up prompt.
2. AFTER: check contrast on primary button, muted text and badges with Chrome DevTools (inspect → color picker shows contrast ratio).

**Dependencies/config:** none new.

### PROMPT 2

```text
Read AGENTS.md first. Section 2: design system + base UI kit. Extend existing files (components/StatCard.tsx exists — move it into components/ui and update imports).

TOKENS in src/index.css (Tailwind theme variables; use the syntax of the installed Tailwind version):
Colors: navy-900 #0B2D5B; primary-600 #1565C0; primary-700 #0D47A1; water-500 #1E88E5; nature-700 #2E7D32; growth-400 #8BC34A (decorative/charts only, never text); bg #F4F8FC; surface #FFFFFF; border #DCE6F1; text #0F1F3A; muted #5B6B82; sidebar #0B2D5B with hover #123A73 and active #1565C0.
Status: success #2E7D32 on #E8F5E9; warning #B45309 on #FFF4E5; danger #C62828 on #FDECEA; info #1565C0 on #E8F1FC; demo #6A1B9A on #F3E5F5.
Radius: 6px controls, 10px cards, 9999px badges. Shadows: sm 0 1px 2px rgba(11,45,91,.08); md 0 6px 16px rgba(11,45,91,.12).
Type: Inter Variable (fallback "Noto Sans Devanagari", system-ui). Scale 12/14/16/20/24/30. Body 14px. Tabular numerals utility for numbers/coordinates. Focus ring: 2px primary-600 with 2px offset.
Spacing: 4px base.
Map/data colors as tokens too: ndvi ramp (5 steps), change diverging ramp using a colour-blind-safe brown->teal (NOT red->green), water, watershed outline, photo marker (nature), intervention marker (orange #E65100 on white text 4.5:1 check), selected halo.

COMPONENTS (all in src/components/ui, typed props, forwardRef where relevant, accessible):
Button (variants primary/secondary/tertiary/destructive; sizes sm/md/lg; states default/hover/loading/disabled; leading icon), IconButton (requires aria-label), Badge, StatusBadge, VerificationBadge (verified/pending/rejected), GpsBadge (valid/no-gps/invalid), DemoBadge (purple, text "DEMO DATA" / "Demonstration Field Dataset" via prop), Card (+CardHeader/CardBody), StatCard (icon, label, value, optional delta with baseline label, provenance chip slot), Input, Select (native <select> styled), DateRangeInput, Checkbox, Switch, Slider (opacity), Tabs (keyboard accessible), SegmentedControl, Table (sticky header, sortable columns, row hover callback, empty state), Pagination, Modal, Drawer (variants: right, bottom-sheet), Tooltip, Skeleton, Spinner, EmptyState (icon, title, description, action), ErrorState (message, retry button, error id), Alert (info/warning/danger/success), LimitationNote (fixed orange callout, default text: "This is an observed spatial/temporal association from satellite and field data. It does not by itself establish that a specific intervention caused the change. Ground verification is recommended." — allow a `children` override that appends extra text), ProvenanceChip (small info button opening a popover with Source, Dataset, Date, Resolution, Processing, Method, Status, Licence, Link; takes provenanceId and resolves it through a `useProvenance(id)` hook stub returning TODO_REAL fields until Section 13), ProgressBar, Breadcrumbs.

Create src/pages/dev/UiGallery.tsx showing every component in every state, routed at /dev/ui ONLY when import.meta.env.DEV is true.
Add a Vitest test for Button (loading disables click), LimitationNote (renders default text), and Tabs (arrow-key navigation).
Do not create page layouts yet. Run typecheck/lint/test/build and report.
```

**Verify:** `/dev/ui` displays every component with all states; Tab key shows the focus ring on every interactive element; no hex colours in component files (`grep -rn "#[0-9A-Fa-f]\{6\}" src/components` returns only token-free results); tests pass.

---

# SECTION 3 — App shell, routing, and mock authentication

**Build:** sidebar + top bar layout, route table (with placeholder pages), role-aware navigation, Login and PublicHome pages, mock auth with roles.

**Files:** modify `src/App.tsx`, `src/layouts/DashboardLayout.tsx`, `src/components/Sidebar.tsx`, `src/components/Navbar.tsx` (becomes the top bar), `src/pages/Login.tsx`, `src/pages/PublicHome.tsx`, existing `pages/*`; create `src/config/nav.ts`, `src/config/roles.ts` (permission matrix), `src/features/auth/{AuthContext.tsx,useAuth.ts,ProtectedRoute.tsx,RequirePermission.tsx}`, `src/data/demoUsers.ts`, `src/pages/{WatershedsPage,WatershedDetailPage,InterventionsPage,InterventionDetailPage,ProvenancePage,AnalyticsPage,DecisionSupportPage,AiPage,SettingsPage,NotFound}.tsx` (placeholders with EmptyState), and rename `pages/ImagesPage.tsx` → `pages/FieldEvidencePage.tsx` using `git mv`.

**Hardcode by hand:**
- Navigation items and groups (Overview, GIS, Analysis, Trust, Output, Intelligence, Admin) — agent creates from the spec below; you review labels.
- Permission matrix.
- Demo accounts (one per role) in `demoUsers.ts` marked `isDemo`. Example emails `admin@demo.jaldrishti.test`, etc. **Mock auth is not security** — it is replaced by Supabase Auth in S15.
- Login page footer text: "Prototype developed for SIH 2026 (SIH26015). Not an official Government of India application."

**Assets/links:**
- Full logo (horizontal, light-on-dark version for the sidebar): `public/logos/jaldrishti-logo-light.svg` (or `.png`) — **you export it** (S5H).
- Existing `public/logos/jaldrishti-icon.png` used for collapsed sidebar.
- Login hero image: `public/images/branding/login-hero.jpg` — a real satellite screenshot of your study area (QGIS export) or a licensed image you have rights to.
- **Do not use the Ashoka/State Emblem** unless SIH/the ministry gave you permission; use text only.

**Only you can do:** export logo files; export the login hero image; decide the role→feature matrix corrections.

**Dependencies/config:** none new.

### PROMPT 3

```text
Read AGENTS.md first. Section 3: app shell, routing, mock auth. Extend existing files (DashboardLayout.tsx, Sidebar.tsx, Navbar.tsx, Login.tsx, PublicHome.tsx, App.tsx); rename pages/ImagesPage.tsx to pages/FieldEvidencePage.tsx with `git mv` and fix imports.

ROUTES (react-router-dom, lazy-loaded pages):
/ PublicHome (public), /login (public), /app/dashboard, /app/map, /app/watersheds, /app/watersheds/:id, /app/interventions, /app/interventions/:id, /app/evidence, /app/analysis (tabs Satellite | Before-After), /app/analytics, /app/decision-support, /app/provenance, /app/reports, /app/ai, /app/admin/users, /app/admin/data, /app/settings, /dev/ui (dev only), * NotFound. Unauthenticated access to /app/* redirects to /login with a return path.

NAVIGATION (src/config/nav.ts, grouped): Overview: Dashboard(LayoutDashboard). GIS: Map View(Map), Watersheds(Waypoints or MapPinned), Interventions(Construction), Field Evidence(Camera). Analysis: Satellite & Before/After(GitCompare), Analytics(ChartNoAxesCombined), Decision Support(Target). Trust: Data Sources & Provenance(ShieldCheck). Output: Reports(FileBarChart). Intelligence: Image Intelligence(Sparkles) [marked P2, hidden if feature flag off]. Admin: Data Management(Database), Users & Roles(Users) [ADMIN only], Settings(Settings2). Icons from lucide-react only.

LAYOUT: fixed left sidebar 240px (collapsible to 64px icon rail; state persisted in localStorage), 56px top bar with breadcrumbs, global search input (UI only for now), help icon, notifications bell (UI only), user menu (name, role badge, sign out). Content area scrolls; map pages support a `fullBleed` layout prop. Show a sticky DEMO DATA banner under the top bar when any loaded dataset has isDemo (read from a DemoContext that later sections will set; default false). Sidebar uses tokens (navy background, active item primary-600). Add a skip-to-content link.

AUTH (mock): AuthContext with login(email,password), logout, user {id,name,email,role,stateId?,districtId?}, persisted to localStorage. Roles: ADMIN, STATE_OFFICER, DISTRICT_OFFICER, FIELD_OFFICER, GIS_ANALYST. src/config/roles.ts exports a permission matrix: ADMIN all; STATE_OFFICER view all in state + reports + verify photos; DISTRICT_OFFICER view district + verify photos + reports; FIELD_OFFICER upload photos + view assigned watersheds; GIS_ANALYST run analysis + data management + reports, no user management. `<RequirePermission permission="...">` hides/blocks UI. Nav items filtered by permission. src/data/demoUsers.ts: five demo users, one per role, all isDemo:true, with a comment that this is NOT real security.

LOGIN PAGE: split layout — left: full-height hero image /images/branding/login-hero.jpg with a small legend (Watershed boundary, Drainage, Water body) as static overlay text; right: logo, "Sign in to JalDrishti", email, password (show/hide), remember me, forgot password (disabled with tooltip "Not available in prototype"), Sign In button (loading state), inline error state, footer text "Prototype developed for SIH 2026 (SIH26015). Not an official Government of India application." Do NOT use the Ashoka/State Emblem. If the hero image or logo file is missing, render a neutral token-colored block and log a console warning (do not invent an image).
PUBLIC HOME: simple landing (logo, one-sentence pitch, "Sign in" button, four feature cards, disclaimer).

All /app pages other than Dashboard/Map can be EmptyState placeholders titled with their module name. Add tests: unauthenticated redirect; FIELD_OFFICER cannot see Users & Roles; sidebar collapse persists. Run typecheck/lint/test/build and report.
```

**Verify:** log in as each role from the login page and check the nav differs; visiting `/app/admin/users` as a Field Officer is blocked; refresh keeps you signed in; sign out returns to login; sidebar collapse works with keyboard; console has no errors.

---

# SECTION 4 — Types and the data-access layer (with a tiny demo seed)

**Build:** typed domain model matching your 15-table schema, zod validation, a `DataRepository` interface, a mock implementation reading JSON/GeoJSON from `public/data`, geo utility functions, and a clearly-labelled *tiny synthetic seed* so the UI can be built before real data arrives.

**Files:** modify `src/types/watershed.ts` (split into `src/types/{admin,watershed,intervention,photo,satellite,analysis,report,provenance,user}.ts` + `index.ts`), `src/services/api.ts`; create `src/services/mock/repository.ts`, `src/services/mock/loaders.ts`, `src/services/schemas.ts` (zod), `src/services/supabase/repository.ts` (stub throwing "not enabled"), `src/hooks/{useAsync.ts,useRepository.ts,useWatersheds.ts,...}`, `src/lib/geo.ts` (+ `geo.test.ts`), `public/data/sample/*` (synthetic seed), `scripts/validate-data.mjs` (or a vitest test).

**Hardcode by hand:** in the prompt below, the centre point of your study area, the state/district/village names of your chosen watershed. Real values replace the sample later (S5).

**Assets/links:** none.

**Only you can do:** BEFORE: decide the study area (S5A) so `<LAT>,<LNG>` and admin names are right. If undecided, keep the placeholders; the agent will mark them `TODO_REAL`.

**Dependencies/config:** uses packages installed in S1.

### PROMPT 4

```text
Read AGENTS.md first. Section 4: types + data layer. Extend src/types/watershed.ts and src/services/api.ts (already exist).

1. TYPES (TypeScript + matching zod schemas) for: State, District, Village, Watershed (id, code, name, stateId, districtId, villageIds, areaHa, perimeterKm?, elevationMinM?, elevationMaxM?, terrainClass?, geometry Polygon|MultiPolygon, sourceProvenanceId, isDemo), InterventionType (id, name, category, iconKey), Intervention (id, code, typeId, name, watershedId, villageId, status: planned|in_progress|completed|needs_verification, startDate?, completionDate?, geometry Point, projectRef?, isDemo), GeoPhoto (id, interventionId?, watershedId, latitude, longitude, capturedAt, uploadedAt, storagePath, thumbPath, imageType, description, phase: before|during|after|other, uploaderId, verificationStatus: pending|verified|rejected, gpsValidation: valid|no_gps|invalid, sha256, isDemo), WaterBody (id, watershedId, name?, type, areaHa?, geometry Polygon|MultiPolygon), DrainageLine (id, watershedId, order?, geometry LineString|MultiLineString), SatelliteScene (id, watershedId, sensor, acquisitionDate, cloudPct, resolutionM, provenanceId), SatelliteObservation (id, sceneId, indicator: ndvi|ndwi|lulc|slope, imagePath, corners [[lng,lat]x4], statsPath, provenanceId), Indicator (id, watershedId|interventionId, key, value, unit, dateA?, dateB?, provenanceId), ChangeAnalysis (id, watershedId, indicator, dateA, dateB, meanA, meanB, difference, classAreas {increase,stable,decrease in ha}, method, thresholds, provenanceId), Provenance (id, source, dataset, date, resolution, crs, processing, method, status: processed|raw|pending|error, licence, url, isDemo), Report (id, watershedId, title, periodFrom, periodTo, sections[], createdBy, createdAt, status: draft|processing|completed|failed, isDemo), AuditLog (id, actorId, action, entityType, entityId, at, detail), User/Role (roles from AGENTS.md).
Use branded ID types or string aliases; use GeoJSON types from @types/geojson.

2. src/services/api.ts: export interface DataRepository with async methods: listStates/Districts/Villages, listWatersheds(filter), getWatershed(id), listInterventions(filter), getIntervention(id), listPhotos(filter), getPhoto(id), updatePhotoVerification(id,status,actorId), addPhoto(draft), listWaterBodies(watershedId), listDrainage(watershedId), listSatelliteObservations(watershedId), getChangeAnalysis(watershedId,indicator,dateA,dateB), listIndicators(filter), listProvenance(), getProvenance(id), listReports(), saveReport(meta), listAuditLogs(). Export `getRepository()` reading import.meta.env.VITE_DATA_SOURCE ("mock" default; "supabase" returns the stub).

3. src/services/mock/: implement the repository by fetching JSON/GeoJSON from /data/* (public folder) with zod validation; on validation failure throw a typed DataError that includes file and path of the first issue. In-memory writes for updatePhotoVerification/addPhoto/saveReport (persist to localStorage key "jaldrishti.mock.writes"). Simulate latency 150-300ms only when import.meta.env.DEV.

4. src/hooks/useAsync.ts: generic {data,loading,error,reload}. Create thin hooks (useWatersheds, useWatershed, useInterventions, usePhotos, ...) using it. Also a DemoContext setter: when returned data includes any isDemo:true, set demo=true so the shell shows the banner.

5. src/lib/geo.ts (with unit tests in geo.test.ts): pointInWatershed (turf), distanceToBoundaryKm, bufferMeters(point, m), nearestFeatureDistanceM(point, features), areaHa(geometry), bboxOf, formatLatLng(lat,lng) -> "19.5234° N, 74.3341° E", parseLatLng, isValidLatLng.

6. SYNTHETIC SEED (only so the UI can be built now): create public/data/sample/ with one watershed (a simple ~8-point polygon around <LAT>,<LNG> of about 8 km across), 6 interventions, 12 photos (metadata only, storagePath placeholders "TODO_REAL:photo file"), 2 water bodies, 1 drainage line, 2 satellite observations metadata (imagePath TODO_REAL), 1 change analysis with clearly fake numbers. EVERY record gets isDemo:true. Add a README.md in that folder stating it is synthetic. Use admin names <STATE>, <DISTRICT>, <VILLAGE> that I will fill in; if I did not, use TODO_REAL:name.
Create public/data/provenance.json with 6 provenance records for the datasets above, all isDemo:true, urls "TODO_REAL:url".

7. scripts/validate-data.mjs (or a Vitest suite) that loads every file in public/data/*.json|geojson and validates against the zod schemas; wire `npm run validate:data`. Report any failures.
Run typecheck/lint/test/build and report.
```

**Verify:** `npm run validate:data` passes; `geo.test.ts` passes (check haversine with a known distance, point-in-polygon true/false cases); a temporary `console.log(await getRepository().listWatersheds())` in the browser returns the sample; break a JSON field on purpose and confirm the error names the file.

---

# SECTION 5 — Real data collection and asset preparation (mostly manual)

This section replaces the synthetic seed with authentic data. **The AI cannot download from government portals, log in, or judge what is "official".** You do that; the agent writes scripts that convert what you download into the app's formats.

## 5A — Choose the study area (manual, ~1 hour)

1. Check whether the SIH26015 problem statement page/attachments include **sample geo-tagged images or datasets**. If yes, use that watershed first.
2. Otherwise pick one watershed (or 2 for comparison) where you can obtain: a boundary, ≥ 15–20 interventions with coordinates, and photos. Record: state, district, block, village names, watershed code, area (ha), centre lat/lng.
3. Write these into `docs/STUDY_AREA.md`. Every later step uses them.

## 5B — Boundary and admin layers (manual + QGIS)

Sources to try: the DoLR/WDC-PMKSY project pages and geo-portals, Bhuvan/NRSC thematic services, India-WRIS, the SIH sample data, data.gov.in for district/village lists.
1. Download or export the watershed boundary (Shapefile/GeoJSON/GeoPackage).
2. In QGIS: open → check CRS → reproject to **EPSG:4326** → Vector → Geometry → *Fix geometries* → *Simplify* (tolerance ≈ 0.0001°) → export GeoJSON as `pipeline/raw/watershed.geojson`. Keep properties: name, code, area, district, state.
3. Repeat for drainage lines, water bodies, village boundaries, and district polygon if available (`drainage.geojson`, `waterbodies.geojson`, `villages.geojson`).
4. Record each dataset's **source name, URL, download date, licence, and original CRS** in `docs/DATA_LOG.md` (you will need this for provenance in S13).

## 5C — Interventions (manual)

1. From WDC-PMKSY/DoLR records or the sample data, build `pipeline/raw/interventions.csv` with columns:
   `code,name,type,status,village,start_date,completion_date,latitude,longitude,project_ref`.
2. If real coordinates are unavailable for some, leave them out of the dataset — do not guess.
3. Add one column `phase_note` if you intend to tag photos as before/during/after (S9).

## 5D — Geo-tagged photos (manual)

1. Use official/sample photos where available; every other photo goes into a folder named `pipeline/raw/photos_demo/` and is treated as **Demonstration Field Dataset** (`isDemo: true`).
2. **EXIF warning:** WhatsApp, Instagram and many messengers strip GPS metadata. Transfer original files by USB, Google Drive "download original", or AirDrop. Check GPS exists: right-click → Properties → Details (Windows) or `exiftool`.
3. Create `pipeline/raw/photos_meta.csv`: `filename,intervention_code,phase(before|during|after|other),image_type,description,uploader,is_demo`.
4. Only take photos you own or have permission to use; note attribution in `docs/DATA_LOG.md`.

## 5E — Satellite data (manual download, scripted processing)

1. Create a free account on the Copernicus Data Space (or use Microsoft Planetary Computer / Earth Search) to download **Sentinel-2 L2A** for your area: **Date A** (2023, e.g. same season) and **Date B** (2026 or latest), each with **low cloud** (< 10% over the watershed). Use the *same season* for both dates or vegetation differences reflect phenology, not change. Download bands **B03, B04, B08 (10 m) and SCL** (20 m, scene classification).
2. Save under `pipeline/raw/s2/<date>/` (git-ignored). Record scene IDs, dates, cloud %, processing baseline in `docs/DATA_LOG.md`.
3. **If you get stuck**, ask the SIH organisers whether SRISHTI-DRISHTI / Bhuvan sample rasters are provided; otherwise fall back to a small synthetic NDVI raster clearly labelled DEMO. Never present it as real.

## 5F — Land cover, terrain, rainfall, population (manual)

- Land cover: **ESA WorldCover** 10 m tiles for your bbox (confirm current licence/attribution text on the ESA page and record it) or Bhuvan LULC if you have access.
- Terrain: a DEM (Copernicus DEM or SRTM) clipped to the watershed.
- Rainfall/population: data.gov.in CSVs (district level). Save raw CSVs in `pipeline/raw/other/`.

## 5G — Basemap tiles (manual decision)

Decide and record in `docs/DATA_LOG.md` which basemaps you will use, and **read their current usage terms**: OpenStreetMap standard tiles (usage policy applies; fine for a demo, needs attribution), an imagery basemap of your choice (check licence), or Bhuvan services (may need registration/token). Put the tile URL templates and attribution strings into a note; S6 uses them. Never hardcode a private API key in source.

## 5H — Branding assets (manual)

| File | Where | How |
|---|---|---|
| `jaldrishti-icon.png` (exists) | `public/logos/` | keep |
| `jaldrishti-logo-light.svg/png` (for dark sidebar) | `public/logos/` | crop from your logo sheet (dark-background variant) or export from the design tool; transparent background |
| `jaldrishti-logo-dark.svg/png` (for light pages/PDF) | `public/logos/` | light-background variant |
| `favicon.svg` and `favicon-32.png`, `apple-touch-icon.png` (180×180) | `public/` | export from the icon |
| `login-hero.jpg` | `public/images/branding/` | QGIS map export of your watershed (Project → Import/Export → Export as Image), ≤ 400 KB |
| `og-image.png` (1200×630) | `public/images/branding/` | screenshot of the finished map view (do at S19) |

Fonts for PDF (needed in S14): download **Inter** and **Noto Sans Devanagari** TTF files (both SIL OFL) into `public/fonts/`.

**Build (agent):** a Python pipeline that turns your raw downloads into `public/data/*`.

**Files:** `pipeline/requirements.txt`, `pipeline/README.md`, `pipeline/config.py` (paths, study-area constants), `pipeline/extract_exif.py`, `pipeline/make_web_images.py`, `pipeline/build_features.py`, `pipeline/rasters_export.py` (NDVI/NDWI + change + stats + PNG), `pipeline/landcover_stats.py`, `pipeline/zonal_stats.py` (per-intervention buffers), `pipeline/build_seed.py`, `pipeline/tests/`.

**Hardcode by hand:** in `pipeline/config.py`: study area name/codes, scene file paths, dates, thresholds (change thresholds default ±0.05 and ±0.2, documented as configurable methodology parameters), buffer distances (500 m and 1000 m).

**Only you can do:** everything in 5A–5H; create the venv and install requirements (`python -m venv pipeline/.venv`, activate, `pip install -r pipeline/requirements.txt` — on Windows rasterio/geopandas install from wheels; if it fails use `conda` or WSL).

### PROMPT 5 — pipeline scripts

```text
Read AGENTS.md first. Section 5: Python data pipeline in /pipeline. Also read docs/STUDY_AREA.md and docs/DATA_LOG.md if they exist. Do NOT download anything from the internet; scripts only process files I placed under pipeline/raw/. Never fabricate data: if an input is missing, print a clear error and exit non-zero.

Create pipeline/requirements.txt (geopandas, shapely, pyproj, rasterio, numpy, pandas, pillow, exifread or piexif, opencv-python, matplotlib, pytest, jsonschema) and pipeline/README.md (setup + run order). pipeline/config.py holds all paths, dates, thresholds, buffer distances, output dirs (public/data, public/images/photos). All outputs are written under public/data and public/images/photos.

Scripts:
1. extract_exif.py: read every JPEG in pipeline/raw/photos*/ ; extract GPS lat/lng (handle DMS->decimal and N/S/E/W refs), DateTimeOriginal, camera model; compute sha256; flag gps status (valid / no_gps / invalid when out of range or 0,0) ; join with photos_meta.csv (filename,intervention_code,phase,image_type,description,uploader,is_demo); write pipeline/out/photos_raw.json. Files from photos_demo/ get isDemo=true. Never guess coordinates.
2. make_web_images.py: for each photo create public/images/photos/<id>.jpg (max 1600px long side, quality 82, strip EXIF GPS is NOT done because coordinates live in JSON; but strip nothing else needed) and <id>_thumb.jpg (400px). Use OpenCV or Pillow. Detect near-duplicates by sha256 and by 8x8 average hash; mark duplicates.
3. build_features.py: with GeoPandas load pipeline/raw/*.geojson (watershed, drainage, waterbodies, villages) and interventions.csv; reproject to EPSG:4326; fix geometries (make_valid), clip drainage/waterbodies to watershed; compute area_ha (project to an appropriate UTM zone), perimeter_km; assign each intervention to watershed/village by spatial join; compute each photo's spatial relation (inside watershed, distance to boundary km, nearest intervention within 100 m). Write public/data/{watersheds,interventions,photos,waterbodies,drainage,villages}.json|geojson matching the TypeScript schemas in src/types (read them) with ids like WS-<code>, INT-<code>, IMG-<5 digits>.
4. rasters_export.py: for each date in config: read B04, B08, B03 (10 m) and SCL (20 m, resample nearest to 10 m). Convert DN to reflectance with (DN + BOA_ADD_OFFSET)/10000 where the offset is a config value (default -1000 for processing baseline >= 04.00; document that I must confirm from scene metadata). Mask clouds/shadow/snow via SCL classes 3,8,9,10,11; keep water (6) for NDWI. NDVI=(B08-B04)/(B08+B04); NDWI=(B03-B08)/(B03+B08) (McFeeters) ; water extent mask = NDWI > 0 (threshold in config). Clip to the watershed polygon. Reproject to EPSG:3857. Export per date: <indicator>_<date>.png (RGBA, colormap from the app's ndvi ramp, transparent outside watershed and where masked), corners as 4 [lng,lat] pairs (NW,NE,SE,SW), and stats JSON: mean, median, std, valid_pixel_pct, cloud_masked_pct, histogram (20 bins), area_ha of water. Also change products between date A and date B: difference raster PNG using a brown->teal diverging ramp, class areas in ha (increase > +0.05, decrease < -0.05, plus "significant" beyond +/-0.2) and write public/data/rasters/manifest.json listing all outputs with provenance ids. Provenance records (source scene ids, dates, resolution, processing = "NDVI = (NIR-Red)/(NIR+Red), SCL cloud mask", method, status "processed") are appended to public/data/provenance.json by scene id. Keep PNGs < 1.5 MB each (downscale if needed, note it in provenance).
5. landcover_stats.py: clip land cover raster to the watershed, compute class area % (use the class table given in config), write public/data/landcover.json.
6. zonal_stats.py: for each intervention create buffers of 500 m and 1000 m (in a projected CRS) and compute NDVI/NDWI mean for date A and B and their difference from the exported rasters, plus valid-pixel %. Write public/data/intervention_indicators.json. Label the result "observed change within buffer", not impact.
7. build_seed.py: run 2-6 in order, validate outputs against JSON Schemas generated from the zod schemas (or simple checks), and print a summary table (counts, missing GPS, duplicates, invalid geometry).
Add pytest tests for: DMS->decimal conversion, NDVI formula on a tiny synthetic array, SCL masking, corner ordering, buffer projection.
Explain in the README exactly which raw files I must place where. Run pytest and report.
```

**Verify:**
1. `python pipeline/build_seed.py` completes; summary table shows real counts.
2. Open `public/data/*.geojson` in QGIS over an OSM basemap: boundary, interventions, and photo points sit where they should.
3. Open a PNG overlay with its corner coordinates (QGIS georeferencer or after S6/S11) and check alignment on rivers/roads.
4. `npm run validate:data` passes; `npm run check:placeholders` lists only items you still owe.
5. Delete `public/data/sample/` only after S6 works with real data (keep as fallback until then).

Commit data (small files only). Do **not** commit `pipeline/raw/`.

---

# SECTION 6 — Map core (the hero feature)

**Build:** reusable MapLibre map, basemap switcher, grouped layer panel with opacity, legend, coordinate/zoom/scale readout, feature click → selection → context panel, deep-linkable state, marker icons, clustering.

**Files:** modify `src/maps/MapView.tsx`, `src/pages/MapPage.tsx`; create `src/maps/{useMap.ts,basemaps.ts,layerRegistry.ts,LayerPanel.tsx,Legend.tsx,MapControls.tsx,CoordinateReadout.tsx,MarkerIcons.ts,FeaturePopup.tsx,mapStyles.ts}`, `src/features/selection/SelectionContext.tsx` (watershedId, interventionId, photoId synced to URL query `?ws=&int=&photo=`), `src/components/map/ContextPanel.tsx`, `src/components/map/LayerInfo.tsx`, `src/maps/mapUtils.test.ts`.

**Hardcode by hand:**
- `basemaps.ts`: tile URL templates and attribution strings for the basemaps you chose in S5G (the agent leaves `TODO_REAL:tile url` if you have not told it). Paste the exact attribution text required by each provider.
- `layerRegistry.ts`: layer groups and labels (Base map / Watershed / Field data / Thematic / Hydrology / Change), default visibility, default opacity, legend entries, and each layer's `provenanceId`.
- Marker shape/colour mapping per intervention type (shape + colour, never colour only).

**Assets/links:** map marker icons are generated from Lucide SVG paths (no image files needed). Basemap tiles are external URLs — **you** verify their terms.

**Only you can do:**
1. BEFORE: paste tile URLs + attributions into the prompt (or into `docs/DATA_LOG.md` for the agent to read).
2. If a basemap needs registration/API key: register, put the key in `.env.local` as `VITE_BASEMAP_KEY`, never in source.
3. AFTER: check the attribution text is visible on the map.

**Dependencies/config:** `maplibre-gl` CSS imported once; if the map appears blank, the container needs an explicit height.

### PROMPT 6

```text
Read AGENTS.md first. Section 6: map core. Extend src/maps/MapView.tsx and src/pages/MapPage.tsx (they exist); do not add react-map-gl.

BASEMAPS (src/maps/basemaps.ts): <PASTE BASEMAP LIST: name, tile URL template, tileSize, attribution, maxzoom>. If I left something blank use TODO_REAL and fall back to OpenStreetMap standard raster tiles with the required "© OpenStreetMap contributors" attribution so the map always works. Basemap switcher: Streets / Satellite / Terrain (only those provided).

MAP COMPONENT: <MapView/> wraps maplibre-gl in a React hook (useMap) that creates the map once, handles resize (ResizeObserver), cleans up on unmount, exposes the map instance via ref/context. Options: preserveDrawingBuffer:true (needed for report snapshots), attributionControl compact, initial bounds fit to the selected watershed bbox (fallback India centre). Include a scale bar, and a custom MapControls overlay (zoom in/out, locate-me (geolocation with permission handling), fullscreen, measure distance tool (click points, show km), north reset) using Lucide icons and our IconButton.

LAYERS from the repository (never fetch directly): watersheds (polygons: 2px outline in water/primary token, subtle hover fill, selected = thicker outline + label chip with watershed code), villages (dashed outline, optional), drainage (lines), water bodies (polygons), interventions (symbol layer with generated icons: a distinct SHAPE per intervention category + colour token + status ring), geo-photos (GeoJSON source with clustering; camera icon; cluster count labels; clicking a cluster zooms in). All colors from CSS tokens (read with getComputedStyle at runtime).
src/maps/layerRegistry.ts defines groups: Base map | Watershed (boundary, villages) | Field data (interventions, geo-tagged photos) | Thematic (NDVI, water index, land cover — registered but disabled until Section 11) | Hydrology (drainage, water bodies) | Change (vegetation change, water change — disabled until Section 11). Each entry: id, label, group, defaultVisible, defaultOpacity, legend items, provenanceId, kind.
LayerPanel: left panel with collapsible groups, checkbox to toggle, opacity slider per layer, a "Layer information" block for the focused layer showing provenance fields (source, date, resolution, CRS, status) via ProvenanceChip/useProvenance, and "Reset all". Search-place box (UI: searches watershed/village/intervention names from the repository and flies to the result; do not call any external geocoder). Legend component (bottom-left, collapsible) built from visible layers. CoordinateReadout (bottom-right): formatted lat/lng of cursor + zoom level.

SELECTION: SelectionContext syncs {watershedId, interventionId, photoId} with the URL query (?ws=&int=&photo=) so any state is deep-linkable and survives refresh. Clicking a polygon selects the watershed; clicking an intervention marker selects it; clicking a photo marker selects the photo. Hover shows a small popup with name/type. Selected feature gets a white halo. Escape clears selection.
CONTEXT PANEL (right, 360px): nothing selected -> prompt text + counts; watershed -> summary card (name, code, state/district, area, counts, latest indicators with provenance chips) + CTAs (Open details, Open analysis, Generate report); intervention -> name, type, status, coordinates (copy button), village, watershed, first 3 photos, CTA Open intervention; photo -> thumbnail, coordinates, date, verification badge, CTA Open evidence. All values from the repository. Show <DemoBadge/> for isDemo records.

MapPage layout: full-bleed 3 regions (LayerPanel 280px | map | ContextPanel 360px) on >=1280px; on smaller widths the panels become drawers (basic version now, full responsive pass in Section 17). Filters bar above map: watershed select, intervention type multi-select, status, date range; active filters as removable chips.
States: loading skeleton overlay, error with retry, empty ("No watersheds loaded").
Tests: layerRegistry has unique ids and every provenanceId is a non-empty string; selection <-> URL sync; formatLatLng used in readout.
Run typecheck/lint/test/build and report.
```

**Verify (manual, in the browser):**
- Map loads with the watershed polygon centred; basemap switch works; attribution visible.
- Toggle each layer; drag opacity slider; legend updates.
- Click polygon → panel updates and URL changes; refresh the page → same selection restored; Escape clears.
- Photo clusters split when zooming; the measure tool reports a sensible distance (compare with QGIS).
- Console: no errors or repeated warnings; resizing the window keeps the map correct.

---

# SECTION 7 — Dashboard

**Build:** landing screen after login with KPIs computed from data, map overview, status donut, indicator trend, recent field submissions, activity feed, alerts, quick actions.

**Files:** modify `src/pages/Dashboard.tsx`, `src/components/skeleton/DashboardSkeleton.tsx`; create `src/components/dashboard/{DashboardFilters,KpiRow,MapOverview,InterventionStatusChart,IndicatorTrendCard,RecentEvidence,ActivityFeed,AlertsPanel,QuickActions}.tsx`, `src/charts/{StatusDonut,TrendLine,ChartFrame}.tsx` (ChartFrame = title + question subtitle + source caption + ProvenanceChip), `src/config/kpis.ts`, `src/lib/dashboardStats.ts` + tests.

**Hardcode by hand:**
- KPI definitions text in `config/kpis.ts` ("Watersheds: count of watershed polygons loaded", etc.) — no numbers.
- A short list of demo activity entries (only if you have no audit logs) flagged `isDemo` — or better, generate the feed from real photo uploads/reports/verifications.
- Alert rules (e.g., "photos pending verification > 10", "photos missing GPS", "interventions with no photo", "satellite scene cloud > 20%") — thresholds are your decision.

**Assets/links:** none besides thumbnails from the data.

**Only you can do:** decide which alert thresholds matter; sanity-check KPI values against your data by hand.

**Dependencies/config:** none.

### PROMPT 7

```text
Read AGENTS.md first. Section 7: Dashboard page. Extend src/pages/Dashboard.tsx, src/components/skeleton/DashboardSkeleton.tsx and src/components/ui/StatCard (all exist).

LAYOUT (desktop): page title + last-updated + refresh; filter row (State, District, Watershed, Period) affecting all widgets; KPI row: Watersheds, Interventions, Geo-tagged Photos, Water Bodies; secondary strip: Active projects, Completed projects, Areas analysed (ha), Open alerts; then a two-column grid: left MapOverview (mini MapView reuse, non-interactive except click "Open in Map View" which preserves ?ws=) + right InterventionStatusChart (donut planned/in progress/completed/needs verification); below: IndicatorTrendCard (NDVI and water indicator by date from satellite observations — if fewer than 3 dates exist, render paired before/after bars instead of a line and say so), RecentEvidence (last 3-6 photos with thumbnail, id, date, coordinates, verification badge), ActivityFeed (from audit logs), AlertsPanel (rule-based from src/config/alerts.ts), QuickActions (Add photo, Open map, Run before/after, Generate report).
All numbers computed from the repository via src/lib/dashboardStats.ts (pure functions with unit tests). NO hardcoded statistics. Deltas ("vs previous period") are shown ONLY when a real baseline period exists in the data; otherwise omit. Each KPI/chart uses ChartFrame with a question subtitle ("How many watersheds are loaded?") and a source caption + ProvenanceChip.
States: DashboardSkeleton while loading; per-widget EmptyState and ErrorState with retry; if any record isDemo show DemoBadge on that widget.
Permission awareness: KPIs reflect the user's scope (STATE_OFFICER -> their state, DISTRICT_OFFICER -> their district, FIELD_OFFICER -> assigned watersheds) using the role config.
Write tests for dashboardStats (counts, status distribution, scope filtering). Run typecheck/lint/test/build and report.
```

**Verify:** KPI numbers equal counts you can verify in the JSON files (open them and count); change the watershed filter → all widgets update; log in as different roles and see scoped numbers; break a data file → widget-level error with retry; skeleton visible with throttled network (DevTools → Slow 3G).

---

# SECTION 8 — Watershed Explorer and Watershed Detail

**Build:** State→District→Village→Watershed cascading explorer with map + table, and a detail page with tabs (Overview, Interventions, Photos, Indicators, History).

**Files:** modify `src/pages/WatershedsPage.tsx`, `src/pages/WatershedDetailPage.tsx`; create `src/components/watershed/{AdminCascadeFilter,WatershedTable,WatershedSummary,IndicatorTiles,WatershedTabs,LandCoverBreakdown,HistoryTimeline}.tsx`.

**Hardcode by hand:** terrain class labels and elevation bands (or compute from DEM in the pipeline and store in JSON); tab labels; "Download boundary (GeoJSON)" filename pattern.

**Assets/links:** none.

**Only you can do:** confirm area/elevation values against your official source; if the official `areaHa` differs from turf-computed area by > 5% decide which to show (the UI will show both and flag the difference).

**Dependencies/config:** none.

### PROMPT 8

```text
Read AGENTS.md first. Section 8: Watershed Explorer + Detail. Extend src/pages/WatershedsPage.tsx and WatershedDetailPage.tsx.

EXPLORER (/app/watersheds): AdminCascadeFilter (State -> District -> Village -> Watershed; each select disabled until its parent is chosen; resets children; values from repository; supports URL query). Left: map (reuse MapView) showing all watersheds in scope, hover highlights table row and vice versa. Right: sortable/searchable WatershedTable (code, name, district, area ha, #interventions, #photos, latest NDVI mean, data status badge) with pagination. Clicking a row/polygon selects; a "Open details" button routes to /app/watersheds/:id.
DETAIL (/app/watersheds/:id): header (name, code, breadcrumb State > District > Watershed, DemoBadge if isDemo, actions: View on map, Run before/after, Generate report, Download boundary GeoJSON). Stat tiles: area, elevation range, terrain class, villages, interventions, photos, water bodies. Tabs: Overview (mini-map, land cover breakdown from landcover.json with provenance, key indicators latest values with provenance chips), Interventions (table linking to detail), Photos (grid linking to evidence detail), Indicators (NDVI/NDWI values by date from satellite observations; note when only 2 dates exist), History (timeline of scenes, interventions completed, photos, reports).
Compute area with @turf/area and show it beside the official area attribute; if they differ by more than 5% show an info Alert explaining the difference. Every panel: loading/empty/error states, source caption + ProvenanceChip. Use LimitationNote in Indicators tab.
Tests: cascade filter resets children; area comparison rule. Run typecheck/lint/test/build and report.
```

**Verify:** cascading behaviour with keyboard only; URL deep-link `/app/watersheds/<id>` works after refresh; "Download boundary" file opens in QGIS; numbers match `public/data`.

---

# SECTION 9 — Interventions (list, detail, before → during → after)

**Build:** interventions table with filters, intervention detail page with map + buffer, photo timeline, observed indicators in buffer, nearby features.

**Files:** modify `src/pages/InterventionsPage.tsx`, `src/pages/InterventionDetailPage.tsx`; create `src/components/intervention/{InterventionFilters,InterventionTable,InterventionHeader,BufferMap,PhotoTimeline,ObservedIndicators,NearbyFeatures}.tsx`, `src/lib/interventionAnalysis.ts` (+ tests).

**Hardcode by hand:** intervention type list with category + icon key (Check Dam, Farm Pond, Contour Trench, Gabion, Afforestation, etc.) in `public/data/intervention_types.json` — align with the DoLR/WDC-PMKSY naming you actually see in your source data; status labels; phase rules (before < start date, during between start and completion, after ≥ completion) with manual override via the `phase` field.

**Assets/links:** intervention photos come from S5D; you must tag `phase` in `photos_meta.csv`. If an intervention has no before-photo, the timeline shows an EmptyState slot ("No 'before' photo recorded") — do not fabricate.

**Only you can do:** tag photo phases; supply real start/completion dates; verify one intervention end-to-end against source records.

**Dependencies/config:** relies on `intervention_indicators.json` from S5 (pipeline `zonal_stats.py`). If it is missing, show the "Indicators not yet processed" empty state.

### PROMPT 9

```text
Read AGENTS.md first. Section 9: Interventions. Extend src/pages/InterventionsPage.tsx and InterventionDetailPage.tsx.

LIST (/app/interventions): filter bar (type multi-select, status, watershed, village, verification, date range, text search by code/name), table columns: code, name, type (icon + label), village, watershed, status badge, completion date, photos count, verification badge, actions (View, View on map). Sorting, pagination, CSV export of the filtered rows (client-side). Right side or toggle: mini-map with the same filtered points. Row hover highlights the point.
DETAIL (/app/interventions/:id): header "Check Dam #123"-style (type + code), StatusBadge, VerificationBadge, DemoBadge if isDemo, actions (View on map, Compare before/after (link to /app/analysis?ws=&int=), Generate report). Sections: (1) Details grid: ID, type, project ref, village, watershed, coordinates (with copy), status, start and completion dates. (2) BufferMap: small map with the point, a 500 m buffer circle (toggle 500 m / 1 km) using turf, nearby photos, drainage and water bodies. (3) PhotoTimeline: three columns BEFORE -> DURING -> AFTER, each with dated photos from the data using the `phase` field (fallback: derive by date relative to start/completion dates when phase is 'other'); empty slots show an EmptyState. Clicking a photo opens the photo detail drawer (built in Section 10; for now link to /app/evidence?photo=). (4) ObservedIndicators: NDVI and NDWI mean in the buffer for date A and date B, difference, valid-pixel %, from intervention_indicators.json, each with ProvenanceChip; label the block "Observed change within <distance>" (never "impact"). (5) NearbyFeatures within 1 km: nearest drainage distance, nearest water body distance, nearest village, computed by src/lib/interventionAnalysis.ts with turf. (6) LimitationNote.
Tests for interventionAnalysis: buffer contains point, nearest-feature distance for a known fixture, phase derivation. Run typecheck/lint/test/build and report.
```

**Verify:** compare one intervention's nearest-drainage distance with a QGIS measurement (tolerance ±10 m); timeline shows correct empty slots; CSV export opens in Excel; no forbidden wording (`grep -rniE "impact|caused" src` — review hits).

---

# SECTION 10 — Field Evidence (geo-tagged photos)

**Build:** photo browser (grid/list + map), photo detail with evidence chain, viewer, verification workflow with roles, upload dialog with client-side EXIF/GPS validation.

**Files:** modify `src/pages/FieldEvidencePage.tsx`; create `src/components/evidence/{PhotoFilters,PhotoGrid,PhotoCard,PhotoDetailDrawer,PhotoViewer,EvidenceChain,SatelliteContextStrip,VerificationPanel,UploadPhotoDialog,GpsValidationSummary}.tsx`, `src/lib/photoValidation.ts` (+ tests), `src/lib/hash.ts` (sha256 via `crypto.subtle`).

**Hardcode by hand:** photo type list (Water structure, Vegetation, Drainage, Agricultural area, Soil conservation, Project board, Other), verification status labels and permission rules, upload size limit (e.g. 10 MB), accepted types (JPEG/PNG/HEIC as supported), the "Demonstration Field Dataset" ribbon text.

**Assets/links:** real photo files in `public/images/photos/` (from S5D).

**Only you can do:** test upload with (a) a phone JPEG that has GPS EXIF, (b) a JPEG without GPS, (c) a photo taken outside the watershed, (d) a duplicate file. Keep those four files for the testing section.

**Dependencies/config:** `exifr` (installed S1). In mock mode uploads live in memory/localStorage; real persistence arrives with Supabase Storage (S15).

### PROMPT 10

```text
Read AGENTS.md first. Section 10: Field Evidence. Extend src/pages/FieldEvidencePage.tsx (renamed from ImagesPage).

BROWSER (/app/evidence): summary strip (Total photos, GPS valid, Missing GPS, Verified), filter bar (watershed, intervention, type, phase, date range, GPS status, verification status, search by ID), grid/list toggle, sort, pagination (12 per page), and a map panel showing the same filtered photos (clicking a card highlights the marker and vice versa). Photo cards: thumbnail, ID, date, coordinates, watershed, type, GpsBadge, VerificationBadge, DemoBadge/ribbon "Demonstration Field Dataset" when isDemo. Buttons: View on map, View evidence.
DETAIL (drawer on desktop, full page on mobile; URL ?photo=<id>): large image with zoom/pan, prev/next (keyboard arrows), filmstrip, fullscreen; metadata: ID, latitude, longitude (copy), captured date, uploaded date, uploader, intervention (link), watershed (link), type, phase, description, sha256 (truncated); GPS validation result; Spatial relation ("Inside watershed", distance to boundary in km, nearest intervention within 100 m) computed with src/lib/geo.ts; EvidenceChain component (Photo -> GPS -> Watershed -> Satellite -> Indicator) where each step shows status ok/missing; SatelliteContextStrip (NDVI/NDWI within 1 km if available from data, with ProvenanceChip; otherwise "not processed"); VerificationPanel: Verify / Reject (with required reason) available only to permitted roles (DISTRICT_OFFICER, STATE_OFFICER, ADMIN, GIS_ANALYST), status change persisted via repository.updatePhotoVerification and appended to audit logs.
UPLOAD (permitted: FIELD_OFFICER, GIS_ANALYST, ADMIN): dialog with drag-and-drop, preview, client-side EXIF read with exifr (GPS, DateTimeOriginal), fields (watershed auto-suggested by point-in-polygon, intervention optional, type, phase, description). Validation in src/lib/photoValidation.ts returns issues: NO_GPS, INVALID_COORDS, OUTSIDE_WATERSHED (with distance), DUPLICATE (sha256 match), TOO_LARGE, WRONG_TYPE. Block submit on NO_GPS/INVALID/TOO_LARGE/WRONG_TYPE; allow with warning on OUTSIDE_WATERSHED (status pending) and reject DUPLICATE. New photo appears immediately (mock write) with verificationStatus pending and appears on the map.
Do not fabricate coordinates for photos lacking GPS. Tests: photoValidation cases (all issue types), hash function on known input. Run typecheck/lint/test/build and report.
```

**Verify:** upload the four test files and confirm each outcome; verify as a District Officer, confirm a Field Officer cannot verify; audit log shows entries; keyboard arrows move between photos; the map marker highlights on card hover.

---

# SECTION 11 — Satellite analysis and Before/After comparison

**Build:** indicator switcher (NDVI, water, land cover), raster overlays on the map, date selection, swipe comparison, change map, statistics, histogram, class-area donut, generated observation text with limitation, photo-pair comparison.

**Files:** modify `src/pages/AnalysisPage.tsx`; create `src/components/analysis/{IndicatorSwitcher,DatePairSelect,RasterOverlay,SwipeCompare,ChangeMapPanel,StatsPanel,HistogramChart,ClassAreaDonut,InsightCard,PhotoPairCompare,MethodologyCard}.tsx`, `src/maps/rasterLayers.ts`, `src/lib/insight/templates.ts` (+ tests), extend `layerRegistry.ts` to enable Thematic/Change layers.

**Hardcode by hand:** indicator definitions and ramps (legend labels + value ranges: NDVI classes e.g. <0.2 very low, 0.2–0.4 low, 0.4–0.6 moderate, >0.6 high — confirm these class breaks are the ones you document in methodology); change thresholds text (must match `pipeline/config.py`); insight template sentences; methodology text ("NDVI = (NIR − Red)/(NIR + Red); cloud masking with SCL; …").

**Assets/links:** raster PNGs + manifest from S5 (`public/data/rasters/`).

**Only you can do:** BEFORE: make sure S5E ran and produced at least two dates; visually check one PNG in QGIS. AFTER: compare a few pixel values in QGIS against what the histogram/mean claims (spot check).

**Dependencies/config:** none new (uses maplibre `image` sources). Two dates from the *same season* are required for a fair comparison — note this in the UI methodology card.

### PROMPT 11

```text
Read AGENTS.md first. Section 11: Satellite Analysis + Before/After. Extend src/pages/AnalysisPage.tsx (tabs: "Satellite Analysis" | "Before / After") and src/maps/layerRegistry.ts.

Data source: public/data/rasters/manifest.json (list of observations: indicator, date, imagePath, corners [NW,NE,SE,SW as [lng,lat]], statsPath, provenanceId) and the stats JSON files. Do not compute rasters in the browser.

SATELLITE TAB: left: IndicatorSwitcher (NDVI, Water index NDWI, Land cover, Terrain if available) + watershed + date select; center: map with the raster as a maplibre `image` source clipped by corners, opacity slider, legend; right: StatsPanel (mean, median, valid-pixel %, cloud-masked %, water area ha), HistogramChart (Recharts bars from stats histogram), MethodologyCard (formula, sensor, resolution, cloud masking, note "same-season comparison recommended") and a ProvenanceChip for every stat block. Show cloud % prominently and warn (Alert) when > 20%.
BEFORE/AFTER TAB: choose Date A and Date B from available dates (default earliest and latest), indicator; SwipeCompare: two synchronized MapLibre instances (same center/zoom/bearing, moves mirrored both ways without infinite loops) layered with a draggable vertical divider using CSS clip-path; the handle is an accessible slider (role="slider", aria-valuenow, left/right arrow keys, Home/End); labels "BEFORE <date>" and "AFTER <date>". Below: ChangeMapPanel (difference raster with the colour-blind-safe diverging ramp + legend), ClassAreaDonut (increase / stable / decrease in ha and %), StatsPanel for both dates and difference, PhotoPairCompare (if the URL has ?int=, show the earliest 'before' and latest 'after' photo of that intervention side by side; otherwise hide) and the intervention buffer indicators if available.
InsightCard (Observation / Evidence / Source / Interpretation / Limitation) generated by src/lib/insight/templates.ts from the numbers, e.g. "Mean NDVI changed from {a} to {b} ({diff}) between {dateA} and {dateB}." Interpretation wording must be neutral ("observed increase in vegetation index within the selected area"). Always render <LimitationNote/>. Unit-test templates and add a test that no template string contains forbidden phrases from AGENTS.md.
Respect prefers-reduced-motion (no animated transitions when set). Handle loading/empty ("No processed scenes for this watershed")/error states. Run typecheck/lint/test/build and report.
```

**Verify:** overlay lines up with rivers/roads at zoom 14+; swipe slider works with mouse, touch, keyboard; both maps stay synced when panning; numbers on screen equal `stats.json`; dates shown equal manifest dates; try selecting the same date twice (should warn); cloud warning appears if you edit a manifest value > 20 temporarily.

---

# SECTION 12 — Analytics and Decision Support

**Build:** analytics page where each chart answers one stated question, plus a rule-based "candidate area for further assessment" module.

**Files:** create `src/pages/AnalyticsPage.tsx` (add route if not done), `src/pages/DecisionSupportPage.tsx` (replace placeholder), `src/charts/{NdviTimeChart,WaterAreaChart,LandCoverChart,RainfallChart,InterventionStatsChart,WatershedComparisonChart,PairedBarChart}.tsx`, `src/config/decisionRules.ts`, `src/lib/decision/{scoring.ts,scoring.test.ts}`, `src/components/decision/{CandidateTable,RuleExplainer,IndicatorChips,CandidateMap}.tsx`, `pipeline/slope_stats.py` (+ `public/data/unit_indicators.json`).

**Hardcode by hand — this is important and must be your decision:**
- `decisionRules.ts`: thresholds and levels, e.g. slope High > <X>°, NDVI Low < <Y>, water availability Low < <Z> (NDWI or water area), erosion indicator definition (or omit if you lack data), and the wording for each level. Add a `rationale` string and a `source` (DoLR guideline / literature you can cite). **The agent cannot decide scientifically valid thresholds** — put your values or mark them `TODO_REAL` and label the module "configurable, illustrative thresholds".
- Analysis unit: sub-watershed, village polygon, or a regular grid (e.g. 500 m) — choose one (villages are the simplest).
- Rainfall JSON: convert the data.gov.in CSV you downloaded (agent helps) — file `public/data/rainfall.json` with source and period.

**Assets/links:** DEM (S5F) for slope; rainfall CSV.

**Only you can do:** provide thresholds; download DEM and place it at `pipeline/raw/dem/dem.tif`; run `python pipeline/slope_stats.py`; validate one unit's slope by hand in QGIS (Raster → Analysis → Slope, then zonal statistics).

**Dependencies/config:** none new.

### PROMPT 12

```text
Read AGENTS.md first. Section 12: Analytics + Decision Support.

PART A — pipeline: create pipeline/slope_stats.py. Input: pipeline/raw/dem/dem.tif and the analysis-unit polygons public/data/villages.geojson (config: UNIT_LAYER). Compute slope in degrees (numpy gradient with correct pixel size in metres after reprojecting to a projected CRS), then per unit: mean/max slope, % area with slope above thresholds from pipeline/config.py, mean elevation; join per-unit NDVI mean (latest date) and NDWI mean and water area % from the raster exports and land cover class shares. Write public/data/unit_indicators.json with provenance ids. Add a pytest for the slope function on a synthetic plane.

PART B — Analytics (/app/analytics): each chart card has a QUESTION as its title and a one-line takeaway generated from data (neutral wording). Charts (Recharts): (1) "Is vegetation higher or lower than in the earlier date?" — NDVI: if >= 3 dates render a line, else PairedBarChart before/after; (2) "How has surface water area changed?" — same rule; (3) "What is the land cover mix?" — stacked/horizontal bar from landcover.json; (4) "How much rain fell?" — from rainfall.json (hide with EmptyState if file missing); (5) "How are interventions distributed by type and status?" — stacked bar; (6) "How do watersheds differ?" — ranked bar, hidden with EmptyState when only one watershed exists. Chart style: one accent colour, dashed for 'before', horizontal gridlines only, 12px axis text, units in axis titles, accessible data table toggle under each chart, ChartFrame with source caption + ProvenanceChip. Filters: watershed, period, indicator.

PART C — Decision Support (/app/decision-support): read src/config/decisionRules.ts (I define: unit, indicators, thresholds, levels, rationale, source; if a threshold is TODO_REAL, show the module as 'not configured' with an Alert). src/lib/decision/scoring.ts classifies each unit for each indicator (High/Medium/Low) and flags "Candidate area for further assessment" only when ALL required rule conditions match; return the list of matched conditions for transparency. UI: candidate table (unit, matched conditions as chips with shape+text, values), CandidateMap highlighting units with pattern fill + outline (not colour only), RuleExplainer panel ("How this is computed") listing thresholds and sources, and a permanent LimitationNote worded: "Candidate areas are flagged from configured indicator thresholds for prioritising further field assessment. They are not a scientific determination." Never use words like "priority score" or "impact". Add unit tests for scoring using fixtures (boundary values at each threshold). Run typecheck/lint/test/build and report.
```

**Verify:** run `pytest pipeline`; spot-check one unit's slope vs QGIS; every chart has a source caption; a chart with insufficient data shows the paired bars/empty state instead of a fake trend; change one threshold in `decisionRules.ts` and confirm the candidate list changes; the explainer lists the same thresholds.

---

# SECTION 13 — Data Sources and Geospatial Provenance

**Build:** a page listing every dataset and processing step, popovers used everywhere by `ProvenanceChip`, and a "used in" cross-reference.

**Files:** modify `src/pages/ProvenancePage.tsx`; create `src/components/provenance/{ProvenanceTable,ProvenanceDetailDrawer,UsedInList,DataQualitySummary}.tsx`, `src/lib/provenance.ts` (`resolveProvenance`, `findUsages`), replace the stub inside `useProvenance`; finalise `public/data/provenance.json`.

**Hardcode by hand (from `docs/DATA_LOG.md`):** for each dataset: `id, source (e.g. "DoLR / WDC-PMKSY", "Bhuvan / NRSC", "Copernicus Sentinel-2", "data.gov.in"), dataset name, date, resolution, CRS, processing, method, status, licence text, url`. The agent must **never** fill in URLs or licence text from memory — you paste them. Anything not filled stays `TODO_REAL:...`.

**Assets/links:** the real dataset URLs you visited in S5.

**Only you can do:** fill the provenance records accurately; confirm licence/attribution wording; decide status values honestly (`raw`, `processed`, `pending`, `error`).

**Dependencies/config:** none.

### PROMPT 13

```text
Read AGENTS.md first. Section 13: provenance. Extend src/pages/ProvenancePage.tsx and the ProvenanceChip/useProvenance stub from Section 2.

1. src/lib/provenance.ts: resolveProvenance(id) from public/data/provenance.json (via repository), findUsages(id) that scans layerRegistry, rasters manifest, indicators, changeAnalyses and report definitions for provenanceId references.
2. ProvenanceChip popover now shows real fields: Source, Dataset, Date, Resolution, CRS, Processing, Method, Status (badge), Licence, and an external link (target=_blank rel=noopener noreferrer) only if url is not a TODO_REAL value. If a field is TODO_REAL display "Not yet documented" with a warning style. Missing id -> "Provenance missing" danger badge (this must be visible, never silent).
3. Page (/app/provenance): summary cards (datasets documented, processed, pending, missing fields), filter by source/type/status, table (id, source, dataset, date, resolution, CRS, processing, status, licence), row opens a drawer with full record + "Used in" list (links to map layers, analysis views, reports), a processing-lineage strip (raw -> validated -> processed -> published) derived from status, and a DataQualitySummary (photos: GPS valid/missing/invalid/duplicate; vector layers: geometry valid, CRS; rasters: cloud %, valid pixel % — from the data). Include an "Export provenance CSV" button.
4. Add tests: every provenanceId referenced anywhere resolves; findUsages returns known fixtures; TODO_REAL fields are flagged.
Run typecheck/lint/test/build and report.
```

**Verify:** click every chip in the app — none says "Provenance missing"; `npm run check:placeholders` lists exactly what you still must fill; external links open the real pages.

---

# SECTION 14 — Report generator (PDF)

**Build:** report builder (choose watershed, dates, sections, interventions, photos, analyses), live preview, PDF generation in the browser, report history, and the 14 report sections from your brief.

**Files:** modify `src/pages/ReportsPage.tsx`; create `src/features/reports/{ReportBuilderForm.tsx,SectionChecklist.tsx,ReportPreview.tsx,ReportHistory.tsx,reportModel.ts,buildReportData.ts,mapSnapshot.ts,pdf/ReportDocument.tsx,pdf/sections/*.tsx (ExecutiveSummary, Location, WatershedOverview, InterventionInventory, PhotoEvidence, SatelliteObservations, VegetationAnalysis, WaterAnalysis, LandUse, ChangeAnalysis, KeyObservations, DataSources, Methodology, Limitations),pdf/components/{PdfBarChart,PdfLineChart,PdfTable,PdfHeaderFooter,Watermark}.tsx,pdf/fonts.ts}`.

**Hardcode by hand:**
- Report ID pattern `RPT-<year>-<seq>`; document title; header/footer text; the Limitations wording; the Methodology text (must match S11 and pipeline); executive-summary sentence templates (numbers filled from data).
- Cover: prototype disclaimer "Prepared by JalDrishti prototype (SIH 2026). Not an official Government of India document." (no emblem).

**Assets/links:** `public/fonts/Inter-*.ttf` and `NotoSansDevanagari-*.ttf` (**you download** — react-pdf needs TTF/OTF files, not webfonts); `public/logos/jaldrishti-logo-dark.png` (PNG, not SVG, for react-pdf).

**Only you can do:** download fonts; open generated PDFs in a real viewer and read them critically; decide the section order and any missing content.

**Dependencies/config:** add `@react-pdf/renderer` (lazy-loaded so it does not bloat the main bundle). The map snapshot needs `preserveDrawingBuffer: true` (set in S6) and `map.once('idle')` before `getCanvas().toDataURL()`.

### PROMPT 14

```text
Read AGENTS.md first. Section 14: report generator. Install @react-pdf/renderer (tell me the version). Extend src/pages/ReportsPage.tsx. Load the PDF code with dynamic import() only when the user clicks Generate/Preview.

PAGE (/app/reports): two tabs — "Generate" and "History".
GENERATE: form: watershed, date range (A/B), optional interventions multi-select, photo selection (default: verified photos only; option to include demo photos, which triggers a watermark), indicator selection (NDVI, NDWI, land cover), section checklist with these 14 sections in order: Executive summary; Location/administrative context; Watershed overview; Intervention inventory; Geo-tagged photo evidence; Satellite observations; Vegetation analysis; Water analysis; Land-use analysis; Change analysis; Key observations; Data sources; Methodology; Limitations. Right column: Report status checks (data available? analysis processed? provenance complete? demo data present?) with Alerts for blockers; Buttons: Preview, Generate PDF, Save to history. A preview pane renders the PDF (react-pdf PDFViewer or an iframe blob URL) with page thumbnails if simple.
DATA: buildReportData.ts assembles a ReportModel from the repository only (no hardcoded numbers). Executive summary and key observations use neutral templates from src/lib/insight/templates.ts (observed change wording).
PDF: A4, header with logo (/logos/jaldrishti-logo-dark.png) + report ID + date, footer with page numbers and the prototype disclaimer, cover page (title, watershed, period, generated by, generated at), table of contents if feasible. Register fonts from /fonts (Inter regular/bold, Noto Sans Devanagari) in pdf/fonts.ts. Charts are drawn with react-pdf Svg primitives (simple bar/line/donut) — do NOT rasterise Recharts. Maps: mapSnapshot.ts captures the current watershed map (outline + interventions + selected raster) as PNG via an offscreen MapView (wait for 'idle', then canvas.toDataURL); include before/after/change images from the rasters manifest. Photo evidence: up to 6 photos with id, coordinates, date, verification status. Each analytic block prints its provenance line (Source, Dataset, Date, Resolution, Processing, Status). Data Sources section is a table from provenance records used in this report. Limitations section: fixed text (observed association not causation; single-date optical limits; cloud masking; GPS accuracy; demo data if included) plus dataset-specific caveats. If any included record isDemo, add a diagonal "DEMONSTRATION DATA" watermark on every page.
HISTORY: list of saved reports (ID, watershed, period, created by, date, status Draft/Processing/Completed/Failed, actions View/Download/Delete(with confirm)); metadata saved via repository.saveReport; in mock mode the generated PDF blob is kept in IndexedDB.
Handle failure (e.g. image missing) by inserting a labelled placeholder box in the PDF and listing it in an error summary, never crashing. Tests: buildReportData snapshot for the fixture, section ordering, report ID generator. Run typecheck/lint/test/build and report.
```

**Verify:** generate PDFs for (a) all sections, (b) only 3 sections, (c) a demo-data selection (watermark visible); check page count, photos, charts, coordinates, provenance lines, page numbers, Devanagari text if any; open in Adobe/Chrome/phone viewer; unplug the network and confirm generation still works; check the main bundle did not grow (`npm run build` size output).

---

# SECTION 15 — Supabase / PostGIS backend (optional switch; do only if the mock version is complete)

**Build:** local Supabase (Postgres + PostGIS + Auth + Storage), schema migration for the 15 tables, RLS by role, a Python loader that pushes your pipeline outputs into PostGIS, a Supabase-backed `DataRepository`, and Auth replacing mock login when `VITE_DATA_SOURCE=supabase`.

**Files:** `supabase/config.toml` (from CLI), `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_storage.sql`, `supabase/seed.sql` (roles/users only), `pipeline/load_to_postgis.py`, `src/services/supabase/{client.ts,repository.ts,auth.ts}`, `src/features/auth/AuthContext.tsx` (dual mode), `docs/SUPABASE.md`.

**Hardcode by hand:** role names; RLS policy matrix (below); bucket names `geo-photos` (private), `reports` (private), `rasters` (public read is acceptable only for non-sensitive demo derivatives — you decide).

**Assets/links:** none in code; keys go in `.env.local`.

**Only you can do:**
1. Install Docker Desktop and the Supabase CLI; `supabase login` (only for cloud) — not needed for local.
2. `supabase init`, `supabase start`; copy the printed `API URL` and `anon key` into `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). **Never** put the `service_role` key in the frontend.
3. Create one auth user per role (Studio at `http://localhost:54323` → Authentication) and insert matching rows in `profiles` (role, state/district scope).
4. Run `python pipeline/load_to_postgis.py` after `supabase db reset`.
5. For cloud: create a Supabase project, `supabase link`, `supabase db push`, and set env vars in the hosting provider.

**Dependencies/config:** `@supabase/supabase-js`; Python `psycopg[binary]` or `sqlalchemy geoalchemy2`.

### PROMPT 15

```text
Read AGENTS.md first. Section 15: Supabase backend behind the existing DataRepository. The app MUST still run with VITE_DATA_SOURCE=mock and no Docker; Supabase is opt-in.

1. Install @supabase/supabase-js. Create src/services/supabase/client.ts (reads env; throws a clear error if missing when source=supabase).
2. supabase/migrations/0001_schema.sql: enable postgis; tables: profiles(id uuid pk references auth.users, full_name, role, state_id, district_id), states, districts, villages, watersheds, intervention_types, interventions, geo_photos, water_bodies, satellite_scenes, satellite_observations, indicators, change_analysis, reports, audit_logs, plus provenance (dataset provenance records). Geometry columns (SRID 4326): geometry(Polygon/MultiPolygon) for watersheds/villages/districts/water_bodies, geometry(Point) for interventions and geo_photos, geometry(LineString/MultiLineString) for drainage. GIST indexes on every geometry column; btree indexes on foreign keys and dates. geo_photos columns per the TypeScript GeoPhoto type (storage_path, sha256 unique, verification_status, gps_validation, is_demo). Add CHECK constraints for latitude/longitude ranges and enums. Add SQL functions: photos_in_watershed(ws_id), nearest_water_body(point), interventions_within(ws_id, meters) using ST_DWithin on geography casts.
3. 0002_rls.sql: enable RLS on all tables. Helper functions current_role(), current_state(), current_district() reading profiles. Policies: ADMIN full access; STATE_OFFICER read rows in their state and verify photos; DISTRICT_OFFICER read rows in their district, update geo_photos.verification_status only; FIELD_OFFICER read assigned watersheds, insert geo_photos (uploader_id = auth.uid()), read own uploads; GIS_ANALYST read all, insert/update indicators/change_analysis/satellite_*; audit_logs insert-only for authenticated, read for ADMIN. reports readable by creator + ADMIN. No table left without an explicit policy.
4. 0003_storage.sql: private buckets geo-photos and reports with policies mirroring the above (upload path <watershed_id>/<photo_id>.jpg). Use signed URLs in the frontend.
5. pipeline/load_to_postgis.py: read public/data/*.json|geojson and load with psycopg (connection string from env DATABASE_URL, default local supabase port 54322), idempotent upserts, geometry via ST_GeomFromGeoJSON, uploads photo files to Storage through the Supabase Storage HTTP API using the service role key from env (script-only, never shipped). Print row counts.
6. src/services/supabase/repository.ts implementing every DataRepository method with typed queries and zod validation of results; geometry columns returned as GeoJSON via .select with ST_AsGeoJSON (use views or RPC functions). Write methods (addPhoto with file upload, updatePhotoVerification, saveReport, audit log insert) respect RLS. src/features/auth/AuthContext.tsx: when source=supabase use Supabase Auth (email/password, session persistence), load role from profiles; when mock use the demo users.
7. docs/SUPABASE.md: exact commands to run locally and to deploy to cloud, plus an RLS test guide.
Provide SQL tests (supabase/tests or a documented psql script) that assert: FIELD_OFFICER cannot verify a photo, DISTRICT_OFFICER cannot see another district, ADMIN can. Run typecheck/lint/test/build and report; list what I must run manually.
```

**Verify:** `supabase start` succeeds; `supabase db reset` applies migrations; row counts after the loader match your JSON; log in as each role and confirm what each can see/do (also try with `curl` using the anon key and no session — should return nothing); switch `VITE_DATA_SOURCE` back to `mock` and confirm the app still works.

---

# SECTION 16 — AI image intelligence (P2, optional — ship only if stable)

**Build:** photo classification flow with confidence and **human confirm/correct**. Two modes: **Demo mode** (precomputed suggestions in JSON, clearly labelled) and **Live mode** (small FastAPI service using a *pretrained* model — no custom training).

**Files:** frontend `src/pages/AiPage.tsx`, `src/components/ai/{ClassificationCard,ConfirmCorrectBar,ConfidenceBadge,LabelSelect,AiDisclaimer}.tsx`, `src/services/aiClient.ts`; backend `api/{main.py,classifier.py,preprocess.py,requirements.txt,README.md}`; `public/data/ai_suggestions.json` (demo mode).

**Hardcode by hand:** candidate label list (must match your intervention types, e.g. check dam, farm pond, contour trench, gabion, afforestation, other); confidence thresholds for display (e.g. < 50% "Low — needs review"); disclaimer text: "AI-suggested. Requires human confirmation."

**Assets/links:** model weights (downloaded by the library on first run — needs internet and ~hundreds of MB disk).

**Only you can do:** create the Python venv, install requirements, start the API (`uvicorn api.main:app --reload --port 8000`), set `VITE_AI_API_URL=http://localhost:8000` in `.env.local`; judge honestly whether the accuracy is presentable — test on 15–20 of your photos and record results in `docs/AI_EVAL.md`. If accuracy is poor, ship Demo mode only and label it "Demonstration".

**Dependencies/config:** Python: `fastapi uvicorn python-multipart pillow opencv-python torch transformers` (zero-shot image-text model such as CLIP via `transformers`); CORS allow `http://localhost:5173`.

### PROMPT 16

```text
Read AGENTS.md first. Section 16 (optional): AI image intelligence. AI is an enhancement and must be visually secondary; no custom training.

BACKEND (api/): FastAPI app with POST /classify-image (multipart image) -> {label, confidence, top3:[{label,confidence}], model, processing:{resized:true}} and GET /health. preprocess.py: OpenCV/Pillow resize to the model's input size, convert to RGB, reject files > 10MB or non-images. classifier.py: zero-shot classification with a pretrained CLIP checkpoint from transformers using prompts "a photo of a <label>" for the label list in api/labels.json (I provide). Load the model once at startup, CPU by default. Return 422 with a clear message on bad input. Enable CORS for http://localhost:5173. api/README.md documents setup and first-run download size. Do not include any training code.
FRONTEND: src/services/aiClient.ts with two modes selected by VITE_AI_MODE=demo|live (default demo). demo: read public/data/ai_suggestions.json (I create it; entries carry isDemo:true) ; live: call VITE_AI_API_URL/classify-image with a timeout and friendly error handling. AiPage (/app/ai): pick a photo from the repository or upload one; show ClassificationCard: "Possible intervention: Farm Pond — Confidence 89%" with ConfidenceBadge (text + icon, not colour only), top-3 list, [Confirm] [Correct] buttons (Correct opens LabelSelect). Confirm/Correct writes to the photo record (imageType/description note 'confirmed by <user> on <date>') and audit log via the repository; only DISTRICT_OFFICER, STATE_OFFICER, GIS_ANALYST, ADMIN may confirm. Always show AiDisclaimer and a DemoBadge in demo mode. Never auto-apply a label without confirmation. Hide the nav item when VITE_ENABLE_AI is not 'true'. Tests: ConfidenceBadge thresholds, Confirm writes audit entry (mock repository). Run typecheck/lint/test/build and report; also give me the exact commands to start the API.
```

**Verify:** `GET /health` returns OK; classify 15–20 of your photos and log accuracy honestly; confirm/correct persists and appears in the audit log; API stopped → the UI shows a friendly error, not a blank page.

---

# SECTION 17 — Responsive design pass

**Build:** proper tablet and mobile layouts (not shrunken desktop): bottom tab bar, bottom sheets, table→card conversion, full-screen map behaviour, touch-friendly swipe compare.

**Files:** modify `layouts/DashboardLayout.tsx`, `components/Sidebar.tsx`, `components/Navbar.tsx`, `components/ui/{Table,Drawer,Tabs,Modal}.tsx`, `pages/MapPage.tsx`, `components/map/ContextPanel.tsx`, `components/analysis/SwipeCompare.tsx`, `pages/*` as needed; create `src/components/layout/BottomTabBar.tsx`, `src/hooks/useBreakpoint.ts`, `src/components/ui/ResponsiveTable.tsx`.

**Hardcode by hand:** breakpoints (`sm 640`, `md 768`, `lg 1024`, `xl 1280`) and which five items appear in the mobile tab bar (Map, Evidence, Analysis, Reports, More).

**Assets/links:** none.

**Only you can do:** test on a real phone: `npm run dev -- --host`, then open `http://<your-computer-LAN-IP>:5173` on the phone connected to the same Wi-Fi (allow the port through the firewall). Test iOS Safari if you can (viewport-height quirks).

**Dependencies/config:** use `dvh` units instead of `vh` for full-height layouts; viewport meta already present.

### PROMPT 17

```text
Read AGENTS.md first. Section 17: responsive pass. Do not change business logic. Audit EVERY route at 375, 768, 1024 and 1440 px widths and fix issues; report a before/after checklist per route.

RULES: >=1280: sidebar + content + right context panel. 768-1279: icon-rail sidebar, context panel becomes a right drawer, filters collapse into a "Filters" button opening a drawer. <768: no sidebar; BottomTabBar (Map, Evidence, Analysis, Reports, More -> sheet with remaining items + user/sign out); top bar keeps logo + search icon + bell; page titles smaller; tables render as stacked cards (ResponsiveTable with per-column priority: primary field, secondary line, status badge, action menu); Drawer variant becomes a bottom sheet with drag handle and snap heights (peek 30%, half 50%, full 90%) for Map ContextPanel and Photo detail; MapPage shows the map full-screen with a floating "Layers" button (opens layer sheet) and the ContextPanel as a peeking bottom sheet; SwipeCompare full-width with a large 44px handle and touch dragging (pointer events, touch-action: pan-y on the container); Before/After controls stack; Report builder becomes a stepper (Details -> Sections -> Preview); Charts use 100% width with readable 12px labels and horizontal scroll only inside their own container; KPI grid 2 columns on mobile.
Touch targets >= 44x44px on mobile; no horizontal page scroll at any width; use dvh; safe-area insets for the bottom tab bar (env(safe-area-inset-bottom)); respect prefers-reduced-motion. Keep desktop appearance unchanged.
Add a small Vitest test for useBreakpoint and ResponsiveTable rendering cards vs table. Run typecheck/lint/test/build and report.
```

**Verify:** DevTools device toolbar at 375/768/1024/1440 for every route; on your phone: pan/zoom the map, use the bottom sheet, drag the swipe handle, rotate to landscape; confirm no element overflows (turn on "Rendering → Layout shift regions" and scroll); text stays ≥ 14 px (except map labels).

---

# SECTION 18 — Testing and quality gates

**Build:** automated checks that protect your rules (wording, placeholders, provenance, data integrity), unit tests, an end-to-end demo-flow test, accessibility checks, and a performance budget.

**Files:** `src/test/wording.test.ts`, `src/test/data-integrity.test.ts`, `src/test/provenance.test.ts`, `scripts/check-placeholders.mjs` (finish), `scripts/check-bundle.mjs`, `e2e/demo-flow.spec.ts`, `playwright.config.ts`, `docs/QA_CHECKLIST.md`, `.github/workflows/ci.yml`.

**Hardcode by hand:** the banned-phrase list (from AGENTS.md); bundle size budgets (e.g. main chunk < 400 KB gzip, each PNG overlay < 1.5 MB); demo credentials for e2e (use the demo users).

**Assets/links:** the four test photos from S10 in `e2e/fixtures/`.

**Only you can do:** run the manual QA checklist below on real devices; install Playwright browsers (`npx playwright install`); run Lighthouse in Chrome; get one teammate who has never seen the app to complete the demo flow without help.

**Dependencies/config:** dev: `@playwright/test @axe-core/playwright`.

### PROMPT 18

```text
Read AGENTS.md first. Section 18: testing and quality gates. Add tests; fix product bugs you find only when they are clearly bugs and list each fix.

1. Vitest: (a) wording.test.ts scans src/**/*.{ts,tsx} string literals and public/data/**/*.json for the forbidden phrases in AGENTS.md (case-insensitive) and fails with file:line; allow an explicit allowlist file for legitimate uses (e.g. the word 'impact' in a third-party dataset title) requiring a justification string. (b) data-integrity.test.ts: every intervention references an existing watershed/village/type; every photo references an existing watershed; photos with gpsValidation valid have lat/lng in range and inside/near their watershed (report distance); geometries valid; ids unique; raster manifest files exist on disk; every raster PNG < 1.5MB. (c) provenance.test.ts: every provenanceId used anywhere resolves; no record has status error unless flagged. (d) fill coverage gaps for lib/geo, photoValidation, dashboardStats, scoring, insight templates.
2. scripts/check-placeholders.mjs: fail on any TODO_REAL in shipped data or src; print a grouped report. Add `npm run verify` = typecheck + lint + test + validate:data + check:placeholders + build.
3. Playwright e2e/demo-flow.spec.ts covering the judge demo in order: login (demo Admin) -> dashboard KPIs visible -> open Map View -> select watershed (URL has ws=) -> select an intervention -> details panel shows coordinates -> open its photos -> Field Evidence detail shows coordinates and GPS badge -> Analysis Before/After: slider moves via keyboard (aria-valuenow changes) -> Analytics has at least one chart with source caption -> Provenance page lists datasets -> generate a report and assert a PDF blob is produced (download event or preview) -> logout. Add @axe-core/playwright checks on login, dashboard, map, evidence, analysis, reports (no serious/critical violations; list any exceptions with reason). Test a mobile viewport (375x812) for login, dashboard, and map (bottom tab bar visible, no horizontal overflow).
4. scripts/check-bundle.mjs: after build, fail if the main JS chunk gzip > 400KB or if @react-pdf appears in the entry chunk.
5. .github/workflows/ci.yml running `npm ci && npm run verify` and Playwright (chromium) on push/PR.
6. docs/QA_CHECKLIST.md with the manual checklist (I will run it): browsers (Chrome, Edge, Firefox, Safari if available), devices, slow network, offline behaviour for mock mode, empty/error states for each page, keyboard-only navigation, screen-reader smoke test of login and photo detail, print/PDF check.
Report results honestly, including tests you could not run and why.
```

**Manual QA checklist (you):**

| Area | Check |
|---|---|
| Auth | Each role logs in; blocked routes redirect; sign-out clears session |
| Map | All layers toggle; opacity works; deep-link restores state; attribution visible |
| Data | Spot-check 5 interventions and 5 photos against source records |
| Evidence | Upload the four fixtures; verification by allowed roles only |
| Analysis | Overlay alignment; cloud warning; slider keyboard + touch |
| Reports | 3 configurations; open in another PDF reader; watermark when demo data included |
| Provenance | No "Provenance missing"; links open the correct real pages |
| Wording | Search UI for "impact", "caused", "score" — none in forbidden usage |
| a11y | Keyboard-only run of the full demo; contrast; focus visible; zoom to 200% |
| Perf | Lighthouse (desktop + mobile) — record scores; map interactive < 3 s on your laptop |
| Resilience | Kill network: mock mode still works; corrupt one JSON: error state shows with retry |

**Verify gate:** `npm run verify` and Playwright pass locally and in CI; Lighthouse accessibility ≥ 90 on main pages; no `TODO_REAL` left.

---

# SECTION 19 — Final polish, deployment, and demo preparation

**Build:** consistency and finish, SEO/social meta, production config, deployment, README, demo mode safety net.

**Files:** modify `index.html`, `README.md`, `vercel.json` (or `public/_redirects` for Cloudflare Pages), `src/main.tsx` (error boundary), `src/components/ErrorBoundary.tsx`, `docs/DEMO_SCRIPT.md`, `docs/LIMITATIONS.md`, `public/robots.txt`; audit all pages.

**Hardcode by hand:** demo script wording, judge Q&A answers (limitations, data sources, why not causal claims), the final README credits and data attribution list (copy exact attribution strings from `docs/DATA_LOG.md`), app version.

**Assets/links:** `public/images/branding/og-image.png` (screenshot of the finished map view, 1200×630), favicon set, final logos.

**Only you can do:**
1. Create a Vercel or Cloudflare Pages account, import the GitHub repo; build command `npm run build`, output `dist`; set env vars (`VITE_DATA_SOURCE`, and Supabase vars if used); add SPA rewrite so `/app/*` deep links work.
2. Test the deployed URL on your phone and on another network.
3. Record a **2–3 minute backup demo video** of the full flow; save it locally and on a USB stick.
4. Rehearse the 13-step demo at least 3 times; time it.
5. Prepare offline fallback: `npm run build && npm run preview` on your laptop with mock data (works without internet except tiles — cache or use a prepared screenshot fallback).
6. Rotate any key that ever appeared in a commit (`git log -p | grep -i key`).

**Dependencies/config:** SPA rewrite config: Vercel `vercel.json` → `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`; Cloudflare Pages `public/_redirects` → `/* /index.html 200`.

### PROMPT 19

```text
Read AGENTS.md first. Section 19: final polish. Do not add features. Work through this checklist and report per item (done / not done / needs me).

1. Consistency audit of every page: spacing, headings hierarchy (one h1 per page), button hierarchy (one primary CTA), terminology (Field Evidence, Geo-tagged Photo, observed change), icon usage from lucide-react only, no raw hex colors in components (grep), no console.log, no unused files/exports.
2. States audit: every data view has loading/empty/error states; add ErrorBoundary at the app root and per route with a friendly message, error id, 'Reload' and 'Report' (mailto placeholder TODO_REAL).
3. DEMO labelling audit: list every place isDemo data can appear and confirm DemoBadge/banner/ribbon presence; ensure reports carry the watermark; ensure no demo photo is described as official evidence.
4. Trust audit: every KPI/chart/analysis has a provenance chip and source caption; every analysis view has LimitationNote; run the wording test.
5. Performance: route-level code splitting, lazy load maplibre-heavy pages and react-pdf, image lazy loading with width/height attributes, cache headers guidance in README, confirm PNG overlays are small.
6. Meta: index.html title/description/theme-color, Open Graph + Twitter tags (og-image at /images/branding/og-image.png), robots.txt, favicon set, manifest.webmanifest (name, icons, theme).
7. Hide /dev/ui in production builds (verify by building and visiting).
8. README.md: what it is, screenshots placeholders, features, tech stack, architecture diagram (Mermaid), setup (mock mode), data pipeline steps (pipeline/README summary), Supabase mode summary, testing (`npm run verify`), deployment (Vercel/Cloudflare), data sources & attributions (from docs/DATA_LOG.md), limitations, roles and demo accounts (marked demo, not secure), license/disclaimer ("Prototype for SIH 2026. Not an official Government of India application.").
9. docs/DEMO_SCRIPT.md: the 13-step judge flow with exact clicks, timing per step, what to say, and fallback if a step fails; docs/LIMITATIONS.md honest list (single watershed, two dates, optical cloud cover, threshold-based decision rules configurable, AI optional/pretrained).
10. Add vercel.json rewrite for SPA and public/_redirects for Cloudflare.
11. Final gate: run `npm run verify` and Playwright and report. List all remaining TODO_REAL and anything that still needs me.
```

**Verify:** deployed URL passes the same demo flow as local; `npm run verify` green; `docs/DEMO_SCRIPT.md` walk-through completed by someone else in ≤ 5 minutes; Lighthouse ≥ 90 accessibility, ≥ 80 performance on desktop; open Graph preview looks right (paste the URL into a chat app).

---

# Appendix A — Master list of manual tasks (tick as you go)

| # | Task | Section |
|---|---|---|
| 1 | Baseline commit; copy `AGENTS.md` to your agent's rules file | S0 |
| 2 | Install Node 20+, Python 3.11+, QGIS; (Docker + Supabase CLI later) | Prereqs |
| 3 | `npm install`; decide about `src/assets/hero.png` | S1 |
| 4 | Create GitHub repo and push | S1 |
| 5 | Review `/dev/ui` against the reference PDFs; contrast check | S2 |
| 6 | Export logos (light/dark/icon), favicon set, login hero image | S3/S5H |
| 7 | Decide study area; write `docs/STUDY_AREA.md` | S5A |
| 8 | Boundary, drainage, water bodies, villages → clean GeoJSON (QGIS) | S5B |
| 9 | Interventions CSV from real records | S5C |
| 10 | Photos with GPS EXIF (originals) + `photos_meta.csv`; separate demo photos | S5D |
| 11 | Sentinel-2 L2A for two same-season dates (B03, B04, B08, SCL) | S5E |
| 12 | Land cover, DEM, rainfall/population CSVs | S5F |
| 13 | Basemap choice + read tile terms + keys in `.env.local` | S5G/S6 |
| 14 | Python venv + `pip install -r pipeline/requirements.txt`; run `build_seed.py` | S5 |
| 15 | Provide decision-rule thresholds and unit choice | S12 |
| 16 | Download Inter + Noto Sans Devanagari TTF into `public/fonts/` | S14 |
| 17 | Fill `provenance.json` with real URLs/licences/dates | S13 |
| 18 | (Optional) Docker, Supabase local, create role users, run loader | S15 |
| 19 | (Optional) AI API venv + accuracy test log | S16 |
| 20 | Phone LAN test, cross-browser, Lighthouse, teammate walkthrough | S17/S18 |
| 21 | Deploy (Vercel/Cloudflare), set env vars, test on phone | S19 |
| 22 | Record backup demo video; rehearse 3×; offline fallback | S19 |

# Appendix B — Target folder structure (end state)

```
jaldrishti/
├─ AGENTS.md  README.md  .env.example  vercel.json
├─ docs/  (AUDIT, STUDY_AREA, DATA_LOG, DEMO_SCRIPT, LIMITATIONS, QA_CHECKLIST, SUPABASE, AI_EVAL)
├─ pipeline/  (config.py, extract_exif.py, make_web_images.py, build_features.py, rasters_export.py,
│              landcover_stats.py, zonal_stats.py, slope_stats.py, build_seed.py, load_to_postgis.py, raw/ [git-ignored])
├─ api/  (FastAPI for AI, optional)
├─ supabase/  (migrations, seed, config; optional)
├─ public/  (data/ [json, geojson, rasters/, provenance.json], images/{photos,branding}, logos/, fonts/, icons/)
├─ e2e/  scripts/
└─ src/
   ├─ components/{ui, layout, map, dashboard, watershed, intervention, evidence, analysis, decision, provenance, ai}
   ├─ features/{auth, selection, reports}
   ├─ layouts/  maps/  charts/  hooks/  lib/  config/  data/  services/{mock,supabase}  types/  pages/
   └─ test/
```

# Appendix C — If the agent misbehaves

- **It changes too much:** `git restore .` and re-run the prompt with "Only modify the files listed in Section N; ask before touching anything else."
- **It invents data or URLs:** point to AGENTS.md rule 4 and run `grep -rn "http" public/data src/data` to find fabricated links; replace with `TODO_REAL`.
- **Map is blank:** container has no height; CSS import missing (`maplibre-gl/dist/maplibre-gl.css`); tile URL blocked (check the Network tab).
- **Raster overlay misaligned:** corner order must be NW, NE, SE, SW as `[lng, lat]`; check the export was reprojected to EPSG:3857 before computing corners.
- **Photos have no GPS:** originals were shared through a messenger that stripped EXIF — re-transfer the original files.
- **Build passes but a page is broken:** ask the agent to run the specific route in the browser or add a Playwright test for it; do not accept "should work".
