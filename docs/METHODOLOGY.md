# Model card
Version 1.0.0. Purpose: transparent educational comparison, not planting advice.

## Observations
NASA POWER monthly API returns T2M (°C), PRECTOTCORR (mm/day), GWETROOT (dimensionless). Only months 01–12 of 2024 are used; annual month 13 is excluded. Rainfall is multiplied by actual calendar-month length, including leap days. Temperature and wetness summaries are unweighted means of monthly means, explicitly described as such. Missing, nonnumeric and -999 fill observations are rejected. The UI displays the data period and exact request. Historical baseline is not a forecast or climatological normal; the 2023 response is retained for reproducibility but not scored.

## Water
Illustrative seasonal water-demand coefficients, mm: rice 1200, wheat 450, maize 650, chickpea 300, millet 350, mustard 300, mung 350. Four-season sum / 2 gives annual demand. Effective rain = annual observed rain × (1 − dry scenario/100) × texture fraction (sand .45, loam .65, clay .55). Unmet demand = max(0, demand − effective rain − annual irrigation). 1 mm over 1 ha = 10 m³. Demand reduction is not a claim of measured pumping savings.

## Soil and diversity
Soil support = min(100,25 + 8 × organic matter percentage + 10 × legume seasons + 15 × family-break fraction). It is a relative support proxy, not a soil test or predicted carbon stock. Legumes do not guarantee net nitrogen addition; nodulation, residue removal and management matter. Family-break fraction counts changes among grass, legume and brassica across the three internal transitions. It does not model specific crop pathogens or the closing repeated-cycle transition.

Protection = min(100, mean crop-cover coefficient × 80 + 15 if residues retained − 1.4 × slope percent). Crop-cover coefficients .55–.7 are heuristic; protection is not quantified erosion avoided.

Water score = max(0,100 − 100 × deficit/demand). Balanced weights water/soil/protection/diversity = .35/.30/.15/.20. Water goal = .60/.20/.10/.10; soil goal = .20/.45/.20/.15. Heat penalty sums the positive difference between warmest seasonal monthly mean + scenario warming and illustrative crop thresholds, multiplied by .8. Summer uses June–September, winter uses November–March. Final score rounded and clamped 0–100. No probabilistic confidence interval is supported.

## Known limitations and validation path
No calibrated cultivar parameters, phenology, actual planting calendar, daily water balance, groundwater trend, economics, machinery constraints, pests, weeds or farmer market constraints. Soil wetness and NDVI do not drive rankings. Coordinates outside the target region can retrieve real data but do not expand the crop portfolio's validity. Future work requires agronomist review, multi-season field comparisons, local cost/price data, daily FAO 56 water balances and satellite vegetation integration. Avoid portraying the model as production agricultural advice.
