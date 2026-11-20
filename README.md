# The Workout Gym, Hisar — website

A premium, static, multi-page website for **The Workout Gym**, Kaimri–Mangali Road,
Sector 15, Hisar, Haryana 125001. Built as plain HTML/CSS/JavaScript: no build step, no
framework, no runtime dependencies. Drop the folder on any host and it works.

```
Life-Fitness-Gym-Hisar-v4/
├── index.html            Home — hero, programmes, membership, coaching, floor, reviews, booking
├── programmes.html       The five programmes in detail + training FAQ
├── membership.html       Four plans, what every plan includes, joining steps, membership FAQ
├── coaching.html         Coaching, how it works, coach profiles (honest empty state), reviews
├── contact.html          Address, hours, directions, booking form, question form, BMI calculator, FAQ
├── 404.html              Not-found page
├── favicon.svg           Dumbbell monogram (also favicon-32.png, apple-touch-icon.png, icon-192/512)
├── og-image.jpg          Social share card (1200 × 630)
├── site.webmanifest      Installable web-app metadata
├── robots.txt            Crawler rules (sitemap line is enabled by tools/set-domain.mjs)
├── assets/
│   ├── css/main.css      Design system + every component (single stylesheet, ~52 KB)
│   ├── js/business.js    ◀ EDIT HERE: phone, WhatsApp, hours, links, trainers
│   ├── js/site.js        All behaviour (nav, reveal, slider, lightbox, BMI, forms)
│   ├── fonts/            Self-hosted Archivo + Instrument Serif italics (woff2, ~90 KB total)
│   └── img/              Optimised WebP + JPEG at 800/1300/1800 px
│       └── original/     Untouched source photographs (never loaded by the site)
└── tools/
    ├── check-pages.mjs   Static QA: links, anchors, images, meta, JSON-LD, tag balance, shell parity
    ├── check-runtime.cjs Runtime QA in a simulated DOM (needs `npm i jsdom`)
    ├── check-a11y.mjs    Accessibility: headings, ids, alt text, labels, ARIA references, tap targets
    ├── check-contrast.mjs WCAG contrast for every documented colour pairing
    └── set-domain.mjs    Adds canonical tags, absolute og:image, sitemap.xml
```

---

## 1. Preview it

Any static server works:

```bash
cd Life-Fitness-Gym-Hisar-v4
python3 -m http.server 8080      # or: npx serve .
```

Then open `http://localhost:8080/`. Opening `index.html` directly from the file system also
works, but a server is closer to production (query-string deep links, cache headers).

---

## 2. What the owner must fill in

Nothing on this site is invented. Two things are deliberately blank until the gym confirms
them (fees, coach profiles). The phone number is filled in from the gym's live Google Maps
listing (verified 20 Nov 2026), so the Call/WhatsApp buttons already work.

### a. Phone number and WhatsApp — `assets/js/business.js`

```js
phone:      "+919053139388",   // with country code, no spaces
phoneDisplay: "+91 90531 39388",
whatsapp:   "919053139388",    // digits only, country code first
```

Filled from the gym's live Google Maps listing (verified 20 Nov 2026), so the Call and
WhatsApp buttons already show across the header, drawer, contact page, footer and mobile
action bar, and the booking form opens WhatsApp with the request pre-written. (An older
number, +91 82954 54763, appears on some directories; Maps + Places agree on the number
above, so that one is used.)

### b. Membership fees — `membership.html` and `index.html`

Search for `Fees on request` (8 places, each marked with an `<!-- EDIT … -->` comment) and
replace with the confirmed figure, for example:

```html
<b>₹1,200 <span class="u">/ month</span></b>
<span>Payable at the gym. Current as of <time>Nov 2026</time>.</span>
```

Also update the two “Every plan includes / Booked separately” panels further down the
membership page if a fee change also changes what is included. Until then the site shows
“Fees on request” and the FAQ explains that the gym confirms today's rates.

### c. Coach profiles — `assets/js/business.js`

