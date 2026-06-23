# GMUD-FOODFLOW-001 — Initial Deploy of FoodFlow MVP

## General Information

| Field | Value |
|-------|-------|
| **ID** | GMUD-FOODFLOW-001 |
| **Title** | Initial Deploy — FoodFlow Marketplace MVP in Production |
| **Type** | Normal |
| **Priority** | High |
| **Requester** | ECP AI Squad — Operations Agent |
| **Date** | 2026-03-17 |
| **Overall Risk** | Low-Medium (10/30) |
| **Required Approval** | Tech Lead / Software Architect |

## Description

First production deploy of FoodFlow, a premium food delivery marketplace. Includes Node.js/Fastify backend with REST API, React SPA frontend, SQLite database, integration with ecp-digital-bank for payments (ECP Card and PIX QR Code via SSE), and infrastructure setup (PM2 + Nginx + SSL).

### Scope

- Linux VPS provisioning (Ubuntu 22.04+)
- Installation of Node.js 20 LTS, PM2, Nginx, Certbot
- FoodFlow application deploy (backend + frontend)
- SQLite database setup with seed data (6 restaurants, 24 items, 3 users)
- Nginx configuration as reverse proxy with SSL (Let's Encrypt)
- Webhook registration in ecp-digital-bank
- DNS configuration: food.ecportilho.com -> VPS IP

### Out of Scope

- Migration of data from legacy systems
- CDN configuration (future)
- APM monitoring (future — Datadog, New Relic)
- Automated database backup (manual for MVP)

## Risk Analysis

| Dimension | Level | Score | Justification |
|-----------|-------|-------|---------------|
| Business Impact | Low | 1 | First deploy — no production users affected |
| Technical Complexity | Medium | 3 | Simple stack, but integration with ecp-digital-bank via webhook/SSE adds complexity |
| Reversibility | Low | 1 | Dedicated VPS, simple rollback: revert code + restart PM2 |
| External Dependencies | Medium | 3 | Depends on ecp-digital-bank accessible and DNS propagated |
| Impact Window | Low | 1 | Deploy estimated at 30-45 minutes, no downtime for existing users |
| Team Experience | Low | 1 | Same deploy pattern as ecp-digital-banking (already validated) |

**Overall Risk: 10/30 — Low-Medium**

## Rollback Plan

**Trigger:** Health check fails after deploy OR critical payment error in the first 2 hours.

| Step | Action | Command |
|------|--------|---------|
| 1 | Revert code | `cd /opt/foodflow && git checkout HEAD~1` |
| 2 | Reinstall dependencies | `npm ci --production=false` |
| 3 | Rebuild frontend | `npm run build` |
| 4 | Restart application | `pm2 reload ecosystem.config.cjs` |
| 5 | Verify health | `curl -sf http://127.0.0.1:3000/api/categories` |

**Estimated rollback time:** 5 minutes

**Data rollback:** SQLite database can be deleted and recreated with `npm run seed` (seed data only on first deploy).

## Change Window

| Field | Value |
|-------|-------|
| **Preferred** | Saturday 10:00-12:00 BRT |
| **Backup** | Sunday 10:00-12:00 BRT |
| **Blackout** | Friday 18:00 — Saturday 08:00 (delivery peak) |
| **Estimated duration** | 45 minutes |
| **Post-deploy monitoring** | 2 hours |

## Success Criteria

| Criterion | Validation |
|-----------|------------|
| Application responding with SSL | `curl -sf https://food.ecportilho.com/` returns SPA HTML |
| API functional | `GET /api/categories` returns 200 with category list |
| Authentication functional | `POST /api/auth/login` with seed credentials returns valid JWT |
| Bank integration accessible | `POST /api/payments/bank-auth` with valid credentials returns token |
| Webhook registered | ecp-digital-bank accepts and confirms webhook registration |
| PM2 stable for 30 minutes | `pm2 status` shows 0 restarts after 30 minutes |

## Approvers

| Role | Status | Date |
|------|--------|------|
| Tech Lead / Software Architect | Pending | — |
| Product Manager | Pending | — |
