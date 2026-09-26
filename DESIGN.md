# VITRO TestFit — Design Document

Status: live at https://orvinreyes-create.github.io/vitro-testfit/ · public repo `orvinreyes-create/vitro-testfit` (formerly `dc-concept-generator`) · document date 2026-09-26

> **Confidentiality.** The repo is public. The design standard (the basis of design, "GRD": the NTT DATA / Burns & McDonnell design guide used as a "Private and Confidential" basis-of-design document) must never be committed. No GRD numbers, access keys or private profile files go in the repo, in commits or in this document. The private profile files are `GRD-basis-of-design-profile.PRIVATE.json` and `GRD-basis-of-design.PRIVATE.csv`. They are handed out separately.

---

## 1. Project overview

**What it is.** A browser-based, TestFit-style data centre concept generator for Philippine sites. You draw or import a site boundary. The app solves a campus or infill layout live: data halls, energy centres, admin, loading docks, roads, substation, heat-rejection yards, retention pond, parking, security fence. It reports capacity (MW IT, facility MW, racks, floor area, coverage, height) and screens site risk (faults, grid, flood, landslide, storm surge). It exports branded one-pagers, drawings, data and 3D models.

**Who it's for.** VITRO Data Centers (PLDT Group), Business Development & Innovations. BD leads and colleagues use it to screen land quickly, size MW, compare sites and produce client or management-ready concept sheets. The output is a concept test fit only: not for design or permitting.

**Core problem.** Early site screening used to need consultants or a manual CAD exercise. TestFit gives an instant, standards-based answer to "how many MW fit here, what does it look like, what are the risks?" It uses VITRO's own basis of design (the GRD) loaded privately at runtime, so the public app holds no confidential values.

---

## 2. Features

### 2.1 Built (live)

**Site and solver**
- Draw site on the map (Draw site, drag corners, Remove corner). Import a boundary from bearings text ("N 12 15 E 180.00") or GeoJSON. Place search is limited to the Philippines.
- Click an edge-length label to set the street frontage (gates and docks face it).
- **Site typology:** Metro or Campus, which sets profile defaults.
- **Zoning inputs:**
  - `setback`, `maxH`, `maxCov`, `storeys` (a GRD-tagged storeys cap)
  - `padInSetback`: "Roads and yard clearances may use the setback"
- **Security inputs:** `fenceOn`, `fenceInset`, `clearZone`.
- **Load inputs:**
  - `targetMW`, rack density `density` (ent / ai60 / ai130 / ai200), electrical plant `segElec` (EROOM / EMOD)
  - `adminSqm` (admin area override)
- **Building mix:** per-building MW, density and floors (`mixRows`, `mixAdd`, `mixAuto`). With a mix set, `targetMW` is disabled and shows the mix sum (`syncTarget()`, note `#tgtNote`).
- **Layout inputs:**
  - `massing` (auto / modular / infill …), `circulation` (auto = compare internal / perimeter / external, or custom)
  - `ecPos` (energy centre position), `hrLoc` (roof / roofyard / ground heat rejection)
  - `bandAxis` (infill zone bands), `faceGate`, `oneSide` (linear buildings with road on one side)
- **Design values** (GRD-sourced, per-site overrides):
  - racks and cooling: `sqmRack`, `pue`, `liquid`, `rackKg`, `hrPerMW`, `roofTiers`
  - buildings and yards: `bldgMax`, `yardClear`, `dockApron`, `roadW`
  - substation: `subSqm`, `subMargin`, `subAspect`, `subMinSide`
  - site services: `pondPct`, `supportSqm`
- **Building forms:** side (GRD module), end ("linear"), lside ("compact linear"). Slim variants at 0.8 / 0.65 / 0.5 depth.
- **Heat rejection:** roof chiller deck, roof then detached yard, or ground detached yard (`placeHR`, up to 4 yards).
- **Pins and roads:** Pin building, Pin substation, Edit roads (draggable road graph), Next orientation, Optimise (8 s search), Force fit (relax values step by step), Pause solving (key P).
- **Infill stacking model:**
  - Ground floor: loading dock, admin and lobby. Leftover ground space takes electrical and mechanical rooms, then data halls.
  - Upper floors: data halls with electrical and mechanical rooms and a freight lift core. Admin overflow goes up; leftover space is "Spare floor space".
  - The plan view shows the typical upper floor (`zonesUp`).
  - The freight lift core (`coreRect`) is a shaft on the street face standing 0.8 m proud of the facade, running full height plus 3.5 m overrun.
  - The storeys cap is enforced by binary search on MW (`solveInfill`).
