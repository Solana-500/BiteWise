import {
    loadAuditLogs,
    loadAuthEvents,
    loadIntegrationFailures,
    loadSystemStatus
} from "./audit-controller.js";

import { actionLabel, actionTone } from "./audit-labels.js";

import {
    escapeHTML,
    setText,
    formatNumber,
    capitalise,
    humanise,
    todayString,
    shiftDays,
    formatDay,
    formatDateTime,
    timeAgo,
    formatBytes,
    validateDateRange
} from "./ui-utils.js";


const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;

const COLORS = {
    green: "#185d35",
    amber: "#d9a441",
    gray: "#9aa5a0",
    grid: "#e8ede9"
};


/* ==============================================
   LABELS
============================================== */

const AUTH_EVENT_LABELS = {
    login: "Login",
    logout: "Logout",
    user_signedup: "Sign-up",
    user_recovery_requested: "Password recovery requested",
    user_confirmation_requested: "Confirmation requested",
    user_repeated_signup: "Repeated sign-up attempt",
    user_modified: "Account updated",
    user_deleted: "Account deleted",
    user_invited: "Invited"
};

const SERVICE_LABELS = {
    usda: "USDA",
    gemini: "Gemini",
    other: "Other"
};


function authEventLabel(event) {
    return AUTH_EVENT_LABELS[event] ?? humanise(event);
}


function authTone(event) {

    if (["login", "user_signedup"].includes(event)) return "active";
    if (event === "user_deleted") return "rejected";
    if (event === "user_recovery_requested") return "pending";
    if (event === "logout") return "expired";

    return "unknown";
}


function badge(label, tone) {
    return `<span class="report-status ${tone}">${escapeHTML(label)}</span>`;
}


/* ==============================================
   STATE
============================================== */

let activeTab = "logs";
let currentRange = null;
let charts = {};

const filters = {
    logs: { action: "", role: "", search: "" },
    auth: { event: "", search: "" },
    integrations: { service: "" }
};

const pages = { logs: 0, auth: 0, integrations: 0 };
const loaded = {};     // tabs already loaded for the current range
const tokens = {};     // ignores results that arrive after a newer request
let searchTimers = {};


/* ==============================================
   DATE RANGE
============================================== */

function readRangeFromControls() {

    const preset =
        document.getElementById("audit-range")?.value || "30";

    if (preset === "custom") {
        return {
            start: document.getElementById("audit-start")?.value,
            end: document.getElementById("audit-end")?.value
        };
    }

    const today = todayString();

    if (preset === "year") {
        return { start: `${today.slice(0, 4)}-01-01`, end: today };
    }

    return {
        start: shiftDays(today, -(Number(preset) - 1)),
        end: today
    };
}


function showRangeError(message) {

    const element = document.getElementById("audit-range-error");

    if (!element) return;

    element.textContent = message ?? "";
    element.hidden = !message;
}


function applyRangeFromControls() {

    const range = readRangeFromControls();
    const rangeError = validateDateRange(range.start, range.end);

    showRangeError(rangeError);

    if (rangeError) return;

    currentRange = range;

    setText(
        "audit-range-label",
        `${formatDay(range.start, true)} – ${formatDay(range.end, true)}`
    );

    // Everything dated has to be fetched again
    Object.keys(loaded).forEach(tab => delete loaded[tab]);
    pages.logs = pages.auth = pages.integrations = 0;

    loadTab(activeTab);
}


/* ==============================================
   TABS
============================================== */

function switchTab(tab) {

    activeTab = tab;

    document.querySelectorAll("[data-audit-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.auditTab === tab);
    });

    document.querySelectorAll(".report-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === `audit-panel-${tab}`);
    });

    // System Status is a live snapshot, so the date range does not apply
    const toolbar = document.getElementById("audit-toolbar");

    if (toolbar) {
        toolbar.hidden = tab === "status";
    }

    if (tab === "status") {
        showRangeError("");
    }

    // Load a tab the first time it is opened (status always reloads)
    if (currentRange && (tab === "status" || !loaded[tab])) {
        loadTab(tab);
    }
}


