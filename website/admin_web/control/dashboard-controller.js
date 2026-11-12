import { getDashboardStatistics } from "../entity/dashboard-entity.js";
 
 
export async function loadDashboardStatistics() {
    return await getDashboardStatistics();
}