- **Flags:** height, coverage, floor loading, the storeys cap and more. The spec sheet result box turns green when the target fits and stays amber otherwise.

**Visualisation**
- MapLibre 2D plan with zone labels. Interior detail (rack rows, electrical bays) appears at high zoom.
- **Zone hover:** each margin or zone highlights with a tooltip naming the controlling setting. Clicking jumps to that sidebar field (`ZINFO`).
  - Zones covered: setback, clearzone, fenceband, road, gate, clear-bldg, clear-sub, clear-hr, apron, pond, support, yard, guard, core, sparefl.
  - Also works in 3D (layer `layout-3d`, with textures on or off).
- **3D mode:**
  - Fill-extrusion massing.
  - Camera pad (orbit, tilt, zoom, Fit site, Gate / North / Iso presets, Auto-orbit). Auto-orbit persists across project switches.
  - Textures toggle: three.js skin layer `skin-3d` (roof decks with chillers, clad, louvre and dock walls).
- **Risk layers toggle (`btnRisk`):** faults, transmission lines by kV, OSM substations, private substations, NOAH hazard shading. Hover labels on all of them.

**Site risk (screening)** — card `#riskCard` on the spec sheet
- Nearest mapped active fault, with type, and the count within 5 km. Colour dots: red under 1 km, amber under 5 km, green beyond.
- Nearest substation, nearest 115 kV+ substation, nearest 230 kV+ line, nearest 69–138 kV line.
- **Nearest listed substation (VITRO list),** when a private list is loaded. Its headroom dot compares against the layout's facility MW: green if covered, amber if at least 50%, red below.
- **NOAH hazards:** 100 / 25 / 5-year flood, landslide, storm surge (SSA4). Each reports the worst level and the % of the site covered.
- Distances run to the site boundary; a distance of 0 shows as "On site".
- A link to PHIVOLCS HazardHunterPH for official checks, plus source credits.

**Projects and sharing**
- Save, Open file, Export project file (`.dccg.json`), Back up all (`TestFit-backup-YYYY-MM-DD.json`), restore from backup.
- **Connect folder** (File System Access API): the project list reads `.dccg.json` files from a OneDrive-synced shared folder.
  - OneDrive conflict duplicates are flagged as "Sync copy".
  - Refresh, Disconnect and Reconnect controls.
- **Project list:** sort by name / newest / recently saved / capacity. An "OPEN NOW" marker shows the open project.
- **Compare projects:** 2–4 projects side by side (mini plan, KPIs, GRD departures, nearest fault and substation), printable.
- **Departures from the basis of design:** an amber box on the spec sheet, shown in the app only, not on one-pagers.
- Undo / redo (↶ ↷, Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y), 60 steps.
- Save and backup progress indicators (spinner, then "✓ Saved").

**Exports** (Export ▾ menu)
- **One-pager:** PDF (print) and PowerPoint (PptxGenJS), with a 3D view choice (gate / north / best).
- **Drawings and data:** Site plan (PNG), Spec sheet (CSV), Layout (GeoJSON).
- **3D model:** GLB and OBJ + MTL.

**Access, branding, platform**
- **Access gate:** the whole app is blurred behind a lock card until a VITRO profile with a valid access key and complete values is loaded.
- VITRO logo header, "TestFit" wordmark, home-screen icon and manifest.
- Light mode only.
- Mobile: map at 80vh, a ☰ Tools menu, compact summary card.
- Offline service worker (`sw.js`).
- Keyboard shortcuts: D draw, R roads, 3 3D, T textures, L risk layers, S satellite, P pause.
- Sidebar accordion (one section open, with summaries on closed sections).
- Background solver (Web Worker).

### 2.2 Planned / not built

| Priority | Item | Notes |
|---|---|---|
| P1 | DXF export for engineers | Layers: boundary, setback, roads, buildings |
| P1 | Existing building as a fixed footprint | Solver works around it; for expansions like Sta. Rosa |
| P1 | Substation placed inside the infill plot | Today infill only flags it |
| P2 | SharePoint / Microsoft sign-in storage | On hold by user decision (see §3) |
| P2 | Saved regression suite stored privately | Test scripts exist only in the dev session today |
| P2 | Optimise and Force fit in the worker | Currently synchronous; callers read `state.result` immediately |
| P3 | Infill service-lane option | Discussed; user declined for now |
| P3 | Active-volcano distances; coastline and road distances in the risk card | Offered |

