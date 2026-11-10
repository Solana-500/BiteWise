// Names and colours for audit actions
// shared by Audit Logs page and dashboard's Recent Activity

import { humanise } from "./ui-utils.js";


const ACTION_LABELS = {
    "coach.applied": "Submitted coach application",
    "coach.approved": "Approved coach application",
    "coach.rejected": "Rejected coach application",
    "coach.suspended": "Suspended coach",
    "coach.reactivated": "Reactivated coach",
    "user.registered": "Registered an account",
    "user.suspended": "Suspended user",
    "user.reactivated": "Reactivated user",
    "user.plan_changed": "Changed plan",
    "subscription.started": "Started subscription",
    "subscription.cancelled": "Cancelled subscription",
    "subscription.expired": "Subscription expired"
};

// Meal plans and workout plans status
[["meal_plan", "meal plan"], ["workout_plan", "workout plan"]]
    .forEach(([key, noun]) => {
        ACTION_LABELS[`${key}.created`] = `Created ${noun}`;
        ACTION_LABELS[`${key}.pending_review`] = `Submitted ${noun} for review`;
        ACTION_LABELS[`${key}.changes_requested`] = `Requested changes to ${noun}`;
        ACTION_LABELS[`${key}.approved`] = `Approved ${noun}`;
        ACTION_LABELS[`${key}.active`] = `Activated ${noun}`;
        ACTION_LABELS[`${key}.archived`] = `Archived ${noun}`;
        ACTION_LABELS[`${key}.draft`] = `Moved ${noun} back to draft`;
    });


export function actionLabel(action) {
    return ACTION_LABELS[action] ?? humanise(action);
}


// Audit action badge
export function actionTone(action) {

    const verb = String(action ?? "").split(".")[1];

    if (["approved", "reactivated", "started", "active",
         "created", "registered"].includes(verb)) {
        return "active";
    }

    if (["rejected", "suspended", "cancelled", "deleted"].includes(verb)) {
        return "rejected";
    }

    if (["pending_review", "applied", "changes_requested",
         "plan_changed"].includes(verb)) {
        return "pending";
    }

    if (["expired", "archived"].includes(verb)) return "expired";

    return "unknown";
}