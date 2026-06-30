# MentesIT / FreeIT — Site Architecture & Structure

> Status: **PROPOSED — awaiting owner approval**  
> Generator: **Hugo Extended** · Languages: **HU (default) + EN** · Hosting: **self-hosted nginx (VPS)**  
> Design direction (selected by a design panel): **stdout — the elegant shell**

---

## 1. Concept in one line

**`stdout — the elegant shell`** — a calm, art-directed IDE as a website: the interface *is* the proof of craft. Custom software is the gravitational center; everything else orbits it.

- **HU tagline:** *MentesIT: mentesítjük az IT-tól — úgy építve, ahogy a szoftvert.*
- **EN tagline:** *FreeIT: we free you from IT — built like the software we build.*

---

## 2. Sitemap & information architecture

```
home ─────────────── /                         /en/
about ────────────── /rolunk/                   /en/about/
contact ──────────── /kapcsolat/                /en/contact/
services (landing) ─ /szolgaltatasok/           /en/services/
  ├─ custom software /szolgaltatasok/egyedi-szoftverfejlesztes/   /en/services/custom-software/
  ├─ websites ─────── /szolgaltatasok/weboldalak/                  /en/services/business-websites/
  ├─ sysadmin/itops ─ /szolgaltatasok/rendszeruzemeltetes/         /en/services/sysadmin-itops/
  └─ hosting ──────── /szolgaltatasok/tarhely/                     /en/services/hosting/
references (grid) ── /referenciak/              /en/references/
  └─ <case study> ── /referenciak/<eset>/        /en/references/<case>/
404 ──────────────── /404.html                  (shared)
sitemap ──────────── /sitemap.xml (multilingual, auto)
```

- **Primary nav** (file-tree + command palette + footer): Home · Szolgáltatások · Referenciák · Rólunk · Kapcsolat.
- **Service order is load-bearing:** custom-software pinned first/largest (`weight: 1`); the other three orbit it with connective hairlines pointing inward (CSS, not SVG physics).

---

## 3. Hugo project structure

```
free-it/
├── config/
│   └── _default/
│       ├── hugo.toml            # baseURL, defaultContentLanguage=hu, defaultContentLanguageInSubdir=false, minify, imaging, outputs (RSS off)
│       ├── languages.toml       # hu (weight 1, default) + en (weight 2)
│       ├── menus.hu.toml        # main + footer (pageRef, identifier, weight)
│       ├── menus.en.toml
│       ├── params.toml          # brand names, contact email/phone, VPS domain, form_endpoint, socials
│       └── markup.toml          # goldmark unsafe=true, TOC tuning, highlight off
├── content/
│   ├── _index.hu.md  _index.en.md                 # home   (tKey: home)
│   ├── about/index.{hu,en}.md  + team.jpg         # (tKey: about)
│   ├── contact/index.{hu,en}.md                   # (tKey: contact)
│   ├── services/
│   │   ├── _index.{hu,en}.md                       # (tKey: services)
│   │   ├── custom-software/index.{hu,en}.md + hero.jpg   # weight 1, tKey: svc-custom-software
│   │   ├── business-websites/index.{hu,en}.md            # weight 2
│   │   ├── sysadmin-itops/index.{hu,en}.md               # weight 3
│   │   └── hosting/index.{hu,en}.md                      # weight 4
│   └── references/
│       ├── _index.{hu,en}.md                       # (tKey: references)
│       └── <case>/index.{hu,en}.md + cover.jpg + screens
├── i18n/ hu.toml  en.toml                          # UI strings
├── data/ tech.toml                                 # stack badges / shared lists
├── assets/
│   ├── scss/  main.scss + _tokens _reset _typography _layout _components _utilities
│   ├── js/    main.js + modules/ palette.js reveal.js nav.js form.js
│   ├── fonts/ *.woff2  (subset latin+latin-ext)
│   └── icons/ *.svg
├── layouts/
│   ├── _default/ baseof.html  home.html  single.html  list.html
│   ├── services/ list.html  single.html
│   ├── references/ list.html  single.html
│   ├── contact/  single.html
│   ├── partials/ (see §7)
│   ├── shortcodes/ cta.html  tech-stack.html  figure-responsive.html  lead.html  diff.html
│   └── 404.html
├── static/ robots.txt  favicon.ico  .well-known/
├── deploy/ deploy.sh  nginx.conf.sample
├── docs/   ARCHITECTURE.md
├── .gitignore  (/public, /resources/_gen, .hugo_build.lock)
└── README.md
```

