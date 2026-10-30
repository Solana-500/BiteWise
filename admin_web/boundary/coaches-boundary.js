import {
    loadCoachApplications as getApplications,
    loadApprovedCoaches as getApproved,
    loadSuspendedCoaches as getSuspended,
    loadCoachCredentials as getCoachCredentials,
    openCoachCredential as getCoachCredentialUrl,
    approveCoach,
    rejectCoach,
    suspendCoach,
    reactivateCoach,
    searchCoaches
} from "../control/coach-controller.js";

import { loadContentForCoach } from "../control/content-controller.js";

let coachApplications = [];
let approvedCoaches = [];
let suspendedCoaches = [];
let selectedCoachApplication = null;
let selectedApprovedCoach = null;
let selectedSuspendedCoach = null;

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatSpecialties(specialties) {
    if (!specialties) {
        return "Not provided";
    }

    if (Array.isArray(specialties)) {
        return specialties
            .map((specialty) => escapeHTML(specialty))
            .join(", ");
    }

    return escapeHTML(specialties);
}

function renderSpecialtyTags(containerId, specialties) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.replaceChildren();

    const items = Array.isArray(specialties)
        ? specialties
        : String(specialties || "")
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);

    if (items.length === 0) {
        container.textContent = "Not provided";
        return;
    }

    items.forEach(specialty => {
        const tag = document.createElement("span");
        tag.className = "specialty-tag";
        tag.textContent = specialty;
        container.appendChild(tag);
    });
}

function formatExperience(years) {
    if (
        years === null ||
        years === undefined ||
        years === ""
    ) {
        return "Not provided";
    }

    const value = Number(years);

    return `${escapeHTML(years)} ${
        value === 1 ? "year" : "years"
    }`;
}

/* =========================================
   COACH TABLES (render + search)
========================================= */

function emptyRowHTML(title, message) {
    return `
        <tr class="table-empty-row">
            <td colspan="6">
                <div class="table-empty-state">
                    <strong>${title}</strong>
                    <span>${message}</span>
                </div>
            </td>
        </tr>
    `;
}

function coachRowHTML(coach, { fallbackName, statusClass, statusLabel, buttonClass }) {
    return `
        <tr>
            <td>
                <strong>${escapeHTML(coach.full_name || fallbackName)}</strong>
            </td>
            <td>${escapeHTML(coach.email || "Email unavailable")}</td>
            <td>${formatSpecialties(coach.coaching_specialty)}</td>
            <td>${formatExperience(coach.years_experience)}</td>
            <td>
                <span class="coach-status ${statusClass}">${statusLabel}</span>
            </td>
            <td>
                <button
                    type="button"
                    class="coach-action-button ${buttonClass}"
                    data-coach-id="${escapeHTML(coach.id)}"
                >
                    View
                </button>
            </td>
        </tr>
    `;
}

function renderCoachTable({
    tableBodyId,
    searchInputId,
    coaches,
    row,
    emptyTitle,
    emptyMessage
}) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;

    const query = document.getElementById(searchInputId)?.value.trim() ?? "";
    const results = searchCoaches(coaches, query);

    if (results.length === 0) {
        tableBody.innerHTML = query
            ? emptyRowHTML(
                "No matching results",
                "Try a different name, email or specialty."
            )
            : emptyRowHTML(emptyTitle, emptyMessage);
        return;
    }

    tableBody.innerHTML = results
        .map(coach => coachRowHTML(coach, row))
        .join("");
}

function renderApplicationsTable() {
    renderCoachTable({
        tableBodyId: "applications-table-body",
        searchInputId: "application-search",
        coaches: coachApplications,
        row: {
            fallbackName: "Unnamed Applicant",
            statusClass: "pending",
            statusLabel: "Pending",
            buttonClass: "review-coach-button"
        },
        emptyTitle: "No pending applications",
        emptyMessage: "New Health Coach applications will appear here."
    });
}

