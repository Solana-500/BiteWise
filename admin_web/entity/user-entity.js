import { supabaseClient } from "../supabase-client.js";



export async function getUsers() {

    const { data, error } =
        await supabaseClient.functions.invoke(
            "get-user-emails",
            {
                body: {}
            }
        );

    if (error) {
        throw error;
    }

    const users = data?.users || [];

    return users
        .filter(user => user.app_role === "user")
        .sort((a, b) =>
            (a.full_name || "").localeCompare(
                b.full_name || ""
            )
        );
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