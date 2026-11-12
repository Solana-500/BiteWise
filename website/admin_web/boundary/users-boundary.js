import {
    loadUsers,
    suspendUser,
    reactivateUser,
    filterUsers
} from "../control/user-controller.js";

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


let loadedUsers = [];
let selectedUserId = null;

// ==============================================
// DOM ELEMENTS
// ==============================================

// Search and filter 
const userSearchInput =
    document.getElementById(
        "user-search"
    );

const userStatusFilter =
    document.getElementById(
        "user-status-filter"
    );

const userPlanFilter =
    document.getElementById(
        "user-plan-filter"
    );

// User profile
const userProfileModal =
    document.getElementById(
        "user-profile-modal"
    );

const userProfileClose =
    document.getElementById(
        "user-profile-close"
    );


// Suspend user
const suspendUserButton =
    document.getElementById(
        "suspend-user"
    );

const suspendUserConfirmModal =
    document.getElementById(
        "suspend-user-confirm-modal"
    );

const suspendUserConfirmClose =
    document.getElementById(
        "suspend-user-confirm-close"
    );

const cancelUserSuspendButton =
    document.getElementById(
        "cancel-user-suspend"
    );

const confirmUserSuspendButton =
    document.getElementById(
        "confirm-user-suspend"
    );


// Reactivate user
const reactivateUserConfirmModal =
    document.getElementById(
        "reactivate-user-confirm-modal"
    );

const reactivateUserConfirmClose =
    document.getElementById(
        "reactivate-user-confirm-close"
    );

const cancelUserReactivateButton =
    document.getElementById(
        "cancel-user-reactivate"
    );

const confirmUserReactivateButton =
    document.getElementById(
        "confirm-user-reactivate"
    );


// ==============================================
// FUNCTIONS
// ==============================================

// Load and display users
function renderUsers(users) {

    const usersTableBody =
        document.getElementById(
            "users-table-body"
        );

    if (!usersTableBody) {
        return;
    }

    if (!users || users.length === 0) {

        usersTableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="5">

                    <div class="table-empty-state">

                        <strong>
                            No users found.
                        </strong>

                        <span>
                            Try changing your search
                            or filter.
                        </span>

                    </div>

                </td>
            </tr>
        `;

        return;
    }

    usersTableBody.innerHTML = "";

    users.forEach((user) => {

        const row =
            document.createElement("tr");

        const status =
            user.is_suspended
                ? "Suspended"
                : "Active";

        row.innerHTML = `
            <td>
                <strong>
                    ${escapeHTML(user.full_name) || "Unnamed User"}
                </strong>
            </td>

            <td>
                ${escapeHTML(user.email) || "No email available"}
            </td>

            <td>
                ${user.subscription_tier === "premium"
                    ? "Premium"
                    : "Free"}
            </td>

            <td>
                <span class="
                    coach-status
                    ${user.is_suspended
                        ? "suspended"
                        : "active"}
                ">
                    ${status}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="coach-action-button view-user-button"
                    data-user-id="${escapeHTML(user.id)}"
                >
                    View
                </button>
            </td>
        `;

        usersTableBody.appendChild(row);
    });
}

async function loadUsersPage() {

    const usersTableBody =
        document.getElementById(
            "users-table-body"
        );

    if (!usersTableBody) {
        return;
    }

    try {

        const users = await loadUsers();
        loadedUsers = users;

        updateUserSummary();

        renderUsers(loadedUsers);

    } catch (error) {

        console.error(
            "Error loading users:",
            error
        );

        usersTableBody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="4">

                    <div class="table-empty-state">
                        <strong>
                            Unable to load users.
                        </strong>
                    </div>

                </td>
            </tr>
        `;
    }
}

// Search and filter users
function applyUserFilters() {

    const searchTerm =
        userSearchInput?.value || "";

    const status =
        userStatusFilter?.value || "all";

    const plan =
        userPlanFilter?.value || "all";

    const filteredUsers =
        filterUsers(
            loadedUsers,
            searchTerm,
            status,
            plan
        );

    renderUsers(filteredUsers);
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value || "—";
    }
}