function renderApprovedTable() {
    renderCoachTable({
        tableBodyId: "approved-table-body",
        searchInputId: "approved-search",
        coaches: approvedCoaches,
        row: {
            fallbackName: "Unnamed Coach",
            statusClass: "active",
            statusLabel: "Active",
            buttonClass: "view-approved-coach-button"
        },
        emptyTitle: "No approved coaches",
        emptyMessage: "Approved Health Coaches will appear here."
    });
}

function renderSuspendedTable() {
    renderCoachTable({
        tableBodyId: "suspended-table-body",
        searchInputId: "suspended-search",
        coaches: suspendedCoaches,
        row: {
            fallbackName: "Unnamed Coach",
            statusClass: "suspended",
            statusLabel: "Suspended",
            buttonClass: "view-suspended-coach-button"
        },
        emptyTitle: "No suspended coaches",
        emptyMessage: "Suspended Health Coaches will appear here."
    });
}

// Load coach applications
async function loadCoachApplications() {
    const tableBody = document.getElementById("applications-table-body");
    const countElement = document.getElementById("applications-count");

    if (!tableBody) return;

    try {
        coachApplications = await getApplications();

        if (countElement) countElement.textContent = coachApplications.length;

        renderApplicationsTable();
    } catch (error) {
        console.error("Error loading coach applications:", error);

        if (countElement) countElement.textContent = "—";

        tableBody.innerHTML = emptyRowHTML(
            "Unable to load applications",
            "Please try again later."
        );
    }
}

// Load approved coaches
async function loadApprovedCoaches() {
    const tableBody = document.getElementById("approved-table-body");
    const countElement = document.getElementById("approved-count");

    if (!tableBody) return;

    try {
        approvedCoaches = await getApproved();

        if (countElement) countElement.textContent = approvedCoaches.length;

        renderApprovedTable();
    } catch (error) {
        console.error("Error loading approved coaches:", error);

        if (countElement) countElement.textContent = "—";

        tableBody.innerHTML = emptyRowHTML(
            "Unable to load approved coaches",
            "Please try again later."
        );
    }
}

// Load suspended coaches
async function loadSuspendedCoaches() {
    const tableBody = document.getElementById("suspended-table-body");
    const countElement = document.getElementById("suspended-count");

    if (!tableBody) return;

    try {
        suspendedCoaches = await getSuspended();

        if (countElement) countElement.textContent = suspendedCoaches.length;

        renderSuspendedTable();
    } catch (error) {
        console.error("Error loading suspended coaches:", error);

        if (countElement) countElement.textContent = "—";

        tableBody.innerHTML = emptyRowHTML(
            "Unable to load suspended coaches",
            "Please try again later."
        );
    }
}

// Search inputs
function setupCoachSearch() {
    [
        ["application-search", renderApplicationsTable],
        ["approved-search", renderApprovedTable],
        ["suspended-search", renderSuspendedTable]
    ].forEach(([inputId, render]) => {
        document
            .getElementById(inputId)
            ?.addEventListener("input", render);
    });
}

setupCoachSearch();

// Load coach credentials
async function loadCoachCredentials(
    coachId,
    containerId = "coach-credentials-container",
    countId = "credential-count"
) {
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countId);

    if (!container) return;

    container.innerHTML = `
        <div class="credential-empty-state">
            Loading credentials...
        </div>
    `;

    try {
        const documents = await getCoachCredentials(coachId);

        if (countElement) {
            countElement.textContent =
                `${documents.length} document${documents.length === 1 ? "" : "s"}`;
        }

        if (documents.length === 0) {
            container.innerHTML = `
                <div class="credential-empty-state">
                    No credentials uploaded.
                </div>
            `;
            return;
        }

        container.innerHTML = documents.map(document => `
            <div class="credential-card">
                <div class="credential-info">
                    <strong>
                        ${escapeHTML(document.file_name || "Unnamed file")}
                    </strong>
                    <span>
                        ${escapeHTML(document.file_type || "Unknown file type")}
                    </span>
                </div>

                <button
                    type="button"
                    class="credential-view-button"
                    data-file-path="${escapeHTML(document.file_path || "")}"
                    ${document.file_path ? "" : "disabled"}
                >
                    View document ↗
                </button>
            </div>
        `).join("");

    } catch (error) {
        console.error("Error loading coach credentials:", error);

        container.innerHTML = `
            <div class="credential-empty-state">
                Unable to load credentials.
            </div>
        `;
    }
}