> Use the **split `config/_default/` directory** (not a single `hugo.toml`) so the solo owner edits menus/languages/params in isolation.

---

## 4. Multilingual strategy

| Aspect | Decision |
|---|---|
| Languages | `hu` = default (`hu-HU`, weight 1) · `en` = secondary (`en`, weight 2) |
| Filenames | `index.hu.md` / `index.en.md`; sections `_index.hu.md` / `_index.en.md` |
| Translation linking | Stable **`translationKey`** in front matter (NOT path matching) → HU/EN may have different localized slugs but stay paired in `.Translations` |
| URL scheme | `defaultContentLanguageInSubdir = false`: HU at root, EN under `/en/`; `slug:` localized per language; `uglyURLs = false` |
| Domain | One vhost: `https://mentes-it.hu/` (HU) + `/en/` (FreeIT). Not a separate domain. |
| Language switcher | `partials/language-switcher.html` ranges `.AllTranslations` → links the **same page** in the other language via `.RelPermalink`; `hreflang`+`lang` attrs, `aria-current`; omits/greys a language with no translation |
| UI strings | `i18n/hu.toml` + `i18n/en.toml`, keyed by stable IDs; `enableMissingTranslationPlaceholders = false` in prod → silent fallback to HU |
| hreflang | Emit `hu`, `en`, and `x-default` (→ HU root) on every translated page |

---

## 5. Content model

| Section | Path | Bundle | Key front matter (incl. SEO + bilingual) |
|---|---|---|---|
| Home | `content/_index.{hu,en}.md` | branch | `title`, `description`, `translationKey: home`, `hero_heading`, `hero_sub`, `hero_cta_label/url`, `featured_services[]` (svc tKeys), `featured_refs[]` (ref tKeys) |
| About | `content/about/index.{hu,en}.md` | leaf | `title`, `description`, `translationKey: about`, `menu: main`, `weight`, `lead`, `image: team.jpg` |
| Contact | `content/contact/index.{hu,en}.md` | leaf | `title`, `description`, `translationKey: contact`, `menu: main`, `weight`, `email`, `phone`, `form_action`, `success_message` |
| Services landing | `content/services/_index.{hu,en}.md` | branch | `title`, `description`, `translationKey: services`, `menu: main`, `weight` |
| Service detail ×4 | `content/services/<svc>/index.{hu,en}.md` | leaf | `title`, `description`, `translationKey: svc-<n>`, `weight (1–4)`, `slug`, `icon`, `summary`, `hero_image`, `benefits[]`, `process_steps[{title,body}]`, `tech_stack[]?`, `cta_label`, `draft` |
| References landing | `content/references/_index.{hu,en}.md` | branch | `title`, `description`, `translationKey: references`, `menu: main`, `weight` |
| Case study | `content/references/<case>/index.{hu,en}.md` | leaf | `title`, `description`, `translationKey: ref-<n>`, `client`, `sector`, `year`, `date`, `services[]` (taxonomy), `tech[]` (taxonomy), `cover: cover.jpg`, `summary`, `metrics[{label,value}]`, `related_service`, `featured`, `weight` |

**SEO baseline on every page:** `title` (≤60c) · `description` (≤155c) · canonical · OG/Twitter · JSON-LD (Organization site-wide; Service on service pages; BreadcrumbList) · hreflang trio.

---

## 6. Design system

