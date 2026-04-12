/* ============================================================
   ECP Banco Digital — Dashboard Charts & Rendering
   Requires: Chart.js 4.x + data.js loaded before this file
   ============================================================ */

// ---------- Chart.js Global Defaults ----------
Chart.defaults.color = "#8899aa";
Chart.defaults.borderColor = "#1c2836";
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// Color constants
const ACCENT     = "#b7ff2a";
const ACCENT_DIM = "rgba(183,255,42,0.15)";
const SUCCESS    = "#22c55e";
const WARNING    = "#f59e0b";
const DANGER     = "#ef4444";
const INFO       = "#3b82f6";
const SURFACE    = "#131c28";
const SURFACE2   = "#0f1620";
const BORDER     = "#1c2836";
const TEXT_PRI   = "#e8ecf1";
const TEXT_SEC   = "#8899aa";
const TEXT_MUT   = "#556677";

// Track chart instances for cleanup
const chartInstances = {};

// ============================================================
// NAVIGATION
// ============================================================
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  // Deactivate all nav items
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  // Show target section
  const section = document.getElementById("section-" + sectionId);
  if (section) section.classList.add("active");

  // Activate nav item
  const nav = document.getElementById("nav-" + sectionId);
  if (nav) nav.classList.add("active");

  // Update topbar title
  const titles = {
    overview: "Overview",
    product: "Product Usage",
    outcomes: "Outcomes & KRs",
    sre: "SRE & Technical"
  };
  document.getElementById("topbar-title").textContent = titles[sectionId] || sectionId;

  // Render section
  switch (sectionId) {
    case "overview":  renderOverview(); break;
    case "product":   renderProduct(); break;
    case "outcomes":  renderOutcomes(); break;
    case "sre":       renderSRE(); break;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("open");
  sidebar.classList.toggle("collapsed");
}

// ============================================================
// HELPERS
// ============================================================
function setKPI(containerId, cards) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = cards.map(c => {
    const changeClass = c.change > 0 ? "up" : c.change < 0 ? "down" : "neutral";
    const changeArrow = c.change > 0 ? "&#9650;" : c.change < 0 ? "&#9660;" : "&#8212;";
    const changeText = c.change !== undefined && c.change !== null
      ? `<div class="kpi-change ${changeClass}">${changeArrow} ${Math.abs(c.change)}${c.changeSuffix || "%"} vs prev period</div>`
      : "";
    const valueClass = c.accent ? "kpi-value accent" : "kpi-value";
    const subtitle = c.subtitle ? `<div class="kpi-subtitle">${c.subtitle}</div>` : "";
    return `
      <div class="kpi-card">
        <div class="kpi-label">${c.label}</div>
        <div class="${valueClass}">${c.value}</div>
        ${changeText}
        ${subtitle}
      </div>`;
  }).join("");
}

function chartOptions(title, yTickCb, yMin, yMax) {
  return {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: SURFACE,
        borderColor: BORDER,
        borderWidth: 1,
        titleColor: TEXT_PRI,
        bodyColor: TEXT_SEC,
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(28,40,54,0.5)", drawBorder: false },
        ticks: { color: TEXT_MUT }
      },
      y: {
        grid: { color: "rgba(28,40,54,0.5)", drawBorder: false },
        ticks: {
          color: TEXT_MUT,
          callback: yTickCb || function(v) { return v; }
        },
        min: yMin,
        max: yMax
      }
    }
  };
}

function createChart(canvasId, config) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

function setBar(containerId, items, barColor) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(item => `
    <div class="feature-row">
      <span class="feature-name">${item.name}</span>
      <div class="feature-bar-bg">
        <div class="feature-bar-fill" style="width:${item.value}%; background:${barColor || "linear-gradient(90deg, #b7ff2a, rgba(183,255,42,0.6))"}"></div>
      </div>
      <span class="feature-value">${item.value}%</span>
    </div>
  `).join("");
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

