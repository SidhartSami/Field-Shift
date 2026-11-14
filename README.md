# FieldShift
**Earth data. Local decisions.** A functional crop-rotation planning demonstrator for NASA Space Apps Challenge 06, *Field Shift: Adapting Farms with NASA Data*.

## Run
Requires Node 20+ for tests, Python 3 for the static server.

```sh
npm ci
npm test
npm start
```
Open http://localhost:8080. The app itself has no runtime JavaScript dependencies and requires no API key. Serve `dist/` on any static host. NASA retrieval needs internet access and API CORS availability; a real bundled NASA snapshot supports the default demonstration without that request. The Google Fonts enhancement is optional; system fonts work when unavailable.

## Complete workflow
1. Inspect authentic 2024 NASA POWER observations for Ludhiana, Punjab.
2. Enter soil, irrigation, current crops, farm size and priorities. Optional local NDVI adds context.
3. Compare the farmer's current sequence with three alternatives across four seasons.
4. Stress-test with 0–60% less rainfall and +0–5°C hypothetical warming.
5. Save in browser localStorage, download a reproducible JSON report (including raw NASA observations), or print a decision report.
6. Edit coordinates and explicitly retrieve NASA data; failed retrieval retains the previous observations and prevents exports for mismatched coordinates.

## Architecture
`dist/index.html` and `style.css`: accessible responsive dashboard; no build step.
`dist/app.js`: input handling, NASA fetch, state, visualizations and reports.
`dist/model.js`: pure, independently tested calculations.
`dist/data/power-ludhiana.json`: unmodified successful NASA API response retrieved 2026-11-14 for 2023–2024 at 30.9°N, 75.85°E.
`tests/`: model invariants and DOM integration checks.
`.openai/hosting.json`: static hosting configuration.

NASA query: https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR,GWETROOT&community=AG&longitude=75.85&latitude=30.9&start=2023&end=2024&format=JSON

## Scientific scope
The crop portfolio targets Punjab/Haryana summer–winter systems. NASA POWER meteorological fields are coarse MERRA-2 reanalysis, not field-resolution satellite retrievals. Wetness and optional NDVI are contextual only. Water, soil, protection and family diversity scores use explicit illustrative coefficients, documented in the app. They are neither calibrated predictions nor agronomic prescriptions. No yield, profit, disease incidence or measured soil improvement is claimed. Annual effective rainfall does not model timing; heat uses monthly means and misses extremes. The app deliberately labels these limitations.

See [brief mapping](docs/BRIEF.md), [methodology](docs/METHODOLOGY.md), and [demo and submission draft](docs/DEMO.md).

## Verification
`npm test` checks unit conversions, invalid-data rejection, rotation construction, monotonic scenario effects, and application DOM workflows. Managed browser tooling was unavailable during implementation: visual, real browser print and browser-specific CORS behavior remain unverified. Live upstream NASA access was verified from the execution environment.

## Privacy
Plans remain in the current browser unless exported. NASA requests send latitude/longitude to NASA; the app has no analytics or backend account database. Local storage is not a backup or multi-device sync. Hosting can apply its own sign-in/access controls.

## Attribution
Original project code: MIT license. NASA POWER data credited to the NASA Langley Research Center POWER Project, supported by NASA Earth Science. NASA and Space Apps names describe challenge context; no affiliation or endorsement is claimed. FAO/USDA references motivate principles; they do not validate this model. No third-party repository code or satellite imagery is incorporated. Field illustration is an original schematic SVG.
