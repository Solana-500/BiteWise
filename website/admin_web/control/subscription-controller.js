import {
    getAllSubscriptions,
    cancelSubscription,
    getSubscriptionHistory
} from "../entity/subscription-entity.js";


export async function loadAllSubscriptions() {

    try {

        return await getAllSubscriptions();

    } catch (error) {

        console.error(
            "Error loading subscriptions:",
            error
        );

        throw error;

    }

}

export async function cancelUserSubscription(
    subscriptionId,
    cancellationReason
) {

    try {

        return await cancelSubscription(
            subscriptionId,
            cancellationReason
        );

    } catch (error) {

        console.error(
            "Error cancelling subscription:",
            error
        );

        throw error;

    }

}

export async function loadSubscriptionHistory(subscriptionId) {

    try {
        return await getSubscriptionHistory(subscriptionId);

    } catch (error) {

        console.error(
            "Error loading subscription history:",
            error
        );

        throw error;
    }
}