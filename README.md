# FasalPath
**A clearer case for your next crop rotation.** FasalPath helps a Pakistani farmer compare a proposed crop switch against current practice, identify water or cost blockers, and keep an evidence-backed option for local review. It is a decision-support prototype, not a validated planting prescription.

The interface is English-only. Urdu speech-to-text remains available as optional input. Save a field location once through **+ Add field**; later changes use **Edit location**. Daily planning reuses the saved location automatically.

[What we do](docs/PRODUCT.md) · [Urdu STT](docs/STT.md) · [Positioning](docs/POSITIONING.md) · [Claims](docs/CLAIMS.md) · [Submission copy](docs/SUBMISSION.md) · [Proposed pilot](docs/PILOT.md).

Brand: **FasalPath — A clearer next season.** See [brand colours and visual assets](docs/BRAND.md). Source repository: [SidhartSami/Field-Shift](https://github.com/SidhartSami/Field-Shift) (private).

## Run
Requires Node 20+ for tests, Python 3 for the static server.

```sh
npm ci --ignore-scripts
npm test
npm start
```
Open http://localhost:8080. The application, vendored Leaflet map library and lazy-loaded eSpeak NG read-aloud engine are served locally and require no API key. Serve `dist/` on any static host. NASA retrieval needs internet access and API CORS availability; a real bundled NASA snapshot supports the default demonstration without that request. The Google Fonts enhancement is optional; system fonts work when unavailable.

## Workspace workflow
1. Open the crop-switch planner. Use + Add field to save a field and location together, then switch between independent drafts. Location inputs appear only in field setup/edit; daily planning does not ask again.
2. Enter soil, irrigation, current crops, area and priorities. A new or edited location is saved only after matching NASA observations load successfully.
3. Select among the baseline and three alternatives in the comparison table. Customize a selected four-season sequence to add a fifth strategy with season-appropriate crop choices.
4. Apply dry or hot/dry presets, move scenario sliders, change ranking order and inspect the timeline and model trade-offs.
5. Save a named decision with notes. Search saved decisions, reopen a snapshot, export its evidence or remove it with undo.
6. Inspect 2023 or 2024 observations, choose a month and read actual rainfall, temperature and wetness values.
7. Open **Field intelligence** to inspect regional rainfall, temperature, wetness and modelled water-gap overlays. Select a cell, change the period, or use a map location in the planner. Export the overlay as GeoJSON.
8. Use the action search (Ctrl/Cmd+K), switch light/dark appearance, export the current draft or print the report.

9. Open the optional dictation section to **dictate Urdu into editable text** using local open-source Whisper, an audio file, or an explicitly selected Urdu browser service. Review before using it as a question or planning note. Urdu stays the recognition language under English UI. Optional read-aloud is separate.
10. Enter local costs to screen a first-year switch. Fields are blank until supplied; the output is an assumption-based calculation, not a profit forecast.

Field drafts and named decisions persist separately in `fieldshift-workspace-v2`. Existing v1 plans migrate to a field draft. This is a browser-local system, not a shared multi-user database. Exported JSON includes the raw NASA evidence; this version does not import external files.

## Architecture
`dist/index.html` and `style.css`: responsive application shell and planning views; no build step.
`dist/app.js`: field/decision lifecycle, routing, theme, action search, NASA fetch, state, visualizations and reports.
`dist/assets/`: original logo/favicon and schematic field illustration.
`dist/icons.js`: curated Lucide navigation icons and original crop SVG illustrations.
`dist/visuals.js`: shared-scale water-budget graphic.
`dist/model.js` and `outcomes.js`: agronomic comparison proxies, outcome differences and the optional first-year cost screen.
`dist/decision-brief.js`: concrete next-step gates and crop-sequence-specific, self-reported local checks. The removed interface language selector is no longer loaded.
`dist/stt.js`, `stt-worker.js` and `stt-audio.js`: Urdu capture, local Whisper transcription, audio preprocessing and confirmation.
`dist/voice.js`, `voice-summary.js` and `speech-worker.js`: deterministic explanations, optional recognition and local speech generation.
`dist/pitch.html`: standalone English outcome-first presentation; build with `node scripts/example-outcomes.mjs --write` then `node scripts/build-pitch.mjs`.
`dist/geo.js` and `geo-data.js`: map interface, NASA regional data joins and derived overlays.
`dist/data/power-pakistan-region.json`: original NASA responses for 90 regional cells and exact request lineage.
`dist/vendor/leaflet/`: Leaflet 1.9.4, its stylesheet/assets and BSD-2-Clause license.
`dist/data/power-lahore.json`: unmodified successful NASA API response retrieved 2026-11-14 for 2023–2024 at 31.5204°N, 74.3587°E.
`tests/`: model invariants and DOM integration checks.
`.openai/hosting.json`: static hosting configuration.

NASA query: https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR,GWETROOT&community=AG&longitude=74.3587&latitude=31.5204&start=2023&end=2024&format=JSON

## Scientific scope
The crop portfolio is an unvalidated example for summer–winter systems in the irrigated plains of Punjab, Pakistan. NASA POWER meteorological fields are coarse MERRA-2 reanalysis, not field-resolution satellite retrievals. Wetness and optional NDVI are contextual only. Water, soil, protection and family diversity scores use explicit illustrative coefficients, documented in the app. They are neither calibrated predictions nor agronomic prescriptions. No yield, profit, disease incidence or measured soil improvement is claimed. Annual effective rainfall does not model timing; heat uses monthly means and misses extremes. The app deliberately labels these limitations.

See [brief mapping](docs/BRIEF.md), [methodology](docs/METHODOLOGY.md), [demo and submission draft](docs/DEMO.md), and [map documentation](docs/MAP.md).

## Verification
`npm test` checks unit conversions, invalid-data rejection, rotation construction, monotonic scenario effects, and application DOM workflows. Managed browser tooling was unavailable during implementation: visual, real browser print and browser-specific CORS behavior remain unverified. Live upstream NASA access and one image tile from each basemap provider were verified from the execution environment. Map tests execute the actual vendored Leaflet library in JSDOM; this does not constitute visual browser QA.

## Privacy
Plans remain in the current browser unless exported. NASA requests send latitude/longitude to NASA; map tile providers receive the viewed map area and visitor IP; read-aloud text stays in a local worker, while optional browser speech recognition may send microphone audio to its provider; the app has no analytics or backend account database. Local storage is not a backup or multi-device sync. Hosting can apply its own sign-in/access controls.

## Design references
The redesign uses [Watermelon UI](https://ui.watermelon.sh/) Gridline workspace patterns as a reference and applies [Emil Kowalski’s design-engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md). See [design decisions](docs/DESIGN.md). UI source is original; no React source was copied.

## Attribution
Original project code: MIT license. NASA POWER data credited to the NASA Langley Research Center POWER Project, supported by NASA Earth Science. NASA and Space Apps names describe challenge context; no affiliation or endorsement is claimed. FAO/USDA references motivate principles; they do not validate this model. Leaflet 1.9.4 is bundled under its BSD-2-Clause license, retained in `dist/vendor/leaflet/LICENSE`. Satellite basemap tiles are provided by Esri (Esri, Maxar, Earthstar Geographics and GIS User Community); street tiles by OpenStreetMap contributors, with attribution displayed on the map. Imagery is contextual and is not used to calculate recommendations.

The bundled eSpeak NG engine is GPL-3.0, with its COPYING notice, package provenance and upstream source snapshot included. See [speech documentation](docs/SPEECH.md). Original application code retains the repository MIT notice; preserve all third-party notices and source materials when redistributing.

Transformers.js 3.8.1 is vendored with its Apache-2.0 license. Public Whisper model files and ONNX runtime load on demand; local base-model first use is about 100 MB. The browser application needs no native GPU install; `npm ci --ignore-scripts` skips optional native dependency installers. To verify actual STT model inference on the bundled Node CPU runtime, run `node --use-env-proxy scripts/verify-urdu-stt.mjs`; see [verification limits](docs/STT.md).

Saved review briefs include local-check status scoped to the field and crop sequence. These checks are self-reported and do not confer planting approval. See [product workflow](docs/PRODUCT.md).

Branding preserves `fieldshift-workspace-v2` and existing browser storage keys for continuity. The application is now FasalPath; the repository name remains Field-Shift.