async function loadCoachContent(coachId, containerId, countId, linkId) {
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countId);
    const viewAllLink = document.getElementById(linkId);

    if (!container) return;

    container.innerHTML = `
        <div class="credential-empty-state">
            Loading content...
        </div>
    `;

    if (viewAllLink) {
        viewAllLink.href =
            `admin-content.html?coach_id=${encodeURIComponent(coachId)}`;
    }

    try {
        const items = await loadContentForCoach(coachId);

        if (countElement) {
            countElement.textContent =
                `${items.length} item${items.length === 1 ? "" : "s"}`;
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div class="credential-empty-state">
                    No content created by this coach.
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
        const typeLabel = item.content_type === "meal"
            ? "Meal Plan"
            : "Workout Plan";

        const statusMap = {
            pending_review:    { label: "Pending Review",    className: "pending" },
            approved:          { label: "Approved",          className: "approved" },
            active:            { label: "Approved",          className: "approved" },
            changes_requested: { label: "Changes Requested", className: "changes" },
            rejected:          { label: "Rejected",          className: "rejected" }
        };

        const status = statusMap[item.status] ?? {
            label: item.status || "Unknown",
            className: "neutral"
        };

        return `
            <div class="coach-content-item">
                <div class="coach-content-info">
                    <strong>${escapeHTML(item.title || "Untitled")}</strong>
                    <span>${typeLabel}</span>
                </div>

                <span class="content-status ${status.className}">
                    ${escapeHTML(status.label)}
                </span>
            </div>
        `;
    }).join("");

    } catch (error) {
        console.error("Error loading coach content:", error);

        container.innerHTML = `
            <div class="credential-empty-state">
                Unable to load coach content.
            </div>
        `;
    }
}


async function handleOpenCoachCredential(filePath) {
    try {
        const signedUrl = await getCoachCredentialUrl(filePath);

        window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
        console.error("Error opening coach credential:", error);
        alert(error.message || "Unable to open this credential.");
    }
}


document.addEventListener("click", event => {
    const button = event.target.closest(".credential-view-button");

    if (!button) return;

    const filePath = button.dataset.filePath;

    if (filePath) {
        handleOpenCoachCredential(filePath);
    }
});



async function handleReviewCoachApplication(coachId) {
    const coach = coachApplications.find(
        application => application.id === coachId
    );

    if (!coach) {
        alert("Coach application not found.");
        return;
    }

    selectedCoachApplication = coach;

    document.getElementById("review-coach-name").textContent =
        coach.full_name || "Unknown Coach";

    document.getElementById("review-age").textContent =
        coach.age ?? "Not provided";

    document.getElementById("review-gender").textContent =
        coach.gender || "Not provided";

    // No. of experience
    document.getElementById("review-experience-summary").textContent =
        coach.years_experience != null
            ? `${coach.years_experience} years`
            : "Not provided";

    // Specialties
    const specialtiesContainer =
        document.getElementById("review-specialties");

    specialtiesContainer.replaceChildren();

    const specialties = Array.isArray(coach.coaching_specialty)
        ? coach.coaching_specialty
        : String(coach.coaching_specialty || "")
            .split(",")
            .map(specialty => specialty.trim())
            .filter(Boolean);

    if (specialties.length > 0) {
        specialties.forEach(specialty => {
            const tag = document.createElement("span");
            tag.className = "specialty-tag";
            tag.textContent = specialty;

            specialtiesContainer.appendChild(tag);
        });
    } else {
        specialtiesContainer.textContent = "Not provided";
    }

    // Email 
    const emailElement = document.getElementById("review-email");
    if (emailElement) {
        emailElement.textContent = coach.email || "Email unavailable";
    }

    // Application date
    const appliedDateElement =
        document.getElementById("review-applied-date");

    if (appliedDateElement) {
        appliedDateElement.textContent = coach.created_at
            ? `Applied ${new Date(coach.created_at).toLocaleDateString(
                "en-GB",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            )}`
            : "Application date unavailable";
    }

    const modal = document.getElementById("coach-review-modal");

    if (modal) {
        modal.style.display = "flex";
    }

    await loadCoachCredentials(coachId);
}

