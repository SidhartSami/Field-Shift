# The landing page

`dist/index.html` is the front page. `dist/app.html` is the tool.

The split is deliberate. A judge, a farmer or a funder who opens the root URL
should get the argument before they get a form. The landing page makes the case
in eight sections and hands off to the app at four points; the app never has to
explain itself.

```
/            index.html   the argument (why a failure rate, what we built, what it found
/app.html    app.html     the tool) Field, Rotation Lab, Decision, Ledger
/model.html  model.html   the model card: equations, data, eight known errors
/pitch.html  pitch.html   the seven-slide scroll deck
```

Nothing on the landing page is a mockup. Every screenshot is a real capture of
`app.html` at 1440 px, and every number is recomputed from the engine by
`tests/landing.test.js`.

## Section map

| # | Section | Anchor | What it does |
|---|---------|--------|--------------|
| - | Hero | - | The claim, the five headline counts, no eyebrow |
| 01 | The problem | `#problem` | Rice–wheat at 39%, and what 39% actually counts |
| 02 | The insight | `#insight` | A score out of 100 cannot be wrong; a failure rate names years |
| 03 | What we built | `#built` | Four surfaces in a bento grid, three real screenshots |
| 04 | The finding | `#finding` | 39% vs 85%, and why maize–wheat at 100% is rejected |
| 05 | The data | `#data` | Six NASA products, each with a provenance chip |
| 06 | The honesty | `#honesty` | 5 of 5, 0.06, 20, and the eight known errors |
| 07 | Who it is for | `#who` | Six audiences, one sentence each |
| - | Closing | `#open` | 0.99 km³, labelled as arithmetic on our own output |

The funnel is story → tool. "Open the field →" appears in the floating nav, the
hero, and the closing block, so the CTA is never more than one scroll away.

## Design

The page reuses `dist/app.css` and adds a scoped `<style>` block. It does not
fork the palette, if the app's tokens move, the landing page moves with them.

| Token | Value | Used for |
|-------|-------|----------|
| `--paper` | `#f5f2ea` | page ground |
| `--ink` | `#141a17` | body text, solid buttons |
| `--deep` | `#101713` | the two dark bands |
| `--water` | `#0f6b5c` | italic emphasis, links, the good number |
| `--amber` | `#c2622a` | the 39% figure |
| `--display` | Instrument Sans | headlines, nav, buttons |
| `--serif` | Instrument Serif italic | the turn in a headline |
| `--body` | Instrument Sans | prose |
| `--mono` | IBM Plex Mono | every number, every label, every chip |

Two rules the page follows:

- **Numbers are mono, prose is not.** A figure in IBM Plex Mono reads as
  measured; the same figure in Instrument Sans reads as written.
- **Italic marks the turn.** "Know which years *your rotation fails.*" The roman
  half is the question a farmer already has; the italic half is the answer the
  product gives. Instrument Serif is the
  companion face to Instrument Sans (same foundry), so the switch reads as
  emphasis rather than as a second voice. Both are self-hosted woff2 in
  `dist/assets/fonts/`; no Google Fonts request at runtime.

## Chrome

The nav is a **floating pill**, not a sticky full-width bar: `position: fixed`,
`top: 16px`, centred, `border-radius: 999px`, dark translucent with a
`backdrop-filter` blur so the paper ground reads through it. It floats over the
hero rather than pushing it down, which is what lets the headline sit high on
the page. `html { scroll-padding-top: 96px }` keeps anchor jumps clear of it.

Section headers use a two-column `.sec-row`: the headline on the left, the
supporting paragraph right-aligned on the same baseline. The eyebrow above each
headline is an outlined capsule, sentence case, never uppercase, never
letter-spaced.

The "What we built" section is a six-column bento grid (`.bento`), not a row of
equal cards: Field spans 4, Rotation Lab spans 2 and carries a stat instead of a
screenshot (a 1440×1694 capture in a 300 px column was unreadable), Decision and
Ledger span 3 each. Screenshots bleed off the bottom edge of their card.

## Regenerating the screenshots

The four JPEGs in `dist/assets/shots/` are captured from the running app, not
drawn. To rebuild them:

```sh
npm start                       # serves dist/ on :8080
node scratch/shots.mjs          # writes dist/assets/shots/*.jpg
```

`scratch/shots.mjs` is a throwaway script and is not committed. It needs
Playwright with a local Chromium; the `executablePath` at the top of the file
points at one. Each view is clipped to a height that lands on a section
boundary (after the shortlist in the Lab, after the requirement strip in the
Decision brief), so no screenshot ends mid-chart.

If you change a view's layout, re-run the capture and update the `width` and
`height` attributes on the matching `<img>` in `dist/index.html`. The test suite
fails if an image is missing, is not a JPEG, or has no intrinsic size.

## What the tests check

`tests/landing.test.js` asserts:

- `index.html` is the landing page and does not contain the app; `app.html` is
  the app.
- No shipped page still links to `index.html` as if it were the tool.
- The non-affiliation disclaimer is present.
- 2,304 / 1,176 / 152,064 / 33 match the search.
- 39% / 85%, 938 mm / 703 mm, −74 / +9 kg N, 156k / 160k PKR match the engine.
- All twenty failing years named on the page are the years the engine returns.
- The page does not claim maize–wheat is the recommendation.
- Every screenshot exists, is a real JPEG, and declares `width`, `height` and a
  real `alt`.

If a coefficient changes, the suite names the sentence that needs rewriting.
That is the point: the landing page is the first thing a judge reads, so it is
the last thing that should be allowed to drift.
