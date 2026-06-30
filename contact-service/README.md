# Contact endpoint

Tiny self-hosted service for the MentesIT / FreeIT contact form. Standard
library only, single static binary. It validates input, drops honeypot
submissions, rate-limits per IP, and relays the message over SMTP. No
third-party services, no database.

## Build

```bash
cd contact-service
go build -o /opt/mentesit/contact .
```

## Configuration (environment variables)

| Var            | Default                          | Notes |
|----------------|----------------------------------|-------|
| `CONTACT_ADDR` | `127.0.0.1:8081`                 | listen address (behind nginx) |
| `CONTACT_PATH` | `/api/contact`                   | request path |
| `SMTP_HOST`    | `127.0.0.1`                      | SMTP relay host |
| `SMTP_PORT`    | `25`                             | SMTP port |
| `SMTP_USER`    | (unset)                          | set for authenticated SMTP |
| `SMTP_PASS`    | (unset)                          | keep in an `EnvironmentFile`, not the unit |
| `MAIL_FROM`    | `no-reply@mentesit.eu`           | envelope/From — align with SPF/DKIM |
| `MAIL_TO`      | `info@mentesit.eu`               | where messages are delivered |
| `SUCCESS_URL`  | `https://mentesit.eu/kapcsolat/` | redirect target for no-JS POSTs |
| `TRUSTED_PROXIES` | `127.0.0.0/8,::1/128`         | CIDRs/IPs whose `X-Forwarded-For` is trusted (your reverse proxy). Compose sets the web→contact network. |
| `ALTCHA_HMAC_KEY` | (random per start)               | Secret signing the ALTCHA captcha challenges (`openssl rand -hex 32`). Set it for stable/multi-replica deploys. |

## Deploy (systemd)

Copy `../deploy/mentesit-contact.service` to `/etc/systemd/system/`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mentesit-contact
```

nginx proxies `/api/contact` to this service — see `../deploy/nginx.conf.sample`.

## Behaviour

- `POST` with the honeypot field (`company_url`) filled → pretends success,
  sends nothing.
- Per-IP rate limit: **5 requests / 10 minutes** (sliding window, in-memory).
  `X-Forwarded-For` is only honored from a `TRUSTED_PROXIES` peer (right-most
  non-proxy entry), so a client cannot spoof the header to evade the limit.
- CR/LF stripped from header-bound fields → no mail-header injection.
- **ALTCHA captcha** (self-hosted, no third party): `GET /api/contact/challenge`
  issues a signed proof-of-work challenge; the browser solves it and posts the
  result in the `altcha` field. The server re-checks the solution + its HMAC
  signature, the embedded expiry, and single-use (replay) — invalid/missing →
  `400`. Requires JS; no-JS visitors use the email address on the contact page.
- `Accept: application/json` (the site's `fetch`) → JSON `{ok, message}`;
  otherwise a `303` redirect to `SUCCESS_URL`.
- Request body capped at 64 KB; `GET /healthz` → `ok`.

For deliverability, configure **SPF + DKIM** for the `MAIL_FROM` domain.