function closeCoachReviewModal() {
    const modal = document.getElementById("coach-review-modal");

    if (modal) {
        modal.style.display = "none";
    }

    selectedCoachApplication = null;
}

function setupCoachReviewModal() {
    const closeButton = document.getElementById("coach-review-close");

    if (closeButton) {
        closeButton.addEventListener("click", closeCoachReviewModal);
    }

    const applicationsTable = document.getElementById(
        "applications-table-body"
    );

    if (applicationsTable) {
        applicationsTable.addEventListener("click", event => {
            const button = event.target.closest(
                ".review-coach-button, .coach-action-button"
            );

            if (!button || !applicationsTable.contains(button)) return;

            handleReviewCoachApplication(button.dataset.coachId);
        });
    }
}

setupCoachReviewModal();


async function handleApproveCoachApplication() {
    if (!selectedCoachApplication) {
        alert("No coach application selected.");
        return;
    }

    const coachId = selectedCoachApplication.id;
    const button = document.getElementById("approve-application");

    try {
        if (button) button.disabled = true;

        await approveCoach(coachId);

        closeCoachReviewModal();

        await Promise.all([
            loadCoachApplications(),
            loadApprovedCoaches(),
            loadSuspendedCoaches()
        ]);
    } catch (error) {
        console.error("Error approving coach:", error);
        alert(error.message || "Unable to approve coach application.");
    } finally {
        if (button) button.disabled = false;
    }
}

async function handleRejectCoachApplication() {
    if (!selectedCoachApplication) {
        alert("No coach application selected.");
        return;
    }

    const coachId = selectedCoachApplication.id;
    const button = document.getElementById("confirm-reject");

    try {
        if (button) button.disabled = true;

        await rejectCoach(coachId);

        closeCoachReviewModal();

        const confirmationModal = document.getElementById("reject-confirm-modal");

        if (confirmationModal) {
            confirmationModal.style.display = "none";
        }

        await loadCoachApplications();
    } catch (error) {
        console.error("Error rejecting coach:", error);
        alert(error.message || "Unable to reject coach application.");
    } finally {
        if (button) button.disabled = false;
    }
}

function setupCoachApplicationActions() {
    const approveButton = document.getElementById("approve-application");

    if (approveButton) {
        approveButton.addEventListener("click", handleApproveCoachApplication);
    }

    const rejectButton = document.getElementById("reject-application");
    const rejectModal = document.getElementById("reject-confirm-modal");

    if (rejectButton && rejectModal) {
        rejectButton.addEventListener("click", () => {
            rejectModal.style.display = "flex";
        });
    }

    const closeRejectButton = document.getElementById("reject-confirm-close");
    const cancelRejectButton = document.getElementById("cancel-reject");

    [closeRejectButton, cancelRejectButton].forEach(button => {
        if (button) {
            button.addEventListener("click", () => {
                rejectModal.style.display = "none";
            });
        }
    });

    const confirmRejectButton = document.getElementById("confirm-reject");

    if (confirmRejectButton) {
        confirmRejectButton.addEventListener(
            "click",
            handleRejectCoachApplication
        );
    }
}

setupCoachApplicationActions();