**Palette (verified WCAG AA on dark):**

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#0E1116` | base (blue-charcoal, not pure black) |
| `--surface` | `#161B22` | panels / cards |
| `--border` | `#232A33` | hairlines, titlebars, connective lines |
| `--muted` | `#8B98A5` | line numbers, metadata (~6.4:1) |
| `--text` | `#E6EDF3` | body (~15:1) |
| `--accent` | `#5BE9B9` | mint — caret, active line, primary CTA fill, focus ring (~11:1; CTA uses `#0E1116` text) |
| `--accent2` | `#7AA2F7` | periwinkle — links/syntax accents, sparing only |

**Typography (self-hosted woff2, subset latin+latin-ext, `font-display:swap`, ≤3 weights 400/500/700):**

| Use | Face |
|---|---|
| Display h1–h3 | **Space Grotesk** (variable, OFL) — non-mono, technical-premium |
| Body / UI | **Inter** (variable, OFL) 16–18px — strong `ő ű` rendering |
| Mono (metadata only) | **JetBrains Mono** (OFL) — line numbers, filenames, status bar, diff/code, palette input |

- **Hard build rule:** `clamp()` fluid display sizing, tested against long Hungarian compounds with hyphenation (`hyphens: auto; lang="hu"`).
- **Mono discipline:** metadata only; never body prose (kills AA comfort).

**Layout — persistent 3-zone editor chrome:**
1. Left **gutter rail** ~56px: faint line numbers double as a live section ledger/TOC (active entry ticks); collapses to a tap target on mobile.
2. **Main column** max ~72ch, content rendered as stacked **panels** (faint titlebar = filename + one muted accent dot). 8px spacing scale; 96–128px vertical rhythm between homepage panels; 12-col fluid grid only inside wide sections (portfolio, comparison); baseline-grid aligned.
3. Pinned **status bar** ~32px: breadcrumb left; `hu/en` toggle + "press `/` to search" right. Styled as a healthy uptime-monitor strip (sysadmin/hosting signal). Footer carries **REV. A — 2026** title-block trust metadata (company / lang / contact / legal).

**Homepage panel order:** editor hero (typed boot → display headline + dual CTA) → `// what we build` capability chips → services file-tree (software centered, three orbiting) → diff/metrics proof panel → references repo-cards → numbered process ledger (01/02/03: Felmérés → Ajánlat → Fejlesztés → Átadás → Support) → Rólunk + pun teaser → final CTA panel.

**Motion (CSS-driven, <1KB JS, transforms/opacity only):** hero typed reveal once (`steps()` + caret blink, real text pre-rendered in DOM); panels fade+rise 12px via IntersectionObserver, ~60ms stagger; palette 120ms scale-from-.98 + backdrop blur; variable-weight hover 300→800 on service headlines + 1px accent rule "drawing" across baseline on load. **All wrapped in `@media (prefers-reduced-motion: no-preference)`** — reduced-motion users get instant final states, no blink. No parallax, scroll-jacking, autoplay, canvas/WebGL.

**Signature interaction — command palette:** `/` or `Cmd/Ctrl-K` (or a visible status-bar chip on mobile) opens a centered blurred-backdrop palette built from the **single Hugo menu source** — fuzzy-filter, arrow keys, Enter navigates, Esc closes. ~2KB vanilla JS, focus-trapped, ARIA-listbox. **With JS off:** the `/` hint hides and the file-tree + footer nav are the real navigation — the palette is never the only nav.

**Accessibility:** WCAG AA throughout; skip-to-content link; real h1/h2 in DOM regardless of JS; visible focus rings (mint); keyboard-operable palette + switcher; `lang`/`hreflang` attrs; honeypot not the only spam guard; contrast audited (accent ≥4.5:1 on text, ≥3:1 large/UI).

---

## 7. Reusable components

**Partials**