---

## 3. Design decisions

| Decision | Chosen | Why | Rejected alternatives |
|---|---|---|---|
| App form | Single `index.html` on GitHub Pages, plus `sw.js` and `data/` | Zero infra, instant deploy, works on phone and desktop | Hosted backend: cost and IT involvement |
| Confidential design data | GRD values loaded at runtime from a private profile file; the repo holds only `PLACEHOLDER` values | Repo is public | Bundling GRD values |
| Access control | Client-side gate: profile must contain `accessKey`, whose SHA-256 must match `KEY_HASH`, and all numeric leaves of `PLACEHOLDER` (except `rowPitch`) | Stops casual visitors; confidential data is never on GitHub anyway | Disabling only Draw site (too weak). Private repo + Pages access control or Microsoft sign-in hosting (stronger but needs paid plan or IT) |
| Project storage | `localStorage`, plus an optional File System Access folder (OneDrive shared) | Sharing with colleagues without IT; files stay in VITRO's OneDrive | SharePoint "anyone with link" (browsers can't read anonymous SharePoint shares cross-origin). Graph API / MSAL (needs Entra app registration; on hold) |
| Folder sync conflicts | Detect OneDrive duplicate files (name ≠ `pFile(name)`), label "Sync copy" | Nothing lost, user resolves | Locking (impossible without a server) |
| Infill model | Ground floor dock + admin; upper floors halls, EROOM and mech around a freight core | Matches real urban DC stacking | Spreading admin and dock evenly over every floor (unrealistic, inflated floors) |
| Admin area | Per-site `adminSqm` override, flagged as a GRD deviation | GRD admin is a fixed per-building figure that dominates small infill buildings | Silently shrinking admin |
| Freight core | Separate shaft, 0.8 m proud of the facade | Avoids z-fighting flicker; reads like a real shaft | Full-width "dock and freight core" band (looked odd in 3D) |
| Summary card KPIs | MW IT, MW facility, **racks**, ha site | Racks matter commercially; coverage is enforced and flagged | Showing coverage % |
| GRD departures | Shown in the app (spec box, Compare) only | User decision: keep one-pagers clean | Printing departures on the PDF / PPT |
| Sidebar | Accordion, one section open, summaries on closed sections, remembers last section (`dccg.sec`) | Short sidebar; summaries avoid flipping between sections | All sections open |
| Theme | Light only (`color-scheme: only light`, meta `color-scheme`) | User request | Auto dark mode |
| Site-risk grid and faults | Bundled snapshots in `data/`, refreshed quarterly by a GitHub Action | No site coordinates leave the browser; fast | Live Overpass queries (leak site location, slow, rate-limited) |
| NOAH hazards | Live PMTiles range reads from Hugging Face, only tiles around the site | Data is 34 GB; range reads are tiny | Bundling the data (too big) |
| Fault data | GEM Global Active Faults (CC BY-SA), PH subset | Openly licensed | PHIVOLCS shapefiles (not openly licensed; link to HazardHunterPH instead) |
| Distances | Straight line to the site boundary | Accurate for long or large sites | Site centre (initial version) |
| Solver threading | Full re-solves after edits go to a Web Worker built from the `<script id="core">` text; coarse solves stay synchronous | UI never freezes on big sites; identical results | Time-slicing the solver (more invasive) |
| Mobile | ☰ Tools overlay, hidden zoom and scale controls | More map, less clutter | Wrapping toolbar |
| Repo name | `vitro-testfit` | Matches the app name "VITRO TestFit" | `dc-concept-generator` |

---

## 4. Data model

### 4.1 Basis-of-design profile (BOD)
- **Storage:** `localStorage["dccg.bod.v1"]` (array of profiles). The active id is in `dccg.bod.active`.
- **Import:** CSV (`parameter,value,what this sets`) or JSON.
- **CSV rows (`CSV_ROWS`):** paths such as `name`, `accessKey`, `moduleMW`, `elec.EROOM.admin`, … . String paths: `name`, `accessKey`.
- **Validation:** `keyOK(raw)` against `KEY_HASH`; `missingLeaves(raw)` must be empty; then `validateBOD`.
- **Structure** (values come from the private file; the public `PLACEHOLDER` holds generic numbers):
  - top level: `name, version, source, accessKey`
  - `moduleMW, rowPitch, circFactor, floorM, roofPlantM, rackKgLimit, dockApron, ecLevels, roofShare, yardClear, subSqm, subMargin, fenceInset, clearZone, roofTiers`
  - `gensPerModule, genKVA, fuelHours, fuelLPerGen`
  - `elec: { EROOM:{crit, ecPerMW, admin}, EMOD:{crit, ecPerMW, admin} }`
  - `density: { ent|ai60|ai130|ai200: {kw, sqmRack, liquid, rackKg, hr} }`
  - `pue: { metro|campus: { ent|ai60|…: number } }`
  - `profile: { metro|campus: { targetMW, setback, maxH, maxCov, storeys, bldgMax, pond, road, supportSqm } }`

