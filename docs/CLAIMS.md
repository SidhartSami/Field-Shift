# Claims and evidence ledger
All numerical examples below are generated from `node scripts/example-outcomes.mjs --write` and stored in `EXAMPLE.json`. The script uses the bundled NASA response, current model coefficients and constructed demonstration inputs.

| Claim | Status and evidence | Required qualification |
| --- | --- | --- |
| NASA POWER annual rainfall at the example point in 2024 totals 871.84 mm | Derived from authentic monthly PRECTOTCORR response using calendar-month lengths | Historical coarse-grid reanalysis; not a field rain gauge or forecast |
| Example indicative demand changes from 1,650 to 650 mm/year | Calculated from illustrative seasonal crop coefficients over four seasons | 60.6% lower modelled demand, not validated crop needs |
| Demand difference over 10 ha is equivalent to 100,000 m³/year | Unit conversion: 1,000 mm × 10 ha × 10 m³/(mm·ha) | Not actual pumping saved, water conserved, or an automatic cash saving |
| Example annual gap changes from 583 to 0 mm | Model output with loam, 65% effective rain and 500 mm usable irrigation | Annual totals can conceal seasonal shortages and irrigation losses |
| The dry/warm, 200 mm irrigation example retains a 53 mm alternative gap | Model output with 30% less annual rain and +2°C; baseline gap is 1,053 mm | Constructed stress test, not a climate or yield forecast |
| Example soil support changes +30 proxy points | Heuristic management score, 35 → 65 | Not a 30% improvement in soil health, nitrogen, carbon or yield |
| Example soil protection remains 62/100 | Same crop-cover/residue/slope proxy result in both sequences | No erosion reduction can be claimed from this comparison |
| The example has two crop-family changes out of three transitions | Count of grass/legume/brassica family transitions | Does not establish pest/disease control; crop-specific pathogens are not modelled |
| A scenario gives −PKR 6,600 first-year net change | Hypothetical cost screen with user-style inputs PKR 2/m³, −4,000/ha margin and 5,000/ha switch cost | Inputs are invented, cost base is root-zone-equivalent volume, not a profit forecast |
| The application and map workflows are implemented | Automated DOM/model tests and successful hosted deployment | Visual browser, real browser CORS, touch and print QA remain unverified |
| The product helps users examine a decision | Directly supported by implemented comparison, notes and evidence flows | Actual decision quality, time saved, farmer adoption and willingness to pay are unmeasured |
| Lower water use, better margins, healthier soils and improved resilience | Desired outcomes / hypotheses | Require farmer participation, local agronomy review and prospective field validation |

There are no customer interviews, testimonials, farm trials, measured pumping savings, revenue, partnerships, pilot enrolments or proven ecological outcomes to report. Official judging criteria and event rules were not supplied; the pitch maps to the supplied challenge objectives without inventing an official scoring rubric.

## Urdu and Pakistan revision
The current demonstration uses Lahore (31.5204°N, 74.3587°E), 90 regional cells and PKR. Speech generation has been exercised with the actual eSpeak NG Urdu engine and produces non-silent WAV audio locally. This verifies generation, not pronunciation quality or farmer comprehension. The optional microphone recogniser is a browser feature, not an open-source/offline guarantee. No neural model training or Urdu user testing is claimed.

## STT correction
Urdu speech-to-text is primary. Local Whisper uses a pinned multilingual base/tiny model and `language: urdu`, `task: transcribe`; browser fallback is fixed at `ur-PK` regardless of UI language. Actual CPU inference returned an imperfect Urdu-script transcript on synthetic audio. This supports execution, not speech accuracy, farmer comprehension or real browser microphone reliability. See STT.md for the exact sample and limits.
