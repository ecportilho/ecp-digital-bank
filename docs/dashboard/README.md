# ECP Banco Digital — Operational Dashboard

## Overview

This dashboard provides a unified operational view of ECP Banco Digital, covering product metrics, OKR progress, SRE health, and DORA performance indicators. It currently runs with **simulated data** and is designed to be opened directly via `file://` protocol or served via any static HTTP server.

## Quick Start

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari)
2. No build step or server required — all dependencies load from CDN
3. Navigate between sections using the sidebar

## Architecture

```
docs/dashboard/
├── index.html          # Main HTML — sidebar + topbar + 4 sections
├── README.md           # This file
└── assets/
    ├── style.css       # Full design system (dark theme, lime accent)
    ├── data.js         # DASHBOARD_DATA object (simulated)
    └── charts.js       # Chart rendering + navigation logic
```

**Stack:** Pure HTML/CSS/JS with Chart.js 4.x via CDN. No framework, no build tools.

## Sections

| Section | Content |
|---------|---------|
| **Overview** | North Star (WAU-EFI), activation, retention, NPS, weekly transacting |
| **Product Usage** | DAU/MAU trends, stickiness, sessions, feature adoption, conversion funnels |
| **Outcomes & KRs** | OKR objective + 5 Key Results with progress, status, and trends |
| **SRE & Technical** | SLOs, DORA metrics, API latency, error rates, top errors, infrastructure |

## Connecting Real Data Sources

The dashboard is designed to be data-source agnostic. Replace the `DASHBOARD_DATA` object in `assets/data.js` with real values from the following sources:

### Product Metrics — PostHog

ECP Banco Digital uses **PostHog** for product analytics. To connect:

1. Use the PostHog API to query events: `https://app.posthog.com/api/projects/{id}/insights/`
2. Map PostHog insights to `DASHBOARD_DATA.product`:
   - `mau` / `dau` — Unique users (daily/monthly) from PostHog's `$pageview` or custom `session_start` event
   - `activation_rate` — Funnel insight: signup → first transaction
   - `retention_d30` — PostHog retention insight (D30 cohort)
   - `north_star_value` (WAU-EFI) — Custom insight: weekly users with >= 1 financial transaction
3. Feature adoption maps to PostHog feature flag usage or event counts per feature

### Error Tracking — Sentry

Errors are tracked via **Sentry** for Node.js/Fastify:

1. Query top issues: `GET /api/0/projects/{org}/{project}/issues/?query=is:unresolved&sort=freq`
2. Map to `DASHBOARD_DATA.sre.top_errors[]`
3. Error rate can be derived from Sentry's event volume vs. total API requests

### API Latency — Fastify Custom Metrics

ECP's Fastify API exposes custom metrics:

1. Use `fastify-metrics` plugin to expose a `/metrics` endpoint (Prometheus format)
2. Key metrics:
   - `http_request_duration_seconds` (histogram) — p50, p95, p99 latencies
   - `http_requests_total` — request count by status code
3. Scrape with Prometheus or query directly for the dashboard

### DORA Metrics — GitHub Actions API

CI/CD runs on **GitHub Actions**:

1. Deploy frequency: `GET /repos/{owner}/{repo}/actions/runs?status=success&per_page=100`
   - Count successful workflow runs per day
2. Lead time: Time from first commit in a PR to production deploy
3. Change failure rate: Ratio of rollback/hotfix deploys to total deploys
4. Time to restore: Time from incident open to resolved (track via GitHub Issues with `incident` label)

### Database Health — SQLite

SQLite health monitoring is simpler than traditional databases:

1. **File size:** Monitor the `.sqlite` file size on disk (`fs.statSync`)
2. **WAL status:** Check WAL file size — large WAL may indicate checkpoint issues
3. **Integrity check:** Run `PRAGMA integrity_check` periodically
4. **Connection pool:** Monitor active connections via Fastify's SQLite plugin

### Infrastructure Mapping

| Dashboard Component | Real Source |
|---|---|
| API (Node.js / Fastify) | Process health via `process.memoryUsage()` + custom `/health` endpoint |
| Banco (SQLite3) | File stats + PRAGMA checks |
| Auth (JWT local) | Token validation success rate from Fastify middleware |
| CDN (Static Assets) | CDN provider dashboard or API (e.g., Cloudflare, Vercel) |
| GitHub Actions CI/CD | GitHub Actions API — workflow run stats |

## Automating Data Refresh

To automate data updates:

1. Create a Node.js script that queries all sources and writes `assets/data.js`
2. Run it as a cron job or GitHub Actions scheduled workflow
3. Example structure:

```javascript
// scripts/update-dashboard-data.mjs
import { writeFileSync } from 'fs';
import { fetchPostHogMetrics } from './sources/posthog.mjs';
import { fetchSentryErrors } from './sources/sentry.mjs';
import { fetchGitHubDORA } from './sources/github.mjs';

async function main() {
  const product = await fetchPostHogMetrics();
  const errors = await fetchSentryErrors();
  const dora = await fetchGitHubDORA();

  const data = {
    meta: { product: "ECP Banco Digital", generated: new Date().toISOString() },
    product,
    sre: { top_errors: errors, dora },
    // ... other sections
  };

  writeFileSync(
    'docs/dashboard/assets/data.js',
    `const DASHBOARD_DATA = ${JSON.stringify(data, null, 2)};`
  );
}

main();
```

## Design System

The dashboard follows ECP Banco Digital's design tokens:

- **Background:** `#0b0f14`
- **Surface:** `#131c28` / `#0f1620`
- **Accent:** `#b7ff2a` (lime)
- **Border:** `#1c2836`
- **Font:** Inter (loaded from Google Fonts CDN)

## Browser Compatibility

Tested on:
- Chrome 120+
- Edge 120+
- Firefox 121+
- Safari 17+

## Tech Stack Reference

This dashboard is built for the ECP Banco Digital stack:
- **Runtime:** Node.js with Fastify
- **Database:** SQLite3 (WAL mode)
- **Auth:** JWT (local, RS256)
- **CI/CD:** GitHub Actions
- **Frontend:** Vanilla JS (this dashboard) / React (main app)
