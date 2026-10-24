// Link previews for one VIP event (Facebook, WhatsApp, Messages…).
// /e/<message id> shows the event's own photo and title, says it was published on Wepawao,
// then sends people on to the business's VIP page in Wepawao, where the event is and they can join.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const lang = req.query.lang === 'en' ? 'en' : 'es'
  const es = lang === 'es'
  const site = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  let target = `${site}/?lang=${lang}`
  let title = 'Wepawao'
  let desc = es ? 'Publicado en Wepawao.' : 'Published on Wepawao.'
  let image = `${site}/wepawao-share.jpg`
  let big = true

  const SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const headers = KEY && KEY.startsWith('sb_') ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` }
  const photo = (path) => `${(SB || '').replace(/\/$/, '')}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}`
  if (UUID_RE.test(id) && SB && KEY) {
    try {
      const r = await fetch(`${SB}/rest/v1/vip_messages?id=eq.${id}&select=title,when_text,image_path,list_id`, { headers, signal: AbortSignal.timeout(4000) })
      const m = r.ok ? (await r.json())[0] : null
      if (m && UUID_RE.test(m.list_id || '')) {
        const r2 = await fetch(`${SB}/rest/v1/vip_lists?id=eq.${m.list_id}&select=name,logo_path,owner_id`, { headers, signal: AbortSignal.timeout(4000) })
        const l = r2.ok ? (await r2.json())[0] : null
        target = `${site}/?vip=${m.list_id}&join=1${UUID_RE.test(l?.owner_id || '') ? `&ref=${l.owner_id}` : ''}&lang=${lang}`
        const name = l?.name || ''
        title = name ? `${m.title} · ${name}` : m.title
        const when = m.when_text ? `${m.when_text} · ` : ''
        desc = es
          ? `${when}Publicado en Wepawao. Únete gratis a la lista VIP${name ? ` de ${name}` : ''} y entérate de sus ocasiones especiales.`
          : `${when}Published on Wepawao. Join ${name ? `${name}'s` : 'the'} VIP list free and hear about its special occasions.`
        // Shared "with celebration": the confetti copy made on the phone (only that kind of picture is accepted).
        const img = String(req.query.img || '')
        if (/^[0-9a-f-]{36}\/vip-cel-[A-Za-z0-9-]+\.jpg$/i.test(img)) image = photo(img)
        else if (m.image_path) image = photo(m.image_path)
        else if (l?.logo_path) {
          image = l.logo_path.startsWith('/') ? `${site}${l.logo_path}` : photo(l.logo_path)
          big = false
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
<meta property="og:url" content="${esc(`${site}/e/${id}?lang=${lang}${req.query.img ? `&img=${encodeURIComponent(String(req.query.img))}` : ''}`)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="${big ? 'summary_large_image' : 'summary'}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
</head><body style="font-family:system-ui,sans-serif;background:#14123a;color:#fff;text-align:center;padding:40px">
<p>Wepawao…</p><p><a style="color:#f6d155" href="${esc(target)}">${es ? 'Ver en Wepawao' : 'See it on Wepawao'}</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body></html>`)
}
