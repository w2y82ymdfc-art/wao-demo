// Ad check for public moments, run before posting.
// Answers one question with AI: is this a member's personal moment or recommendation (fine),
// or a business promoting itself (ads on Wepawao are paid)?
// It never blocks anything by itself: the app shows the member a friendly notice and lets them choose.
//
// Needs GEMINI_API_KEY in Vercel (Settings → Environment Variables). Without it, the check is skipped
// and only the free word rules in the app run. Optional: AD_CHECK_MODEL to pick another Gemini model.

const MAX_TEXT = 1200
const MAX_IMAGE_B64 = 400_000 // ~300 KB; the app sends a small thumbnail

const PROMPT = `You review posts for Wepawao, a social network in Puerto Rico (posts in Spanish or English).
Members may freely share moments and recommend places they visited ("I ate here, I recommend it").
What is NOT allowed for free is a business promoting itself: advertising specials, offers, discounts, prices,
opening hours, delivery or ordering, "come today", "follow us", "visit our store", a promo flyer or menu board as
the main image, or text written in a business's own voice ("our customers", "we are waiting for you").
A photo that simply shows a business sign or logo while a member tells about their visit is NOT an ad.
When unsure, answer false.
Reply only with JSON: {"ad": true|false, "why_es": "<short reason in Spanish, max 12 words>", "why_en": "<same in English>"}`

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  let raw = ''
  for await (const chunk of req) raw += chunk
  return JSON.parse(raw || '{}')
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const GEMINI = process.env.GEMINI_API_KEY
  if (!GEMINI) return res.status(200).json({ ad: false, checked: false })

  // Only signed-in members can use the check (it costs money per call).
  const SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!SB || !KEY || !token) return res.status(401).json({ error: 'sign in' })
  try {
    const who = await fetch(`${SB}/auth/v1/user`, {
      headers: { apikey: KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!who.ok) return res.status(401).json({ error: 'sign in' })
  } catch {
    return res.status(200).json({ ad: false, checked: false })
  }

  let body
  try { body = await readJson(req) } catch { return res.status(400).json({ error: 'bad request' }) }
  const text = String(body.text || '').slice(0, MAX_TEXT)
  const image = typeof body.image === 'string' && body.image.length <= MAX_IMAGE_B64 ? body.image : ''
  if (!text.trim() && !image) return res.status(200).json({ ad: false, checked: false })

  const parts = [{ text: `${PROMPT}\n\nPost text:\n"""${text}"""` }]
  if (image) parts.push({ inline_data: { mime_type: 'image/jpeg', data: image } })

  const model = process.env.AD_CHECK_MODEL || 'gemini-flash-latest'
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 200 },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return res.status(200).json({ ad: false, checked: false })
    const j = await r.json()
    const out = j?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}'
    const v = JSON.parse(out.replace(/^```(json)?|```$/g, '').trim())
    return res.status(200).json({
      ad: v.ad === true,
      checked: true,
      why: { es: String(v.why_es || '').slice(0, 120), en: String(v.why_en || '').slice(0, 120) },
    })
  } catch {
    // If the AI is slow or down, never stop a member from posting.
    return res.status(200).json({ ad: false, checked: false })
  }
}
