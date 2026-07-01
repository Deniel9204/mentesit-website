# Releasing

Releases are automated with **semantic-release** (`.github/workflows/release.yml`
+ `.releaserc.json`). You no longer tag by hand.

## How it works

On every push to `main`, semantic-release reads the **conventional-commit**
messages since the last release and, if there's anything releasable:

1. decides the next version,
2. creates the `vX.Y.Z` git tag,
3. publishes a GitHub Release with generated notes,
4. then the `images` job builds & pushes the versioned multi-arch images to GHCR.

If nothing is releasable, it does nothing.

## Which commit bumps which version

| Commit type | Release |
|---|---|
| `feat: …` | **minor** (`0.x.0`) |
| `fix: …`, `perf: …`, `content: …` | **patch** (`0.0.x`) |
| `feat!: …` or a `BREAKING CHANGE:` footer | **major** |
| `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, `style:`, `build:` | no release |

Scopes are fine and show up in the notes: `feat(contact): …`, `fix(a11y): …`.

## Notes

- `build.yml` still builds `:latest` / `:sha` on `main` pushes and validates PRs.
- Renovate `chore(deps): …` commits do **not** cut releases; a `fix(deps): …`
  would cut a patch — set Renovate's commit type if you don't want that.
- To release on demand, land a `feat:`/`fix:` commit, or run the **release**
  workflow via *workflow_dispatch*.
- Deploy the result: bump the web image to the new `:X.Y.Z`, then
  `docker compose pull && docker compose up -d`.
