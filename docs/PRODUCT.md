# What FasalPath does
FasalPath helps a farmer in the irrigated plains of Punjab, Pakistan decide **which change to their current crop rotation deserves a local agronomist discussion**.

The farmer saves a field and its location once. NASA historical rainfall/temperature context is attached to that location. The farmer then supplies their current crops, soil, available irrigation and local cost assumptions. The app compares the current practice with three alternatives or a custom two-year sequence, showing indicative demand, remaining water gaps, management proxies and a first-year cost screen.

The immediate output is a review brief: what could improve, what could rule the switch out, what still needs checking and the evidence behind it. It is not a validated planting prescription or a profit forecast.

## The specific workflow
1. **Save a field once.** Use the sidebar plus or Add field. Location and matching NASA data are committed together. Editing a location requires an explicit action; failed or canceled retrieval leaves the existing field intact. Reloading or changing a scenario does not ask for the location again.
2. **Compare against current practice.** A higher model score does not erase the baseline. A farmer can keep existing crops when switching is not justified.
3. **Find the next blocker.** The decision brief identifies missing evidence, a remaining annual water gap, a negative first-year screen, incomplete costs or uncompleted local checks. Its action takes the user to the relevant input.
4. **Record local reality.** Buyer/price, seed/labour/equipment and sowing-window/drainage checks belong to the selected crop sequence and field. They are the user's statements, not independent validation. A changed location clears these checks; a different sequence has its own checklist.
5. **Keep a case for review.** Save a named option with assumptions, observations, costs, notes and self-reported checks. Even a fully checked option is only a candidate for local advice, never a ready-to-plant declaration.

## Why this is more specific than a generic dashboard
- The central question is one concrete crop-switch decision, with the farmer's existing rotation as the reference.
- Water demand and cash costs remain separate. Unmet water is not priced as if it had already been pumped.
- A negative outcome is useful: the farmer sees why a proposed switch may not pay or still lacks water.
- The map supplies inspectable climate context; selecting a different place starts a new field setup instead of overwriting the farmer's current location.
- The brief connects model numbers to buyer access and planting practicality, which a satellite layer alone cannot establish.
- English is the sole interface language. Urdu speech-to-text remains an optional way to enter a question or note, with confirmation before use. Recording and model controls are disclosed only when the user opens dictation.

These are implemented design choices, not evidence of superiority over named competitors or proven farmer benefit. Agronomic coefficients, seasonal adequacy, realised margins, field outcomes and real-device voice usability remain to be validated.
