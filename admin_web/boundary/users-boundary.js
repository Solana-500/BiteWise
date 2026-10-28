import {
    loadUsers,
    suspendUser,
    reactivateUser,
    filterUsers
} from "../control/user-controller.js";

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
                <td colspan="4">

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
                    ${user.full_name || "Unnamed User"}
                </strong>
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
                    data-user-id="${user.id}"
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

    const filteredUsers =
        filterUsers(
            loadedUsers,
            searchTerm,
            status
        );

    renderUsers(filteredUsers);
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
                "approve-application-button"
            );

        } else {

            suspendUserButton.textContent =
                "Suspend User";

            suspendUserButton.dataset.action =
                "suspend";

            suspendUserButton.classList.remove(
                "approve-application-button"
            );

            suspendUserButton.classList.add(
                "reject-button"
            );
        }
    }


    document.getElementById(
        "user-profile-initials"
    ).textContent = initials;

    document.getElementById(
        "user-profile-name"
    ).textContent =
        user.full_name || "Unnamed User";

    document.getElementById(
        "user-profile-account-type"
    ).textContent =
        `${subscriptionTier} User`;

    document.getElementById(
        "user-profile-email"
    ).textContent =
        user.email || "Not provided";

    document.getElementById(
        "user-profile-tier"
    ).textContent =
        subscriptionTier;


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