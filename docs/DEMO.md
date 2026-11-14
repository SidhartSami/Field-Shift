# Three-minute farmer-outcome demo

Use a fresh field with the bundled 2024 Lahore, Pakistan snapshot. Keep the default 10 ha, loam, 1.2% organic matter, 2% slope, 500 mm irrigation and rice/wheat current rotation. Select **Lower-demand crop mix**. This is a constructed example; do not present it as a real farmer or field trial.

## 0:00–0:25 — Start with the decision
“A farmer is about to commit land, seed and money for the next season. Before changing crops, they need to know: can I cover the water requirement, will the switch make financial sense, and what new management risks am I taking?”

Show the current rice/wheat practice and **What this option means for your farm**. Do not begin with navigation or software architecture.

## 0:25–0:55 — Make one benefit concrete
“In this 10-hectare example, our stated crop coefficients put the current rotation at 1,650 millimetres of annual water demand. The Lower-demand crop mix is 650: about 61% lower. That is a modelled demand difference, not water already saved. With the entered rainfall and irrigation assumptions, the annual shortfall falls from 583 to zero—but daily and seasonal water needs still require local checking.”

Point to the selected sequence and the buyer/seed checks. Explain why the farmer may prefer keeping wheat in both winters instead: familiarity and market access matter. The leading score does not choose for them.

## 0:55–1:20 — Show the condition that still fails
Apply **Hot & dry**, then set irrigation available to **200 mm/year**. “If rainfall is 30% lower and available irrigation is tighter, the alternative still lacks 52 millimetres in this annual model. The current sequence lacks 1,053. This helps the farmer ask how to close the remaining gap before buying seed.”

Do not claim that the slider forecasts the next season. Restore observed baseline and 500 mm irrigation before the cost example.

## 1:20–1:55 — Bring it back to money
Enter PKR, pumping cost **2**, crop-margin change **−4000**, and first-year switching cost **5000**. “These are illustrative inputs, not market research. Lower demand alone does not settle the financial decision. At these costs and crop margins, the first-year screen is negative 6,600 Pakistani Pakistani rupees across the field. The farmer can now ask a buyer for a better price, reduce switching costs, trial a smaller area or keep the current practice.”

Point out that the application screen caps irrigation at what is available. It does not price the entire water-demand difference or pretend unmet demand was already being pumped. A fixed electricity bill may produce no marginal cash saving.

## 1:55–2:20 — Explain why space data changes the question
Open the map or seasonal conditions view. “NASA adds historical rainfall and heat context to a decision that also needs local soil and irrigation information. These 90 regional grid cells let the farmer and adviser inspect where assumptions differ. The data is coarse MERRA-2 reanalysis; satellite imagery underneath is context, not a field measurement.”

Select a cell and show the dated observation and exact request. One purposeful interaction is enough; avoid a tour of every layer.

## 2:20–2:45 — Let the farmer hear and keep the reasoning
Return to the Urdu planner, record a short Urdu question and show its editable STT transcript before using it. Local Whisper base first use is about 100 MB including the runtime, so prepare the model beforehand. Do not claim an accuracy benchmark; review names and numbers. Optional read-aloud is secondary. Then save a decision with notes: “Confirm millet buyer price; review sowing windows and drainage; estimate transition costs with adviser.”

“The farmer leaves with an option, the expected model trade-offs, their own cost assumptions and the questions still open. They can print it and bring it into a local agronomy discussion.”

## 2:45–3:00 — Close on impact and the next proof
“Our goal is to help a farmer make a resource decision they can explain before committing a field. The next proof is a supervised pilot measuring actual water use, crop margin and whether farmers understand and use the advice. Today we have a working, traceable prototype—not validated farm savings.”

## Recording and stage preparation
- Keep a clean example field and avoid saved personal data. Have the printable report and pitch deck available as backups.
- Do not depend on a live NASA request for the main story: the authentic bundled snapshot makes the example repeatable. Demonstrate a live refresh separately if connectivity allows.
- A separate map tab can keep the story within three minutes; show purposeful decision evidence rather than every control.
- Rehearse the transitions and economic reset. The exact case is reproducible with `node scripts/example-outcomes.mjs`.
- Record real team names and roles, confirm official duration/AI disclosure rules and arrange judge access before submission. These steps remain outstanding.

The companion [seven-slide pitch](../dist/pitch.html) is Urdu-first with an English toggle. A farmer-facing spoken script is in [PITCH-URDU.md](PITCH-URDU.md). These are prepared materials, not a recorded submission or validated farmer testimony.
