import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import heroImg from './wepawao-hero.jpeg'

// ---------- Supabase ----------
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
// ---------- Languages (EN / ES) ----------
const I18N = {
  en: {
    signIn: 'Join free', profile: 'Profile', signOut: 'Sign out',
    tabs: { everyone: 'Everyone', mine: 'My posts', contacts: 'Contacts', discover: 'Discover', offer: 'What I offer', promise: 'Our promise' },
    share: 'Share', linkCopied: 'Link copied!', shareText: 'A moment on Wepawao',
    edit: 'Edit', deletePost: 'Delete', cancel: 'Cancel', edited: 'edited', deleting: 'Deleting…',
    editTitle: 'Edit your post', undoRemove: 'Keep the picture',
    visContacts: 'Contacts only', visPublic: 'Public',
    visContactsSub: 'Only your contacts see it', visPublicSub: 'Everyone, if it follows the rules',
    publicRulesTitle: 'Rules for public moments',
    publicRules: ['No prices or dollar amounts.', 'No web links or phone numbers.', 'Up to 3 public moments a day.', 'Hidden from Everyone if 3 members report it.'],
    blocked: {
      price: 'it mentions a price or dollar amount',
      link: 'it includes a web link',
      phone: 'it includes a phone number',
      daily_cap: 'you already shared 3 public moments in the last 24 hours',
      reported: '3 members reported it',
    },
    blockedNotice: (r) => `Shared with your contacts only. It is not public because ${r}.`,
    notPublic: 'Not public:',
    report: 'Report', reportedThanks: 'Reported. Thank you.', alreadyReported: 'You already reported this.',
    confirmReport: 'Report this moment for breaking the community rules?',
    inviteTitle: 'Invite people to Wepawao',
    inviteText: 'Share your personal link. Anyone who opens it and joins becomes your contact right away.',
    callout: ['Use me, share me', ' and be ready to enjoy what is coming!'], calloutShare: 'Share', calloutJoin: ['Start my network', 'or open my page'],
    calloutShareText: 'Wepa! Check out Wepawao, a new social network for new moments. Use it, share it, and be ready to enjoy what is coming!',
    inviteBtn: 'Share my invite link', inviteShareText: 'Wepa! I joined Wepawao and I am already building my network. Join with my link and grow yours too: you watch it grow right in front of you.',
    invitedBy: (n) => `${n} invited you to Wepawao! Join below and you will be connected.`,
    nowContacts: (n) => `You and ${n} are now contacts!`,
    requestsTitle: 'Contact requests', accept: 'Accept', decline: 'Decline',
    myContacts: 'My contacts', noContacts: 'No contacts yet. Share your invite link to start!',
    addContact: 'Add contact', requested: 'Requested', isContact: 'Contact', removeContact: 'Remove',
    confirmRemoveContact: (n) => `Remove ${n} from your contacts? You will stop seeing each other's contacts-only moments.`,
    needUpdate: 'Contacts are being set up. Please check back soon.',
    confirmDelete: 'Delete this post for good? Its photos and comments will be removed too.',
    photoLimit: (n) => `You've reached the maximum of ${n} photos per post.`,
    members: (n) => `${n.toLocaleString('en')} ${n === 1 ? 'member' : 'members'} on Wepawao`,
    sharedPost: 'Shared with you', backToFeed: 'See everything', postGone: 'This post is no longer available.',
    homeTipIos: 'Put Wepawao on your home screen: tap your browser\'s Share button, then "Add to Home Screen".',
    homeTipInstall: 'Put Wepawao on your home screen so it opens like an app.', install: 'Add to home screen',
    banner: 'Wepawao is live for connection today. Coming soon: a fair marketplace and a completely free, multi-tier Affiliate Program tied to your profile email, to reward the people who build this community.',
    gotIt: 'Got it',
    aff: {
      bannerTitle: 'Your Affiliate network',
      bannerOutTitle: 'Free Three-Tier Affiliate Program',
      bannerOutNote: 'Invite people and share in the advertising revenue Wepawao receives. Joining is always free.',
      tierShort: ['Your invites', 'Their invites', 'Next level'],
      join: 'Start my network',
      yourTier: (n) => `Your Tier ${n}`,
      people: (n) => (n === 1 ? 'person' : 'people'),
      communityTitle: 'Wepawao community growth',
      membersLbl: 'members', invitedLbl: 'joined through an invite',
      howTitle: 'How your network grows',
      howSteps: ['You share your invite link', 'They join: your Tier 1', 'They invite: your Tier 2', 'And again: your Tier 3'],
      slide: (i, n) => `Slide ${i} of ${n}`,
      teaserTitle: 'Coming soon: the Wepawao Face Challenge',
      teaserText: 'Feel the excitement in advance! When advertisers arrive, affiliates will show their funniest face and members will vote. The winners will sponsor those advertisers, with the opportunity to receive the corresponding commission compensation.',
      teaserCta: 'You might want to be part of what is coming!',
      tier: (n) => `Tier ${n}`,
      newWeek: (n) => `+${n} this week`,
      open: 'Open my dashboard',
      title: 'Affiliate dashboard', back: '← Back',
      intro: 'Your network grows when someone joins Wepawao through your invite link, and again when they invite others.',
      tierDesc: ['People you invited', 'Invited by your Tier 1', 'Invited by your Tier 2'],
      shareOf: (r) => `${r}% share of ad revenue`,
      total: (n) => `${n.toLocaleString('en')} in your network`,
      growth: 'Network growth, last 8 weeks',
      weekOf: (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      firstTier: 'Your Tier 1',
      noneYet: 'No sub-affiliates yet. Share your invite link to start your network.',
      joined: (d) => `Joined ${new Date(d).toLocaleDateString('en', { dateStyle: 'medium' })}`,
      earningsTitle: 'Commissions',
      earningsText: 'Commissions start once advertising begins. They come only from advertising revenue Wepawao actually receives and has cleared, are paid monthly, and are never guaranteed.',
      loading: 'Loading your network…', error: 'Your network could not be loaded right now. Please try again soon.',
      providersLbl: 'advertisers in the provider bank',
    },
    grow: {
      startTitle: 'Your network starts now',
      startText: 'Share your link once. Every person who joins with it shows up here right away, and you watch your network grow in front of you.',
      startSteps: ['You', 'Tier 1', 'Tier 2', 'Tier 3'],
      startNote: 'When they invite others, your network keeps growing on its own: up to 3 levels.',
      shareBtn: 'Share my link now', later: 'Later',
      joinedOne: (n) => `Wepa! ${n} joined your network`,
      joinedMany: (n) => `Wepa! ${n} people joined your network`,
      grew: 'Wepa! Your network is growing',
      tierLine: (n, tier) => `+${n} in your Tier ${tier}`,
      totalNow: (n) => `Now you have ${n.toLocaleString('en')} ${n === 1 ? 'person' : 'people'} in your network`,
      milestone: (n) => n === 1 ? 'Your very first person!' : `Milestone: ${n.toLocaleString('en')} people!`,
      seeNetwork: 'See my network', shareAgain: 'Share again', keepGoing: 'Keep going',
    },
    contest: {
      title: 'Wepawao Face Challenge',
      bannerTitle: 'Wepawao Face Challenge is on!',
      prizes: (n) => `${n} ${n === 1 ? 'advertiser' : 'advertisers'} up for grabs`,
      winners: (n) => `${n} ${n === 1 ? 'winner' : 'winners'}`,
      endsIn: (ms) => { const h = Math.max(0, Math.ceil(ms / 3600000)); return h > 48 ? `${Math.ceil(h / 24)} days left` : `${h} ${h === 1 ? 'hour' : 'hours'} left` },
      seeEntries: 'Vote now',
      intro: 'A company came to Wepawao directly to advertise. Active affiliates post their funniest face, and members vote. The entries with the most votes win: each winner sponsors one advertiser for 12 months (20% for you, 10% and 5% for your upline).',
      rules: ['Enter with a public moment with a photo of your own face, posted after the challenge opened.', 'Nothing offensive or unsafe, no children, and nobody else\'s face without their permission.', 'Members vote once per entry; accounts must be at least 7 days old, and you cannot vote for yourself.', 'Ties go to whoever entered first. Moments hidden by reports leave the challenge.'],
      enterTitle: 'Enter the challenge',
      enterHow: 'First share your Wepawao Face as a public moment with a photo. Then choose it here.',
      pick: 'Choose your moment', noneEligible: 'No eligible moment yet. Post a public moment with a photo of your face, then come back.',
      agree: 'I agree that my photo is shown publicly for this challenge, and it follows the rules above.',
      enter: 'Enter with this moment', entered: 'You are in! Share Wepawao so people can vote for you.',
      notActive: 'Only active affiliates can enter (signed in, posted or commented in the last 30 days).',
      signIn: 'Sign in to enter or vote.',
      vote: 'Vote', voted: 'Voted', votes: (n) => `${n} ${n === 1 ? 'vote' : 'votes'}`, yours: 'Your entry',
      tooNew: 'Your account can vote once it is 7 days old.',
      noEntries: 'No entries yet. Be the first!',
      closedTitle: 'No challenge right now',
      closedText: 'The Wepawao Face Challenge opens only when a company comes to Wepawao directly to advertise. Watch the banner at the top: it will tell you when it opens.',
      lastWinners: (names) => `Last winners: ${names}`,
      errors: { agree: 'Please check the box to agree.', closed: 'The challenge has closed.', not_active: 'Only active affiliates can enter.', already: 'You already entered this challenge.', not_yours: 'Choose one of your own moments.', not_public: 'The moment must be public and follow the public rules.', no_photo: 'The moment needs a photo.', too_old: 'Choose a moment posted after the challenge opened.', own: 'You cannot vote for yourself.', too_new: 'Your account can vote once it is 7 days old.', sign_in: 'Sign in first.', other: 'Something went wrong. Please try again.' },
    },
    prov: {
      bankTitle: 'Provider bank',
      bankIntro: 'Bring an advertiser to Wepawao with your advertiser link. For 12 months, the advertising they pay for shares 20% with you, 10% with your Tier 2 and 5% with your Tier 3. Your own business counts too: bring it in with your link like any other advertiser.',
      linkBtn: 'Share my advertiser link', linkShareText: 'Advertise your business on Wepawao, the new social network for entrepreneurs.',
      contestNote: 'Advertisers who come straight to Wepawao are won in the Wepawao Face Challenge: active affiliates post a fun photo of their face and members vote. There are as many winners as direct advertisers waiting. You can win again and again.',
      mine: 'Advertisers you sponsor', noneMine: 'None yet. Share your advertiser link to bring in your first one.',
      viaReferral: 'Your advertiser link', viaContest: 'Won in the Wepawao Face Challenge',
      pending: 'Waiting for Wepawao approval', until: (d) => `Sponsored until ${new Date(d).toLocaleDateString('en', { dateStyle: 'medium' })}`,
      earned: 'Commissions from cleared advertising', earnedTotal: 'Total',
      bankSize: (n) => `${n.toLocaleString('en')} ${n === 1 ? 'advertiser' : 'advertisers'} in the bank`,
      contestsWon: (n) => `${n} ${n === 1 ? 'challenge' : 'challenges'} won`,
      teamBtn: 'Wepawao Team: manage the provider bank',
      unavailable: 'The provider bank is being set up. Please check back soon.',
      formTitle: 'Advertise on Wepawao',
      formIntro: 'Reach an organic audience of new entrepreneurs. Tell us about your business and the Wepawao Team will contact you.',
      referredBy: (n) => `Recommended by ${n}`,
      fBusiness: 'Business name', fContact: 'Your name', fEmail: 'Email', fPhone: 'Phone (optional)',
      fWebsite: 'Website or social page (optional)', fOffer: 'What do you offer?',
      send: 'Send', sending: 'Sending…',
      sent: 'Thank you! The Wepawao Team will contact you soon.',
      errors: { missing_business: 'Please enter your business name.', bad_email: 'Please enter a valid email.', already_sent: 'We already received a request from this email today. We will contact you soon.', other: 'It could not be sent right now. Please try again soon.' },
      close: 'Back to Wepawao',
      teamTitle: 'Provider bank: Wepawao Team',
      contestOpen: (d, n) => `Wepawao Face Challenge open until ${d} · ${n} ${n === 1 ? 'entry' : 'entries'}`, contestNone: 'No challenge open: it opens when you approve a direct advertiser.',
      endContest: 'End the challenge now', confirmEnd: 'End the challenge now? The top entries win the waiting advertisers.',
      filters: { new: 'New', active: 'Active', declined: 'Declined' },
      empty: 'No advertisers here yet.',
      referred: (n) => `Referred by ${n}`, direct: 'Came directly to Wepawao',
      sponsor: (n, via) => `Sponsor: ${n} (${via === 'contest' ? 'Wepawao Face Challenge' : 'advertiser link'})`,
      inContest: 'In the Wepawao Face Challenge',
      approve: 'Approve', decline: 'Decline',
      paid: (c) => `Cleared advertising: $${(c / 100).toFixed(2)}`,
      recordPay: 'Record cleared payment', amount: 'Amount in dollars', save: 'Save', cancel: 'Cancel',
      payNote: 'Only record money that has already cleared into the Wepawao account.',
    },
    joinOrSignIn: 'Join or sign in', yourNameNew: 'Your name (new members)', email: 'Email',
    emailLink: 'Email me a link', checkEmail: 'Check your email for a sign-in link.', sending: 'Sending…',
    sentTitle: 'Check your email ✉️', sentTo: 'We sent a sign-in link to',
    sentSteps: ['Open the email from Wepawao and tap "Sign in".', 'Open it on this same phone or computer.', 'Not there in a minute? Check Spam or Promotions.'],
    sentAgain: 'Send it again', sentWait: (s) => `You can send it again in ${s}s`, sentOther: 'Use a different email',
    pwHint: 'Already set a Wepawao password? Sign in here (works in the home-screen app).', pwPlaceholder: 'Password', pwSignIn: 'Sign in with password', pwBad: 'Wrong email or password, or no password set yet. Use the email link once, then set a password in your Profile.', pwTitle: 'Password for the home-screen app', pwSetHint: 'Set a password so you can sign in from the Wepawao icon on your home screen. At least 8 characters.', pwNew: 'New password', pwSave: 'Save password', pwSaved: 'Password saved. You can now sign in with it anywhere.', pwShort: 'Use at least 8 characters.', pwShow: 'Show password', pwHide: 'Hide password', outTitle: 'Sign in once here', outText: 'On iPhone, the Wepawao icon on your home screen keeps its own sign-in, separate from Safari. Tap "Sign in with my password", enter your email and your Wepawao password, and you stay signed in here from then on.', outBtn: 'Sign in with my password', pwNeedEmail: 'Type your email in the Email box above first, then tap Sign in with password.', pwNeedPw: 'Type your password first.', pwOpen: 'Already a member with a password? Sign in here', newHere: 'New to Wepawao? Enter your name and email, then tap "Email me a link". Open the link in that email to finish joining.', pwSame: 'That is already your password. You can sign in with it now.',
    wowTitle: "What's your Wepawao moment?", wowPlaceholder: "Tell your community what's happening…",
    signInToShareText: 'Join free (or sign in) to share it with the community.', signInToShare: 'Join free to share',
    addPhoto: 'Add photo', remove: 'Remove', post: 'Post', posting: 'Posting…',
    photoConsent: 'This is a photo of me, and I agree to show it on my public profile.',
    choosePhoto: 'Take or choose a photo', changePhoto: 'Change photo', uploading: 'Uploading…', removePhoto: 'Remove my photo',
    profilePhoto: 'Profile photo', couldNotRead: 'Could not read that image.',
    listOffer: 'List something to offer', oneTime: 'One-time sale', free: 'Free',
    ongoing: 'Inventory or service', ongoingSub: 'Listed 30 days at a time', ongoingPriced: '$5.00 / 30 days',
    oneTimeNote: 'For a single item, like a mattress or a bicycle. It stays up until you mark it fulfilled.',
    ongoingNote: 'For products in stock and services that need ongoing advertising. Listed 30 days at a time. Billing is not live yet, so listings are free during the demo.',
    ongoingNotePriced: 'For products in stock and services that need ongoing advertising. Listed 30 days at a time. Introductory offer: once Wepawao reaches its launch member goal, your first 30 days are free. Billing is not live yet, so listings are free during the demo.',
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
    peopleTitle: 'People on Wepawao', newestFirst: 'Newest members first.',
    promiseTitle: 'Our promise',
    promiseItems: [
      ['No black boxes.', "Your feed is newest first. We don't rank, score, or reorder it."],
      ['Nothing for sale in the feed.', 'No boosts, no sponsored posts, no pay-to-play.'],
      ['Filters you control.', 'Category and distance only narrow the list. They never reshuffle it.'],
      ['Easy for everyone.', 'Share a moment or list something in under a minute.'],
      ['Your email stays private.', 'It is never shown on your public profile.'],
      ['Less noise.', 'Real moments from real people, without a machine deciding what keeps you scrolling.'],
      ['Transparency.', 'Our rules are published here. When they change, we tell you what changed and why.'],
      ['You share in what Wepawao earns.', 'Through our free Three-Tier Affiliate Program, members who help Wepawao grow will receive a share of the advertising revenue Wepawao actually receives. It costs nothing to join, and it starts paying once advertising begins.'],
    ],
    differentTitle: 'Why Wepawao is different',
    differentText: 'Most big social networks are built to keep you scrolling and to sell your attention. Wepawao shows you what is happening, newest first, and shares the advertising revenue with the members who build the community.',
    policiesTitle: 'Policies',
    policiesNote: 'Plain-language summary for the demo. Full legal versions will be published before launch.',
    policies: [
      ['Privacy', [
        'We collect only what Wepawao needs to work: your email, your name and username, and what you choose to post.',
        'Your email is never shown publicly and is never sold.',
        'Location is attached only when you tick the box, and only as an approximate point.',
        'You can edit or delete your posts and your photo at any time.',
      ]],
      ['Terms of use', [
        'You must be at least 18 to join.',
        'You own what you post. You allow Wepawao to show it to the audience you chose.',
        'Do not post things you do not have the right to share.',
        'Wepawao can remove content or accounts that break these rules.',
      ]],
      ['Community rules', [
        'Be respectful. No harassment, hate, threats or scams.',
        'No adult content, violence or illegal goods or services.',
        'Moments are for moments. Selling goes in What I offer.',
        'Moments are for your contacts by default. A public moment appears in Everyone only if it has no prices or dollar amounts, no web links and no phone numbers, and you have shared fewer than 3 public moments in the last 24 hours.',
        'If a moment breaks a rule, it stays visible to your contacts and Wepawao tells you exactly which rule it broke. Nothing is hidden quietly.',
        'A public moment reported by 3 different members leaves Everyone. Your contacts can still see it.',
        'Use Report on any moment that breaks these rules.',
      ]],
      ['Affiliate Program', [
        'Joining is free, and nobody ever has to buy anything.',
        'Shares come only from advertising revenue Wepawao actually receives: 20% to your first tier, 10% to your second, 5% to your third.',
        'Earnings depend on real advertising revenue and are never guaranteed.',
        'Payments are calculated at the end of each month and sent through Stripe. Taxes are each member\'s responsibility.',
        'Provider bank: every advertiser is sponsored by one affiliate for 12 months. Bring one in with your advertiser link (your own business counts too) and you sponsor it.',
        'Advertisers who come directly to Wepawao are won in the Wepawao Face Challenge, open only while direct advertisers are waiting: one winner per advertiser, chosen by member votes. Wepawao does not have to share these, and does it in good faith. Anyone can win more than once.',
      ]],
    ],
    pricingTitle: 'Pricing',
    pricing1: ['One-time sales are always free.', ' A mattress, a bicycle, a piece of equipment: post it, and close it when it is sold.'],
    pricing2: ['Inventory and services: $5.00 per 30 days', ' (about 17¢ a day). Listings run in 30-day cycles, with a 30-day minimum.'],
    pricing3: ['Introductory offer:', ' once Wepawao reaches its launch member goal, the first 30 days of an inventory or service listing are free.'],
    pricingNote: 'Billing is not live yet, so everything is free during the demo. You pay for time listed, never for position: the feed is always newest first.',
    comingTitle: "What's coming",
    comingToday: ['Today:', ' Wepawao is a place to connect. Share your Wepawao moment and see what is happening, newest first.'],
    comingSoon: ['Soon:', ' a fair marketplace, and a completely free, multi-tier Affiliate Program tied to your profile email, to reward active community builders.'],
    ai: {
      tab: 'AI Moment ✨', regular: 'Regular moment',
      title: 'Share your AI Moment',
      intro: 'Take a photo from your gallery, make an AI version of it with any AI app, and post both. Everyone sees the before and after.',
      original: '1. Your original photo', aiVersion: '2. Your AI version', choose: 'Choose photo', change: 'Change',
      captionPh: 'Tell the story of your AI Moment…',
      howTitle: 'How I made it (optional)', toolPh: 'AI app you used (e.g. ChatGPT, Gemini)', promptPh: 'The prompt you used, so others can try it',
      needBoth: 'Add both photos: the original and its AI version.',
      helpBtn: 'Never used AI? Help me make it', helpHide: 'Hide the guide',
      guideTitle: 'Make your first AI Moment in 3 steps',
      steps: ['Pick a clear photo of yourself from your gallery.', 'Open a free AI app that edits images (ChatGPT, Google Gemini, Meta AI or Microsoft Copilot all have a free option), upload your photo and paste one of the ideas below.', 'Save the image it makes, come back here and post both photos.'],
      ideasTitle: 'Ideas you can copy',
      ideas: [
        ['Superhero', 'Turn the person in this photo into a superhero with an original costume and cape, flying over a city at sunset. Keep their face recognizable.'],
        ['1950s Puerto Rico', 'Turn this photo into a vintage 1950s photograph taken in Old San Juan, Puerto Rico, with period clothes and colorful colonial buildings.'],
        ['My future business', 'Show the person in this photo as the proud owner of their own successful small business, standing at the front door on opening day.'],
        ['Cartoon me', 'Turn this photo into a 3D animated cartoon character with big expressive eyes, bright colors and a happy expression.'],
        ['Astronaut', 'Show the person in this photo as an astronaut on the Moon, with Earth glowing in the sky behind them.'],
        ['Classic painting', 'Turn this photo into a classic oil painting portrait, like a masterpiece hanging in a museum.'],
      ],
      copy: 'Copy', copied: 'Copied!',
      rules: 'Only your own face, or people who said yes. No photos of children. No real brands, logos or famous characters.',
      badge: 'AI Moment ✨', labelOriginal: 'Original', labelAi: 'AI', drag: 'Slide to compare', replay: 'Replay',
      madeWith: (tool) => `Made with ${tool}`, showHow: 'How I made it', hideHow: 'Hide', tryPrompt: 'Copy the prompt and try it',
      filterAll: 'All moments', filterAi: 'AI Moments ✨',
      noAi: 'No AI Moments yet. Be the first!',
    },
    hero: { l1: 'New social media,', l2: 'new moments to remember!', share: 'Share your AI Moment ✨', hide: 'Close' },
    welcome: {
      wepa: 'Wepa!', skip: 'Skip', tap: 'Tap to continue', enter: 'Enter Wepawao', replay: 'Welcome message',
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
    signIn: 'Únete gratis', profile: 'Perfil', signOut: 'Cerrar sesión',
    tabs: { everyone: 'Todos', mine: 'Mis publicaciones', contacts: 'Contactos', discover: 'Descubrir', offer: 'Lo que ofrezco', promise: 'Nuestra promesa' },
    share: 'Compartir', linkCopied: '¡Enlace copiado!', shareText: 'Un momento en Wepawao',
    edit: 'Editar', deletePost: 'Borrar', cancel: 'Cancelar', edited: 'editado', deleting: 'Borrando…',
    editTitle: 'Edita tu publicación', undoRemove: 'Conservar la imagen',
    visContacts: 'Solo contactos', visPublic: 'Público',
    visContactsSub: 'Solo tus contactos lo ven', visPublicSub: 'Todos, si cumple las reglas',
    publicRulesTitle: 'Reglas para momentos públicos',
    publicRules: ['Sin precios ni cantidades de dinero.', 'Sin enlaces web ni números de teléfono.', 'Hasta 3 momentos públicos al día.', 'Se oculta de Todos si 3 miembros lo reportan.'],
    blocked: {
      price: 'menciona un precio o una cantidad de dinero',
      link: 'incluye un enlace web',
      phone: 'incluye un número de teléfono',
      daily_cap: 'ya compartiste 3 momentos públicos en las últimas 24 horas',
      reported: '3 miembros lo reportaron',
    },
    blockedNotice: (r) => `Compartido solo con tus contactos. No es público porque ${r}.`,
    notPublic: 'No es público:',
    report: 'Reportar', reportedThanks: 'Reportado. Gracias.', alreadyReported: 'Ya reportaste esto.',
    confirmReport: '¿Reportar este momento por no cumplir las reglas de la comunidad?',
    inviteTitle: 'Invita personas a Wepawao',
    inviteText: 'Comparte tu enlace personal. Quien lo abra y se una será tu contacto de inmediato.',
    callout: ['Úsame, compárteme', ' y prepárate para disfrutar lo que viene!'], calloutShare: 'Compartir', calloutJoin: ['Empezar mi red', 'o abrir mi página'],
    calloutShareText: '¡Wepa! Mira Wepawao, una nueva red social para nuevos momentos. Úsala, compártela y prepárate para disfrutar lo que viene.',
    inviteBtn: 'Compartir mi enlace de invitación', inviteShareText: '¡Wepa! Me uní a Wepawao y ya estoy armando mi red. Únete con mi enlace y crece la tuya también: la ves crecer frente a tus ojos.',
    invitedBy: (n) => `${n} te invitó a Wepawao. Únete abajo y quedarán conectados.`,
    nowContacts: (n) => `¡Tú y ${n} ahora son contactos!`,
    requestsTitle: 'Solicitudes de contacto', accept: 'Aceptar', decline: 'Rechazar',
    myContacts: 'Mis contactos', noContacts: 'Aún no tienes contactos. ¡Comparte tu enlace de invitación para empezar!',
    addContact: 'Agregar contacto', requested: 'Solicitado', isContact: 'Contacto', removeContact: 'Quitar',
    confirmRemoveContact: (n) => `¿Quitar a ${n} de tus contactos? Dejarán de ver los momentos solo para contactos del otro.`,
    needUpdate: 'Los contactos se están configurando. Vuelve pronto.',
    confirmDelete: '¿Borrar esta publicación para siempre? También se borrarán sus fotos y comentarios.',
    photoLimit: (n) => `Llegaste al máximo de ${n} fotos por publicación.`,
    members: (n) => `${n.toLocaleString('es')} ${n === 1 ? 'miembro' : 'miembros'} en Wepawao`,
    sharedPost: 'Compartido contigo', backToFeed: 'Ver todo', postGone: 'Esta publicación ya no está disponible.',
    homeTipIos: 'Pon Wepawao en tu pantalla de inicio: toca el botón Compartir de tu navegador y luego "Agregar a inicio".',
    homeTipInstall: 'Pon Wepawao en tu pantalla de inicio para abrirlo como una app.', install: 'Agregar a inicio',
    banner: 'Wepawao está activo hoy para conectar. Próximamente: un mercado justo y un Programa de Afiliados completamente gratuito de varios niveles, ligado al correo de tu perfil, para recompensar a quienes construyen esta comunidad.',
    gotIt: 'Entendido',
    aff: {
      bannerTitle: 'Tu red de Afiliados',
      bannerOutTitle: 'Programa de Afiliados de Tres Niveles',
      bannerOutNote: 'Invita personas y participa de los ingresos por publicidad que recibe Wepawao. Unirse siempre es gratis.',
      tierShort: ['Tus invitados', 'Sus invitados', 'Siguiente nivel'],
      join: 'Empezar mi red',
      yourTier: (n) => `Tu Nivel ${n}`,
      people: (n) => (n === 1 ? 'persona' : 'personas'),
      communityTitle: 'Crecimiento de la comunidad Wepawao',
      membersLbl: 'miembros', invitedLbl: 'se unieron con una invitación',
      howTitle: 'Cómo crece tu red',
      howSteps: ['Compartes tu enlace de invitación', 'Se unen: tu Nivel 1', 'Invitan: tu Nivel 2', 'Y otra vez: tu Nivel 3'],
      slide: (i, n) => `Diapositiva ${i} de ${n}`,
      teaserTitle: 'Muy pronto: La Cara Wepawao',
      teaserText: '¡Siente la emoción por adelantado! Cuando lleguen los anunciantes, los afiliados mostrarán su cara más divertida y los miembros votarán. Los ganadores patrocinarán a esos anunciantes, con la oportunidad de recibir la compensación por comisiones correspondiente.',
      teaserCta: '¡Querrás ser parte de lo que viene!',
      tier: (n) => `Nivel ${n}`,
      newWeek: (n) => `+${n} esta semana`,
      open: 'Abrir mi panel',
      title: 'Panel de Afiliados', back: '← Volver',
      intro: 'Tu red crece cuando alguien se une a Wepawao con tu enlace de invitación, y otra vez cuando esa persona invita a otros.',
      tierDesc: ['Personas que invitaste', 'Invitados por tu Nivel 1', 'Invitados por tu Nivel 2'],
      shareOf: (r) => `${r}% de los ingresos por publicidad`,
      total: (n) => `${n.toLocaleString('es')} en tu red`,
      growth: 'Crecimiento de la red, últimas 8 semanas',
      weekOf: (d) => new Date(`${d}T12:00:00`).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      firstTier: 'Tu Nivel 1',
      noneYet: 'Aún no tienes subafiliados. Comparte tu enlace de invitación para empezar tu red.',
      joined: (d) => `Se unió el ${new Date(d).toLocaleDateString('es', { dateStyle: 'medium' })}`,
      earningsTitle: 'Comisiones',
      earningsText: 'Las comisiones comienzan cuando empiece la publicidad. Provienen solo de los ingresos por publicidad que Wepawao recibe y que ya se han acreditado, se pagan mensualmente y nunca están garantizadas.',
      loading: 'Cargando tu red…', error: 'No se pudo cargar tu red en este momento. Inténtalo de nuevo pronto.',
      providersLbl: 'anunciantes en el banco de proveedores',
    },
    grow: {
      startTitle: 'Tu red empieza ahora',
      startText: 'Comparte tu enlace una vez. Cada persona que se una con él aparece aquí al instante, y ves tu red crecer frente a tus ojos.',
      startSteps: ['Tú', 'Nivel 1', 'Nivel 2', 'Nivel 3'],
      startNote: 'Cuando ellos invitan a otros, tu red sigue creciendo sola: hasta 3 niveles.',
      shareBtn: 'Compartir mi enlace ahora', later: 'Más tarde',
      joinedOne: (n) => `¡Wepa! ${n} se unió a tu red`,
      joinedMany: (n) => `¡Wepa! ${n} personas se unieron a tu red`,
      grew: '¡Wepa! Tu red está creciendo',
      tierLine: (n, tier) => `+${n} en tu Nivel ${tier}`,
      totalNow: (n) => `Ahora tienes ${n.toLocaleString('es')} ${n === 1 ? 'persona' : 'personas'} en tu red`,
      milestone: (n) => n === 1 ? '¡Tu primera persona!' : `¡Meta alcanzada: ${n.toLocaleString('es')} personas!`,
      seeNetwork: 'Ver mi red', shareAgain: 'Compartir otra vez', keepGoing: 'Seguir',
    },
    contest: {
      title: 'La Cara Wepawao',
      bannerTitle: '¡La Cara Wepawao comenzó!',
      prizes: (n) => `${n} ${n === 1 ? 'anunciante' : 'anunciantes'} en juego`,
      winners: (n) => `${n} ${n === 1 ? 'ganador' : 'ganadores'}`,
      endsIn: (ms) => { const h = Math.max(0, Math.ceil(ms / 3600000)); return h > 48 ? `quedan ${Math.ceil(h / 24)} días` : `${h === 1 ? 'queda 1 hora' : `quedan ${h} horas`}` },
      seeEntries: 'Vota ya',
      intro: 'Una empresa llegó directamente a Wepawao para anunciarse. Los afiliados activos publican su cara más divertida y los miembros votan. Las participaciones con más votos ganan: cada ganador patrocina a un anunciante por 12 meses (20% para ti, 10% y 5% para tu línea).',
      rules: ['Participa con un momento público con una foto de tu propia cara, publicado después de abrir el reto.', 'Nada ofensivo ni peligroso, sin niños, y sin la cara de otra persona sin su permiso.', 'Cada miembro vota una vez por participación; la cuenta debe tener al menos 7 días y no puedes votar por ti.', 'Los empates los gana quien participó primero. Los momentos ocultos por reportes salen del reto.'],
      enterTitle: 'Participa en el reto',
      enterHow: 'Primero comparte tu Cara Wepawao como un momento público con foto. Luego elígelo aquí.',
      pick: 'Elige tu momento', noneEligible: 'Aún no tienes un momento que califique. Publica un momento público con una foto de tu cara y vuelve.',
      agree: 'Acepto que mi foto se muestre públicamente en este reto y que cumple las reglas de arriba.',
      enter: 'Participar con este momento', entered: '¡Ya estás participando! Comparte Wepawao para que voten por ti.',
      notActive: 'Solo pueden participar afiliados activos (iniciaron sesión, publicaron o comentaron en los últimos 30 días).',
      signIn: 'Inicia sesión para participar o votar.',
      vote: 'Votar', voted: 'Votaste', votes: (n) => `${n} ${n === 1 ? 'voto' : 'votos'}`, yours: 'Tu participación',
      tooNew: 'Tu cuenta podrá votar cuando tenga 7 días.',
      noEntries: 'Aún no hay participaciones. ¡Sé el primero!',
      closedTitle: 'La Cara Wepawao no está abierta ahora',
      closedText: 'La Cara Wepawao solo se abre cuando una empresa llega directamente a Wepawao para anunciarse. Mira el banner de arriba: te avisará cuando se abra.',
      lastWinners: (names) => `Últimos ganadores: ${names}`,
      errors: { agree: 'Marca la casilla para aceptar.', closed: 'El reto ya cerró.', not_active: 'Solo pueden participar afiliados activos.', already: 'Ya participas en este reto.', not_yours: 'Elige uno de tus propios momentos.', not_public: 'El momento debe ser público y cumplir las reglas públicas.', no_photo: 'El momento necesita una foto.', too_old: 'Elige un momento publicado después de abrir el reto.', own: 'No puedes votar por ti.', too_new: 'Tu cuenta podrá votar cuando tenga 7 días.', sign_in: 'Inicia sesión primero.', other: 'Algo salió mal. Inténtalo de nuevo.' },
    },
    prov: {
      bankTitle: 'Banco de proveedores',
      bankIntro: 'Trae un anunciante a Wepawao con tu enlace de anunciante. Durante 12 meses, la publicidad que pague comparte 20% contigo, 10% con tu Nivel 2 y 5% con tu Nivel 3. Tu propio negocio también cuenta: tráelo con tu enlace como cualquier otro anunciante.',
      linkBtn: 'Compartir mi enlace de anunciante', linkShareText: 'Anuncia tu negocio en Wepawao, la nueva red social para emprendedores.',
      contestNote: 'Los anunciantes que llegan directamente a Wepawao se ganan en La Cara Wepawao: los afiliados activos publican una foto divertida de su cara y los miembros votan. Hay tantos ganadores como anunciantes directos esperando. Puedes ganar una y otra vez.',
      mine: 'Anunciantes que patrocinas', noneMine: 'Ninguno todavía. Comparte tu enlace de anunciante para traer el primero.',
      viaReferral: 'Tu enlace de anunciante', viaContest: 'Ganado en La Cara Wepawao',
      pending: 'Esperando aprobación de Wepawao', until: (d) => `Patrocinado hasta el ${new Date(d).toLocaleDateString('es', { dateStyle: 'medium' })}`,
      earned: 'Comisiones de publicidad acreditada', earnedTotal: 'Total',
      bankSize: (n) => `${n.toLocaleString('es')} ${n === 1 ? 'anunciante' : 'anunciantes'} en el banco`,
      contestsWon: (n) => `${n} ${n === 1 ? 'reto ganado' : 'retos ganados'}`,
      teamBtn: 'Equipo Wepawao: administrar el banco de proveedores',
      unavailable: 'El banco de proveedores se está preparando. Vuelve pronto.',
      formTitle: 'Anúnciate en Wepawao',
      formIntro: 'Llega a una audiencia orgánica de nuevos emprendedores. Cuéntanos de tu negocio y el Equipo Wepawao te contactará.',
      referredBy: (n) => `Recomendado por ${n}`,
      fBusiness: 'Nombre del negocio', fContact: 'Tu nombre', fEmail: 'Correo electrónico', fPhone: 'Teléfono (opcional)',
      fWebsite: 'Sitio web o red social (opcional)', fOffer: '¿Qué ofreces?',
      send: 'Enviar', sending: 'Enviando…',
      sent: '¡Gracias! El Equipo Wepawao te contactará pronto.',
      errors: { missing_business: 'Escribe el nombre de tu negocio.', bad_email: 'Escribe un correo válido.', already_sent: 'Ya recibimos una solicitud de este correo hoy. Te contactaremos pronto.', other: 'No se pudo enviar en este momento. Inténtalo de nuevo pronto.' },
      close: 'Volver a Wepawao',
      teamTitle: 'Banco de proveedores: Equipo Wepawao',
      contestOpen: (d, n) => `La Cara Wepawao abierta hasta ${d} · ${n} ${n === 1 ? 'participación' : 'participaciones'}`, contestNone: 'La Cara Wepawao no está abierta: se abre cuando apruebas un anunciante directo.',
      endContest: 'Terminar La Cara Wepawao ahora', confirmEnd: '¿Terminar La Cara Wepawao ahora? Las participaciones con más votos ganan los anunciantes que esperan.',
      filters: { new: 'Nuevos', active: 'Activos', declined: 'Rechazados' },
      empty: 'Todavía no hay anunciantes aquí.',
      referred: (n) => `Referido por ${n}`, direct: 'Llegó directamente a Wepawao',
      sponsor: (n, via) => `Patrocinador: ${n} (${via === 'contest' ? 'La Cara Wepawao' : 'enlace de anunciante'})`,
      inContest: 'En La Cara Wepawao',
      approve: 'Aprobar', decline: 'Rechazar',
      paid: (c) => `Publicidad acreditada: $${(c / 100).toFixed(2)}`,
      recordPay: 'Registrar pago acreditado', amount: 'Cantidad en dólares', save: 'Guardar', cancel: 'Cancelar',
      payNote: 'Registra solo dinero que ya se acreditó en la cuenta de Wepawao.',
    },
    joinOrSignIn: 'Únete o inicia sesión', yourNameNew: 'Tu nombre (miembros nuevos)', email: 'Correo electrónico',
    emailLink: 'Envíame un enlace', checkEmail: 'Revisa tu correo para ver el enlace de acceso.', sending: 'Enviando…',
    sentTitle: 'Revisa tu correo ✉️', sentTo: 'Enviamos un enlace de acceso a',
    sentSteps: ['Abre el correo de Wepawao y toca "Sign in".', 'Ábrelo en este mismo teléfono o computadora.', '¿No llega en un minuto? Revisa Spam o Promociones.'],
    sentAgain: 'Enviarlo otra vez', sentWait: (s) => `Puedes enviarlo otra vez en ${s}s`, sentOther: 'Usar otro correo',
    pwHint: '¿Ya creaste una contraseña de Wepawao? Entra aquí (funciona en la app de tu pantalla de inicio).', pwPlaceholder: 'Contraseña', pwSignIn: 'Entrar con contraseña', pwBad: 'Correo o contraseña incorrectos, o aún no has creado una contraseña. Entra una vez con el enlace del correo y crea tu contraseña en Perfil.', pwTitle: 'Contraseña para la app de la pantalla de inicio', pwSetHint: 'Crea una contraseña para entrar desde el ícono de Wepawao en tu pantalla de inicio. Mínimo 8 caracteres.', pwNew: 'Nueva contraseña', pwSave: 'Guardar contraseña', pwSaved: 'Contraseña guardada. Ya puedes entrar con ella en cualquier lugar.', pwShort: 'Usa al menos 8 caracteres.', pwShow: 'Mostrar contraseña', pwHide: 'Ocultar contraseña', outTitle: 'Entra una vez aquí', outText: 'En iPhone, el ícono de Wepawao en tu pantalla de inicio guarda su propia sesión, aparte de Safari. Toca "Entrar con mi contraseña", escribe tu correo y tu contraseña de Wepawao, y quedarás con la sesión abierta aquí desde entonces.', outBtn: 'Entrar con mi contraseña', pwNeedEmail: 'Primero escribe tu correo en la casilla de correo de arriba y luego toca Entrar con contraseña.', pwNeedPw: 'Primero escribe tu contraseña.', pwOpen: '¿Ya eres miembro y tienes contraseña? Entra aquí', newHere: '¿Nuevo en Wepawao? Escribe tu nombre y correo, y toca "Envíame un enlace". Abre el enlace de ese correo para terminar de unirte.', pwSame: 'Esa ya es tu contraseña. Ya puedes entrar con ella.',
    wowTitle: '¿Cuál es tu momento Wepawao?', wowPlaceholder: 'Cuéntale a tu comunidad qué está pasando…',
    signInToShareText: 'Únete gratis (o inicia sesión) para compartirlo con la comunidad.', signInToShare: 'Únete gratis para compartir',
    addPhoto: 'Añadir foto', remove: 'Quitar', post: 'Publicar', posting: 'Publicando…',
    photoConsent: 'Esta es una foto mía y acepto mostrarla en mi perfil público.',
    choosePhoto: 'Tomar o elegir una foto', changePhoto: 'Cambiar foto', uploading: 'Subiendo…', removePhoto: 'Quitar mi foto',
    profilePhoto: 'Foto de perfil', couldNotRead: 'No se pudo leer esa imagen.',
    listOffer: 'Publica algo para ofrecer', oneTime: 'Venta única', free: 'Gratis',
    ongoing: 'Inventario o servicio', ongoingSub: 'Publicado por periodos de 30 días', ongoingPriced: '$5.00 / 30 días',
    oneTimeNote: 'Para un solo artículo, como un colchón o una bicicleta. Se mantiene hasta que lo marques como cumplido.',
    ongoingNote: 'Para productos en existencia y servicios que necesitan publicidad continua. Se publica por periodos de 30 días. La facturación aún no está activa, así que las publicaciones son gratis durante la demostración.',
    ongoingNotePriced: 'Para productos en existencia y servicios que necesitan publicidad continua. Se publica por periodos de 30 días. Oferta de lanzamiento: cuando Wepawao alcance su meta de miembros, tus primeros 30 días son gratis. La facturación aún no está activa, así que las publicaciones son gratis durante la demostración.',
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
    peopleTitle: 'Personas en Wepawao', newestFirst: 'Miembros más recientes primero.',
    promiseTitle: 'Nuestra promesa',
    promiseItems: [
      ['Sin cajas negras.', 'Tu feed va de lo más reciente a lo más antiguo. No clasificamos, puntuamos ni reordenamos nada.'],
      ['Nada pagado en el feed.', 'Sin impulsos, sin publicaciones patrocinadas, sin pagar por visibilidad.'],
      ['Filtros que tú controlas.', 'La categoría y la distancia solo reducen la lista. Nunca la reordenan.'],
      ['Fácil para todos.', 'Comparte un momento o publica una oferta en menos de un minuto.'],
      ['Tu correo es privado.', 'Nunca se muestra en tu perfil público.'],
      ['Menos ruido.', 'Momentos reales de personas reales, sin una máquina que decida qué te mantiene deslizando.'],
      ['Transparencia.', 'Nuestras reglas están publicadas aquí. Cuando cambien, te diremos qué cambió y por qué.'],
      ['Compartes lo que Wepawao gana.', 'Con nuestro Programa de Afiliados de Tres Niveles, gratuito, los miembros que ayuden a Wepawao a crecer recibirán una parte de los ingresos por publicidad que Wepawao realmente reciba. Unirse no cuesta nada y empieza a pagar cuando comience la publicidad.'],
    ],
    differentTitle: 'Por qué Wepawao es diferente',
    differentText: 'La mayoría de las grandes redes sociales están hechas para mantenerte deslizando y vender tu atención. Wepawao te muestra lo que está pasando, lo más reciente primero, y comparte los ingresos por publicidad con los miembros que construyen la comunidad.',
    policiesTitle: 'Políticas',
    policiesNote: 'Resumen en lenguaje sencillo para la demostración. Las versiones legales completas se publicarán antes del lanzamiento.',
    policies: [
      ['Privacidad', [
        'Solo recopilamos lo que Wepawao necesita para funcionar: tu correo, tu nombre y usuario, y lo que decidas publicar.',
        'Tu correo nunca se muestra en público y nunca se vende.',
        'La ubicación solo se adjunta si marcas la casilla, y solo como un punto aproximado.',
        'Puedes editar o borrar tus publicaciones y tu foto en cualquier momento.',
      ]],
      ['Condiciones de uso', [
        'Debes tener al menos 18 años para unirte.',
        'Lo que publicas es tuyo. Permites que Wepawao lo muestre al público que elegiste.',
        'No publiques cosas que no tienes derecho a compartir.',
        'Wepawao puede quitar contenido o cuentas que no cumplan estas reglas.',
      ]],
      ['Reglas de la comunidad', [
        'Sé respetuoso. Nada de acoso, odio, amenazas ni estafas.',
        'Nada de contenido para adultos, violencia ni bienes o servicios ilegales.',
        'Los momentos son para momentos. Las ventas van en Lo que ofrezco.',
        'Por defecto, los momentos son para tus contactos. Un momento público aparece en Todos solo si no tiene precios ni cantidades de dinero, ni enlaces web, ni números de teléfono, y has compartido menos de 3 momentos públicos en las últimas 24 horas.',
        'Si un momento no cumple una regla, sigue visible para tus contactos y Wepawao te dice exactamente qué regla no cumplió. Nada se oculta en silencio.',
        'Un momento público reportado por 3 miembros distintos sale de Todos. Tus contactos aún pueden verlo.',
        'Usa Reportar en cualquier momento que no cumpla estas reglas.',
      ]],
      ['Programa de Afiliados', [
        'Unirse es gratis y nadie tiene que comprar nada nunca.',
        'Las partes salen solo de los ingresos por publicidad que Wepawao realmente reciba: 20% por tu primer nivel, 10% por el segundo y 5% por el tercero.',
        'Las ganancias dependen de ingresos reales por publicidad y nunca están garantizadas.',
        'Los pagos se calculan al final de cada mes y se envían por Stripe. Los impuestos son responsabilidad de cada miembro.',
        'Banco de proveedores: cada anunciante tiene un afiliado patrocinador por 12 meses. Trae uno con tu enlace de anunciante (tu propio negocio también cuenta) y tú lo patrocinas.',
        'Los anunciantes que llegan directamente a Wepawao se ganan en La Cara Wepawao, que solo se abre cuando hay anunciantes directos esperando: un ganador por anunciante, elegido por los votos de los miembros. Wepawao no tiene la obligación de compartirlos y lo hace de buena fe. Cualquiera puede ganar más de una vez.',
      ]],
    ],
    pricingTitle: 'Precios',
    pricing1: ['Las ventas únicas siempre son gratis.', ' Un colchón, una bicicleta, un equipo: publícalo y ciérralo cuando se venda.'],
    pricing2: ['Inventario y servicios: $5.00 por 30 días', ' (unos 17¢ al día). Las publicaciones funcionan en ciclos de 30 días, con un mínimo de 30 días.'],
    pricing3: ['Oferta de lanzamiento:', ' cuando Wepawao alcance su meta de miembros, los primeros 30 días de una publicación de inventario o servicio serán gratis.'],
    pricingNote: 'La facturación aún no está activa, así que todo es gratis durante la demostración. Pagas por el tiempo publicado, nunca por la posición: el feed siempre muestra lo más reciente primero.',
    comingTitle: 'Lo que viene',
    comingToday: ['Hoy:', ' Wepawao es un lugar para conectar. Comparte tu momento Wepawao y mira lo que está pasando, lo más reciente primero.'],
    comingSoon: ['Pronto:', ' un mercado justo y un Programa de Afiliados completamente gratuito de varios niveles, ligado al correo de tu perfil, para recompensar a quienes construyen la comunidad.'],
    ai: {
      tab: 'Momento IA ✨', regular: 'Momento normal',
      title: 'Comparte tu Momento IA',
      intro: 'Toma una foto de tu galería, crea su versión con IA en cualquier app de IA y publica las dos. Todos verán el antes y el después.',
      original: '1. Tu foto original', aiVersion: '2. Tu versión con IA', choose: 'Elegir foto', change: 'Cambiar',
      captionPh: 'Cuenta la historia de tu Momento IA…',
      howTitle: 'Cómo lo hice (opcional)', toolPh: 'App de IA que usaste (ej. ChatGPT, Gemini)', promptPh: 'La instrucción (prompt) que usaste, para que otros la prueben',
      needBoth: 'Añade las dos fotos: la original y su versión con IA.',
      helpBtn: '¿Nunca has usado IA? Ayúdame a hacerlo', helpHide: 'Ocultar la guía',
      guideTitle: 'Haz tu primer Momento IA en 3 pasos',
      steps: ['Elige una foto clara de ti en tu galería.', 'Abre una app de IA gratis que edite imágenes (ChatGPT, Google Gemini, Meta AI o Microsoft Copilot tienen opción gratis), sube tu foto y pega una de las ideas de abajo.', 'Guarda la imagen que crea, vuelve aquí y publica las dos fotos.'],
      ideasTitle: 'Ideas que puedes copiar',
      ideas: [
        ['Superhéroe', 'Convierte a la persona de esta foto en un superhéroe con un traje y capa originales, volando sobre una ciudad al atardecer. Mantén su cara reconocible.'],
        ['Puerto Rico en los 50', 'Convierte esta foto en una fotografía antigua de los años 50 tomada en el Viejo San Juan, Puerto Rico, con ropa de la época y edificios coloniales coloridos.'],
        ['Mi negocio futuro', 'Muestra a la persona de esta foto como la orgullosa dueña de su propio negocio exitoso, parada en la puerta el día de la apertura.'],
        ['Yo en caricatura', 'Convierte esta foto en un personaje de caricatura animada en 3D, con ojos grandes y expresivos, colores brillantes y una expresión feliz.'],
        ['Astronauta', 'Muestra a la persona de esta foto como astronauta en la Luna, con la Tierra brillando en el cielo detrás.'],
        ['Pintura clásica', 'Convierte esta foto en un retrato clásico al óleo, como una obra maestra colgada en un museo.'],
      ],
      copy: 'Copiar', copied: '¡Copiado!',
      rules: 'Solo tu propia cara, o personas que dijeron que sí. Sin fotos de niños. Sin marcas, logos ni personajes famosos reales.',
      badge: 'Momento IA ✨', labelOriginal: 'Original', labelAi: 'IA', drag: 'Desliza para comparar', replay: 'Repetir',
      madeWith: (tool) => `Hecho con ${tool}`, showHow: 'Cómo lo hice', hideHow: 'Ocultar', tryPrompt: 'Copia la instrucción y pruébala',
      filterAll: 'Todos los momentos', filterAi: 'Momentos IA ✨',
      noAi: 'Aún no hay Momentos IA. ¡Sé el primero!',
    },
    hero: { l1: 'Una nueva red social,', l2: 'nuevos momentos para recordar.', share: 'Comparte tu Momento IA ✨', hide: 'Cerrar' },
    welcome: {
      wepa: '¡Wepa!', skip: 'Saltar', tap: 'Toca para continuar', enter: 'Entrar a Wepawao', replay: 'Mensaje de bienvenida',
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE = 20
const CATEGORIES = ['general', 'produce', 'tools', 'services', 'household', 'free']
const TABS = ['everyone', 'mine', 'contacts', 'discover', 'offer', 'promise']
// Set to true later to show listing prices ($5.00 / 30 days) and the Pricing card.
const SHOW_PRICING = false

const LangCtx = createContext({ lang: 'en', t: I18N.en, setLang: () => {} })
const useLang = () => useContext(LangCtx)
const loc = (lang) => (lang === 'es' ? 'es' : 'en')

// ---------- Shared styles ----------
const card = 'rounded-3xl border-2 border-[#dcdff5] bg-white p-5'
const field = 'w-full rounded-2xl border-2 border-[#dcdff5] bg-[#eef0fc] px-4 py-3 text-[#14123a] placeholder:text-stone-400'
const primary = 'rounded-full bg-[#4a3af0] px-6 py-3 font-bold text-white disabled:bg-[#b4adf8]'
const ghost = 'rounded-full border-2 border-[#4a3af0] px-5 py-2 font-bold text-[#4a3af0] disabled:opacity-40'
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

// New features (4 photos, visibility, contacts) need the database update. Until it is applied,
// the app keeps working the old way: one photo, every moment public, no Contacts tab.
let schemaCheck = null
function supportsMultiPhoto() {
  if (!schemaCheck) {
    schemaCheck = supabase.from('posts').select('image_paths,edited_at,visibility,public_block_reason').limit(1)
      .then(({ error }) => !error).catch(() => false)
      // Never remember a failed check: it can fail just because sign-in was still settling.
      .then((ok) => { if (!ok) schemaCheck = null; return ok })
  }
  return schemaCheck
}
// Re-checks whenever the signed-in member changes, so signing in later still unlocks Contacts.
function useSchemaReady() {
  const [ready, setReady] = useState(false)
  const [who, setWho] = useState(null)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setWho(s?.user.id || null))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    let alive = true
    supportsMultiPhoto().then((ok) => {
      if (!alive) return
      setReady(ok)
      if (!ok) setTimeout(() => { if (alive) supportsMultiPhoto().then((ok2) => alive && setReady(ok2)) }, 3000)
    })
    return () => { alive = false }
  }, [who])
  return ready
}
const NEW_COLS = 'image_paths,edited_at,visibility,public_block_reason,'

// "Use me, share me" strip under the top bar, on every screen. Members share their own invite link
// (so new people join their network). Visitors are invited to join first, so they have a link of their own.
function ShareCallout({ me, onJoin }) {
  const { t, lang } = useLang()
  const [note, setNote] = useState('')
  async function share() {
    const url = inviteLink(me, lang)
    if (navigator.share) {
      try { await navigator.share({ title: 'Wepawao', text: t.calloutShareText, url }); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(url); setNote(t.linkCopied); setTimeout(() => setNote(''), 2500) } catch { window.prompt('', url) }
  }
  return (
    <div className="flex items-center justify-center gap-3 bg-[#14123a] px-4 py-2 text-sm text-white">
      <p className="min-w-0 text-center leading-snug">
        <b className="text-[#f6d155]">{lang === 'es' ? '¡' : ''}{t.callout[0]}</b>{t.callout[1]}
      </p>
      {me
        ? (
          <button onClick={share} className="shrink-0 rounded-full bg-[#f6d155] px-3 py-1 text-xs font-bold text-[#14123a]">
            {note || t.calloutShare}
          </button>
        )
        : (
          <button onClick={onJoin} className="shrink-0 rounded-2xl bg-[#f6d155] px-3 py-1 text-center text-xs font-bold leading-tight text-[#14123a]">
            {t.calloutJoin[0]}<br /><span className="font-semibold opacity-75">{t.calloutJoin[1]}</span>
          </button>
        )}
    </div>
  )
}

function inviteLink(me, lang) {
  return `${window.location.origin}/?invite=${me}&ref=${me}&lang=${lang}`
}

// Connections of the signed-in member: { [otherId]: { id, status, incoming } }
function useConnections(me, ready, refreshKey) {
  const [map, setMap] = useState({})
  const load = useCallback(async () => {
    if (!me || !ready) { setMap({}); return }
    const { data } = await supabase.from('connections').select('id,requester_id,addressee_id,status')
    const next = {}
    for (const c of data || []) {
      const other = c.requester_id === me ? c.addressee_id : c.requester_id
      next[other] = { id: c.id, status: c.status, incoming: c.addressee_id === me }
    }
    setMap(next)
  }, [me, ready])
  useEffect(() => { load() }, [load, refreshKey])
  return { map, reload: load }
}
function useMaxPhotos() {
  const [max, setMax] = useState(1)
  useEffect(() => { supportsMultiPhoto().then((ok) => setMax(ok ? 4 : 1)) }, [])
  return max
}
const postImages = (p) => (p.image_paths?.length ? p.image_paths : p.image_path ? [p.image_path] : [])
const imageFields = (paths, multi) => (multi ? { image_path: paths[0] || null, image_paths: paths } : { image_path: paths[0] || null })

function postLink(id, lang) {
  return `${window.location.origin}/?post=${id}&lang=${lang}`
}
// Opens the phone's share sheet (WhatsApp, Messages, email…). Falls back to copying the link.
async function sharePost(p, t, lang) {
  const url = postLink(p.id, lang)
  const text = (p.title || p.body || t.shareText).slice(0, 140)
  if (navigator.share) {
    try { await navigator.share({ title: 'Wepawao', text, url }); return null } catch (e) { if (e?.name === 'AbortError') return null }
  }
  try { await navigator.clipboard.writeText(url); return t.linkCopied } catch { window.prompt('', url); return null }
}

// A member's own posts (My posts / My offer). Newest first. Shows every status so owners can manage them.
async function fetchMine(me, cursor, kind) {
  const multi = await supportsMultiPhoto()
  const ai = multi && await supportsAi()
  let q = supabase
    .from('posts')
    .select(`id,user_id,kind,category,title,body,price_cents,location_text,image_path,${multi ? NEW_COLS : ''}${ai ? 'ai_moment,ai_prompt,ai_tool,' : ''}caricature_image_url,status,listing_type,expires_at,created_at`)
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
function SignIn({ startWithPassword = false }) {
  const { t, lang } = useLang()
  const [email, setEmailRaw] = useState(() => { try { return localStorage.getItem('wao_signin_email') || '' } catch { return '' } })
  const setEmail = (v) => { setEmailRaw(v); try { localStorage.setItem('wao_signin_email', v) } catch { /* ignore */ } }
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [password, setPassword] = useState('')
  const [pwOpen, setPwOpen] = useState(startWithPassword)
  const [sentTo, setSentTo] = useState('')
  const [sending, setSending] = useState(false)
  const [wait, setWait] = useState(0)
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  async function signInPw() {
    if (!email.trim()) return setMsg(t.pwNeedEmail)
    if (!password) return setMsg(t.pwNeedPw)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) setMsg(t.pwBad)
  }

  async function submit(e) {
    e?.preventDefault()
    if (sending) return
    setSending(true); setMsg('')
    let ref = new URLSearchParams(window.location.search).get('ref')
    try { ref = ref || localStorage.getItem('wao_invite') } catch { /* ignore */ }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: name || undefined, referred_by: ref || undefined },
        emailRedirectTo: `${window.location.origin}/?lang=${lang}`,
      },
    })
    setSending(false)
    if (error) { setMsg(error.message); return }
    setSentTo(email.trim()); setWait(60)
  }

  // After sending: the form steps aside and a clear "check your email" card takes its place.
  if (sentTo) {
    return (
      <div className={`${card} space-y-3`}>
        <h2 className="text-2xl font-extrabold">{t.sentTitle}</h2>
        <p className="text-stone-700">{t.sentTo} <b className="break-all text-[#14123a]">{sentTo}</b>.</p>
        <ol className="space-y-2 text-sm text-stone-600">
          {t.sentSteps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6d155] text-xs font-extrabold text-[#14123a]">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <div className="flex flex-wrap items-center gap-3 border-t border-[#dcdff5] pt-3">
          <button type="button" className={ghostSm} disabled={wait > 0 || sending} onClick={() => submit()}>
            {wait > 0 ? t.sentWait(wait) : sending ? t.sending : t.sentAgain}
          </button>
          <button type="button" className="text-sm font-bold text-[#4a3af0] underline" onClick={() => { setSentTo(''); setMsg('') }}>{t.sentOther}</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h2 className="text-xl font-bold">{t.joinOrSignIn}</h2>
      <p className="text-sm text-stone-600">{t.newHere}</p>
      <input className={field} placeholder={t.yourNameNew} value={name} onChange={(e) => setName(e.target.value)} />
      <input className={field} type="email" required placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className={primary} disabled={sending}>{sending ? t.sending : t.emailLink}</button>
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
      <div className="space-y-2 border-t border-[#dcdff5] pt-3">
        {!pwOpen ? (
          <button type="button" className="text-sm font-bold text-[#4a3af0] underline" onClick={() => setPwOpen(true)}>{t.pwOpen}</button>
        ) : (<>
          <p className="text-sm text-stone-600">{t.pwHint}</p>
          <PasswordInput autoComplete="current-password" placeholder={t.pwPlaceholder}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className={primary} onClick={signInPw}>{t.pwSignIn}</button>
        </>)}
      </div>
    </form>
  )
}

// ---------- Profile photo ----------
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

// ---------- Photos (new posts and editing) ----------
// Each item is either { path } (already saved) or { blob, url } (picked now, not uploaded yet).
function PhotoGrid({ items, onRemove }) {
  const { t } = useLang()
  if (!items.length) return null
  return (
    <div className={`grid gap-2 ${items.length > 1 ? 'grid-cols-2' : ''}`}>
      {items.map((it, i) => (
        <div key={it.path || it.url} className="relative">
          <img src={it.url || photoUrl(it.path)} alt="" className={`w-full rounded-2xl object-cover ${items.length > 1 ? 'aspect-square' : 'max-h-64'}`} />
          <button type="button" onClick={() => onRemove(i)} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">{t.remove}</button>
        </div>
      ))}
    </div>
  )
}

function usePhotoPicker(initial, max, onError) {
  const [items, setItems] = useState(initial)
  const [limitHit, setLimitHit] = useState(false)
  const fileRef = useRef(null)
  async function pick(e) {
    const chosen = Array.from(e.target.files || [])
    const files = chosen.slice(0, Math.max(0, max - items.length))
    if (chosen.length > files.length) setLimitHit(true)
    if (fileRef.current) fileRef.current.value = ''
    const added = []
    for (const file of files) {
      try {
        const blob = await resizeImage(file)
        added.push({ blob, url: URL.createObjectURL(blob) })
      } catch { onError() }
    }
    setItems((cur) => [...cur, ...added].slice(0, max))
  }
  function removeAt(i) {
    setLimitHit(false)
    setItems((cur) => {
      if (cur[i]?.url) URL.revokeObjectURL(cur[i].url)
      return cur.filter((_, k) => k !== i)
    })
  }
  function reset(next = []) {
    items.forEach((it) => it.url && URL.revokeObjectURL(it.url))
    setLimitHit(false)
    setItems(next)
  }
  function open() {
    if (items.length >= max) { setLimitHit(true); return }
    setLimitHit(false)
    fileRef.current?.click()
  }
  const input = <input ref={fileRef} type="file" accept="image/*" multiple={max > 1} hidden onChange={pick} />
  return { items, removeAt, reset, input, open, limitHit }
}

// Uploads any new photos and returns the full ordered list of storage paths, plus the ones just uploaded.
async function uploadPhotos(items, userId, postId) {
  const paths = []
  const uploaded = []
  for (const it of items) {
    if (it.path) { paths.push(it.path); continue }
    const path = `${userId}/${postId}-${crypto.randomUUID().slice(0, 8)}.jpg`
    const { error } = await supabase.storage.from(BUCKET).upload(path, it.blob, { contentType: 'image/jpeg' })
    if (error) {
      if (uploaded.length) supabase.storage.from(BUCKET).remove(uploaded)
      throw error
    }
    paths.push(path)
    uploaded.push(path)
  }
  return { paths, uploaded }
}

// ---------- Who can see a moment ----------
function VisibilityPicker({ value, onChange }) {
  const { t } = useLang()
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {[['contacts', t.visContacts, t.visContactsSub], ['public', t.visPublic, t.visPublicSub]].map(([k, l, sub]) => (
          <button type="button" key={k} onClick={() => onChange(k)} aria-pressed={value === k}
            className={`rounded-2xl border-2 bg-white px-3 py-2 text-left ${value === k ? 'border-[#4a3af0] !bg-[#e8e9fb]' : 'border-[#dcdff5]'}`}>
            <div className="font-bold">{l}</div>
            <div className="text-sm text-stone-500">{sub}</div>
          </button>
        ))}
      </div>
      {value === 'public' && (
        <div className="rounded-2xl bg-[#fff8dc] px-3 py-2 text-sm">
          <b>{t.publicRulesTitle}</b>
          <ul className="mt-1 list-disc pl-5 text-stone-700">{t.publicRules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

// ---------- Composer ----------
function Composer({ userId, mode, onPosted }) {
  const { t } = useLang()
  const kind = mode === 'offer' ? 'offer' : 'update'
  const detailed = kind === 'offer'
  const [ltype, setLtype] = useState('one_time')
  const [f, setF] = useState({ category: 'general', title: '', body: '', price: '', area: '' })
  const [geo, setGeo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [visibility, setVisibility] = useState('contacts')
  const ready = useSchemaReady()
  const maxPhotos = useMaxPhotos()
  const photos = usePhotoPicker([], maxPhotos, () => setError(t.couldNotRead))

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const coords = () =>
    new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({}),
        { timeout: 8000 }
      )
    )

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const postId = crypto.randomUUID()
    let uploaded = []
    try {
      const up = await uploadPhotos(photos.items, userId, postId)
      uploaded = up.uploaded
      const multi = await supportsMultiPhoto()
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
        ...imageFields(up.paths, multi),
        ...(multi && kind === 'update' ? { visibility } : {}),
        ...where,
      })
      if (postErr) throw postErr
      let notice = ''
      if (multi && kind === 'update' && visibility === 'public') {
        const { data } = await supabase.from('posts').select('public_block_reason').eq('id', postId).single()
        if (data?.public_block_reason) notice = t.blockedNotice(t.blocked[data.public_block_reason])
      }
      setF({ category: 'general', title: '', body: '', price: '', area: '' })
      setGeo(false)
      photos.reset()
      onPosted(notice)
    } catch (err) {
      if (uploaded.length) supabase.storage.from(BUCKET).remove(uploaded)
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

      <PhotoGrid items={photos.items} onRemove={photos.removeAt} />

      {photos.limitHit && <p className="text-sm font-semibold text-[#4a3af0]">{t.photoLimit(maxPhotos)}</p>}

      {ready && kind === 'update' && <VisibilityPicker value={visibility} onChange={setVisibility} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {photos.input}
        <button type="button" className={ghost} onClick={photos.open}>{t.addPhoto}</button>
        <span className="text-sm text-stone-500">{f.body.length} / 500</span>
        <button disabled={busy || !f.body.trim()} className={`${primary} ml-auto`}>{busy ? t.posting : t.post}</button>
      </div>
    </form>
  )
}

// ---------- AI Moments ----------
// An AI Moment is a moment with two photos: the original (first) and its AI version (second),
// plus an optional "How I made it" (the AI app and the prompt), so others can try it too.
let aiCheck = null
function supportsAi() {
  if (!aiCheck) {
    aiCheck = supabase.from('posts').select('ai_moment,ai_prompt,ai_tool').limit(1)
      .then(({ error }) => !error).catch(() => false)
      .then((ok) => { if (!ok) aiCheck = null; return ok })
  }
  return aiCheck
}
function useAiReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { let alive = true; supportsAi().then((ok) => alive && setReady(ok)); return () => { alive = false } }, [])
  return ready
}

function CopyButton({ text, className = ghostSm }) {
  const { t } = useLang()
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) } catch { window.prompt('', text) }
  }
  return <button type="button" className={className} onClick={copy}>{done ? t.ai.copied : t.ai.copy}</button>
}

