# Field intelligence map
## What is implemented
A self-hosted Leaflet 1.9.4 map (BSD-2-Clause) with Esri World Imagery, OpenStreetMap and data-only basemaps. Keyboard pan/zoom, selectable native-grid rectangles, field pins, geographic place labels, regional min/max annotations, layer opacity, year/annual/monthly controls, user-triggered month playback, and GeoJSON exports. The inspector and regional data table provide an accessible alternative to pointer interaction.

## Authentic NASA data
`dist/data/power-pakistan-region.json` retains three original NASA POWER monthly regional responses, exact URLs and retrieval timestamp. The regional service permits one parameter per request, so T2M, PRECTOTCORR and GWETROOT were fetched separately and joined by identical grid-center coordinates. All 90 centers are present in each response. Missing parameters, mismatched coordinates and fill values are rejected. The selected period spans 2023–2024; these are historical records, not real-time weather.

Requested bounds: latitude 29–33.5°, longitude 70–75°. The returned 10 × 9 cell centers span 29–33.5°N and 70–75°E. Displayed rectangles approximate the native MERRA-2 meteorological footprint (±0.25° latitude, ±0.3125° longitude). They are not field polygons, cadastral boundaries or downscaled field observations. No spatial interpolation is used to manufacture fine detail.

Rainfall: monthly mean mm/day × actual calendar-month days, with annual view summing 12 months. Temperature and wetness: individual monthly means, or an unweighted mean of the 12 monthly means. Geographic place labels are reference locations, not NASA measurements. Approximate grid elevations are retained from the API geometry; mountainous cells are explicitly flagged because the crop portfolio targets plains agriculture and does not model elevation.

## Derived layer
Water-gap overlay applies the active field's soil, irrigation, residue, current crops and selected rotation to each cell's annual climate. It always uses annual aggregation, and it is marked MODEL in the UI. It does not map measured water shortages, crop suitability or drought probabilities. Invalid field inputs or unmatched observations pause this layer. Rainfall, temperature and wetness layers always display NASA observations, independent of the stress-test sliders.

## Planner connection and export
A location is a probe until the user selects “Use location in planner.” This changes active field coordinates and triggers a NASA point API fetch. The existing mismatch guard continues to prevent decisions using old-location observations. Saved decisions and JSON reports include map exploration metadata when the map was used. GeoJSON exports contain closed geographic polygons, values, units, period, exact source requests, retrieval date, and model assumptions for the derived layer.

## Basemaps, availability and privacy
Imagery is visual context with variable/unspecified capture dates; NASA overlay dates do not date the Esri imagery. The app shows source attribution on the map. Map-tile requests reveal the viewed map area and IP to Esri or OpenStreetMap. Data-only mode makes no new basemap tile requests; tiles already requested cannot be recalled. No API key is embedded. No bulk tile downloads or offline tile cache are implemented. If basemap tiles fail, the NASA overlays and data table remain available. If Leaflet cannot initialize, the selector/table and planner handoff still work. Regional overlay failure exposes a retry, without substituting synthetic values.

## Verification
Automated tests run the actual vendored Leaflet library in JSDOM and verify grid paths, field markers, click inspection, layer toggles and basemap switching. Other checks cover geographic bounds, NASA joins, unit conversions, GeoJSON rings/metadata, month/year inspection, failed data, invalid model contexts and map-to-planner retrieval. One tile from each basemap provider returned HTTP 200 with an image content type during verification. Visual browser, touch-device and real browser CORS checks remain unverified because the managed browser tooling is unavailable.