- `baseof.html` — shell, skip-link, `lang`/`dir`, editor chrome (gutter/main/status bar)
- `head/css.html` · `head/js.html` — Pipes + fingerprint + SRI
- `head/seo.html` — title/desc, canonical, OG/Twitter, hreflang trio, JSON-LD
- `head/favicons.html`
- `header.html` · `nav.html` (file-tree) — menu-driven, active via `pageRef`/`IsMenuCurrent`
- `command-palette.html` — renders from the same `.Site.Menus.main` source
- `status-bar.html` — breadcrumb + lang toggle + `/` hint (uptime-monitor styling)
- `language-switcher.html` — `.AllTranslations`, current-page preserving
- `footer.html` — footer menu, REV./title-block metadata, pun line, year
- `cta.html` — "Kérek ajánlatot / Request a quote" band
- `service-card.html` · `reference-card.html` (repo-style)
- `picture.html` — responsive `<picture>`/`srcset`/`sizes`, width/height, lazy
- `icon.html` — inline SVG via `resources.Get | safeHTML`, currentColor
- `schema/organization.html` · `schema/service.html`

**Shortcodes:** `cta` · `tech-stack` (badges from front matter/data) · `figure-responsive` · `lead` · `diff` (before/after proof panel).

---

## 8. Asset pipeline (Hugo Extended + Dart Sass)

- **CSS:** `resources.Get "scss/main.scss"` → `toCSS (dict "transpiler" "dartsass" "outputStyle" "compressed")` → `postCSS` (autoprefixer; optional purge via `build.writeStats`) → `fingerprint "sha256"` → emit with `integrity`.
- **JS:** `resources.Get "js/main.js"` → `js.Build (minify, target es2018, format iife)` → fingerprint + SRI, `defer`.
- **Images:** bundle resources → `.Resize/.Fill/.Process` at 480/800/1200/1600, WebP/AVIF where supported; `picture.html` builds `<picture>` with explicit `width/height` (no CLS), `loading="lazy" decoding="async"`. `[imaging] quality=82, resampleFilter="Lanczos"`.
- **Icons:** inlined SVG (no HTTP request), CSS-colorable.
- **Fonts:** self-hosted subset woff2, `font-display:swap`, **preload** primary face. All fingerprinted output is immutable-cacheable. Total CSS+JS budget < 100KB.

---

## 9. Contact form on a static self-hosted site

**Recommended — option (c): tiny self-hosted endpoint on the same VPS.** A minimal Go/systemd service (or hardened PHP-FPM script) behind nginx at `/api/contact` that validates and sends via the owner's SMTP (SPF/DKIM). Real `<form method="POST" action="/api/contact">` works with **JS off**; with JS on, `fetch` AJAX submit + inline success message. Spam defense: **honeypot field + server-side rate-limiting**. Keeps data in-house — cleanest GDPR story, on-brand (they sell sysadmin/hosting). Budget ~1 day.

**Fallback — option (b): Web3Forms / Formspree** (free, zero backend) for a risk-averse launch; note the third-party + GDPR dependency. `mailto:` is **not** recommended (poor UX, scraped address).

`form_endpoint` lives in `params.toml` so swapping (c)↔(b) is a one-line config change.

---

## 10. Build & deploy to self-hosted nginx

**Build:** `hugo --gc --minify --cleanDestinationDir` with `HUGO_ENV=production`, pinned `HUGO_VERSION` (Extended) + `dart-sass` installed. Output → `public/`.

**Deploy (`deploy/deploy.sh`):** guard with a build-success check + **non-empty `public/` assertion** (so a failed build never triggers `--delete`), then:
```
rsync -azh --delete --checksum public/ deploy@vps:/var/www/mentes-it/public/
```
Optional zero-downtime: rsync into timestamped dir + symlink swap.

**nginx (`deploy/nginx.conf.sample`):** one server block, `root /var/www/mentes-it/public; try_files $uri $uri/ $uri.html =404;`.

| Path | Cache-Control |
|---|---|
| `/css/ /js/ /fonts/` + processed images (content-hashed) | `public, max-age=31536000, immutable` |
| HTML + `sitemap.xml` | `no-cache` (or `max-age=600`) |

Also: `gzip_static` / `brotli_static` (pre-compress in build), security headers (X-Content-Type-Options nosniff, Referrer-Policy, tight CSP, HSTS), TLS via certbot, `404.html`, www→apex + http→https redirects.

---

## 11. SEO, performance & accessibility checklist