// ============================================================
// RENDER: OVERVIEW
// ============================================================
function renderOverview() {
  const d = DASHBOARD_DATA;
  const p = d.product;

  setKPI("overview-kpis", [
    { label: "North Star: WAU-EFI", value: formatNumber(p.north_star_value), accent: true, change: 5.6, subtitle: `Target: ${formatNumber(p.north_star_target)}` },
    { label: "Activation Rate", value: p.activation_rate + "%", change: 3.7, subtitle: "Target: 40%" },
    { label: "Retention D30", value: p.retention_d30 + "%", change: 5.0, subtitle: "Target: 55%" },
    { label: "NPS", value: p.nps, change: 4.0, changeSuffix: "pts", subtitle: "Target: 60+" },
    { label: "Weekly Transacting", value: p.weekly_transacting_pct + "%", change: 4.3, subtitle: "Target: 60%" },
    { label: "MAU", value: formatNumber(p.mau), change: 7.0 }
  ]);

  // North Star chart
  createChart("chart-north-star", {
    type: "line",
    data: {
      labels: d.timeseries.labels_weekly,
      datasets: [{
        label: "WAU-EFI",
        data: d.timeseries.north_star,
        borderColor: ACCENT,
        backgroundColor: ACCENT_DIM,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: ACCENT,
        pointBorderColor: ACCENT,
        borderWidth: 2.5
      }, {
        label: "Target",
        data: d.timeseries.labels_weekly.map(() => 15000),
        borderColor: TEXT_MUT,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      ...chartOptions("WAU-EFI", v => formatNumber(v)),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } }
      }
    }
  });

  // Activation & Retention chart
  createChart("chart-activation-retention", {
    type: "bar",
    data: {
      labels: d.timeseries.labels_weekly,
      datasets: [{
        label: "Activation %",
        data: d.timeseries.activation,
        backgroundColor: ACCENT,
        borderRadius: 4,
        barPercentage: 0.5
      }, {
        label: "Retention D30 %",
        data: d.timeseries.retention_d30,
        backgroundColor: INFO,
        borderRadius: 4,
        barPercentage: 0.5
      }]
    },
    options: {
      ...chartOptions("Rates", v => v + "%", 0, 60),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } }
      }
    }
  });

  // NPS chart
  createChart("chart-nps", {
    type: "line",
    data: {
      labels: d.timeseries.labels_weekly,
      datasets: [{
        label: "NPS",
        data: d.timeseries.nps,
        borderColor: SUCCESS,
        backgroundColor: "rgba(34,197,94,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: SUCCESS,
        borderWidth: 2
      }, {
        label: "Target",
        data: d.timeseries.labels_weekly.map(() => 60),
        borderColor: TEXT_MUT,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      ...chartOptions("NPS", null, 0, 80),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } }
      }
    }
  });

  // Weekly Transacting chart
  createChart("chart-weekly-transacting", {
    type: "line",
    data: {
      labels: d.timeseries.labels_weekly,
      datasets: [{
        label: "Weekly Transacting %",
        data: d.timeseries.weekly_transacting,
        borderColor: WARNING,
        backgroundColor: "rgba(245,158,11,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: WARNING,
        borderWidth: 2
      }, {
        label: "Target",
        data: d.timeseries.labels_weekly.map(() => 60),
        borderColor: TEXT_MUT,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      ...chartOptions("Weekly Transacting", v => v + "%", 0, 70),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } }
      }
    }
  });
}

