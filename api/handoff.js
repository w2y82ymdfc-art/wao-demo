// iPhone home-screen handoff.
// On iPhone, the Wepawao icon on the home screen keeps its own sign-in, separate from Safari.
// So a member who joined in Safari would be asked to sign in again the first time they open the icon.
// To avoid that, right before the member adds the icon, Safari asks this endpoint for a one-time
// sign-in code for that same member. The code is built into the icon's start address (see api/manifest.js),
// and the first tap on "Continue" inside the icon trades it for the icon's own session.
//
// The code works once and expires with Supabase's email link setting (1 hour by default).
// Needs SUPABASE_SERVICE_ROLE_KEY in Vercel (Settings → Environment Variables). Without it, this answers 503
// and the icon simply falls back to the normal sign-in.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SB || !KEY || !SERVICE) return res.status(503).json({ error: 'not set up' })

  // Only the signed-in member can get a code, and only for themselves.
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'sign in' })
  let email
  try {
    const who = await fetch(`${SB}/auth/v1/user`, {
      headers: { apikey: KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!who.ok) return res.status(401).json({ error: 'sign in' })
    email = (await who.json())?.email
  } catch {
    return res.status(503).json({ error: 'try later' })
  }
  if (!email) return res.status(400).json({ error: 'no email' })

  try {
    // New-style secret keys (sb_secret_…) go only in the apikey header; older keys also as Bearer.
    const headers = SERVICE.startsWith('sb_')
      ? { apikey: SERVICE, 'Content-Type': 'application/json' }
      : { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }
    const r = await fetch(`${SB}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'magiclink', email }),
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) return res.status(503).json({ error: 'try later' })
    const j = await r.json()
    const code = j?.hashed_token || j?.properties?.hashed_token
    if (!code) return res.status(503).json({ error: 'try later' })
    return res.status(200).json({ code })
  } catch {
    return res.status(503).json({ error: 'try later' })
  }
}
