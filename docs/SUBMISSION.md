# Submission copy

Copy-paste ready for the Space Apps submission form. Field limits noted where they apply.

---

## Project name

**Field Shift — Every crop rotation fails sometimes**

## Elevator pitch (one sentence)

Field Shift replays every crop rotation a region allows through 34 years of NASA Earth observation and tells a farmer how often their rotation fails, in which years, and what to do when it does.

## Short description (under 100 words)

A farmer in Punjab plants rice every June because his father did. The water that made that decision correct is gone. Field Shift does not score rotations out of 100 — a score cannot be wrong, so nobody can trust it. Instead it replays 2,304 rotation sequences through 33 years of NASA data and reports a failure rate that names its years. For rice–wheat at a 900 mm water supply: 39% reliable, 20 failing years. For cotton–chickpea: 85%. The tool states its recommendation rule out loud, and says so when no rotation wins.

## Full description

### The problem

Crop rotation decisions are made on inheritance and habit, not on evidence. In the Pakistani Punjab, rice–wheat covers four million hectares and the aquifer beneath it has been falling for two decades — measured from orbit by GRACE-FO. A farmer deciding what to plant next season has regional climate projections and no way to connect them to his own field, his own water supply, his own soil.

The tools that exist return a score. A score out of 100 goes up when things are good. It cannot be falsified, so it cannot be trusted — not by the farmer, not by an adviser, not by a judge.

### What we built

Field Shift replaces the score with a failure rate.

For a given field and a given annual water supply, the model replays every rotation the region's two seasons allow through every year NASA has data for. Each season is a daily FAO-56 water balance: reference evapotranspiration from Penman-Monteith, crop coefficients by growth stage, soil water holding capacity from Saxton & Rawls, effective rainfall by the USDA-SCS method. A year fails when the rotation's total irrigation requirement exceeds the water the farmer can deliver.

Punjab field, 900 mm supply, 33 usable years:

| Rotation | Reliability | Irrigation need | Nitrogen | Downside margin |
|---|---|---|---|---|
| Rice · Wheat · Rice · Wheat *(current)* | 39% | 938 mm | −74 kg/ha/yr | 156k PKR |
| Cotton · Chickpea · Cotton · Chickpea *(recommended)* | 85% | 703 mm | +9 kg/ha/yr | 160k PKR |
| Maize · Wheat · Maize · Wheat *(most reliable)* | 100% | 524 mm | −121 kg/ha/yr | 146k PKR |

Rice–wheat fits the budget in 13 of 33 years. The other 20 it runs short.

Maize–wheat is fully reliable and we do not recommend it: it mines 121 kg of nitrogen a hectare a year, worse than the rice–wheat it would replace. The recommendation rule is stated in the app and in the model card — prefer a rotation that beats current practice on margin, nitrogen and reliability at the same time; when nothing does, fall back to the most reliable option and say so.

### Why NASA data is load-bearing, not decorative

The failure rate is only meaningful because the record is long. Thirty-three years is what lets us say "20 failing years" instead of "risky." No commercial agronomy product has that record; NASA does.

- **NASA POWER (MERRA-2 reanalysis)** — daily Tmax, Tmin, precipitation, humidity, wind, solar radiation and root-zone wetness, 1991–2024, 12,419 days per field. This drives the water balance.
- **MODIS MOD13Q1** — 250 m 16-day NDVI, for observed canopy response.
- **SMAP L4** — root-zone soil moisture, rendered as a live map layer so the reanalysis the model runs on can be compared against a satellite retrieval.
- **GPM IMERG** — satellite precipitation, rendered as a live map layer alongside the reanalysis.
- **GRACE-FO** — terrestrial water storage anomaly, rendered as a live map layer. It is the evidence that the aquifer trend makes the current rotation untenable.
- **SoilGrids 250 m** — clay, sand, silt, organic carbon, pH, bulk density.

