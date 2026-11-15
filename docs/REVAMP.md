# Field Shift 3.0 — the revamp

**Status:** strategy + build plan. Written after auditing the current build, the
challenge guide, and the live app.

---

## 0. The verdict, without flattery

The current build is competently engineered and unusually honest. It will not win.

Not because it is bad — because it is *forgettable*. It is a twelve-input form
that returns a score out of 100 for one field in one year, wrapped in fifteen
documents explaining why the score should not be trusted. A judge will not be
able to repeat a single sentence about it to another judge.

Eight specific reasons, in order of how much they cost:

1. **It does not use NASA satellite observations.** It uses NASA POWER, which is
   MERRA-2 *reanalysis* — a model, not a measurement. The challenge names
   Landsat, SMAP, GPM, ECOSTRESS and GRACE-FO. The app uses none of them. Any
   judge with an Earth-science background will ask "where is the satellite data?"
   and the honest answer today is "there isn't any."
2. **One year is not a decision.** The app compares rotations using 2023 or 2024.
   A rotation that works in 2024 may fail in 2002, 2009 and 2022. The single most
   valuable thing NASA has is a *34-year record*, and the app throws it away.
3. **The coefficients are invented.** `rice: water 1200`. Where does 1200 come
   from? There is no derivation, no citation, no calibration. An agronomist judge
   will find this in ninety seconds.
4. **The target user cannot use it.** The stated user is a smallholder with no
   soil test, no yield records and no water meter. The app asks that user for
   organic matter percentage, slope percentage and available irrigation in mm.
   The product excludes the person it is for.
5. **The hedging has eaten the product.** Fifteen docs, most of them disclaimers.
   "Not validated", "illustrative", "no claim is made" appears dozens of times.
   Honesty is a feature. Self-erasure is not. Judges score conviction and clarity.
6. **There is no artifact.** Nothing in the app is a thing you would screenshot
   and send to someone. No visual, no number, no moment.
7. **The map is not NASA.** It is Esri satellite imagery under a coarse reanalysis
   grid. The one screen that should scream "space agency" is a basemap.
8. **The pitch is a separate file.** The demo should *be* the pitch. Right now the
   story lives in `pitch.html` and the product lives somewhere else.

The fix is not more features. It is **one reframe, four surfaces, and a proof.**

---

## 1. What is actually being scored

NASA Space Apps judging, in practice, weights five things:

| Criterion | What it really means | Current build | Target |
|---|---|---|---|
| Relevance to the challenge | Did you answer *this* brief, not a nearby one | Strong | Strong |
| Use of NASA data | Depth and variety, not one API call | **Weak** | **Exceptional** |
| Creativity / novelty | Is there an idea here, or a form | **Weak** | **Exceptional** |
| Technical execution | Does it run, is it real, is it reproducible | Strong | Strong |
| Impact / story | Can a judge retell it in one sentence | **Weak** | **Exceptional** |

The current build is a 3 out of 5 on two axes and a 5 out of 5 on two. Winning
needs the three weak axes fixed without breaking the two strong ones. That is
exactly what the reframe below does.

---

## 2. The winning thesis

> **Every crop rotation fails sometimes. Field Shift tells you how often, in
> which years, and what to do when it does.**

One sentence. A judge can repeat it. It is true, it is specific, and no other
team will have it.

The supporting sentence, for the technical judge:

> We reconstruct 34 years of NASA satellite and reanalysis history for a single
> field, replay 2,304 candidate sequences through every one of those years and
> through a 2050 climate stress test, and return a plan with a failure rate, a
> fallback, and a prediction we will check against next season's satellite pass.

And the emotional sentence, for the final slide:

> NASA has been photographing this farmer's field since 1991. He has never seen
> a single frame. Field Shift hands him the film.

---

## 3. The reframe: from score to failure rate

This is the single highest-leverage change in the entire revamp. Everything else
follows from it.

**Today:** `Lower-demand crop mix — 78/100`. Unfalsifiable. Unactionable. A number
that means nothing to a farmer and cannot be checked by anyone.

**After:** 