### 4.2 Project snapshot (`snapshot()` / `restore(p,{keepView})`)
- **File:** `<name>.dccg.json`, `app:"dccg"`, `v:9`.
- **Fields:**
  - identity and timing: `name, saved (ISO), created (ISO), mw (achieved IT), targetMW (mix-aware)`
  - selections: `profile, elec, density`
  - geometry: `ring [[lon,lat]…]`, `values {NUM ids → string}`
  - layout options: `oneSide, hrLoc, view {deg,type,opt}, subPinLL, ecPos, padInSetback, fenceOn, pinsLL, roadsLL {nodes,edges,w}, frontLL, bandAxis, massing, faceGate, circulation`
  - building mix: `mix [{mw, dens, st}]`
  - `adminSqm, bodName`
- **Folder-mode extras (in memory only):** `_file`, `_dup`.
- **Backup file:** `{app:"dccg-backup", v:1, created, count, projects:[snapshot…]}`.
- **Stores:**
  - `localStorage`: `dccg.projects.v1` (list), `dccg.lastSession`, `dccg.projSort`, `dccg.sec`, `dccg.view3d`, `dccg.subs`
  - IndexedDB: `dccg-fs`, store `h`, key `dir` (the folder handle)

### 4.3 Solver result (`state.result.options[i]`)
- **Core fields:** `type` (internal / perimeter / external / infill / custom), `deg, a, it (MW), fac (MW), cov, storeys, built[] (spec per building), placed[] (sub, pond, hryard, support, buildings), roads[] {a,b,w}, gate {edge,node,w}, flags[], limit, rows[] [label, value, key], dist[], capInfo`.
- **Infill extras:** `rect, zones[], zonesUp[], coreRect, dock`.
- **`rows` keys:** `siteArea, circRow, buildings, itLoad, facLoad, racks, hallArea, gfa, adminGfa, docksRow, plateRow, footprint, coverageRow, storeysRow, ecFoot, roofHR, yardHR, liquidRow, cdus, streams, gensRow, fuelRow, roadRow, subRow, pondRow, supportRow, distRow, fenceRow`.
- **Infill spec extras:** `upper {hall, crit, ec, admin, core}`, `adminGround`, `bands {dock, admin, crit, ec, hall}`, `typicalHall`, `plantFloors`.

### 4.4 Map features (`state.layoutGeo`)
- **Properties:** `kind` (clear, hall, admin, ec, yard, sub, pond, support, road, apron, gate, landscape, spare, roofhr, guard, clearzone, setback, fenceband, upper, core, sparefl, fence), `lines` (label lines), `h`, `base` (3D metres), `z` (hover zone id).
- **Colours:** `COLORS` map.

### 4.5 Site-risk data
- **`data/faults-ph.json`:** `{source, retrieved, faults:[{n:name, t:slip_type, c:[[lon,lat]…]}]}` (127 traces).
- **`data/grid-ph.json`:** `{source, retrieved, subs:[[lon,lat,name,operator,kV]…], lines:[[kV,name,operator,[[lon,lat]…]]…]}`.
  - Substations are deduplicated within 200 m.
  - Lines are ≥69 kV, simplified to about 250 m spacing.
  - Current counts: 827 substations, 2,838 lines.
- **Private substation CSV:** `name,lat,lon,kv,capacity_mva,headroom_mva,notes`. Loaded from the file picker (stored in `dccg.subs`) or read automatically from `substations.csv` in the connected folder.
- **NOAH PMTiles** (base `https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/resolve/main/PMTiles/layers/`):
  - Floods: `flood_100yr`, `flood_25yr`, `flood_5yr`. Attribute `Var`: 1 Low, 2 Medium, 3 High.
  - Landslide: `landslide`. Attribute `HAZ`: 1 Low … 4 Very high.
  - Storm surge: `storm_surge_ssa4`. Attribute `HAZ`: 1–3.
