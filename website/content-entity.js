import { supabaseClient } from "../supabase-client.js";

const CONTENT_TABLES = {
    meal: "meal_plans",
    workout: "workout_plans"
};


export async function getMealPlans() {
    const { data, error } = await supabaseClient
        .from(CONTENT_TABLES.meal)
        .select(`
            id,
            coach_id,
            client_id,
            title,
            goal,
            duration,
            daily_calorie_target,
            coach_notes,
            status,
            admin_feedback,
            submitted_at,
            reviewed_at,
            reviewed_by,
            start_date,
            end_date,
            created_at,
            updated_at
        `)
        .order("submitted_at", { ascending: false });

    if (error) {
        throw new Error(`Unable to load meal plans: ${error.message}`);
    }

    const plans = data ?? [];

    if (plans.length === 0) {
        return [];
    }

    // Retrieve coach names
    const coachIds = [
        ...new Set(plans.map(plan => plan.coach_id).filter(Boolean))
    ];

    let coachNameMap = {};

    if (coachIds.length > 0) {
        const { data: coaches, error: coachError } = await supabaseClient
            .from("profiles")
            .select("id, full_name")
            .in("id", coachIds);

        if (coachError) {
            console.error("Unable to load meal plan coach names:", coachError.message);
        } else {
            coachNameMap = Object.fromEntries(
                (coaches ?? []).map(coach => [
                    coach.id,
                    coach.full_name
                ])
            );
        }
    }

    return plans.map(plan => ({
        ...plan,
        coach_name: coachNameMap[plan.coach_id] || "Unknown Coach",
        content_type: "meal"
    }));
}


export async function getWorkoutPlans() {
    const { data, error } = await supabaseClient
        .from(CONTENT_TABLES.workout)
        .select(`
            id,
            coach_id,
            client_id,
            title,
            goal,
            duration_weeks,
            sessions_per_week,
            session_length_minutes,
            training_location,
            experience_level,
            equipment,
            preferred_days,
            health_notes,
            coach_notes,
            status,
            admin_feedback,
            submitted_at,
            created_at,
            updated_at
        `)
        .order("submitted_at", { ascending: false });

    if (error) {
        throw new Error(`Unable to load workout plans: ${error.message}`);
    }

    const plans = data ?? [];

    if (plans.length === 0) {
        return [];
    }

    // Retrieve coach names
    const coachIds = [
        ...new Set(plans.map(plan => plan.coach_id).filter(Boolean))
    ];

    let coachNameMap = {};

    if (coachIds.length > 0) {
        const { data: coaches, error: coachError } = await supabaseClient
            .from("profiles")
            .select("id, full_name")
            .in("id", coachIds);

        if (coachError) {
            console.error("Unable to load coach names:", coachError.message);
        } else {
            coachNameMap = Object.fromEntries(
                (coaches ?? []).map(coach => [
                    coach.id,
                    coach.full_name
                ])
            );
        }
    }

    return plans.map(plan => ({
        ...plan,
        coach_name: coachNameMap[plan.coach_id] || "Unknown Coach",
        content_type: "workout"
    }));
}

export async function getAllCoachContent() {
    const [mealPlans, workoutPlans] = await Promise.all([
        getMealPlans(),
        getWorkoutPlans()
    ]);

    return [...mealPlans, ...workoutPlans].sort((a, b) => {
        const dateA = new Date(a.submitted_at ?? a.created_at ?? 0).getTime();
        const dateB = new Date(b.submitted_at ?? b.created_at ?? 0).getTime();

        return dateB - dateA;
    });
}


export async function updateContentStatus({
    contentType,
    contentId,
    status,
    adminFeedback,
    adminId
}) {
    const allowedStatuses = [
        "approved",
        "changes_requested"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid content moderation status.");
    }

    const table = CONTENT_TABLES[contentType];

    if (!table) {
        throw new Error("Invalid content type.");
    }

    const updates = {
        status,
        admin_feedback: status === "changes_requested"
            ? String(adminFeedback ?? "").trim()
            : null
    };

    if (status === "changes_requested" && !updates.admin_feedback) {
        throw new Error("Admin feedback is required when rejecting content.");
    }

    // Only meal_plans has these columns.
    if (contentType === "meal") {
        updates.reviewed_at = new Date().toISOString();
        updates.reviewed_by = adminId;
    }

    const { data, error } = await supabaseClient
        .from(table)
        .update(updates)
        .eq("id", contentId)
        .eq("status", "pending_review")
        .select("id, status, admin_feedback")
        .single();

    if (error) {
        throw new Error(`Unable to moderate content: ${error.message}`);
    }

    return data;
}


export async function getWorkoutPlanDetails(planId) {
    const { data: days, error: daysError } = await supabaseClient
        .from("workout_plan_days")
        .select(`
            id,
            plan_id,
            day_name,
            day_order,
            title,
            focus
        `)
        .eq("plan_id", planId)
        .order("day_order", { ascending: true });

    if (daysError) {
        throw new Error(
            `Unable to load workout sessions: ${daysError.message}`
        );
    }

    if (!days || days.length === 0) {
        return [];
    }

    const dayIds = days.map(day => day.id);

    const { data: exercises, error: exercisesError } = await supabaseClient
        .from("workout_plan_exercises")
        .select(`
            id,
            day_id,
            exercise_order,
            name,
            category,
            sets,
            reps,
            rest_seconds,
            load,
            equipment,
            notes
        `)
        .in("day_id", dayIds)
        .order("exercise_order", { ascending: true });

    if (exercisesError) {
        throw new Error(
            `Unable to load workout exercises: ${exercisesError.message}`
        );
    }

    return days.map(day => ({
        ...day,
        exercises: (exercises ?? []).filter(
            exercise => exercise.day_id === day.id
        )
    }));
}