`coaching.html` ships with a single honest empty-state panel (“profiles are published with
the coach's approval”) and the profile grid stays hidden while the list is empty. Add real
coaches and the grid appears with their cards, and the empty-state panel hides automatically:

```js
trainers: [
  {
    initials: "RS",
    name: "Coach name",
    photo: "assets/img/coach-rs.jpg",     // optional, drop the photo in assets/img/
    role: "Strength & conditioning",
    experience: "6 years",
    qualifications: "Certified personal trainer",
    bio: "One or two sentences the coach is happy to stand behind."
  }
]
```

Never publish experience or qualifications that the gym cannot support — that is the whole
point of the placeholder design.

### d. Optional extras

| What | Where | Why |
| --- | --- | --- |
| Form endpoint | `form.endpoint` in `business.js` | POSTs the request to Formspree / a Google Apps Script instead of the copy-WhatsApp handoff |
| Live domain | `node tools/set-domain.mjs https://yourdomain.com` | Adds canonical tags, absolute og:image, `sitemap.xml`, robots sitemap line |
| Reviews | quote text in `index.html` (slider) and `coaching.html` | Swap excerpts for newer ones; they are attributed to Google, never invented |
| Google rating | `rating` in `business.js` + the “299 reviews” text | Update the number shown when Google changes |

---

## 3. Honesty rules the build follows

1. **No invented business facts.** Address, timings, rating, review count and services come
   from the gym's own Google listing or its previous site. Anything unverified is either
   omitted or shown as an explicit placeholder.
2. **No placeholder phone number.** An empty config value hides the buttons instead of
   shipping `+91XXXXXXXXXX`.
3. **No fake booking confirmations.** The form says “Request ready”, never “Booked”. It
   always states that the gym confirms the slot, and that nothing was sent while no server is
   connected.
4. **No fabricated testimonials, statistics or before/after photos.** Reviews are excerpts of
   public Google reviews, labelled as such, with a link to read them at the source.
5. **No decorative buttons.** Every button, link and card goes somewhere real; contact actions
   that need the phone number stay hidden until it exists.

---

## 4. What is on the site

**Pages** — Home, Programmes, Membership, Coaching, Visit & book, 404.

**Home** — cinematic hero with parallax and a live “Open now / Closed” status, discipline
ticker, scroll-lit brand statement, four verified stats, interactive five-programme list with
photo preview, membership plan cards, coaching feature, six-photo facility grid with a photo
viewer, member reviews carousel, trial booking form + hours + map, closing CTA.

**Interactive** — free-trial booking with full validation (name, Indian mobile number, goal,
date within 45 days, Sunday closure), WhatsApp lead handoff, click-to-call, Google Maps
directions, deep links (`?plan=quarterly`, `?programme=strength`, `?goal=…`), membership
comparison table, programme navigation, BMI calculator with metric/imperial units and explicit
limitations, photo lightbox, mobile navigation drawer with focus trapping.

**Accessibility** — semantic landmarks, one `h1` per page, skip link, visible focus rings,
labelled form fields with `role="alert"` errors, `aria-current` navigation, keyboard support
in the drawer/slider/lightbox, `prefers-reduced-motion` honoured throughout, and content
readable with JavaScript disabled.

**Performance** — no frameworks or blocking third-party scripts, self-hosted subsetted
fonts, WebP with JPEG fallbacks and `srcset`/`sizes`, explicit `width`/`height` on every
image, lazy loading below the fold, `preload` for the hero image and primary font, animations
limited to `transform`/`opacity`.

---

## 5. Quality checks

```bash
node tools/check-pages.mjs      # static: links, anchors, meta, JSON-LD, markup, shell parity
node tools/check-a11y.mjs       # accessibility: headings, ids, alt, labels, ARIA, tap targets
node tools/check-contrast.mjs   # colour contrast for every documented pairing
npm i jsdom && node tools/check-runtime.cjs   # runtime: every interactive feature
```

(On this machine jsdom lives outside the project; run the runtime checker with
`NODE_PATH=/data/data/com.termux/files/usr/tmp/opencode/node_modules node tools/check-runtime.cjs`.)

Current state:

- `check-pages.mjs` — **0 errors, 0 warnings** across 6 pages.
- `check-a11y.mjs` — **0 errors, 0 warnings** across 6 pages.
- `check-contrast.mjs` — **all pairings meet their target** (WCAG AA text, 3:1 UI controls).
- `check-runtime.cjs` — **133 checks passed, 0 failed**.
- `html-validate` (recommended preset) — **0 errors** across all pages.
- Breakpoints reviewed in the CSS at 520, 620, 760, 860, 880, 900, 940, 960, 980 and 1100 px;
  grids are fluid `auto-fit`/`minmax` tracks, so nothing depends on a fixed viewport.

The runtime suite covers the drawer, programme list, testimonial slider (including the
WCAG 2.2.2 pause control), gallery lightbox, BMI calculator (metric and imperial), both
booking paths (no-server and WhatsApp), form validation, the low-commitment question form,
deep-link prefill and the honest coach empty state.

**Before launch:** open the site once in a real browser at phone, tablet and desktop widths.
This build was verified with the two checkers and a code-level review, but the environment it
was produced in had no browser for a rendered pixel pass — the last visual confirmation is
worth five minutes of your time.

---

## 6. Design system

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#07080a` | Page background |
| `--ink-2` | `#0b0c0e` | Alternating sections, footer |
| `--surface` | `#111214` | Cards, panels, table |
| `--text` / `--text-2` / `--text-3` | `#f4f4f2` / `#a7a9ae` / `#71737a` | Body, supporting, faint |
| `--gold` | `#f5c400` | The single brand accent (preserved from the existing identity) |
| `--line` | `rgba(255,255,255,.08)` | Hairlines instead of heavy borders |

Type: **Archivo** variable (400–900) for everything, uppercase display headlines with tight
tracking, and **Instrument Serif italic** as a single editorial accent. Spacing is a fluid
`clamp()` scale, corners stay small (6–14 px) so nothing looks like a generic template card.

---

## 7. Deploying

Upload the folder contents to any static host (Netlify, Cloudflare Pages, GitHub Pages, cPanel).
Before going live:

1. Fill in the phone/WhatsApp number, fees and coach profiles (section 2).
2. Run `node tools/set-domain.mjs https://your-domain` and redeploy (`sitemap.xml` + canonical).
3. Verify the Google Maps links still point at the right pin.
4. Re-run both checkers after any content edit.

---

## 8. Credits and sources

- Photography: supplied with the project (`assets/img/original/`, untouched); optimised copies
  are generated from them.
- Business details, opening hours and the 4.9 / 299 Google review figures: the gym's public
  Google listing, checked November 2026.
- Review excerpts: public Google reviews of The Workout Gym, Hisar.
- Fonts: Archivo and Instrument Serif (SIL Open Font License).