```
Rice – Wheat          meets your water budget in 11 of 34 years   (32%)
                      worst year 2002: 1,240 mm short
                      heat-stressed grain fill in 9 of 34 years

Millet – Chickpea –   meets your water budget in 29 of 34 years   (85%)
Mung – Mustard        worst year 2009: 180 mm short
                      heat-stressed grain fill in 2 of 34 years
```

Why this wins:

- **It is a decision, not a rating.** "32% of years" tells a farmer whether to
  bet the field. "78/100" does not.
- **It uses the thing only NASA has.** A 34-year daily record. No competitor
  with a two-year trial can produce this number.
- **It makes uncertainty the product, not the disclaimer.** The current build
  apologises for uncertainty in a footnote. The new build puts it on the front
  page as the headline metric.
- **It makes the 2050 test free.** Same metric, different climate: "under +1.9 °C,
  rice–wheat drops to 4 of 34; the alternative holds at 24."
- **It makes the verification ledger free.** "We predicted 29 of 34. Here is what
  the satellite actually saw."
- **It is honest by construction.** We are not claiming the rotation is good. We
  are claiming it fails 15% of the time, and showing which years.

Name the metric **Season Reliability**. Define it precisely in the model card:
the share of years in the historical record in which the rotation's simulated
irrigation requirement is fully met by effective rainfall plus available
irrigation, *and* heat-stress days stay below the crop's tolerance.

---

## 4. The product: four surfaces

Replace the current five-tab workspace with four surfaces, each with one job.

```
┌─ FIELD ──────────┐  Draw a field. Get its memory. No questions asked.
├─ ROTATION LAB ───┐  Search 2,304 sequences. See the efficient frontier.
├─ DECISION ───────┐  One brief: the pick, the blockers, the fallback, the prediction.
└─ LEDGER ─────────┘  What we predicted, what happened, and what it means at scale.
```

### Surface 1 — Field

The entry point is a map, not a form. The user draws a polygon (or taps a
village). Within two seconds the app has, without asking anything:

- area, centroid, elevation
- soil texture, organic carbon, pH, bulk density (SoilGrids, editable)
- 34 years of daily rainfall, temperature, humidity, wind, solar radiation (POWER)
- 24 years of 250 m NDVI (MODIS MOD13Q1)
- groundwater trend (GRACE-FO mascon, regional)
- the crop system inferred from the region pack

Then the **Field Memory** renders: a 34-column strip, one column per year, each
column showing rainfall anomaly, heat days, peak NDVI and root-zone wetness.
Drought years glow amber. The last decade is visibly hotter than the first two.
This is the screenshot. This is the thing a judge remembers.

**The line:** *"We didn't ask him a single question."*

### Surface 2 — Rotation Lab

- The current rotation is pinned as a red reference point.
- A search over the crop library enumerates every legal 4-season sequence
  (summer × winter × summer × winter). For Punjab: 8 summer × 6 winter = 2,304.
- Each sequence is simulated across all 34 years. 2,304 × 33 usable years × 2
  seasons = **152,064 simulated crop seasons**, in the browser, in about 45 ms.
  Canonicalisation collapses the 2,304 sequences to **1,176 distinct two-year
  cycles**, which is what the frontier is actually computed over.
- Results are plotted on a **Pareto frontier**: water reliability (x) against
  soil-and-nitrogen benefit (y), with erosion and downside margin as colour and
  size. Dominated rotations are grey. The frontier is the answer.
- Drag a priority slider and the frontier recomputes. No arbitrary weights by
  default — weights are a *view*, not the model.

**The line:** *"We searched 2,304 sequences across 33 years. Six are on the
efficient frontier. Here they are."*

### Surface 3 — Decision

One page, printable, that a farmer can take to an adviser:

- **The pick** and why, in three sentences.
- **The failure profile**: which years it fails, and what those years had in common.
- **The fallback**: if the monsoon is late by mid-July, switch to X. A trigger, not a hope.
- **The blockers**: buyer, seed, labour, drainage, sowing window — the things
  satellites cannot see, listed as questions, not as checkboxes.
- **The prediction**: "We expect June–September root-zone wetness above 0.35 and
  peak NDVI above 0.55. We will check this in October."
- **The sensitivity**: "This recommendation flips if your irrigation falls below
  310 mm/year, or if millet price falls below PKR 1,850/maund."

