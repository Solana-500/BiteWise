import {
    getAuditLogs,
    getAuthEvents,
    getIntegrationFailures,
    getSystemStatus
} from "../entity/audit-entity.js";
 
 
export async function loadAuditLogs(filters) {
    return await getAuditLogs(filters);
}
 
export async function loadAuthEvents(filters) {
    return await getAuthEvents(filters);
}
 
export async function loadIntegrationFailures(filters) {
    return await getIntegrationFailures(filters);
}
 
export async function loadSystemStatus() {
    return await getSystemStatus();
}