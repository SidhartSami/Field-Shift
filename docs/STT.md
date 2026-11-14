# Primary voice feature: Urdu speech-to-text

The requested voice feature is Urdu STT. It appears before optional read-aloud in the planner. Record Urdu, choose an audio clip, review/edit the Urdu transcript, then explicitly use it as a question or planning note. No transcription automatically changes crops, money inputs or a saved decision.

## Local open-source recognition
- Runtime: self-hosted browser bundle of Transformers.js 3.8.1 (Apache-2.0), in a separate module worker.
- Default model: multilingual `Xenova/whisper-base`, pinned to `64da57285918e20ea79ea5c88eed7197933abaa8`. Lighter option: `Xenova/whisper-tiny`, pinned to `5332fcc35e32a33b86612b9a57a89be7906102b1`. Converted model repositories declare Apache-2.0; OpenAI Whisper is the original model family. Model cards and exact revisions are retained in `dist/stt-models.json`.
- Decoding: `language: 'urdu'`, `task: 'transcribe'`. This requests Urdu script rather than translation into English. It stays Urdu when the application interface is English.
- In-browser processing: q8 weights on the WebAssembly backend, one thread to avoid a shared-memory/isolation requirement. Audio is decoded/mixed/resampled to 16 kHz mono locally and sent to the local worker.
- Initial downloads: the base model's encoder/decoder total about 77 MB; the runtime adds about 21 MB plus tokenizer/configuration files. Budget approximately 100 MB for first use. Tiny is smaller. Model/runtime files load from public Hugging Face/jsDelivr endpoints; browser caching and offline reuse vary, and no fully offline guarantee is made.
- No paid inference API, API key or recording-upload endpoint is used in local mode. Model-download requests still expose network metadata to their providers. Older phones may be slow or lack sufficient memory.

## Capture and confirmation
Microphone access starts only on Record and requires the browser's permission. Local recordings stop at 30 seconds. Files are limited to 45 seconds and 10 MB. Cancel terminates processing and ignores late results; pending microphone permission cannot start recording after cancellation. Tracks stop when recording stops or the page becomes hidden/navigates away during capture.

The transcript is editable, copyable and kept in the current page's memory. “Use as my question” fills the question for review; “Add to planning notes” fills an unsaved decision's notes. Saving remains an explicit action. No general crop command parser is claimed.

## Explicit browser fallback
The user may choose browser recognition instead of local Whisper. Its language is always `ur-PK`, even under English UI. Browser recognition may send audio to its provider, can require connectivity, and may not support Urdu on a given device. It is neither the open-source recognition path nor an offline guarantee. The app does not silently fall back from local to provider recognition.

## Verification and limits
Unit/DOM tests cover the fixed Urdu transcription configuration, audio conversion, silence/duration rejection, model loading, editable results, explicit application, cancellation, microphone cleanup and an English-interface/Urdu-recognition regression. Browser bundle validation avoids unresolved bare imports in module workers.

`node --use-env-proxy scripts/verify-urdu-stt.mjs` runs an actual pinned base model with the same Urdu decoding options on CPU. It creates synthetic Urdu audio locally, then decodes it. The tested reference was `پانی کی ضرورت کتنی ہے؟`; the observed transcript was `پانی کی مرورت کی تھی ہے`. This proves model execution and Urdu-script output, **not accuracy**. Human Pakistani speakers, accents, farm vocabulary, numeric dictation, noise and low-end mobile browser performance remain unvalidated. Review/edit is necessary; do not label the recogniser farmer-validated, fine-tuned or error-free.

Real-browser microphone, WebAssembly and audio-codec flows remain unverified because the managed browser QA tooling is unavailable. The integration command uses Node CPU inference; it is distinct from a browser test. Optional read-aloud remains documented in [SPEECH.md](SPEECH.md).