// ============================================================
// RENDER: PRODUCT USAGE
// ============================================================
function renderProduct() {
  const d = DASHBOARD_DATA;
  const p = d.product;

  setKPI("product-kpis", [
    { label: "MAU", value: formatNumber(p.mau), change: 7.0 },
    { label: "DAU", value: formatNumber(p.dau), change: 5.2 },
    { label: "Stickiness (DAU/MAU)", value: p.stickiness + "%", change: 1.2 },
    { label: "Avg Session Duration", value: p.avg_session_duration + " min", change: 0.4, changeSuffix: " min" },
    { label: "Sessions / User", value: p.sessions_per_user, change: 0.3, changeSuffix: "" },
    { label: "Retention D1 / D7 / D30", value: `${p.retention_d1}% / ${p.retention_d7}% / ${p.retention_d30}%`, change: null }
  ]);

  // DAU/MAU chart
  createChart("chart-dau-mau", {
    type: "line",
    data: {
      labels: d.timeseries.labels_weekly,
      datasets: [{
        label: "DAU",
        data: d.timeseries.dau,
        borderColor: ACCENT,
        backgroundColor: ACCENT_DIM,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: ACCENT,
        borderWidth: 2
      }, {
        label: "MAU",
        data: d.timeseries.mau,
        borderColor: INFO,
        backgroundColor: "rgba(59,130,246,0.08)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: INFO,
        borderWidth: 2,
        yAxisID: "y1"
      }]
    },
    options: {
      plugins: {
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } },
        tooltip: { backgroundColor: SURFACE, borderColor: BORDER, borderWidth: 1, titleColor: TEXT_PRI, bodyColor: TEXT_SEC }
      },
      scales: {
        x: { grid: { color: "rgba(28,40,54,0.5)", drawBorder: false }, ticks: { color: TEXT_MUT } },
        y: {
          position: "left",
          grid: { color: "rgba(28,40,54,0.5)", drawBorder: false },
          ticks: { color: TEXT_MUT, callback: v => formatNumber(v) },
          title: { display: true, text: "DAU", color: TEXT_MUT }
        },
        y1: {
          position: "right",
          grid: { display: false },
          ticks: { color: TEXT_MUT, callback: v => formatNumber(v) },
          title: { display: true, text: "MAU", color: TEXT_MUT }
        }
      }
    }
  });

  // Sessions chart
  createChart("chart-sessions", {
    type: "line",
    data: {
      labels: d.timeseries.labels_weekly,
      datasets: [{
        label: "Sessions / User",
        data: d.timeseries.sessions_per_user,
        borderColor: SUCCESS,
        backgroundColor: "rgba(34,197,94,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: SUCCESS,
        borderWidth: 2
      }]
    },
    options: chartOptions("Sessions", null, 0, 5)
  });

  // Feature adoption
  setBar("feature-adoption-list", d.features.map(f => ({ name: f.name, value: f.adoption })));

  // Funnels
  renderFunnels();
}

function renderFunnels() {
  const container = document.getElementById("funnel-grid");
  if (!container) return;

  const funnelColors = [ACCENT, SUCCESS, INFO, WARNING, DANGER];

  container.innerHTML = DASHBOARD_DATA.funnels.map(funnel => {
    const stepsHtml = funnel.steps.map((step, i) => {
      const drop = i > 0
        ? `<span class="funnel-step-drop">-${(funnel.steps[i-1].pct - step.pct)}%</span>`
        : `<span class="funnel-step-drop"></span>`;
      const barColor = funnelColors[i % funnelColors.length];
      return `
        <div class="funnel-step">
          <span class="funnel-step-label">${step.label}</span>
          <div class="funnel-step-bar-bg">
            <div class="funnel-step-bar-fill" style="width:${step.pct}%; background:${barColor}"></div>
          </div>
          <span class="funnel-step-value">${step.pct}%</span>
          ${drop}
        </div>`;
    }).join("");

    return `
      <div class="funnel-card">
        <h3>${funnel.name}</h3>
        <div class="funnel-steps">${stepsHtml}</div>
      </div>`;
  }).join("");
}

