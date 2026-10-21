// Digital menu (beta): /m/<business id> — what diners see when they scan the QR on the table.
// Built here on the server as plain HTML so it opens instantly on any phone and in any app browser
// (Facebook, Instagram, WhatsApp), with no sign-in and no app to load. Prices come straight from
// the business's menu in Wepawao, so a price changed in Mi negocio shows here within a minute.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const T = {
  es: {
    title: (n) => `Menú · ${n}`, other: 'Otros', soldOut: 'Agotado', market: 'Precio del mercado',
    updated: (d) => `Precios al ${d}`, empty: 'Este menú todavía no tiene platos.', notFound: 'Este menú no existe.',
    back: 'Volver a Wepawao', made: 'Menú digital hecho con', join: 'Únete gratis', vip: 'Hazte cliente VIP', vipTop: '★ Hazte cliente VIP: entérate de sus ocasiones especiales', switchTo: 'English', switchLang: 'en',
    desc: (n) => `El menú de ${n}, siempre con los precios al día.`,
  },
  en: {
    title: (n) => `Menu · ${n}`, other: 'Other', soldOut: 'Sold out', market: 'Market price',
    updated: (d) => `Prices as of ${d}`, empty: 'This menu has no dishes yet.', notFound: 'This menu does not exist.',
    back: 'Back to Wepawao', made: 'Digital menu made with', join: 'Join free', vip: 'Become a VIP customer', vipTop: '★ Become a VIP customer: hear about special occasions', switchTo: 'Español', switchLang: 'es',
    desc: (n) => `${n}'s menu, always with up-to-date prices.`,
  },
}

const money = (cents) => `$${(cents / 100).toFixed(2)}`

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const lang = req.query.lang === 'en' ? 'en' : 'es'
  const fromApp = req.query.from === 'app'
  const t = T[lang]
  const site = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  const SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const headers = KEY && KEY.startsWith('sb_') ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` }

  let biz = null
  let items = []
  if (UUID_RE.test(id) && SB && KEY) {
    try {
      const [b, m] = await Promise.all([
        fetch(`${SB}/rest/v1/vip_lists?id=eq.${id}&select=id,name,town,about,owner_id,logo_path`, { headers, signal: AbortSignal.timeout(4000) }),
        fetch(`${SB}/rest/v1/menu_items?list_id=eq.${id}&select=id,category,name,description,price_cents,sold_out,sort,updated_at,image_path,featured,name_en,description_en,category_en&order=sort.asc,created_at.asc`, { headers, signal: AbortSignal.timeout(4000) }),
      ])
      biz = b.ok ? (await b.json())[0] || null : null
      items = m.ok ? await m.json() : []
    } catch { /* shown as "not found" below */ }
  }

  // English menu: each dish's English name, description and category where it has them.
  if (lang === 'en') {
    items = items.map((it) => ({ ...it, name: it.name_en || it.name, description: it.description_en || it.description, category: it.category_en || it.category }))
  }
  // Categories in the order their first dish appears.
  const groups = []
  for (const it of items) {
    const name = (it.category || '').trim() || t.other
    let g = groups.find((x) => x.name === name)
    if (!g) groups.push((g = { name, items: [] }))
    g.items.push(it)
  }
  const last = items.reduce((a, it) => (it.updated_at > a ? it.updated_at : a), '')
  const lastText = last
    ? new Date(last).toLocaleDateString(lang === 'es' ? 'es-PR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Puerto_Rico' })
    : ''

  const photo = (path) => `${(SB || '').replace(/\/$/, '')}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}`
  // Featured dishes with a photo make the slideshow at the top.
  const slides = items.filter((it) => it.featured && it.image_path).slice(0, 6)
  const show = !biz || !slides.length ? '' : `
