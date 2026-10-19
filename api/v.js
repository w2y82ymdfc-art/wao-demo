// Link previews for a business's VIP page (WhatsApp, Messages, Facebook…).
// /v/<list id> answers with the business's own name and logo, then sends people on to its VIP page in Wepawao.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const lang = req.query.lang === 'en' ? 'en' : 'es'
  const es = lang === 'es'
  const site = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  const target = UUID_RE.test(id) ? `${site}/?vip=${id}&lang=${lang}` : `${site}/?lang=${lang}`
  let title = es ? 'Clientes VIP · Wepawao' : 'VIP Customers · Wepawao'
  const desc = es
    ? 'Para nosotros, cada cliente es VIP. Únete gratis y te enviaremos un mensaje cuando haya una ocasión especial.'
    : "For us, every customer is VIP. Join free and we will send you a message when a special occasion comes."
  let image = `${site}/wepawao-share.jpg`
  let big = true

  const SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (UUID_RE.test(id) && SB && KEY) {
    try {
      const r = await fetch(`${SB}/rest/v1/vip_lists?id=eq.${id}&select=name,logo_path`, {
        headers: KEY.startsWith('sb_') ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` },
        signal: AbortSignal.timeout(4000),
      })
      const l = r.ok ? (await r.json())[0] : null
      if (l) {
        title = es ? `Únete gratis a la lista VIP de ${l.name}` : `Join ${l.name}'s VIP list, free`
        if (l.logo_path) {
          // Logos prepared by the Wepawao Team ship with the site; owners' uploads live in storage.
          image = l.logo_path.startsWith('/')
            ? `${site}${l.logo_path}`
            : `${SB}/storage/v1/object/public/photos/${l.logo_path.split('/').map(encodeURIComponent).join('/')}`
          big = false // a square logo reads best as a small card
        }
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wepawao">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(`${site}/v/${id}?lang=${lang}`)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="${big ? 'summary_large_image' : 'summary'}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
</head><body style="font-family:system-ui,sans-serif;background:#14123a;color:#fff;text-align:center;padding:40px">
<p>Wepawao…</p><p><a style="color:#f6d155" href="${esc(target)}">${es ? 'Abrir la lista VIP' : 'Open the VIP list'}</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body></html>`)
}
