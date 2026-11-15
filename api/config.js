/**
 * Hands the browser a Deepgram key for live speech-to-text.
 *
 * The key is scoped to `listen` only — it cannot read projects or mint grants,
 * so the worst a leaked copy buys is transcription on our account. The
 * alternative, a short-lived token from /v1/auth/grant, needs a scope this key
 * does not have.
 *
 * When the variable is unset the endpoint returns an empty string and the app
 * falls back to the browser's own SpeechRecognition, so voice degrades rather
 * than breaks.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ deepgramKey: process.env.DEEPGRAM_API_KEY || '' });
}
