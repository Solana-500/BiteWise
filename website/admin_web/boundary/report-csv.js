// CSV export formatting for the report tabs

const REPORT_TIMEZONE = "Asia/Singapore";
 
 
function csvCell(value) {
 
    if (value === null || value === undefined) {
        return "";
    }
 
    let text = String(value);
 
    // Stop spreadsheet apps from running text as a formula
    if (
        typeof value === "string" &&
        /^[=+\-@\t\r]/.test(text)
    ) {
        text = `'${text}`;
    }
 
    return /[",\n\r]/.test(text)
        ? `"${text.replaceAll('"', '""')}"`
        : text;
}
 
 
function csvRow(cells) {
    return cells.map(csvCell).join(",");
}
 
 
function formatCsvDate(value) {
 
    if (!value) return "";
 
    return new Date(value).toLocaleDateString(
        "en-CA",
        { timeZone: REPORT_TIMEZONE }
    );
}
 
 
function capitalise(text) {
 
    const value = String(text ?? "");
 
    return value.charAt(0).toUpperCase() + value.slice(1);
}
 
 
function planLabel(tier) {
    return tier === "premium" ? "Premium" : "Free";
}
 
 
/*
 * Builds one CSV file from:
 *   title    - report name
 *   range    - { start, end }
 *   summary  - [[label, value], ...]
 *   sections - [{ title, columns: [...], rows: [[...], ...] }, ...]
 */
function buildReportCsv({ title, range, summary, sections }) {
 
    const lines = [
        csvRow([title]),
        csvRow(["Period", `${range.start} to ${range.end}`]),
        "",
        csvRow(["Summary"]),
        csvRow(["Metric", "Value"]),
        ...summary.map(csvRow)
    ];
 
    sections.forEach(section => {
        lines.push(
            "",
            csvRow([section.title]),
            csvRow(section.columns),
            ...section.rows.map(csvRow)
        );
    });
 
    return lines.join("\r\n");
}
 
 
export function buildUsersCsv(report, range) {
 
    const kpis = report?.kpis ?? {};
    const plans = report?.plans ?? {};
 
    return buildReportCsv({
        title: "Users Report",
        range,
        summary: [
            ["Total users", kpis.total_users ?? 0],
            ["New users (period)", kpis.new_users ?? 0],
            ["Premium users", kpis.premium_users ?? 0],
            ["Suspended users", kpis.suspended_users ?? 0]
        ],
        sections: [
            {
                title: "Plan split (all users)",
                columns: ["Plan", "Users"],
                rows: [
                    ["Free", plans.free ?? 0],
                    ["Premium", plans.premium ?? 0]
                ]
            },
            {
                title: "Fitness goals (all users)",
                columns: ["Goal", "Users"],
                rows: (report?.goals ?? []).map(
                    goal => [goal.goal, goal.users]
                )
            },
            {
                title: "Daily signups",
                columns: ["Date", "New users"],
                rows: (report?.daily ?? []).map(
                    day => [day.day, day.signups]
                )
            },
            {
                title: "New users",
                columns: ["Name", "Email", "Plan", "Status", "Joined"],
                rows: (report?.rows ?? []).map(user => [
                    user.full_name || "Unnamed User",
                    user.email,
                    planLabel(user.subscription_tier),
                    user.is_suspended ? "Suspended" : "Active",
                    formatCsvDate(user.created_at)
                ])
            }
        ]
    });
}
 
 
export function buildSubscriptionsCsv(report, range) {
 
    const kpis = report?.kpis ?? {};
    const statuses = report?.statuses ?? {};
 
    return buildReportCsv({
        title: "Subscriptions Report",
        range,
        summary: [
            ["Active subscriptions", kpis.active_now ?? 0],
            ["New subscriptions (period)", kpis.new_in_period ?? 0],
            ["Ended in period (cancelled or expired)", kpis.ended_in_period ?? 0],
            ["Expiring within 30 days", kpis.expiring_soon ?? 0]
        ],
        sections: [
            {
                title: "Status breakdown (all subscriptions)",
                columns: ["Status", "Subscriptions"],
                rows: [
                    ["Active", statuses.active ?? 0],
                    ["Cancelled", statuses.cancelled ?? 0],
                    ["Expired", statuses.expired ?? 0],
                    ["Other", statuses.other ?? 0]
                ]
            },
            {
                title: "Daily activity",
                columns: ["Date", "New subscriptions", "Ended subscriptions"],
                rows: (report?.daily ?? []).map(
                    day => [day.day, day.new_subs, day.ended_subs]
                )
            },
            {
                title: "New subscriptions",
                columns: [
                    "Name", "Email", "Plan", "Status", "Started", "Expires"
                ],
                rows: (report?.rows ?? []).map(row => [
                    row.full_name || "Unknown User",
                    row.email,
                    capitalise(row.plan),
                    capitalise(row.status),
                    formatCsvDate(row.started_at),
                    formatCsvDate(row.expires_at)
                ])
            }
        ]
    });
}
 
 
export function buildCoachesCsv(report, range) {
 
    const kpis = report?.kpis ?? {};
    const statuses = report?.statuses ?? {};
 
    return buildReportCsv({
        title: "Coaches Report",
        range,
        summary: [
            ["Active coaches", kpis.active_coaches ?? 0],
            ["Pending applications", kpis.pending_applications ?? 0],
            ["Suspended coaches", kpis.suspended_coaches ?? 0],
            ["Average rating", kpis.avg_rating ?? ""]
        ],
        sections: [
            {
                title: "Status breakdown (all coaches)",
                columns: ["Status", "Coaches"],
                rows: [
                    ["Active", statuses.active ?? 0],
                    ["Pending", statuses.pending ?? 0],
                    ["Suspended", statuses.suspended ?? 0],
                    ["Rejected", statuses.rejected ?? 0]
                ]
            },
            {
                title: "Top specialties (active and suspended coaches)",
                columns: ["Specialty", "Coaches"],
                rows: (report?.specialties ?? []).map(
                    item => [item.specialty, item.coaches]
                )
            },
            {
                title: "Daily applications",
                columns: ["Date", "Applications"],
                rows: (report?.daily ?? []).map(
                    day => [day.day, day.applications]
                )
            },
            {
                title: "Coaches (current snapshot)",
                columns: [
                    "Name", "Email", "Specialties", "Experience (years)",
                    "Status", "Clients", "Reviews", "Average rating"
                ],
                rows: (report?.rows ?? []).map(coach => [
                    coach.full_name || "Unnamed Coach",
                    coach.email,
                    coach.coaching_specialty,
                    coach.years_experience,
                    capitalise(coach.status),
                    coach.clients,
                    coach.reviews,
                    coach.avg_rating
                ])
            }
        ]
    });
}
 
 
export function buildUsageCsv(report, range) {
 
    const kpis = report?.kpis ?? {};
    const adoption = report?.adoption ?? {};
 
    return buildReportCsv({
        title: "Usage Report",
        range,
        summary: [
            ["Active users", kpis.active_users ?? 0],
            ["Meals logged", kpis.meals_logged ?? 0],
            ["Workouts logged", kpis.workouts_logged ?? 0],
            [
                "Average logs per active user",
                kpis.avg_logs_per_active_user ?? 0
            ]
        ],
        sections: [
            {
                title: "Feature adoption",
                columns: ["Segment", "Users"],
                rows: [
                    ["Meals only", adoption.meals_only ?? 0],
                    ["Workouts only", adoption.workouts_only ?? 0],
                    ["Both", adoption.both ?? 0]
                ]
            },
            {
                title: "Daily activity",
                columns: [
                    "Date", "Active users", "Meals logged", "Workouts logged"
                ],
                rows: (report?.daily ?? []).map(day => [
                    day.day,
                    day.active_users,
                    day.meals,
                    day.workouts
                ])
            },
            {
                title: "Most active users",
                columns: [
                    "Name", "Plan", "Meals", "Workouts",
                    "Total logs", "Last active"
                ],
                rows: (report?.top_users ?? []).map(user => [
                    user.full_name || "Unnamed User",
                    planLabel(user.subscription_tier),
                    user.meals,
                    user.workouts,
                    user.total,
                    formatCsvDate(user.last_active)
                ])
            }
        ]
    });
}
 
 
const CONTENT_STATUS_LABELS = {
    draft: "Draft",
    pending_review: "Pending review",
    changes_requested: "Changes requested",
    approved: "Approved",
    active: "Active",
    archived: "Archived"
};
 
 
export function buildContentCsv(report, range) {
 
    const kpis = report?.kpis ?? {};
    const statuses = report?.statuses ?? {};
    const types = report?.types ?? {};
 
    return buildReportCsv({
        title: "Content Report",
        range,
        summary: [
            ["Total plans (all time)", kpis.total_plans ?? 0],
            ["Pending review", kpis.pending_review ?? 0],
            ["Live plans (approved or active)", kpis.live_plans ?? 0],
            ["Clients with a live plan", kpis.clients_with_live_plan ?? 0],
            ["Plans submitted in period", kpis.submitted_in_period ?? 0]
        ],
        sections: [
            {
                title: "Status breakdown (all plans)",
                columns: ["Status", "Plans"],
                rows: Object.entries(CONTENT_STATUS_LABELS).map(
                    ([key, label]) => [label, statuses[key] ?? 0]
                )
            },
            {
                title: "Content by type (all plans)",
                columns: ["Type", "Count"],
                rows: [
                    ["Meal plans", types.meal ?? 0],
                    ["Workout plans", types.workout ?? 0],
                    ["Recipes", types.recipes ?? "Not tracked yet"]
                ]
            },
            {
                title: "Daily plans created",
                columns: ["Date", "Meal plans", "Workout plans"],
                rows: (report?.daily ?? []).map(
                    day => [day.day, day.meal_plans, day.workout_plans]
                )
            },
            {
                title: "Workout exercises by category (all plans)",
                columns: ["Category", "Exercises"],
                rows: (report?.exercise_categories ?? []).map(
                    item => [item.category, item.exercises]
                )
            },
            {
                title: "Coaches by plans created in period",
                columns: ["Coach", "Meal plans", "Workout plans", "Total"],
                rows: (report?.top_coaches ?? []).map(coach => [
                    coach.full_name,
                    coach.meal_plans,
                    coach.workout_plans,
                    coach.total
                ])
            },
            {
                title: "Plans created in period",
                columns: [
                    "Title", "Type", "Coach", "Client",
                    "Status", "Created", "Submitted"
                ],
                rows: (report?.rows ?? []).map(plan => [
                    plan.title,
                    plan.type === "meal" ? "Meal plan" : "Workout plan",
                    plan.coach_name,
                    plan.client_name,
                    CONTENT_STATUS_LABELS[plan.status] ?? plan.status,
                    formatCsvDate(plan.created_at),
                    formatCsvDate(plan.submitted_at)
                ])
            }
        ]
    });
}
 
 
export function buildReportFilename(reportName, range, extension = "csv") {
    return `${reportName}-report_${range.start}_to_${range.end}.${extension}`;
}