- **Runtime state:** `RISK {data, res, key, on, priv, privSrc}`, `HAZ {ready, res, key, L}`.

### 4.6 Relationships
- One Project has one ring, a building mix of 0..n, a solver result with 1..n options, one active BOD, one risk result and one hazard result.
- A Folder holds 0..n Project files, 0..n backups and an optional `substations.csv`.
- The BOD supplies defaults via `profileValue(id)`. `devList()` compares against `DEV_IDS` plus `adminSqm`.

---

## 5. UI / UX

**Layout.** Three columns: sidebar (left), map (centre), spec sheet (right). At 1100 px or less they stack. At 700 px or less the mobile rules apply.

**Sidebar**
- **Header:** VITRO logo (36 px), divider, "TestFit" in cobalt, "Business Development & Innovations".
- **Numbered accordion:**
  1. Project: name, folder box, save, open, export, backup, Compare, sort, list.
  2. Site: typology, boundary import, zoning, security.
  3. Load and buildings: target, density, electrical plant, admin area, building mix.
  4. Layout.
  5. Design values.
  6. Basis of design: profile picker, import and export, private substation list.
- Tags beside fields show where each value comes from: NBCP (the National Building Code of the Philippines), GRD or SITE. Each field has an info tooltip.

**Toolbar**
- History (↶ ↷).
- Edit: Draw site, Remove corner, Edit roads.
- Pins: Pin building, Pin substation.
- Solve: Pause, Optimise, Force fit, Next orientation.
- View: Satellite, Risk layers, 3D.
- Export ▾.

**Map overlays**
- Live summary card (MW IT, facility MW, racks, ha site, result line, flags; "Updating…" while the worker solves).
- Edge-length labels (click to set the street).
- 3D camera pad.
- Hover tooltip `#ztip`.

**Spec sheet (top to bottom)**
- Banners.
- GRD departures box (amber, or green "Matches…").
- Site risk card.
- Result box (green or amber).
- Flags.
- Phase table.
- Totals.

**Key flows**
1. Load profile at the gate, then draw a site.
2. Tune inputs; the layout re-solves live.
3. Hover zones to see what drives each margin.
4. Save to folder.
5. Export the one-pager.
6. Compare saved sites.

**Styling**
- VITRO design system: cobalt `#00006E`, background `#F5F6F8`, surface `#EEEEF7`, white text on cobalt.
- Fonts: Aptos Display / Aptos / Consolas on one-pagers; Barlow / Barlow Condensed in the app.
- One-pager marks: "VITRO Test Fit and Data Center Concept - Business Development & Innovations" and "CONFIDENTIAL".
- The map keeps its original colours.
- Site floor opacity is 0.9. Ground clearances are grey with no outline.

---

## 6. Tech stack and architecture

**Frontend**
- Vanilla JS in one HTML file, with two classic scripts:
  - `<script id="core">`: pure solver and geometry, no DOM. Reused as the Web Worker source via Blob URL (`SOLVER`).
  - The main script: UI, map and exports.
- Libraries loaded from CDNs:
  - MapLibre GL 4.7.1 (unpkg)
  - three.js 0.160.1 (jsDelivr, loaded on demand)
  - PptxGenJS 3.12.0 (jsDelivr, loaded on demand)
  - pmtiles 3.2.1 (jsDelivr, loaded on demand; `pmtiles://` protocol)
- Basemaps: OSM raster; Esri World Imagery for satellite.
- Place search: Photon (biased to the map centre, results filtered to `countrycode === "PH"`) and Nominatim (`countrycodes=ph`) queried in parallel, merged and deduplicated, top 8 shown.
- **Worker protocol:** `postMessage({id,o,poly,B,hint})` returns `{id,res|err}`. Stale ids are ignored (`SOLVER.seq`). Errors fall back to a sync solve.

**Hosting:** GitHub Pages from `main` (repo root).

**Service worker (`sw.js`, cache version `vtf-v2`)**
- Registered only over HTTPS or on `localhost`.
- Page: network first.
- Libraries and `data/`: cache first / stale-while-revalidate.
- Map tiles: cache as you go, capped at 1,500 (`TILE_MAX`).
- NOAH PMTiles range reads (Hugging Face) and place search are not cached, so hazard lookups and search need a connection.
- Old `vtf-*` caches are deleted on activate. Bump `V` in `sw.js` when the caching rules change.