function formatLabel(text) {
    if (!text) return "";

    const spaced = String(text).replaceAll("_", " ");

    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// View user profile
function openUserProfile(userId) {

    const user =
        loadedUsers.find(
            (user) => user.id === userId
        );

    if (!user) {
        return;
    }

    selectedUserId = user.id;

    // User initials
    const initials = user.full_name
        ? user.full_name
            .split(" ")
            .map((name) => name.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "U";


    // Account type
    const subscriptionTier =
        user.subscription_tier === "premium"
            ? "Premium"
            : "Free";


    // Account status
    const status =
        user.is_suspended
            ? "Suspended"
            : "Active";

    if (suspendUserButton) {

        if (user.is_suspended) {

            suspendUserButton.textContent =
                "Reactivate User";

            suspendUserButton.dataset.action =
                "reactivate";

            suspendUserButton.classList.remove(
                "reject-button"
            );

            suspendUserButton.classList.add(
                "reactivate-button"
            );

        } else {

            suspendUserButton.textContent =
                "Suspend User";

            suspendUserButton.dataset.action =
                "suspend";

            suspendUserButton.classList.remove(
                "reactivate-button"
            );

            suspendUserButton.classList.add(
                "reject-button"
            );
        }
    }


    const isPremium = user.subscription_tier === "premium";

    setText("user-profile-initials", initials);
    setText("user-profile-name", user.full_name || "Unnamed User");
    setText("user-profile-email", user.email || "Email unavailable");

    // Account information
    setText("user-profile-tier", subscriptionTier);
    setText(
        "user-profile-subscription-status",
        isPremium ? formatLabel(user.subscription_status) : "—"
    );
    setText(
        "user-profile-subscription-end",
        isPremium ? formatDate(user.subscription_end_date) : "—"
    );
    setText(
        "user-profile-joined",
        user.created_at
            ? `Joined ${formatDate(user.created_at)}`
            : "Joined date unavailable"
    );

    setText("user-profile-coach", user.assigned_coach_name || "None");

    // Profile
    setText(
        "user-profile-age",
        user.age != null ? String(user.age) : "Not provided"
    );
    setText(
        "user-profile-gender",
        formatLabel(user.gender) || "Not provided"
    );
    setText("user-profile-goal", user.fitness_goal || "Not provided");
    setText(
        "user-profile-activity",
        formatLabel(user.activity_level) || "Not provided"
    );


    // Status badge
    const statusElement =
        document.getElementById(
            "user-profile-status"
        );

    statusElement.textContent = status;

    statusElement.classList.toggle(
        "active",
        !user.is_suspended
    );

    statusElement.classList.toggle(
        "suspended",
        user.is_suspended
    );


    // Open modal
    userProfileModal.classList.add(
        "show"
    );
}


// Suspend user
function openSuspendUserConfirmation() {

    if (!selectedUserId) {
        return;
    }

    suspendUserConfirmModal?.classList.add(
        "show"
    );
}


function closeSuspendUserConfirmation() {

    suspendUserConfirmModal?.classList.remove(
        "show"
    );
}

async function handleSuspendUser() {

    if (!selectedUserId) {
        return;
    }

    const user =
        loadedUsers.find(
            (user) => user.id === selectedUserId
        );

    if (!user) {
        return;
    }

    const userId = user.id;
    const userName = user.full_name;

    try {

        confirmUserSuspendButton.disabled = true;
        confirmUserSuspendButton.textContent =
            "Suspending...";

        await suspendUser(userId);

        closeSuspendUserConfirmation();

        userProfileModal?.classList.remove(
            "show"
        );

        await loadUsersPage();

        console.log(
            `${userName} has been suspended.`
        );

        selectedUserId = null;

    } catch (error) {

        console.error(
            "Error suspending user:",
            error
        );

        alert(
            "Unable to suspend the user. " +
            "Please try again."
        );

    } finally {

        confirmUserSuspendButton.disabled = false;
        confirmUserSuspendButton.textContent =
            "Suspend";
    }
}

// Reactivate user
function openReactivateUserConfirmation() {

    if (!selectedUserId) {
        return;
    }

    reactivateUserConfirmModal?.classList.add(
        "show"
    );
}


function closeReactivateUserConfirmation() {

    reactivateUserConfirmModal?.classList.remove(
        "show"
    );
}

async function handleReactivateUser() {

    if (!selectedUserId) {
        return;
    }

    const user =
        loadedUsers.find(
            (user) => user.id === selectedUserId
        );

    if (!user) {
        return;
    }

    const userId = user.id;
    const userName = user.full_name;

    try {

        confirmUserReactivateButton.disabled = true;
        confirmUserReactivateButton.textContent =
            "Reactivating...";

        await reactivateUser(userId);

        closeReactivateUserConfirmation();

        userProfileModal?.classList.remove(
            "show"
        );

        await loadUsersPage();

        console.log(
            `${userName} has been reactivated.`
        );

        selectedUserId = null;

    } catch (error) {

        console.error(
            "Error reactivating user:",
            error
        );

        alert(
            "Unable to reactivate the user. " +
            "Please try again."
        );

    } finally {

        confirmUserReactivateButton.disabled = false;
        confirmUserReactivateButton.textContent =
            "Reactivate";
    }
}

function setBadge(id, text) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = text;
    }
}

