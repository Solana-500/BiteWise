const SUPABASE_URL =
    "https://xxazvbjvwuvklroialwe.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_-mB23YADvK8aLerxzfYjyQ_OldSllfi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

let coachApplications = [];
let selectedCoachApplication = null;
let approvedCoaches = [];
let selectedApprovedCoach = null;
let suspendedCoaches = [];
let selectedSuspendedCoach = null;

async function loadCoachApplications() {
    const tableBody =
        document.getElementById("applications-table-body");

    const countElement =
        document.getElementById("applications-count");

    if (!tableBody) {
        return;
    }

    try {
        const { data: applications, error } =
            await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    age,
                    gender,
                    coaching_specialty,
                    years_experience,
                    approval_status
                `)
                .eq("app_role", "coach")
                .eq("approval_status", "pending")
                .order("full_name", { ascending: true });

        if (error) {
            throw error;
        }

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

        tableBody.innerHTML = applications
            .map((coach) => {
                return `
                    <tr>
                        <td>
                            <strong>
                                ${escapeHTML(coach.full_name || "Unnamed Applicant")}
                            </strong>
                        </td>

                        <td>
                            ${formatSpecialties(
                                coach.coaching_specialty
                            )}
                        </td>

                        <td>
                            ${formatExperience(
                                coach.years_experience
                            )}
                        </td>

                        <td>
                            <span class="coach-status pending">
                                Pending
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="coach-action-button"
                                data-coach-id="${coach.id}"
                            >
                                Review
                            </button>
                        </td>
                    </tr>
                `;
            })
            .join("");

    } catch (error) {
        console.error(
            "Error loading coach applications:",
            error
        );

        if (countElement) {
            countElement.textContent = "—";
        }

        tableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="5">
                    <div class="table-empty-state">
                        <strong>
                            Unable to load applications
                        </strong>
                        <span>
                            Please try again later.
                        </span>
                    </div>
                </td>
            </tr>
        `;
    }
}


