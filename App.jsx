import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import heroImg from './wao-hero.jpeg'

// ---------- Supabase ----------
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
// ---------- Languages (EN / ES) ----------
const I18N = {
  en: {
    signIn: 'Sign in', profile: 'Profile', signOut: 'Sign out',
    tabs: { everyone: 'Everyone', mine: 'My posts', discover: 'Discover', offer: 'My offer', promise: 'Our promise' },
    banner: 'Wao! is live for connection today. Coming soon: a fair marketplace and a completely free, multi-tier Affiliate Program tied to your profile email, to reward the people who build this community.',
    gotIt: 'Got it',
    joinOrSignIn: 'Join or sign in', yourNameNew: 'Your name (new members)', email: 'Email',
    emailLink: 'Email me a link', checkEmail: 'Check your email for a sign-in link.',
    wowTitle: "What's your Wao moment?", wowPlaceholder: "Tell your community what's happening…",
    caricatureHint: "We'll create a custom caricature to go with your moment.",
    signInToShareText: 'Sign in to share it with the community.', signInToShare: 'Sign in to share',
    addPhoto: 'Add photo', remove: 'Remove', post: 'Post', posting: 'Posting…',
    needPhotoTitle: 'Add a photo of yourself first',
    needPhotoBody: 'We use your photo as a reference to draw your caricature. Take a selfie or choose one from your gallery.',
    photoConsent: 'This is a photo of me, and I agree that Wao! may send it to an image service to create my caricatures.',
    choosePhoto: 'Take or choose a photo', changePhoto: 'Change photo', uploading: 'Uploading…',
    photoSaved: 'Photo saved. Tap Post to share your moment.', removePhoto: 'Remove my photo',
    profilePhoto: 'Profile photo', couldNotRead: 'Could not read that image.',
    listOffer: 'List something to offer', oneTime: 'One-time sale', free: 'Free',
    ongoing: 'Inventory or service', ongoingSub: 'Listed 30 days at a time', ongoingPriced: '$5.00 / 30 days',
    oneTimeNote: 'For a single item, like a mattress or a bicycle. It stays up until you mark it fulfilled.',
    ongoingNote: 'For products in stock and services that need ongoing advertising. Listed 30 days at a time. Billing is not live yet, so listings are free during the demo.',
    ongoingNotePriced: 'For products in stock and services that need ongoing advertising. Listed 30 days at a time. Introductory offer: once Wao! reaches its launch member goal, your first 30 days are free. Billing is not live yet, so listings are free during the demo.',
    offeringPh: 'What are you offering?', describePh: 'Describe it…', pricePh: 'Price (blank = free/swap)',
    areaPh: 'Area (e.g. Southeast Portland)', attachLoc: 'Attach my approximate location so nearby people can find this',
    kinds: { update: 'update', offer: 'offer', request: 'request' },
    cats: { general: 'general', produce: 'produce', tools: 'tools', services: 'services', household: 'household', free: 'free' },
    comments: 'Comments', hideComments: 'Hide comments', markFulfilled: 'Mark fulfilled', closeListing: 'Close listing',
    reopen: 'Reopen', renew: 'Renew for 30 days',
    confirmFulfil: 'Mark this as fulfilled? It will leave the public feed. You can reopen it later.',
    confirmClose: 'Close this listing? You can renew it later.',
    expired: 'Expired', closed: 'Closed', fulfilled: 'Fulfilled', inventory: 'inventory / service',
    listedUntil: (d) => `Listed until ${d}`,
    signInComments: 'Sign in to read and write comments.', loading: 'Loading…', noComments: 'No comments yet.',
    writeComment: 'Write a comment…', send: 'Send', del: 'delete',
    yourProfile: 'Your profile', close: 'close',
    usernameLabel: 'Username (letters, numbers, underscore; 3–30)', nameLabel: 'Name', areaLabel: 'Area', aboutLabel: 'About you',
    affiliateNote: 'Coming soon: your sign-in email will link you to the free Affiliate Program. It is never shown on your public profile.',
    save: 'Save', saving: 'Saving…', saved: 'Saved!', usernameTaken: 'That username is taken.',
    loadMore: 'Load more',
    empty: { everyone: 'Nothing here yet. Be the first to post!', mine: 'You have not posted yet.', offer: 'You have no offers yet. List one above!', discover: 'Nothing matches these filters.' },
    needLogin: 'Sign in to see this.',
    offers: 'Offers', requests: 'Requests', allCategories: 'All categories', nearMe: 'Near me',
    within: (r) => `Within ${r} km`, clear: 'clear',
    discoverNote: 'Browse by type, category and distance. Always newest first.', noLocation: 'Could not get your location.',
    peopleTitle: 'People on Wao!', newestFirst: 'Newest members first.',
    promiseTitle: 'Our promise',
    promiseItems: [
      ['No black boxes.', "Your feed is newest first. We don't rank, score, or reorder it."],
      ['Nothing for sale in the feed.', 'No boosts, no sponsored posts, no pay-to-play.'],
      ['Filters you control.', 'Category and distance only narrow the list. They never reshuffle it.'],
      ['Easy for everyone.', 'Share a moment or list something in under a minute.'],
      ['Your email stays private.', 'It is never shown on your public profile.'],
    ],
    pricingTitle: 'Pricing',
    pricing1: ['One-time sales are always free.', ' A mattress, a bicycle, a piece of equipment: post it, and close it when it is sold.'],
    pricing2: ['Inventory and services: $5.00 per 30 days', ' (about 17¢ a day). Listings run in 30-day cycles, with a 30-day minimum.'],
    pricing3: ['Introductory offer:', ' once Wao! reaches its launch member goal, the first 30 days of an inventory or service listing are free.'],
    pricingNote: 'Billing is not live yet, so everything is free during the demo. You pay for time listed, never for position: the feed is always newest first.',
    comingTitle: "What's coming",
    comingToday: ['Today:', ' Wao! is a place to connect. Share your Wao moment and see what is happening, newest first.'],
    comingSoon: ['Soon:', ' a fair marketplace, and a completely free, multi-tier Affiliate Program tied to your profile email, to reward active community builders.'],
    hero: { l1: 'New social media,', l2: 'new moments to remember!', share: 'Share your Wao moment', hide: 'Close' },
    welcome: {
      skip: 'Skip', tap: 'Tap to continue', enter: 'Enter Wao!', replay: 'Watch the welcome again',
      hello: (n) => (n ? `Welcome, ${n}.` : 'Welcome.'), memberPre: 'You are member ', memberPost: '.',
      scenes: [
        { a: 'Many feeds decide', b: ['', 'what you see.', ''] },
        { a: 'Too often,', b: ['whoever ', 'pays', ' gets seen.'] },
        { a: 'Here, it is', b: ['', 'newest', ' first. Always.'] },
        { a: 'No algorithm. No boosting.', b: ['No black ', 'boxes.', ''] },
        { a: 'You are early.', b: ['Build it ', 'with us.', ''] },
      ],
    },
  },
  es: {
    signIn: 'Iniciar sesión', profile: 'Perfil', signOut: 'Cerrar sesión',
    tabs: { everyone: 'Todos', mine: 'Mis publicaciones', discover: 'Descubrir', offer: 'Mi oferta', promise: 'Nuestra promesa' },
    banner: 'Wao! está activo hoy para conectar. Próximamente: un mercado justo y un Programa de Afiliados completamente gratuito de varios niveles, ligado al correo de tu perfil, para recompensar a quienes construyen esta comunidad.',
    gotIt: 'Entendido',
    joinOrSignIn: 'Únete o inicia sesión', yourNameNew: 'Tu nombre (miembros nuevos)', email: 'Correo electrónico',
    emailLink: 'Envíame un enlace', checkEmail: 'Revisa tu correo para ver el enlace de acceso.',
    wowTitle: '¿Cuál es tu momento Wao?', wowPlaceholder: 'Cuéntale a tu comunidad qué está pasando…',
    caricatureHint: 'Crearemos una caricatura personalizada para acompañar tu momento.',
    signInToShareText: 'Inicia sesión para compartirlo con la comunidad.', signInToShare: 'Inicia sesión para compartir',
    addPhoto: 'Añadir foto', remove: 'Quitar', post: 'Publicar', posting: 'Publicando…',
    needPhotoTitle: 'Primero añade una foto tuya',
    needPhotoBody: 'Usamos tu foto como referencia para dibujar tu caricatura. Tómate una selfie o elige una de tu galería.',
    photoConsent: 'Esta es una foto mía y acepto que Wao! pueda enviarla a un servicio de imágenes para crear mis caricaturas.',
    choosePhoto: 'Tomar o elegir una foto', changePhoto: 'Cambiar foto', uploading: 'Subiendo…',
    photoSaved: 'Foto guardada. Toca Publicar para compartir tu momento.', removePhoto: 'Quitar mi foto',
    profilePhoto: 'Foto de perfil', couldNotRead: 'No se pudo leer esa imagen.',
    listOffer: 'Publica algo para ofrecer', oneTime: 'Venta única', free: 'Gratis',
    ongoing: 'Inventario o servicio', ongoingSub: 'Publicado por periodos de 30 días', ongoingPriced: '$5.00 / 30 días',
    oneTimeNote: 'Para un solo artículo, como un colchón o una bicicleta. Se mantiene hasta que lo marques como cumplido.',
    ongoingNote: 'Para productos en existencia y servicios que necesitan publicidad continua. Se publica por periodos de 30 días. La facturación aún no está activa, así que las publicaciones son gratis durante la demostración.',
    ongoingNotePriced: 'Para productos en existencia y servicios que necesitan publicidad continua. Se publica por periodos de 30 días. Oferta de lanzamiento: cuando Wao! alcance su meta de miembros, tus primeros 30 días son gratis. La facturación aún no está activa, así que las publicaciones son gratis durante la demostración.',
    offeringPh: '¿Qué ofreces?', describePh: 'Descríbelo…', pricePh: 'Precio (vacío = gratis/trueque)',
    areaPh: 'Zona (p. ej., sureste de Portland)', attachLoc: 'Adjuntar mi ubicación aproximada para que personas cercanas lo encuentren',
    kinds: { update: 'momento', offer: 'oferta', request: 'solicitud' },
    cats: { general: 'general', produce: 'productos frescos', tools: 'herramientas', services: 'servicios', household: 'hogar', free: 'gratis' },
    comments: 'Comentarios', hideComments: 'Ocultar comentarios', markFulfilled: 'Marcar como cumplido', closeListing: 'Cerrar publicación',
    reopen: 'Reabrir', renew: 'Renovar por 30 días',
    confirmFulfil: '¿Marcar como cumplido? Saldrá del feed público. Puedes reabrirlo después.',
    confirmClose: '¿Cerrar esta publicación? Puedes renovarla después.',
    expired: 'Vencido', closed: 'Cerrado', fulfilled: 'Cumplido', inventory: 'inventario / servicio',
    listedUntil: (d) => `Publicado hasta ${d}`,
    signInComments: 'Inicia sesión para leer y escribir comentarios.', loading: 'Cargando…', noComments: 'Aún no hay comentarios.',
    writeComment: 'Escribe un comentario…', send: 'Enviar', del: 'borrar',
    yourProfile: 'Tu perfil', close: 'cerrar',
    usernameLabel: 'Nombre de usuario (letras, números y guion bajo; 3–30)', nameLabel: 'Nombre', areaLabel: 'Zona', aboutLabel: 'Sobre ti',
    affiliateNote: 'Próximamente: tu correo de inicio de sesión te vinculará al Programa de Afiliados gratuito. Nunca se muestra en tu perfil público.',
    save: 'Guardar', saving: 'Guardando…', saved: '¡Guardado!', usernameTaken: 'Ese nombre de usuario ya está en uso.',
    loadMore: 'Cargar más',
    empty: { everyone: 'Aún no hay nada aquí. ¡Sé la primera persona en publicar!', mine: 'Todavía no has publicado.', offer: 'Todavía no tienes ofertas. ¡Publica una arriba!', discover: 'Nada coincide con estos filtros.' },
    needLogin: 'Inicia sesión para ver esto.',
    offers: 'Ofertas', requests: 'Solicitudes', allCategories: 'Todas las categorías', nearMe: 'Cerca de mí',
    within: (r) => `A menos de ${r} km`, clear: 'borrar',
    discoverNote: 'Explora por tipo, categoría y distancia. Siempre lo más reciente primero.', noLocation: 'No se pudo obtener tu ubicación.',
    peopleTitle: 'Personas en Wao!', newestFirst: 'Miembros más recientes primero.',
    promiseTitle: 'Nuestra promesa',
    promiseItems: [
      ['Sin cajas negras.', 'Tu feed va de lo más reciente a lo más antiguo. No clasificamos, puntuamos ni reordenamos nada.'],
      ['Nada pagado en el feed.', 'Sin impulsos, sin publicaciones patrocinadas, sin pagar por visibilidad.'],
      ['Filtros que tú controlas.', 'La categoría y la distancia solo reducen la lista. Nunca la reordenan.'],
      ['Fácil para todos.', 'Comparte un momento o publica una oferta en menos de un minuto.'],
      ['Tu correo es privado.', 'Nunca se muestra en tu perfil público.'],
    ],
    pricingTitle: 'Precios',
    pricing1: ['Las ventas únicas siempre son gratis.', ' Un colchón, una bicicleta, un equipo: publícalo y ciérralo cuando se venda.'],
    pricing2: ['Inventario y servicios: $5.00 por 30 días', ' (unos 17¢ al día). Las publicaciones funcionan en ciclos de 30 días, con un mínimo de 30 días.'],
    pricing3: ['Oferta de lanzamiento:', ' cuando Wao! alcance su meta de miembros, los primeros 30 días de una publicación de inventario o servicio serán gratis.'],
    pricingNote: 'La facturación aún no está activa, así que todo es gratis durante la demostración. Pagas por el tiempo publicado, nunca por la posición: el feed siempre muestra lo más reciente primero.',
    comingTitle: 'Lo que viene',
    comingToday: ['Hoy:', ' Wao! es un lugar para conectar. Comparte tu momento Wao y mira lo que está pasando, lo más reciente primero.'],
    comingSoon: ['Pronto:', ' un mercado justo y un Programa de Afiliados completamente gratuito de varios niveles, ligado al correo de tu perfil, para recompensar a quienes construyen la comunidad.'],
    hero: { l1: 'Una nueva red social,', l2: 'nuevos momentos para recordar.', share: 'Comparte tu momento Wao', hide: 'Cerrar' },
    welcome: {
      skip: 'Saltar', tap: 'Toca para continuar', enter: 'Entrar a Wao!', replay: 'Ver la bienvenida otra vez',
      hello: (n) => (n ? `Te damos la bienvenida, ${n}.` : 'Te damos la bienvenida.'), memberPre: 'Eres miembro n.º ', memberPost: '.',
      scenes: [
        { a: 'Muchos feeds deciden', b: ['', 'lo que ves.', ''] },
        { a: 'Demasiadas veces,', b: ['se ve a quien ', 'paga.', ''] },
        { a: 'Aquí, lo más', b: ['', 'nuevo', ' primero. Siempre.'] },
        { a: 'Sin algoritmo. Sin impulsos pagados.', b: ['Sin cajas ', 'negras.', ''] },
        { a: 'Llegaste temprano.', b: ['Constrúyelo ', 'con nosotros.', ''] },
      ],
    },
  },
}


