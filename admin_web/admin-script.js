import { supabaseClient } from "./supabase-client.js";

import {
    loadUsersPage
} from "./boundary/users-boundary.js";

import {
    loadCoachApplications,
    loadApprovedCoaches,
    loadSuspendedCoaches
} from "./boundary/coaches-boundary.js";

import {
    loadLandingPage
} from "./boundary/landing-boundary.js";


/* =========================================
   ADMIN PROFILE
========================================= */

async function loadAdminProfile(user, profile) {
    const avatar = document.getElementById("admin-avatar");
    const nameElement = document.getElementById("admin-profile-name");
    const roleElement = document.getElementById("admin-profile-role");

    // Use the name from the user's profile if available.
    const { data: adminDetails, error } = await supabaseClient
        .from("profiles")
        .select("full_name, app_role")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Unable to load admin profile:", error.message);
    }

    const adminName = adminDetails?.full_name?.trim()
        || user.user_metadata?.full_name?.trim()
        || user.email
        || "Administrator";

    if (avatar) {
        avatar.textContent = adminName.charAt(0).toUpperCase();
    }

    if (nameElement) {
        nameElement.textContent = adminName;
    }

    if (roleElement) {
        roleElement.textContent = "Admin";
    }
}


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

    await loadAdminProfile(user, profile);

    // Load dashboard and management pages
    await loadDashboardStatistics();

    await loadCoachApplications();
    await loadApprovedCoaches();
    await loadSuspendedCoaches();

    await loadUsersPage();
    
    await loadLandingPage();
}


/* =========================================
   DASHBOARD STATISTICS
========================================= */

async function loadDashboardStatistics() {
    try {
        // Total registered users
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
                totalUsers.textContent = userCount ?? 0;
            }
        }


        // Total approved health coaches
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
                totalCoaches.textContent = coachCount ?? 0;
            }
        }


        // Pending coach applications
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
        const selectedTab = tab.dataset.coachTab;

        // Remove active state
        coachTabs.forEach((item) => {
            item.classList.remove("active");
        });

        coachTabPanels.forEach((panel) => {
            panel.classList.remove("active");
        });

        // Activate selected tab
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
    logoutModal?.classList.add("show");
}


function closeLogoutModal() {
    logoutModal?.classList.remove("show");
}

logoutButton?.addEventListener(
    "click",
    openLogoutModal
);

logoutModalClose?.addEventListener(
    "click",
    closeLogoutModal
);

cancelLogoutButton?.addEventListener(
    "click",
    closeLogoutModal
);

logoutModal?.addEventListener("click", (event) => {
    if (event.target === logoutModal) {
        closeLogoutModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        logoutModal?.classList.contains("show")
    ) {
        closeLogoutModal();
    }
});

confirmLogoutButton?.addEventListener(
    "click",
    logoutAdmin
);

checkAdminAccess();