async function handleSuspendCoach() {
    if (!selectedApprovedCoach) {
        alert("No approved coach selected.");
        return;
    }

    const button = document.getElementById("confirm-suspend");

    try {
        if (button) button.disabled = true;

        await suspendCoach(selectedApprovedCoach.id);

        document.getElementById("suspend-confirm-modal").style.display = "none";
        document.getElementById("approved-coach-modal").style.display = "none";

        selectedApprovedCoach = null;

        await Promise.all([
            loadApprovedCoaches(),
            loadSuspendedCoaches()
        ]);
    } catch (error) {
        console.error("Error suspending coach:", error);
        alert(error.message || "Unable to suspend coach.");
    } finally {
        if (button) button.disabled = false;
    }
}

async function handleReactivateCoach() {
    if (!selectedSuspendedCoach) {
        alert("No suspended coach selected.");
        return;
    }

    const button = document.getElementById("confirm-reactivate");

    try {
        if (button) button.disabled = true;

        await reactivateCoach(selectedSuspendedCoach.id);

        document.getElementById("reactivate-confirm-modal").style.display = "none";
        document.getElementById("suspended-coach-modal").style.display = "none";

        selectedSuspendedCoach = null;

        await Promise.all([
            loadApprovedCoaches(),
            loadSuspendedCoaches()
        ]);
    } catch (error) {
        console.error("Error reactivating coach:", error);
        alert(error.message || "Unable to reactivate coach.");
    } finally {
        if (button) button.disabled = false;
    }
}