// "Help me make it": a beginner's guide with free tools and prompt ideas to copy.
function AiGuide() {
  const { t } = useLang()
  return (
    <div className="space-y-3 rounded-3xl bg-[#14123a] p-4 text-white">
      <div className="flex items-center gap-3">
        <WaoFaces size={30} />
      </div>
      <h3 className="text-lg font-extrabold text-[#f6d155]">{t.ai.guideTitle}</h3>
      <ol className="space-y-2 text-sm">
        {t.ai.steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f6d155] text-xs font-extrabold text-[#14123a]">{i + 1}</span>
            <span className="text-white/90">{s}</span>
          </li>
        ))}
      </ol>
      <h4 className="pt-1 font-bold">{t.ai.ideasTitle}</h4>
      <div className="space-y-2">
        {t.ai.ideas.map(([name, prompt]) => (
          <div key={name} className="rounded-2xl bg-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <b className="text-[#f6d155]">{name}</b>
              <CopyButton text={prompt} className="rounded-full bg-[#f6d155] px-3 py-1 text-xs font-bold text-[#14123a]" />
            </div>
            <p className="mt-1 text-sm text-white/80">{prompt}</p>
          </div>
        ))}
      </div>
      <p className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/80">{t.ai.rules}</p>
    </div>
  )
}

