import {
    loadUsersReport,
    loadSubscriptionsReport,
    loadCoachesReport,
    loadUsageReport,
    loadContentReport
} from "../control/report-controller.js";
 
import {
    buildUsersCsv,
    buildSubscriptionsCsv,
    buildCoachesCsv,
    buildUsageCsv,
    buildContentCsv,
    buildReportFilename
} from "./report-csv.js";
 
 
const REPORT_TIMEZONE = "Asia/Singapore";
const TABLE_ROW_LIMIT = 25;
const MAX_RANGE_DAYS = 366;
 
const COLORS = {
    green: "#185d35",
    greenSoft: "rgba(24, 93, 53, 0.12)",
    greenLight: "#5aa57a",
    amber: "#d9a441",
    red: "#c9534a",
    gray: "#9aa5a0",
    grid: "#e8ede9"
};
 
// One entry per report tab
const REPORTS = {
    users: {
        name: "users",
        load: loadUsersReport,
        render: renderUsersReport,
        buildCsv: buildUsersCsv
    },
    subscriptions: {
        name: "subscriptions",
        load: loadSubscriptionsReport,
        render: renderSubscriptionsReport,
        buildCsv: buildSubscriptionsCsv
    },
    coaches: {
        name: "coaches",
        load: loadCoachesReport,
        render: renderCoachesReport,
        buildCsv: buildCoachesCsv
    },
    usage: {
        name: "usage",
        load: loadUsageReport,
        render: renderUsageReport,
        buildCsv: buildUsageCsv
    },
    content: {
        name: "content",
        load: loadContentReport,
        render: renderContentReport,
        buildCsv: buildContentCsv
    }
};
 
let activeTab = "users";
let currentRange = null;
let reportData = {};     // loaded report for each tab, current range only
let loadTokens = {};     // ignores results that arrive after a newer request
let charts = {};
 
 
/* ==============================================
   HELPERS
============================================== */
 
function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
 
 
function setText(id, value) {
    const element = document.getElementById(id);
 
    if (element) {
        element.textContent = value;
    }
}
 
 
function formatNumber(value) {
    return Number(value ?? 0).toLocaleString("en-GB");
}
 
 
function formatDecimal(value) {
 
    if (value === null || value === undefined) {
        return "—";
    }
 
    return Number(value).toLocaleString("en-GB", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}
 
 
function capitalise(text) {
 
    const value = String(text ?? "");
 
    return value.charAt(0).toUpperCase() + value.slice(1);
}
 
 
// Today's date in Singapore time, as YYYY-MM-DD
function todayString() {
    return new Intl.DateTimeFormat(
        "en-CA",
        { timeZone: REPORT_TIMEZONE }
    ).format(new Date());
}
 
 
function shiftDays(dateString, delta) {
 
    const [year, month, day] = dateString
        .split("-")
        .map(Number);
 
    return new Date(
        Date.UTC(year, month - 1, day + delta)
    ).toISOString().slice(0, 10);
}
 
 
function formatDay(dateString, withYear) {
 
    const [year, month, day] = dateString
        .split("-")
        .map(Number);
 
    return new Date(Date.UTC(year, month - 1, day))
        .toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            ...(withYear && { year: "numeric" }),
            timeZone: "UTC"
        });
}
 
 
function formatTimestamp(value) {
 
    if (!value) return "—";
 
    return new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: REPORT_TIMEZONE
    });
}
 
 
function formatExperience(value) {
 
    if (value === null || value === undefined || value === "") {
        return "—";
    }
 
    const years = Number(value);
 
    if (Number.isNaN(years)) {
        return escapeHTML(value);
    }
 
    return `${years} ${years === 1 ? "year" : "years"}`;
}
 
 
function statusBadge(status) {
 
    const key = String(status ?? "unknown").toLowerCase();
 
    const known = [
        "active", "suspended", "pending",
        "rejected", "cancelled", "expired"
    ];
 
    return `
        <span class="report-status ${known.includes(key) ? key : "unknown"}">
            ${escapeHTML(capitalise(key))}
        </span>
    `;
}
 