const BUCKET = 'photos'
const PAGE = 20
const CATEGORIES = ['general', 'produce', 'tools', 'services', 'household', 'free']
const TABS = ['everyone', 'mine', 'discover', 'offer', 'promise']
// Set to true later to show listing prices ($5.00 / 30 days) and the Pricing card.
const SHOW_PRICING = false

const LangCtx = createContext({ lang: 'en', t: I18N.en, setLang: () => {} })
const useLang = () => useContext(LangCtx)
const loc = (lang) => (lang === 'es' ? 'es' : 'en')

// ---------- Shared styles ----------
const card = 'rounded-3xl border-2 border-[#dcdff5] bg-white p-5'
const field = 'w-full rounded-2xl border-2 border-[#dcdff5] bg-[#eef0fc] px-4 py-3 text-[#14123a] placeholder:text-stone-400'
const primary = 'rounded-full bg-[#4a3af0] px-6 py-3 font-bold text-white disabled:bg-[#b4adf8]'
const ghost = 'rounded-full border-2 border-[#4a3af0] px-5 py-2 font-bold text-[#4a3af0]'
const ghostSm = 'rounded-full border-2 border-[#4a3af0] px-4 py-1.5 text-sm font-bold text-[#4a3af0] disabled:opacity-40'
const chip = 'rounded-full bg-[#e8e9fb] px-2.5 py-0.5 text-xs text-[#14123a]'

