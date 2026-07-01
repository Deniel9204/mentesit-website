# MentesIT / FreeIT — website

Bilingual (Hungarian default + English) static marketing site for **MentesIT**
(HU) / **FreeIT** (EN), built with **Hugo Extended**.

Design direction: *"stdout — the elegant shell"* — a calm, art-directed IDE.

## Requirements

- **Hugo Extended** ≥ 0.146 (`hugo version` must include `+extended`)
- **Dart Sass** on `PATH` (the SCSS pipeline uses `transpiler: dartsass`)

## Develop

```bash
hugo server        # http://localhost:1313  (HU at /, EN at /en/)
```

## Build (production)

```bash
HUGO_ENV=production hugo --gc --minify --cleanDestinationDir
# output -> public/
```

## Deploy (self-hosted nginx)

```bash
./deploy/deploy.sh user@host:/var/www/mentesit/public/
```

`deploy/nginx.conf.sample` is a ready-to-adapt vhost (TLS, pretty URLs,
immutable asset caching, security headers).

## Project layout

```
config/_default/   split config — hugo, languages, menus.{hu,en}, params, markup
content/           HU (index.hu.md) + EN (index.en.md), paired by translationKey
i18n/              UI strings (hu.toml, en.toml)
layouts/           templates + partials (editor chrome, cards, SEO, pipeline)
assets/scss/       design system (tokens, typography, layout, components)
assets/js/         progressive-enhancement entry point
deploy/            deploy.sh + nginx.conf.sample
docs/              RELEASING.md (automated release flow)
```

## Adding content

- **New service** — `hugo new content services/<slug>/index.hu.md` then add an
  `index.en.md` beside it. Set a unique `translationKey`, a `weight`, and (HU
  only) a localized `url:`.
- **New case study** — `hugo new --kind references content references/<slug>/index.hu.md`
  (plus the `.en.md`). Add `cover.jpg` to the same folder.

## SEO & assets

- Structured data: JSON-LD (Organization/ProfessionalService, WebSite, Service,
  BreadcrumbList, FAQPage), OG image at `static/og/default.png`, hreflang +
  canonical, and a clean axe (WCAG 2.1 AA) pass on every page.
- Fonts are self-hosted and subset (Latin + Latin-Extended) in `static/fonts/`:
  Inter 400/600, Space Grotesk (variable), JetBrains Mono 400 — regenerate with
  `fontTools` if you change the subset range.

## Notes

- Contact form: self-hosted Go endpoint in `contact-service/` (see its README);
  run via `deploy/mentesit-contact.service` (systemd) or the containerized
  stack in `docker-compose.yml`. Proxied by nginx at `/api/contact`;
  `formEndpoint` lives in `params.toml`.
- Deployment & releases: see [`DEPLOY.md`](DEPLOY.md) and
  [`docs/RELEASING.md`](docs/RELEASING.md).