const CONTENT_STATUSES = {
    draft:             { label: "Draft",             css: "unknown" },
    pending_review:    { label: "Pending review",    css: "pending" },
    changes_requested: { label: "Changes requested", css: "changes" },
    approved:          { label: "Approved",          css: "active" },
    active:            { label: "Active",            css: "active" },
    archived:          { label: "Archived",          css: "expired" }
};
 
function contentStatusBadge(status) {
 
    const known = CONTENT_STATUSES[String(status ?? "").toLowerCase()];
 
    return `
        <span class="report-status ${known ? known.css : "unknown"}">
            ${escapeHTML(known ? known.label : capitalise(status || "unknown"))}
        </span>
    `;
}
 
 
// Form validation
function validateDateRange(start, end) {
 
    if (!start || !end) {
        return "Please choose both a start and an end date.";
    }
 
    const startTime = Date.parse(`${start}T00:00:00Z`);
    const endTime = Date.parse(`${end}T00:00:00Z`);
 
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
        return "Please enter valid dates.";
    }
 
    if (endTime < startTime) {
        return "The end date must be on or after the start date.";
    }
 
    if ((endTime - startTime) / 86400000 > MAX_RANGE_DAYS) {
        return "Please choose a range of one year or less.";
    }
 
    return null;
}
 
 
function readRangeFromControls() {
 
    const preset =
        document.getElementById("report-range")?.value || "30";
 
    if (preset === "custom") {
        return {
            start: document.getElementById("report-start")?.value,
            end: document.getElementById("report-end")?.value
        };
    }
 
    const today = todayString();
 
    if (preset === "year") {
        return {
            start: `${today.slice(0, 4)}-01-01`,
            end: today
        };
    }
 
    return {
        start: shiftDays(today, -(Number(preset) - 1)),
        end: today
    };
}
 
 
function updateRangeLabel(range) {
    setText(
        "report-range-label",
        `${formatDay(range.start, true)} – ${formatDay(range.end, true)}`
    );
}
 
 
function showRangeError(message) {
 
    const element = document.getElementById("report-range-error");
 
    if (!element) return;
 
    element.textContent = message || "";
    element.hidden = !message;
}

 
function switchTab(tab) {
 
    activeTab = tab;
 
    document.querySelectorAll(".report-tab").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.reportTab === tab
        );
    });
 
    document.querySelectorAll(".report-tab-panel").forEach(panel => {
        panel.classList.toggle(
            "active",
            panel.id === `report-panel-${tab}`
        );
    });
 
    updateExportState();
 
    // Load a tab the first time it is opened (or after a range change)
    if (REPORTS[tab] && !reportData[tab] && currentRange) {
        loadTab(tab);
    }
}
 
 
function updateExportState() {
 
    const hasData = Boolean(reportData[activeTab]);
 
    ["report-export-csv", "report-print"].forEach(id => {
        const button = document.getElementById(id);
 
        if (button) {
            button.disabled = !hasData;
        }
    });
}

 
async function refreshActiveReport() {
 
    const range = readRangeFromControls();
    const rangeError = validateDateRange(range.start, range.end);
 
    showRangeError(rangeError);
 
    if (rangeError) return;
 
    currentRange = range;
    reportData = {};
 
    updateRangeLabel(range);
    updateExportState();
 
    if (REPORTS[activeTab]) {
        await loadTab(activeTab);
    }
}
 
 
async function loadTab(tab) {
 
    const report = REPORTS[tab];
 
    if (!report || !currentRange) return;
 
    const content = document.getElementById(`${tab}-report-content`);
    const errorBox = document.getElementById(`${tab}-report-error`);
 
    const token = (loadTokens[tab] ?? 0) + 1;
    loadTokens[tab] = token;
 
    content?.classList.add("is-loading");
 
    if (errorBox) {
        errorBox.hidden = true;
    }
 
    try {
 
        const data = await report.load(
            currentRange.start,
            currentRange.end
        );
 
        // A newer request started while this one was loading
        if (token !== loadTokens[tab]) return;
 
        reportData[tab] = data;
        report.render(data);
 
    } catch (error) {
 
        if (token !== loadTokens[tab]) return;
 
        console.error(`Error loading ${tab} report:`, error);
 
        if (errorBox) {
            errorBox.textContent =
                `Unable to load the ${tab} report. Please try again.`;
            errorBox.hidden = false;
        }
 
    } finally {
 
        if (token === loadTokens[tab]) {
            content?.classList.remove("is-loading");
            updateExportState();
        }
    }
}
 
 
/* ==============================================
   SHARED HELPERS
============================================== */
 
