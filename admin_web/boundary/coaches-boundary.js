import {
    loadCoachApplications as getApplications,
    loadApprovedCoaches as getApproved,
    loadSuspendedCoaches as getSuspended,
    loadCoachCredentials as getCoachCredentials,
    openCoachCredential as getCoachCredentialUrl,
    approveCoach,
    rejectCoach,
    suspendCoach,
    reactivateCoach
} from "../control/coach-controller.js";

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

// Load coach applications
async function loadCoachApplications() {
    const tableBody =
        document.getElementById("applications-table-body");

    const countElement =
        document.getElementById("applications-count");

    if (!tableBody) return;

    try {
        const applications = await getApplications();

        coachApplications = applications;

        if (countElement) {
            countElement.textContent = applications.length;
        }

        if (applications.length === 0) {
            tableBody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="5">
                        <div class="table-empty-state">
                            <strong>No pending applications</strong>
                            <span>
                                New Health Coach applications
                                will appear here.
                            </span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = applications.map((coach) => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(
                            coach.full_name || "Unnamed Applicant"
                        )}
                    </strong>
                </td>
                <td>${formatSpecialties(coach.coaching_specialty)}</td>
                <td>${formatExperience(coach.years_experience)}</td>
                <td>
                    <span class="coach-status pending">Pending</span>
                </td>
                <td>
                    <button
                        type="button"
                        class="coach-action-button review-coach-button"
                        data-coach-id="${escapeHTML(coach.id)}"
                    >
                        Review
                    </button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error loading coach applications:", error);

        if (countElement) {
            countElement.textContent = "—";
        }

        tableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="5">
                    <div class="table-empty-state">
                        <strong>Unable to load applications</strong>
                        <span>Please try again later.</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Load approved coaches
async function loadApprovedCoaches() {
    const tableBody =
        document.getElementById("approved-table-body");

    const countElement =
        document.getElementById("approved-count");

    if (!tableBody) return;

    try {
        const coaches = await getApproved();

        approvedCoaches = coaches;

        if (countElement) {
            countElement.textContent = coaches.length;
        }

        if (coaches.length === 0) {
            tableBody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="5">
                        <div class="table-empty-state">
                            <strong>No approved coaches</strong>
                            <span>
                                Approved Health Coaches
                                will appear here.
                            </span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = coaches.map((coach) => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(coach.full_name || "Unnamed Coach")}
                    </strong>
                </td>
                <td>${formatSpecialties(coach.coaching_specialty)}</td>
                <td>${formatExperience(coach.years_experience)}</td>
                <td>
                    <span class="coach-status active">Active</span>
                </td>
                <td>
                    <button
                        type="button"
                        class="coach-action-button view-approved-coach-button"
                        data-coach-id="${escapeHTML(coach.id)}"
                    >
                        View
                    </button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error loading approved coaches:", error);

        if (countElement) {
            countElement.textContent = "—";
        }

        tableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="5">
                    <div class="table-empty-state">
                        <strong>
                            Unable to load approved coaches
                        </strong>
                        <span>Please try again later.</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Load suspended coaches
async function loadSuspendedCoaches() {
    const tableBody =
        document.getElementById("suspended-table-body");

    const countElement =
        document.getElementById("suspended-count");

    if (!tableBody) return;

    try {
        const coaches = await getSuspended();

        suspendedCoaches = coaches;

        if (countElement) {
            countElement.textContent = coaches.length;
        }

        if (coaches.length === 0) {
            tableBody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="5">
                        <div class="table-empty-state">
                            <strong>No suspended coaches</strong>
                            <span>
                                Suspended Health Coaches
                                will appear here.
                            </span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = coaches.map((coach) => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(coach.full_name || "Unnamed Coach")}
                    </strong>
                </td>
                <td>${formatSpecialties(coach.coaching_specialty)}</td>
                <td>${formatExperience(coach.years_experience)}</td>
                <td>
                    <span class="coach-status suspended">Suspended</span>
                </td>
                <td>
                    <button
                        type="button"
                        class="coach-action-button view-suspended-coach-button"
                        data-coach-id="${escapeHTML(coach.id)}"
                    >
                        View
                    </button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error loading suspended coaches:", error);

        if (countElement) {
            countElement.textContent = "—";
        }

        tableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="5">
                    <div class="table-empty-state">
                        <strong>
                            Unable to load suspended coaches
                        </strong>
                        <span>Please try again later.</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Load coach credentials
async function loadCoachCredentials(coachId) {
    const container = document.getElementById("coach-credentials-container");

    if (!container) return;

    container.innerHTML = "<p>Loading credentials...</p>";

    try {
        const documents = await getCoachCredentials(coachId);

        if (documents.length === 0) {
            container.innerHTML = "<p>No credentials uploaded.</p>";
            return;
        }

        container.innerHTML = documents.map(document => `
            <div class="credential-item">
                <div>
                    <strong>${escapeHTML(document.file_name || "Unnamed file")}</strong>
                    <p>${escapeHTML(document.file_type || "Unknown file type")}</p>
                </div>

                <button
                    type="button"
                    class="credential-view-button"
                    data-file-path="${escapeHTML(document.file_path || "")}"
                    ${document.file_path ? "" : "disabled"}
                >
                    View credential
                </button>
            </div>
        `).join("");
    } catch (error) {
        console.error("Error loading coach credentials:", error);
        container.innerHTML = "<p>Unable to load credentials.</p>";
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

const credentialContainer = document.getElementById("coach-credentials-container");

if (credentialContainer) {
    credentialContainer.addEventListener("click", event => {
        const button = event.target.closest(".credential-view-button");

        if (!button || !credentialContainer.contains(button)) return;

        const filePath = button.dataset.filePath;

        if (filePath) {
            handleOpenCoachCredential(filePath);
        }
    });
}

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

    document.getElementById("review-full-name").textContent =
        coach.full_name || "Not provided";

    document.getElementById("review-age").textContent =
        coach.age ?? "Not provided";

    document.getElementById("review-gender").textContent =
        coach.gender || "Not provided";

    document.getElementById("review-specialties").textContent =
        formatSpecialties(coach.coaching_specialty);

    document.getElementById("review-experience").textContent =
        coach.years_experience != null
            ? `${coach.years_experience} years`
            : "Not provided";

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

            document.getElementById("approved-coach-specialties").textContent =
                formatSpecialties(selectedApprovedCoach.coaching_specialty);

            document.getElementById("approved-coach-experience").textContent =
                selectedApprovedCoach.years_experience != null
                    ? `${selectedApprovedCoach.years_experience} years`
                    : "Not provided";

            document.getElementById("approved-coach-modal").style.display = "flex";
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

            document.getElementById("suspended-coach-specialties").textContent =
                formatSpecialties(selectedSuspendedCoach.coaching_specialty);

            document.getElementById("suspended-coach-experience").textContent =
                selectedSuspendedCoach.years_experience != null
                    ? `${selectedSuspendedCoach.years_experience} years`
                    : "Not provided";

            document.getElementById("suspended-coach-modal").style.display = "flex";
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