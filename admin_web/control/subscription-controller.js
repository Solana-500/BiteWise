import {
    getAllSubscriptions
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