function setKpis(tab, values) {
    Object.entries(values).forEach(([key, value]) => {
        setText(`${tab}-kpi-${key}`, value);
    });
}
 
 
function setChartEmpty(cardId, isEmpty) {
    document
        .getElementById(cardId)
        ?.classList.toggle("is-empty", isEmpty);
}
 
 
function drawChart(key, canvasId, config) {
 
    const canvas = document.getElementById(canvasId);
 
    if (!canvas || typeof Chart === "undefined") return;
 
    charts[key]?.destroy();
    charts[key] = new Chart(canvas, config);
}
 
 
function scales() {
    return {
        x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 8, maxRotation: 0 }
        },
        y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: COLORS.grid }
        }
    };
}
 
 
function lineConfig(labels, series, showLegend) {
 
    const showPoints = labels.length <= 45;
 
    return {
        type: "line",
        data: {
            labels,
            datasets: series.map(item => ({
                label: item.label,
                data: item.data,
                borderColor: item.color,
                backgroundColor: item.fill ? COLORS.greenSoft : item.color,
                fill: Boolean(item.fill),
                tension: 0.3,
                pointRadius: showPoints ? 3 : 0
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: showLegend
                    ? { position: "bottom", labels: { boxWidth: 12 } }
                    : { display: false }
            },
            scales: scales()
        }
    };
}
 
 
function doughnutConfig(labels, data, colors) {
    return {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: { position: "bottom", labels: { boxWidth: 12 } }
            }
        }
    };
}
 
 
function horizontalBarConfig(labels, data, label) {
    return {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: COLORS.greenLight,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: COLORS.grid }
                },
                y: { grid: { display: false } }
            }
        }
    };
}
 
 
function sum(values) {
    return values.reduce((total, value) => total + Number(value ?? 0), 0);
}
 
 
function renderTable(tab, rows, rowHtml, empty) {
 
    const body = document.getElementById(`${tab}-table-body`);
    const note = document.getElementById(`${tab}-table-note`);
 
    if (!body) return;
 
    if (rows.length === 0) {
 
        body.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="${empty.columns}">
                    <div class="table-empty-state">
                        <strong>${empty.title}</strong>
                        <span>${empty.message}</span>
                    </div>
                </td>
            </tr>
        `;
 
        if (note) note.hidden = true;
 
        return;
    }
 
    body.innerHTML = rows
        .slice(0, TABLE_ROW_LIMIT)
        .map(rowHtml)
        .join("");
 
    if (note) {
        const hidden = rows.length > TABLE_ROW_LIMIT;
 
        note.hidden = !hidden;
 
        if (hidden) {
            note.textContent =
                `Showing ${TABLE_ROW_LIMIT} of ${rows.length}. ` +
                `Export the CSV for the full list.`;
        }
    }
}
 
 
/* ==============================================
   USERS REPORT
============================================== */
 
function renderUsersReport(report) {
 
    const kpis = report?.kpis ?? {};
    const plans = report?.plans ?? {};
    const daily = report?.daily ?? [];
    const goals = report?.goals ?? [];
 
    setKpis("users", {
        total: formatNumber(kpis.total_users),
        new: formatNumber(kpis.new_users),
        premium: formatNumber(kpis.premium_users),
        suspended: formatNumber(kpis.suspended_users)
    });
 
    // Signups over time
    setChartEmpty(
        "users-card-signups",
        !daily.some(day => day.signups > 0)
    );
 
    drawChart("users:signups", "users-chart-signups", lineConfig(
        daily.map(day => formatDay(day.day)),
        [{
            label: "New users",
            data: daily.map(day => day.signups),
            color: COLORS.green,
            fill: true
        }],
        false
    ));
 
    // Free vs premium
    setChartEmpty(
        "users-card-plans",
        (plans.free ?? 0) + (plans.premium ?? 0) === 0
    );
 
    drawChart("users:plans", "users-chart-plans", doughnutConfig(
        ["Free", "Premium"],
        [plans.free ?? 0, plans.premium ?? 0],
        [COLORS.gray, COLORS.green]
    ));
 
    // Fitness goals
    setChartEmpty("users-card-goals", goals.length === 0);
 
    drawChart("users:goals", "users-chart-goals", horizontalBarConfig(
        goals.map(item => item.goal),
        goals.map(item => item.users),
        "Users"
    ));
 
    renderTable(
        "users",
        report?.rows ?? [],
        user => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(user.full_name || "Unnamed User")}
                    </strong>
                </td>
                <td>${escapeHTML(user.email || "—")}</td>
                <td>
                    ${user.subscription_tier === "premium" ? "Premium" : "Free"}
                </td>
                <td>
                    ${statusBadge(user.is_suspended ? "suspended" : "active")}
                </td>
                <td>${escapeHTML(formatTimestamp(user.created_at))}</td>
            </tr>
        `,
        {
            columns: 5,
            title: "No new users in this period",
            message: "Users who sign up will appear here."
        }
    );
}
 
 
/* ==============================================
   SUBSCRIPTIONS REPORT
============================================== */
 