// ============================================================
// RENDER: OUTCOMES & KRS
// ============================================================
function renderOutcomes() {
  const okrs = DASHBOARD_DATA.okrs;

  // Objective text
  document.getElementById("okr-objective-text").textContent = okrs.objective;

  // KR cards
  const krContainer = document.getElementById("kr-list");
  krContainer.innerHTML = okrs.krs.map(kr => {
    const progressColor = kr.status === "on-track" ? SUCCESS : kr.status === "at-risk" ? WARNING : DANGER;
    const badgeClass = kr.status;
    const badgeLabel = kr.status === "on-track" ? "On Track" : kr.status === "at-risk" ? "At Risk" : "Behind";
    return `
      <div class="kr-card">
        <div class="kr-header">
          <span class="kr-id">${kr.id}</span>
          <span class="kr-badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="kr-description">${kr.description}</div>
        <div class="kr-progress-row">
          <div class="kr-progress-bar-bg">
            <div class="kr-progress-bar-fill" style="width:${kr.progress}%; background:${progressColor}"></div>
          </div>
          <span class="kr-progress-value" style="color:${progressColor}">${kr.progress}%</span>
        </div>
        <div class="kr-meta">
          <span>Current: <strong>${kr.current}${kr.unit}</strong></span>
          <span>Target: <strong>${kr.target}${kr.unit}</strong></span>
          <span>Metric: <strong>${kr.metric}</strong></span>
        </div>
      </div>`;
  }).join("");

  // KR Progress comparison bar chart
  createChart("chart-kr-progress", {
    type: "bar",
    data: {
      labels: okrs.krs.map(kr => kr.id),
      datasets: [{
        label: "Progress %",
        data: okrs.krs.map(kr => kr.progress),
        backgroundColor: okrs.krs.map(kr =>
          kr.status === "on-track" ? SUCCESS : kr.status === "at-risk" ? WARNING : DANGER
        ),
        borderRadius: 6,
        barPercentage: 0.6
      }]
    },
    options: {
      ...chartOptions("KR Progress", v => v + "%", 0, 100),
      indexAxis: "y",
      scales: {
        x: {
          grid: { color: "rgba(28,40,54,0.5)", drawBorder: false },
          ticks: { color: TEXT_MUT, callback: v => v + "%" },
          max: 100
        },
        y: {
          grid: { display: false },
          ticks: { color: TEXT_SEC, font: { weight: 600 } }
        }
      }
    }
  });

  // KR Trend line chart
  createChart("chart-kr-trend", {
    type: "line",
    data: {
      labels: DASHBOARD_DATA.timeseries.labels_weekly,
      datasets: okrs.krs.map((kr, i) => {
        const colors = [ACCENT, INFO, SUCCESS, WARNING, DANGER];
        return {
          label: kr.id,
          data: kr.trend,
          borderColor: colors[i],
          backgroundColor: "transparent",
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: colors[i],
          borderWidth: 2
        };
      })
    },
    options: {
      ...chartOptions("KR Trend"),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 12, font: { size: 11 } } }
      }
    }
  });
}

