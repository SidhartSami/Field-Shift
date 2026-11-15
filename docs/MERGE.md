# Merging the two branches

Two branches grew from the same commit (`2b4dd2d`) and neither knew about the
other:

| Branch | What it did |
|--------|-------------|
| `feat/revamp` | Replaced the app. New model, new UI, new docs. |
| `feature/voice-live-updates` | Extended the **old** app with voice field entry. |

They could not be merged textually, because the revamp deleted the files the
voice branch builds on. This document records what was kept, what was
superseded, and why — so nothing looks like it was dropped by accident.

## The collision

The revamp removed the entire previous application:

```
dist/style.css  dist/icons.js  dist/voice.js  dist/stt.js  dist/stt-worker.js
dist/speech-worker.js  dist/decision-brief.js  dist/model.js  dist/outcomes.js
dist/visuals.js  dist/voice-summary.js  dist/geo.js  dist/geo-data.js
dist/vendor/espeak/  dist/vendor/transformers/  tests/app.test.js
```

The voice branch modified or added files inside exactly that set. A plain
`git merge` produced a tree with a resurrected `style.css` that nothing linked
to, an orphaned `voice-live.js` that nothing imported, and a `dist/index.html`
conflict between the new landing page and the old app shell.

## What was kept

**`scripts/serve.mjs` — kept, and now the default.** A Node static server, so
`npm start` no longer needs Python. It also serves `/runtime-config.js` from a
gitignored `.env`, which is how the Deepgram key reaches the browser without
being baked into `dist/`. `package.json` now runs it.

**`dist/voice-live.js` — kept.** The parser is the valuable part and it is
DOM-free: `parseUtterance`, `reduceInputs`, `hasFacts`, `normalizeDigits`,
`applyUrduFacts`, `postProcessFacts`. It handles English and Urdu, Eastern
digits, and phrasing like "irrigation would be 800" or "not Lahore but
Islamabad".

**`dist/field-map.js` — kept.** `polygonAreaM2` and `polygonAreaHa` are pure
and useful; `createFieldBoundaryMap` is the Leaflet drawing layer.

**`dist/pcm-worklet.js` — kept.** The audio worklet the streaming path needs.

**`tests/voice-live.test.js` — kept, unmodified.** All eight tests pass against
the modules as they stand. They use a fake DOM, so they need no jsdom.

**`.gitignore` — restored.** The revamp had deleted it. It now covers
`node_modules/`, the pipeline cache, and `.env` (the Deepgram key).

## What was superseded

**`dist/app.js` (+366 lines), `dist/index.html` (+108), `dist/style.css` (+305).**
These were the "Add property" tab: a field-entry form, a property card grid,
and a save/refresh flow. The new app does not have user-created fields — it
ships five precomputed bundles, each with 34 years of daily NASA POWER and real
SoilGrids texture. A form that collects `area`, `lat`, `lon` and `soil` cannot
produce one of those; it needs a pipeline run. So the tab has no home in the
new architecture.

**`dist/data/properties-seed.json`.** Seed data for the property grid above.

**`tests/app.test.js`.** Tested the old app shell, which no longer exists.

## What was integrated

The parser was not left as dead code. `dist/ui/describe.js` maps its output
onto the Rotation Lab's controls, and the Lab now has an **"Or describe it"**
input:

```
irrigation 400, keep residue, drier by 30
  → supply 400 mm, residue on, 2050 stress test on
  → "Applied: water supply, residue, 2050 stress test."
```

Facts the Lab cannot act on are **named, not dropped**:

```
clay soil on 12 acres in Lahore
  → "Not used here: soil texture, field area, location — the Lab works on
     the field you picked."
```

That is the honest version. Silently ignoring "clay soil" would teach the user
that the box does not work.

`tests/describe.test.js` covers the mapping: clamping, both directions of
residue, stress-test triggering, the ignored-facts list, and that the input
options object is never mutated.

## What is still open

The streaming path — `createVoiceLive`, the Deepgram WebSocket, the interim
transcript folding — is in the tree and tested, but nothing mounts it. Wiring
it to the describe-it input is a small job: the input already exists, and
`createVoiceLive` takes `onLiveInputs` and `onCommit` callbacks that would feed
`applyDescribe` directly. It was left unwired because it needs a
`DEEPGRAM_KEY` in `.env` to be demonstrable, and a demo that silently falls
back to the browser Speech API is worse than one that does not offer the
button.

The boundary map is in the same position: `polygonAreaHa` is used by the tests,
`createFieldBoundaryMap` is not mounted.

## Result

```
main
├── 84b9b3a  Rebuild Field Shift on 34 years of NASA data
├── 916a41a  Add a landing page, and move the app to app.html
└── merge    Merge feature/voice-live-updates
```

129 tests pass. The app, the landing page, the model card and the deck all
serve. `npm start` is Node-only.