function renderSubscriptionsReport(report) {
 
    const kpis = report?.kpis ?? {};
    const statuses = report?.statuses ?? {};
    const daily = report?.daily ?? [];
 
    setKpis("subscriptions", {
        active: formatNumber(kpis.active_now),
        new: formatNumber(kpis.new_in_period),
        ended: formatNumber(kpis.ended_in_period),
        expiring: formatNumber(kpis.expiring_soon)
    });
 
    // New vs ended
    setChartEmpty(
        "subscriptions-card-trend",
        sum(daily.map(day => day.new_subs)) +
        sum(daily.map(day => day.ended_subs)) === 0
    );
 
    drawChart("subscriptions:trend", "subscriptions-chart-trend", lineConfig(
        daily.map(day => formatDay(day.day)),
        [
            {
                label: "New",
                data: daily.map(day => day.new_subs),
                color: COLORS.green
            },
            {
                label: "Ended",
                data: daily.map(day => day.ended_subs),
                color: COLORS.red
            }
        ],
        true
    ));
 
    // Status split
    const statusTotal = sum(Object.values(statuses));
 
    setChartEmpty("subscriptions-card-status", statusTotal === 0);
 
    drawChart(
        "subscriptions:status",
        "subscriptions-chart-status",
        doughnutConfig(
            ["Active", "Cancelled", "Expired", "Other"],
            [
                statuses.active ?? 0,
                statuses.cancelled ?? 0,
                statuses.expired ?? 0,
                statuses.other ?? 0
            ],
            [COLORS.green, COLORS.red, COLORS.gray, COLORS.amber]
        )
    );
 
    renderTable(
        "subscriptions",
        report?.rows ?? [],
        row => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(row.full_name || "Unknown User")}
                    </strong>
                </td>
                <td>${escapeHTML(row.email || "—")}</td>
                <td>${escapeHTML(capitalise(row.plan) || "—")}</td>
                <td>${statusBadge(row.status)}</td>
                <td>${escapeHTML(formatTimestamp(row.started_at))}</td>
                <td>${escapeHTML(formatTimestamp(row.expires_at))}</td>
            </tr>
        `,
        {
            columns: 6,
            title: "No new subscriptions in this period",
            message: "Subscriptions started in this period will appear here."
        }
    );
}
 
 
/* ==============================================
   COACHES REPORT
============================================== */
 
function renderCoachesReport(report) {
 
    const kpis = report?.kpis ?? {};
    const statuses = report?.statuses ?? {};
    const daily = report?.daily ?? [];
    const specialties = report?.specialties ?? [];
 
    setKpis("coaches", {
        active: formatNumber(kpis.active_coaches),
        pending: formatNumber(kpis.pending_applications),
        suspended: formatNumber(kpis.suspended_coaches),
        rating: formatDecimal(kpis.avg_rating)
    });
 
    // Applications over time
    setChartEmpty(
        "coaches-card-applications",
        !daily.some(day => day.applications > 0)
    );
 
    drawChart(
        "coaches:applications",
        "coaches-chart-applications",
        lineConfig(
            daily.map(day => formatDay(day.day)),
            [{
                label: "Applications",
                data: daily.map(day => day.applications),
                color: COLORS.green,
                fill: true
            }],
            false
        )
    );
 
    // Status split
    setChartEmpty("coaches-card-status", sum(Object.values(statuses)) === 0);
 
    drawChart("coaches:status", "coaches-chart-status", doughnutConfig(
        ["Active", "Pending", "Suspended", "Rejected"],
        [
            statuses.active ?? 0,
            statuses.pending ?? 0,
            statuses.suspended ?? 0,
            statuses.rejected ?? 0
        ],
        [COLORS.green, COLORS.amber, COLORS.red, COLORS.gray]
    ));
 
    // Specialties
    setChartEmpty("coaches-card-specialties", specialties.length === 0);
 
    drawChart(
        "coaches:specialties",
        "coaches-chart-specialties",
        horizontalBarConfig(
            specialties.map(item => item.specialty),
            specialties.map(item => item.coaches),
            "Coaches"
        )
    );
 
    renderTable(
        "coaches",
        report?.rows ?? [],
        coach => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(coach.full_name || "Unnamed Coach")}
                    </strong>
                </td>
                <td>${escapeHTML(coach.email || "—")}</td>
                <td>${escapeHTML(coach.coaching_specialty || "—")}</td>
                <td>${formatExperience(coach.years_experience)}</td>
                <td>${statusBadge(coach.status)}</td>
                <td>${formatNumber(coach.clients)}</td>
                <td>
                    ${coach.reviews > 0
                        ? `${formatDecimal(coach.avg_rating)} (${coach.reviews})`
                        : "—"}
                </td>
            </tr>
        `,
        {
            columns: 7,
            title: "No coaches yet",
            message: "Coach accounts will appear here."
        }
    );
}
 
 
/* ==============================================
   CONTENT REPORT
============================================== */
 