// ============================================================
// RENDER: SRE & TECHNICAL
// ============================================================
function renderSRE() {
  const sre = DASHBOARD_DATA.sre;

  // SRE KPIs
  setKPI("sre-kpis", [
    { label: "API Availability", value: sre.slos[0].current + "%", change: 0.05, changeSuffix: "%" },
    { label: "Latency p95", value: sre.slos[1].current + " ms", change: -13, changeSuffix: " ms" },
    { label: "Error Rate", value: sre.slos[2].current + "%", change: -0.01, changeSuffix: "%" },
    { label: "Deploy Frequency", value: sre.dora.deploy_frequency.value + "/day", change: 0.3, changeSuffix: "/day" },
    { label: "LCP", value: sre.slos[4].current + "s", change: -0.2, changeSuffix: "s" },
    { label: "CI Success Rate", value: sre.slos[5].current + "%", change: 1.0, changeSuffix: "%" }
  ]);

  // SLO rows
  const sloContainer = document.getElementById("slo-list");
  sloContainer.innerHTML = sre.slos.map(slo => {
    const dotClass = slo.status === "healthy" ? "status-healthy" : slo.status === "warning" ? "status-warning" : "status-danger";
    const budgetColor = slo.budget_remaining > 50 ? SUCCESS : slo.budget_remaining > 20 ? WARNING : DANGER;
    return `
      <div class="slo-row">
        <span class="slo-status-dot ${dotClass}"></span>
        <span class="slo-name">${slo.name}</span>
        <span class="slo-current">${slo.current}${slo.unit}</span>
        <span class="slo-target">Target: ${slo.target}${slo.unit}</span>
        <span class="slo-budget" style="color:${budgetColor}">Budget: ${slo.budget_remaining}%</span>
      </div>`;
  }).join("");

  // Latency chart
  createChart("chart-latency", {
    type: "line",
    data: {
      labels: DASHBOARD_DATA.timeseries.labels_weekly,
      datasets: [{
        label: "p95 Latency (ms)",
        data: DASHBOARD_DATA.timeseries.latency_p95,
        borderColor: INFO,
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: INFO,
        borderWidth: 2
      }, {
        label: "SLO Target",
        data: DASHBOARD_DATA.timeseries.labels_weekly.map(() => 500),
        borderColor: TEXT_MUT,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      ...chartOptions("Latency", v => v + "ms", 0, 600),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } }
      }
    }
  });

  // Error rate chart
  createChart("chart-error-rate", {
    type: "line",
    data: {
      labels: DASHBOARD_DATA.timeseries.labels_weekly,
      datasets: [{
        label: "Error Rate %",
        data: DASHBOARD_DATA.timeseries.error_rate,
        borderColor: DANGER,
        backgroundColor: "rgba(239,68,68,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: DANGER,
        borderWidth: 2
      }, {
        label: "SLO Target",
        data: DASHBOARD_DATA.timeseries.labels_weekly.map(() => 0.50),
        borderColor: TEXT_MUT,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      ...chartOptions("Error Rate", v => v + "%", 0, 0.6),
      plugins: {
        ...chartOptions().plugins,
        legend: { display: true, labels: { color: TEXT_SEC, boxWidth: 12, padding: 16 } }
      }
    }
  });

  // DORA grid
  const doraContainer = document.getElementById("dora-grid");
  const doraItems = [
    { label: "Deploy Frequency", value: sre.dora.deploy_frequency.value, unit: sre.dora.deploy_frequency.unit, level: sre.dora.deploy_frequency.level },
    { label: "Lead Time", value: sre.dora.lead_time.value, unit: sre.dora.lead_time.unit, level: sre.dora.lead_time.level },
    { label: "Change Failure Rate", value: sre.dora.change_failure_rate.value, unit: sre.dora.change_failure_rate.unit, level: sre.dora.change_failure_rate.level },
    { label: "Time to Restore", value: sre.dora.time_to_restore.value, unit: sre.dora.time_to_restore.unit, level: sre.dora.time_to_restore.level }
  ];
  doraContainer.innerHTML = doraItems.map(d => `
    <div class="dora-card">
      <div class="dora-value">${d.value}<small style="font-size:0.55em;color:${TEXT_MUT}">${d.unit}</small></div>
      <div class="dora-label">${d.label}</div>
      <span class="dora-badge ${d.level}">${d.level}</span>
    </div>
  `).join("");

  // Top errors
  const errorContainer = document.getElementById("error-list");
  errorContainer.innerHTML = sre.top_errors.map(err => `
    <div class="error-row">
      <span class="error-count">${err.count}x</span>
      <span class="error-message">${err.message}</span>
      <span class="error-source">${err.source}</span>
    </div>
  `).join("");

  // Infrastructure
  const infraContainer = document.getElementById("infra-list");
  infraContainer.innerHTML = sre.infrastructure.map(inf => `
    <div class="infra-row">
      <span class="status-dot status-${inf.status}"></span>
      <span class="infra-name">${inf.name}</span>
      <span class="infra-detail">${inf.detail}</span>
      <span class="infra-status-badge ${inf.status}">${inf.status}</span>
    </div>
  `).join("");
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
  // Set last update timestamp
  const now = new Date();
  const formattedDate = now.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  document.getElementById("last-update").textContent = formattedDate;

  // Render initial section
  showSection("overview");
});