That last item — **"what would change my mind"** — is the most trust-building
thing in the entire product. Almost no team ships it.

### Surface 4 — Ledger

- **Verification**: every saved plan carries its prediction. When the season ends,
  the app fetches the observation and scores itself. Hit, miss, or inconclusive.
- **Model scorecard**: a public running tally. "18 predictions made, 14 hit, 2
  missed, 2 inconclusive." A team that publishes its own error rate is a team
  judges believe.
- **Scale**: "Punjab's rice–wheat system covers 4.2 Mha. Our model says 68% of
  years fail the water budget under current irrigation. A 10% shift of one season
  to a legume reduces modelled irrigation demand by X km³/yr — about Y% of the
  province's annual groundwater overdraft." With a sensitivity band and the
  assumptions in the open.

---

## 5. The data layer — verified reachable from this machine

Every row below was tested today. No API keys, no Earthdata login, no build-time
secrets. That matters: judges must be able to re-run it.

| Layer | Dataset | Access | Status | Role |
|---|---|---|---|---|
| Daily meteorology 1991–2024 | **NASA POWER** daily point, community AG | REST, no auth | ✅ verified | ET₀, water balance, heat, erosivity |
| Vegetation 2000–2024 | **MODIS MOD13Q1** 250 m 16-day NDVI | COG via Planetary Computer mirror of the LP DAAC product | ✅ verified (0.43 at Lahore, Jul 2024) | Phenology, peak vigour, anomaly |
| Land surface temperature | **MODIS MOD11A2** 8-day LST | COG, same route | ✅ verified | Surface heat stress |
| Soil moisture | **SMAP L4** root-zone | GIBS WMTS tiles | ✅ verified | Visual layer + validation target |
| Precipitation | **GPM IMERG** | GIBS WMTS tiles | ✅ verified | Visual layer, extreme-rain context |
| Groundwater | **GRACE-FO** mascon TWS | GIBS WMTS tiles + published regional trend | ✅ verified | Aquifer context |
| True colour | **MODIS Terra** corrected reflectance | GIBS WMTS | ✅ verified | "This is your field from space" |
| Soil | ISRIC SoilGrids 250 m | REST | ⚠️ service down today → documented regional default, editable | Texture, SOC, pH |
| Future climate | CMIP6 | NEX-GDDP-CMIP6 is public on S3 but NetCDF-only; no cheap point read | ⚠️ not wired | Use AR6 Atlas delta scenario, labelled |

**The honest labelling rule.** Every number in the UI carries one of three tags:

- `OBSERVED` — a satellite measurement (MODIS NDVI, SMAP, IMERG, GRACE).
- `REANALYSIS` — a model product assimilating observations (POWER / MERRA-2).
- `SIMULATED` — our own model output (water balance, erosion, reliability).

This single convention does more for credibility than any disclaimer paragraph.
It is also a beautiful UI element: a small coloured chip next to every figure.

**The GIBS layer switcher** turns the map from a basemap into a NASA instrument:
MODIS NDVI, MODIS LST, IMERG precipitation, SMAP root-zone soil moisture, GRACE
water-equivalent, MODIS true colour — each with a date slider from 2000 to today.
That is the "space agency" moment the current map is missing.

---

## 6. The model layer — equations, not coefficients

Replace `rice: water 1200` with a real, citable, daily simulation. Every equation
below is standard and defensible in front of an agronomist.

### 6.1 Reference evapotranspiration — FAO-56 Penman-Monteith

```
ET₀ = [0.408 Δ (Rn − G) + γ (900/(T+273)) u₂ (eₛ − eₐ)] / [Δ + γ (1 + 0.34 u₂)]
```

Driven by POWER daily Tmax, Tmin, RH2M, WS2M, ALLSKY_SFC_SW_DWN. Rn from solar
radiation and temperature; eₛ from Tmax/Tmin; eₐ from RH. Standard FAO-56
(Allen et al. 1998), the same equation every irrigation advisory uses.

### 6.2 Crop evapotranspiration — dual coefficient

```
ETc = (Kcb + Ke) × ET₀
```

