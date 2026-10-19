import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The repo is flat (no folders), so these files are published at the site root by this plugin.
const STATIC_FILES = ['wepawao-share.jpg', 'wepawao-icon-192.png', 'wepawao-icon-512.png', 'apple-touch-icon.png']

// Full site address for link previews (WhatsApp needs a full https:// address). Vercel provides it at build time.
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || ''
const SITE = host ? `https://${host}` : ''

const MANIFEST = {
  name: 'Wepawao',
  short_name: 'Wepawao',
  description: 'New social media, new moments to remember!',
  // No start_url: an iPhone then saves the page address at "Add to Home Screen",
  // which carries the member's one-time sign-in code (see useHomeScreenHandoff in App.jsx).
  display: 'standalone',
  background_color: '#eef0fc',
  theme_color: '#4a3af0',
  icons: [
    { src: '/wepawao-icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/wepawao-icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}

function wepawaoSiteFiles() {
  return {
    name: 'wepawao-site-files',
    generateBundle() {
      for (const f of STATIC_FILES) this.emitFile({ type: 'asset', fileName: f, source: readFileSync(f) })
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(MANIFEST, null, 2) })
    },
    // Runs last, so Vite leaves these links exactly as written.
    transformIndexHtml: {
      order: 'post',
      handler: () => HEAD_TAGS.map(([tag, attrs]) => ({ tag, attrs, injectTo: 'head' })),
    },
  }
}

const meta = (k, v, content) => ['meta', { [k]: v, content }]
const HEAD_TAGS = [
  meta('name', 'description', 'New social media. AI moments worth remembering. No algorithm. Newest first. Always.'),
  // Link preview (WhatsApp, iMessage, Facebook, X)
  meta('property', 'og:type', 'website'),
  meta('property', 'og:site_name', 'Wepawao'),
  meta('property', 'og:title', 'Wepawao · New social media. AI moments worth remembering.'),
  meta('property', 'og:description', 'Your photo + AI = your AI Moment. Nueva red social, ¡nuevos Momentos IA combinados para recordar!'),
  meta('property', 'og:url', `${SITE}/`),
  meta('property', 'og:image', `${SITE}/wepawao-share.jpg`),
  meta('property', 'og:image:width', '1200'),
  meta('property', 'og:image:height', '630'),
  meta('property', 'og:image:alt', 'A woman in her home kitchen and her AI caricature as the owner of her own bakery'),
  meta('name', 'twitter:card', 'summary_large_image'),
  meta('name', 'twitter:image', `${SITE}/wepawao-share.jpg`),
  // Home-screen app
  ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
  ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  ['link', { rel: 'icon', type: 'image/png', href: '/wepawao-icon-192.png' }],
  meta('name', 'theme-color', '#4a3af0'),
  meta('name', 'apple-mobile-web-app-capable', 'yes'),
  // Home-screen app: keep the page below the iPhone status bar instead of under the clock.
  meta('name', 'apple-mobile-web-app-status-bar-style', 'default'),
  meta('name', 'mobile-web-app-capable', 'yes'),
  meta('name', 'apple-mobile-web-app-title', 'Wepawao'),
]

export default defineConfig({ plugins: [react(), tailwindcss(), wepawaoSiteFiles()] })