async function loadApprovedCoaches() {

    const tableBody =
        document.getElementById("approved-table-body");

    const countElement =
        document.getElementById("approved-count");

    // Not on the Coach Management page
    if (!tableBody) {
        return;
    }

    try {

        const { data: coaches, error } =
            await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    coaching_specialty,
                    years_experience,
                    approval_status,
                    is_suspended
                `)
                .eq("app_role", "coach")
                .eq("approval_status", "approved")
                .eq("is_suspended", false)
                .order("full_name", {
                    ascending: true
                });
        
                approvedCoaches = coaches;

        if (error) {
            throw error;
        }


        if (countElement) {
            countElement.textContent =
                coaches.length;
        }


        if (coaches.length === 0) {

            tableBody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="5">

                        <div class="table-empty-state">

                            <strong>
                                No approved coaches
                            </strong>

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


        tableBody.innerHTML = coaches
            .map((coach) => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    coach.full_name ||
                                    "Unnamed Coach"
                                )}
                            </strong>
                        </td>

                        <td>
                            ${formatSpecialties(
                                coach.coaching_specialty
                            )}
                        </td>

                        <td>
                            ${formatExperience(
                                coach.years_experience
                            )}
                        </td>

                        <td>
                            <span class="coach-status active">
                                Active
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="coach-action-button"
                                data-approved-coach-id="${coach.id}"
                            >
                                View
                            </button>
                        </td>

                    </tr>
                `;

            })
            .join("");

    } catch (error) {

        console.error(
            "Error loading approved coaches:",
            error
        );

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

                        <span>
                            Please try again later.
                        </span>

                    </div>

                </td>
            </tr>
        `;
    }
}

async function loadSuspendedCoaches() {

    const tableBody =
        document.getElementById("suspended-table-body");

    const countElement =
        document.getElementById("suspended-count");

    if (!tableBody) {
        return;
    }

    try {

        const { data: coaches, error } =
            await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    coaching_specialty,
                    years_experience,
                    approval_status,
                    is_suspended
                `)
                .eq("app_role", "coach")
                .eq("approval_status", "approved")
                .eq("is_suspended", true)
                .order("full_name", {
                    ascending: true
                });

        if (error) {
            throw error;
        }

        suspendedCoaches = coaches;

        if (countElement) {
            countElement.textContent = coaches.length;
        }

        if (coaches.length === 0) {

            tableBody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="5">

                        <div class="table-empty-state">

                            <strong>
                                No suspended coaches
                            </strong>

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

        tableBody.innerHTML = coaches
            .map((coach) => `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                coach.full_name ||
                                "Unnamed Coach"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatSpecialties(
                            coach.coaching_specialty
                        )}
                    </td>

                    <td>
                        ${formatExperience(
                            coach.years_experience
                        )}
                    </td>

                    <td>
                        <span class="coach-status suspended">
                            Suspended
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="coach-action-button"
                            data-suspended-coach-id="${coach.id}"
                        >
                            View
                        </button>
                    </td>

                </tr>
            `)
            .join("");

    } catch (error) {

        console.error(
            "Error loading suspended coaches:",
            error
        );

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

                        <span>
                            Please try again later.
                        </span>

                    </div>

                </td>
            </tr>
        `;
    }
}


/* =========================================
   COACH APPLICATION REVIEW
========================================= */

const coachReviewModal =
    document.getElementById("coach-review-modal");

const coachReviewClose =
    document.getElementById("coach-review-close");

const applicationsTableBody =
    document.getElementById(
        "applications-table-body"
    );

const approveApplicationButton =
    document.getElementById("approve-application");

const rejectApplicationButton =
    document.getElementById("reject-application");

const rejectConfirmModal =
    document.getElementById("reject-confirm-modal");

const rejectConfirmClose =
    document.getElementById("reject-confirm-close");

const cancelRejectButton =
    document.getElementById("cancel-reject");

const confirmRejectButton =
    document.getElementById("confirm-reject");

const approvedCoachModal =
    document.getElementById("approved-coach-modal");

const approvedCoachClose =
    document.getElementById("approved-coach-close");

const suspendCoachButton =
    document.getElementById("suspend-coach");

const suspendConfirmModal =
    document.getElementById("suspend-confirm-modal");

const suspendConfirmClose =
    document.getElementById("suspend-confirm-close");

const cancelSuspendButton =
    document.getElementById("cancel-suspend");

const confirmSuspendButton =
    document.getElementById("confirm-suspend");

const suspendedCoachModal =
    document.getElementById("suspended-coach-modal");

const suspendedCoachClose =
    document.getElementById("suspended-coach-close");

const reactivateCoachButton =
    document.getElementById("reactivate-coach");

const reactivateConfirmModal =
    document.getElementById("reactivate-confirm-modal");

const reactivateConfirmClose =
    document.getElementById("reactivate-confirm-close");

const cancelReactivateButton =
    document.getElementById("cancel-reactivate");

const confirmReactivateButton =
    document.getElementById("confirm-reactivate");


function displayReviewValue(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Not provided";
    }

    return String(value);
}


function openCoachReviewModal(coachId) {

    const coach = coachApplications.find(
        (application) =>
            application.id === coachId
    );

    if (!coach || !coachReviewModal) {
        return;
    }

    selectedCoachApplication = coach;


    document.getElementById(
        "review-coach-name"
    ).textContent =
        displayReviewValue(coach.full_name);


    document.getElementById(
        "review-full-name"
    ).textContent =
        displayReviewValue(coach.full_name);


    document.getElementById(
        "review-age"
    ).textContent =
        displayReviewValue(coach.age);


    document.getElementById(
        "review-gender"
    ).textContent =
        displayReviewValue(coach.gender);


    document.getElementById(
        "review-specialties"
    ).textContent =
        Array.isArray(coach.coaching_specialty)
            ? coach.coaching_specialty.join(", ")
            : displayReviewValue(
                coach.coaching_specialty
            );


    document.getElementById(
        "review-experience"
    ).textContent =
        formatExperience(
            coach.years_experience
        );


    coachReviewModal.classList.add("show");
}


function closeCoachReviewModal() {

    if (!coachReviewModal) {
        return;
    }

    coachReviewModal.classList.remove("show");

    selectedCoachApplication = null;
}


function openRejectConfirmation() {

    if (!selectedCoachApplication) {
        return;
    }

    rejectConfirmModal?.classList.add("show");
}


function closeRejectConfirmation() {

    rejectConfirmModal?.classList.remove("show");
}


async function approveCoachApplication() {

    if (!selectedCoachApplication) {
        return;
    }

    const coachId =
        selectedCoachApplication.id;

    const coachName =
        selectedCoachApplication.full_name;


    try {

        approveApplicationButton.disabled = true;
        approveApplicationButton.textContent =
            "Approving...";


        const { error } =
            await supabaseClient
                .from("profiles")
                .update({
                    approval_status: "approved"
                })
                .eq("id", coachId)
                .eq("app_role", "coach")
                .eq("approval_status", "pending");


        if (error) {
            throw error;
        }


        closeCoachReviewModal();

        await loadCoachApplications();
        await loadApprovedCoaches();

        console.log(
            `${coachName} has been approved.`
        );

    } catch (error) {

        console.error(
            "Error approving coach application:",
            error
        );

        alert(
            "Unable to approve the coach application. " +
            "Please try again."
        );

    } finally {

        approveApplicationButton.disabled = false;
        approveApplicationButton.textContent =
            "Approve Application";

    }

}


async function rejectCoachApplication() {

    if (!selectedCoachApplication) {
        return;
    }

    const coachId =
        selectedCoachApplication.id;

    const coachName =
        selectedCoachApplication.full_name;

    try {

        confirmRejectButton.disabled = true;
        confirmRejectButton.textContent = "Rejecting...";


        const { data, error } =
            await supabaseClient
                .from("profiles")
                .update({
                    approval_status: "rejected"
                })
                .eq("id", coachId)
                .eq("app_role", "coach")
                .eq("approval_status", "pending")
                .select("id, approval_status");


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {
            throw new Error(
                "No coach application was updated."
            );
        }


        closeRejectConfirmation();
        closeCoachReviewModal();

        await loadCoachApplications();
        await loadApprovedCoaches();

        console.log(
            `${coachName} has been rejected.`
        );

    } catch (error) {

        console.error(
            "Error rejecting coach application:",
            error
        );

        alert(
            "Unable to reject the coach application. " +
            "Please try again."
        );

    } finally {

        confirmRejectButton.disabled = false;
        confirmRejectButton.textContent = "Reject Application";

    }
}


function openApprovedCoachModal(coachId) {

    const coach = approvedCoaches.find(
        (coach) => coach.id === coachId
    );

    if (!coach) {
        return;
    }

    selectedApprovedCoach = coach;

    document.getElementById(
        "approved-coach-name"
    ).textContent =
        coach.full_name || "—";

    const initials = coach.full_name
    ? coach.full_name
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

    document.getElementById(
        "approved-coach-initials"
    ).textContent = initials;

    document.getElementById(
        "approved-coach-specialties"
    ).textContent =
        Array.isArray(coach.coaching_specialty)
            ? coach.coaching_specialty.join(", ")
            : coach.coaching_specialty || "—";

    document.getElementById(
        "approved-coach-experience"
    ).textContent =
        formatExperience(coach.years_experience);

    approvedCoachModal?.classList.add("show");
}


function closeApprovedCoachModal() {

    approvedCoachModal?.classList.remove("show");

    selectedApprovedCoach = null;
}

document
    .getElementById("approved-table-body")
    ?.addEventListener("click", (event) => {

        const button =
            event.target.closest(
                "[data-approved-coach-id]"
            );

        if (!button) {
            return;
        }

        openApprovedCoachModal(
            button.dataset.approvedCoachId
        );
    });

function openSuspendConfirmation() {

    if (!selectedApprovedCoach) {
        return;
    }

    suspendConfirmModal?.classList.add("show");
}


function closeSuspendConfirmation() {

    suspendConfirmModal?.classList.remove("show");
}

async function suspendCoach() {

    if (!selectedApprovedCoach) {
        return;
    }

    const coachId = selectedApprovedCoach.id;
    const coachName = selectedApprovedCoach.full_name;

    try {

        confirmSuspendButton.disabled = true;
        confirmSuspendButton.textContent = "Suspending...";

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .update({
                    is_suspended: true
                })
                .eq("id", coachId)
                .eq("app_role", "coach")
                .eq("approval_status", "approved")
                .eq("is_suspended", false)
                .select("id, is_suspended");

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error(
                "No coach account was updated."
            );
        }

        closeSuspendConfirmation();
        closeApprovedCoachModal();

        await loadApprovedCoaches();
        await loadSuspendedCoaches();

        console.log(
            `${coachName} has been suspended.`
        );

    } catch (error) {

        console.error(
            "Error suspending coach:",
            error
        );

        alert(
            "Unable to suspend the Health Coach. " +
            "Please try again."
        );

    } finally {

        confirmSuspendButton.disabled = false;
        confirmSuspendButton.textContent =
            "Suspend Coach";
    }
}

function openSuspendedCoachModal(coachId) {

    const coach = suspendedCoaches.find(
        (coach) => coach.id === coachId
    );

    if (!coach) {
        return;
    }

    selectedSuspendedCoach = coach;

    document.getElementById(
        "suspended-coach-name"
    ).textContent =
        coach.full_name || "—";


    const initials = coach.full_name
        ? coach.full_name
            .split(" ")
            .map((name) => name.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "?";

    document.getElementById(
        "suspended-coach-initials"
    ).textContent = initials;


    document.getElementById(
        "suspended-coach-specialties"
    ).textContent =
        Array.isArray(coach.coaching_specialty)
            ? coach.coaching_specialty.join(", ")
            : coach.coaching_specialty || "—";


    document.getElementById(
        "suspended-coach-experience"
    ).textContent =
        formatExperience(
            coach.years_experience
        );


    suspendedCoachModal?.classList.add("show");
}


function closeSuspendedCoachModal() {

    suspendedCoachModal?.classList.remove("show");

    selectedSuspendedCoach = null;
}

document
    .getElementById("suspended-table-body")
    ?.addEventListener("click", (event) => {

        const button =
            event.target.closest(
                "[data-suspended-coach-id]"
            );

        if (!button) {
            return;
        }

        openSuspendedCoachModal(
            button.dataset.suspendedCoachId
        );
    });

function openReactivateConfirmation() {

    if (!selectedSuspendedCoach) {
        return;
    }

    reactivateConfirmModal?.classList.add("show");
}


function closeReactivateConfirmation() {

    reactivateConfirmModal?.classList.remove("show");
}

async function reactivateCoach() {

    if (!selectedSuspendedCoach) {
        return;
    }

    const coachId = selectedSuspendedCoach.id;
    const coachName = selectedSuspendedCoach.full_name;

    try {

        confirmReactivateButton.disabled = true;
        confirmReactivateButton.textContent =
            "Reactivating...";

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .update({
                    is_suspended: false
                })
                .eq("id", coachId)
                .eq("app_role", "coach")
                .eq("approval_status", "approved")
                .eq("is_suspended", true)
                .select("id, is_suspended");

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error(
                "No coach account was updated."
            );
        }

        closeReactivateConfirmation();
        closeSuspendedCoachModal();

        await loadSuspendedCoaches();
        await loadApprovedCoaches();

        console.log(
            `${coachName} has been reactivated.`
        );

    } catch (error) {

        console.error(
            "Error reactivating coach:",
            error
        );

        alert(
            "Unable to reactivate the Health Coach. " +
            "Please try again."
        );

    } finally {

        confirmReactivateButton.disabled = false;
        confirmReactivateButton.textContent =
            "Reactivate Coach";
    }
}

applicationsTableBody?.addEventListener(
    "click",
    (event) => {

        const reviewButton =
            event.target.closest(
                ".coach-action-button"
            );

        if (!reviewButton) {
            return;
        }

        const coachId =
            reviewButton.dataset.coachId;

        openCoachReviewModal(coachId);
    }
);

coachReviewClose?.addEventListener(
    "click",
    closeCoachReviewModal
);


coachReviewModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === coachReviewModal) {
            closeCoachReviewModal();
        }

    }
);

approveApplicationButton?.addEventListener(
    "click",
    approveCoachApplication
);

rejectApplicationButton?.addEventListener(
    "click",
    openRejectConfirmation
);

confirmRejectButton?.addEventListener(
    "click",
    rejectCoachApplication
);

cancelRejectButton?.addEventListener(
    "click",
    closeRejectConfirmation
);

rejectConfirmClose?.addEventListener(
    "click",
    closeRejectConfirmation
);

rejectConfirmModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === rejectConfirmModal) {
            closeRejectConfirmation();
        }

    }
);

approvedCoachClose?.addEventListener(
    "click",
    closeApprovedCoachModal
);

approvedCoachModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === approvedCoachModal) {
            closeApprovedCoachModal();
        }

    }
);

suspendCoachButton?.addEventListener(
    "click",
    openSuspendConfirmation
);

cancelSuspendButton?.addEventListener(
    "click",
    closeSuspendConfirmation
);

suspendConfirmClose?.addEventListener(
    "click",
    closeSuspendConfirmation
);

suspendConfirmModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === suspendConfirmModal) {
            closeSuspendConfirmation();
        }

    }
);

confirmSuspendButton?.addEventListener(
    "click",
    suspendCoach
);

suspendedCoachClose?.addEventListener(
    "click",
    closeSuspendedCoachModal
);

suspendedCoachModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === suspendedCoachModal) {
            closeSuspendedCoachModal();
        }

    }
);

reactivateCoachButton?.addEventListener(
    "click",
    openReactivateConfirmation
);

cancelReactivateButton?.addEventListener(
    "click",
    closeReactivateConfirmation
);

reactivateConfirmClose?.addEventListener(
    "click",
    closeReactivateConfirmation
);

reactivateConfirmModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === reactivateConfirmModal) {
            closeReactivateConfirmation();
        }

    }
);

confirmReactivateButton?.addEventListener(
    "click",
    reactivateCoach
);

/* =========================================
   ADMIN ACCESS CHECK
========================================= */

async function checkAdminAccess() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();


    // No authenticated user
    if (userError || !user) {
        window.location.href = "../website/index.html";
        return;
    }


    // Get user's role
    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("app_role")
        .eq("id", user.id)
        .single();


    // Profile could not be loaded
    if (profileError || !profile) {
        await supabaseClient.auth.signOut();

        window.location.href = "../website/index.html";
        return;
    }


    // Logged-in user is not an admin
    if (profile.app_role !== "admin") {
        await supabaseClient.auth.signOut();

        window.location.href = "../website/index.html";
        return;
    }


    console.log("Admin access verified.");

    await loadDashboardStatistics();
    await loadCoachApplications();
    await loadApprovedCoaches();
    await loadSuspendedCoaches();
}


function escapeHTML(value) {
    return String(value)
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


/* =========================================
   DASHBOARD STATISTICS
========================================= */

async function loadDashboardStatistics() {

    try {

        /* Total registered users */

        const {
            count: userCount,
            error: userCountError
        } = await supabaseClient
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("app_role", "user");


        if (userCountError) {
            console.error(
                "Error loading user count:",
                userCountError.message
            );
        } else {
            const totalUsers =
                document.getElementById("total-users");

            if (totalUsers) {
                totalUsers.textContent =
                    userCount ?? 0;
            }
        }


        /* Total health coaches */

        const {
            count: coachCount,
            error: coachCountError
        } = await supabaseClient
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("app_role", "coach")
            .eq("approval_status", "approved");


        if (coachCountError) {
            console.error(
                "Error loading coach count:",
                coachCountError.message
            );
        } else {
            const totalCoaches =
                document.getElementById("total-coaches");

            if (totalCoaches) {
                totalCoaches.textContent =
                    coachCount ?? 0;
            }
        }

        /* Pending coach applications */
        const {
            count: pendingCoachCount,
            error: pendingCoachError
        } = await supabaseClient
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("app_role", "coach")
            .eq("approval_status", "pending");


        if (pendingCoachError) {

            console.error(
                "Error loading pending coach applications:",
                pendingCoachError.message
            );

        } else {

            const pendingCoaches =
                document.getElementById("pending-coaches");

            if (pendingCoaches) {
                pendingCoaches.textContent =
                    pendingCoachCount ?? 0;
            }

        }

    } catch (error) {

        console.error(
            "Unable to load dashboard statistics:",
            error
        );

    }

}


/* =========================================
   COACH MANAGEMENT TABS
========================================= */

const coachTabs =
    document.querySelectorAll(".coach-tab");

const coachTabPanels =
    document.querySelectorAll(".coach-tab-panel");

coachTabs.forEach((tab) => {

    tab.addEventListener("click", () => {

        const selectedTab =
            tab.dataset.coachTab;


        /* Remove active state */

        coachTabs.forEach((item) => {
            item.classList.remove("active");
        });

        coachTabPanels.forEach((panel) => {
            panel.classList.remove("active");
        });


        /* Activate selected tab */

        tab.classList.add("active");

        const selectedPanel =
            document.getElementById(
                `${selectedTab}-panel`
            );

        if (selectedPanel) {
            selectedPanel.classList.add("active");
        }

    });

});


/* =========================================
   LOG OUT
========================================= */

async function logoutAdmin() {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Error logging out:",
            error.message
        );

        return;
    }

    window.location.href = "../website/index.html";
}


/* =========================================
   LOGOUT MODAL
========================================= */

const logoutButton =
    document.getElementById("logout-button");

const logoutModal =
    document.getElementById("logout-modal");

const logoutModalClose =
    document.getElementById("logout-modal-close");

const cancelLogoutButton =
    document.getElementById("cancel-logout");

const confirmLogoutButton =
    document.getElementById("confirm-logout");


function openLogoutModal() {
    logoutModal.classList.add("show");
}


function closeLogoutModal() {
    logoutModal.classList.remove("show");
}


/* Open modal */

logoutButton?.addEventListener(
    "click",
    openLogoutModal
);


/* X button */

logoutModalClose?.addEventListener(
    "click",
    closeLogoutModal
);


/* Cancel button */

cancelLogoutButton?.addEventListener(
    "click",
    closeLogoutModal
);


/* Click outside modal */

logoutModal?.addEventListener("click", (event) => {

    if (event.target === logoutModal) {
        closeLogoutModal();
    }

});


/* Escape key */

document.addEventListener("keydown", (event) => {

    if (event.key !== "Escape") {
        return;
    }

    if (logoutModal?.classList.contains("show")) {
        closeLogoutModal();
    }

    if (
        coachReviewModal?.classList.contains("show")
    ) {
        closeCoachReviewModal();
    }

    if (
        rejectConfirmModal?.classList.contains("show")
    ) {
        closeRejectConfirmation();
    }

    if (
        suspendConfirmModal?.classList.contains("show")
    ) {
        closeSuspendConfirmation();
    }

    if (
        reactivateConfirmModal?.classList.contains("show")
    ) {
        closeReactivateConfirmation();
    }

});


/* Confirm logout */

confirmLogoutButton?.addEventListener(
    "click",
    logoutAdmin
);


/* Check access whenever dashboard loads */
checkAdminAccess();