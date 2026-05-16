# Email Validation & Deliverability API

A production-ready REST API that validates email addresses across multiple quality dimensions in a single request. Built with Node.js, Fastify, and Redis — runs anywhere Docker does.

## Why this API instead of rolling your own?

| What you'd have to build | What you get here |
|---|---|
| RFC 5322 regex | ✅ Done |
| MX record lookups with timeouts | ✅ Done |
| SMTP mailbox existence verification | ✅ Done (industry standard) |
| Real catch-all domain detection via SMTP probe | ✅ Done (not a stub) |
| Typo correction (gmial.com → gmail.com) | ✅ Done — **self-hostable differentiator** |
| 500+ disposable domain blocklist | ✅ Done |
| Role-based account detection | ✅ Done |
| Redis result caching (7-day TTL) | ✅ Done |
| Async bulk jobs with webhook callbacks | ✅ Done |
| Per-key rate limiting + quota | ✅ Done |

**Catch-all detection** and **SMTP mailbox verification** work by opening a real SMTP session to the domain's MX server. The probe is non-blocking — if port 25 is filtered (common in cloud environments) the check degrades gracefully to `smtp_exists: "unknown"` without affecting the overall response.

---

## Quickstart

```bash
# 1. Clone and install
npm install

# 2. Start Redis (Docker)
docker compose up -d redis

# 3. Run locally
npm run dev

# 4. Register a free API key
curl -X POST http://localhost:3000/v1/keys

# 5. Validate an email
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: evapi_your_key_here" \
  -d '{"email": "user@example.com"}'
```

---

## SDKs & Client Libraries

### JavaScript / TypeScript (Node.js 18+, browsers)

A ready-to-use client lives in [`sdk/js/index.js`](./sdk/js/index.js). Zero dependencies in Node 18+.

```js
import { EmailValidationClient } from './sdk/js/index.js';

const client = new EmailValidationClient('evapi_your_key_here');

// Single validation
const result = await client.validate('user@example.com');
console.log(result.valid, result.score, result.suggestion);

// Bulk — fire and poll until done
const results = await client.bulkValidateSync(['a@b.com', 'c@d.com']);
```

### Python

A drop-in Python client lives in [`sdk/python/client.py`](./sdk/python/client.py). Requires `requests`.

```python
from sdk.python.client import EmailValidationClient

client = EmailValidationClient("evapi_your_key_here")

result = client.validate("user@example.com")
print(result["valid"], result["score"], result["suggestion"])

# Bulk with polling
results = client.bulk_validate_sync(["a@b.com", "c@d.com"])
```

### HTTP (curl)

```bash
# Register
API_KEY=$(curl -sX POST http://localhost:3000/v1/keys | jq -r .api_key)

# Validate
curl -sX POST http://localhost:3000/v1/validate \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}' | jq .
```

---

## API Reference

All authenticated endpoints require the `X-API-Key` header.

### POST /v1/keys
Register a free API key (no auth required). Paid plans require a Stripe checkout first — requesting `basic` or `pro` here returns `402 Payment Required` with a link to `/v1/billing/checkout`.

```json
// Request (optional — only "free" accepted without payment)
{ "plan": "free" }

// Response 201
{
  "api_key": "evapi_...",
  "user_id": "user_...",
  "plan": "free",
  "daily_limit": 50,
  "message": "Store your API key securely — it will not be shown again."
}

// Response 402 (when plan is "basic" or "pro")
{
  "error": "Payment required",
  "message": "The basic plan requires a paid subscription. Start checkout at POST /v1/billing/checkout",
  "checkout_url": "/v1/billing/checkout"
}
```

---

### POST /v1/validate
Validate a single email address.

```json
// Request
{ "email": "user@example.com" }

// Response 200
{
  "email": "user@example.com",
  "score": 87,
  "valid": true,
  "checks": {
    "syntax": true,
    "mx": true,
    "disposable": false,
    "role_based": false,
    "catch_all": false,
    "smtp_exists": "deliverable"
  },
  "suggestion": null,
  "cached": false
}
```