async function fetchTab(tab) {

    const paging = {
        limit: PAGE_SIZE,
        offset: (pages[tab] ?? 0) * PAGE_SIZE
    };

    const range = currentRange;

    if (tab === "logs") {
        return loadAuditLogs({ ...range, ...filters.logs, ...paging });
    }

    if (tab === "auth") {
        return loadAuthEvents({ ...range, ...filters.auth, ...paging });
    }

    if (tab === "integrations") {
        return loadIntegrationFailures({
            ...range,
            ...filters.integrations,
            ...paging
        });
    }

    return loadSystemStatus();
}


async function loadTab(tab) {

    const content = document.getElementById(`${tab}-report-content`);
    const errorBox = document.getElementById(`${tab}-report-error`);

    const token = (tokens[tab] ?? 0) + 1;
    tokens[tab] = token;

    content?.classList.add("is-loading");

    if (errorBox) {
        errorBox.hidden = true;
    }

    const startedAt = performance.now();

    try {

        const data = await fetchTab(tab);

        // A newer request started while this one was loading
        if (token !== tokens[tab]) return;

        const elapsed = Math.round(performance.now() - startedAt);

        RENDERERS[tab](data, elapsed);
        loaded[tab] = true;

    } catch (error) {

        if (token !== tokens[tab]) return;

        console.error(`Error loading ${tab}:`, error);

        if (tab === "status") {
            renderStatusUnavailable();
        }

        if (errorBox) {
            errorBox.textContent =
                "Unable to load this section. Please try again.";
            errorBox.hidden = false;
        }

    } finally {

        if (token === tokens[tab]) {
            content?.classList.remove("is-loading");
        }
    }
}


/* ==============================================
   SHARED RENDER HELPERS
============================================== */

function setKpis(tab, values) {
    Object.entries(values).forEach(([key, value]) => {
        setText(`${tab}-kpi-${key}`, value);
    });
}


// Fill a filter dropdown, keeping the current choice selectable
function setOptions(selectId, values, labelFor, allLabel, selected) {

    const select = document.getElementById(selectId);

    if (!select) return;

    const list = values.includes(selected) || !selected
        ? values
        : [...values, selected];

    select.innerHTML =
        `<option value="">${escapeHTML(allLabel)}</option>` +
        list.map(value => `
            <option value="${escapeHTML(value)}">
                ${escapeHTML(labelFor(value))}
            </option>
        `).join("");

    select.value = selected || "";
}