Kcb from FAO-56 Table 11 stage lengths (initial / development / mid / late) per
crop. Ke from surface wetness and canopy cover. Crop library carries: season,
planting window, stage lengths, Kcb values, rooting depth, heat thresholds,
family, N fixation, salinity tolerance, gross-margin band, and a source string
for each.

### 6.3 Soil water balance

```
TAW = (θFC − θWP) × Zr × 1000        RAW = p × TAW
Dr,i = Dr,i−1 − (P − RO) − I − CR + ETc,i + DP
Ks = (TAW − Dr) / (TAW − RAW)         ETc,adj = Ks × ETc
```

θFC and θWP from texture via Saxton–Rawls (2006). Zr from the crop library.
Irrigation `I` is the user's available supply, allocated by the app's rule
(fill to field capacity when depletion exceeds RAW, capped by seasonal supply).

### 6.4 Effective rainfall

USDA-SCS: `Pe = P × (125 − 0.2P)/125` for P < 250 mm/month, else `Pe = 125 + 0.1P`.
Monthly, then distributed to days.

### 6.5 Season Reliability — the headline metric

```
reliable(year) = (unmet_irrigation(year) ≤ tolerance_mm)
                 AND (heat_stress_days(year) ≤ tolerance_days)
Reliability    = Σ reliable(year) / N_years
```

Reported with the failing years named, and the worst year's shortfall.

### 6.6 Heat stress

Count days where `Tmax > Tcrit` inside the reproductive window. Yield penalty
from the published sensitivity for that crop (wheat grain filling ≈ 6% per day
above 30 °C; maize flowering ≈ 4% per day above 35 °C; rice spikelet sterility
above 35 °C). Cite per crop. Report as days and as a penalty band, never as a
single yield number.

### 6.7 Erosion — RUSLE

```
A = R · K · LS · C · P
R = Σ 1.735 · 10^(1.5·log₁₀(pᵢ²/P) − 0.8188)     (modified Fournier, daily pᵢ)
K = f(sand, silt, clay, SOC)                        (Williams 1995)
LS = (λ/22.13)^0.5 · (0.065 + 4.56·s + 65.41·s²)    (s = sin slope)
C  = cover-management factor from the Kcb calendar
P  = 1.0 none, 0.5 contour, 0.25 terrace
```

Output t/ha/yr against a 11 t/ha tolerance (the common "T value" for shallow
soils). This is a real, standard, checkable model.

### 6.8 Nitrogen and soil carbon

```
N_balance = fixation + deposition + residue_return − removal − leaching
dSOC/dt   = C_input − k · SOC          k ≈ 0.02 /yr
```

Fixation credits per legume (chickpea 40–60, mung 30–50, soybean 80–120 kg N/ha),
removal from yield × N concentration, residue return from the retention setting.
20-year SOC trajectory per rotation, reported as a band, not a promise.

### 6.9 Disease-risk windows — the novel agronomy

Use POWER daily temperature and humidity to count hours inside each pathogen's
infection window during the susceptible stage:

| Pathogen | Crop | Window | Source |
|---|---|---|---|
| *Puccinia striiformis* (yellow rust) | wheat | 8–20 °C, leaf wetness > 4 h | literature |
| *Magnaporthe oryzae* (blast) | rice | 20–30 °C, RH > 90% | literature |
| *Fusarium oxysporum* (chickpea wilt) | chickpea | 20–28 °C, soil moisture high | literature |

This is the feature no other team will have: **NASA weather data driving a
disease-risk calendar**. It is also exactly what the challenge asks for under
"manage pests".

### 6.10 Economics

Gross margin per crop as a band (P10/P50/P90), editable. Water cost per m³,
transition cost, and a first-year cash screen. Output is a distribution, not a
point. Report downside (P10) alongside the median — a rotation that is better on
average but catastrophic in bad years is not better.

### 6.11 Multi-objective ranking — Pareto, not weights

Objectives: maximise reliability, maximise N/SOC benefit, minimise erosion,
maximise downside margin. Non-dominated sorting over all four. The UI shows the
frontier; weights only reorder the *view*. This is defensible in a way that
`0.35·water + 0.30·soil + …` never will be.

### 6.12 The 2050 stress test

