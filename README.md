# Field Shift

**Every crop rotation fails sometimes. Field Shift tells you how often, in which years, and what to do when it does.**

**[field-shift-seven.vercel.app](https://field-shift-seven.vercel.app)** — live, no install, no API key.

A farmer in Sheikhupura plants rice every June because his father did. The water that made that decision correct is gone — the aquifer under the Pakistani Punjab has been falling for two decades, measured from orbit by GRACE-FO. Rice–wheat still covers four million hectares.

Field Shift replays every crop rotation a region allows through **34 years of NASA Earth observation**, and returns a number a farmer can act on:

> **Rice–wheat fits your water supply in 13 of the last 33 years.**
> The other 20 are 1991–2003, 2005, 2007, 2009, 2012, 2013, 2015, 2017.

Not a score out of 100. A failure rate with the failing years named, so it can be checked.

---

## The result

Punjab field, 900 mm annual water supply, 33 usable years (1991–2023), residue retained:

| Rotation | Water reliability | Irrigation need | Nitrogen | Downside margin | Family breaks | Soil loss |
|---|---|---|---|---|---|---|
| **Rice · Wheat** *(current practice)* | **39%** | 938 mm | −74 kg/ha/yr | 156k PKR | 0 | 0.39 t/ha/yr |
| **Cotton · Chickpea** *(recommended)* | **85%** | 703 mm | +9 kg/ha/yr | 160k PKR | 4 | 0.61 t/ha/yr |
| **Maize · Wheat** *(most reliable)* | **100%** | 524 mm | −121 kg/ha/yr | 146k PKR | 0 | 0.51 t/ha/yr |

One rotation beats current practice on **water, nitrogen and money at the same time** — 235 mm less irrigation a year, 83 kg more nitrogen a hectare, 4,000 PKR more downside margin.

**Maize–wheat is 100% reliable and we do not recommend it.** It mines 121 kg of nitrogen a hectare a year, worse than the rice–wheat it would replace. A tool that recommends the highest number is not a decision-support tool; it is a leaderboard. The recommendation rule is stated in the app and in the model card: prefer a rotation that wins on margin, nitrogen *and* reliability together — and when nothing does, say so instead of picking one.

Under **+1.9 °C and −6% rainfall** (IPCC AR6 SSP2-4.5, South Asia), rice–wheat falls from 39% to **27%** reliable. The recommended rotation falls from 85% to **79%**. The gap widens with the climate.

## Why a failure rate and not a score

A score out of 100 cannot be falsified. It goes up when things are good, and nobody can catch it being wrong — not the farmer, not a judge, not us.

A failure rate names years. Those years can be checked against the rainfall record, the soil-moisture record, the satellite archive. **If we are wrong, you will know exactly where.**

We ran that check on ourselves and published it:

- **5 of 5** of the driest years in the Punjab record are flagged as failures for rice–wheat.
- Years the model passes are **0.06 m³/m³ wetter** in the reanalysis root zone than years it fails.
- That is a directional consistency check on a reanalysis product, **not** an independent satellite validation — and the app says so in those words.

## How it works

Four steps, all of them inspectable.

**1. Reconstruct the field's history.** For each field, 12,419 days of NASA POWER (MERRA-2) drive a daily water balance: Penman-Monteith reference ET, FAO-56 crop coefficients, Saxton & Rawls water retention from real SoilGrids texture, effective rainfall, RUSLE erosion, a four-season nitrogen balance and a 20-year soil-carbon trajectory. 301 MODIS NDVI composites per field corroborate the canopy response.

**2. Enumerate every rotation the region allows.** 2,304 legal four-season sequences, collapsing to 1,176 distinct two-year cycles. Each is replayed through every usable year — **152,064 simulated seasons in about 45 ms**.

**3. Keep only what nothing else beats.** Non-dominated sorting over four objectives at once — reliability, nitrogen balance, downside margin, soil loss — leaves a 132-point Pareto frontier out of 1,176 distinct cycles. The shortlist is drawn from it.

**4. Answer the question the farmer asked.** The Decision brief gives the requirement strip year by year, the years it fails, the fallback trigger, and the trade-offs we would rather not admit.

The whole model is plain ES modules in `dist/engine/`. No dependencies, no build step, no API key, no server. It runs in the browser at 45 ms because it is arithmetic, not a service.

## What the farmer sees

**Field** — zero input. Pick a field and the profile is already there: soil texture, 34 years of record, a memory strip showing which years the monsoon failed, and a one-sentence thesis. NASA GIBS layers (MODIS true colour, SMAP soil moisture, IMERG rainfall, GRACE-FO water storage) with a caption explaining what each one is and is not.

**Rotation Lab** — the search. A Pareto plot over four objectives, a six-card shortlist with role labels ("most reliable", "best downside margin", "least water"), a supply curve showing the water supply at which each rotation becomes safe, and the 2050 stress test. It also takes a sentence: `irrigation 400, keep residue, drier by 30`.

**Decision** — the brief. 85% reliability, 28 of 33 years within budget, the requirement strip with the failing years in red, what to do in a failure year, the fallback trigger, and what would change our mind.

**Ledger** — the page most tools do not ship. The model validating itself: driest-year check, wetness delta, every prediction scored against what the satellites saw, and the scale panel.

## How this maps to Challenge #06

The challenge asks for a decision-support tool that uses NASA Earth observations and local agricultural information to help farmers select crop-rotation strategies. Point by point:

| Challenge objective | What we did |
|---|---|
| **1. Analyse environmental conditions** — rainfall, temperature, soil moisture, vegetation | Daily water balance from 12,419 days of MERRA-2; SMAP and IMERG as live map layers; 301 MODIS NDVI composites per field |
| **2. Combine agricultural data** — local soil, crop characteristics, farmer priorities | SoilGrids texture drives Saxton & Rawls retention; 20 crops with FAO-56 coefficients; the Lab exposes supply, residue, erosion practice and a 2050 scenario as farmer-set priorities |
| **3. Compare at least three rotations, including the farmer's existing one** | 2,304 sequences, not three. Current practice is always evaluated first and always shown as the baseline |
| **4. Identify suitable solutions** — soil health, water, erosion, pests | Four objectives scored per rotation: reliability, nitrogen balance, downside margin, RUSLE soil loss. Family breaks count the rotation's pest-cycle interruption |
| **5. Build the tool** — recommendations, benefits, risks, limitations | Four views plus a thirteen-section model card with eight published known errors |

The challenge's five "possible solutions to explore" are all present: a **smart crop rotation planner** (the Lab), **soil health monitoring** (SOC trajectory, RUSLE, NDVI), a **water management system** (the supply curve and requirement strip), an **interactive agricultural map** (five fields, five regions, NASA GIBS layers), and a **rotation comparison tool** (the Pareto frontier and the Decision brief).

### The ten questions the guide says we should understand

1. **What is crop rotation, and why does it matter for soil health?** Different crops draw different nutrients and root to different depths. Repeating one cereal depletes nitrogen, builds pathogen populations and leaves the surface bare between seasons. We score all three: nitrogen balance, family breaks, soil loss.
2. **How do changing temperatures and rainfall affect production?** Heat days raise crop water demand; irregular rainfall changes how much of it is effective. Both are in the daily balance, and the 2050 stress test shifts both at once.
3. **How can NASA data monitor soil moisture and vegetation?** SMAP L4 gives root-zone moisture directly; MODIS NDVI gives canopy response at 250 m every 16 days. We use SMAP and IMERG as map layers and NDVI as corroboration, not as model inputs — and we label which is which.
4. **Landsat vs SMAP vs GPM vs ECOSTRESS?** Landsat: 30 m optical, land cover and surface water. SMAP: 9–36 km passive microwave, soil moisture. GPM: precipitation, 0.1°, 30-minute. ECOSTRESS: 70 m thermal, evapotranspiration at field scale. We use SMAP, GPM and MODIS; ECOSTRESS's 70 m ET would be the right next input for field-level ET.
5. **How do farmers identify crops suited to their soil and climate?** By testing the crop against the actual record rather than a suitability class. Our answer is a failure rate per rotation, computed from this field's own 33 years.
6. **How do nitrogen-fixing crops improve fertility?** Legumes symbiotically fix atmospheric nitrogen. Chickpea in the recommended rotation moves the balance from −74 to +9 kg/ha/yr — the single largest swing in the table.
7. **How do cover crops reduce erosion and retain moisture?** Canopy and residue intercept raindrop energy and slow runoff. RUSLE's C factor captures it: retaining residue instead of burning it takes soil loss from 0.61 to 0.39 t/ha/yr in this calculation.
8. **How does rotation interrupt pest and disease cycles?** By breaking host continuity. We count **family breaks** across the four seasons — rice–wheat scores 0, cotton–chickpea scores 4. It is a proxy, and the model card says so.
9. **How do you combine satellite observations with local soil measurements?** SoilGrids 250 m gives texture, which Saxton & Rawls turns into available water capacity; the satellite record gives the weather that fills or drains it. Every field carries real texture (`fallback: false`), not a regional default.
10. **How does a tool compare at least three strategies?** By evaluating all of them against the same record and the same objectives, then showing the frontier rather than a winner. 2,304 candidates, 132 on the frontier, 7 on the shortlist.

## The data

| Product | What it gives us | Tag |
|---|---|---|
| **NASA POWER** (MERRA-2) | daily Tmax, Tmin, Tmean, precipitation, RH, wind, solar, root-zone wetness, 1991–2024 | `REANALYSIS` |
| **MODIS MOD13Q1** | 250 m, 16-day NDVI — 301 composites per field | `OBSERVED` |
| **SMAP L4** | root-zone soil moisture | `OBSERVED` |
| **GPM IMERG** | satellite precipitation | `OBSERVED` |
| **GRACE-FO** | terrestrial water storage anomaly | `OBSERVED` |
| **ISRIC SoilGrids 250 m** | clay, sand, silt, SOC, pH, bulk density | `OBSERVED` |

Every figure in the app carries one of three tags — `OBSERVED`, `REANALYSIS`, `SIMULATED`. Nothing modelled is ever presented as measured.

Five fields, five regions: Punjab (Pakistan), Iowa (USA), Nakuru (Kenya), Nagpur (India), Can Tho (Vietnam). The model is region-agnostic; the region pack supplies seasons, crop set, margins and currency.

## Scale

235 mm less irrigation per hectare per year. If 10% of the 4.2 million hectares in this cropping system shifted to the recommended rotation, modelled irrigation demand falls by **0.99 km³ per year**.

That is arithmetic on our own model output, not a measured saving, and the app labels it that way. But the direction is not in doubt: the rotation that survives the century is not the one that maximises this year's margin.

## Known limitations

The full list of eight is in the model card. The three that matter most:

- **MERRA-2 under-reports Punjab monsoon rainfall.** Station climatology is around 600 mm; the reanalysis gives 477 mm. The irrigation requirement is therefore an upper bound, which makes reliability a conservative estimate.
- **Gross margins are regional defaults, not this farm's books.** They are a P10/P50/P90 band precisely because a point estimate would be a lie, and every margin number is editable.
- **No pest or disease dynamics.** We count family breaks as a proxy for rotation benefit. We do not model pathogen populations.

A tool that will not tell you where it is weak is not a tool. It is marketing.

## Run it

Requires Node 20+. No build step, no bundler, no API key. The static server is `scripts/serve.mjs`, so Python is not needed.

```sh
npm install
npm test
npm start          # http://localhost:8080
```

`dist/` is a static site. Serve it from anything.

| Path | What it is |
|---|---|
| `/` | the landing page — why a failure rate, what we built, what it found |
| `/app.html` | the tool — Field, Rotation Lab, Decision, Ledger |
| `/model.html` | the model card — equations, data, eight known errors |
| `/pitch.html` | the seven-slide scroll deck |

### Type

Two self-hosted families, no external font request. **Instrument Sans** carries the interface and every
figure — its tabular numerals keep the year columns aligned without a second mono face. **Space Grotesk**
is the display face, used only for the large headline numbers on the landing page. Both are variable
woff2 files under `dist/assets/fonts/` and are preloaded on the landing page.

### Voice input

The Describe panel accepts typed or spoken English and Urdu. Streaming speech-to-text uses Deepgram
nova-3 over WebSocket when `DEEPGRAM_API_KEY` is set in the environment; without it the app falls back
to the browser's own `SpeechRecognition`, so the feature degrades rather than breaks.

## Architecture

```
dist/
  index.html          the landing page — the argument, eight sections
  app.html            the tool: Field, Rotation Lab, Decision, Ledger
  app.js              state, routing, rendering
  app.css             stylesheet
  model.html          the model card — equations, data, eight known errors
  pitch.html          seven-slide scroll deck
  engine/             the model. No dependencies, no build step.
    crops.js          20 crops: FAO-56 Kcb, stages, rooting depth, p, heat, N fixation
    regions.js        5 region packs: seasons, crop sets, margins, currency
    eto.js            Penman-Monteith reference ET
    soil.js           Saxton & Rawls water retention from texture
    context.js        per-field precomputation: ET0, effective rainfall, erosivity
    season.js         one season, one crop, one year: daily water balance
    erosion.js        RUSLE
    nitrogen.js       four-season N balance and 20-year SOC trajectory
    evaluate.js       rotation evaluation, two tiers
    pareto.js         non-dominated sorting over four objectives
    search.js         enumeration, canonicalisation, the search
  voice-live.js       natural-language field parser (English + Urdu)
  field-map.js        polygon area helpers and the Leaflet boundary layer
  pcm-worklet.js      audio worklet for the streaming path
  ui/
    charts.js         memory strip, Pareto plot, supply curve, requirement strip
    format.js         every user-facing number goes through here
    describe.js       maps parsed facts onto the Rotation Lab controls
  assets/shots/       four real captures of app.html, used by the landing page
  data/fields/        5 field bundles, 1991–2024 daily NASA POWER + SoilGrids
  vendor/leaflet/     Leaflet 1.9.4
pipeline/
  fetch_fields.py     rebuilds data/fields from NASA POWER, MODIS, SoilGrids
scripts/serve.mjs     Node static server, serves /runtime-config.js from .env
tests/                129 tests
```

## Describe it

The Rotation Lab takes a sentence as well as a slider:

```
irrigation 400, keep residue, drier by 30
```

`dist/voice-live.js` parses it — English or Urdu, Eastern digits, phrasing like "irrigation would be 800" or "not Lahore but Islamabad" — and `dist/ui/describe.js` maps the facts that apply onto the Lab controls. Facts the Lab cannot act on are named in the readout rather than dropped: *"Not used here: soil texture, field area, location."* The streaming voice path is in the tree and tested but not mounted; see [`docs/MERGE.md`](docs/MERGE.md).

## Tests

```sh
npm test
```

**129 tests, about 700 ms.** They are property tests, not golden numbers — a golden number breaks every time a coefficient is corrected, a property survives refactoring and still catches the failures that matter.

- `tests/data.test.js` — bundle integrity, provenance, no fill values, the 1999 drought is really in the record
- `tests/engine.test.js` — crop parameters, soil hydraulics inside physical bounds, ET0 never negative, effective rainfall never exceeds gross rainfall, legumes improve nitrogen
- `tests/search.test.js` — 2,304 candidates, 1,176 distinct, frontier verified against brute force in both directions
- `tests/evaluate.test.js` — reliability is exactly the share of years that fit, monotonic in supply, the validation claim holds, the detail tier never applies more water than the farmer has
- `tests/format.test.js` — missing data renders as an em dash, never as zero
- `tests/claims.test.js` — recomputes every number in the pitch deck and the model card from the engine, then checks the same number appears in the shipped HTML
- `tests/landing.test.js` — the same for the landing page, plus the `index`/`app` split
- `tests/describe.test.js` — the natural-language mapping: clamping, both directions of residue, stress-test triggering, ignored facts named
- `tests/voice-live.test.js` — the parser, English and Urdu

The claims tests are the ones that keep us honest. If a coefficient changes, they fail and name the sentence that needs rewriting.

## Rebuilding the data

```sh
python pipeline/fetch_fields.py
```

Pulls NASA POWER daily 1991–2024, MODIS NDVI and SoilGrids for each field in `pipeline/fetch_fields.py`, writes `data/fields/*.json`, and copies to `dist/data/fields/`. Takes a while — the NDVI step reads 301 COG composites per field.

## Provenance

NASA and Space Apps names describe challenge context. No affiliation or endorsement is claimed.

Model card: [`dist/model.html`](dist/model.html). Pitch deck: [`dist/pitch.html`](dist/pitch.html). Landing page notes: [`docs/LANDING.md`](docs/LANDING.md). Branch reconciliation: [`docs/MERGE.md`](docs/MERGE.md). Strategy notes: [`docs/REVAMP.md`](docs/REVAMP.md). Submission copy: [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

Source: [SidhartSami/Field-Shift](https://github.com/SidhartSami/Field-Shift).
