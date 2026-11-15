# Field Shift

**Every crop rotation fails sometimes. Field Shift tells you how often, in which years, and what to do when it does.**

A decision-support tool for crop rotation, built on 34 years of NASA Earth observation. It does not score rotations out of 100. It replays every rotation a region allows through every year on record and reports the share of years the rotation's irrigation requirement fits inside the water the farmer can actually supply.

That number can be wrong, and it names the years it was wrong in. That is the point.

---

## The claim, in one table

Punjab field, 900 mm annual water supply, 33 usable years (1991–2023):

| Rotation | Water reliability | Irrigation need | Nitrogen balance | Downside margin | Family breaks |
|---|---|---|---|---|---|
| Rice · Wheat · Rice · Wheat *(current practice)* | **39%** | 938 mm | −74 kg/ha/yr | 156k PKR | 0 |
| Cotton · Chickpea · Cotton · Chickpea *(recommended)* | **85%** | 703 mm | +9 kg/ha/yr | 160k PKR | 4 |
| Maize · Wheat · Maize · Wheat *(most reliable)* | **100%** | 524 mm | −121 kg/ha/yr | 146k PKR | 0 |

Rice–wheat fits the budget in 13 of 33 years. The other 20 it runs short.

Maize–wheat is fully reliable and we **do not recommend it**: it mines 121 kg of nitrogen a hectare a year, worse than the rice–wheat it would replace. The recommendation rule is stated in the app and in the model card — prefer a rotation that beats current practice on margin, nitrogen *and* reliability at the same time; when nothing does, fall back to the most reliable option and say so.

## Why a failure rate and not a score

A score out of 100 cannot be falsified. It goes up when things are good, and no one can catch it being wrong — not the farmer, not a judge, not us. A failure rate names years: 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2005, 2007, 2009, 2012, 2013, 2015, 2017. Those years can be checked against the rainfall record, the soil-moisture record, the satellite archive.

We ran that check. All five of the driest years in the Punjab record are flagged as failures for rice–wheat, and years the model passes are 0.06 m³/m³ wetter in the reanalysis root-zone record than years it fails. That is a directional consistency check on a reanalysis product, not an independent satellite validation, and the app says so in those words.

## What is in the box

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
  voice-live.js       natural-language field parser (English + Urdu), from the voice branch
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

## Run

Requires Node 20+. No build step, no bundler, no API key. The static server is
`scripts/serve.mjs`, so Python is not needed.

```sh
npm install
npm test
npm start          # http://localhost:8080
```

`dist/` is a static site. Serve it from anything.

| Path | What it is |
|------|------------|
| `/` | the landing page — why a failure rate, what we built, what it found |
| `/app.html` | the tool — Field, Rotation Lab, Decision, Ledger |
| `/model.html` | the model card — equations, data, eight known errors |
| `/pitch.html` | the seven-slide scroll deck |

The landing page is documented in [`docs/LANDING.md`](docs/LANDING.md). How the
two branches were reconciled is in [`docs/MERGE.md`](docs/MERGE.md).

## Describe it

The Rotation Lab takes a sentence as well as a slider:

```
irrigation 400, keep residue, drier by 30
```

`dist/voice-live.js` parses it — English or Urdu, Eastern digits, phrasing like
"irrigation would be 800" — and `dist/ui/describe.js` maps the facts that apply
onto the Lab controls. Facts the Lab cannot act on are named in the readout
rather than dropped. The streaming voice path is in the tree and tested but not
mounted; see `docs/MERGE.md`.

## The four views

**Field** — pick one of five fields on five continents. Zero input required: the profile, the thesis sentence and the Field Memory strip are computed on load. The map shows NASA GIBS layers (MODIS true colour, SMAP soil moisture, IMERG rainfall, GRACE-FO water storage) with a caption explaining what each one is and is not.

**Rotation Lab** — 2,304 candidate sequences, 1,176 distinct two-year cycles, 152,064 simulated seasons, searched in about 45 ms. A Pareto plot over four objectives, a six-card shortlist with role labels, a supply curve showing where each rotation becomes reliable, and a 2050 stress test under the IPCC AR6 SSP2-4.5 South Asia delta (+1.9 °C, −6% rainfall).

**Decision** — the brief. Requirement strip showing which years cross the supply line, the fallback trigger, the prediction, and a sensitivity table.

**Ledger** — the model validating itself. Backtests, the driest-year check, the wetness delta, and the scale panel.

## Data

| Product | What it gives us | Tag |
|---|---|---|
| NASA POWER (MERRA-2) | daily Tmax, Tmin, Tmean, precipitation, RH, wind, solar, root-zone wetness, 1991–2024 | `REANALYSIS` |
| MODIS MOD13Q1 | 250 m 16-day NDVI | `OBSERVED` |
| SMAP L4 | root-zone soil moisture | `OBSERVED` |
| GPM IMERG | satellite precipitation | `OBSERVED` |
| GRACE-FO | terrestrial water storage anomaly | `OBSERVED` |
| SoilGrids 250 m | clay, sand, silt, SOC, pH, bulk density | `OBSERVED` |

Every figure in the app carries one of three tags: `OBSERVED`, `REANALYSIS` or `SIMULATED`. Nothing is presented as measured when it is modelled.

## Known limitations

The full list of eight is in the model card. The three that matter most:

- **MERRA-2 under-reports Punjab monsoon rainfall.** Station climatology is around 600 mm; the reanalysis gives 477 mm. The irrigation requirement is therefore an upper bound, which makes reliability a conservative estimate.
- **Gross margins are regional defaults, not this farm's books.** They are a P10/P50/P90 band precisely because a point estimate would be a lie, and every margin number is editable.
- **No pest or disease dynamics.** We count family breaks as a proxy for rotation benefit. We do not model pathogen populations.

## Tests

```sh
npm test
```

98 tests, about 640 ms. They are property tests, not golden numbers — a golden number breaks every time a coefficient is corrected, a property survives refactoring and still catches the failures that matter.

- `tests/data.test.js` — bundle integrity, provenance, no fill values, the 1999 drought is really in the record
- `tests/engine.test.js` — crop parameters, soil hydraulics inside physical bounds, ET0 never negative, effective rainfall never exceeds gross rainfall, legumes improve nitrogen
- `tests/search.test.js` — 2,304 candidates, 1,176 distinct, frontier verified against brute force in both directions
- `tests/evaluate.test.js` — reliability is exactly the share of years that fit, monotonic in supply, the validation claim holds, the detail tier never applies more water than the farmer has
- `tests/format.test.js` — missing data renders as an em dash, never as zero
- `tests/claims.test.js` — recomputes every number in the pitch deck and the model card from the engine, then checks the same number appears in the shipped HTML

That last file is the one that keeps the deck honest. If a coefficient changes, it fails and names the sentence that needs rewriting.

## Rebuilding the data

```sh
python pipeline/fetch_fields.py
```

Pulls NASA POWER daily 1991–2024, MODIS NDVI and SoilGrids for each field in `pipeline/fetch_fields.py`, writes `data/fields/*.json`, and copies to `dist/data/fields/`. Takes a while — the NDVI step reads 301 COG composites per field.

## Provenance

NASA and Space Apps names describe challenge context. No affiliation or endorsement is claimed.

Model card: [`dist/model.html`](dist/model.html). Pitch deck: [`dist/pitch.html`](dist/pitch.html). Strategy notes: [`docs/REVAMP.md`](docs/REVAMP.md). Submission copy: [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

Source: [SidhartSami/Field-Shift](https://github.com/SidhartSami/Field-Shift).
