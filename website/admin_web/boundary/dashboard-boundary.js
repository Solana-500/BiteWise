import { loadAuditLogs } from "../control/audit-controller.js";
import { loadDashboardStatistics } from "../control/dashboard-controller.js";
 
import { actionLabel, actionTone } from "./audit-labels.js";
 
import {
    escapeHTML,
    setText,
    formatNumber,
    todayString,
    shiftDays,
    timeAgo
} from "./ui-utils.js";
 
 
const ACTIVITY_LIMIT = 6;
const ACTIVITY_DAYS = 90;
 
 
function emptyState(title, message) {
    return `
        <div class="empty-state">
            <div class="empty-icon">☷</div>
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}
 
 
function activityItem(entry) {
 
    const who = entry.actor_name || "Unknown";
 
    const target = entry.target_label
        ? ` · ${entry.target_label}`
        : "";
 
    return `
        <div class="activity-item">
 
            <span class="activity-dot ${actionTone(entry.action)}"></span>
 
            <div class="activity-text">
                <strong>${escapeHTML(actionLabel(entry.action))}</strong>
                <span>${escapeHTML(who + target)}</span>
            </div>
 
            <time
                class="activity-time"
                datetime="${escapeHTML(entry.created_at)}"
            >
                ${escapeHTML(timeAgo(entry.created_at))}
            </time>
 
        </div>
    `;
}
 

function showCount(id, value) {
    setText(id, value === null || value === undefined ? "—" : formatNumber(value));
}
 
 
async function loadStatistics() {
 
    try {
 
        const stats = await loadDashboardStatistics();
 
        showCount("total-users", stats.users);
        showCount("total-coaches", stats.coaches);
        showCount("pending-coaches", stats.pendingCoaches);
        showCount("pending-content", stats.pendingContent);
        showCount("pending-content-small", stats.pendingContent);
 
    } catch (error) {
        console.error("Unable to load dashboard statistics:", error);
    }
}

 
// Fill Recent Activity with the latest audit log entries
async function loadDashboardActivity() {
 
    const list = document.getElementById("activity-list");
 
    if (!list) return;
 
    try {
 
        const today = todayString();
 
        const data = await loadAuditLogs({
            start: shiftDays(today, -(ACTIVITY_DAYS - 1)),
            end: today,
            limit: ACTIVITY_LIMIT,
            offset: 0
        });
 
        const entries = data?.rows ?? [];
 
        list.innerHTML = entries.length === 0
            ? emptyState(
                "No recent activity",
                "Actions by admins, coaches and users will appear here."
            )
            : entries.map(activityItem).join("");
 
    } catch (error) {
 
        console.error("Unable to load recent activity:", error);
 
        list.innerHTML = emptyState(
            "Unable to load activity",
            "Please refresh the page to try again."
        );
    }
}

 
export async function loadDashboardPage() {
 
    if (!document.getElementById("total-users")) return;
 
    // independent of each other, so load them together
    await Promise.all([
        loadStatistics(),
        loadDashboardActivity()
    ]);
}
 