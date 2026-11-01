import { supabaseClient } from "../supabase-client.js";


// Retrieve payment records for a subscription
export async function getPaymentsBySubscription(subscriptionId) {

    const { data: payments, error } = await supabaseClient
        .from("payments")
        .select(`
            id,
            subscription_id,
            amount,
            currency,
            payment_method,
            status,
            transaction_reference,
            payment_date,
            created_at
        `)
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(
            `Unable to load payment records: ${error.message}`
        );
    }

    return payments ?? [];

}

// Retrieve payment records for multiple subscriptions
export async function getLatestPayments(subscriptionIds) {

    if (!subscriptionIds || subscriptionIds.length === 0) {
        return [];
    }

    const { data: payments, error } = await supabaseClient
        .from("payments")
        .select(`
            id,
            subscription_id,
            status,
            payment_date,
            created_at
        `)
        .in("subscription_id", subscriptionIds)
        .order("payment_date", {
            ascending: false,
            nullsFirst: false
        })
        .order("created_at", {
            ascending: false
        });

    if (error) {
        throw new Error(
            `Unable to load latest payments: ${error.message}`
        );
    }

    return payments ?? [];
}