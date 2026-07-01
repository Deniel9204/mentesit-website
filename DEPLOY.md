# Deploying MentesIT / FreeIT

The site ships as two small container images, built and published automatically
by GitHub Actions, which you pull and run on your own infrastructure:

| Image | What it is | Size |
|-------|-----------|------|
| `…/mentesit-website-web` | nginx + the pre-built static site | ~77 MB |
| `…/mentesit-website-contact` | the Go contact-form endpoint (distroless) | ~14 MB |

```
            ┌── your TLS reverse proxy (Caddy / Traefik / host nginx) ──┐
   :443 ───▶│  mentesit.eu  /  *.mentesit.eu                            │
            └───────────────┬───────────────────────────────────────────┘
                            ▼  http
                   ┌─────────────────┐   /api/contact (POST)   ┌────────────────┐
                   │  web (nginx)    │ ─────────────────────▶  │ contact (Go)   │
                   │  static site    │      proxy_pass         │  → your SMTP   │
                   └─────────────────┘                         └────────────────┘
```

---

## 0. One-time: publish the images from GitHub

1. Create the GitHub repo and push:
   ```bash
   git remote add origin git@github.com:Deniel9204/mentesit-website.git
   git push -u origin main
   ```
2. The **`build` workflow** (`.github/workflows/build.yml`) runs on every push to
   `main` and on `v*` tags. It builds **linux/amd64 + linux/arm64** images and
   pushes them to GHCR:
   - `ghcr.io/deniel9204/mentesit-website-web`
   - `ghcr.io/deniel9204/mentesit-website-contact`
   Tags: `latest` (default branch), the short commit SHA, and the semver for tags.
3. Make the packages pullable from your server — either:
   - set each package's visibility to **Public** (GitHub → repo → Packages → package → *Package settings* → *Change visibility*), or
   - keep them private and create a **read:packages PAT**, then on the server:
     ```bash
     echo "$GHCR_PAT" | docker login ghcr.io -u Deniel9204 --password-stdin
     ```

> Tip: cut a release with `git tag v1.0.0 && git push --tags` to get an immutable
> `:1.0.0` image you can pin in `.env`.

---

## 1. DNS

| Record | Host | Value |
|--------|------|-------|
| A | `mentesit.eu` | your server IPv4 |
| AAAA | `mentesit.eu` | your server IPv6 (if any) |
| A/AAAA | `www.mentesit.eu` | same (proxy redirects → apex) |

