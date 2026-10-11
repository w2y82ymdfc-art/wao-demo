import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ---------- Supabase ----------
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
const BUCKET = 'photos'
const PAGE = 20
const CATEGORIES = ['general', 'produce', 'tools', 'services', 'household', 'free']
const TABS = [
  ['everyone', 'Everyone'], ['following', 'Following'], ['mine', 'My posts'],
  ['discover', 'Discover'], ['offer', 'My offer'], ['promise', 'Our promise'],
]

// ---------- Shared styles ----------
const card = 'rounded-3xl border-2 border-[#dcdff5] bg-white p-5'
const field = 'w-full rounded-2xl border-2 border-[#dcdff5] bg-[#eef0fc] px-4 py-3 text-[#14123a] placeholder:text-stone-400'
const primary = 'rounded-full bg-[#4a3af0] px-6 py-3 font-bold text-white disabled:bg-[#b4adf8]'
const ghost = 'rounded-full border-2 border-[#4a3af0] px-5 py-2 font-bold text-[#4a3af0]'
const chip = 'rounded-full bg-[#e8e9fb] px-2.5 py-0.5 text-xs text-[#14123a]'

// ---------- Helpers ----------
const photoUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
const when = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const money = (c) => (c == null ? null : c === 0 ? 'Free' : `$${(c / 100).toFixed(2)}`)

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

// Posts by specific authors (Following / My posts / My offer). Always newest first.
async function fetchByAuthors(ids, cursor, kind) {
  if (!ids.length) return []
  let q = supabase
    .from('posts')
    .select('id,user_id,kind,category,title,body,price_cents,location_text,image_path,created_at')
    .in('user_id', ids)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE)
  if (kind) q = q.eq('kind', kind)
  if (cursor) q = q.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
  const { data, error } = await q
  if (error) throw error
  const authorIds = [...new Set(data.map((r) => r.user_id))]
  const { data: profs, error: e2 } = authorIds.length
    ? await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', authorIds)
    : { data: [] }
  if (e2) throw e2
  const byId = Object.fromEntries(profs.map((p) => [p.id, p]))
  return data.map((r) => ({
    ...r,
    author_username: byId[r.user_id]?.username,
    author_display_name: byId[r.user_id]?.display_name,
  }))
}

// ---------- Sign in ----------
function SignIn() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    const ref = new URLSearchParams(window.location.search).get('ref')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { display_name: name || undefined, referred_by: ref || undefined } },
    })
    setMsg(error ? error.message : 'Check your email for a sign-in link.')
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h2 className="text-xl font-bold">Join or sign in</h2>
      <input className={field} placeholder="Your name (new members)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={field} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className={primary}>Email me a link</button>
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </form>
  )
}

