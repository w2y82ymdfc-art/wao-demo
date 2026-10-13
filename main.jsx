import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

// Keep the home-screen app up to date.
// An iPhone keeps a home-screen app's old page in memory and does not reload it,
// so it never sees new versions. Whenever Wao! opens or comes back to the screen,
// ask the server which version is current and reload once if it is newer.
if (import.meta.env.PROD) {
  const scriptOf = (html) => (html.match(/\/assets\/index-[\w-]+\.js/) || [])[0]
  const mine = scriptOf(document.documentElement.outerHTML)
  async function checkForUpdate() {
    try {
      const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const latest = scriptOf(await res.text())
      if (!mine || !latest || latest === mine) return
      // Only reload once per new version, so a slow cache can never cause a reload loop.
      if (sessionStorage.getItem('wao-reloaded-for') === latest) return
      sessionStorage.setItem('wao-reloaded-for', latest)
      location.reload()
    } catch { /* offline or storage blocked: keep the current version */ }
  }
  checkForUpdate()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
}