// One photo slot (original or AI version).
function PhotoSlot({ label, picker }) {
  const { t } = useLang()
  const item = picker.items[0]
  return (
    <div className="space-y-2">
      <div className="text-sm font-bold">{label}</div>
      {picker.input}
      {item
        ? (
          <div className="relative">
            <img src={item.url} alt="" className="aspect-square w-full rounded-2xl object-cover" />
            <button type="button" onClick={() => picker.removeAt(0)}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">{t.ai.change}</button>
          </div>
        )
        : (
          <button type="button" onClick={picker.open}
            className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-[#b4adf8] bg-[#eef0fc] text-sm font-bold text-[#4a3af0]">
            + {t.ai.choose}
          </button>
        )}
    </div>
  )
}

function AiComposer({ userId, onPosted }) {
  const { t } = useLang()
  const [body, setBody] = useState('')
  const [tool, setTool] = useState('')
  const [prompt, setPrompt] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [guide, setGuide] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const original = usePhotoPicker([], 1, () => setError(t.couldNotRead))
  const aiVersion = usePhotoPicker([], 1, () => setError(t.couldNotRead))
  const both = original.items.length === 1 && aiVersion.items.length === 1

  async function submit(e) {
    e.preventDefault()
    if (!both) { setError(t.ai.needBoth); return }
    setBusy(true); setError('')
    const postId = crypto.randomUUID()
    let uploaded = []
    try {
      const up = await uploadPhotos([original.items[0], aiVersion.items[0]], userId, postId)
      uploaded = up.uploaded
      const { error: postErr } = await supabase.from('posts').insert({
        id: postId, user_id: userId, kind: 'update', listing_type: 'one_time', category: 'general',
        body: body.trim(), ...imageFields(up.paths, true), visibility,
        ai_moment: true, ai_tool: tool.trim() || null, ai_prompt: prompt.trim() || null,
      })
      if (postErr) throw postErr
      let notice = ''
      if (visibility === 'public') {
        const { data } = await supabase.from('posts').select('public_block_reason').eq('id', postId).single()
        if (data?.public_block_reason) notice = t.blockedNotice(t.blocked[data.public_block_reason])
      }
      setBody(''); setTool(''); setPrompt(''); original.reset(); aiVersion.reset()
      onPosted(notice)
    } catch (err) {
      if (uploaded.length) supabase.storage.from(BUCKET).remove(uploaded)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h2 className="text-2xl font-extrabold">{t.ai.title}</h2>
      <p className="text-sm text-stone-600">{t.ai.intro}</p>
      <button type="button" className="text-sm font-bold text-[#4a3af0] underline" onClick={() => setGuide((v) => !v)}>
        {guide ? t.ai.helpHide : t.ai.helpBtn}
      </button>
      {guide && <AiGuide />}
      <div className="grid grid-cols-2 gap-3">
        <PhotoSlot label={t.ai.original} picker={original} />
        <PhotoSlot label={t.ai.aiVersion} picker={aiVersion} />
      </div>
      <textarea className={`${field} min-h-20`} required maxLength={500} placeholder={t.ai.captionPh}
        value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="space-y-2 rounded-2xl border-2 border-[#dcdff5] p-3">
        <div className="text-sm font-bold">{t.ai.howTitle}</div>
        <input className={field} maxLength={60} placeholder={t.ai.toolPh} value={tool} onChange={(e) => setTool(e.target.value)} />
        <textarea className={`${field} min-h-16`} maxLength={600} placeholder={t.ai.promptPh} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <VisibilityPicker value={visibility} onChange={setVisibility} />
      <p className="text-xs text-stone-500">{t.ai.rules}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-500">{body.length} / 500</span>
        <button disabled={busy || !body.trim() || !both} className={`${primary} ml-auto`}>{busy ? t.posting : t.post}</button>
      </div>
    </form>
  )
}

// Moments composer: AI Moment first, regular moment second.
function MomentComposer({ userId, onPosted }) {
  const { t } = useLang()
  const ready = useAiReady()
  const [ai, setAi] = useState(true)
  return (
    <div className="space-y-2">
      {ready && (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-2 ring-[#dcdff5]">
          {[[true, t.ai.tab], [false, t.ai.regular]].map(([v, l]) => (
            <button key={l} type="button" onClick={() => setAi(v)}
              className={`rounded-full px-3 py-2 text-sm font-bold ${ai === v ? 'bg-[#4a3af0] text-white' : 'text-[#6b6f93]'}`}>{l}</button>
          ))}
        </div>
      )}
      {ready && ai ? <AiComposer userId={userId} onPosted={onPosted} /> : <Composer userId={userId} mode="update" onPosted={onPosted} />}
    </div>
  )
}

// Before/after view: drag the handle to reveal the original over the AI version.
// Before/after reveal: starts on the full original photo; when it scrolls into view, the divider
// sweeps slowly across to reveal the AI version. Members can drag it any time, or tap replay.
function BeforeAfter({ original, aiVersion }) {
  const { t } = useLang()
  const [pos, setPos] = useState(100)
  const box = useRef(null)
  const raf = useRef(0)
  const played = useRef(false)
  const stop = () => cancelAnimationFrame(raf.current)
  const play = useCallback(() => {
    stop()
    if (reducedMotion()) { setPos(0); return }
    setPos(100)
    let start
    const HOLD = 900, DUR = 3200
    const step = (ts) => {
      start ??= ts
      const k = Math.min(1, Math.max(0, (ts - start - HOLD) / DUR))
      const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      setPos(100 - 100 * eased)
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => {
    const el = box.current
    if (!el || !('IntersectionObserver' in window)) { play(); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6 && !played.current) { played.current = true; play() }
    }, { threshold: [0, 0.6, 1] })
    io.observe(el)
    return () => { io.disconnect(); stop() }
  }, [play])
  return (
    <div className="mt-3 space-y-1">
      <div ref={box} className="relative aspect-square w-full select-none overflow-hidden rounded-2xl bg-[#eef0fc]">
        <img loading="lazy" alt="" src={photoUrl(aiVersion)} className="absolute inset-0 h-full w-full object-cover" />
        <img loading="lazy" alt="" src={photoUrl(original)} className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <div className="pointer-events-none absolute inset-y-0 w-1 bg-white shadow" style={{ left: `calc(${pos}% - 2px)`, opacity: pos > 98 || pos < 2 ? 0 : 1 }}>
          <div className="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-extrabold text-[#4a3af0] shadow">⇆</div>
        </div>
        {pos > 8 && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">{t.ai.labelOriginal}</span>}
        {pos < 92 && <span className="absolute right-2 top-2 rounded-full bg-[#4a3af0] px-2 py-0.5 text-xs font-bold text-white">{t.ai.labelAi} ✨</span>}
        <input type="range" min="0" max="100" value={pos} onPointerDown={stop} onTouchStart={stop}
          onChange={(e) => { stop(); setPos(Number(e.target.value)) }}
          aria-label={t.ai.drag} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
      <div className="flex items-center justify-center gap-3 text-xs text-stone-400">
        <span>{t.ai.drag}</span>
        <button type="button" onClick={play} className="font-bold text-[#4a3af0]">↻ {t.ai.replay}</button>
      </div>
    </div>
  )
}

function AiHow({ p }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  if (!p.ai_prompt && !p.ai_tool) return null
  return (
    <div className="mt-2 rounded-2xl bg-[#eef0fc] px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{p.ai_tool ? t.ai.madeWith(p.ai_tool) : t.ai.showHow}</span>
        {p.ai_prompt && <button className="text-xs font-bold text-[#4a3af0]" onClick={() => setOpen((v) => !v)}>{open ? t.ai.hideHow : t.ai.showHow}</button>}
      </div>
      {open && p.ai_prompt && (
        <div className="mt-2 space-y-2">
          <p className="whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-stone-700">{p.ai_prompt}</p>
          <div className="flex items-center gap-2"><CopyButton text={p.ai_prompt} /><span className="text-xs text-stone-500">{t.ai.tryPrompt}</span></div>
        </div>
      )}
    </div>
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

// ---------- Edit a post ----------
function PostEditor({ p, me, onDone, onCancel }) {
  const { t } = useLang()
  const [title, setTitle] = useState(p.title || '')
  const [body, setBody] = useState(p.body || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [keepCaricature, setKeepCaricature] = useState(!!p.caricature_image_url)
  const [visibility, setVisibility] = useState(p.visibility || 'contacts')
  const canChooseVisibility = p.kind === 'update' && p.visibility != null
  const maxPhotos = useMaxPhotos()
  const original = postImages(p)
  const photos = usePhotoPicker(original.map((path) => ({ path })), Math.max(maxPhotos, original.length), () => setErr(t.couldNotRead))

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    let uploaded = []
    try {
      const up = await uploadPhotos(photos.items, me, p.id)
      uploaded = up.uploaded
      const multi = await supportsMultiPhoto()
      const { error } = await supabase.from('posts').update({
        body: body.trim(),
        ...(p.kind !== 'update' ? { title: title.trim() || null } : {}),
        ...(p.caricature_image_url && !keepCaricature ? { caricature_image_url: null } : {}),
        ...(canChooseVisibility ? { visibility } : {}),
        ...imageFields(up.paths, multi),
      }).eq('id', p.id).eq('user_id', me)
      if (error) throw error
      const dropped = original.filter((path) => !up.paths.includes(path))
      if (dropped.length) supabase.storage.from(BUCKET).remove(dropped)
      photos.reset()
      onDone()
    } catch (e2) {
      if (uploaded.length) supabase.storage.from(BUCKET).remove(uploaded)
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3 rounded-2xl bg-[#eef0fc] p-3">
      <h3 className="font-bold text-[#4a3af0]">{t.editTitle}</h3>
      {p.kind !== 'update' && <input className={`${field} !bg-white`} maxLength={120} placeholder={t.offeringPh} value={title} onChange={(e) => setTitle(e.target.value)} />}
      <textarea className={`${field} min-h-24 !bg-white`} required maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
      {p.caricature_image_url && keepCaricature && (
        <div className="relative max-w-sm">
          <img src={p.caricature_image_url} alt="" className="w-full rounded-2xl bg-white" />
          <button type="button" onClick={() => setKeepCaricature(false)} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">{t.remove}</button>
        </div>
      )}
      {p.caricature_image_url && !keepCaricature && (
        <button type="button" className="text-sm text-stone-500 underline" onClick={() => setKeepCaricature(true)}>{t.undoRemove}</button>
      )}
      {!p.ai_moment && <PhotoGrid items={photos.items} onRemove={photos.removeAt} />}
      {photos.input}
      {photos.limitHit && <p className="text-sm font-semibold text-[#4a3af0]">{t.photoLimit(maxPhotos)}</p>}
      {canChooseVisibility && <VisibilityPicker value={visibility} onChange={setVisibility} />}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!p.ai_moment && <button type="button" className={ghostSm} onClick={photos.open}>{t.addPhoto}</button>}
        <button type="button" className={ghostSm} onClick={() => { photos.reset(); onCancel() }}>{t.cancel}</button>
        <button disabled={busy || !body.trim()} className={`${primary} ml-auto !py-2`}>{busy ? t.saving : t.save}</button>
      </div>
    </form>
  )
}

// ---------- One post ----------
function PostCard({ p, me, onChanged }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const images = postImages(p)
  const mine = me && p.user_id === me
  const ongoing = p.listing_type === 'ongoing'
  const expired = !!p.expires_at && new Date(p.expires_at) < new Date()
  const inactive = (!!p.status && p.status !== 'active') || expired
  const canClose = mine && p.kind !== 'update' && !inactive
  const moment = p.kind === 'update' && p.visibility != null
  const isPublic = moment && p.visibility === 'public' && !p.public_block_reason
  const canShare = !inactive && (!moment || isPublic)
  const canReport = !!me && !mine && moment && p.visibility === 'public'

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
  async function remove() {
    if (!window.confirm(t.confirmDelete)) return
    setErr('')
    setDeleting(true)
    const { error } = await supabase.from('posts').delete().eq('id', p.id).eq('user_id', me)
    setDeleting(false)
    if (error) return setErr(error.message)
    if (images.length) supabase.storage.from(BUCKET).remove(images)
    onChanged()
  }
  async function report() {
    if (!window.confirm(t.confirmReport)) return
    const { error } = await supabase.from('reports').insert({ reporter_id: me, post_id: p.id, reported_user_id: p.user_id })
    const msg = !error ? t.reportedThanks : error.code === '23505' ? t.alreadyReported : error.message
    setNote(msg); setTimeout(() => setNote(''), 3000)
  }
  async function share() {
    const msg = await sharePost(p, t, lang)
    if (msg) { setNote(msg); setTimeout(() => setNote(''), 2500) }
  }

  return (
    <article className={`${card} ${inactive ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar url={p.author_avatar_url} name={p.author_display_name} />
        <div className="min-w-0 flex-1">
          <div className="truncate"><b>{p.author_display_name}</b> <span className="text-sm text-stone-500">@{p.author_username}</span></div>
          <time className="text-xs text-stone-500">{when(p.created_at, lang)}{p.edited_at && ` · ${t.edited}`}</time>
        </div>
        {p.ai_moment && <span className={`${chip} shrink-0 !bg-[#14123a] !text-[#f6d155]`}>{t.ai.badge}</span>}
        {moment && mine && (
          <span className={`${chip} shrink-0 ${isPublic ? '!bg-emerald-100' : ''}`}>{isPublic ? t.visPublic : t.visContacts}</span>
        )}
      </div>
      {moment && mine && p.visibility === 'public' && p.public_block_reason && !editing && (
        <p className="mt-3 rounded-2xl bg-[#fff8dc] px-3 py-2 text-sm"><b>{t.notPublic}</b> {t.blocked[p.public_block_reason]}.</p>
      )}
      {editing ? (
        <PostEditor p={p} me={me} onCancel={() => setEditing(false)} onDone={() => { setEditing(false); onChanged() }} />
      ) : (
        <>
          {p.title && <h3 className="mt-3 text-lg font-bold">{p.title}</h3>}
          <p className="mt-2 whitespace-pre-wrap">{p.body}</p>
          {p.caricature_image_url && <img loading="lazy" alt="" src={p.caricature_image_url} className="mt-3 w-full max-w-sm rounded-2xl bg-[#eef0fc]" />}
          {p.ai_moment && images.length >= 2 && (
            <>
              <BeforeAfter original={images[0]} aiVersion={images[1]} />
              <AiHow p={p} />
            </>
          )}
          {!(p.ai_moment && images.length >= 2) && images.length > 0 && (
            <div className={`mt-3 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : ''}`}>
              {images.map((path) => (
                <a key={path} href={photoUrl(path)} target="_blank" rel="noreferrer">
                  <img loading="lazy" alt="" src={photoUrl(path)}
                    className={`w-full rounded-2xl object-cover ${images.length > 1 ? 'aspect-square' : 'max-h-96'}`} />
                </a>
              ))}
            </div>
          )}
        </>
      )}
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
        {canShare && <button className={ghostSm} onClick={share}>{t.share}</button>}
        {canReport && <button className={ghostSm} onClick={report}>{t.report}</button>}
        {mine && !editing && <button className={ghostSm} onClick={() => setEditing(true)}>{t.edit}</button>}
        {mine && <button className={ghostSm} disabled={deleting} onClick={remove}>{deleting ? t.deleting : t.deletePost}</button>}
        {canClose && <button className={ghostSm} onClick={close}>{ongoing ? t.closeListing : t.markFulfilled}</button>}
        {mine && inactive && <button className={ghostSm} onClick={reopen}>{ongoing ? t.renew : t.reopen}</button>}
        {note && <span className="text-sm font-semibold text-emerald-700">{note}</span>}
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

      <PasswordSetter />

      <div className="mt-8 border-t border-[#dcdff5] pt-6">
        <button type="button" className={ghostSm} onClick={onSignOut}>{t.signOut}</button>
      </div>
    </div>
  )
}

// Password field with a show/hide eye toggle (easier typing on phones).
function PasswordInput(props) {
  const { t } = useLang()
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} className={`${field} pr-14`} type={show ? 'text' : 'password'} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? t.pwHide : t.pwShow} title={show ? t.pwHide : t.pwShow}
        className="absolute inset-y-0 right-1 flex w-12 items-center justify-center text-stone-500">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </div>
  )
}

// Lets a member set a password, so the home-screen app (which cannot use email links) can sign in.
function PasswordSetter() {
  const { t } = useLang()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(e) {
    e.preventDefault()
    if (pw.length < 8) return setMsg(t.pwShort)
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    setMsg(error ? (error.code === 'same_password' ? t.pwSame : error.message) : t.pwSaved)
    if (!error) setPw('')
  }
  return (
    <form onSubmit={save} className="space-y-2 border-t border-[#dcdff5] pt-4">
      <h3 className="font-bold">{t.pwTitle}</h3>
      <p className="text-sm text-stone-600">{t.pwSetHint}</p>
      <PasswordInput autoComplete="new-password" placeholder={t.pwNew} value={pw} onChange={(e) => setPw(e.target.value)} />
      <button disabled={busy} className={primary}>{t.pwSave}</button>
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </form>
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
  const aiReady = useAiReady()
  const [aiOnly, setAiOnly] = useState(false)

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
      ...(mode === 'everyone' && aiOnly ? { p_ai: true } : {}),
    })
    if (error) throw error
    return data
  }, [mode, filters, coords, me, aiOnly])

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
      {mode === 'everyone' && aiReady && (
        <div className="flex gap-2">
          {[[true, t.ai.filterAi], [false, t.ai.filterAll]].map(([v, l]) => (
            <button key={l} onClick={() => setAiOnly(v)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${aiOnly === v ? 'bg-[#14123a] text-[#f6d155]' : 'bg-white text-[#6b6f93] ring-2 ring-[#dcdff5]'}`}>{l}</button>
          ))}
        </div>
      )}
      {mode === 'everyone' && aiOnly && !loading && posts.length === 0 && (
        <div className={`${card} text-center text-stone-600`}>{t.ai.noAi}</div>
      )}
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

// ---------- Contact rows ----------
function PersonRow({ p, children }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar url={p.avatar_url} name={p.display_name} />
      <div className="min-w-0 flex-1">
        <div className="truncate"><b>{p.display_name}</b> <span className="text-sm text-stone-500">@{p.username}</span></div>
        {p.location_text && <div className="text-xs text-stone-500">{p.location_text}</div>}
      </div>
      {children}
    </div>
  )
}

// Add / Requested / Accept / Contact, with no duplicate requests (the database allows one link per pair).
function ContactButton({ me, person, conn, onChanged }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  if (!me || person.id === me) return null
  const c = conn[person.id]
  async function run(fn) { setBusy(true); await fn(); setBusy(false); onChanged() }
  if (!c) {
    return <button className={ghostSm} disabled={busy}
      onClick={() => run(() => supabase.from('connections').insert({ requester_id: me, addressee_id: person.id }))}>{t.addContact}</button>
  }
  if (c.status === 'pending' && c.incoming) {
    return <button className={`${ghostSm} !bg-[#4a3af0] !text-white`} disabled={busy}
      onClick={() => run(() => supabase.from('connections').update({ status: 'accepted' }).eq('id', c.id))}>{t.accept}</button>
  }
  if (c.status === 'pending') return <span className={chip}>{t.requested}</span>
  return <span className={`${chip} !bg-emerald-100`}>{t.isContact}</span>
}

// ---------- Contacts tab ----------
function Contacts({ me, conn, onChanged, ready }) {
  const { t, lang } = useLang()
  const [profiles, setProfiles] = useState({})
  const [note, setNote] = useState('')
  const ids = Object.keys(conn)
  const idKey = ids.sort().join(',')

  useEffect(() => {
    if (!idKey) { setProfiles({}); return }
    supabase.from('profiles').select('id,username,display_name,avatar_url,location_text').in('id', idKey.split(','))
      .then(({ data }) => setProfiles(Object.fromEntries((data || []).map((p) => [p.id, p]))))
  }, [idKey])

  async function shareInvite() {
    const url = inviteLink(me, lang)
    if (navigator.share) {
      try { await navigator.share({ title: 'Wepawao', text: t.inviteShareText, url }); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(url); setNote(t.linkCopied); setTimeout(() => setNote(''), 2500) } catch { window.prompt('', url) }
  }
  async function decline(c) {
    await supabase.from('connections').delete().eq('id', c.id)
    onChanged()
  }
  async function removeContact(c, p) {
    if (!window.confirm(t.confirmRemoveContact(p?.display_name || ''))) return
    await supabase.from('connections').delete().eq('id', c.id)
    onChanged()
  }

  if (!me) return <div className={`${card} text-stone-600`}>{t.needLogin}</div>
  if (!ready) return <div className={`${card} text-stone-600`}>{t.needUpdate}</div>

  const incoming = ids.filter((id) => conn[id].status === 'pending' && conn[id].incoming)
  const accepted = ids.filter((id) => conn[id].status === 'accepted')

  return (
    <>
      <div className={`${card} space-y-3`}>
        <h2 className="text-xl font-bold">{t.inviteTitle}</h2>
        <p className="text-stone-600">{t.inviteText}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className={primary} onClick={shareInvite}>{t.inviteBtn}</button>
          {note && <span className="text-sm font-semibold text-emerald-700">{note}</span>}
        </div>
      </div>

      {incoming.length > 0 && (
        <div className={`${card} space-y-3`}>
          <h2 className="text-xl font-bold">{t.requestsTitle}</h2>
          {incoming.map((id) => profiles[id] && (
            <PersonRow key={id} p={profiles[id]}>
              <ContactButton me={me} person={profiles[id]} conn={conn} onChanged={onChanged} />
              <button className="text-sm text-stone-500 underline" onClick={() => decline(conn[id])}>{t.decline}</button>
            </PersonRow>
          ))}
        </div>
      )}

      <div className={`${card} space-y-3`}>
        <h2 className="text-xl font-bold">{t.myContacts}</h2>
        {accepted.length === 0 && <p className="text-stone-600">{t.noContacts}</p>}
        {accepted.map((id) => profiles[id] && (
          <PersonRow key={id} p={profiles[id]}>
            <button className="text-sm text-stone-500 underline" onClick={() => removeContact(conn[id], profiles[id])}>{t.removeContact}</button>
          </PersonRow>
        ))}
      </div>
    </>
  )
}

// ---------- A post opened from a shared link (?post=…) ----------
function SharedPost({ id, me, onClose, onChanged }) {
  const { t } = useLang()
  const [p, setP] = useState(undefined)
  useEffect(() => {
    let cancelled = false
    Promise.all([supportsMultiPhoto(), supportsAi()]).then(([multi, ai]) =>
      supabase.from('posts')
        .select(`id,user_id,kind,category,title,body,price_cents,location_text,image_path,${multi ? NEW_COLS : ''}${multi && ai ? 'ai_moment,ai_prompt,ai_tool,' : ''}caricature_image_url,status,listing_type,expires_at,created_at,profiles(username,display_name,avatar_url)`)
        .eq('id', id).maybeSingle()
    ).then(({ data }) => {
      if (cancelled) return
      setP(data ? { ...data, author_username: data.profiles?.username, author_display_name: data.profiles?.display_name, author_avatar_url: data.profiles?.avatar_url } : null)
    })
    return () => { cancelled = true }
  }, [id])
  if (p === undefined) return null
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-[#4a3af0]">{t.sharedPost}</h2>
        <button className="text-sm text-stone-500 underline" onClick={onClose}>{t.backToFeed}</button>
      </div>
      {p ? <PostCard p={p} me={me} onChanged={onChanged} /> : <div className={`${card} text-stone-600`}>{t.postGone}</div>}
    </section>
  )
}

// ---------- Home-screen tip ----------
// Phones (iPhone and Android): show how to add Wepawao from the browser's Share button. Where the browser offers it, also show an install button.
function HomeScreenTip() {
  const { t } = useLang()
  const [installEvt, setInstallEvt] = useState(null)
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('wao_home_tip_hidden') === '1' } catch { return false }
  })
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const mobile = ios || /android/i.test(navigator.userAgent)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  const hide = () => { try { localStorage.setItem('wao_home_tip_hidden', '1') } catch { /* ignore */ } setHidden(true) }
  if (hidden || standalone || (!mobile && !installEvt)) return null
  return (
    <div className="flex items-start gap-3 rounded-3xl border-2 border-[#dcdff5] bg-white px-4 py-3 text-sm">
      <img src="/apple-touch-icon.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <p>{mobile ? t.homeTipIos : t.homeTipInstall}</p>
        {installEvt && (
          <button className={ghostSm} onClick={async () => { installEvt.prompt(); await installEvt.userChoice; hide() }}>{t.install}</button>
        )}
      </div>
      <button className="text-xs text-stone-500 underline" onClick={hide}>{t.gotIt}</button>
    </div>
  )
}

// ---------- Affiliate Program: tier banner + dashboard ----------
// Data comes from the my_affiliate_tiers() database function (built from profiles.referred_by).
// Tier 1 = people you invited, Tier 2 = people they invited, Tier 3 = the next level.
const TIER_RATES = [20, 10, 5]
const TIER_COLORS = ['#4a3af0', '#9a8ff7', '#e0a800']

function useAffiliateTiers(me, refreshKey) {
  const [state, setState] = useState({ data: null, error: false, loading: !!me })
  useEffect(() => {
    if (!me) { setState({ data: null, error: false, loading: false }); return }
    let live = true
    setState((s) => ({ ...s, loading: true }))
    supabase.rpc('my_affiliate_tiers', { p_weeks: 8 }).then(({ data, error }) => {
      if (live) setState({ data: error ? null : data, error: !!error, loading: false })
    })
    return () => { live = false }
  }, [me, refreshKey])
  return state
}

async function shareInviteLink(me, lang, t, onCopied) {
  const url = inviteLink(me, lang)
  if (navigator.share) {
    try { await navigator.share({ title: 'Wepawao', text: t.inviteShareText, url }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  try { await navigator.clipboard.writeText(url); onCopied?.() } catch { window.prompt('', url) }
}

function TierDot({ i }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TIER_COLORS[i] }} />
}

// Banner at the front of the platform: a slideshow that changes every few seconds.
// Members: their network, then each tier with its number counting up, then the whole community.
// Visitors: the three tiers, how a network grows, then the whole community.
const SLIDE_MS = 4500
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useCommunityStats(refreshKey) {
  const [data, setData] = useState(null)
  useEffect(() => {
    supabase.rpc('affiliate_community_stats').then(({ data, error }) => { if (!error) setData(data) })
  }, [refreshKey])
  return data
}

// Counts from 0 up to value each time its slide becomes active.
function CountUp({ value, active }) {
  const [n, setN] = useState(value ?? 0)
  useEffect(() => {
    if (value == null) return
    if (!active || reducedMotion() || value === 0) { setN(value); return }
    let raf, start
    const dur = Math.min(1400, 500 + value * 60)
    const step = (ts) => {
      start ??= ts
      const k = Math.min(1, (ts - start) / dur)
      setN(Math.round(value * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    setN(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, active])
  return <span className="tabular-nums">{value == null ? '–' : n.toLocaleString()}</span>
}

function Slideshow({ slides, onOpen }) {
  const { t } = useLang()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef(null)
  const count = slides.length
  useEffect(() => { if (idx >= count) setIdx(0) }, [count, idx])
  useEffect(() => {
    if (paused || count < 2 || reducedMotion()) return
    const id = setInterval(() => { if (document.visibilityState === 'visible') setIdx((i) => (i + 1) % count) }, SLIDE_MS)
    return () => clearInterval(id)
  }, [paused, count, idx])
  const go = (d) => setIdx((i) => (i + d + count) % count)
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#14123a] text-white"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true) }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touch.current = null; setPaused(false)
      }}>
      <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${idx * 100}%)` }}>
        {slides.map((render, i) => (
          <div key={i} className={`w-full shrink-0 px-4 pt-3 pb-7 ${onOpen ? 'cursor-pointer' : ''}`} aria-hidden={i !== idx}
            role="group" aria-label={t.aff.slide(i + 1, count)} onClick={onOpen}>
            {render(i === idx)}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button key={i} aria-label={t.aff.slide(i + 1, count)} onClick={(e) => { e.stopPropagation(); setIdx(i) }}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#f6d155]' : 'w-1.5 bg-white/35'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function TierTiles({ values, sub, active, money }) {
  const { t } = useLang()
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-white/10 px-3 py-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/75"><TierDot i={i} />{t.aff.tier(i + 1)}</div>
          {money
            ? <div className="text-2xl font-extrabold text-[#f6d155]">{TIER_RATES[i]}%</div>
            : (
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-2xl font-extrabold"><CountUp value={values[i]} active={active} /></span>
                <span className="text-xs font-bold text-[#f6d155]">{TIER_RATES[i]}%</span>
              </div>
            )}
          <div className={`text-xs leading-tight ${sub[i].hot ? 'font-bold text-emerald-300' : 'text-white/60'}`}>{sub[i].text}</div>
        </div>
      ))}
    </div>
  )
}

function SlideHead({ title, right }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-bold">{title}</span>
      {right && <span className="text-xs font-bold text-[#f6d155]">{right}</span>}
    </div>
  )
}

function CommunitySlide({ stats, active }) {
  const { t } = useLang()
  return (
    <>
      <SlideHead title={t.aff.communityTitle} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[['members', 'members_week', t.aff.membersLbl], ['invited', 'invited_week', t.aff.invitedLbl]].map(([k, wk, lbl]) => (
          <div key={k} className="rounded-2xl bg-white/10 px-3 py-2">
            <div className="text-3xl font-extrabold"><CountUp value={stats?.[k]} active={active} /></div>
            <div className="text-xs leading-tight text-white/75">{lbl}</div>
            <div className={`text-xs ${stats?.[wk] ? 'font-bold text-emerald-300' : 'text-white/50'}`}>{t.aff.newWeek(stats?.[wk] ?? 0)}</div>
          </div>
        ))}
      </div>
      {stats?.providers > 0 && (
        <div className="mt-2 text-xs text-white/75"><b className="text-[#f6d155]"><CountUp value={stats.providers} active={active} /></b> {t.aff.providersLbl}</div>
      )}
    </>
  )
}

// Cartoon faces for the Wepawao Face teaser (original drawings, brand colors).
const INK = '#14123a'
const FACES = [
  { bg: '#f6d155', draw: ( // big laugh
    <>
      <path d="M11 16q3-4 6 0M23 16q3-4 6 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M10 22h20q-1 11-10 11T10 22z" fill={INK} />
      <path d="M15 29q5-4 10 0q-5 4-10 0z" fill="#ff7a93" />
    </>
  ) },
  { bg: '#9a8ff7', draw: ( // wink with tongue out
    <>
      <circle cx="14" cy="16" r="2.6" fill={INK} />
      <path d="M23 16h6" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 24q8 7 16 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M21 27h6v4a3 3 0 0 1-6 0z" fill="#ff7a93" stroke={INK} strokeWidth="1.5" />
    </>
  ) },
  { bg: '#ff9eb5', draw: ( // shocked
    <>
      <circle cx="14" cy="16" r="4.5" fill="#fff" stroke={INK} strokeWidth="1.8" /><circle cx="14" cy="16" r="1.8" fill={INK} />
      <circle cx="26" cy="16" r="4.5" fill="#fff" stroke={INK} strokeWidth="1.8" /><circle cx="26" cy="16" r="1.8" fill={INK} />
      <path d="M9 8.5q4-3.5 8-1M31 8.5q-4-3.5-8-1" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="29" rx="4" ry="5" fill={INK} />
    </>
  ) },
  { bg: '#7fd6c2', draw: ( // goofy cross-eyed
    <>
      <circle cx="14" cy="16" r="4.5" fill="#fff" stroke={INK} strokeWidth="1.8" /><circle cx="16.3" cy="17" r="1.8" fill={INK} />
      <circle cx="26" cy="16" r="4.5" fill="#fff" stroke={INK} strokeWidth="1.8" /><circle cx="23.7" cy="17" r="1.8" fill={INK} />
      <path d="M11 27q3-3 6 0t6 0t6 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ) },
  { bg: '#f6d155', draw: ( // cool shades
    <>
      <path d="M8 14h24" stroke={INK} strokeWidth="2" />
      <rect x="9" y="13" width="9" height="6" rx="2.5" fill={INK} /><rect x="22" y="13" width="9" height="6" rx="2.5" fill={INK} />
      <path d="M14 27q6 3 12-2" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ) },
]

function WepawaoFaces({ size = 44 }) {
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {FACES.map((f, i) => (
        <svg key={i} viewBox="0 0 40 40" width={size} height={size} className="wepawao-face shrink-0" style={{ animationDelay: `${i * 0.35}s` }}>
          <circle cx="20" cy="20" r="18.5" fill={f.bg} stroke={INK} strokeWidth="1.5" />
          {f.draw}
        </svg>
      ))}
    </div>
  )
}

// "Coming soon" card for the Wepawao Face Challenge, shown under the hero (where the member count was).
function TeaserCard({ onJoin, onContest, refreshKey }) {
  const { t } = useLang()
  const [contest] = useContest(refreshKey)
  // While a challenge is open, the card invites everyone to vote instead.
  if (contest?.open) {
    return (
      <div className="space-y-2 rounded-3xl border-2 border-[#f6d155] bg-[#fff8dc] px-4 py-4">
        <div className="flex justify-center"><WepawaoFaces size={52} /></div>
        <h3 className="text-center text-lg font-extrabold text-[#4a3af0]">{t.contest.bannerTitle}</h3>
        <p className="text-center text-sm text-stone-700">
          {t.contest.prizes(contest.prizes)} · {t.contest.endsIn(new Date(contest.ends_at) - Date.now())}
        </p>
        <div className="flex justify-center"><button className={primary} onClick={onContest}>{t.contest.seeEntries}</button></div>
      </div>
    )
  }
  return (
    <div className="space-y-2 rounded-3xl border-2 border-[#dcdff5] bg-white px-4 py-4">
      <div className="flex justify-center"><WepawaoFaces size={52} /></div>
      <h3 className="text-center text-lg font-extrabold text-[#4a3af0]">{t.aff.teaserTitle}</h3>
      <p className="text-center text-sm text-stone-600">{t.aff.teaserText}</p>
      <p className="text-center font-bold">{t.aff.teaserCta}</p>
      {onJoin && <div className="flex justify-center"><button className={primary} onClick={onJoin}>{t.aff.join}</button></div>}
    </div>
  )
}

function AffiliateBanner({ me, refreshKey, onOpen, onSignIn, onContest }) {
  const { t } = useLang()
  const { data } = useAffiliateTiers(me, refreshKey)
  const community = useCommunityStats(refreshKey)
  const [contest] = useContest(refreshKey)
  const contestSlide = contest?.open ? [() => (
    <div onClick={(e) => { e.stopPropagation(); onContest() }}>
      <SlideHead title={t.contest.bannerTitle} right={`${t.contest.seeEntries} →`} />
      <div className="mt-2 flex items-end gap-3">
        <div className="text-5xl font-extrabold leading-none text-[#f6d155]">{contest.prizes}</div>
        <div className="pb-1 text-sm text-white/80">{t.contest.prizes(contest.prizes).replace(/^\d+\s*/, '')}</div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-white/70">{t.contest.votes(contest.entries.reduce((n, e) => n + e.votes, 0))} · {contest.entries.length} 😜</span>
        <span className="font-bold text-emerald-300">{t.contest.endsIn(new Date(contest.ends_at) - Date.now())}</span>
      </div>
    </div>
  )] : []

  if (!me) {
    const slides = [
      ...contestSlide,
      () => (
        <>
          <SlideHead title={t.aff.bannerOutTitle} />
          <TierTiles money sub={t.aff.tierShort.map((text) => ({ text }))} />
          <div className="mt-3 flex items-center gap-3">
            <p className="min-w-0 flex-1 text-xs leading-snug text-white/80">{t.aff.bannerOutNote}</p>
            <button className="shrink-0 rounded-full bg-[#f6d155] px-4 py-1.5 text-sm font-bold text-[#14123a]"
              onClick={(e) => { e.stopPropagation(); onSignIn() }}>{t.aff.join}</button>
          </div>
        </>
      ),
      () => (
        <>
          <SlideHead title={t.aff.howTitle} />
          <ol className="mt-2 space-y-1.5 text-sm">
            {t.aff.howSteps.map((step, i) => (
              <li key={i} className="flex items-center gap-2">
                {i === 0
                  ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6d155] text-[10px] font-extrabold text-[#14123a]">!</span>
                  : <span className="ml-1 h-3 w-3 shrink-0 rounded-full" style={{ background: TIER_COLORS[i - 1] }} />}
                <span className="flex-1">{step}</span>
                {i > 0 && <b className="text-[#f6d155]">{TIER_RATES[i - 1]}%</b>}
              </li>
            ))}
          </ol>
        </>
      ),
      (active) => <CommunitySlide stats={community} active={active} />,
    ]
    return <Slideshow slides={slides} />
  }

  const counts = [data?.tier1, data?.tier2, data?.tier3]
  const fresh = [data?.week1 ?? 0, data?.week2 ?? 0, data?.week3 ?? 0]
  const total = data ? counts[0] + counts[1] + counts[2] : null
  const slides = [
    ...contestSlide,
    (active) => (
      <>
        <SlideHead title={t.aff.bannerTitle} right={`${t.aff.open} →`} />
        <TierTiles values={counts} active={active} sub={fresh.map((f) => ({ text: t.aff.newWeek(f), hot: f > 0 }))} />
      </>
    ),
    ...[0, 1, 2].map((i) => (active) => (
      <>
        <SlideHead title={t.aff.yourTier(i + 1)} right={`${TIER_RATES[i]}%`} />
        <div className="mt-2 flex items-end gap-3">
          <span className="h-12 w-1.5 rounded-full" style={{ background: TIER_COLORS[i] }} />
          <div className="text-5xl font-extrabold leading-none"><CountUp value={counts[i]} active={active} /></div>
          <div className="pb-1 text-sm text-white/75">{t.aff.people(counts[i] ?? 0)}</div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-white/70">{t.aff.tierDesc[i]}</span>
          <span className={fresh[i] ? 'font-bold text-emerald-300' : 'text-white/50'}>{t.aff.newWeek(fresh[i])}</span>
        </div>
      </>
    )),
    (active) => (
      <>
        <SlideHead title={t.aff.bannerTitle} right={`${t.aff.open} →`} />
        <div className="mt-2 text-5xl font-extrabold leading-none"><CountUp value={total} active={active} /></div>
        <div className="mt-1 text-sm text-white/75">{total == null ? '' : t.aff.total(total).replace(/^[\d.,\s]+/, '')}</div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
          {total > 0 && counts.map((c, i) => <span key={i} style={{ width: `${(c / total) * 100}%`, background: TIER_COLORS[i] }} />)}
        </div>
      </>
    ),
    (active) => <CommunitySlide stats={community} active={active} />,
  ]
  return <Slideshow slides={slides} onOpen={onOpen} />
}

// Stacked weekly bars: the size of each tier at the end of each week.
function TierGrowthChart({ weeks }) {
  const { t } = useLang()
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...weeks.map((w) => w.t1 + w.t2 + w.t3))
  const H = 140
  const shown = hover ?? weeks.length - 1
  const w = weeks[shown]
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {w && <span className="font-bold text-[#14123a]">{t.aff.weekOf(w.week)}</span>}
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex items-center gap-1.5"><TierDot i={i} />{t.aff.tier(i + 1)} <b className="tabular-nums text-[#14123a]">{w ? w[`t${i + 1}`] : 0}</b></span>
        ))}
      </div>
      <div className="flex items-end gap-1.5" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        {weeks.map((wk, k) => {
          const vals = [wk.t1, wk.t2, wk.t3]
          const total = vals[0] + vals[1] + vals[2]
          return (
            <button key={wk.week} aria-label={t.aff.weekOf(wk.week)} onMouseEnter={() => setHover(k)} onClick={() => setHover(k)}
              className={`flex h-full flex-1 flex-col-reverse rounded-lg ${k === shown ? 'bg-[#eef0fc]' : ''}`}>
              {total === 0 && <span className="block h-0.5 w-full rounded bg-[#dcdff5]" />}
              {vals.map((v, i) => v > 0 && (
                <span key={i} className="block w-full first:rounded-b-md last:rounded-t-md"
                  style={{ height: `${(v / max) * (H - 8)}px`, background: TIER_COLORS[i], marginTop: 2 }} />
              ))}
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-stone-500">
        <span>{weeks[0] && t.aff.weekOf(weeks[0].week)}</span>
        <span>{weeks.at(-1) && t.aff.weekOf(weeks.at(-1).week)}</span>
      </div>
    </div>
  )
}

function AffiliateDashboard({ me, refreshKey, onBack, isAdmin, onTeam }) {
  const { t, lang } = useLang()
  const { data, error, loading } = useAffiliateTiers(me, refreshKey)
  const [note, setNote] = useState('')
  if (!me) return <div className={`${card} text-stone-600`}>{t.needLogin}</div>
  const counts = [data?.tier1 ?? 0, data?.tier2 ?? 0, data?.tier3 ?? 0]
  const fresh = [data?.week1 ?? 0, data?.week2 ?? 0, data?.week3 ?? 0]
  const total = counts[0] + counts[1] + counts[2]
  return (
    <div className="space-y-4">
      <div className={`${card} space-y-2`}>
        <button className="text-sm font-bold text-[#4a3af0]" onClick={onBack}>{t.aff.back}</button>
        <h2 className="text-2xl font-extrabold">{t.aff.title}</h2>
        <p className="text-stone-600">{t.aff.intro}</p>
        {data && <p className="text-sm font-bold text-[#4a3af0]">{t.aff.total(total)}</p>}
      </div>

      {loading && !data && <div className={`${card} text-stone-600`}>{t.aff.loading}</div>}
      {error && <div className={`${card} text-stone-600`}>{t.aff.error}</div>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${card} !p-4`}>
                <div className="flex items-center gap-2 text-sm font-bold"><TierDot i={i} />{t.aff.tier(i + 1)}</div>
                <div className="mt-1 text-4xl font-extrabold tabular-nums">{counts[i]}</div>
                <div className={`text-sm tabular-nums ${fresh[i] ? 'font-bold text-emerald-700' : 'text-stone-500'}`}>{t.aff.newWeek(fresh[i])}</div>
                <div className="mt-2 text-xs text-stone-600">{t.aff.tierDesc[i]}</div>
                <div className="mt-1 text-xs font-bold text-[#4a3af0]">{t.aff.shareOf(TIER_RATES[i])}</div>
              </div>
            ))}
          </div>

          <div className={`${card} space-y-2`}>
            <h3 className="font-bold">{t.aff.growth}</h3>
            <TierGrowthChart weeks={data.weeks || []} />
          </div>

          <div className={`${card} space-y-3`}>
            <h3 className="font-bold">{t.aff.firstTier}</h3>
            {(data.first_tier || []).length === 0
              ? <p className="text-stone-600">{t.aff.noneYet}</p>
              : (
                <ul className="space-y-2">
                  {data.first_tier.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <Avatar url={p.avatar_url} name={p.display_name} />
                      <div className="min-w-0">
                        <div className="truncate font-bold">{p.display_name}</div>
                        <div className="text-xs text-stone-500">{t.aff.joined(p.joined)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            <div className="flex flex-wrap items-center gap-3">
              <button className={primary} onClick={() => shareInviteLink(me, lang, t, () => { setNote(t.linkCopied); setTimeout(() => setNote(''), 2500) })}>{t.inviteBtn}</button>
              {note && <span className="text-sm font-semibold text-emerald-700">{note}</span>}
            </div>
          </div>
        </>
      )}

      <ProviderBankSection me={me} refreshKey={refreshKey} isAdmin={isAdmin} onTeam={onTeam} />

      <div className="rounded-3xl border-2 border-[#f6d155] bg-[#fff8dc] px-4 py-3 text-sm">
        <p className="font-bold">{t.aff.earningsTitle}</p>
        <p className="text-stone-700">{t.aff.earningsText}</p>
      </div>
    </div>
  )
}

// ---------- Wepawao Face Challenge ----------
// Opens only while direct advertisers are waiting for a sponsor. As many winners as advertisers.
function useContest(refreshKey) {
  const [data, setData] = useState(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((n) => n + 1), [])
  useEffect(() => {
    let live = true
    supabase.rpc('contest_current').then(({ data, error }) => { if (live && !error) setData(data) })
    return () => { live = false }
  }, [refreshKey, tick])
  return [data, reload]
}

function ContestPage({ me, refreshKey, onBack, onSignIn }) {
  const { t, lang } = useLang()
  const [c, reload] = useContest(refreshKey)
  const [mine, setMine] = useState([])
  const [pick, setPick] = useState(null)
  const [agree, setAgree] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!me || !c?.open || !c.can_enter) { setMine([]); return }
    supabase.from('posts').select('id,body,image_path,image_paths,created_at')
      .eq('user_id', me).eq('status', 'active').eq('visibility', 'public').is('public_block_reason', null)
      .gte('created_at', c.opened_at).order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => setMine((data || []).filter((p) => postImages(p).length > 0)))
  }, [me, c?.open, c?.can_enter, c?.opened_at])

  async function enter() {
    if (!pick) return
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('contest_enter', { p_post: pick, p_agree: agree })
    setBusy(false)
    if (!error && data === 'ok') { setMsg(t.contest.entered); setPick(null); reload(); return }
    setMsg(t.contest.errors[data] || t.contest.errors.other)
  }
  async function vote(e) {
    if (!me) { onSignIn(); return }
    const { data, error } = await supabase.rpc('contest_vote', { p_entry: e.id, p_on: !e.my_vote })
    if (!error && data === 'ok') { reload(); return }
    setMsg(t.contest.errors[data] || t.contest.errors.other)
  }

  if (!c) return <div className={`${card} text-stone-600`}>{t.aff.loading}</div>
  const endDate = c.ends_at && new Date(c.ends_at).toLocaleString(loc(lang), { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-3xl bg-[#14123a] p-5 text-white">
        <button className="text-sm font-bold text-[#f6d155]" onClick={onBack}>{t.aff.back}</button>
        <h2 className="text-3xl font-extrabold">{t.contest.title}</h2>
        {c.open ? (
          <>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="rounded-full bg-[#f6d155] px-3 py-1 text-[#14123a]">{t.contest.prizes(c.prizes)}</span>
              <span className="rounded-full bg-white/15 px-3 py-1">{t.contest.winners(c.prizes)}</span>
              <span className="rounded-full bg-white/15 px-3 py-1">{t.contest.endsIn(new Date(c.ends_at) - Date.now())} · {endDate}</span>
            </div>
            <p className="text-white/85">{t.contest.intro}</p>
          </>
        ) : (
          <>
            <p className="font-bold">{t.contest.closedTitle}</p>
            <p className="text-white/85">{t.contest.closedText}</p>
          </>
        )}
        {c.last_winners?.length > 0 && <p className="text-sm text-[#f6d155]">{t.contest.lastWinners(c.last_winners.join(', '))}</p>}
      </div>

      {c.open && (
        <>
          <div className={`${card} space-y-2`}>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
              {t.contest.rules.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>

          {msg && <p className="rounded-3xl border-2 border-[#f6d155] bg-[#fff8dc] px-4 py-3 text-sm font-semibold">{msg}</p>}

          {!me && (
            <div className={`${card} space-y-2`}>
              <p className="text-stone-600">{t.contest.signIn}</p>
              <button className={primary} onClick={onSignIn}>{t.signIn}</button>
            </div>
          )}
          {me && c.can_enter && (
            <div className={`${card} space-y-3`}>
              <h3 className="text-xl font-bold">{t.contest.enterTitle}</h3>
              <p className="text-stone-600">{t.contest.enterHow}</p>
              {mine.length === 0
                ? <p className="text-sm text-stone-500">{t.contest.noneEligible}</p>
                : (
                  <>
                    <p className="text-sm font-bold">{t.contest.pick}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {mine.map((p) => (
                        <button key={p.id} onClick={() => setPick(p.id)}
                          className={`overflow-hidden rounded-2xl border-4 ${pick === p.id ? 'border-[#4a3af0]' : 'border-transparent'}`}>
                          <img src={photoUrl(postImages(p)[0])} alt="" className="aspect-square w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                      <span>{t.contest.agree}</span>
                    </label>
                    <button className={primary} disabled={!pick || !agree || busy} onClick={enter}>{t.contest.enter}</button>
                  </>
                )}
            </div>
          )}
          {me && !c.can_enter && !c.entries.some((e) => e.mine) && (
            <p className="px-2 text-sm text-stone-500">{t.contest.notActive}</p>
          )}
          {me && !c.can_vote && <p className="px-2 text-sm text-stone-500">{t.contest.tooNew}</p>}

          {c.entries.length === 0
            ? <div className={`${card} text-stone-600`}>{t.contest.noEntries}</div>
            : (
              <div className="grid gap-3 sm:grid-cols-2">
                {c.entries.map((e, i) => (
                  <div key={e.id} className={`${card} !p-0 overflow-hidden ${i < c.prizes ? 'ring-4 ring-[#f6d155]' : ''}`}>
                    {e.image_paths?.[0] && <img src={photoUrl(e.image_paths[0])} alt="" className="aspect-square w-full object-cover" />}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#14123a] text-xs font-extrabold text-white">{i + 1}</span>
                        <Avatar url={e.avatar_url} name={e.name} />
                        <span className="min-w-0 flex-1 truncate font-bold">{e.name}</span>
                      </div>
                      {e.body && <p className="line-clamp-2 text-sm text-stone-600">{e.body}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg font-extrabold tabular-nums">{t.contest.votes(e.votes)}</span>
                        {e.mine
                          ? <span className={chip}>{t.contest.yours}</span>
                          : (
                            <button onClick={() => vote(e)} disabled={me && !c.can_vote}
                              className={e.my_vote ? 'rounded-full bg-[#4a3af0] px-5 py-2 font-bold text-white' : ghost}>
                              {e.my_vote ? `✓ ${t.contest.voted}` : t.contest.vote}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      )}
    </div>
  )
}

// ---------- Provider bank ----------
// Advertiser link: ?advertise=1&pref=<affiliate id>. The affiliate who brings in an advertiser sponsors it for 12 months.
// An affiliate's own business is a common provider: he can bring it in with his own link.
function advertiserLink(me, lang) {
  return `${window.location.origin}/?advertise=1&pref=${me}&lang=${lang}`
}
const dollars = (c) => `$${((c || 0) / 100).toFixed(2)}`

function ProviderBankSection({ me, refreshKey, isAdmin, onTeam }) {
  const { t, lang } = useLang()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState('')
  useEffect(() => {
    supabase.rpc('my_provider_bank').then(({ data, error }) => { setFailed(!!error); setData(error ? null : data) })
  }, [me, refreshKey])
  async function share() {
    const url = advertiserLink(me, lang)
    if (navigator.share) {
      try { await navigator.share({ title: 'Wepawao', text: t.prov.linkShareText, url }); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(url); setNote(t.linkCopied); setTimeout(() => setNote(''), 2500) } catch { window.prompt('', url) }
  }
  const c = data?.commission_cents || { t1: 0, t2: 0, t3: 0 }
  return (
    <div className={`${card} space-y-3`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold">{t.prov.bankTitle}</h3>
        {data && <span className="text-sm font-bold text-[#4a3af0]">{t.prov.bankSize(data.bank_size)}</span>}
      </div>
      <p className="text-stone-600">{t.prov.bankIntro}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className={primary} onClick={share}>{t.prov.linkBtn}</button>
        {note && <span className="text-sm font-semibold text-emerald-700">{note}</span>}
      </div>
      <p className="rounded-2xl bg-[#eef0fc] px-3 py-2 text-sm text-stone-600">{t.prov.contestNote}</p>

      {failed && <p className="text-sm text-stone-500">{t.prov.unavailable}</p>}
      {data && (
        <>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="font-bold">{t.prov.mine}</h4>
              {data.contests_won > 0 && <span className="text-xs font-bold text-emerald-700">{t.prov.contestsWon(data.contests_won)}</span>}
            </div>
            {data.providers.length === 0
              ? <p className="mt-1 text-sm text-stone-500">{t.prov.noneMine}</p>
              : (
                <ul className="mt-2 space-y-2">
                  {data.providers.map((p) => (
                    <li key={p.id} className="rounded-2xl border-2 border-[#dcdff5] px-3 py-2">
                      <div className="font-bold">{p.business_name}</div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-stone-500">
                        <span>{p.via === 'contest' ? t.prov.viaContest : t.prov.viaReferral}</span>
                        <span>{p.status === 'active' && p.end ? t.prov.until(p.end) : t.prov.pending}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
          <div>
            <h4 className="font-bold">{t.prov.earned}</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[['t1', 0], ['t2', 1], ['t3', 2]].map(([k, i]) => (
                <div key={k} className="rounded-2xl bg-[#eef0fc] px-2 py-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-stone-600"><TierDot i={i} />{t.aff.tier(i + 1)}</div>
                  <div className="font-extrabold tabular-nums">{dollars(c[k])}</div>
                </div>
              ))}
              <div className="rounded-2xl bg-[#14123a] px-2 py-2 text-white">
                <div className="text-xs text-white/70">{t.prov.earnedTotal}</div>
                <div className="font-extrabold tabular-nums text-[#f6d155]">{dollars(c.t1 + c.t2 + c.t3)}</div>
              </div>
            </div>
          </div>
        </>
      )}
      {isAdmin && <button className={ghostSm} onClick={onTeam}>{t.prov.teamBtn}</button>}
    </div>
  )
}

// Public form for advertisers. Works signed in or not.
function AdvertiseForm({ linkFrom, onClose }) {
  const { t, lang } = useLang()
  const [f, setF] = useState({ business: '', contact: '', email: '', phone: '', website: '', offer: '' })
  const [state, setState] = useState('idle')
  const [err, setErr] = useState('')
  const [sponsorName, setSponsorName] = useState(null)
  useEffect(() => {
    if (!linkFrom) return
    supabase.from('profiles').select('display_name').eq('id', linkFrom).maybeSingle()
      .then(({ data }) => setSponsorName(data?.display_name || null))
  }, [linkFrom])
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))
  async function send(e) {
    e.preventDefault()
    setErr(''); setState('sending')
    const { data, error } = await supabase.rpc('submit_provider', {
      p_business: f.business, p_contact: f.contact, p_email: f.email, p_phone: f.phone,
      p_website: f.website, p_offer: f.offer, p_link: linkFrom || null, p_lang: lang,
    })
    if (!error && data === 'ok') { setState('sent'); try { localStorage.removeItem('wao_pref') } catch { /* ignore */ } return }
    setState('idle')
    setErr(t.prov.errors[data] || t.prov.errors.other)
  }
  return (
    <div className={`${card} space-y-3`}>
      <h2 className="text-2xl font-extrabold">{t.prov.formTitle}</h2>
      {sponsorName && <p className="inline-block rounded-full bg-[#14123a] px-3 py-1 text-sm font-bold text-white">{t.prov.referredBy(sponsorName)}</p>}
      {state === 'sent'
        ? <p className="rounded-2xl bg-emerald-50 px-3 py-3 font-semibold text-emerald-800">{t.prov.sent}</p>
        : (
          <form className="space-y-3" onSubmit={send}>
            <p className="text-stone-600">{t.prov.formIntro}</p>
            <input className={field} placeholder={t.prov.fBusiness} value={f.business} onChange={set('business')} maxLength={120} required />
            <input className={field} placeholder={t.prov.fContact} value={f.contact} onChange={set('contact')} maxLength={80} autoComplete="name" />
            <input className={field} type="email" placeholder={t.prov.fEmail} value={f.email} onChange={set('email')} maxLength={200} autoComplete="email" required />
            <input className={field} type="tel" placeholder={t.prov.fPhone} value={f.phone} onChange={set('phone')} maxLength={40} autoComplete="tel" />
            <input className={field} placeholder={t.prov.fWebsite} value={f.website} onChange={set('website')} maxLength={200} />
            <textarea className={field} rows={3} placeholder={t.prov.fOffer} value={f.offer} onChange={set('offer')} maxLength={1000} />
            {err && <p className="text-sm font-semibold text-red-700">{err}</p>}
            <button className={primary} disabled={state === 'sending'}>{state === 'sending' ? t.prov.sending : t.prov.send}</button>
          </form>
        )}
      <button className="text-sm font-bold text-[#4a3af0]" onClick={onClose}>{t.prov.close}</button>
    </div>
  )
}

// Wepawao Team only: approve advertisers, follow the Wepawao Face Challenge, record cleared payments.
function ProviderTeamPanel({ onBack }) {
  const { t, lang } = useLang()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState('new')
  const [msg, setMsg] = useState('')
  const [paying, setPaying] = useState(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    supabase.rpc('admin_provider_bank').then(({ data, error }) => { setFailed(!!error); setData(error ? null : data) })
  }, [])
  useEffect(() => { load() }, [load])

  async function setStatus(p, status) {
    setBusy(true)
    await supabase.rpc('admin_set_provider_status', { p_id: p.id, p_status: status })
    setBusy(false); setMsg(''); load()
  }
  async function endContest() {
    if (!window.confirm(t.prov.confirmEnd)) return
    setBusy(true)
    await supabase.rpc('admin_end_contest')
    setBusy(false); load()
  }
  async function pay(p) {
    const cents = Math.round(parseFloat(String(amount).replace(/[$,\s]/g, '')) * 100)
    if (!(cents > 0)) return
    setBusy(true)
    await supabase.rpc('admin_record_payment', { p_id: p.id, p_amount_cents: cents })
    setBusy(false); setPaying(null); setAmount(''); load()
  }

  const all = data?.providers || []
  const list = all.filter((p) => p.status === filter)
  const count = (k) => all.filter((p) => p.status === k).length
  return (
    <div className="space-y-4">
      <div className={`${card} space-y-2`}>
        <button className="text-sm font-bold text-[#4a3af0]" onClick={onBack}>{t.aff.back}</button>
        <h2 className="text-2xl font-extrabold">{t.prov.teamTitle}</h2>
        {data && (data.contest
          ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#4a3af0]">{t.prov.contestOpen(when(data.contest.ends_at, lang), data.contest.entries)}</span>
              <button className={ghostSm} disabled={busy} onClick={endContest}>{t.prov.endContest}</button>
            </div>
          )
          : <p className="text-sm text-stone-500">{t.prov.contestNone}</p>)}
        {failed && <p className="text-stone-600">{t.prov.unavailable}</p>}
        <div className="flex flex-wrap gap-2">
          {['new', 'active', 'declined'].map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${filter === k ? 'bg-[#4a3af0] text-white' : 'bg-[#eef0fc] text-[#6b6f93]'}`}>
              {t.prov.filters[k]} <span className="tabular-nums opacity-75">{count(k)}</span>
            </button>
          ))}
        </div>
        {msg && <p className="rounded-2xl bg-[#fff8dc] px-3 py-2 text-sm font-semibold">{msg}</p>}
      </div>
      {data && list.length === 0 && <div className={`${card} text-stone-600`}>{t.prov.empty}</div>}
      {list.map((p) => (
        <div key={p.id} className={`${card} space-y-2`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold">{p.business_name}</h3>
            <span className="text-xs text-stone-500">{when(p.created_at, lang)}</span>
          </div>
          <div className="text-sm text-stone-700">
            {[p.contact_name, p.contact_email, p.contact_phone].filter(Boolean).join(' · ')}
            {p.website && <div className="truncate text-[#4a3af0]">{p.website}</div>}
          </div>
          {p.offer && <p className="whitespace-pre-wrap rounded-2xl bg-[#eef0fc] px-3 py-2 text-sm">{p.offer}</p>}
          <div className="flex flex-wrap gap-2">
            <span className={chip}>{p.source === 'referred' ? t.prov.referred(p.link_name || '?') : t.prov.direct}</span>
            {p.sponsor_name
              ? <span className={`${chip} !bg-[#14123a] !text-white`}>{t.prov.sponsor(p.sponsor_name, p.sponsor_via)}</span>
              : p.in_contest && <span className={`${chip} !bg-[#fff8dc]`}>{t.prov.inContest}</span>}
            {p.end && <span className={chip}>{t.prov.until(p.end)}</span>}
            {p.paid_cents > 0 && <span className={chip}>{t.prov.paid(p.paid_cents)}</span>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {p.status !== 'active' && <button className={ghostSm} disabled={busy} onClick={() => setStatus(p, 'active')}>{t.prov.approve}</button>}
            {p.status !== 'declined' && <button className="rounded-full px-4 py-1.5 text-sm font-bold text-stone-500" disabled={busy} onClick={() => setStatus(p, 'declined')}>{t.prov.decline}</button>}
            {p.status === 'active' && paying !== p.id && <button className={ghostSm} disabled={busy} onClick={() => { setPaying(p.id); setAmount('') }}>{t.prov.recordPay}</button>}
          </div>
          {paying === p.id && (
            <div className="space-y-2 rounded-2xl border-2 border-[#dcdff5] p-3">
              <p className="text-xs text-stone-500">{t.prov.payNote}</p>
              <input className={field} inputMode="decimal" placeholder={t.prov.amount} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className="flex gap-2">
                <button className={ghostSm} disabled={busy} onClick={() => pay(p)}>{t.prov.save}</button>
                <button className="text-sm text-stone-500" onClick={() => setPaying(null)}>{t.prov.cancel}</button>
              </div>
            </div>
          )}
        </div>
      ))}
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
      <div className="px-5 pb-4 pt-5">
        <h2 className="text-[clamp(1.5rem,6.4vw,2.25rem)] font-black leading-tight tracking-tight">
          {t.hero.l1}<br /><span className="text-[#f6d155]">{t.hero.l2}</span>
        </h2>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#14123a] to-transparent" />
        <img src={heroImg} alt="" className="block w-full" />
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

// ---------- Watching your network grow ----------
// "Your network starts now": shown once per member, right after joining (after the welcome message).
// The watcher checks the member's network every 30 seconds while Wepawao is on screen and again
// whenever it comes back to the screen. When it grew, a celebration appears right away.
const NET_MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
const netKey = (me) => `wepawao_net_${me}`
const startKey = (me) => `wepawao_netstart_${me}`

function Confetti() {
  if (reducedMotion()) return null
  const colors = ['#f6d155', '#4a3af0', '#9a8ff7', '#ffffff', '#e0a800']
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`@keyframes wepawao-confetti{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}`}</style>
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} style={{
          position: 'absolute', top: 0, left: `${(i * 37) % 100}%`, width: 8 + (i % 3) * 3, height: 12 + (i % 4) * 2,
          background: colors[i % colors.length], borderRadius: i % 2 ? 9999 : 2, opacity: 0.9,
          animation: `wepawao-confetti ${2.6 + (i % 5) * 0.45}s linear ${(i % 9) * 0.18}s 2 both`,
        }} />
      ))}
    </div>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14123a]/70 px-4"
      style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl px-5 pb-5 pt-6 text-white shadow-2xl"
        style={{ background: 'linear-gradient(160deg,#14123a 0%,#2a1fa8 60%,#4a3af0 100%)' }}>
        {children}
      </div>
    </div>
  )
}

function NetworkStart({ me, onClose }) {
  const { t, lang } = useLang()
  const g = t.grow
  const [note, setNote] = useState('')
  const dot = ['#f6d155', ...TIER_COLORS]
  return (
    <Overlay onClose={onClose}>
      <h2 className="text-center text-2xl font-extrabold leading-tight">{g.startTitle}</h2>
      <div className="mt-5 flex items-center justify-between">
        {g.startSteps.map((label, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="mb-5 h-0.5 flex-1 bg-white/25" />}
            <div className="flex flex-col items-center gap-1.5">
              <span className="grid h-11 place-items-center">
                <span className="grid place-items-center rounded-full font-extrabold text-[#14123a]"
                  style={{ background: dot[i], width: 44 - i * 6, height: 44 - i * 6, fontSize: 18 }}>
                  {i === 0 ? '!' : ''}
                </span>
              </span>
              <span className="text-[11px] text-white/80">{label}</span>
            </div>
          </Fragment>
        ))}
      </div>
      <p className="mt-5 text-center text-[15px] leading-snug text-white/90">{g.startText}</p>
      <p className="mt-2 text-center text-xs leading-snug text-white/65">{g.startNote}</p>
      <button className="mt-5 w-full rounded-full bg-[#f6d155] px-4 py-3 text-base font-extrabold text-[#14123a]"
        onClick={async () => { await shareInviteLink(me, lang, t, () => setNote(t.linkCopied)); onClose() }}>{g.shareBtn}</button>
      {note && <p className="mt-2 text-center text-sm font-bold text-[#f6d155]">{note}</p>}
      <button className="mt-2 w-full py-2 text-sm font-bold text-white/70" onClick={onClose}>{g.later}</button>
    </Overlay>
  )
}

function NetworkCelebration({ me, event, onClose, onOpen }) {
  const { t, lang } = useLang()
  const g = t.grow
  const [note, setNote] = useState('')
  const names = event.names
  const title = names.length === 1 && event.added === 1 ? g.joinedOne(names[0])
    : event.deltas[0] > 1 ? g.joinedMany(event.deltas[0]) : g.grew
  return (
    <Overlay onClose={onClose}>
      <Confetti />
      <div className="relative text-center">
        <div className="text-6xl font-extrabold leading-none text-[#f6d155]">+{event.added}</div>
        <h2 className="mt-3 text-xl font-extrabold leading-tight">{title}</h2>
        {event.milestone && (
          <p className="mx-auto mt-3 inline-block rounded-full bg-[#f6d155] px-3 py-1 text-sm font-extrabold text-[#14123a]">{g.milestone(event.milestone)}</p>
        )}
        <ul className="mt-4 space-y-1.5 text-sm">
          {event.deltas.map((d, i) => d > 0 && (
            <li key={i} className="flex items-center justify-center gap-2"><TierDot i={i} />{g.tierLine(d, i + 1)}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-white/75">{g.totalNow(event.total)}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="rounded-full border-2 border-white/40 px-3 py-2.5 text-sm font-bold" onClick={onOpen}>{g.seeNetwork}</button>
          <button className="rounded-full bg-[#f6d155] px-3 py-2.5 text-sm font-extrabold text-[#14123a]"
            onClick={() => shareInviteLink(me, lang, t, () => setNote(t.linkCopied))}>{g.shareAgain}</button>
        </div>
        {note && <p className="mt-2 text-sm font-bold text-[#f6d155]">{note}</p>}
        <button className="mt-2 w-full py-2 text-sm font-bold text-white/70" onClick={onClose}>{g.keepGoing}</button>
      </div>
    </Overlay>
  )
}

// Checks the member's network and reports growth since the last time this device looked.
function useNetworkWatcher(me, onGrow) {
  const cb = useRef(onGrow)
  cb.current = onGrow
  useEffect(() => {
    if (!me) return
    let live = true, busy = false
    async function check() {
      if (busy || document.visibilityState !== 'visible') return
      busy = true
      const { data, error } = await supabase.rpc('my_affiliate_tiers', { p_weeks: 1 })
      busy = false
      if (!live || error || !data) return
      const now = { t: [data.tier1 || 0, data.tier2 || 0, data.tier3 || 0], ids: (data.first_tier || []).map((p) => p.id) }
      let before = null
      try { before = JSON.parse(localStorage.getItem(netKey(me)) || 'null') } catch { /* ignore */ }
      try { localStorage.setItem(netKey(me), JSON.stringify(now)) } catch { /* ignore */ }
      if (!before || !Array.isArray(before.t)) return // first look on this device: just remember
      const deltas = now.t.map((v, i) => Math.max(0, v - (before.t[i] || 0)))
      const added = deltas[0] + deltas[1] + deltas[2]
      if (!added) return
      const total = now.t[0] + now.t[1] + now.t[2]
      const prevTotal = before.t.reduce((a, b) => a + (b || 0), 0)
      const milestone = [...NET_MILESTONES].reverse().find((m) => prevTotal < m && total >= m) || null
      const seen = new Set(before.ids || [])
      const names = (data.first_tier || []).filter((p) => !seen.has(p.id)).map((p) => p.display_name || '').filter(Boolean)
      try { navigator.vibrate?.([60, 40, 60]) } catch { /* ignore */ }
      cb.current({ deltas, added, total, milestone, names })
    }
    check()
    const id = setInterval(check, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { live = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [me])
}

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
  useEffect(() => { if (last) { try { navigator.vibrate?.([60, 40, 60]) } catch { /* ignore */ } } }, [last])
  const rise = (delay) => (reduce ? {} : { animation: `wepawao-rise .8s cubic-bezier(.2,.7,.2,1) ${delay}s both` })
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
      <style>{`@keyframes wepawao-rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}@keyframes wepawao-fill{from{width:0}to{width:100%}}@keyframes wepawao-pop{0%{opacity:0;transform:scale(.3) rotate(-12deg)}60%{opacity:1;transform:scale(1.18) rotate(4deg)}100%{transform:scale(1) rotate(-3deg)}}`}</style>

      <div aria-hidden="true" style={{ ...orb, width: '70vmin', height: '70vmin', background: '#4a3af0', left: '-20vmin', top: '10%', opacity: 0.55, transform: ORB_POS[i][0] }} />
      <div aria-hidden="true" style={{ ...orb, width: '55vmin', height: '55vmin', background: '#f6d155', right: '-25vmin', bottom: '8%', opacity: 0.28, transform: ORB_POS[i][1] }} />

      {last && <div className="pointer-events-none absolute inset-0 z-0"><Confetti /></div>}

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {w.scenes.map((_, k) => (
            <span key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#eef0fc]/25">
              <span className="block h-full bg-[#eef0fc]"
                style={{ width: k < i || last || reduce ? '100%' : k === i ? undefined : '0%', animation: k === i && !last && !reduce ? `wepawao-fill ${WELCOME_MS}ms linear forwards` : undefined }} />
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
        {last && (
          <span className="self-start rounded-full bg-[#f6d155] px-5 py-1.5 text-[clamp(1.5rem,7vw,2.25rem)] font-black text-[#14123a] shadow-lg"
            style={reduce ? { transform: 'rotate(-3deg)' } : { animation: 'wepawao-pop .7s cubic-bezier(.2,.8,.2,1.2) .15s both' }}>{w.wepa}</span>
        )}
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
      <div className={`${card} !bg-[#14123a] text-white`}>
        <h2 className="mb-2 text-xl font-bold text-[#f6d155]">{t.differentTitle}</h2>
        <p>{t.differentText}</p>
      </div>
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
      <div className={card}>
        <h2 className="mb-1 text-xl font-bold">{t.policiesTitle}</h2>
        <p className="mb-3 text-sm text-stone-500">{t.policiesNote}</p>
        {t.policies.map(([title, lines]) => (
          <details key={title} className="border-t-2 border-[#eef0fc] py-3">
            <summary className="cursor-pointer font-bold text-[#4a3af0]">{title}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-700">
              {lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </details>
        ))}
      </div>
      {onReplay && <button className={ghost} onClick={onReplay}>{t.welcome.replay}</button>}
    </>
  )
}

// ---------- App ----------
export default function App() {
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [tab, setTab] = useState('everyone')
  const [showSignIn, setShowSignIn] = useState(false)
  const [pwFirst, setPwFirst] = useState(false)
  // A returning member on a screen with no sign-in yet: the home-screen app, or a browser used before.
  const [returning] = useState(() => {
    let used = false
    try { used = !!localStorage.getItem('wao_signin_email') } catch { /* ignore */ }
    const standalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
    return used || standalone
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [welcome, setWelcome] = useState(null)
  const [netStart, setNetStart] = useState(false)
  const [netEvent, setNetEvent] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [sharedId, setSharedId] = useState(() => new URLSearchParams(window.location.search).get('post'))
  const [flash, setFlash] = useState('')
  // Advertiser link (?advertise=1&pref=<affiliate id>): show the advertiser form and remember who sent it.
  const [advertise, setAdvertise] = useState(() => new URLSearchParams(window.location.search).has('advertise'))
  const [advLink] = useState(() => {
    let id = new URLSearchParams(window.location.search).get('pref')
    if (id && UUID_RE.test(id)) { try { localStorage.setItem('wao_pref', id) } catch { /* ignore */ } return id }
    try { id = localStorage.getItem('wao_pref') } catch { id = null }
    return id && UUID_RE.test(id) ? id : null
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [inviter, setInviter] = useState(null)
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
  const ready = useSchemaReady()
  const { map: conn, reload: reloadConn } = useConnections(me, ready, refreshKey)

  const setLang = (l) => {
    setLangState(l)
    try { localStorage.setItem('wao_lang', l) } catch { /* ignore */ }
  }
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => {
    if (!me) { setIsAdmin(false); return }
    supabase.rpc('is_admin').then(({ data, error }) => setIsAdmin(!error && data === true))
  }, [me])
  function closeAdvertise() {
    setAdvertise(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('advertise'); url.searchParams.delete('pref')
    window.history.replaceState(null, '', url.pathname + url.search)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Loads the member's name and number, then opens the welcome. Automatic only the first time.
  async function openWelcome(force) {
    let seen = false
    try { seen = localStorage.getItem('wao_welcome_seen') === '1' } catch { /* ignore */ }
    if (seen && !force) { maybeNetStart(); return }
    const { data } = await supabase.from('profiles').select('display_name,created_at').eq('id', me).single()
    if (!data) return
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).lte('created_at', data.created_at)
    setWelcome({ name: data.display_name || '', number: count || 1 })
  }
  function closeWelcome() {
    try { localStorage.setItem('wao_welcome_seen', '1') } catch { /* ignore */ }
    setWelcome(null)
    setTab('everyone')
    window.scrollTo(0, 0)
    maybeNetStart()
  }
  // "Your network starts now": once per member on this device, only while their network is still empty.
  async function maybeNetStart() {
    if (!me) return
    try { if (localStorage.getItem(startKey(me)) === '1') return } catch { return }
    const { data } = await supabase.rpc('my_affiliate_tiers', { p_weeks: 1 })
    if (data && (data.tier1 || 0) > 0) { try { localStorage.setItem(startKey(me), '1') } catch { /* ignore */ } return }
    setNetStart(true)
  }
  function closeNetStart() {
    try { localStorage.setItem(startKey(me), '1') } catch { /* ignore */ }
    setNetStart(false)
  }

  // After sign-in, go straight to the home screen and load the member's profile photo.
  useEffect(() => {
    if (!me) { setShowProfile(false); setAvatarUrl(null); setWelcome(null); setComposerOpen(false); setNetStart(false); setNetEvent(null); return }
    setShowSignIn(false)
    setTab('everyone')
    supabase.from('profiles').select('avatar_url').eq('id', me).single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || null))
    openWelcome(false)
  }, [me])

  const posted = () => setRefreshKey((k) => k + 1)
  useNetworkWatcher(me, (ev) => { setNetEvent(ev); posted() })

  // Invite links (?invite=<member id>): remember the inviter, show who invited you,
  // and connect the two of you as soon as you are signed in.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('invite')
    if (fromLink && UUID_RE.test(fromLink)) {
      try { localStorage.setItem('wao_invite', fromLink) } catch { /* ignore */ }
    }
    let id = fromLink
    try { id = id || localStorage.getItem('wao_invite') } catch { /* ignore */ }
    if (!id || !UUID_RE.test(id)) return
    supabase.from('profiles').select('id,display_name').eq('id', id).maybeSingle()
      .then(({ data }) => { if (data) setInviter(data) })
  }, [])
  useEffect(() => {
    if (!inviter || me) return
    setShowSignIn(true)
  }, [inviter, me])
  useEffect(() => {
    if (!me || !ready || !inviter) return
    supabase.rpc('connect_by_invite', { p_inviter: inviter.id }).then(({ data, error }) => {
      try { localStorage.removeItem('wao_invite') } catch { /* ignore */ }
      const url = new URL(window.location.href)
      url.searchParams.delete('invite')
      url.searchParams.delete('ref')
      window.history.replaceState(null, '', url.pathname + url.search)
      if (!error && data === 'connected') { setFlash(t.nowContacts(inviter.display_name)); posted() }
      setInviter(null)
    })
  }, [me, ready, inviter])
  function closeShared() {
    setSharedId(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('post')
    window.history.replaceState(null, '', url.pathname + url.search)
  }
  const feedProps = { session, refreshKey, onChanged: posted }

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <div className="min-h-screen bg-[#eef0fc] text-[#14123a]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#dcdff5] bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#4a3af0] sm:gap-2 sm:text-3xl">
            Wepawao<span className="grid h-7 w-7 place-items-center rounded-full bg-[#f6d155] text-lg text-[#14123a] sm:h-8 sm:w-8 sm:text-xl">!</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            {me
              ? <button className={ghostSm} onClick={() => setShowProfile((v) => !v)}>{t.profile}</button>
              : <button className={ghostSm} onClick={() => setShowSignIn((v) => !v)}>{t.signIn}</button>}
          </div>
        </header>
        <ShareCallout me={me} onJoin={() => { setPwFirst(returning); setShowSignIn(true); window.scrollTo(0, 0) }} />

        <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-20">
          {showSignIn && !me && inviter && (
            <p className="rounded-3xl bg-[#14123a] px-4 py-3 font-bold text-white">{t.invitedBy(inviter.display_name)}</p>
          )}
          {!me && !showSignIn && !inviter && returning && authChecked && (
            <div className="space-y-2 rounded-3xl border-2 border-[#f6d155] bg-[#fff8dc] px-4 py-3">
              <p className="font-bold">{t.outTitle}</p>
              <p className="text-sm text-stone-700">{t.outText}</p>
              <button className={primary} onClick={() => { setPwFirst(true); setShowSignIn(true) }}>{t.outBtn}</button>
            </div>
          )}
          {showSignIn && !me && <SignIn startWithPassword={pwFirst} />}
          {showProfile && me && (
            <ProfileEditor me={me} avatarUrl={avatarUrl} onAvatar={(u) => { setAvatarUrl(u); posted() }}
              onSaved={posted} onClose={() => setShowProfile(false)} onSignOut={() => supabase.auth.signOut()} />
          )}

          {advertise && <AdvertiseForm linkFrom={advLink} onClose={closeAdvertise} />}
          {sharedId && tab === 'everyone' && (
            <SharedPost key={`${sharedId}-${refreshKey}`} id={sharedId} me={me} onClose={closeShared} onChanged={posted} />
          )}
          {tab === 'everyone' && (
            <>
              <AffiliateBanner me={me} refreshKey={refreshKey} onOpen={() => { setTab('affiliate'); window.scrollTo(0, 0) }}
                onSignIn={() => setShowSignIn(true)} onContest={() => { setTab('contest'); window.scrollTo(0, 0) }} />
              <Hero signedIn={!!me} open={composerOpen} onShare={() => setComposerOpen((v) => !v)} onSignIn={() => setShowSignIn(true)} />
              <TeaserCard refreshKey={refreshKey} onJoin={me ? null : () => setShowSignIn(true)}
                onContest={() => { setTab('contest'); window.scrollTo(0, 0) }} />
              <HomeScreenTip />
            </>
          )}
          {flash && (
            <div className="flex items-start gap-3 rounded-3xl border-2 border-[#f6d155] bg-[#fff8dc] px-4 py-3 text-sm">
              <p className="flex-1 font-semibold">{flash}</p>
              <button className="text-xs text-stone-500 underline" onClick={() => setFlash('')}>{t.gotIt}</button>
            </div>
          )}
          {me && ((tab === 'everyone' && composerOpen) || tab === 'mine') && (
            <MomentComposer userId={me}
              onPosted={(notice) => { setComposerOpen(false); setFlash(notice || ''); posted() }} />
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
            </>
          )}
          {tab === 'mine' && <Feed mode="mine" {...feedProps} />}
          {tab === 'contacts' && <Contacts me={me} conn={conn} onChanged={() => { reloadConn(); posted() }} ready={ready} />}
          {tab === 'discover' && <Feed mode="discover" {...feedProps} />}
          {tab === 'offer' && (
            <>
              {me && <Composer userId={me} mode="offer" onPosted={posted} />}
              <Feed mode="offer" {...feedProps} />
            </>
          )}
          {tab === 'affiliate' && (
            <AffiliateDashboard me={me} refreshKey={refreshKey} onBack={() => setTab('everyone')}
              isAdmin={isAdmin} onTeam={() => { setTab('team'); window.scrollTo(0, 0) }} />
          )}
          {tab === 'team' && isAdmin && <ProviderTeamPanel onBack={() => setTab('affiliate')} />}
          {tab === 'contest' && (
            <ContestPage me={me} refreshKey={refreshKey} onBack={() => setTab('everyone')}
              onSignIn={() => { setShowSignIn(true); window.scrollTo(0, 0) }} />
          )}
          {tab === 'promise' && <OurPromise onReplay={me ? () => openWelcome(true) : null} />}
        </main>
        {welcome && <Welcome name={welcome.name} number={welcome.number} onDone={closeWelcome} />}
        {!welcome && netStart && me && <NetworkStart me={me} onClose={closeNetStart} />}
        {!welcome && !netStart && netEvent && me && (
          <NetworkCelebration me={me} event={netEvent} onClose={() => setNetEvent(null)}
            onOpen={() => { setNetEvent(null); setTab('affiliate'); window.scrollTo(0, 0) }} />
        )}
      </div>
    </LangCtx.Provider>
  )
}