<div class="show" aria-roledescription="carousel">
  <div class="track" id="track">${slides.map((it) => `
    <a class="slide" href="#d-${esc(it.id)}"><img src="${esc(photo(it.image_path))}" alt="${esc(it.name)}"${slides[0] === it ? '' : ' loading="lazy"'}>
      <span class="cap"><b>${esc(it.name)}</b>${it.sold_out ? `<span class="badge">${t.soldOut}</span>` : (it.price_cents == null ? '' : `<span>${money(it.price_cents)}</span>`)}</span></a>`).join('')}
  </div>
  ${slides.length > 1 ? `<div class="dots">${slides.map((_, i) => `<i data-i="${i}"${i ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}
</div>
${slides.length > 1 ? `<script>(function(){var t=document.getElementById('track'),d=[].slice.call(document.querySelectorAll('.dots i')),n=d.length,i=0,h;
function go(k){i=(k+n)%n;t.scrollTo({left:i*t.clientWidth,behavior:'smooth'})}
t.addEventListener('scroll',function(){var k=Math.round(t.scrollLeft/t.clientWidth);d.forEach(function(e,j){e.className=j===k?'on':''});i=k},{passive:true});
function play(){clearInterval(h);h=setInterval(function(){go(i+1)},4000)}
['touchstart','mousedown'].forEach(function(e){t.addEventListener(e,function(){clearInterval(h);setTimeout(play,8000)},{passive:true})});
d.forEach(function(e,j){e.onclick=function(){go(j);play()}});play()})()</script>` : ''}`

  const logo = biz?.logo_path
    ? (biz.logo_path.startsWith('/') ? `${site}${biz.logo_path}` : `${SB}/storage/v1/object/public/photos/${biz.logo_path.split('/').map(encodeURIComponent).join('/')}`)
    : ''
  const joinUrl = biz?.owner_id ? `${site}/?ref=${biz.owner_id}&lang=${lang}` : `${site}/?lang=${lang}`
  const vipUrl = biz ? `${site}/?vip=${biz.id}&join=1&lang=${lang}` : ''
  const self = `${site}/m/${id}`
  const pageTitle = biz ? t.title(biz.name) : 'Wepawao'

  const body = !biz
    ? `<p class="empty">${t.notFound}</p>`
    : (groups.length
      ? groups.map((g) => `<section><h2>${esc(g.name)}</h2>${g.items.map((it) => `
        <div id="d-${esc(it.id)}" class="item${it.sold_out ? ' out' : ''}${it.image_path ? ' pic' : ''}">
          ${it.image_path ? `<img class="dish" loading="lazy" alt="" src="${esc(photo(it.image_path))}">` : ''}
          <div class="txt"><div class="row"><span class="name">${esc(it.name)}</span><span class="price">${it.sold_out ? `<span class="badge">${t.soldOut}</span>` : (it.price_cents == null ? `<span class="market">${t.market}</span>` : money(it.price_cents))}</span></div>
          ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ''}
        </div></div>`).join('')}</section>`).join('')
      : `<p class="empty">${t.empty}</p>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Short cache so a price change reaches diners within a minute.
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30')
  res.status(biz ? 200 : 404).send(`<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(biz ? t.desc(biz.name) : '')}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Wepawao">
<meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(biz ? t.desc(biz.name) : '')}">
<meta property="og:url" content="${esc(`${self}?lang=${lang}`)}">
<meta property="og:image" content="${esc(logo || `${site}/wepawao-share.jpg`)}">
<meta name="theme-color" content="#14123a">
<link rel="icon" href="/apple-touch-icon.png">
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f5fd;color:#14123a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}
header{background:#14123a;color:#fff;padding:calc(20px + env(safe-area-inset-top)) 18px 22px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;max-width:640px;margin:0 auto}
.biz{display:flex;align-items:center;gap:12px;min-width:0}
.biz img{width:64px;height:64px;border-radius:16px;background:#fff;object-fit:contain;flex-shrink:0}
h1{margin:0;font-size:26px;line-height:1.15;font-weight:900}
.town{color:rgba(255,255,255,.75);font-size:14px;margin-top:2px}
.about{max-width:640px;margin:12px auto 0;color:rgba(255,255,255,.85);font-size:15px}
.back{display:block;max-width:640px;margin:0 auto 14px;color:#fff;font-weight:700;font-size:15px;text-decoration:none}
.viptop{display:block;max-width:640px;margin:14px auto 0;background:#f6d155;color:#14123a;font-weight:800;font-size:14px;text-decoration:none;border-radius:14px;padding:10px 14px;text-align:center}
.lang{display:flex;flex-shrink:0;border:2px solid #f6d155;border-radius:999px;overflow:hidden;font-weight:800;font-size:15px}.lang a,.lang span{padding:6px 13px;text-decoration:none;color:#f6d155}.lang .on{background:#f6d155;color:#14123a}
main{max-width:640px;margin:0 auto;padding:8px 16px 8px}
h2{margin:22px 4px 8px;font-size:13px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#4a3af0}
.item{background:#fff;border:2px solid #e6e8f8;border-radius:18px;padding:14px 16px;margin-bottom:8px}
.pic{display:flex;gap:12px;align-items:flex-start;padding:10px}.pic .txt{flex:1;min-width:0;padding-top:4px}
.dish{width:96px;height:96px;border-radius:14px;object-fit:cover;flex-shrink:0;background:#eef0fc}.out .dish{opacity:.45}
.show{margin:16px 0 4px}.track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;border-radius:20px;scrollbar-width:none}.track::-webkit-scrollbar{display:none}
.slide{position:relative;flex:0 0 100%;scroll-snap-align:start;display:block;aspect-ratio:4/3;color:#fff;text-decoration:none}
.slide img{width:100%;height:100%;object-fit:cover;display:block}
.cap{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:40px 16px 14px;background:linear-gradient(transparent,rgba(20,18,58,.85));font-size:18px;font-weight:900}
.dots{display:flex;justify-content:center;gap:6px;margin-top:10px}.dots i{width:7px;height:7px;border-radius:9px;background:#c9cdf0;cursor:pointer}.dots i.on{width:20px;background:#4a3af0}
.item{scroll-margin-top:16px}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.name{font-weight:800;font-size:17px}
.price{font-weight:900;font-size:17px;white-space:nowrap}
.desc{margin:4px 0 0;color:#5b5f80;font-size:14px;line-height:1.4}
.out .name,.out .desc{color:#9a9db8}.out .name{text-decoration:line-through}
.badge{background:#ffe1e1;color:#b42318;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:800}
.market{font-size:13px;font-weight:700;color:#5b5f80}
.empty{text-align:center;color:#5b5f80;padding:40px 0}
.updated{text-align:center;color:#6b6f93;font-size:13px;margin:16px 0 0}
footer{max-width:640px;margin:16px auto 0;padding:18px 16px calc(28px + env(safe-area-inset-bottom));text-align:center}
.vip{display:block;background:#f6d155;color:#14123a;font-weight:900;text-decoration:none;border-radius:999px;padding:13px;margin-bottom:16px}
.made{display:inline-flex;align-items:center;gap:8px;color:#6b6f93;font-size:13px;text-decoration:none}
.made img{height:22px}.made b{color:#4a3af0}
</style>
</head><body>
<header>
  ${fromApp ? `<a class="back" href="${esc(`${site}/?lang=${lang}`)}">← ${t.back}</a>` : ''}
  <div class="top">
    <div class="biz">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><h1>${esc(biz?.name || 'Wepawao')}</h1>${biz?.town ? `<div class="town">${esc(biz.town)}</div>` : ''}</div></div>
    <div class="lang" role="group" aria-label="Idioma / Language">${['es', 'en'].map((l) => l === lang
      ? `<span class="on" aria-current="true">${l.toUpperCase()}</span>`
      : `<a href="${esc(`${self}?lang=${l}${fromApp ? '&from=app' : ''}`)}">${l.toUpperCase()}</a>`).join('')}</div>
  </div>
  ${biz?.about ? `<p class="about">${esc(biz.about)}</p>` : ''}
  ${biz ? `<a class="viptop" href="${esc(vipUrl)}">${t.vipTop}</a>` : ''}
</header>
<main>${show}${body}
${lastText ? `<p class="updated">${t.updated(esc(lastText))}</p>` : ''}
</main>
<footer>
  ${biz ? `<a class="vip" href="${esc(vipUrl)}">${t.vip}</a>` : ''}
  <a class="made" href="${esc(joinUrl)}">${t.made} <img src="/wepawao-wordmark.png" alt="Wepawao"> · <b>${t.join}</b></a>
</footer>
</body></html>`)
}
