// Link previews for shared posts (WhatsApp, Messages, Facebook…).
// Those apps read the page's tags without running the app, so /p/<post id> answers with
// the post's own photo and words, then sends people on to the post inside Wepawao.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s }

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const lang = req.query.lang === 'es' ? 'es' : 'en'
  const site = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  // Keep the sharer's id (ref) so the visitor is credited to them if they join.
  const ref = UUID_RE.test(String(req.query.ref || '')) ? `&ref=${req.query.ref}` : ''
  const target = UUID_RE.test(id) ? `${site}/?post=${id}&lang=${lang}${ref}` : `${site}/?lang=${lang}${ref}`
  const es = lang === 'es'
  let title = 'Wepawao'
  let desc = es ? 'Nueva red social, ¡nuevos Momentos IA combinados para recordar!' : 'New Social Media, new AI Moments combined to remember!'
  let image = `${site}/wepawao-share.jpg`
  let big = true

  const SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (UUID_RE.test(id) && SB && KEY) {
    try {
      const r = await fetch(`${SB}/rest/v1/posts?id=eq.${id}&status=eq.active&select=title,body,image_path,image_paths,ai_moment,profiles!posts_user_id_fkey(display_name)`, {
        // New-style keys (sb_publishable_…) go only in the apikey header; older keys also as Bearer.
        headers: KEY.startsWith('sb_') ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` },
        signal: AbortSignal.timeout(4000),
      })
      const p = r.ok ? (await r.json())[0] : null
      if (p) {
        const who = p.profiles?.display_name
        const imgs = p.image_paths?.length ? p.image_paths : p.image_path ? [p.image_path] : []
        const ai = p.ai_moment && imgs.length > 1
        title = ai
          ? (es ? `Caricatura ✨${who ? ` de ${who}` : ''} · Wepawao` : `${who ? `${who}'s ` : ''}caricature ✨ · Wepawao`)
          : `${p.title || (who ? (es ? `Momento de ${who}` : `${who}'s moment`) : 'Wepawao')} · Wepawao`
        if (p.body || p.title) desc = clip(p.body || p.title, 180)
        const pick = ai ? imgs[1] : imgs[0]
        if (pick) { image = `${SB}/storage/v1/object/public/photos/${pick.split('/').map(encodeURIComponent).join('/')}`; big = true }
      }
    } catch { /* fall back to the general Wepawao preview */ }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(`<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Wepawao">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(`${site}/p/${id}?lang=${lang}`)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="${big ? 'summary_large_image' : 'summary'}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
</head><body style="font-family:system-ui,sans-serif;background:#14123a;color:#fff;text-align:center;padding:40px">
<p>Wepawao…</p><p><a style="color:#f6d155" href="${esc(target)}">${es ? 'Abrir el momento' : 'Open the moment'}</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body></html>`)
}
