# Urdu-first access for Pakistani farmers

## Implemented
- Urdu (`ur-PK`) is the initial language. English is an explicit, persistent alternative. Right-to-left navigation, labels, explanations and controls preserve English technical identifiers and numeric map geometry where needed.
- The starting point is Lahore, Punjab, Pakistan (31.5204°N, 74.3587°E), with authentic NASA POWER point observations for 2023–2024. The regional data covers 90 cells centered on Punjab, Pakistan and neighboring native-grid cells. PKR is the default cost currency. Area remains stored in hectares; an acre equivalent is displayed and spoken.
- Existing saved fields and decisions are retained. “Load Lahore example” creates a new Pakistan example rather than overwriting user data.
- Guided spoken explanations cover the active water comparison, entered cost scenario and checks before planting. They are generated from deterministic application values, not an ungrounded model answer. Unrecognised questions receive a scoped fallback, and stale field/location contexts do not receive a new outcome explanation.
- Open-source eSpeak NG produces Urdu or English speech on the device in a separate module worker. Native audio controls, pace selection, stop, transcript and WAV download are available. No paid API, account or hosted inference endpoint is used for speech generation.
- Pending and generated audio is invalidated when the field assumptions change so an old explanation is not presented as current advice.

## Free speech engine, not a neural adviser
The engine is the eSpeak-NG Emscripten port `@echogarden/espeak-ng-emscripten` 0.3.5. It includes an Urdu voice (`inc/ur`) and synthesizes audio at 22,050 Hz. It is a classic speech synthesizer, not a generative AI agronomist. A neural speech model was not required to satisfy free, open-source Urdu read-aloud. Do not describe it as a trained or fine-tuned farmer AI, or as a natural human voice.

The first use loads roughly 24 MB of engine/voice resources from the same site. Synthesis then occurs locally. The app does not implement a service worker or guarantee offline availability after closing the browser. Browser caching and device resources vary; lower-bandwidth and older-device testing remains necessary. Failed worker/audio playback leaves the written explanation available.

## Optional speech-to-text
Voice input uses a browser-provided `SpeechRecognition`/`webkitSpeechRecognition` implementation when available, configured for `ur-PK`. It starts only after a user press and the browser's microphone permission. Its availability, Urdu accuracy and processing location depend on the browser/provider; some providers send audio to their service. This component is not claimed to be open source, offline or universally supported. Typed questions and topic buttons work without it. A transcript is shown for confirmation; recognition does not silently change crop, cost or field inputs.

## Privacy
Read-aloud text is sent to the local worker, not to a speech inference provider. Read-aloud audio is generated in memory, not uploaded or stored in the app's database. The user can explicitly download a WAV file. Microphone capture is never started on page load. Browser recognition may involve an external provider, as disclosed next to the microphone control. Farmers should avoid speaking private identifiers into browser recognition.

## Licensing and source
The bundled eSpeak engine is GPL-3.0; preserve `dist/vendor/espeak/COPYING`, `README.md` and `SOURCE.json`. Its upstream package repository is https://github.com/echogarden-project/espeak-ng-emscripten at package commit `ea36b43595facf07f1c5dc487b9f0de3340c1b5e`. The upstream eSpeak fork's source snapshot as of the package publication is included at `dist/source/espeak-ng-source.tar.gz`, with its build instructions extracted to `dist/source/ESPEAK-BUILD.md`. The engine is distributed separately from original application code through a worker/audio message interface. No claim of bit-identical engine rebuilding is made. Upstream source: https://github.com/echogarden-project/espeak-ng/tree/fork.

## Evidence and verification limits
Automated tests synthesize actual non-silent Urdu PCM locally and validate the WAV header/sample format. Other tests cover Urdu/English switching, crop-ID preservation, RTL, scoped question detection, active-data summaries, worker messages, stale-result rejection and recognition confirmation. These tests do not establish speech intelligibility or real browser microphone compatibility. Pronunciation, literacy suitability, accessibility, low-bandwidth performance, touch behaviour, farmer comprehension and native-speaker review are outstanding. No farmer interview or voice-quality rating is fabricated.
