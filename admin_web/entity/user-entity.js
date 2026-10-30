import { supabaseClient } from "../supabase-client.js";

async function getEmailsById() {
    const { data, error } =
        await supabaseClient.functions.invoke(
            "get-user-emails",
            { body: {} }
        );

    if (error) {
        throw error;
    }

    return new Map(
        (data?.users || []).map(user => [user.id, user.email])
    );
}

export async function getUsers() {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                age,
                gender,
                activity_level,
                fitness_goal,
                subscription_tier,
                subscription_status,
                subscription_end_date,
                assigned_coach_id,
                is_suspended,
                created_at
            `)
            .eq("app_role", "user")
            .order("full_name", { ascending: true });

    if (error) {
        throw error;
    }

    const users = data || [];

    if (users.length === 0) {
        return [];
    }

    // Look up assigned coach names in one query
    const coachIds = [
        ...new Set(
            users
                .map(user => user.assigned_coach_id)
                .filter(Boolean)
        )
    ];

    let coachNameById = new Map();

    if (coachIds.length > 0) {
        const { data: coaches, error: coachError } =
            await supabaseClient
                .from("profiles")
                .select("id, full_name")
                .in("id", coachIds);

        if (coachError) {
            throw coachError;
        }

        coachNameById = new Map(
            (coaches || []).map(coach => [coach.id, coach.full_name])
        );
    }

    const emailById = await getEmailsById();

    return users.map(user => ({
        ...user,
        email: emailById.get(user.id) || null,
        assigned_coach_name:
            coachNameById.get(user.assigned_coach_id) || null
    }));
}


export async function updateUserSuspension(
    userId,
    isSuspended
) {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .update({
                is_suspended: isSuspended
            })
            .eq("id", userId)
            .eq("app_role", "user")
            .select("id, is_suspended");

    if (error) {
        throw error;
    }

    if (!data || data.length === 0) {
        throw new Error(
            "No user account was updated."
        );
    }

    return data[0];
}

export function getFilteredUsers(
    users,
    searchTerm,
    status
) {

    const normalizedSearch =
        searchTerm
            .trim()
            .toLowerCase();

    return users.filter((user) => {

        const userName =
            (user.full_name || "")
                .toLowerCase();

        const matchesSearch =
            userName.includes(
                normalizedSearch
            );

        let matchesStatus = true;

        if (status === "active") {
            matchesStatus =
                !user.is_suspended;
        }

        if (status === "suspended") {
            matchesStatus =
                user.is_suspended;
        }

        return (
            matchesSearch &&
            matchesStatus
        );
    });
}