import { supabaseClient } from "../supabase-client.js";
 
 
// Each report is one RPC call that returns data already aggregated
// in SQL (see admin_reports.sql).
async function callReport(functionName, label, startDate, endDate) {
 
    const { data, error } =
        await supabaseClient.rpc(
            functionName,
            {
                p_start: startDate,
                p_end: endDate
            }
        );
 
    if (error) {
        throw new Error(
            `Unable to load ${label} report: ${error.message}`
        );
    }
 
    return data;
}
 
 
export function getUsersReport(startDate, endDate) {
    return callReport(
        "admin_users_report",
        "users",
        startDate,
        endDate
    );
}
 
 
export function getSubscriptionsReport(startDate, endDate) {
    return callReport(
        "admin_subscriptions_report",
        "subscriptions",
        startDate,
        endDate
    );
}
 
 
export function getCoachesReport(startDate, endDate) {
    return callReport(
        "admin_coaches_report",
        "coaches",
        startDate,
        endDate
    );
}
 
 
export function getUsageReport(startDate, endDate) {
    return callReport(
        "admin_usage_report",
        "usage",
        startDate,
        endDate
    );
}
 
 
export function getContentReport(startDate, endDate) {
    return callReport(
        "admin_content_report",
        "content",
        startDate,
        endDate
    );
}