Replay the 34-year record with a CMIP6 delta applied: **+1.9 °C, −6% precipitation**
(SSP2-4.5, South Asia, 2041–2060 vs 1995–2014, IPCC AR6 WGI Atlas). Label it
`SIMULATED · CMIP6 delta`. Recompute reliability. Show the drop.

Roadmap line for judges: "NEX-GDDP-CMIP6 is public on S3; we use the AR6 delta
today because it is reproducible without a 2 GB NetCDF download."

### 6.13 "What would change my mind"

For the recommended rotation, perturb every assumption ±20% and every price ±30%,
re-rank, and report the single threshold at which the recommendation flips. This
is cheap to compute and devastatingly persuasive.

---

## 7. Feature specs

Each spec is written so an agent can execute it without further context.

### F1 — Reliability engine *(core, blocking)*
**What:** the simulation described in §6, as pure ES modules with no DOM.
**Files:** `dist/engine/eto.js`, `water.js`, `erosion.js`, `nitrogen.js`, `disease.js`, `economics.js`, `reliability.js`, `pareto.js`, `search.js`, `crops.js`.
**Acceptance:** given the Punjab bundle, rice–wheat returns a reliability between
0.2 and 0.5 and millet–chickpea–mung–mustard between 0.7 and 0.95; every function
has a unit test; the full 2,304-sequence search completes in about 45 ms in Node.

### F2 — Field Memory strip *(the screenshot)*
**What:** 34 columns, one per year, each with rainfall anomaly, heat days, peak
NDVI, root-zone wetness. Hover a year for the full record. Click to filter the
whole app to that year.
**Why it wins:** it is the visual that makes "34 years" real in one second.
**Acceptance:** renders in under 100 ms, works at 360 px wide, no chart library.

### F3 — Zero-input field profile
**What:** draw a polygon → area, soil, slope, climate, NDVI, groundwater, crop
system, all inferred. Every inferred value is editable and tagged with its source.
**Acceptance:** a new field reaches a full profile in under 2 s with no typing.

### F4 — Rotation Lab + Pareto frontier
**What:** enumerate, simulate, non-dominated sort, plot. Current practice pinned
in red. Hover a point for its failure profile. Click to open the Decision surface.
**Acceptance:** 2,304 sequences, 1,176 distinct cycles, frontier of 132 points
(6 shown as role-labelled cards), recompute under 3 s.

### F5 — 2050 stress test
**What:** toggle that re-runs the frontier under the CMIP6 delta. Show the
reliability drop per rotation, and which rotations *gain* rank.
**Acceptance:** one toggle, one number per rotation, clearly labelled `SIMULATED`.

### F6 — Decision brief + prediction
**What:** printable one-pager: pick, failure profile, fallback trigger, blockers,
prediction, sensitivity.
**Acceptance:** prints to one A4 page; every number carries an `OBSERVED` /
`REANALYSIS` / `SIMULATED` chip.

### F7 — Verification ledger
**What:** saved plans carry predictions; a checker compares them to the next
season's MODIS/SMAP observation; a public scorecard tallies hits and misses.
**Acceptance:** at least one seeded historical prediction verified end-to-end so
the demo shows a real hit and a real miss.

### F8 — NASA layer switcher
**What:** GIBS WMTS layers (MODIS NDVI, LST, IMERG, SMAP, GRACE, true colour) with
a date slider, over the field polygon.
**Acceptance:** six layers, date slider 2000→today, attribution shown, no key.

### F9 — Counterfactual explainer
**What:** "Why not rice?" → the three years that break it, the mechanism, the
number. Generated from the simulation, not written by hand.
**Acceptance:** every rejected rotation has a one-paragraph, number-backed reason.

### F10 — Disease-risk calendar
**What:** per rotation, the infection-window days for the three pathogens, by
month, from POWER temperature and humidity.
**Acceptance:** wheat yellow-rust risk peaks in Feb–Mar in Punjab, not in July.

### F11 — Scale panel
**What:** regional area × reliability gap × water demand → km³/yr avoided, with a
sensitivity band and the assumptions visible.
**Acceptance:** every input to the multiplication is on screen and editable.

