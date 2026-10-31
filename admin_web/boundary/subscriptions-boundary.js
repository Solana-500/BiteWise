import {
    loadAllSubscriptions as getSubscriptions
} from "../control/subscription-controller.js";


let subscriptions = [];
let selectedSubscription = null;


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function formatStatus(status) {
    if (!status) return "Unknown";

    return status
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}


function getStatusClass(status) {
    const normalised = String(status ?? "").toLowerCase();

    if (normalised === "active") return "active";
    if (normalised === "cancelled") return "cancelled";
    if (normalised === "expired") return "expired";

    return "unknown";
}


/* ==============================================
   FUNCTIONS
============================================== */

export async function loadSubscriptionsPage() {

    const tableBody = document.getElementById(
        "subscription-table-body"
    );

    if (!tableBody) return;

    try {

        subscriptions = await getSubscriptions();

        renderSubscriptions();

    } catch (error) {

        console.error(
            "Error loading subscriptions:",
            error
        );

        tableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="7">
                    <div class="table-empty-state">
                        <strong>Unable to load subscriptions</strong>
                        <span>Please try again later.</span>
                    </div>
                </td>
            </tr>
        `;

    }
}


function renderSubscriptions() {

    const tableBody = document.getElementById(
        "subscription-table-body"
    );

    if (!tableBody) return;

    const searchValue = document.getElementById(
        "subscription-search"
    )?.value.trim().toLowerCase() || "";

    const selectedStatus = document.getElementById(
        "subscription-status-filter"
    )?.value || "all";


    const filteredSubscriptions = subscriptions.filter(
        subscription => {

            const matchesSearch =
                String(subscription.user_name ?? "")
                    .toLowerCase()
                    .includes(searchValue) ||

                String(subscription.user_id ?? "")
                    .toLowerCase()
                    .includes(searchValue) ||

                String(subscription.user_email ?? "")
                    .toLowerCase()
                    .includes(searchValue) ||

                String(subscription.id ?? "")
                    .toLowerCase()
                    .includes(searchValue);


            const matchesStatus =
                selectedStatus === "all" ||
                String(subscription.status ?? "").toLowerCase()
                    === selectedStatus;

            return matchesSearch && matchesStatus;

        }
    );


    if (filteredSubscriptions.length === 0) {

        tableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="7">
                    <div class="table-empty-state">
                        <strong>No subscriptions found</strong>
                        <span>
                            Try adjusting your search or status filter.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML = filteredSubscriptions.map(
        subscription => `

            <tr>

                <td>
                    <strong>
                        ${escapeHTML(subscription.user_name)}
                    </strong>
                </td>

                <td>
                    ${subscription.plan ? escapeHTML(formatStatus(subscription.plan)) : "—"}
                </td>

                <td>
                    ${formatDate(subscription.started_at)}
                </td>

                <td>
                    ${formatDate(subscription.expires_at)}
                </td>

                <td>—</td>

                <td>
                    <span class="subscription-status ${getStatusClass(subscription.status)}">
                        ${escapeHTML(formatStatus(subscription.status))}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="coach-action-button view-subscription-button"
                        data-subscription-id="${escapeHTML(subscription.id)}"
                    >
                        View
                    </button>
                </td>

            </tr>

        `
    ).join("");

}

function openSubscriptionDetails(subscriptionId) {

    selectedSubscription = subscriptions.find(
        subscription => subscription.id === subscriptionId
    );

    if (!selectedSubscription) return;

    const subscription = selectedSubscription;

    document.getElementById(
        "subscription-details-user"
    ).textContent = subscription.user_name || "Unknown User";

    document.getElementById(
        "detail-plan"
    ).textContent = subscription.plan ? formatStatus(subscription.plan) : "—";

    document.getElementById(
        "detail-status"
    ).textContent = formatStatus(subscription.status);

    document.getElementById(
        "detail-started-at"
    ).textContent = formatDate(subscription.started_at);

    document.getElementById(
        "detail-expires-at"
    ).textContent = formatDate(subscription.expires_at);

    document.getElementById(
        "detail-payment-provider"
    ).textContent = subscription.payment_provider || "—";

    document.getElementById(
        "detail-provider-id"
    ).textContent = subscription.provider_subscription_id || "—";

    document.getElementById(
        "detail-user-id"
    ).textContent = subscription.user_id || "—";

    document.getElementById(
        "detail-user-name"
    ).textContent = subscription.user_name || "—";

    document.getElementById(
        "detail-user-email"
    ).textContent = subscription.user_email || "—";


    // Only show cancellation for active subscriptions
    const cancelButton = document.getElementById(
        "subscription-cancel-button"
    );

    cancelButton.hidden =
        String(subscription.status ?? "").toLowerCase() !== "active";


    document.getElementById(
        "subscription-details-modal"
    )?.classList.add("show");

}


function closeSubscriptionDetails() {

    document.getElementById(
        "subscription-details-modal"
    )?.classList.remove("show");

}


function openCancelConfirmation() {

    if (!selectedSubscription) return;

    document.getElementById(
        "subscription-cancel-modal"
    )?.classList.add("show");

}


function closeCancelConfirmation() {

    document.getElementById(
        "subscription-cancel-modal"
    )?.classList.remove("show");

}


/* ==============================================
   EVENT LISTENERS
============================================== */

// Search subscriptions
document.getElementById(
    "subscription-search"
)?.addEventListener("input", renderSubscriptions);


// Filter subscriptions
document.getElementById(
    "subscription-status-filter"
)?.addEventListener("change", renderSubscriptions);


// Open subscription details
document.getElementById(
    "subscription-table-body"
)?.addEventListener("click", event => {

    const button = event.target.closest(
        ".view-subscription-button"
    );

    if (!button) return;

    openSubscriptionDetails(
        button.dataset.subscriptionId
    );

});


// Close details modal
document.getElementById(
    "subscription-details-close"
)?.addEventListener("click", closeSubscriptionDetails);


// Close details modal when clicking outside
document.getElementById(
    "subscription-details-modal"
)?.addEventListener("click", event => {

    if (event.target.id === "subscription-details-modal") {
        closeSubscriptionDetails();
    }

});


// Open cancellation confirmation
document.getElementById(
    "subscription-cancel-button"
)?.addEventListener("click", openCancelConfirmation);


// Close cancellation confirmation
document.getElementById(
    "subscription-cancel-close"
)?.addEventListener("click", closeCancelConfirmation);

document.getElementById(
    "subscription-cancel-confirm-close"
)?.addEventListener("click", closeCancelConfirmation);


// Close cancellation confirmation when clicking outside
document.getElementById(
    "subscription-cancel-modal"
)?.addEventListener("click", event => {

    if (event.target.id === "subscription-cancel-modal") {
        closeCancelConfirmation();
    }

});


// Cancellation is intentionally not connected to Supabase yet.
// We will implement this after confirming the cancellation rules.
document.getElementById(
    "subscription-cancel-confirm"
)?.addEventListener("click", () => {

    alert(
        "Subscription cancellation is not connected yet."
    );

    closeCancelConfirmation();

});


document.addEventListener("keydown", event => {

    if (event.key !== "Escape") return;

    closeSubscriptionDetails();
    closeCancelConfirmation();

});