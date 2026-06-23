/* ============================================================
   ECP Pay — Dashboard Simulated Data
   Generated: 2026-03-04
   ============================================================ */

const DASHBOARD_DATA = {

  // ---------- META ----------
  meta: {
    product: "ECP Pay",
    generated: "2026-03-04T12:00:00Z",
    period: "Last 30 days",
    north_star: "WAU-EFI",
    north_star_label: "Weekly Active Users — Effectively Financially Involved"
  },

  // ---------- PRODUCT METRICS ----------
  product: {
    mau: 12840,
    dau: 3210,
    stickiness: 25.0,
    activation_rate: 28.0,
    retention_d1: 68,
    retention_d7: 54,
    retention_d30: 42,
    avg_session_duration: 4.8,
    sessions_per_user: 3.2,
    north_star_value: 8240,
    north_star_target: 15000,
    weekly_transacting_pct: 48,
    weekly_transacting_target: 60,
    nps: 52,
    nps_target: 60
  },

  // ---------- TIME SERIES ----------
  timeseries: {
    labels_weekly: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    north_star: [4200, 4850, 5600, 6100, 6780, 7200, 7800, 8240],
    dau: [1900, 2100, 2350, 2500, 2720, 2890, 3050, 3210],
    mau: [7200, 8100, 8900, 9600, 10400, 11100, 12000, 12840],
    sessions_per_user: [2.1, 2.3, 2.5, 2.6, 2.8, 2.9, 3.1, 3.2],
    activation: [18, 20, 22, 23, 24, 25, 27, 28],
    retention_d30: [28, 30, 32, 34, 36, 38, 40, 42],
    nps: [38, 40, 42, 44, 46, 48, 50, 52],
    weekly_transacting: [30, 33, 36, 38, 40, 43, 46, 48],
    error_rate: [0.25, 0.22, 0.20, 0.18, 0.16, 0.14, 0.13, 0.12],
    latency_p95: [450, 420, 400, 380, 360, 340, 325, 312]
  },

  // ---------- FEATURE ADOPTION ----------
  features: [
    { name: "Dashboard",       adoption: 98 },
    { name: "Transactions",    adoption: 82 },
    { name: "Pix Payment",     adoption: 71 },
    { name: "Card Payment",    adoption: 54 },
    { name: "Webhooks",        adoption: 38 },
    { name: "Providers",       adoption: 31 },
    { name: "Audit Log",       adoption: 24 }
  ],

  // ---------- FUNNELS ----------
  funnels: [
    {
      name: "Pix Payment Flow",
      steps: [
        { label: "API call received",      users: 5200, pct: 100 },
        { label: "API key validated",      users: 5096, pct: 98 },
        { label: "Idempotency checked",    users: 5070, pct: 97.5 },
        { label: "Payment created",        users: 4940, pct: 95 },
        { label: "Pix confirmed",          users: 4693, pct: 90.2 }
      ]
    },
    {
      name: "Provider Switch Flow",
      steps: [
        { label: "Opens Providers page",   users: 420, pct: 100 },
        { label: "Clicks switch button",   users: 315, pct: 75 },
        { label: "Confirms modal",         users: 298, pct: 71 },
        { label: "Switch logged",          users: 298, pct: 71 },
        { label: "Banner updated",         users: 298, pct: 71 }
      ]
    }
  ],

  // ---------- OKRs ----------
  okrs: {
    objective: "Make payments invisible to the ECP ecosystem — any app processes any payment method with a single call",
    cycle: "Q2-Q3 2026",
    krs: [
      {
        id: "KR-01",
        description: "Integration time < 4 hours by Q2 2026",
        metric: "Integration Time",
        current: 3.5,
        target: 4,
        unit: "h",
        progress: 85,
        status: "on-track",
        trend: [24, 20, 16, 12, 8, 6, 4, 3.5]
      },
      {
        id: "KR-02",
        description: "100% ecosystem transactions centralized",
        metric: "Centralization Rate",
        current: 60,
        target: 100,
        unit: "%",
        progress: 60,
        status: "at-risk",
        trend: [0, 10, 20, 30, 40, 50, 55, 60]
      },
      {
        id: "KR-03",
        description: "Zero lines changed on provider swap",
        metric: "Lines Changed",
        current: 0,
        target: 0,
        unit: "lines",
        progress: 100,
        status: "on-track",
        trend: [0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        id: "KR-04",
        description: "100% test scenarios run offline",
        metric: "Offline Test Rate",
        current: 100,
        target: 100,
        unit: "%",
        progress: 100,
        status: "on-track",
        trend: [0, 20, 40, 60, 80, 90, 100, 100]
      },
      {
        id: "KR-05",
        description: "99.9% uptime, >99% webhook delivery",
        metric: "Availability",
        current: 99.8,
        target: 99.9,
        unit: "%",
        progress: 70,
        status: "at-risk",
        trend: [95, 96, 97, 98, 98.5, 99, 99.5, 99.8]
      }
    ]
  },

  // ---------- SRE / SLOs ----------
  sre: {
    slos: [
      {
        name: "API Availability",
        current: 99.80,
        target: 99.90,
        unit: "%",
        budget_remaining: 72,
        status: "healthy"
      },
      {
        name: "Webhook 1st Attempt Delivery",
        current: 99.4,
        target: 99.0,
        unit: "%",
        budget_remaining: 88,
        status: "healthy"
      },
      {
        name: "API Latency p95",
        current: 187,
        target: 300,
        unit: "ms",
        budget_remaining: 91,
        status: "healthy"
      }
    ],
    dora: {
      deploy_frequency:     { value: "on-demand", unit: "",     level: "elite" },
      lead_time:            { value: "minutes",   unit: "",     level: "elite" },
      change_failure_rate:  { value: 0,           unit: "%",    level: "elite" },
      time_to_restore:      { value: "seconds",   unit: "",     level: "elite" }
    },
    top_errors: [
      { count: 89,  message: "SQLITE_BUSY: database is locked",              source: "payment-service" },
      { count: 54,  message: "JWT token expired",                             source: "admin-auth-middleware" },
      { count: 41,  message: "ValidationError: amount must be positive",      source: "pix-handler" },
      { count: 29,  message: "ECONNREFUSED 127.0.0.1:3335",                  source: "asaas-adapter" },
      { count: 18,  message: "SQLITE_CONSTRAINT: UNIQUE constraint failed",   source: "idempotency-check" },
      { count: 12,  message: "Webhook delivery failed after 3 attempts",      source: "webhook-retry-service" }
    ],
    infrastructure: [
      { name: "API (Node.js / Fastify)",   status: "healthy",  detail: "v5.0 — port 3335" },
      { name: "Database (SQLite3)",        status: "healthy",  detail: "WAL mode — database-pay.sqlite" },
      { name: "Admin Panel (React/Vite)",  status: "healthy",  detail: "port 5176" },
      { name: "Internal Provider",         status: "healthy",  detail: "active — simulation mode" },
      { name: "Asaas Adapter",             status: "standby",  detail: "available — not active" }
    ]
  }
};