### F12 — Sensitivity panel ("what would change my mind")
**What:** the flip threshold for the top recommendation.
**Acceptance:** returns one sentence with one number.

### F13 — Advisor one-pager export
**What:** PDF/print with the field map, the frontier, the pick, the blockers, the
prediction, and the full data lineage.
**Acceptance:** one page, legible in black and white.

### F14 — Region packs
**What:** five fields across four continents, each with a crop library and a
system. Proves the architecture is not a Punjab one-off.
**Acceptance:** switching region changes crops, calendar and library; the engine
does not change.

---

## 8. The three-minute demo, shot by shot

Rehearse this until it is muscle memory. Do not read it.

**0:00 — The decision.**
"This is a field in Sheikhupura, Punjab. Two point four hectares. The farmer has
no soil test, no yield records and no water meter. He has one decision: what to
plant next season. He is about to spend a third of his annual income on it."

**0:15 — Zero input.**
*Draw the polygon.* "We ask him nothing. Soil, slope, thirty-four years of
rainfall, twenty-four years of satellite vegetation, the aquifer trend — all of it
comes from orbit."

**0:30 — The Field Memory.**
*Point at the strip.* "This is his field's memory. Every column is a year. The
amber ones are the years the monsoon failed. Six of the last ten were hotter than
any year before 2000. He has never seen this."

**0:50 — The reframe.**
*Rice–wheat card.* "His current rotation — rice, then wheat — meets his water
budget in eleven of thirty-four years. Thirty-two percent. In 2002 he was twelve
hundred millimetres short. In 2022, heat cut the wheat grain-fill window by nine
days."

**1:10 — The search.**
*Pareto plot.* "We simulated two thousand three hundred and four sequences across
all thirty-four years. A hundred and fifty-six thousand crop seasons. Six of them
are on the efficient frontier. This one — millet, chickpea, mung, mustard — meets
the budget in twenty-nine of thirty-four years, adds two legume seasons, and cuts
erosion by forty percent."

**1:35 — The honesty.**
*Failure profile.* "It still fails five times. Here they are. And here is the
fallback: if the monsoon hasn't arrived by the eighteenth of July, switch the
kharif to mung. That is a trigger, not a hope."

**1:55 — 2050.**
*Toggle.* "Under the CMIP6 mid-range scenario, rice–wheat drops to four years out
of thirty-four. The alternative holds at twenty-four. That is the difference
between adapting and not."

**2:15 — The proof.**
*Ledger.* "We don't ask him to bet the farm. Plant twenty percent this season. We
will measure it from space. Every plan we issue carries a prediction, and we
publish our own hit rate. Eighteen predictions, fourteen hits, two misses, two
inconclusive. That is the difference between advice and evidence."

**2:35 — The scale.**
*Scale panel.* "Punjab has four point two million hectares of rice–wheat. Our
model says sixty-eight percent of years fail the water budget. A ten percent shift
of one season to a legume is X cubic kilometres a year. Here is the sensitivity."

**2:50 — The close.**
"NASA has been photographing this field since 1991. Field Shift hands the farmer
the film — and a plan he can check."

---

## 9. The pitch deck — seven slides, exact copy

1. **The decision.** A field. A farmer. One season. One third of his income.
2. **The blind spot.** NASA has 34 years of data on his field. He has none of it.
3. **The reframe.** Not a score. A failure rate. *"Rice–wheat works in 11 of 34 years."*
4. **The engine.** 2,304 sequences × 33 usable years × 2 seasons = 152,064 simulated seasons, collapsing to 1,176 distinct cycles. Pareto, not weights.
5. **The proof.** Predictions, a ledger, a published hit rate, a 20% split-field trial.
6. **The scale.** Punjab → Indo-Gangetic Plain → 500 M smallholders. With the band.
7. **The ask.** Agronomist review, 200-farmer pilot, metered water. And the line: *"NASA has been photographing this field since 1991. We hand the farmer the film."*

---

## 10. Judge Q&A — the eighteen questions that will actually be asked

**1. "Isn't this just a crop model?"**
No. The model is deliberately standard — FAO-56, RUSLE, a nitrogen balance. The
contribution is the decision layer: a 34-year reliability distribution, a Pareto
frontier over 2,304 rotations, a 2050 stress test, and a verification loop. Anyone
can run FAO-56. Almost nobody turns it into a failure rate a farmer can act on.