function renderRows(tab, rows, rowHtml, empty) {

    const body = document.getElementById(`${tab}-table-body`);

    if (!body) return;

    if (rows.length === 0) {

        body.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="${empty.columns}">
                    <div class="table-empty-state">
                        <strong>${escapeHTML(empty.title)}</strong>
                        <span>${escapeHTML(empty.message)}</span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML = rows.map(rowHtml).join("");
}


function renderPager(tab, total, shown) {

    const pager = document.getElementById(`${tab}-pager`);

    if (!pager) return;

    const page = pages[tab] ?? 0;
    const first = page * PAGE_SIZE + 1;
    const last = page * PAGE_SIZE + shown;

    pager.hidden = total === 0;

    setText(
        `${tab}-pager-info`,
        total === 0
            ? ""
            : `Showing ${formatNumber(first)}–${formatNumber(last)} ` +
              `of ${formatNumber(total)}`
    );

    pager.querySelector('[data-dir="-1"]').disabled = page === 0;
    pager.querySelector('[data-dir="1"]').disabled = last >= total;
}


function hasFilter(tab) {
    return Object.values(filters[tab]).some(Boolean);
}


function emptyFor(tab, noun, columns) {

    return hasFilter(tab)
        ? {
            columns,
            title: `No ${noun} match these filters`,
            message: "Try a different filter or date range."
        }
        : {
            columns,
            title: `No ${noun} in this period`,
            message: "Try a longer date range."
        };
}


function setChartEmpty(cardId, isEmpty) {
    document.getElementById(cardId)?.classList.toggle("is-empty", isEmpty);
}


function drawChart(key, canvasId, config) {

    charts[key]?.destroy();
    delete charts[key];

    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") return;

    charts[key] = new Chart(canvas, config);
}


function lineConfig(labels, series) {
    return {
        type: "line",
        data: {
            labels,
            datasets: series.map(item => ({
                label: item.label,
                data: item.data,
                borderColor: item.color,
                backgroundColor: item.color,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: labels.length > 45 ? 0 : 3
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: COLORS.grid }
                }
            }
        }
    };
}


/* ==============================================
   RENDER: AUDIT LOGS
============================================== */

// {from: "pending", to: "approved"} -> "pending → approved"
function formatDetails(details) {

    const entries = Object.entries(details ?? {})
        .filter(([key]) => key !== "label");

    if (entries.length === 0) return "—";

    const { from, to } = details;

    if (from !== undefined && to !== undefined) {
        return `${from} → ${to}`;
    }

    return entries
        .map(([key, value]) => `${humanise(key)}: ${value}`)
        .join(", ");
}


function renderLogs(data) {

    const rows = data?.rows ?? [];
    const total = data?.total ?? 0;

    setOptions(
        "logs-action",
        data?.actions ?? [],
        actionLabel,
        "All actions",
        filters.logs.action
    );

    renderRows(
        "logs",
        rows,
        row => `
            <tr>
                <td>${escapeHTML(formatDateTime(row.created_at))}</td>
                <td>
                    <strong>${escapeHTML(row.actor_name || "Unknown")}</strong>
                    ${row.actor_role
                        ? `<span class="audit-cell-sub">${escapeHTML(capitalise(row.actor_role))}</span>`
                        : ""}
                </td>
                <td>${badge(actionLabel(row.action), actionTone(row.action))}</td>
                <td>
                    ${escapeHTML(row.target_label || "—")}
                    ${row.target_type
                        ? `<span class="audit-cell-sub">${escapeHTML(capitalise(row.target_type))}</span>`
                        : ""}
                </td>
                <td class="audit-details">
                    ${escapeHTML(formatDetails(row.details))}
                </td>
            </tr>
        `,
        emptyFor("logs", "audit entries", 5)
    );

    renderPager("logs", total, rows.length);
}


/* ==============================================
   RENDER: AUTHENTICATION
============================================== */

function renderAuth(data) {

    const kpis = data?.kpis ?? {};
    const rows = data?.rows ?? [];

    setKpis("auth", {
        logins: formatNumber(kpis.logins),
        signups: formatNumber(kpis.signups),
        unique: formatNumber(kpis.unique_logins),
        recoveries: formatNumber(kpis.recoveries)
    });

    setOptions(
        "auth-event",
        data?.events ?? [],
        authEventLabel,
        "All events",
        filters.auth.event
    );

    renderRows(
        "auth",
        rows,
        row => `
            <tr>
                <td>${escapeHTML(formatDateTime(row.created_at))}</td>
                <td>${badge(authEventLabel(row.event), authTone(row.event))}</td>
                <td>
                    <strong>${escapeHTML(row.full_name || row.email || "Unknown")}</strong>
                    ${row.full_name && row.email
                        ? `<span class="audit-cell-sub">${escapeHTML(row.email)}</span>`
                        : ""}
                </td>
                <td>${escapeHTML(capitalise(row.app_role) || "—")}</td>
                <td>${escapeHTML(capitalise(row.provider) || "—")}</td>
            </tr>
        `,
        emptyFor("auth", "authentication events", 5)
    );

    renderPager("auth", data?.total ?? 0, rows.length);
}


/* ==============================================
   RENDER: INTEGRATION FAILURES
============================================== */

function renderIntegrations(data) {

    const kpis = data?.kpis ?? {};
    const daily = data?.daily ?? [];
    const rows = data?.rows ?? [];

    setKpis("integrations", {
        total: formatNumber(kpis.total),
        usda: formatNumber(kpis.usda),
        gemini: formatNumber(kpis.gemini),
        last: kpis.last_failure_at
            ? formatDateTime(kpis.last_failure_at)
            : "None"
    });

    setChartEmpty("integrations-card-daily", !kpis.total);

    drawChart("integrations:daily", "integrations-chart-daily", lineConfig(
        daily.map(day => formatDay(day.day)),
        [
            { label: "USDA", data: daily.map(d => d.usda), color: COLORS.green },
            { label: "Gemini", data: daily.map(d => d.gemini), color: COLORS.amber },
            { label: "Other", data: daily.map(d => d.other), color: COLORS.gray }
        ]
    ));

    renderRows(
        "integrations",
        rows,
        row => `
            <tr>
                <td>${escapeHTML(formatDateTime(row.created_at))}</td>
                <td>${escapeHTML(SERVICE_LABELS[row.service] ?? humanise(row.service))}</td>
                <td>${escapeHTML(row.operation || "—")}</td>
                <td class="audit-error-text">${escapeHTML(row.error_message || "—")}</td>
                <td>${escapeHTML(row.status_code ?? "—")}</td>
                <td>${escapeHTML(row.user_name || "—")}</td>
            </tr>
        `,
        {
            columns: 6,
            title: hasFilter("integrations")
                ? "No failures match this filter"
                : "No failures recorded in this period",
            message: hasFilter("integrations")
                ? "Try a different service or date range."
                : "USDA and Gemini failures reported by the app will appear here."
        }
    );

    renderPager("integrations", data?.total ?? 0, rows.length);
}


/* ==============================================
   RENDER: SYSTEM STATUS
============================================== */

const SLOW_RESPONSE_MS = 1500;
const MANY_FAILURES = 5;


function statusCard(title, tone, pill, text) {
    return `
        <div class="audit-status-card">
            <div class="audit-status-card-top">
                <h3>${escapeHTML(title)}</h3>
                <span class="status-pill ${tone}">${escapeHTML(pill)}</span>
            </div>
            <p>${escapeHTML(text)}</p>
        </div>
    `;
}


function integrationCard(title, info) {

    const failures = Number(info?.failures_24h ?? 0);

    if (failures === 0) {
        return statusCard(
            title,
            "ok",
            "No failures",
            "No failures reported in the last 24 hours."
        );
    }

    return statusCard(
        title,
        failures >= MANY_FAILURES ? "bad" : "warn",
        `${formatNumber(failures)} failure${failures === 1 ? "" : "s"}`,
        `In the last 24 hours. Last failure ${timeAgo(info.last_failure_at)}.`
    );
}


function renderStatus(data, responseMs) {

    const counts = data?.counts ?? {};
    const integrations = data?.integrations ?? {};
    const auth = data?.auth ?? {};
    const audit = data?.audit ?? {};

    const slow = responseMs >= SLOW_RESPONSE_MS;

    const cards = [
        statusCard(
            "Application API",
            slow ? "warn" : "ok",
            slow ? "Slow" : "Operational",
            `Responded in ${formatNumber(responseMs)} ms.`
        ),
        statusCard(
            "Database",
            "ok",
            "Connected",
            `Database size ${formatBytes(data?.database?.size_bytes)}.`
        ),
        statusCard(
            "Authentication",
            "ok",
            "Operational",
            auth.last_event_at
                ? `Last activity ${timeAgo(auth.last_event_at)}. ` +
                  `${formatNumber(auth.logins_24h)} login(s) in the last 24 hours.`
                : "No authentication activity recorded yet."
        ),
        integrationCard("USDA food database", integrations.usda),
        integrationCard("Gemini AI", integrations.gemini),
        statusCard(
            "Audit logging",
            "ok",
            "Recording",
            audit.last_action_at
                ? `${formatNumber(audit.actions_24h)} event(s) in the last 24 hours. ` +
                  `Last action ${timeAgo(audit.last_action_at)}.`
                : "No events recorded yet."
        )
    ];

    // Failures from services other than USDA / Gemini only matter if they exist
    if (Number(integrations.other?.failures_24h ?? 0) > 0) {
        cards.splice(5, 0, integrationCard("Other integrations", integrations.other));
    }

    document.getElementById("status-grid").innerHTML = cards.join("");

    const flagged = [];

    if (slow) flagged.push("API response is slow");

    [["USDA", integrations.usda], ["Gemini", integrations.gemini],
     ["Other integrations", integrations.other]].forEach(([name, info]) => {
        if (Number(info?.failures_24h ?? 0) > 0) {
            flagged.push(`${name} reported failures`);
        }
    });

    const banner = document.getElementById("status-banner");

    const bad = Number(integrations.usda?.failures_24h ?? 0) >= MANY_FAILURES ||
        Number(integrations.gemini?.failures_24h ?? 0) >= MANY_FAILURES;

    banner.className = `status-banner ${
        flagged.length === 0 ? "ok" : bad ? "bad" : "warn"
    }`;

    setText(
        "status-banner-title",
        flagged.length === 0 ? "All systems operational" : "Attention needed"
    );

    setText(
        "status-banner-text",
        flagged.length === 0
            ? "No problems detected in the last 24 hours."
            : `${flagged.join(". ")}.`
    );

    setKpis("status", {
        users: formatNumber(counts.users),
        coaches: formatNumber(counts.coaches),
        applications: formatNumber(counts.pending_applications),
        plans: formatNumber(counts.pending_plans),
        subscriptions: formatNumber(counts.active_subscriptions)
    });

    setText(
        "status-checked",
        `Checked ${formatDateTime(data?.checked_at)}.`
    );
}


// If the status call itself fails, that is the status
function renderStatusUnavailable() {

    document.getElementById("status-grid").innerHTML = statusCard(
        "Application API",
        "bad",
        "Unavailable",
        "The status check could not reach the system."
    );

    document.getElementById("status-banner").className = "status-banner bad";
    setText("status-banner-title", "System unavailable");
    setText(
        "status-banner-text",
        "The status check failed. The database or network may be down."
    );

    setKpis("status", {
        users: "—",
        coaches: "—",
        applications: "—",
        plans: "—",
        subscriptions: "—"
    });

    setText("status-checked", "");
}


const RENDERERS = {
    logs: renderLogs,
    auth: renderAuth,
    integrations: renderIntegrations,
    status: renderStatus
};


/* ==============================================
   SETUP
============================================== */

// Filter changed: go back to page 1 and reload this tab
function filterChanged(tab) {
    pages[tab] = 0;
    loadTab(tab);
}


function bindFilter(selectId, tab, key) {

    document.getElementById(selectId)?.addEventListener("change", event => {
        filters[tab][key] = event.target.value;
        filterChanged(tab);
    });
}


function bindSearch(inputId, tab) {

    document.getElementById(inputId)?.addEventListener("input", event => {

        const value = event.target.value.trim();

        clearTimeout(searchTimers[tab]);

        searchTimers[tab] = setTimeout(() => {
            filters[tab].search = value;
            filterChanged(tab);
        }, SEARCH_DELAY_MS);
    });
}


function setupAuditPage() {

    document.querySelectorAll("[data-audit-tab]").forEach(button => {
        button.addEventListener("click", () => {
            switchTab(button.dataset.auditTab);
        });
    });

    const rangeSelect = document.getElementById("audit-range");
    const customRange = document.getElementById("audit-custom-range");

    rangeSelect?.addEventListener("change", () => {

        const isCustom = rangeSelect.value === "custom";

        if (customRange) {
            customRange.hidden = !isCustom;
        }

        // Pre-fill the custom inputs with the current range
        if (isCustom && currentRange) {
            document.getElementById("audit-start").value = currentRange.start;
            document.getElementById("audit-end").value = currentRange.end;
            return;
        }

        applyRangeFromControls();
    });

    ["audit-start", "audit-end"].forEach(id => {
        document
            .getElementById(id)
            ?.addEventListener("change", applyRangeFromControls);
    });

    bindFilter("logs-action", "logs", "action");
    bindFilter("logs-role", "logs", "role");
    bindSearch("logs-search", "logs");
    bindFilter("auth-event", "auth", "event");
    bindSearch("auth-search", "auth");
    bindFilter("integrations-service", "integrations", "service");

    document.querySelectorAll("[data-pager]").forEach(button => {
        button.addEventListener("click", () => {

            const tab = button.dataset.pager;

            pages[tab] = Math.max(0, pages[tab] + Number(button.dataset.dir));
            loadTab(tab);
        });
    });

    document
        .getElementById("status-refresh")
        ?.addEventListener("click", () => loadTab("status"));
}


export async function loadAuditPage() {

    if (!document.querySelector("[data-audit-tab]")) {
        return;
    }

    if (typeof Chart !== "undefined") {
        Chart.defaults.color = "#64748b";
        Chart.defaults.font.size = 12;
    }

    setupAuditPage();
    applyRangeFromControls();
}