**SEO**
- [ ] hreflang `hu`/`en`/`x-default` on every translated page; multilingual `sitemap.xml` submitted
- [ ] No duplicate-content drift between `/` and `/en/` (canonical + hreflang)
- [ ] JSON-LD: Organization (site), Service (service pages), BreadcrumbList
- [ ] Substantive service + reference copy (no blog → these carry organic ranking)
- [ ] Unique `title` + `description` per page; OG/Twitter cards from `cover`/`hero_image`

**Performance**
- [ ] CSS+JS < 100KB; motion JS < 1KB; zero animation libraries
- [ ] Fonts subset + capped weights + preload primary; `font-display:swap`
- [ ] Responsive images, explicit width/height (CLS ≈ 0), lazy below fold
- [ ] Fingerprinted immutable assets; brotli/gzip static; Lighthouse ≥ 95

**Accessibility (WCAG AA)**
- [ ] Real h1/h2 in DOM with JS off; skip-to-content link
- [ ] Palette focus-trapped, ARIA-listbox, full keyboard; never the only nav
- [ ] Contrast audited (≥4.5:1 text, ≥3:1 large/UI); visible mint focus rings
- [ ] `prefers-reduced-motion` honored everywhere; no caret blink for those users
- [ ] HU `lang` + hyphenation for long compounds; form labels + error states

---

## 12. Implementation roadmap

| Milestone | Deliverables |
|---|---|
| **M0 — Scaffold** | Repo + split `config/_default/`, `.gitignore`, pinned Hugo Extended + Dart Sass, both languages declared, empty content tree, README skeleton. Builds green. |
| **M1 — Chrome & design tokens** | `baseof.html` editor chrome (gutter / main / status bar), `_tokens.scss` palette, self-hosted font subsets, typography scale with `clamp()` + HU hyphenation, SCSS+JS Pipes wired. |
| **M2 — Navigation & i18n** | Config menus (hu/en), `nav.html` file-tree, `language-switcher.html`, i18n string files, `translationKey` discipline documented. Both URL trees resolve with hreflang. |
| **M3 — Homepage** | `home.html` all panels (typed hero w/ real DOM text, software-centered services, diff/metrics proof, references cards, numbered process ledger, CTA). Reduced-motion path verified. |
| **M4 — Templates & content** | Service list/single (×4, software primary), references list/single, about, contact page; `service-card`/`reference-card`/`picture` partials; seed 1 service + 1 case study fully bilingual. |
| **M5 — Command palette + motion** | Palette (`/`, `Cmd-K`, mobile chip), focus trap + ARIA-listbox, IntersectionObserver reveals, variable-weight hover, accent-rule draw. JS-off audit. |
| **M6 — Contact form** | Self-hosted `/api/contact` (validate + SMTP + honeypot + rate-limit), progressive `fetch` enhancement, no-JS fallback; Web3Forms fallback documented. |
| **M7 — SEO/a11y/perf hardening** | JSON-LD, OG, hreflang/x-default, Lighthouse + axe pass, contrast audit, CSP + security headers. |
| **M8 — Deploy & launch** | `deploy.sh` (guarded rsync), `nginx.conf.sample`, TLS, cache headers, redirects, README owner-editing guide. Production cutover. |

---

## 13. Open decisions for the owner

1. **Domain(s):** confirm `mentes-it.hu` as the single apex (FreeIT under `/en/`), or a separate `.com`?
2. **Contact form path:** approve self-hosted `/api/contact` (Go vs PHP-FPM), or launch on Web3Forms first?
3. **EN coverage:** must *every* case study be bilingual at launch, or may EN omit some (switcher hides them)?
4. **Launch reference count:** how many case studies are ready for M4/launch (need ≥3 for credibility + SEO)?
5. **Localized slugs:** approve Hungarian service/reference slugs (e.g. `egyedi-szoftverfejlesztes`) — these become permanent URLs.
6. **Brand assets:** logo/wordmark + favicon, and a real photo for About (or keep it text/illustration-only)?
7. **Analytics:** none (privacy-first), or a self-hosted Plausible/Umami on the VPS?
8. **Contact details to publish:** which email/phone/office-hours go in `params.toml` + status bar?