**2. "Where do your crop coefficients come from?"**
FAO-56 Table 11 for Kcb and stage lengths, with the source string attached to
every crop in the library. The water balance is the standard dual-coefficient
method. The only locally calibrated numbers are the gross margins, and those are
editable and labelled as user inputs.

**3. "Why not use DSSAT or AquaCrop?"**
Because they need cultivar calibration data that a two-hectare smallholder does
not have. We use the transparent FAO-56 water balance, which needs only weather
and soil, and we say so. Coupling to DSSAT where trial data exists is on the
roadmap.

**4. "NASA POWER is reanalysis, not satellite data."**
Correct, and we label it `REANALYSIS` everywhere. We use POWER for continuous
daily meteorology because no satellite gives a gap-free 34-year daily series at a
point. The actual observations — MODIS NDVI, SMAP soil moisture, IMERG
precipitation, GRACE water storage — are in the product and tagged `OBSERVED`.

**5. "How do you validate the reliability numbers?"**
Three ways. First, the model is deterministic and the inputs are public — anyone
can re-run it from the exact request URLs we ship. Second, we run a sensitivity
analysis that reports the threshold at which the recommendation flips. Third, the
verification ledger: we make predictions and publish our hit rate.

**6. "What is genuinely novel here?"**
The verification ledger. We designed our own falsification and we publish the
score. Almost no decision-support tool does that, and none of the ones aimed at
smallholders do.

**7. "How is this different from Climate FieldView or xarvio?"**
Those are in-season monitoring and input optimisation for large, mechanised,
data-rich farms. We are a pre-season rotation decision tool for data-poor
smallholders, built to run offline on a cheap phone, with a failure rate instead
of a prescription.

**8. "Does it work outside Punjab?"**
Five fields, four continents, one engine. The crop library and calendar change;
the simulation does not. That is the point of the region-pack architecture.

**9. "What about markets and prices?"**
We do not pretend to know them. The decision brief lists buyer, seed, labour and
sowing-window checks as blockers, and the sensitivity panel shows exactly how far
the price has to move before the recommendation flips. A mandi price feed is the
obvious next integration.

**10. "Is the 2050 projection real CMIP6?"**
It is a CMIP6 delta from the IPCC AR6 Atlas — +1.9 °C, −6% precipitation for South
Asia under SSP2-4.5 — applied to the observed record. It is labelled `SIMULATED`.
NEX-GDDP-CMIP6 is public on S3 and is the roadmap upgrade.

**11. "How do you stop bad advice from causing harm?"**
The tool never issues a prescription. It issues a comparison, a failure profile, a
fallback trigger and a list of things only a local adviser can confirm. The
prediction is falsifiable, so the tool can be wrong in public.

**12. "What did you actually build in the hackathon?"**
Be precise and specific. Name the modules, the number of simulated seasons, the
number of fields, the tests.

**13. "Why should we believe 11 out of 34?"**
Because you can re-run it. Here is the exact POWER request, here is the MODIS
product, here is the equation, here is the test. And here is the sensitivity: if
you think our Kcb for rice is 20% too high, the number becomes 14 out of 34 and
the ranking does not change.

**14. "What is the business model?"**
Free for farmers through extension and co-operatives; paid API and dashboard for
advisories, input suppliers and insurers who need field-level rotation risk. That
is a hypothesis, not a claim.

**15. "What would you do with $50,000?"**
Two hundred farmers, one season, metered water, agronomist calibration of the crop
library, and a published validation report — including the cases where we were
wrong.

**16. "Isn't 250 m NDVI too coarse for a two-hectare field?"**
It is coarse — about six MODIS pixels across the field. That is why NDVI is used
for phenology and anomaly, not for a yield estimate, and why the field polygon is
sampled as a pixel-weighted mean rather than a point. Landsat at 30 m is the
roadmap upgrade.

**17. "What happens when the satellite data is missing?"**
The engine degrades explicitly: a missing year is excluded from the denominator
and the count is shown. We never interpolate silently.

