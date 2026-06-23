# GMUD-001 — Initial Release of ECP Digital Bank v3.0

---

## 1. Identification

| Field | Value |
|-------|-------|
| **Number** | GMUD-001 |
| **Title** | Initial Release — ECP Digital Bank v3.0 (MVP) |
| **Type** | Normal |
| **Status** | Approved |
| **Priority** | High |
| **Requester** | Product Manager Agent |
| **Technical Owner** | Operations Agent |
| **Change Manager** | Change Manager Subagent |
| **Creation date** | 2026-03-04 09:00 |
| **Planned execution date** | 2026-03-05 10:00 |
| **Estimated duration** | 45 minutes |
| **Maintenance window** | 10:00 to 11:00 (BRT) |

---

## 2. Change Description

### 2.1 What will change?
First production deploy of ECP Digital Bank v3.0 — full application with:
- **Fastify API** (9 modules, 27 endpoints) running on Node.js
- **React SPA** (10 pages, 9 components) served as a static build
- **SQLite3** as the database (single file `database.sqlite`)
- JWT + bcryptjs authentication
- Seed with demo data

### 2.2 Why will it change? (Motivation)
- ECP Digital Bank MVP approved across all product phases (HITLs #1–#10)
- Goal: validate product-market fit with first users
- Main OKR: Achieve 15,000 WAU-EFI by Q2 2026
- All 10 business rules implemented and tested (29 test cases, 10/10 quality gates)

### 2.3 Change scope

| Component | Changed? | Description |
|-----------|----------|-------------|
| Front End Web (React + Vite) | Yes | Full SPA with 10 pages, dark theme + lime accent |
| API (Fastify 5.0) | Yes | 9 REST modules with JWT authentication |
| Database (SQLite3) | Yes | Schema with 9 tables, 12 indexes, dev seed |
| Environment variables | Yes | JWT_SECRET, DATABASE_PATH, PORT, VITE_API_URL |
| Dependencies (npm) | Yes | All deps listed in server/package.json and web/package.json |
| GitHub Actions (CI/CD) | Yes | ci.yml pipeline with lint, tests, build, GMUD gate, deploy |

### 2.4 Related artifacts
- Pull Request: PR #1 (initial release)
- Epics: EPIC-01 (Secure Entry), EPIC-02 (Daily Operations), EPIC-03 (Smart Management)
- Stories: 25 user stories covering 14 features
- HITL Approvals: #1 to #10 (all approved)

---

## 3. Impact Analysis

### 3.1 Affected users
| Segment | Impact | Type |
|---------|--------|------|
| None (first deploy) | No impact — no production users exist | New system |
| Invited early adopters | Initial access to the system | New behavior |

### 3.2 Affected systems and integrations
| System | Impact type | Mitigation |
|--------|-------------|------------|
| Production server (Node.js) | New deploy, initial configuration | Validate prerequisites before deploy |
| Static hosting (web) | First build upload | Test access after deploy |
| DNS/domain | A/CNAME record configuration | Verify DNS propagation |

### 3.3 SLO impact
| SLO | Expected impact | Within error budget? |
|-----|----------------|----------------------|
| API Availability (≥ 99.5%) | First deploy — no baseline | N/A (first cycle) |
| p95 Latency (< 500ms) | SQLite local — expected latency < 100ms | Yes |
| Error Rate (< 0.5%) | Zero errors expected on clean deploy | Yes |

---

## 4. Risk Analysis

| # | Risk | Probability | Impact | Severity | Mitigation |
|---|------|-------------|--------|----------|------------|
| R01 | node-gyp fails to compile better-sqlite3 on production server | Medium | High | 🟡 | Ensure Python 3 + Build Tools installed on server |
| R02 | Environment variables not configured correctly | Low | Medium | 🟢 | Variables checklist + .env.example as reference |
| R03 | Port 3333 occupied by another process on server | Low | Low | 🟢 | Check ports before deploy, configure PORT via env |
| R04 | SQLite database.sqlite with incorrect permissions | Low | Medium | 🟢 | Verify write permissions in server directory |
| R05 | CORS blocking frontend requests to API | Medium | Medium | 🟡 | Configure CORS with correct frontend origin |

**Overall risk level:** 🟢 Low (first deploy, no existing users, no data migration)

---

## 5. Execution Plan

### 5.1 Prerequisites
- [x] All HITLs approved (#1 to #10)
- [x] CI pipeline passing (lint + typecheck + tests + build)
- [x] GMUD-001 created and evaluated
- [ ] Production server provisioned (Node.js 20+, Python 3, Build Tools)
- [ ] Domain configured (DNS pointing to server)
- [ ] Environment variables configured on server
- [ ] Static hosting configured for frontend

### 5.2 Execution steps

| # | Step | Owner | Duration | Verification |
|---|------|-------|----------|--------------|
| 1 | Check server prerequisites (Node.js, Python, Build Tools) | Operations | 3 min | `node -v && python3 --version` |
| 2 | Clone repository on production server | Operations | 2 min | `git clone` successful |
| 3 | Install dependencies: `npm ci` (root, server, web) | Operations | 5 min | No errors, better-sqlite3 compiled |
| 4 | Configure environment variables (`.env`) | Operations | 3 min | Strong JWT_SECRET, correct DATABASE_PATH |
| 5 | Run migrations: `npm run db:migrate` | Operations | 1 min | Tables created without error |
| 6 | Run seed (optional for demo): `npm run db:seed` | Operations | 1 min | Test data inserted |
| 7 | Frontend build: `cd web && npx vite build` | Operations | 2 min | `dist/` generated without errors |
| 8 | Start API server: `cd server && node --import tsx src/server.ts` | Operations | 1 min | "Server running on port 3333" |
| 9 | Configure process manager (PM2): `pm2 start ecosystem.config.js` | Operations | 3 min | API responding with PM2 |
| 10 | Upload static build to hosting | Operations | 3 min | Frontend accessible via URL |
| 11 | Verify CORS and frontend → API connectivity | Operations | 2 min | Login functional in browser |
| 12 | Smoke test: login, dashboard, send Pix, statement | QA | 10 min | All critical flows OK |
| 13 | Monitor logs for 15 minutes | Operations | 15 min | Zero critical errors |

### 5.3 Success criteria
- [ ] API responding at `/api/auth/login` with status 200
- [ ] Frontend loading without console errors
- [ ] Login with seed user (marina@email.com) functional
- [ ] Dashboard displaying balance and transactions
- [ ] Pix send/receive functional
- [ ] Zero critical errors in logs during first 15 min

---

## 6. Rollback Plan

### 6.1 Rollback triggers
- API does not start after deploy
- Error rate > 5% in the first 15 minutes
- SQLite database corrupted
- Any data loss detected

### 6.2 Rollback steps

**API (Node.js) — estimated time: 2 minutes**
1. Stop process via PM2: `pm2 stop ecp-api`
2. As this is the first deploy, there is no previous version to restore
3. If necessary: fix the issue and re-deploy

**Frontend (static build) — estimated time: 1 minute**
1. Remove/replace files in `dist/`
2. Replace with maintenance page

**Database — estimated time: 1 minute**
1. SQLite is a single file — back it up before deploy
2. `cp database.sqlite database.sqlite.bak` (pre-deploy)
3. Restore: `cp database.sqlite.bak database.sqlite`

---

## 7. Communication

### 7.1 Pre-change notifications
| Audience | Channel | Lead time | Content |
|----------|---------|-----------|---------|
| Technical team | Slack #deployments | 30 min | "Deploy GMUD-001 starting in 30 min — first ECP v3.0 release" |
| Stakeholders | Email | 24 hours | "ECP Digital Bank v3.0 will be available tomorrow at 10am" |

---

## 8. History and Approval

| Event | Date/Time | Owner | Note |
|-------|-----------|-------|------|
| GMUD created | 2026-03-04 09:00 | Operations Agent | — |
| Risk analysis completed | 2026-03-04 09:10 | Change Manager Subagent | Overall risk: Low |
| Submitted for approval | 2026-03-04 09:15 | Operations Agent | — |
| **APPROVED** | 2026-03-04 09:20 | **Change Manager Subagent** | First deploy, low risk, no affected users |

### Change Manager Assessment
```
ASSESSMENT: APPROVED

Rationale:
- First production deploy — inherently low risk (no existing users, no migration)
- Overall risk level: LOW (score 6/30)
- All 10 business rules tested and approved
- CI pipeline with mandatory quality gate
- Simple rollback plan (SQLite file backup)
- Adequate maintenance window (Tuesday, business hours)

Conditions:
1. Backup database.sqlite BEFORE any operation
2. Mandatory smoke test after deploy (all critical flows)
3. Monitor logs for at least 15 minutes post-deploy
```

---

## 9. Lessons Learned (post-execution)
> *Fill in after the change has been executed.*
