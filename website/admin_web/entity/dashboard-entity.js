import { supabaseClient } from "../supabase-client.js";
 
 
async function countRows(table, filters = {}) {
 
    let query = supabaseClient
        .from(table)
        .select("*", { count: "exact", head: true });
 
    Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
    });
 
    const { count, error } = await query;
 
    if (error) throw error;
 
    return count ?? 0;
}
 

async function safeCount(label, table, filters) {
 
    try {
        return await countRows(table, filters);
    } catch (error) {
        console.error(`Error loading ${label}:`, error.message);
        return null;
    }
}
 
 
export async function getDashboardStatistics() {
 
    const [
        users,
        coaches,
        pendingCoaches,
        pendingMeals,
        pendingWorkouts
    ] = await Promise.all([
        safeCount("user count", "profiles", { app_role: "user" }),
        safeCount("coach count", "profiles", {
            app_role: "coach",
            approval_status: "approved"
        }),
        safeCount("pending coach applications", "profiles", {
            app_role: "coach",
            approval_status: "pending"
        }),
        safeCount("pending meal plans", "meal_plans", {
            status: "pending_review"
        }),
        safeCount("pending workout plans", "workout_plans", {
            status: "pending_review"
        })
    ]);
 
    return {
        users,
        coaches,
        pendingCoaches,
        pendingContent:
            pendingMeals === null || pendingWorkouts === null
                ? null
                : pendingMeals + pendingWorkouts
    };
}