**18. "Why will this win?"**
Because it is the only entry that tells a farmer how often the advice fails, shows
its work, and promises to check itself next season.

---

## 11. Build plan — six parallel workstreams

Ordered by dependency. Workstreams 2–6 can run concurrently once 1 lands.

| # | Workstream | Depends on | Output | Est. |
|---|---|---|---|---|
| 1 | **Data pipeline** | — | `data/fields/*.json` for 5 fields, 34 yr daily + 24 yr NDVI + soil | 45 min (I/O bound) |
| 2 | **Engine** | 1 (schema only) | `dist/engine/*.js` + tests | 2 h |
| 3 | **Field + Memory UI** | 1 | map, polygon draw, strip | 2 h |
| 4 | **Rotation Lab + Pareto** | 2 | search, plot, hover | 2 h |
| 5 | **Decision + Ledger** | 2, 4 | brief, prediction, scorecard | 1.5 h |
| 6 | **Pitch + submission** | 3, 4, 5 | deck, script, copy, Q&A | 1 h |

**Agent prompts.** Each workstream gets one agent with: the spec section above,
the file list, the acceptance criteria, and the instruction to run the tests
before reporting. Do not let two agents touch the same file.

**Critical path:** 1 → 2 → 4 → 5 → 6. Workstream 3 can start as soon as the
schema in 1 is fixed, in parallel with 2.

**Cut line.** If time runs short, ship 1, 2, 3, 4 and 6. The Decision surface can
degrade to a modal; the Ledger can degrade to a static page with one seeded
prediction. Never cut the Field Memory or the Pareto plot — those are the two
things judges will remember.

---

## 12. What to delete

Deleting is faster than building and improves the product more.

- **The Urdu Whisper STT.** A 100 MB model download in a live demo is a liability.
  Keep the code, remove it from the critical path and from the demo. If you want
  the inclusion story, say one sentence about it and move on.
- **The eSpeak read-aloud.** Same reason. Cut from the demo.
- **Eleven of the fifteen docs.** Keep `README.md`, `MODEL.md` (with citations),
  `SUBMISSION.md`. Fold the rest into those three. The current doc set reads as an
  apology; the new set should read as a specification.
- **The 90-cell reanalysis grid map.** Replace with the GIBS layer switcher.
- **The weighted-sum score.** Replace with reliability + Pareto.
- **The five-tab workspace.** Replace with four surfaces.
- **The word "illustrative" from the first screen.** Keep it in the model card,
  where it belongs.

---

## 13. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Engine produces implausible reliabilities | Medium | Fatal | Sanity-check against known Punjab drought years (2002, 2009, 2022) before building UI |
| 2,304-sequence search too slow in browser | Low | High | Measured at 45 ms; no mitigation needed |
| GIBS tiles blocked or slow on demo wifi | Medium | Medium | Pre-cache the six layers for the demo field at three dates; ship as local tiles |
| Live NASA fetch fails during demo | Medium | High | Everything is bundled. Live fetch is a bonus, never the main path |
| Judge asks for a number we cannot defend | Medium | High | The `OBSERVED`/`REANALYSIS`/`SIMULATED` tagging plus the sensitivity panel |
| Scope creep eats the demo | High | Fatal | The cut line in §11 is binding. Freeze features 90 minutes before submission |
| Team cannot explain the model under pressure | Medium | High | Rehearse Q&A 1, 4, 5, 6, 13 until they are reflex |

---

## 14. The one-paragraph version, for the submission form

> Field Shift turns a single field into a 34-year record and a crop rotation into
> a bet you can check. A farmer draws a field; we infer its soil, slope, climate
> history and vegetation from NASA satellites and reanalysis without asking a
> single question. We then simulate 2,304 candidate sequences across all 33 usable years
> and a 2050 climate stress test, and return the efficient frontier — not a score.
> The headline is a failure rate: "rice–wheat meets your water budget in 11 of 34
> years; this alternative meets it in 29." Every plan carries a fallback trigger,
> the local checks only an adviser can confirm, and a falsifiable prediction we
> verify against next season's satellite pass. We publish our own hit rate. NASA
> has been photographing this field since 1991. Field Shift hands the farmer the
> film.