// ---------- Composer ----------
function Composer({ userId, mode, onPosted }) {
  const base = mode === 'offer' ? 'offer' : 'update'
  const [kind, setKind] = useState(base)
  const [f, setF] = useState({ category: 'general', title: '', body: '', price: '', area: '' })
  const [geo, setGeo] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const detailed = kind !== 'update'

  useEffect(() => setKind(base), [base])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const coords = () =>
    new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({}),
        { timeout: 8000 }
      )
    )

  async function pick(e) {
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
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, photo.blob, { contentType: 'image/jpeg' })
        if (upErr) throw upErr
      }
      const where = geo ? await coords() : {}
      const { error: postErr } = await supabase.from('posts').insert({
        id: postId,
        user_id: userId,
        kind,
        category: detailed ? f.category : 'general',
        title: detailed ? f.title || null : null,
        body: f.body.trim(),
        price_cents: kind === 'offer' && f.price !== '' ? Math.round(parseFloat(f.price) * 100) : null,
        location_text: detailed ? f.area || null : null,
        image_path: path,
        ...where,
      })
      if (postErr) throw postErr
      setF({ category: 'general', title: '', body: '', price: '', area: '' })
      setGeo(false)
      clearPhoto()
      onPosted()
    } catch (err) {
      if (path) supabase.storage.from(BUCKET).remove([path])
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      {mode === 'update' && (
        <div className="flex gap-2">
          {[['update', 'Update'], ['request', 'Request']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 font-semibold ${kind === k ? 'bg-[#4a3af0] text-white' : 'bg-[#e8e9fb] text-[#4a3af0]'}`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {mode === 'offer' && <h2 className="text-xl font-bold">List something to offer</h2>}

      {detailed && <input className={field} maxLength={120} placeholder={kind === 'offer' ? 'What are you offering?' : 'What do you need?'} value={f.title} onChange={set('title')} />}
      <textarea className={`${field} min-h-24`} required maxLength={500}
        placeholder={mode === 'offer' ? 'Describe it…' : kind === 'request' ? 'Tell people more…' : "What's your Wao! moment?"}
        value={f.body} onChange={set('body')} />

      {detailed && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={f.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {kind === 'offer' && <input className={field} type="number" min="0" step="0.01" placeholder="Price (blank = free/swap)" value={f.price} onChange={set('price')} />}
          </div>
          <input className={field} placeholder="Area (e.g. Southeast Portland)" value={f.area} onChange={set('area')} />
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={geo} onChange={(e) => setGeo(e.target.checked)} />
            Attach my approximate location so nearby people can find this
          </label>
        </>
      )}

      {photo && (
        <div className="relative">
          <img src={photo.url} alt="Selected" className="max-h-64 w-full rounded-2xl object-cover" />
          <button type="button" onClick={clearPhoto} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">Remove</button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button type="button" className={ghost} onClick={() => fileRef.current?.click()}>Add photo</button>
        <span className="text-sm text-stone-500">{f.body.length} / 500</span>
        <button disabled={busy || !f.body.trim()} className={`${primary} ml-auto`}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </form>
  )
}

// ---------- Follow button ----------
function FollowButton({ userId, following, onToggle }) {
  const on = following.has(userId)
  return (
    <button onClick={() => onToggle(userId)}
      className={`rounded-full border-2 border-[#4a3af0] px-3 py-1 text-sm font-semibold ${on ? 'bg-[#4a3af0] text-white' : 'text-[#4a3af0]'}`}>
      {on ? 'Following' : 'Follow'}
    </button>
  )
}

// ---------- Feed ----------
function Feed({ mode, session, following, onToggleFollow, refreshKey }) {
  const me = session?.user.id
  const [filters, setFilters] = useState({ kind: 'offer', category: '', radius: '25' })
  const [coords, setCoords] = useState(null)
  const [posts, setPosts] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const followKey = [...following].sort().join(',')
  const needsLogin = ['following', 'mine', 'offer'].includes(mode) && !me

  const fetchPage = useCallback(async (cursor) => {
    if (mode === 'following') return fetchByAuthors([...following], cursor)
    if (mode === 'mine') return fetchByAuthors([me], cursor)
    if (mode === 'offer') return fetchByAuthors([me], cursor, 'offer')
    const disc = mode === 'discover'
    const { data, error } = await supabase.rpc('get_feed', {
      p_kind: disc ? filters.kind : null,
      p_category: disc && filters.category ? filters.category : null,
      p_lat: disc && coords ? coords.lat : null,
      p_lng: disc && coords ? coords.lng : null,
      p_radius_km: disc && coords ? Number(filters.radius) : null,
      p_before_created_at: cursor?.created_at ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: PAGE,
    })
    if (error) throw error
    return data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, filters, coords, me, followKey])

  useEffect(() => {
    if (needsLogin) { setPosts([]); setHasMore(false); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError('')
    fetchPage(null)
      .then((rows) => { if (!cancelled) { setPosts(rows); setHasMore(rows.length === PAGE) } })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [fetchPage, refreshKey, needsLogin])

  async function loadMore() {
    const last = posts[posts.length - 1]
    try {
      const rows = await fetchPage({ created_at: last.created_at, id: last.id })
      setPosts([...posts, ...rows])
      setHasMore(rows.length === PAGE)
    } catch (e) { setError(e.message) }
  }

  function nearMe() {
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError('Could not get your location.')
    )
  }

  const empty = {
    following: 'Follow people to see their posts here, newest first.',
    mine: 'You have not posted yet.',
    offer: 'You have no offers yet. List one above!',
  }[mode] || 'Nothing here yet. Be the first to post!'
  const sel = 'rounded-full border-2 border-[#dcdff5] bg-white px-3 py-1.5 text-sm'

  return (
    <section className="space-y-4">
      {mode === 'discover' && (
        <div className={`${card} space-y-2`}>
          <div className="flex flex-wrap items-center gap-2">
            {[['offer', 'Offers'], ['request', 'Requests']].map(([k, l]) => (
              <button key={k} onClick={() => setFilters({ ...filters, kind: k })}
                className={`rounded-full px-4 py-1.5 font-semibold ${filters.kind === k ? 'bg-[#4a3af0] text-white' : 'bg-[#e8e9fb] text-[#4a3af0]'}`}>{l}</button>
            ))}
            <select className={sel} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {coords ? (
              <>
                <select className={sel} value={filters.radius} onChange={(e) => setFilters({ ...filters, radius: e.target.value })}>
                  {[5, 10, 25, 50, 100].map((r) => <option key={r} value={r}>Within {r} km</option>)}
                </select>
                <button className="text-sm text-stone-500 underline" onClick={() => setCoords(null)}>clear</button>
              </>
            ) : <button className={sel} onClick={nearMe}>Near me</button>}
          </div>
          <p className="text-sm text-stone-500">Browse by type, category and distance. Always newest first.</p>
        </div>
      )}

      {needsLogin && <div className={`${card} text-stone-600`}>Sign in to see this.</div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !needsLogin && <p className="text-stone-500">Loading…</p>}
      {!loading && !needsLogin && posts.length === 0 && <div className={`${card} text-stone-600`}>{empty}</div>}

      {posts.map((p) => (
        <article key={p.id} className={card}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8e9fb] font-bold text-[#4a3af0]">
              {(p.author_display_name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate"><b>{p.author_display_name}</b> <span className="text-sm text-stone-500">@{p.author_username}</span></div>
              <time className="text-xs text-stone-500">{when(p.created_at)}</time>
            </div>
            {me && p.user_id !== me && <FollowButton userId={p.user_id} following={following} onToggle={onToggleFollow} />}
          </div>
          {p.title && <h3 className="mt-3 text-lg font-bold">{p.title}</h3>}
          <p className="mt-2 whitespace-pre-wrap">{p.body}</p>
          {p.image_path && <img loading="lazy" alt="" src={photoUrl(p.image_path)} className="mt-3 max-h-96 w-full rounded-2xl object-cover" />}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`${chip} !bg-[#4a3af0] !text-white`}>{p.kind}</span>
            <span className={chip}>{p.category}</span>
            {money(p.price_cents) && <span className={`${chip} !bg-[#f6d155]`}>{money(p.price_cents)}</span>}
            {p.location_text && <span className={chip}>{p.location_text}</span>}
            {p.distance_km != null && <span className={`${chip} !bg-emerald-100`}>{p.distance_km.toFixed(1)} km</span>}
          </div>
        </article>
      ))}

      {hasMore && !loading && (
        <button onClick={loadMore} className="w-full rounded-full border-2 border-[#dcdff5] bg-white py-3 font-semibold">Load more</button>
      )}
    </section>
  )
}

// ---------- People on Wao! ----------
function People({ session, following, onToggleFollow }) {
  const me = session?.user.id
  const [people, setPeople] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('id,username,display_name,location_text,created_at')
      .order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => setPeople(data || []))
  }, [])
  return (
    <div className={card}>
      <h2 className="mb-3 text-xl font-bold">People on Wao!</h2>
      <div className="space-y-3">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8e9fb] font-bold text-[#4a3af0]">{(p.display_name || '?')[0].toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate"><b>{p.display_name}</b> <span className="text-sm text-stone-500">@{p.username}</span></div>
              {p.location_text && <div className="text-xs text-stone-500">{p.location_text}</div>}
            </div>
            {me && p.id !== me && <FollowButton userId={p.id} following={following} onToggle={onToggleFollow} />}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-stone-500">Newest members first.</p>
    </div>
  )
}

// ---------- Our promise ----------
function OurPromise() {
  const items = [
    ['No black boxes.', "Your feed is newest first. We don't rank, score, or reorder it."],
    ['Nothing for sale in the feed.', 'No boosts, no sponsored posts, no pay-to-play.'],
    ['Filters you control.', 'Category and distance only narrow the list. They never reshuffle it.'],
    ['Easy for everyone.', 'Share an update or list something in under a minute.'],
    ['Your email stays private.', 'It is never shown on your public profile.'],
  ]
  return (
    <div className={card}>
      <h2 className="mb-4 text-xl font-bold">Our promise</h2>
      {items.map(([t, d], i) => (
        <p key={t} className="mb-3 flex gap-3"><b className="text-[#4a3af0]">{i + 1}.</b><span><b>{t}</b> {d}</span></p>
      ))}
    </div>
  )
}

// ---------- App ----------
export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('everyone')
  const [following, setFollowing] = useState(new Set())
  const [showSignIn, setShowSignIn] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [note, setNote] = useState('')
  const me = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!me) { setFollowing(new Set()); return }
    setShowSignIn(false)
    supabase.from('follows').select('followed_id').eq('follower_id', me)
      .then(({ data }) => setFollowing(new Set((data || []).map((r) => r.followed_id))))
  }, [me])

  async function toggleFollow(userId) {
    if (!me) return setShowSignIn(true)
    const before = following
    const next = new Set(following)
    const wasOn = next.has(userId)
    wasOn ? next.delete(userId) : next.add(userId)
    setFollowing(next)
    const { error } = wasOn
      ? await supabase.from('follows').delete().eq('follower_id', me).eq('followed_id', userId)
      : await supabase.from('follows').insert({ follower_id: me, followed_id: userId })
    if (error) { setFollowing(before); setNote(error.message) }
  }

  const feedProps = { session, following, onToggleFollow: toggleFollow, refreshKey }
  const posted = () => setRefreshKey((k) => k + 1)

  return (
    <div className="min-h-screen bg-[#eef0fc] text-[#14123a]">
      <header className="flex items-center justify-between border-b-2 border-[#dcdff5] bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-4xl font-extrabold tracking-tight text-[#4a3af0]">
          Wao<span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6d155] text-xl text-[#14123a]">!</span>
        </div>
        {me
          ? <button className={ghost} onClick={() => supabase.auth.signOut()}>Sign out</button>
          : <button className={ghost} onClick={() => setShowSignIn((v) => !v)}>Sign in</button>}
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-20">
        {showSignIn && !me && <SignIn />}

        <nav className={`${card} grid grid-cols-3 gap-1 !p-3`}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-2xl px-1 py-3 text-base font-bold ${tab === k ? 'bg-[#4a3af0] text-white' : 'text-[#6b6f93]'}`}>
              {l}
            </button>
          ))}
        </nav>

        {note && <p className="text-sm text-red-600">{note}</p>}

        {tab === 'everyone' && (
          <>
            {me && <Composer userId={me} mode="update" onPosted={posted} />}
            <Feed mode="everyone" {...feedProps} />
            <People session={session} following={following} onToggleFollow={toggleFollow} />
          </>
        )}
        {tab === 'following' && <Feed mode="following" {...feedProps} />}
        {tab === 'mine' && <Feed mode="mine" {...feedProps} />}
        {tab === 'discover' && <Feed mode="discover" {...feedProps} />}
        {tab === 'offer' && (
          <>
            {me && <Composer userId={me} mode="offer" onPosted={posted} />}
            <Feed mode="offer" {...feedProps} />
          </>
        )}
        {tab === 'promise' && <OurPromise />}
      </main>
    </div>
  )
}
