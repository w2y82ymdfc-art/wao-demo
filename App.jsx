import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ---------- lib/supabase.js ----------
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ---------- lib/constants.js ----------
const KINDS = [
  { value: 'update', label: 'Update' },
  { value: 'offer', label: 'Offer' },
  { value: 'request', label: 'Request' },
]

const CATEGORIES = ['general', 'produce', 'tools', 'services', 'household', 'free']

// ---------- lib/image.js ----------
// Shrinks a photo in the browser (max 1600px wide, JPEG) so uploads stay fast on phones.
async function resizeImage(file, maxW = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality)
  )
}

// ---------- components/SignIn.jsx ----------
function SignIn() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    // Optional referral link: https://yoursite/?ref=<profile uuid> (feeds profiles.referred_by)
    const ref = new URLSearchParams(window.location.search).get('ref')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { display_name: name || undefined, referred_by: ref || undefined } },
    })
    setMsg(error ? error.message : 'Check your email for a sign-in link.')
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-2 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Join or sign in</h2>
      <input className="w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Your name (new members)"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="w-full rounded-lg border border-stone-300 px-3 py-2" type="email" required placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="rounded-lg bg-stone-900 px-4 py-2 text-white hover:bg-stone-700">Email me a link</button>
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </form>
  )
}

// ---------- components/PostForm.jsx ----------
const empty = { kind: 'update', category: 'general', title: '', body: '', price: '', location_text: '' }