**Score breakdown (0–100):**
| Signal | Impact |
|---|---|
| Invalid syntax | −50 |
| No MX records | −30 |
| SMTP undeliverable (550) | −30 |
| Disposable domain | −25 |
| Role-based address | −10 |
| Catch-all domain | −5 |

`valid: true` requires score ≥ 50, valid syntax, MX records present, and SMTP not returning undeliverable.

**`smtp_exists` values:**
- `deliverable` — SMTP 250 accepted
- `undeliverable` — SMTP 550 rejected
- `unknown` — port 25 filtered or timed out (neutral, no score penalty)

---

### POST /v1/validate/bulk *(Basic/Pro only)*
Submit up to 100 emails for async validation.

```json
// Request
{
  "emails": ["a@example.com", "b@test.com"],
  "webhook_url": "https://your-app.com/hooks/email-result"
}

// Response 202
{ "job_id": "job_abc123", "status": "queued", "count": 2 }
```

The webhook receives a POST with the completed `BulkJob` payload when done. All webhook URLs are validated through SSRF protection before delivery.

---

### GET /v1/jobs/:job_id
Poll a bulk validation job.

```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "results": [ /* array of validate responses */ ],
  "created_at": "2026-05-16T10:00:00Z",
  "completed_at": "2026-05-16T10:00:12Z"
}
```

---

### GET /v1/usage
Current quota usage for the authenticated key.

```json
{
  "plan": "free",
  "requests_today": 23,
  "daily_limit": 50,
  "resets_at": "2026-05-17T00:00:00Z"
}
```

---

### GET /v1/health
Deep liveness check — probes Redis and SQLite.

```json
{
  "status": "ok",
  "components": {
    "redis":    { "status": "ok", "latency_ms": 2 },
    "database": { "status": "ok", "latency_ms": 0 }
  },
  "timestamp": "2026-05-16T10:00:00.000Z"
}
```

Returns `503` with `status: "degraded"` if any dependency is unhealthy.

---

### GET /v1/metrics
Aggregate runtime counters (no auth required).

```json
{
  "total_validations": 1042,
  "cache_hits": 731,
  "cache_misses": 311,
  "cache_hit_rate": 0.7012,
  "valid_emails": 887,
  "invalid_emails": 155,
  "smtp_checks": 311,
  "uptime_seconds": 86400
}
```

---

### POST /v1/billing/checkout *(requires API key)*
Create a Stripe Checkout Session to upgrade from Free to Basic or Pro.

```json
// Request
{ "plan": "basic" }

// Response 200
{ "url": "https://checkout.stripe.com/pay/cs_live_..." }

// Response 503 — Stripe not configured (self-hosted installs)
{ "error": "Payment processing not configured" }
```