function renderContentReport(report) {
 
    const kpis = report?.kpis ?? {};
    const statuses = report?.statuses ?? {};
    const types = report?.types ?? {};
    const daily = report?.daily ?? [];
    const categories = report?.exercise_categories ?? [];
    const coaches = report?.top_coaches ?? [];
 
    setKpis("content", {
        total: formatNumber(kpis.total_plans),
        pending: formatNumber(kpis.pending_review),
        live: formatNumber(kpis.live_plans),
        clients: formatNumber(kpis.clients_with_live_plan)
    });
 
    // Plans created over time
    const hasCreated = daily.some(
        day => day.meal_plans > 0 || day.workout_plans > 0
    );
 
    setChartEmpty("content-card-created", !hasCreated);
 
    drawChart("content:created", "content-chart-created", lineConfig(
        daily.map(day => formatDay(day.day)),
        [
            {
                label: "Meal plans",
                data: daily.map(day => day.meal_plans),
                color: COLORS.green,
                fill: false
            },
            {
                label: "Workout plans",
                data: daily.map(day => day.workout_plans),
                color: COLORS.amber,
                fill: false
            }
        ],
        true
    ));
 
    // Status split (all plans)
    const statusKeys = Object.keys(CONTENT_STATUSES);
 
    setChartEmpty(
        "content-card-status",
        sum(statusKeys.map(key => statuses[key] ?? 0)) === 0
    );
 
    drawChart("content:status", "content-chart-status", doughnutConfig(
        statusKeys.map(key => CONTENT_STATUSES[key].label),
        statusKeys.map(key => statuses[key] ?? 0),
        [
            COLORS.gray, COLORS.amber, COLORS.red,
            COLORS.green, COLORS.greenLight, "#cfd6d2"
        ]
    ));
 
    // Type split. Recipes have no table yet, so they get a note instead.
    setChartEmpty(
        "content-card-types",
        (types.meal ?? 0) + (types.workout ?? 0) === 0
    );
 
    drawChart("content:types", "content-chart-types", doughnutConfig(
        ["Meal plans", "Workout plans"],
        [types.meal ?? 0, types.workout ?? 0],
        [COLORS.green, COLORS.amber]
    ));
 
    setText(
        "content-recipes-note",
        types.recipes === null || types.recipes === undefined
            ? "Recipes are not tracked yet."
            : `Recipes: ${formatNumber(types.recipes)}`
    );
 
    // Exercises by category
    setChartEmpty("content-card-categories", categories.length === 0);
 
    drawChart(
        "content:categories",
        "content-chart-categories",
        horizontalBarConfig(
            categories.map(item => item.category),
            categories.map(item => item.exercises),
            "Exercises"
        )
    );
 
    // Coaches
    setChartEmpty("content-card-coaches", coaches.length === 0);
 
    drawChart(
        "content:coaches",
        "content-chart-coaches",
        horizontalBarConfig(
            coaches.map(item => item.full_name),
            coaches.map(item => item.total),
            "Plans created"
        )
    );
 
    renderTable(
        "content",
        report?.rows ?? [],
        plan => `
            <tr>
                <td><strong>${escapeHTML(plan.title || "Untitled")}</strong></td>
                <td>${plan.type === "meal" ? "Meal plan" : "Workout plan"}</td>
                <td>${escapeHTML(plan.coach_name || "—")}</td>
                <td>${escapeHTML(plan.client_name || "—")}</td>
                <td>${contentStatusBadge(plan.status)}</td>
                <td>${escapeHTML(formatTimestamp(plan.created_at))}</td>
            </tr>
        `,
        {
            columns: 6,
            title: "No plans created in this period",
            message: "Plans created by coaches in this period will appear here."
        }
    );
}
 
 
/* ==============================================
   USAGE REPORT
============================================== */
 