function PostForm({ userId, onPosted }) {
  const [f, setF] = useState(empty)
  const [attachGeo, setAttachGeo] = useState(false)
  const [photo, setPhoto] = useState(null) // { blob, url }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const isListing = f.kind !== 'update'

  const getCoords = () =>
    new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({}),
        { timeout: 8000 }
      )
    )

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const blob = await resizeImage(file)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setError('Could not read that image.')
    }
  }

  function clearPhoto() {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const postId = crypto.randomUUID()
    let path = null
    try {
      if (photo) {
        path = `${userId}/${postId}.jpg`
        const { error: upErr } = await supabase.storage.from('photos').upload(path, photo.blob, { contentType: 'image/jpeg' })
        if (upErr) throw upErr
      }
      const geo = attachGeo ? await getCoords() : {}
      const { error: postErr } = await supabase.from('posts').insert({
        id: postId,
        user_id: userId,
        kind: f.kind,
        category: f.category,
        title: f.title || null,
        body: f.body,
        price_cents: isListing && f.price !== '' ? Math.round(parseFloat(f.price) * 100) : null,
        location_text: f.location_text || null,
        image_path: path,
        ...geo,
      })
      if (postErr) throw postErr
      setF(empty)
      clearPhoto()
      onPosted()
    } catch (err) {
      if (path) supabase.storage.from('photos').remove([path]) // don't leave orphan files behind
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-lg border border-stone-300 px-3 py-2'

  return (
    <form onSubmit={submit} className="mb-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex gap-2">
        {KINDS.map((k) => (
          <button type="button" key={k.value} onClick={() => setF({ ...f, kind: k.value })}
            className={`rounded-full px-3 py-1 text-sm ${f.kind === k.value ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
            {k.label}
          </button>
        ))}
      </div>

      {isListing && <input className={input} placeholder="Title (e.g. Free tomato seedlings)" value={f.title} onChange={set('title')} maxLength={120} />}
      <textarea className={input} rows={3} required placeholder={isListing ? 'Describe it…' : "What's happening in your neighborhood?"}
        value={f.body} onChange={set('body')} maxLength={500} />

      {photo && (
        <div className="relative">
          <img src={photo.url} alt="Selected" className="max-h-64 w-full rounded-lg object-cover" />
          <button type="button" onClick={clearPhoto} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white">Remove</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.category} onChange={set('category')}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {isListing && <input className={input} type="number" min="0" step="0.01" placeholder="Price (blank = free/swap)" value={f.price} onChange={set('price')} />}
      </div>

      <input className={input} placeholder="Area (e.g. Southeast Portland)" value={f.location_text} onChange={set('location_text')} />
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={attachGeo} onChange={(e) => setAttachGeo(e.target.checked)} />
        Attach my approximate location so nearby people can find this
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full border-2 border-emerald-700 px-4 py-1.5 font-medium text-emerald-700">
          Add photo
        </button>
        <button disabled={busy} className="ml-auto rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-600 disabled:opacity-50">
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}

// ---------- components/Feed.jsx ----------
const PAGE = 20

function Feed({ refreshKey }) {
  const [filters, setFilters] = useState({ kind: '', category: '', radius: '' })
  const [coords, setCoords] = useState(null)
  const [posts, setPosts] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPage = useCallback(
    async (cursor) => {
      const useRadius = coords && filters.radius
      const { data, error } = await supabase.rpc('get_feed', {
        p_kind: filters.kind || null,
        p_category: filters.category || null,
        p_lat: coords?.lat ?? null,
        p_lng: coords?.lng ?? null,
        p_radius_km: useRadius ? Number(filters.radius) : null,
        p_before_created_at: cursor?.created_at ?? null,
        p_before_id: cursor?.id ?? null,
        p_limit: PAGE,
      })
      if (error) throw error
      return data
    },
    [filters, coords]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchPage(null)
      .then((rows) => { if (!cancelled) { setPosts(rows); setHasMore(rows.length === PAGE) } })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [fetchPage, refreshKey])

  async function loadMore() {
    const last = posts[posts.length - 1]
    try {
      const rows = await fetchPage({ created_at: last.created_at, id: last.id })
      setPosts([...posts, ...rows])
      setHasMore(rows.length === PAGE)
    } catch (e) { setError(e.message) }
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setFilters((f) => ({ ...f, radius: f.radius || '25' })) },
      () => setError('Could not get your location.')
    )
  }

  const sel = 'rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm'

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className={sel} value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })}>
          <option value="">All types</option>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select className={sel} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {coords ? (
          <>
            <select className={sel} value={filters.radius} onChange={(e) => setFilters({ ...filters, radius: e.target.value })}>
              {[5, 10, 25, 50, 100].map((r) => <option key={r} value={r}>Within {r} km</option>)}
            </select>
            <button className="text-sm text-stone-500 underline" onClick={() => { setCoords(null); setFilters({ ...filters, radius: '' }) }}>clear</button>
          </>
        ) : (
          <button className={sel} onClick={useMyLocation}>Near me</button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-stone-500">Loading…</p>}
      {!loading && posts.length === 0 && <p className="text-stone-500">Nothing here yet — be the first to post.</p>}

      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-stone-500">
              <span className="font-medium text-stone-800">{p.author_display_name}</span>
              <span>@{p.author_username}</span>
              <span>·</span>
              <time title={new Date(p.created_at).toLocaleString()}>{new Date(p.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-stone-900 px-2 py-0.5 text-white">{p.kind}</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5">{p.category}</span>
              {p.price_cents != null && <span className="rounded-full bg-amber-100 px-2 py-0.5">{p.price_cents === 0 ? 'Free' : `$${(p.price_cents / 100).toFixed(2)}`}</span>}
              {p.location_text && <span className="rounded-full bg-stone-100 px-2 py-0.5">{p.location_text}</span>}
              {p.distance_km != null && <span className="rounded-full bg-emerald-100 px-2 py-0.5">{p.distance_km.toFixed(1)} km</span>}
            </div>
            {p.title && <h3 className="font-semibold">{p.title}</h3>}
            <p className="whitespace-pre-wrap text-stone-800">{p.body}</p>
            {p.image_path && (
              <img loading="lazy" alt="" className="mt-3 max-h-96 w-full rounded-lg object-cover"
                src={supabase.storage.from('photos').getPublicUrl(p.image_path).data.publicUrl} />
            )}
          </li>
        ))}
      </ul>

      {hasMore && !loading && (
        <button onClick={loadMore} className="mt-4 w-full rounded-lg border border-stone-300 bg-white py-2 hover:bg-stone-100">Load more</button>
      )}
    </section>
  )
}

// ---------- App.jsx ----------
export default function App() {
  const [session, setSession] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <header className="flex items-center justify-between py-5">
        <h1 className="text-2xl font-bold tracking-tight">Wao!</h1>
        {session && (
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-stone-500 hover:text-stone-900">
            Sign out
          </button>
        )}
      </header>

      <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        Newest first. Always. No boosts, no hidden ranking — filters only narrow the list.
      </p>

      {session ? <PostForm userId={session.user.id} onPosted={() => setRefreshKey((k) => k + 1)} /> : <SignIn />}

      <Feed refreshKey={refreshKey} />
    </div>
  )
}