Set the `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, and `STRIPE_PRICE_PRO` environment variables to enable this endpoint. After a successful checkout, Stripe calls `/v1/billing/webhook` and the user's plan is upgraded automatically.

---

### POST /v1/billing/webhook *(no auth — called by Stripe)*
Receives Stripe events and upgrades the subscriber's plan on `checkout.session.completed`.

```bash
# Configure in Stripe Dashboard → Webhooks → Add endpoint
# URL: https://your-api.fly.dev/v1/billing/webhook
# Events: checkout.session.completed
```

Returns `200 { "received": true }` for all events.

---

## Pricing & Upgrade Path

| Plan  | Price     | Daily limit | Overage      | Bulk jobs |
|-------|-----------|-------------|--------------|-----------|
| Free  | $0        | 50 req/day  | —            | No        |
| Basic | $14.99/mo | 1,000/day   | $0.01/req    | Yes       |
| Pro   | $79/mo    | 10,000/day  | $0.01/req    | Yes       |

**Upgrade path:** Register a free key at `POST /v1/keys`, then call `POST /v1/billing/checkout` with your API key to get a Stripe-hosted payment page. After payment completes, your key is upgraded automatically via webhook. When a free key exhausts its quota the API returns `429` with a `retry_after` timestamp — surface an inline upgrade link at that point.

**RapidAPI listing:** Deploy to [Fly.io](https://fly.io) and submit to [RapidAPI](https://rapidapi.com) for organic discovery. The free tier removes signup friction so developers can evaluate without a credit card. The natural conversion trigger is the first `429`.

### RapidAPI Proxy Integration

When your API is listed on RapidAPI, all traffic arrives with three extra headers. Set `RAPIDAPI_PROXY_SECRET` to the secret from your RapidAPI provider dashboard, and the auth middleware will validate it automatically — no X-API-Key needed for marketplace traffic.

| Header | Description |
|--------|-------------|
| `X-RapidAPI-Proxy-Secret` | Proves the request came through RapidAPI (validate against your `RAPIDAPI_PROXY_SECRET` env var) |
| `X-RapidAPI-Subscription` | Plan name from RapidAPI (`basic`, `pro`, etc.) — used to set the effective quota |
| `X-RapidAPI-User` | RapidAPI user ID for the caller |

```bash
# .env
RAPIDAPI_PROXY_SECRET=<secret from RapidAPI provider dashboard>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
```

---

## Integrations

### Zapier

Use the **Webhooks by Zapier** action to call `/v1/validate` from any Zap:

1. Add a **Webhooks by Zapier** step → POST
2. URL: `https://your-api.fly.dev/v1/validate`
3. Headers: `X-API-Key: evapi_...`
4. Data: `{"email": "{{email_field}}"}`
5. Parse the response — use `valid`, `score`, and `suggestion` fields in downstream steps.

**Common patterns:**
- **CRM enrichment:** Trigger on new HubSpot/Salesforce contact → validate → flag invalid leads.
- **Form gate:** Typeform / Google Forms → validate → branch: discard invalid, continue valid.
- **Mailchimp cleanup:** New subscriber → validate → remove if `disposable: true` or `score < 50`.

### ESP Partnerships

| ESP | Integration path |
|-----|-----------------|
| **Mailchimp** | Zapier → validate before `Add/Update Subscriber`; or call the API in your signup flow |
| **SendGrid** | Use Inbound Parse webhook → validate sender email before processing |
| **ActiveCampaign** | Automation → Webhook action → validate → tag contact as `valid` / `suspect` |
| **ConvertKit** | Use the subscriber created webhook → validate → apply tag |
| **Brevo (Sendinblue)** | API → contacts.create → pre-validate in your backend |

Teams that validate before sending lower their bounce rate below 2 %, protecting sender reputation and deliverability — the core pain this API solves.

### Make (Integromat)

Use the **HTTP → Make a request** module:
- Method: POST, URL: `/v1/validate`, Headers: `X-API-Key`, Body: `{"email": "{{email}}"}`
- Route on `valid = true` to continue; route `valid = false` to a separate cleanup scenario.

### Webhook callbacks (bulk jobs)

Bulk results are POSTed to your `webhook_url` as a JSON body matching the `BulkJob` schema. Your endpoint must return `2xx` within 10 seconds. Example receiver (Express):

```js
app.post('/hooks/email-results', (req, res) => {
  const { job_id, status, results } = req.body;
  // filter, store, or act on results
  res.sendStatus(200);
});
```

---

## Distribution & Growth

### RapidAPI Marketplace