// ---------- Helpers ----------
const photoUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
const when = (iso, lang) => new Date(iso).toLocaleString(loc(lang), { dateStyle: 'medium', timeStyle: 'short' })
const money = (c, free) => (c == null ? null : c === 0 ? free : `$${(c / 100).toFixed(2)}`)

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

// A member's own posts (My posts / My offer). Newest first. Shows every status so owners can manage them.
async function fetchMine(me, cursor, kind) {
  let q = supabase
    .from('posts')
    .select('id,user_id,kind,category,title,body,price_cents,location_text,image_path,caricature_image_url,status,listing_type,expires_at,created_at')
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE)
  if (kind) q = q.eq('kind', kind)
  if (cursor) q = q.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
  const { data, error } = await q
  if (error) throw error
  const { data: prof } = await supabase.from('profiles').select('username,display_name,avatar_url').eq('id', me).single()
  return data.map((r) => ({
    ...r,
    author_username: prof?.username,
    author_display_name: prof?.display_name,
    author_avatar_url: prof?.avatar_url,
  }))
}

// ---------- Small pieces ----------
function Avatar({ url, name }) {
  if (url) return <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8e9fb] font-bold text-[#4a3af0]">
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

function LangToggle({ lang, setLang }) {
  return (
    <div className="flex overflow-hidden rounded-full border-2 border-[#4a3af0] text-sm font-bold" role="group" aria-label="Language">
      {['en', 'es'].map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`px-3 py-1.5 ${lang === l ? 'bg-[#4a3af0] text-white' : 'text-[#4a3af0]'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ---------- Sign in ----------
function SignIn() {
  const { t, lang } = useLang()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    const ref = new URLSearchParams(window.location.search).get('ref')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: name || undefined, referred_by: ref || undefined },
        emailRedirectTo: `${window.location.origin}/?lang=${lang}`,
      },
    })
    setMsg(error ? error.message : t.checkEmail)
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h2 className="text-xl font-bold">{t.joinOrSignIn}</h2>
      <input className={field} placeholder={t.yourNameNew} value={name} onChange={(e) => setName(e.target.value)} />
      <input className={field} type="email" required placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className={primary}>{t.emailLink}</button>
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </form>
  )
}

// ---------- Profile photo (reference for caricatures) ----------
function AvatarUploader({ me, avatarUrl, onChange }) {
  const { t } = useLang()
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      const blob = await resizeImage(file, 768)
      const path = `${me}/avatar.jpg`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr
      const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
      const { error: pErr } = await supabase.from('profiles')
        .update({ avatar_url: url, photo_consent_at: new Date().toISOString() }).eq('id', me)
      if (pErr) throw pErr
      onChange(url)
    } catch (e2) {
      setErr(e2.message || t.couldNotRead)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removePhoto() {
    setBusy(true)
    setErr('')
    await supabase.storage.from('avatars').remove([`${me}/avatar.jpg`])
    const { error } = await supabase.from('profiles').update({ avatar_url: null, photo_consent_at: null }).eq('id', me)
    setBusy(false)
    if (error) setErr(error.message)
    else onChange(null)
  }

  return (
    <div className="space-y-2">
      {avatarUrl && <img src={avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />}
      {!avatarUrl && (
        <label className="flex items-start gap-2 text-sm text-stone-600">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t.photoConsent}
        </label>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghostSm} disabled={busy || (!avatarUrl && !consent)} onClick={() => fileRef.current?.click()}>
          {busy ? t.uploading : avatarUrl ? t.changePhoto : t.choosePhoto}
        </button>
        {avatarUrl && <button type="button" className={ghostSm} disabled={busy} onClick={removePhoto}>{t.removePhoto}</button>}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}

// ---------- Composer ----------
function Composer({ userId, mode, avatarUrl, onAvatar, onPosted }) {
  const { t } = useLang()
  const kind = mode === 'offer' ? 'offer' : 'update'
  const detailed = kind === 'offer'
  const [ltype, setLtype] = useState('one_time')
  const [f, setF] = useState({ category: 'general', title: '', body: '', price: '', area: '' })
  const [geo, setGeo] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needPhoto, setNeedPhoto] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const fileRef = useRef(null)

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
      setError(t.couldNotRead)
    }
  }
  function clearPhoto() {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit(e) {
    e.preventDefault()
    // A Wao moment needs a profile photo first (it is the reference for the caricature).
    if (kind === 'update' && !avatarUrl) { setNeedPhoto(true); return }
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
        listing_type: kind === 'offer' ? ltype : 'one_time',
        category: detailed ? f.category : 'general',
        title: detailed ? f.title || null : null,
        body: f.body.trim(),
        price_cents: kind === 'offer' && f.price !== '' ? Math.round(parseFloat(f.price) * 100) : null,
        location_text: detailed ? f.area || null : null,
        image_path: path,
        ...where,
      })
      if (postErr) throw postErr
      // Caricature hook: the generate-caricature function uses your profile photo and this text.
      if (kind === 'update') {
        supabase.functions.invoke('generate-caricature', { body: { post_id: postId } })
          .then(() => onPosted())
          .catch(() => {})
      }
      setF({ category: 'general', title: '', body: '', price: '', area: '' })
      setGeo(false)
      setNeedPhoto(false)
      setSavedNote(false)
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
      {kind === 'update' && <h2 className="text-2xl font-extrabold">{t.wowTitle}</h2>}
      {kind === 'offer' && (
        <>
          <h2 className="text-xl font-bold">{t.listOffer}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[['one_time', t.oneTime, t.free], ['ongoing', t.ongoing, SHOW_PRICING ? t.ongoingPriced : t.ongoingSub]].map(([k, l, sub]) => (
              <button type="button" key={k} onClick={() => setLtype(k)}
                className={`rounded-2xl border-2 px-3 py-2 text-left ${ltype === k ? 'border-[#4a3af0] bg-[#e8e9fb]' : 'border-[#dcdff5]'}`}>
                <div className="font-bold">{l}</div>
                <div className="text-sm text-stone-500">{sub}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-stone-500">
            {ltype === 'one_time' ? t.oneTimeNote : SHOW_PRICING ? t.ongoingNotePriced : t.ongoingNote}
          </p>
        </>
      )}

      {detailed && <input className={field} maxLength={120} placeholder={t.offeringPh} value={f.title} onChange={set('title')} />}
      <textarea className={`${field} min-h-24`} required maxLength={500}
        placeholder={kind === 'offer' ? t.describePh : t.wowPlaceholder}
        value={f.body} onChange={set('body')} />

      {detailed && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={f.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t.cats[c]}</option>)}
            </select>
            <input className={field} type="number" min="0" step="0.01" placeholder={t.pricePh} value={f.price} onChange={set('price')} />
          </div>
          <input className={field} placeholder={t.areaPh} value={f.area} onChange={set('area')} />
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={geo} onChange={(e) => setGeo(e.target.checked)} />
            {t.attachLoc}
          </label>
        </>
      )}

      {photo && (
        <div className="relative">
          <img src={photo.url} alt="" className="max-h-64 w-full rounded-2xl object-cover" />
          <button type="button" onClick={clearPhoto} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">{t.remove}</button>
        </div>
      )}

      {kind === 'update' && needPhoto && !avatarUrl && (
        <div className="space-y-2 rounded-2xl bg-[#eef0fc] p-4">
          <h3 className="font-bold">{t.needPhotoTitle}</h3>
          <p className="text-sm text-stone-600">{t.needPhotoBody}</p>
          <AvatarUploader me={userId} avatarUrl={avatarUrl} onChange={(u) => { onAvatar(u); setSavedNote(true) }} />
        </div>
      )}
      {kind === 'update' && savedNote && avatarUrl && <p className="text-sm text-emerald-700">{t.photoSaved}</p>}
      {kind === 'update' && <p className="text-sm text-stone-500">{t.caricatureHint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button type="button" className={ghost} onClick={() => fileRef.current?.click()}>{t.addPhoto}</button>
        <span className="text-sm text-stone-500">{f.body.length} / 500</span>
        <button disabled={busy || !f.body.trim()} className={`${primary} ml-auto`}>{busy ? t.posting : t.post}</button>
      </div>
    </form>
  )
}

// ---------- Comments ----------
function Comments({ postId, me }) {
  const { t, lang } = useLang()
  const [items, setItems] = useState(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id,user_id,body,created_at,profiles(display_name,username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) setError(error.message)
    else setItems(data)
  }, [postId])

  useEffect(() => { if (me) load() }, [me, load])

  async function add(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: me, body: text.trim() })
    if (error) return setError(error.message)
    setText('')
    load()
  }
  async function remove(id) {
    await supabase.from('comments').delete().eq('id', id).eq('user_id', me)
    load()
  }

  if (!me) return <p className="mt-3 text-sm text-stone-500">{t.signInComments}</p>

  return (
    <div className="mt-3 space-y-2 border-t-2 border-[#eef0fc] pt-3">
      {items === null && <p className="text-sm text-stone-500">{t.loading}</p>}
      {items && items.length === 0 && <p className="text-sm text-stone-500">{t.noComments}</p>}
      {items && items.map((c) => (
        <div key={c.id} className="rounded-2xl bg-[#eef0fc] px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span><b>{c.profiles?.display_name}</b> <span className="text-xs text-stone-500">{when(c.created_at, lang)}</span></span>
            {c.user_id === me && <button className="text-xs text-stone-500 underline" onClick={() => remove(c.id)}>{t.del}</button>}
          </div>
          <p className="whitespace-pre-wrap">{c.body}</p>
        </div>
      ))}
      <form onSubmit={add} className="flex gap-2">
        <input className={field} maxLength={200} placeholder={t.writeComment} value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={!text.trim()} className={`${primary} !px-4`}>{t.send}</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

// ---------- One post ----------
function PostCard({ p, me, onChanged }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const mine = me && p.user_id === me
  const ongoing = p.listing_type === 'ongoing'
  const expired = !!p.expires_at && new Date(p.expires_at) < new Date()
  const inactive = (!!p.status && p.status !== 'active') || expired
  const canClose = mine && p.kind !== 'update' && !inactive

  async function close() {
    if (!window.confirm(ongoing ? t.confirmClose : t.confirmFulfil)) return
    setErr('')
    const { error } = await supabase.from('posts').update({ status: ongoing ? 'archived' : 'fulfilled' }).eq('id', p.id).eq('user_id', me)
    if (error) setErr(error.message)
    else onChanged()
  }
  async function reopen() {
    setErr('')
    const { error } = await supabase.rpc('renew_listing', { p_post_id: p.id })
    if (error) setErr(error.message)
    else onChanged()
  }

  return (
    <article className={`${card} ${inactive ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar url={p.author_avatar_url} name={p.author_display_name} />
        <div className="min-w-0 flex-1">
          <div className="truncate"><b>{p.author_display_name}</b> <span className="text-sm text-stone-500">@{p.author_username}</span></div>
          <time className="text-xs text-stone-500">{when(p.created_at, lang)}</time>
        </div>
      </div>
      {p.title && <h3 className="mt-3 text-lg font-bold">{p.title}</h3>}
      <p className="mt-2 whitespace-pre-wrap">{p.body}</p>
      {p.caricature_image_url && <img loading="lazy" alt="" src={p.caricature_image_url} className="mt-3 w-full max-w-sm rounded-2xl bg-[#eef0fc]" />}
      {p.image_path && <img loading="lazy" alt="" src={photoUrl(p.image_path)} className="mt-3 max-h-96 w-full rounded-2xl object-cover" />}
      {(p.kind !== 'update' || inactive) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`${chip} !bg-[#4a3af0] !text-white`}>{t.kinds[p.kind] || p.kind}</span>
          {inactive && <span className={`${chip} !bg-stone-300`}>{expired ? t.expired : p.status === 'archived' ? t.closed : t.fulfilled}</span>}
          {ongoing && <span className={chip}>{t.inventory}</span>}
          <span className={chip}>{t.cats[p.category] || p.category}</span>
          {money(p.price_cents, t.free) && <span className={`${chip} !bg-[#f6d155]`}>{money(p.price_cents, t.free)}</span>}
          {p.location_text && <span className={chip}>{p.location_text}</span>}
          {p.distance_km != null && <span className={`${chip} !bg-emerald-100`}>{p.distance_km.toFixed(1)} km</span>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={ghostSm} onClick={() => setOpen((v) => !v)}>{open ? t.hideComments : t.comments}</button>
        {canClose && <button className={ghostSm} onClick={close}>{ongoing ? t.closeListing : t.markFulfilled}</button>}
        {mine && inactive && <button className={ghostSm} onClick={reopen}>{ongoing ? t.renew : t.reopen}</button>}
      </div>
      {ongoing && !inactive && p.expires_at && (
        <p className="mt-2 text-xs text-stone-500">{t.listedUntil(new Date(p.expires_at).toLocaleDateString(loc(lang), { dateStyle: 'medium' }))}</p>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {open && <Comments postId={p.id} me={me} />}
    </article>
  )
}

// ---------- Profile editor ----------
function ProfileEditor({ me, avatarUrl, onAvatar, onSaved, onClose, onSignOut }) {
  const { t } = useLang()
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('username,display_name,bio,location_text').eq('id', me).single()
      .then(({ data, error }) => {
        if (error) setMsg(error.message)
        else setF({ username: data.username || '', display_name: data.display_name || '', bio: data.bio || '', location_text: data.location_text || '' })
      })
  }, [me])

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { error } = await supabase.from('profiles').update({
      username: f.username,
      display_name: f.display_name.trim(),
      bio: f.bio.trim() || null,
      location_text: f.location_text.trim() || null,
    }).eq('id', me)
    setBusy(false)
    if (error) return setMsg(error.code === '23505' ? t.usernameTaken : error.message)
    setMsg(t.saved)
    onSaved()
  }

  if (!f) return <div className={card}>{msg || t.loading}</div>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className={`${card} space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.yourProfile}</h2>
        <button type="button" className="text-sm text-stone-500 underline" onClick={onClose}>{t.close}</button>
      </div>

      <div>
        <h3 className="mb-2 font-bold">{t.profilePhoto}</h3>
        <AvatarUploader me={me} avatarUrl={avatarUrl} onChange={onAvatar} />
      </div>

      <form onSubmit={save} className="space-y-3">
        <label className="block text-sm text-stone-600">{t.usernameLabel}
          <input className={`${field} mt-1`} value={f.username} minLength={3} maxLength={30} required
            onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
        </label>
        <label className="block text-sm text-stone-600">{t.nameLabel}
          <input className={`${field} mt-1`} value={f.display_name} maxLength={40} required onChange={set('display_name')} />
        </label>
        <label className="block text-sm text-stone-600">{t.areaLabel}
          <input className={`${field} mt-1`} placeholder={t.areaPh} value={f.location_text} onChange={set('location_text')} />
        </label>
        <label className="block text-sm text-stone-600">{t.aboutLabel}
          <textarea className={`${field} mt-1 min-h-20`} maxLength={500} value={f.bio} onChange={set('bio')} />
        </label>
        <p className="rounded-2xl bg-[#eef0fc] px-3 py-2 text-sm text-stone-600">{t.affiliateNote}</p>
        <button disabled={busy} className={primary}>{busy ? t.saving : t.save}</button>
        {msg && <p className="text-sm text-stone-600">{msg}</p>}
      </form>

      <button type="button" className={ghostSm} onClick={onSignOut}>{t.signOut}</button>
    </div>
  )
}

// ---------- Feed ----------
function Feed({ mode, session, refreshKey, onChanged }) {
  const { t } = useLang()
  const me = session?.user.id
  const [filters, setFilters] = useState({ kind: 'offer', category: '', radius: '25' })
  const [coords, setCoords] = useState(null)
  const [posts, setPosts] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const needsLogin = ['mine', 'offer'].includes(mode) && !me

  const fetchPage = useCallback(async (cursor) => {
    if (mode === 'mine') return fetchMine(me, cursor, null)
    if (mode === 'offer') return fetchMine(me, cursor, 'offer')
    const disc = mode === 'discover'
    const { data, error } = await supabase.rpc('get_feed', {
      p_kind: disc ? filters.kind : 'update',
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
  }, [mode, filters, coords, me])

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
      () => setError(t.noLocation)
    )
  }

  const sel = 'rounded-full border-2 border-[#dcdff5] bg-white px-3 py-1.5 text-sm'

  return (
    <section className="space-y-4">
      {mode === 'discover' && (
        <div className={`${card} space-y-2`}>
          <div className="flex flex-wrap items-center gap-2">
            {[['offer', t.offers], ['request', t.requests]].map(([k, l]) => (
              <button key={k} onClick={() => setFilters({ ...filters, kind: k })}
                className={`rounded-full px-4 py-1.5 font-semibold ${filters.kind === k ? 'bg-[#4a3af0] text-white' : 'bg-[#e8e9fb] text-[#4a3af0]'}`}>{l}</button>
            ))}
            <select className={sel} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">{t.allCategories}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t.cats[c]}</option>)}
            </select>
            {coords ? (
              <>
                <select className={sel} value={filters.radius} onChange={(e) => setFilters({ ...filters, radius: e.target.value })}>
                  {[5, 10, 25, 50, 100].map((r) => <option key={r} value={r}>{t.within(r)}</option>)}
                </select>
                <button className="text-sm text-stone-500 underline" onClick={() => setCoords(null)}>{t.clear}</button>
              </>
            ) : <button className={sel} onClick={nearMe}>{t.nearMe}</button>}
          </div>
          <p className="text-sm text-stone-500">{t.discoverNote}</p>
        </div>
      )}

      {needsLogin && <div className={`${card} text-stone-600`}>{t.needLogin}</div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !needsLogin && <p className="text-stone-500">{t.loading}</p>}
      {!loading && !needsLogin && posts.length === 0 && <div className={`${card} text-stone-600`}>{t.empty[mode] || t.empty.everyone}</div>}

      {posts.map((p) => <PostCard key={p.id} p={p} me={me} onChanged={onChanged} />)}

      {hasMore && !loading && (
        <button onClick={loadMore} className="w-full rounded-full border-2 border-[#dcdff5] bg-white py-3 font-semibold">{t.loadMore}</button>
      )}
    </section>
  )
}

// ---------- People on Wao! ----------
function People() {
  const { t } = useLang()
  const [people, setPeople] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('id,username,display_name,avatar_url,location_text,created_at')
      .order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => setPeople(data || []))
  }, [])
  return (
    <div className={card}>
      <h2 className="mb-3 text-xl font-bold">{t.peopleTitle}</h2>
      <div className="space-y-3">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <Avatar url={p.avatar_url} name={p.display_name} />
            <div className="min-w-0 flex-1">
              <div className="truncate"><b>{p.display_name}</b> <span className="text-sm text-stone-500">@{p.username}</span></div>
              {p.location_text && <div className="text-xs text-stone-500">{p.location_text}</div>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-stone-500">{t.newestFirst}</p>
    </div>
  )
}

// ---------- Roadmap banner (follows the language toggle) ----------
function RoadmapBanner() {
  const { t } = useLang()
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('wao_roadmap_hidden') === '1' } catch { return false }
  })
  if (hidden) return null
  return (
    <div className="flex items-start gap-3 rounded-3xl border-2 border-[#dcdff5] bg-white/70 px-4 py-3 text-sm">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f6d155] text-xs font-extrabold">!</span>
      <p className="flex-1">{t.banner}</p>
      <button className="text-xs text-stone-500 underline" onClick={() => {
        try { localStorage.setItem('wao_roadmap_hidden', '1') } catch { /* ignore */ }
        setHidden(true)
      }}>{t.gotIt}</button>
    </div>
  )
}

// ---------- Hero (top of the Everyone tab) ----------
function Hero({ signedIn, open, onShare, onSignIn }) {
  const { t } = useLang()
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#14123a] text-white">
      <img src={heroImg} alt="" className="block w-full" />
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#14123a] via-[#14123a]/85 to-transparent px-5 pb-12 pt-5">
        <h2 className="text-[clamp(1.5rem,6.4vw,2.25rem)] font-black leading-tight tracking-tight">
          {t.hero.l1}<br /><span className="text-[#f6d155]">{t.hero.l2}</span>
        </h2>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#14123a] via-[#14123a]/70 to-transparent px-5 pb-5 pt-16">
        <button className="w-full rounded-full bg-[#f6d155] px-6 py-3.5 text-lg font-black text-[#14123a]" onClick={signedIn ? onShare : onSignIn}>
          {signedIn ? (open ? t.hero.hide : t.hero.share) : t.signInToShare}
        </button>
      </div>
    </section>
  )
}

// ---------- Welcome (first impression: words and motion) ----------
const WELCOME_MS = 4800
const ORB_POS = [
  ['translate(0,0)', 'translate(0,0)'],
  ['translate(18vmin,12vmin) scale(1.1)', 'translate(-16vmin,-14vmin) scale(1.2)'],
  ['translate(8vmin,-10vmin) scale(.9)', 'translate(-6vmin,10vmin)'],
  ['translate(24vmin,6vmin) scale(1.2)', 'translate(-22vmin,-4vmin) scale(.9)'],
  ['translate(14vmin,-6vmin) scale(1.35)', 'translate(-12vmin,-20vmin) scale(1.5)'],
]

function Welcome({ name, number, onDone }) {
  const { t, lang, setLang } = useLang()
  const w = t.welcome
  const [i, setI] = useState(0)
  const last = i === w.scenes.length - 1
  const reduce = useRef(typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches).current

  useEffect(() => {
    if (last || reduce) return
    const id = setTimeout(() => setI((n) => n + 1), WELCOME_MS)
    return () => clearTimeout(id)
  }, [i, last, reduce])

  const s = w.scenes[i]
  const rise = (delay) => (reduce ? {} : { animation: `wao-rise .8s cubic-bezier(.2,.7,.2,1) ${delay}s both` })
  const orb = { position: 'absolute', borderRadius: '9999px', filter: 'blur(60px)', pointerEvents: 'none', transition: reduce ? 'none' : 'transform 1.6s cubic-bezier(.2,.7,.2,1)' }

  return (
    <div
      onClick={() => { if (!last) setI(i + 1) }}
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex cursor-pointer flex-col overflow-hidden px-5 text-[#eef0fc]"
      style={{
        background: 'linear-gradient(160deg,#14123a 0%,#2a1fa8 55%,#4a3af0 100%)',
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <style>{`@keyframes wao-rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}@keyframes wao-fill{from{width:0}to{width:100%}}`}</style>

      <div aria-hidden="true" style={{ ...orb, width: '70vmin', height: '70vmin', background: '#4a3af0', left: '-20vmin', top: '10%', opacity: 0.55, transform: ORB_POS[i][0] }} />
      <div aria-hidden="true" style={{ ...orb, width: '55vmin', height: '55vmin', background: '#f6d155', right: '-25vmin', bottom: '8%', opacity: 0.28, transform: ORB_POS[i][1] }} />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {w.scenes.map((_, k) => (
            <span key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#eef0fc]/25">
              <span className="block h-full bg-[#eef0fc]"
                style={{ width: k < i || last || reduce ? '100%' : k === i ? undefined : '0%', animation: k === i && !last && !reduce ? `wao-fill ${WELCOME_MS}ms linear forwards` : undefined }} />
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex overflow-hidden rounded-full border-2 border-[#eef0fc] text-sm font-bold" role="group" aria-label="Language" onClick={(e) => e.stopPropagation()}>
            {['en', 'es'].map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`px-3 py-1.5 ${lang === l ? 'bg-[#eef0fc] text-[#14123a]' : 'text-[#eef0fc]'}`}>{l.toUpperCase()}</button>
            ))}
          </div>
          <button className="px-1 py-2 text-sm font-bold underline underline-offset-4" onClick={(e) => { e.stopPropagation(); onDone() }}>{w.skip}</button>
        </div>
      </div>

      <div key={`${lang}-${i}`} className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-3">
        <p className="max-w-[18ch] text-[clamp(1.25rem,5.6vw,2rem)] font-semibold leading-tight text-[#b9bde6]" style={rise(0)}>{s.a}</p>
        <h1 className="max-w-[11ch] break-words text-[clamp(2.5rem,12.5vw,4.75rem)] font-black leading-[1.02] tracking-tight" style={rise(0.35)}>
          {s.b[0]}<span className="text-[#f6d155]">{s.b[1]}</span>{s.b[2]}
        </h1>
        {last && (
          <p className="mt-2 text-[clamp(1rem,4.4vw,1.25rem)] font-bold" style={rise(0.8)}>
            {w.hello(name)}<br />
            {w.memberPre}<span className="text-[#f6d155]">{number}</span>{w.memberPost}
          </p>
        )}
      </div>

      <div className="relative z-10 flex min-h-[84px] flex-col justify-end gap-2">
        {last
          ? <button className="rounded-full bg-[#f6d155] px-6 py-4 text-lg font-black text-[#14123a]" onClick={(e) => { e.stopPropagation(); onDone() }}>{w.enter}</button>
          : <p className="text-center text-sm text-[#b9bde6]">{w.tap}</p>}
      </div>
    </div>
  )
}

// ---------- Our promise ----------
function OurPromise({ onReplay }) {
  const { t } = useLang()
  return (
    <>
      <div className={card}>
        <h2 className="mb-4 text-xl font-bold">{t.promiseTitle}</h2>
        {t.promiseItems.map(([title, desc], i) => (
          <p key={title} className="mb-3 flex gap-3"><b className="text-[#4a3af0]">{i + 1}.</b><span><b>{title}</b> {desc}</span></p>
        ))}
      </div>
      {SHOW_PRICING ? (
        <div className={card}>
          <h2 className="mb-3 text-xl font-bold">{t.pricingTitle}</h2>
          {[t.pricing1, t.pricing2, t.pricing3].map(([b, rest]) => <p key={b} className="mb-2"><b>{b}</b>{rest}</p>)}
          <p className="text-sm text-stone-500">{t.pricingNote}</p>
        </div>
      ) : (
        <div className={card}>
          <h2 className="mb-3 text-xl font-bold">{t.comingTitle}</h2>
          <p className="mb-2"><b>{t.comingToday[0]}</b>{t.comingToday[1]}</p>
          <p><b>{t.comingSoon[0]}</b>{t.comingSoon[1]}</p>
        </div>
      )}
      {onReplay && <button className={ghost} onClick={onReplay}>{t.welcome.replay}</button>}
    </>
  )
}

// ---------- App ----------
export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('everyone')
  const [showSignIn, setShowSignIn] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [welcome, setWelcome] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [lang, setLangState] = useState(() => {
    const fromLink = new URLSearchParams(window.location.search).get('lang')
    if (fromLink === 'en' || fromLink === 'es') return fromLink
    try {
      const saved = localStorage.getItem('wao_lang')
      if (saved === 'en' || saved === 'es') return saved
    } catch { /* ignore */ }
    return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'
  })
  const t = I18N[lang]
  const me = session?.user.id

  const setLang = (l) => {
    setLangState(l)
    try { localStorage.setItem('wao_lang', l) } catch { /* ignore */ }
  }
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Loads the member's name and number, then opens the welcome. Automatic only the first time.
  async function openWelcome(force) {
    let seen = false
    try { seen = localStorage.getItem('wao_welcome_seen') === '1' } catch { /* ignore */ }
    if (seen && !force) return
    const { data } = await supabase.from('profiles').select('display_name,created_at').eq('id', me).single()
    if (!data) return
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).lte('created_at', data.created_at)
    setWelcome({ name: data.display_name || '', number: count || 1 })
  }
  function closeWelcome() {
    try { localStorage.setItem('wao_welcome_seen', '1') } catch { /* ignore */ }
    setWelcome(null)
  }

  // After sign-in, go straight to the home screen and load the member's profile photo.
  useEffect(() => {
    if (!me) { setShowProfile(false); setAvatarUrl(null); setWelcome(null); setComposerOpen(false); return }
    setShowSignIn(false)
    setTab('everyone')
    supabase.from('profiles').select('avatar_url').eq('id', me).single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || null))
    openWelcome(false)
  }, [me])

  const posted = () => setRefreshKey((k) => k + 1)
  const feedProps = { session, refreshKey, onChanged: posted }

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <div className="min-h-screen bg-[#eef0fc] text-[#14123a]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#dcdff5] bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-[#4a3af0]">
            Wao<span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6d155] text-xl text-[#14123a]">!</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            {me
              ? <button className={ghostSm} onClick={() => setShowProfile((v) => !v)}>{t.profile}</button>
              : <button className={ghostSm} onClick={() => setShowSignIn((v) => !v)}>{t.signIn}</button>}
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-20">
          {showSignIn && !me && <SignIn />}
          {showProfile && me && (
            <ProfileEditor me={me} avatarUrl={avatarUrl} onAvatar={(u) => { setAvatarUrl(u); posted() }}
              onSaved={posted} onClose={() => setShowProfile(false)} onSignOut={() => supabase.auth.signOut()} />
          )}

          {tab === 'everyone' && (
            <Hero signedIn={!!me} open={composerOpen} onShare={() => setComposerOpen((v) => !v)} onSignIn={() => setShowSignIn(true)} />
          )}
          {me && ((tab === 'everyone' && composerOpen) || tab === 'mine') && (
            <Composer userId={me} mode="update" avatarUrl={avatarUrl} onAvatar={setAvatarUrl}
              onPosted={() => { setComposerOpen(false); posted() }} />
          )}
          {!me && !showSignIn && tab === 'discover' && (
            <div className={`${card} space-y-3`}>
              <h2 className="text-2xl font-extrabold">{t.wowTitle}</h2>
              <p className="text-stone-600">{t.signInToShareText}</p>
              <button className={primary} onClick={() => setShowSignIn(true)}>{t.signInToShare}</button>
            </div>
          )}

          <nav className={`${card} grid grid-cols-3 gap-1 !p-3`}>
            {TABS.map((k) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-2xl px-1 py-3 text-base font-bold ${tab === k ? 'bg-[#4a3af0] text-white' : 'text-[#6b6f93]'}`}>
                {t.tabs[k]}
              </button>
            ))}
          </nav>

          {tab === 'everyone' && <RoadmapBanner />}

          {tab === 'everyone' && (
            <>
              <Feed mode="everyone" {...feedProps} />
              <People key={refreshKey} />
            </>
          )}
          {tab === 'mine' && <Feed mode="mine" {...feedProps} />}
          {tab === 'discover' && <Feed mode="discover" {...feedProps} />}
          {tab === 'offer' && (
            <>
              {me && <Composer userId={me} mode="offer" avatarUrl={avatarUrl} onAvatar={setAvatarUrl} onPosted={posted} />}
              <Feed mode="offer" {...feedProps} />
            </>
          )}
          {tab === 'promise' && <OurPromise onReplay={me ? () => openWelcome(true) : null} />}
        </main>
        {welcome && <Welcome name={welcome.name} number={welcome.number} onDone={closeWelcome} />}
      </div>
    </LangCtx.Provider>
  )
}
