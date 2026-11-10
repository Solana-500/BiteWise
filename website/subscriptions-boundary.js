import {
    loadAllSubscriptions as getSubscriptions,
    cancelUserSubscription,
    loadSubscriptionHistory
} from "./subscription-controller.js";

import {
    loadSubscriptionPayments,
    loadLatestSubscriptionPayments
} from "./payment-controller.js";



let subscriptions = [];
let selectedSubscription = null;
let latestSubscriptionPayments = {};


/* ==============================================
   FUNCTIONS
============================================== */

// Helper functions
function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(date) {
    if (!date) return "â€”";

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

// Load subscriptions
export async function loadSubscriptionsPage() {

    const tableBody = document.getElementById(
        "subscription-table-body"
    );

    if (!tableBody) return;

    try {

        // Retrieve all subscriptions
        subscriptions = await getSubscriptions();

        // Retrieve the latest payment for each subscription
        const subscriptionIds = subscriptions.map(
            subscription => subscription.id
        );

        latestSubscriptionPayments =
            await loadLatestSubscriptionPayments(subscriptionIds);

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
                    ${subscription.plan
                        ? escapeHTML(formatStatus(subscription.plan))
                        : "â€”"}
                </td>

                <td>
                    ${formatDate(subscription.started_at)}
                </td>

                <td>
                    ${formatDate(subscription.expires_at)}
                </td>

                <td>
                    ${(() => {
                        const payment = latestSubscriptionPayments[subscription.id];

                        if (!payment) {
                            return `<span class="subscription-payment-status unknown">No payment</span>`;
                        }

                        const paymentStatus = String(
                            payment.status ?? ""
                        ).toLowerCase();

                        return `
                            <span class="subscription-payment-status ${escapeHTML(paymentStatus)}">
                                ${escapeHTML(formatStatus(paymentStatus))}
                            </span>
                        `;
                    })()}
                </td>

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


// Subscription details
async function openSubscriptionDetails(subscriptionId) {

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
    ).textContent = subscription.plan
        ? formatStatus(subscription.plan)
        : "â€”";

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
    ).textContent = subscription.payment_provider || "â€”";

    document.getElementById(
        "detail-provider-id"
    ).textContent = subscription.provider_subscription_id || "â€”";

    document.getElementById(
        "detail-user-id"
    ).textContent = subscription.user_id || "â€”";

    document.getElementById(
        "detail-user-name"
    ).textContent = subscription.user_name || "â€”";

    document.getElementById(
        "detail-user-email"
    ).textContent = subscription.user_email || "â€”";


    // Only show cancellation for active subscriptions
    const cancelButton = document.getElementById(
        "subscription-cancel-button"
    );

    cancelButton.hidden =
        String(subscription.status ?? "").toLowerCase() !== "active";


    document.getElementById(
        "subscription-details-modal"
    )?.classList.add("show");

    
    // Load payment information
    const paymentStatus = document.getElementById(
        "detail-payment-status"
    );

    const paymentAmount = document.getElementById(
        "detail-payment-amount"
    );

    const paymentMethod = document.getElementById(
        "detail-payment-method"
    );

    const paymentDate = document.getElementById(
        "detail-payment-date"
    );

    const transactionReference = document.getElementById(
        "detail-transaction-reference"
    );

    const paymentHistoryBody = document.getElementById(
        "subscription-payment-history-body"
    );

    // Reset payment information while loading
    paymentStatus.textContent = "Loading...";
    paymentAmount.textContent = "â€”";
    paymentMethod.textContent = "â€”";
    paymentDate.textContent = "â€”";
    transactionReference.textContent = "â€”";

    paymentHistoryBody.innerHTML = `
        <tr>
            <td colspan="4">Loading payment records...</td>
        </tr>
    `;

    try {
        const payments = await loadSubscriptionPayments(
            subscription.id
        );

        if (payments.length === 0) {
            paymentStatus.textContent = "No payment records";
            paymentHistoryBody.innerHTML = `
                <tr>
                    <td colspan="4">No payment records found.</td>
                </tr>
            `;
            return;
        }

        // Display the latest payment
        const latestPayment = payments[0];

        paymentStatus.textContent = formatStatus(
            latestPayment.status
        );

        paymentAmount.textContent =
            `${latestPayment.currency} ${Number(latestPayment.amount).toFixed(2)}`;

        paymentMethod.textContent =
            latestPayment.payment_method || "â€”";

        paymentDate.textContent =
            formatDate(latestPayment.payment_date);

        transactionReference.textContent =
            latestPayment.transaction_reference || "â€”";

        // Display payment history
        paymentHistoryBody.innerHTML = payments.map(payment => `
            <tr>
                <td>${escapeHTML(payment.transaction_reference || "â€”")}</td>
                <td>${escapeHTML(payment.currency)} ${Number(payment.amount).toFixed(2)}</td>
                <td>${escapeHTML(formatDate(payment.payment_date))}</td>
                <td>${escapeHTML(formatStatus(payment.status))}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Unable to display payment information:", error);

        paymentStatus.textContent = "Unable to load";
        paymentHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">Unable to load payment records.</td>
            </tr>
        `;
    }

    // Load subscription history
    const historyBody = document.getElementById(
        "subscription-history-body"
    );

    historyBody.innerHTML = `
        <tr>
            <td colspan="4">Loading subscription history...</td>
        </tr>
    `;

    try {

        const history = await loadSubscriptionHistory(
            subscription.id
        );

        if (history.length === 0) {

            historyBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No subscription history found.
                    </td>
                </tr>
            `;

        } else {

            historyBody.innerHTML = history.map(record => {

            let details = "â€”";
            let reasonHTML = "";

            switch (record.event_type) {
                case "created":
                    details = `${formatStatus(record.new_plan || "â€”")} plan activated`;
                    break;

                case "activated":
                    details = `${formatStatus(record.previous_status || "â€”")} â†’ ${formatStatus(record.new_status || "â€”")}`;
                    break;

                case "cancelled":
                    details = `${formatStatus(record.previous_status || "â€”")} â†’ ${formatStatus(record.new_status || "â€”")}`;

                    if (record.change_reason) {
                        reasonHTML = `
                            <small>
                                Reason: ${escapeHTML(record.change_reason)}
                            </small>
                        `;
                    }
                    break;

                case "expired":
                    details = `${formatStatus(record.previous_status || "â€”")} â†’ ${formatStatus(record.new_status || "â€”")}`;
                    break;

                case "plan_changed":
                    details = `${formatStatus(record.previous_plan || "â€”")} â†’ ${formatStatus(record.new_plan || "â€”")}`;
                    break;

                case "renewed":
                    details = `${formatStatus(record.new_plan || "â€”")} subscription renewed`;
                    break;

                case "status_changed":
                    details = `${formatStatus(record.previous_status || "â€”")} â†’ ${formatStatus(record.new_status || "â€”")}`;
                    break;

                default:
                    details = formatStatus(record.event_type);
            }

            return `
                <tr>
                    <td>${escapeHTML(formatDate(record.created_at))}</td>

                    <td>${escapeHTML(formatStatus(record.event_type))}</td>

                    <td>
                        <div class="subscription-history-details">
                            <span>${escapeHTML(details)}</span>
                            ${reasonHTML}
                        </div>
                    </td>

                    <td>${escapeHTML(formatStatus(record.changed_by || "system"))}</td>
                </tr>
            `;

        }).join("");

        }

    } catch (error) {

        console.error(
            "Unable to load subscription history:",
            error
        );

        historyBody.innerHTML = `
            <tr>
                <td colspan="4">
                    Unable to load subscription history.
                </td>
            </tr>
        `;

    }

}


function closeSubscriptionDetails() {

    document.getElementById(
        "subscription-details-modal"
    )?.classList.remove("show");

}


// Cancel subscription
function openCancelConfirmation() {

    if (!selectedSubscription) return;

    const reasonInput = document.getElementById(
        "subscription-cancellation-reason"
    );

    const notesInput = document.getElementById(
        "subscription-cancellation-notes"
    );

    const reasonError = document.getElementById(
        "subscription-cancellation-reason-error"
    );

    const messageElement = document.getElementById(
        "subscription-cancel-message"
    );


    // Reset previous form values
    reasonInput.value = "";
    notesInput.value = "";

    // Clear previous validation messages
    reasonError.textContent = "";
    reasonError.classList.remove("show");

    messageElement.textContent = "";
    messageElement.className = "subscription-form-message";


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

document.getElementById(
    "subscription-search"
)?.addEventListener("input", renderSubscriptions);


document.getElementById(
    "subscription-status-filter"
)?.addEventListener("change", renderSubscriptions);


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


document.getElementById(
    "subscription-details-close"
)?.addEventListener("click", closeSubscriptionDetails);


document.getElementById(
    "subscription-details-modal"
)?.addEventListener("click", event => {

    if (event.target.id === "subscription-details-modal") {
        closeSubscriptionDetails();
    }

});


document.getElementById(
    "subscription-cancel-button"
)?.addEventListener("click", openCancelConfirmation);

document.getElementById(
    "subscription-cancel-close"
)?.addEventListener("click", closeCancelConfirmation);

document.getElementById(
    "subscription-cancel-confirm-close"
)?.addEventListener("click", closeCancelConfirmation);

document.getElementById(
    "subscription-cancel-modal"
)?.addEventListener("click", event => {

    if (event.target.id === "subscription-cancel-modal") {
        closeCancelConfirmation();
    }

});


// Confirm subscription cancellation
document.getElementById(
    "subscription-cancel-confirm"
)?.addEventListener("click", async () => {

    if (!selectedSubscription) return;


    const reasonInput = document.getElementById(
        "subscription-cancellation-reason"
    );

    const notesInput = document.getElementById(
        "subscription-cancellation-notes"
    );

    const reasonError = document.getElementById(
        "subscription-cancellation-reason-error"
    );

    const messageElement = document.getElementById(
        "subscription-cancel-message"
    );

    const confirmButton = document.getElementById(
        "subscription-cancel-confirm"
    );


    const reason = reasonInput.value;
    const notes = notesInput.value.trim();


    reasonError.textContent = "";
    reasonError.classList.remove("show");

    messageElement.textContent = "";
    messageElement.className = "subscription-form-message";


    // Validate cancellation reason
    if (!reason) {

        reasonError.textContent =
            "Please select a cancellation reason.";

        reasonError.classList.add("show");

        reasonInput.focus();

        return;
    }


    if (reason === "Other" && !notes) {

        messageElement.textContent =
            "Please provide additional details when selecting Other.";

        messageElement.className =
            "subscription-form-message error show";

        notesInput.focus();

        return;
    }

    const cancellationReason = notes
        ? `${reason} - ${notes}`
        : reason;


    try {

        confirmButton.disabled = true;
        confirmButton.textContent = "Cancelling...";

        await cancelUserSubscription(
            selectedSubscription.id,
            cancellationReason
        );

        await loadSubscriptionsPage();

        closeCancelConfirmation();
        closeSubscriptionDetails();


    } catch (error) {

        console.error(
            "Failed to cancel subscription:",
            error
        );

        messageElement.textContent =
            error.message ||
            "Unable to cancel subscription. Please try again.";

        messageElement.className =
            "subscription-form-message error show";


    } finally {

        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm Cancellation";

    }

});



document.addEventListener("keydown", event => {

    if (event.key !== "Escape") return;

    closeSubscriptionDetails();
    closeCancelConfirmation();

});

