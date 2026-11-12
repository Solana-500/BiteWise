import {
    getPaymentsBySubscription,
    getLatestPayments
} from "../entity/payment-entity.js";


// Load payments associated with a subscription
export async function loadSubscriptionPayments(subscriptionId) {

    try {

        return await getPaymentsBySubscription(subscriptionId);

    } catch (error) {

        console.error(
            "Error loading subscription payments:",
            error
        );

        throw error;

    }

}

// Load the latest payment records for multiple subscriptions
export async function loadLatestSubscriptionPayments(subscriptionIds) {

    try {
        const payments = await getLatestPayments(subscriptionIds);

        // Keep only the latest payment for each subscription
        const latestPayments = {};

        payments.forEach(payment => {
            if (!latestPayments[payment.subscription_id]) {
                latestPayments[payment.subscription_id] = payment;
            }
        });

        return latestPayments;

    } catch (error) {
        console.error(
            "Error loading latest subscription payments:",
            error
        );
        throw error;
    }
}
