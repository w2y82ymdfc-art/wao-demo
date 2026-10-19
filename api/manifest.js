// The home-screen app settings (web app manifest) for one member, used by the iPhone handoff.
// Same as the regular /manifest.webmanifest, except the icon's start address carries the member's
// one-time sign-in code and first name, so the icon opens on "Welcome back, <name>. Tap to continue."
// See api/handoff.js for how the code is made.
const CODE_RE = /^[A-Za-z0-9_-]{16,128}$/

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')

  const code = String(req.query.h || '')
  const name = String(req.query.n || '').replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, 30)
  const lang = req.query.lang === 'es' ? 'es' : 'en'

  const start = new URLSearchParams({ lang })
  if (CODE_RE.test(code)) {
    start.set('handoff', code)
    if (name) start.set('n', name)
  }

  res.status(200).send(JSON.stringify({
    name: 'Wepawao',
    short_name: 'Wepawao',
    description: 'New social media, new moments to remember!',
    start_url: `/?${start.toString()}`,
    scope: '/',
    display: 'standalone',
    background_color: '#eef0fc',
    theme_color: '#4a3af0',
    icons: [
      { src: '/wepawao-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/wepawao-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }))
}