Every figure in the app carries one of three tags: `OBSERVED`, `REANALYSIS` or `SIMULATED`. Nothing modelled is presented as measured.

### We tested our own model and published the result

All five of the driest years in the Punjab record — 1999 (184 mm), 1998 (186), 1991 (219), 1997 (233), 2000 (237) — are flagged as failures for rice–wheat. Years the model passes are 0.06 m³/m³ wetter in the reanalysis root-zone record than years it fails.

That is a directional consistency check on a reanalysis product, not an independent satellite validation, and the app says so in those words. The model card lists eight things we know are wrong, including that MERRA-2 under-reports Punjab monsoon rainfall (477 mm modelled against ~600 mm station climatology), which makes our irrigation requirement an upper bound and our reliability a conservative estimate.

### The 2050 stress test

Under the IPCC AR6 SSP2-4.5 South Asia delta (+1.9 °C, −6% rainfall), rice–wheat falls from 39% to 27% reliable. The recommended rotation falls from 85% to 79%. The gap widens. This is a sensitivity test, not a forecast, and it is labelled `SIMULATED`.

### Scale

If 10% of the 4.2 million hectares in this cropping system shifted to the recommended rotation, modelled irrigation demand falls by 0.99 km³ per year. That is arithmetic on our own model output, not a measured saving, and the app labels it that way.

### What is in the submission

A landing page that makes the argument before it shows a form, and a working static web application with no build step and no API key. Four views: Field (zero-input profile and a 34-year memory strip), Rotation Lab (2,304 sequences, Pareto frontier, supply curve, 2050 banner), Decision (the brief, the requirement strip, the fallback trigger), Ledger (the model validating itself). A thirteen-section model card with equations, citations, known errors and a direct answer to each of the ten questions the challenge guide asks a team to understand. A seven-slide pitch deck. One hundred and twelve tests, including one that recomputes every number in the pitch deck from the engine and one that does the same for the landing page, so neither can drift from the model.

### What we would do next

A verification ledger that scores every prediction we make against the next satellite pass, in public. Five regions are live today — Punjab, Iowa, Nakuru, Nagpur, Can Tho — and the model is region-agnostic. The next step is an agronomist-reviewed pilot with metered water records, because a failure rate is only as good as the years it is checked against.

## Tags

`agriculture` `crop-rotation` `water` `food-security` `climate-adaptation` `decision-support` `NASA-POWER` `MODIS` `SMAP` `GPM` `GRACE-FO` `SoilGrids` `open-data` `open-source`

## Links

- **Live demo:** serve `dist/` — `npm start`, then http://localhost:8080 (the landing page is the root; the tool is at `/app.html`)
- **Source:** https://github.com/SidhartSami/Field-Shift
- **Model card:** `dist/model.html`
- **Pitch deck:** `dist/pitch.html`

## Attribution

NASA POWER, MODIS MOD13Q1 (LP DAAC), SMAP, GPM IMERG, GRACE-FO and ISRIC SoilGrids are credited in the app, the model card and the README. NASA and Space Apps names describe challenge context; no affiliation or endorsement is claimed. Leaflet is BSD-2-Clause and its attribution is retained.

---

## Judge-facing notes

Three things worth saying out loud in a demo, in this order:

1. **"39% of 33 years."** Not a score. A count of years, with the years named. Ask them to check 1999.
2. **"We do not recommend the most reliable rotation."** Maize–wheat is 100% reliable and mines nitrogen. The rule is stated, and it can fail to find a winner.
3. **"Here is what we know is wrong."** Open the model card, section 10. Eight items. A tool that will not tell you where it is weak is not a tool.

The question we expect and the answer: *"Isn't this just a water balance?"* No — a water balance gives you a number for one rotation. The product is the search over 2,304 rotations and the Pareto frontier that comes out of it, plus the failure years that make the number checkable. The water balance is the engine; the frontier is the product.