**Automation**
- `.github/workflows/risk-data.yml` runs `tools/build_risk_data.py`.
  - Triggers: quarterly cron `0 2 1 1,4,7,10 *`, manual (`workflow_dispatch`), and pushes to the script.
  - Needs `permissions: contents: write`. Pulls with rebase before pushing.
- **Overpass queries** (country area `ISO3166-1=PH`, `admin_level=2`):
  - Substations: `power=substation` nodes, ways and relations, `out center tags`. Voltage is parsed as the highest value in the `voltage` tag, in kV. Named and voltage-tagged entries win when deduplicating within 200 m.
  - Lines: `power=line` ways with a `voltage` tag, `out tags geom`, kept when ≥69 kV and simplified to about 250 m vertex spacing.
  - Coordinates are rounded to 4 decimal places (about 11 m).
  - Three mirrors are tried in turn (overpass-api.de, kumi.systems, mail.ru), three rounds with 60 s between rounds; the script fails the job if all fail.
- **Fault data:** the harmonised GEM GeoJSON from GitHub, filtered to the `philippines` and `EOS_SE_Asia` catalogues and the PH bounding box (116–127.5 E, 4–21.5 N).
- The bot commits only when `data/grid-ph.json` or `data/faults-ph.json` changed ("Refresh site-risk data (YYYY-MM-DD)").

**Repository layout**

| Path | Contents |
|---|---|
| `index.html` | The whole app: styles, `core` solver script, main UI script, inline logo |
| `sw.js` | Offline service worker |
| `data/faults-ph.json`, `data/grid-ph.json` | Site-risk snapshots (bot-maintained) |
| `tools/build_risk_data.py` | Snapshot builder |
| `.github/workflows/risk-data.yml` | Quarterly refresh job |
| `DESIGN.md` | This document |

---

## 7. Security and privacy

- **No confidential values in the repo.** `PLACEHOLDER` holds generic numbers only. Real values arrive in a private profile file and live in the user's `localStorage`.
- **Access gate is a deterrent, not security.** The page source is public, so the gate can be bypassed. This is acceptable because it protects nothing confidential: without a private profile the app only has placeholder values. Only `KEY_HASH` (a SHA-256) is committed, never the key.
- **Site location stays local for risk screening.** Faults and grid are bundled; distances are computed in the browser.
- **What does leave the browser:**
  - NOAH lookups request only the PMTiles byte ranges around the site, so Hugging Face can infer the rough area.
  - Place search sends the typed query (and, for Photon, the map centre) to Photon and Nominatim.
  - Map tiles are fetched from OSM and Esri for the area in view.
- **Projects** stay in `localStorage` or the user's own OneDrive folder. The app never uploads them.
- **Before each commit:** check the diff for GRD values, access keys and `*.PRIVATE.*` files.

---

## 8. Known limitations

- **Screening only.** Outputs are concept test fits, not design or permitting documents. Hazard results do not replace PHIVOLCS / MGB / PAGASA checks (HazardHunterPH is linked for that).
- **Data coverage.** OSM grid data is incomplete in places, and substation capacity is only known from the private list. Fault traces are those mapped in GEM; unmapped faults are not screened.
- **Straight-line distances** ignore routing, terrain and right-of-way.
- **Synchronous Optimise and Force fit** can pause the UI briefly on large sites (see §2.2).
- **Folder storage** needs a browser with the File System Access API (Chromium-based desktop browsers). Other browsers use `localStorage` and file import/export.
- **No real concurrency control.** Two people saving the same project in a shared folder produce OneDrive duplicates ("Sync copy") for a person to reconcile.
- **Infill** flags, but does not place, the substation (see §2.2).

---

## 9. Operations

- **Deploy:** push to `main`; GitHub Pages serves the root. Service-worker clients pick up the new page on their next online load (network first).
- **Refresh risk data:** run the "Refresh site-risk data" workflow manually, or wait for the quarterly run. Check the printed counts in the job log.
- **Rotate the access key:** hash the new key with SHA-256, update `KEY_HASH` in `index.html`, and send colleagues the new private profile. Old profiles stop passing the gate.
- **Change the profile schema:** update `PLACEHOLDER`, `CSV_ROWS` and `validateBOD` together, and ship matching private files, because `missingLeaves` locks out profiles that lack a new value.
- **Change the project file format:** bump the snapshot `v` and keep `restore()` backward compatible with older files and backups.