function updateUserSummary() {

    const total = loadedUsers.length;

    const premium = loadedUsers.filter(
        (user) => user.subscription_tier === "premium"
    ).length;

    const free = total - premium;

    setBadge(
        "user-count",
        `${total} ${total === 1 ? "user" : "users"}`
    );
    setBadge("user-free-count", `${free} Free`);
    setBadge("user-premium-count", `${premium} Premium`);
}

// ==============================================
// EVENT LISTENERS
// ==============================================

// Search and filter
userSearchInput?.addEventListener(
    "input",
    applyUserFilters
);

userStatusFilter?.addEventListener(
    "change",
    applyUserFilters
);

userPlanFilter?.addEventListener(
    "change",
    applyUserFilters
);

// View user profile
document.addEventListener(
    "click",
    function(event) {

        const viewButton =
            event.target.closest(
                ".view-user-button"
            );

        if (!viewButton) {
            return;
        }

        openUserProfile(
            viewButton.dataset.userId
        );
    }
);

// Close modal
userProfileClose?.addEventListener(
    "click",
    function() {
        userProfileModal?.classList.remove(
            "show"
        );
    }
);

userProfileModal?.addEventListener(
    "click",
    function(event) {

        if (event.target === userProfileModal) {
            userProfileModal.classList.remove(
                "show"
            );
        }
    }
);

// Suspend user
suspendUserButton?.addEventListener(
    "click",
    function() {

        if (
            suspendUserButton.dataset.action ===
            "reactivate"
        ) {
            openReactivateUserConfirmation();
        } else {
            openSuspendUserConfirmation();
        }
    }
);

suspendUserConfirmClose?.addEventListener(
    "click",
    closeSuspendUserConfirmation
);

cancelUserSuspendButton?.addEventListener(
    "click",
    closeSuspendUserConfirmation
);

suspendUserConfirmModal?.addEventListener(
    "click",
    function(event) {

        if (event.target === suspendUserConfirmModal) {
            closeSuspendUserConfirmation();
        }
    }
);

confirmUserSuspendButton?.addEventListener(
    "click",
    handleSuspendUser
);

// Reactivate user
reactivateUserConfirmClose?.addEventListener(
    "click",
    closeReactivateUserConfirmation
);

cancelUserReactivateButton?.addEventListener(
    "click",
    closeReactivateUserConfirmation
);

reactivateUserConfirmModal?.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            reactivateUserConfirmModal
        ) {
            closeReactivateUserConfirmation();
        }
    }
);

confirmUserReactivateButton?.addEventListener(
    "click",
    handleReactivateUser
);


export {
    loadUsersPage
};