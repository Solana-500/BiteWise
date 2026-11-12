import { supabaseClient } from "../supabase-client.js";
 
 
// Record admin action
export async function logAdminAction(
    action,
    targetType = null,
    targetId = null,
    details = {}
) {
 
    try {
 
        const { error } = await supabaseClient.rpc(
            "log_admin_action",
            {
                p_action: action,
                p_target_type: targetType,
                p_target_id: targetId === null || targetId === undefined
                    ? null
                    : String(targetId),
                p_details: details
            }
        );
 
        if (error) {
            console.error("Unable to record audit log:", error.message);
        }
 
    } catch (error) {
        console.error("Unable to record audit log:", error);
    }
}
 
 
async function callAudit(functionName, label, args) {
 
    const { data, error } =
        await supabaseClient.rpc(functionName, args);
 
    if (error) {
        throw new Error(
            `Unable to load ${label}: ${error.message}`
        );
    }
 
    return data;
}
 
 
export function getAuditLogs(
    { start, end, action, role, search, limit, offset }
) {
    return callAudit("admin_audit_logs", "audit logs", {
        p_start: start,
        p_end: end,
        p_action: action || null,
        p_search: search || null,
        p_limit: limit,
        p_offset: offset,
        p_role: role || null
    });
}
 
 
export function getAuthEvents(
    { start, end, event, search, limit, offset }
) {
    return callAudit("admin_auth_events", "authentication events", {
        p_start: start,
        p_end: end,
        p_event: event || null,
        p_search: search || null,
        p_limit: limit,
        p_offset: offset
    });
}
 
 
export function getIntegrationFailures(
    { start, end, service, limit, offset }
) {
    return callAudit(
        "admin_integration_failures",
        "integration failures",
        {
            p_start: start,
            p_end: end,
            p_service: service || null,
            p_limit: limit,
            p_offset: offset
        }
    );
}
 
 
export function getSystemStatus() {
    return callAudit("admin_system_status", "system status", {});
}