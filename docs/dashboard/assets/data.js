/* ============================================================
   ECP Banco Digital — Dashboard Simulated Data
   Generated: 2026-03-04
   ============================================================ */

const DASHBOARD_DATA = {

  // ---------- META ----------
  meta: {
    product: "ECP Banco Digital",
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
    labels_weekly: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
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
    { name: "Dashboard",    adoption: 98 },
    { name: "Extrato",      adoption: 82 },
    { name: "Pix Enviar",   adoption: 71 },
    { name: "Cartoes",      adoption: 54 },
    { name: "Pix Chaves",   adoption: 38 },
    { name: "Pagamentos",   adoption: 31 },
    { name: "Perfil",       adoption: 24 }
  ],

  // ---------- FUNNELS ----------
  funnels: [
    {
      name: "Envio de Pix",
      steps: [
        { label: "Abre tela Pix",        users: 5200, pct: 100 },
        { label: "Seleciona contato",     users: 4420, pct: 85 },
        { label: "Digita valor",          users: 3900, pct: 75 },
        { label: "Confirma dados",        users: 3640, pct: 70 },
        { label: "Pix enviado",           users: 3380, pct: 65 }
      ]
    },
    {
      name: "Ativacao (Onboarding)",
      steps: [
        { label: "Cria conta",            users: 8400, pct: 100 },
        { label: "Verifica e-mail",       users: 7140, pct: 85 },
        { label: "Completa perfil",       users: 5880, pct: 70 },
        { label: "Primeiro deposito",     users: 4200, pct: 50 },
        { label: "Primeira transacao",    users: 2352, pct: 28 }
      ]
    }
  ],

  // ---------- OKRs ----------
  okrs: {
    objective: "Conquistar os primeiros usuarios que adotam o ECP como seu banco digital principal no computador",
    cycle: "Q2 2026",
    krs: [
      {
        id: "KR-01",
        description: "15.000 WAU-EFI ate Q2 2026",
        metric: "WAU-EFI",
        current: 8240,
        target: 15000,
        unit: "",
        progress: 55,
        status: "at-risk",
        trend: [4200, 4850, 5600, 6100, 6780, 7200, 7800, 8240]
      },
      {
        id: "KR-02",
        description: "Taxa de ativacao 40%",
        metric: "Activation Rate",
        current: 28,
        target: 40,
        unit: "%",
        progress: 70,
        status: "at-risk",
        trend: [18, 20, 22, 23, 24, 25, 27, 28]
      },
      {
        id: "KR-03",
        description: "Retencao D30 de 55%",
        metric: "Retention D30",
        current: 42,
        target: 55,
        unit: "%",
        progress: 76,
        status: "on-track",
        trend: [28, 30, 32, 34, 36, 38, 40, 42]
      },
      {
        id: "KR-04",
        description: "NPS 60+",
        metric: "NPS",
        current: 52,
        target: 60,
        unit: "",
        progress: 87,
        status: "on-track",
        trend: [38, 40, 42, 44, 46, 48, 50, 52]
      },
      {
        id: "KR-05",
        description: "60% com transacao semanal",
        metric: "Weekly Transacting",
        current: 48,
        target: 60,
        unit: "%",
        progress: 80,
        status: "on-track",
        trend: [30, 33, 36, 38, 40, 43, 46, 48]
      }
    ]
  },

  // ---------- SRE / SLOs ----------
  sre: {
    slos: [
      {
        name: "API Availability",
        current: 99.80,
        target: 99.50,
        unit: "%",
        budget_remaining: 72,
        status: "healthy"
      },
      {
        name: "Latency p95",
        current: 312,
        target: 500,
        unit: "ms",
        budget_remaining: 88,
        status: "healthy"
      },
      {
        name: "Error Rate",
        current: 0.12,
        target: 0.50,
        unit: "%",
        budget_remaining: 91,
        status: "healthy"
      },
      {
        name: "Auth Availability",
        current: 99.97,
        target: 99.90,
        unit: "%",
        budget_remaining: 85,
        status: "healthy"
      },
      {
        name: "LCP (Largest Contentful Paint)",
        current: 1.8,
        target: 2.5,
        unit: "s",
        budget_remaining: 64,
        status: "healthy"
      },
      {
        name: "CI Build Success Rate",
        current: 97.0,
        target: 95.0,
        unit: "%",
        budget_remaining: 78,
        status: "healthy"
      }
    ],
    dora: {
      deploy_frequency:     { value: 4.2, unit: "/day",  level: "elite" },
      lead_time:            { value: 38,  unit: "min",   level: "elite" },
      change_failure_rate:  { value: 3.2, unit: "%",     level: "elite" },
      time_to_restore:      { value: 24,  unit: "min",   level: "elite" }
    },
    top_errors: [
      { count: 142, message: "SQLITE_BUSY: database is locked",              source: "fastify-sqlite-plugin" },
      { count: 87,  message: "JWT token expired",                             source: "auth-middleware" },
      { count: 63,  message: "ECONNREFUSED 127.0.0.1:3001",                  source: "fastify-http-proxy" },
      { count: 41,  message: "ValidationError: amount must be positive",      source: "pix-transfer-handler" },
      { count: 29,  message: "TypeError: Cannot read properties of null",     source: "account-balance-service" },
      { count: 18,  message: "SQLITE_CONSTRAINT: UNIQUE constraint failed",   source: "user-registration-route" }
    ],
    infrastructure: [
      { name: "API (Node.js / Fastify)",   status: "healthy",  detail: "v4.28.1 — 3 instances" },
      { name: "Banco (SQLite3)",           status: "healthy",  detail: "WAL mode — 248 MB" },
      { name: "Auth (JWT local)",          status: "healthy",  detail: "RS256 — 2048-bit keys" },
      { name: "CDN (Static Assets)",       status: "healthy",  detail: "Cache HIT ratio 94%" },
      { name: "GitHub Actions CI/CD",      status: "healthy",  detail: "4.2 deploys/day avg" }
    ]
  }
};
