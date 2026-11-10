// Display helpers
 
export const DISPLAY_TIMEZONE = "Asia/Singapore";
 
 
export function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
 
 
export function setText(id, value) {
    const element = document.getElementById(id);
 
    if (element) {
        element.textContent = value;
    }
}
 
 
export function formatNumber(value) {
    return Number(value ?? 0).toLocaleString("en-GB");
}
 
 
export function capitalise(text) {
 
    const value = String(text ?? "");
 
    return value.charAt(0).toUpperCase() + value.slice(1);
}
 
 
// "coach.approved" or "user_signedup" -> "Coach approved" / "User signedup"
export function humanise(text) {
    return capitalise(
        String(text ?? "").replaceAll(".", " ").replaceAll("_", " ")
    );
}
 
 
// Today's date in Singapore time, as YYYY-MM-DD
export function todayString() {
    return new Intl.DateTimeFormat(
        "en-CA",
        { timeZone: DISPLAY_TIMEZONE }
    ).format(new Date());
}
 
 
export function shiftDays(dateString, delta) {
 
    const [year, month, day] = dateString
        .split("-")
        .map(Number);
 
    return new Date(
        Date.UTC(year, month - 1, day + delta)
    ).toISOString().slice(0, 10);
}
 
 
export function formatDay(dateString, withYear) {
 
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
 
 
// "1 Nov 2026, 11:42"
export function formatDateTime(value) {
 
    if (!value) return "—";
 
    return new Date(value).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: DISPLAY_TIMEZONE
    });
}
 
 
export function timeAgo(value) {
 
    if (!value) return "never";
 
    const minutes = Math.max(
        0,
        Math.round((Date.now() - new Date(value).getTime()) / 60000)
    );
 
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
 
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} h ago`;
 
    return `${Math.round(hours / 24)} days ago`;
}
 
 
export function formatBytes(bytes) {
 
    const value = Number(bytes ?? 0);
 
    if (value >= 1073741824) {
        return `${(value / 1073741824).toFixed(1)} GB`;
    }
 
    return `${Math.max(1, Math.round(value / 1048576))} MB`;
}
 
 
// Form validation for a date range. Returns an error message, or null.
export function validateDateRange(start, end, maxDays = 366) {
 
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
 
    if ((endTime - startTime) / 86400000 > maxDays) {
        return "Please choose a range of one year or less.";
    }
 
    return null;
}