1. Deploy to Fly.io (see below).
2. Submit to [RapidAPI](https://rapidapi.com) — list all three tiers.
3. The free tier removes the credit-card barrier; developers evaluate risk-free.
4. First `429` response body includes `plan: "free"` — surface an in-app upgrade link to your payment page.

### Content / SEO

High-intent search terms to target with technical blog posts:

| Post idea | Target keyword |
|-----------|---------------|
| "Why your email bounce rate is above 5%" | email bounce rate fix |
| "How to detect disposable emails at signup" | block temp email signups |
| "MX record lookup for email validation" | mx record email check |
| "SMTP RCPT TO — how email verification works" | smtp email verification |
| "Best email validation libraries Node.js 2024" | email validation npm |

Publish one post per month; link back to the RapidAPI listing. Each post doubles as API documentation for developers who arrive via organic search.

### Indie Hacker / Community Channels

- Post a **Show HN** after launch ("I built a self-hostable email validation API — GDPR-friendly, $0 open source, or $15/mo managed")
- Share in r/SaaS, r/webdev, Indie Hackers — lead with the self-hosting angle (data residency)
- Submit to Product Hunt on a Tuesday with a strong tagline: "Email validation that respects data sovereignty"

---

## Revenue Projections

Conservative estimates based on a freemium funnel with 2 % free→paid conversion.

| Milestone | Free keys | Basic subs | Pro subs | MRR |
|-----------|-----------|------------|----------|-----|
| Launch (month 1) | 200 | 3 | 1 | ~$125 |
| Month 6 | 2,000 | 30 | 8 | ~$1,082 |
| Month 12 | 8,000 | 100 | 25 | ~$3,474 |

**Assumptions:** $14.99/mo Basic, $79/mo Pro, 2 % conversion, ~20 % of paid users on Pro. RapidAPI listing adds a second distribution channel at no incremental cost. Overage at $0.01/req contributes ~10 % of MRR at scale.

---

## Self-Hosting

This is a **single Docker container** — no managed services required for a basic setup:

```bash
docker compose up
```

```bash
# Copy .env.example → .env and set real values
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

# Generate with: openssl rand -hex 32
REDIS_PASSWORD=<strong_random_password>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

DB_PATH=/app/data/emailvalidation.db

# Stripe — required for paid plan checkout
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...

# RapidAPI — required for marketplace proxy auth
RAPIDAPI_PROXY_SECRET=<secret from RapidAPI provider dashboard>
```

> **Security note:** Redis binds only to the Docker-internal network (no public port). `REDIS_PASSWORD` is required — the container refuses to start without it. Never run Redis with a blank password in production.

`docker-compose.yml` ships with the repo and includes Redis. API keys and bulk jobs persist in SQLite at `DB_PATH`. Redis is optional — the service degrades gracefully without it (cache misses become live validations).

**Why self-hostable matters:** Most competitors are SaaS-only. Self-hosting lets teams with strict data residency requirements (GDPR, HIPAA) run this inside their own VPC without sending email addresses to a third-party. This is a genuine differentiator for enterprise deals.

---

## Tech Stack

- **Runtime:** Node.js 22 + TypeScript (strict)
- **Framework:** Fastify 4 — JSON schema validation on every route
- **DNS:** `node:dns/promises` — MX lookups with 3 s timeout
- **SMTP:** Raw TCP port 25 — EHLO/MAIL FROM/RCPT TO probe with 5 s timeout, graceful fallback
- **Cache:** Redis 7 (ioredis) — 7-day TTL per result, daily quota counters
- **Storage:** SQLite via `node:sqlite` — zero external DB dependency
- **Queue:** p-queue (concurrency 5) — in-process async bulk job runner
- **Security:** SSRF-safe webhook delivery, SHA-256 key hashing, parameterized SQL
- **Observability:** Pino structured JSON + `/v1/health` dependency probing + `/v1/metrics`

---

## Development

```bash
npm run dev          # tsx watch mode
npm test             # 135 tests, ~1 s
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # tsc → dist/
```

Tests use an in-memory database and a mocked Redis client — no external services needed.

---

## Deployment (Fly.io)

```bash
fly launch
fly secrets set REDIS_URL=redis://...
fly deploy
```

Fly.io provides automatic TLS, global edge routing, and multi-region restart policy. The `/v1/health` endpoint is wired for uptime monitors out of the box.

---

## Security

- API keys stored as SHA-256 hashes — never logged or returned after creation
- Every route validates input against JSON Schema (Fastify AJV)
- Webhook URLs checked through SSRF protection before every delivery (blocks RFC 1918, loopback, link-local, cloud metadata)
- DNS capped at 3 s; SMTP probes capped at 5 s
- No `eval`, no string-interpolated SQL, no user-controlled shell commands
- `npm audit` runs in CI on every push

---

## License

MIT