Email deliverability for the contact form (so messages don't land in spam):

| Record | Host | Value (example) |
|--------|------|-----------------|
| TXT (SPF) | `mentesit.eu` | `v=spf1 include:<your-smtp-provider> -all` |
| TXT (DKIM) | `<selector>._domainkey` | provided by your SMTP provider |
| TXT (DMARC) | `_dmarc.mentesit.eu` | `v=DMARC1; p=quarantine; rua=mailto:info@mentesit.eu` |

---

## 2. Pull & run on the server

```bash
mkdir -p /opt/mentesit && cd /opt/mentesit
# bring docker-compose.yml + .env.example here (scp, or clone the repo)
cp .env.example .env
$EDITOR .env          # set WEB_IMAGE / CONTACT_IMAGE + SMTP_*
docker compose pull
docker compose up -d
docker compose ps
```

`.env` essentials:
```ini
WEB_IMAGE=ghcr.io/deniel9204/mentesit-website-web:latest
CONTACT_IMAGE=ghcr.io/deniel9204/mentesit-website-contact:latest
WEB_PORT=8080                       # host port the proxy points at
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=no-reply@mentesit.eu      # must pass SPF/DKIM
MAIL_TO=info@mentesit.eu
SUCCESS_URL=https://mentesit.eu/kapcsolat/
ALTCHA_HMAC_KEY=                    # openssl rand -hex 32 (else ephemeral)
```

The `web` container serves on `:80` (mapped to `WEB_PORT`) and proxies
`POST /api/contact` to the `contact` container over the compose network.

### Sending mail via Gmail SMTP

If you relay outgoing mail through Gmail (with Cloudflare Email Routing handling
inbound forwarding to your inbox), set these in `.env`:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com     # the authenticating Gmail account
SMTP_PASS=<App Password>    # 16-char Google App Password, NOT your login password
MAIL_FROM=you@gmail.com     # the Gmail account or a verified "Send mail as" alias
MAIL_TO=you@gmail.com       # where messages land (your real inbox)
```

- The **App Password** requires 2-Step Verification on the Google account
  (Google Account → Security → App passwords). A normal password is rejected.
- Gmail only sends **From** the authenticated address or a verified alias.
  Setting `MAIL_FROM=no-reply@mentesit.eu` without configuring it under Gmail
  "Send mail as" makes Gmail rewrite or refuse the From — a common cause of
  "submitted OK but no mail arrives". Add the alias in Gmail first, or send as
  the Gmail address.
- Gmail's send limits (~500/day) are far above a contact form's needs.

---

## 3. TLS (terminate in front of `web`)

The containers speak plain HTTP; put your own TLS proxy in front. Example with
**Caddy** (auto Let's Encrypt):

```caddy
mentesit.eu {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
www.mentesit.eu {
    redir https://mentesit.eu{uri} permanent
}
```

Prefer host **nginx**? `deploy/nginx.conf.sample` is a complete TLS vhost
(certbot, redirects, security headers); point its `proxy_pass` at
`http://127.0.0.1:8080` instead of a static `root`.

---

## 4. Verify

```bash
curl -I  https://mentesit.eu/                       # 200, Cache-Control no-cache
curl -I  https://mentesit.eu/en/                     # 200 (English)
curl -sI https://mentesit.eu/scss/main.*.css | grep -i cache-control   # immutable
curl -i  https://mentesit.eu/api/contact             # 403 (GET denied)
# real submission:
curl -i -X POST https://mentesit.eu/api/contact \
  -H 'Accept: application/json' \
  --data 'name=Test&email=you@example.com&message=hello'   # {"ok":true}
```

Then open the site and check: language switch keeps the page, the command
palette (`/` or `⌘/Ctrl-K`), the contact form sends a real email, and run a
Lighthouse pass (expect 95+ across the board).

---

## 5. Updating & rollback

```bash
docker compose pull && docker compose up -d   # update to newest :latest
docker image prune -f                          # reclaim old layers
```
To pin/rollback, set an explicit tag in `.env` (`...:1.0.0` or `...:sha-<short>`)
and re-run `up -d`. Old images stay in GHCR, so rollback is just a tag change.

---

## 6. Analytics (GoAccess) — optional

Self-hosted, **cookieless, no-JavaScript, no-database** web analytics. GoAccess
reads the nginx access log (IPs are anonymized *in the log format*, so raw logs
never store a full IP) and renders a static dashboard served **same-origin at
`/stats/`** behind HTTP basic-auth. Zero bytes are added to the site, so no
consent banner is needed (already reflected in the privacy policy).

```bash
# 1. create the dashboard login (Apache htpasswd tools, or: docker run httpd)
htpasswd -c deploy/htpasswd <username>        # gitignored; never commit it

# 2. run with the analytics overlay
docker compose -f docker-compose.yml -f docker-compose.analytics.yml up -d

# 3. browse (behind your TLS proxy)
open https://mentesit.eu/stats/               # prompts for the login above
```

The `goaccess` container regenerates `/stats/index.html` every 5 minutes from
`site.access.log`. Reload the page for fresh numbers (batch mode — no WebSocket).

**Cloudflare / real client IP.** The anonymized log shows *visitors* only if
nginx sees the real client IP. `nginx.docker.conf` trusts private-range proxies
and reads `X-Forwarded-For`. If the site is **Cloudflare-proxied** (orange
cloud), either keep DNS-only (grey cloud) or add Cloudflare's IP ranges to
`set_real_ip_from` and use `real_ip_header CF-Connecting-IP` — otherwise every
hit collapses to a Cloudflare edge IP.

**Retention / rotation.** `--keep-last=30` caps the report to 30 days, but the
raw `site.access.log` still grows on disk — set up log rotation for the
`nginx-logs` volume (e.g. a logrotate sidecar or a periodic truncate) to keep
retention short. This short retention (not the report-time anonymization) is
what does the real GDPR work.

**Host bind-mounts (e.g. TrueNAS).** The overlay uses named volumes; if you
instead bind-mount host paths, note that (1) the GoAccess service must mount the
report dir at **`/report`** (rw) — GoAccess writes there — while the **web**
service mounts the *same* dir at `/srv/goaccess` (ro); (2) GoAccess writes the
report as `root:root 0644`, but the web nginx worker runs as **uid 101**, so the
report dir needs to be traversable by it — `chmod 0755 <host>/goaccess-report`
(a `0770` root-owned dir yields 403 at `/stats/`); (3) call `goaccess` bare (the
binary path moved between image versions). If nothing appears, drop the
`|| true`/stderr redirect and read `docker logs goaccess`.

**Host-nginx (no Docker) shape.** Run GoAccess from cron against
`/var/log/nginx/site.access.log` — `goaccess site.access.log -o
/srv/stats/index.html --log-format=COMBINED --anonymize-ip --keep-last=30
--ignore-crawlers` — and serve `/srv/stats` from an `auth_basic` location in
`deploy/nginx.conf.sample` (same `map`/`log_format`/`set_real_ip_from` shown in
`nginx.docker.conf`).

---

## Alternative: no Docker (rsync to a host nginx)

If you'd rather not use containers, `deploy/deploy.sh` builds with a local Hugo
and `rsync`s `public/` to a host running `deploy/nginx.conf.sample`, and the
contact service runs via `deploy/mentesit-contact.service` (systemd). See
`contact-service/README.md`.