function renderUsageReport(report) {
 
    const kpis = report?.kpis ?? {};
    const adoption = report?.adoption ?? {};
    const daily = report?.daily ?? [];
 
    setKpis("usage", {
        active: formatNumber(kpis.active_users),
        meals: formatNumber(kpis.meals_logged),
        workouts: formatNumber(kpis.workouts_logged),
        average: formatNumber(kpis.avg_logs_per_active_user)
    });
 
    const labels = daily.map(day => formatDay(day.day));
 
    const hasActivity = daily.some(
        day => day.meals > 0 || day.workouts > 0
    );
 
    setChartEmpty("usage-card-dau", !hasActivity);
 
    drawChart("usage:dau", "usage-chart-dau", lineConfig(
        labels,
        [{
            label: "Active users",
            data: daily.map(day => day.active_users),
            color: COLORS.green,
            fill: true
        }],
        false
    ));
 
    setChartEmpty("usage-card-logs", !hasActivity);
 
    drawChart("usage:logs", "usage-chart-logs", lineConfig(
        labels,
        [
            {
                label: "Meals",
                data: daily.map(day => day.meals),
                color: COLORS.green
            },
            {
                label: "Workouts",
                data: daily.map(day => day.workouts),
                color: COLORS.amber
            }
        ],
        true
    ));
 
    const adoptionTotal =
        (adoption.meals_only ?? 0) +
        (adoption.workouts_only ?? 0) +
        (adoption.both ?? 0);
 
    setChartEmpty("usage-card-adoption", adoptionTotal === 0);
 
    drawChart("usage:adoption", "usage-chart-adoption", doughnutConfig(
        ["Meals only", "Workouts only", "Both"],
        [
            adoption.meals_only ?? 0,
            adoption.workouts_only ?? 0,
            adoption.both ?? 0
        ],
        [COLORS.greenLight, COLORS.amber, COLORS.green]
    ));
 
    renderTable(
        "usage",
        report?.top_users ?? [],
        user => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(user.full_name || "Unnamed User")}
                    </strong>
                </td>
                <td>
                    ${user.subscription_tier === "premium" ? "Premium" : "Free"}
                </td>
                <td>${formatNumber(user.meals)}</td>
                <td>${formatNumber(user.workouts)}</td>
                <td>${formatNumber(user.total)}</td>
                <td>${escapeHTML(formatTimestamp(user.last_active))}</td>
            </tr>
        `,
        {
            columns: 6,
            title: "No activity in this period",
            message: "Users who log meals or workouts will appear here."
        }
    );
}
 
 
/* ==============================================
   EXPORT
============================================== */
 
function downloadFile(filename, content, type) {
 
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
 
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
 
    document.body.appendChild(link);
    link.click();
    link.remove();
 
    URL.revokeObjectURL(url);
}
 
 
function exportCsv() {
 
    const report = REPORTS[activeTab];
    const data = reportData[activeTab];
 
    if (!report || !data || !currentRange) return;
 
    downloadFile(
        buildReportFilename(report.name, currentRange),
        // BOM so Excel reads the file as UTF-8
        "﻿" + report.buildCsv(data, currentRange),
        "text/csv;charset=utf-8"
    );
}
 
 
function setupReports() {
 
    document.querySelectorAll(".report-tab").forEach(button => {
        button.addEventListener("click", () => {
            switchTab(button.dataset.reportTab);
        });
    });
 
    const rangeSelect = document.getElementById("report-range");
    const customRange = document.getElementById("report-custom-range");
 
    rangeSelect?.addEventListener("change", () => {
 
        const isCustom = rangeSelect.value === "custom";
 
        if (customRange) {
            customRange.hidden = !isCustom;
        }
 
        // Pre-fill the custom inputs with the current range
        if (isCustom && currentRange) {
            document.getElementById("report-start").value =
                currentRange.start;
            document.getElementById("report-end").value =
                currentRange.end;
            return;
        }
 
        refreshActiveReport();
    });
 
    ["report-start", "report-end"].forEach(id => {
        document
            .getElementById(id)
            ?.addEventListener("change", refreshActiveReport);
    });
 
    document
        .getElementById("report-export-csv")
        ?.addEventListener("click", exportCsv);
 
    document
        .getElementById("report-print")
        ?.addEventListener("click", () => window.print());
}
 
 
export async function loadReportsPage() {
 
    if (!document.querySelector(".report-tabs")) {
        return;
    }
 
    if (typeof Chart !== "undefined") {
        Chart.defaults.color = "#64748b";
        Chart.defaults.font.size = 12;
    }
 
    setupReports();
    updateExportState();
 
    await refreshActiveReport();
}