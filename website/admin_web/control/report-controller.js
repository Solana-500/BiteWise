import {
    getUsersReport,
    getSubscriptionsReport,
    getCoachesReport,
    getUsageReport,
    getContentReport
} from "../entity/report-entity.js";
 
 
export async function loadUsersReport(start, end) {
    return await getUsersReport(start, end);
}
 
export async function loadSubscriptionsReport(start, end) {
    return await getSubscriptionsReport(start, end);
}
 
export async function loadCoachesReport(start, end) {
    return await getCoachesReport(start, end);
}
 
export async function loadUsageReport(start, end) {
    return await getUsageReport(start, end);
}
 
export async function loadContentReport(start, end) {
    return await getContentReport(start, end);
}