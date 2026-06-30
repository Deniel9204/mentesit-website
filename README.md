# MentesIT / FreeIT — website

Bilingual (Hungarian default + English) static marketing site for **MentesIT**
(HU) / **FreeIT** (EN), built with **Hugo Extended**.

Design direction: *"stdout — the elegant shell"* — a calm, art-directed IDE.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full plan.

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
docs/              ARCHITECTURE.md (the plan)
```

## Adding content

- **New service** — `hugo new content services/<slug>/index.hu.md` then add an
  `index.en.md` beside it. Set a unique `translationKey`, a `weight`, and (HU
  only) a localized `url:`.
- **New case study** — `hugo new --kind references content references/<slug>/index.hu.md`
  (plus the `.en.md`). Add `cover.jpg` to the same folder.

## Milestones

`M0` scaffold ✅ · `M1` chrome & tokens ✅ · `M2` nav & i18n · `M3` homepage ·
`M4` templates & content · `M5` command palette + motion · `M6` contact form ·
`M7` SEO/a11y/perf · `M8` deploy & launch.

Fonts are self-hosted and subset (Latin + Latin-Extended) in `static/fonts/`:
Inter 400/600, Space Grotesk (variable), JetBrains Mono 400 — regenerate with
`fontTools` if you change the subset range.

## Notes / TODO

- Self-hosted webfonts (Space Grotesk, Inter, JetBrains Mono) — done in **M1**.
- Contact form (`/api/contact`) is wired in **M6**; `formEndpoint` lives in
  `params.toml`.
- Confirm contact email/phone in `config/_default/params.toml` before launch.
