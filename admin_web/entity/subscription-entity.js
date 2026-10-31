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

// Load all subscription records with their users
export async function getAllSubscriptions() {

    const { data: subscriptions, error } = await supabaseClient
        .from("subscriptions")
        .select(`
            id,
            user_id,
            plan,
            status,
            started_at,
            expires_at,
            payment_provider,
            provider_subscription_id
        `)
        .order("started_at", { ascending: false });

    if (error) {
        throw new Error(
            `Unable to load subscriptions: ${error.message}`
        );
    }

    const records = subscriptions ?? [];

    if (records.length === 0) {
        return [];
    }

    // Retrieve the associated user profiles.
    const userIds = [
        ...new Set(
            records
                .map(subscription => subscription.user_id)
                .filter(Boolean)
        )
    ];

    let userMap = {};

    if (userIds.length > 0) {

        const { data: users, error: userError } = await supabaseClient
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

        if (userError) {
            console.error(
                "Unable to load subscription users:",
                userError.message
            );
        } else {

            userMap = Object.fromEntries(
                (users ?? []).map(user => [
                    user.id,
                    user
                ])
            );

        }
    }

    // Retrieve emails
    let emailById = new Map();

    try {
        emailById = await getEmailsById();
    } catch (emailError) {
        console.error(
            "Unable to load user emails:",
            emailError.message
        );
    }

    // Combine subscription records with user information
    return records.map(subscription => ({
        ...subscription,
        user_name: userMap[subscription.user_id]?.full_name
            || "Unknown User",
        user_email: emailById.get(subscription.user_id) || null
    }));

}