function setupCoachStatusActions() {
    const approvedTable = document.getElementById("approved-table-body");
    const suspendedTable = document.getElementById("suspended-table-body");

    if (approvedTable) {
        approvedTable.addEventListener("click", event => {
            const button = event.target.closest(
                ".view-approved-coach-button, .coach-action-button"
            );

            if (!button || !approvedTable.contains(button)) return;

            selectedApprovedCoach = approvedCoaches.find(
                coach => coach.id === button.dataset.coachId
            );

            if (!selectedApprovedCoach) return;

            document.getElementById("approved-coach-name").textContent =
                selectedApprovedCoach.full_name || "Unknown Coach";

            document.getElementById("approved-coach-initials").textContent =
                (selectedApprovedCoach.full_name || "C")
                    .split(/\s+/)
                    .map(part => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

            document.getElementById("approved-coach-age").textContent =
                selectedApprovedCoach.age ?? "Not provided";

            document.getElementById("approved-coach-gender").textContent =
                selectedApprovedCoach.gender || "Not provided";

            renderSpecialtyTags(
                "approved-coach-specialties",
                selectedApprovedCoach.coaching_specialty
            );

            document.getElementById("approved-coach-experience").textContent =
                selectedApprovedCoach.years_experience != null
                    ? formatExperience(selectedApprovedCoach.years_experience)
                    : "Not provided";

            const approvedEmailElement =
                document.getElementById("approved-coach-email");

            if (approvedEmailElement) {
                approvedEmailElement.textContent =
                    selectedApprovedCoach.email || "Email unavailable";
            }

            document.getElementById("approved-coach-modal").style.display = "flex";

            loadCoachCredentials(
                selectedApprovedCoach.id,
                "approved-coach-credentials-container",
                "approved-credential-count"
            );

            loadCoachContent(
                selectedApprovedCoach.id,
                "approved-coach-content-container",
                "approved-content-count",
                "approved-view-all-content"
            );
        });
    }

    if (suspendedTable) {
        suspendedTable.addEventListener("click", event => {
            const button = event.target.closest(
                ".view-suspended-coach-button, .coach-action-button"
            );

            if (!button || !suspendedTable.contains(button)) return;

            selectedSuspendedCoach = suspendedCoaches.find(
                coach => coach.id === button.dataset.coachId
            );

            if (!selectedSuspendedCoach) return;

            document.getElementById("suspended-coach-name").textContent =
                selectedSuspendedCoach.full_name || "Unknown Coach";

            document.getElementById("suspended-coach-initials").textContent =
                (selectedSuspendedCoach.full_name || "C")
                    .split(/\s+/)
                    .map(part => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

            document.getElementById("suspended-coach-age").textContent =
                selectedSuspendedCoach.age ?? "Not provided";

            document.getElementById("suspended-coach-gender").textContent =
                selectedSuspendedCoach.gender || "Not provided";

            renderSpecialtyTags(
                "suspended-coach-specialties",
                selectedSuspendedCoach.coaching_specialty
            );

            document.getElementById("suspended-coach-experience").textContent =
                selectedSuspendedCoach.years_experience != null
                    ? formatExperience(selectedSuspendedCoach.years_experience)
                    : "Not provided";

            const suspendedEmailElement =
                document.getElementById("suspended-coach-email");

            if (suspendedEmailElement) {
                suspendedEmailElement.textContent =
                    selectedSuspendedCoach.email || "Email unavailable";
            }

            document.getElementById("suspended-coach-modal").style.display = "flex";

            loadCoachCredentials(
                selectedSuspendedCoach.id,
                "suspended-coach-credentials-container",
                "suspended-credential-count"
            );

            loadCoachContent(
                selectedSuspendedCoach.id,
                "suspended-coach-content-container",
                "suspended-content-count",
                "suspended-view-all-content"
            );
        });
    }

    const suspendButton = document.getElementById("suspend-coach");
    const suspendModal = document.getElementById("suspend-confirm-modal");

    if (suspendButton && suspendModal) {
        suspendButton.addEventListener("click", () => {
            suspendModal.style.display = "flex";
        });
    }

    const reactivateButton = document.getElementById("reactivate-coach");
    const reactivateModal = document.getElementById("reactivate-confirm-modal");

    if (reactivateButton && reactivateModal) {
        reactivateButton.addEventListener("click", () => {
            reactivateModal.style.display = "flex";
        });
    }

    const suspendCloseButtons = [
        document.getElementById("suspend-confirm-close"),
        document.getElementById("cancel-suspend")
    ];

    suspendCloseButtons.forEach(button => {
        if (button) {
            button.addEventListener("click", () => {
                suspendModal.style.display = "none";
            });
        }
    });

    const reactivateCloseButtons = [
        document.getElementById("reactivate-confirm-close"),
        document.getElementById("cancel-reactivate")
    ];

    reactivateCloseButtons.forEach(button => {
        if (button) {
            button.addEventListener("click", () => {
                reactivateModal.style.display = "none";
            });
        }
    });

    const approvedClose = document.getElementById("approved-coach-close");
    const suspendedClose = document.getElementById("suspended-coach-close");

    if (approvedClose) {
        approvedClose.addEventListener("click", () => {
            document.getElementById("approved-coach-modal").style.display = "none";
            selectedApprovedCoach = null;
        });
    }

    if (suspendedClose) {
        suspendedClose.addEventListener("click", () => {
            document.getElementById("suspended-coach-modal").style.display = "none";
            selectedSuspendedCoach = null;
        });
    }

    const confirmSuspend = document.getElementById("confirm-suspend");
    const confirmReactivate = document.getElementById("confirm-reactivate");

    if (confirmSuspend) {
        confirmSuspend.addEventListener("click", handleSuspendCoach);
    }

    if (confirmReactivate) {
        confirmReactivate.addEventListener("click", handleReactivateCoach);
    }
}

setupCoachStatusActions();

// Escape key event
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    // Check confirmation modals 
    const modalIds = [
        "reject-confirm-modal",
        "suspend-confirm-modal",
        "reactivate-confirm-modal",
        "coach-review-modal",
        "approved-coach-modal",
        "suspended-coach-modal"
    ];

    for (const modalId of modalIds) {
        const modal = document.getElementById(modalId);

        if (modal && window.getComputedStyle(modal).display !== "none") {
            modal.style.display = "none";

            // Clear the selected coach 
            if (modalId === "coach-review-modal") {
                selectedCoachApplication = null;
            } else if (modalId === "approved-coach-modal") {
                selectedApprovedCoach = null;
            } else if (modalId === "suspended-coach-modal") {
                selectedSuspendedCoach = null;
            }

            break;
        }
    }
});

export {
    loadCoachApplications,
    loadApprovedCoaches,
    loadSuspendedCoaches
};