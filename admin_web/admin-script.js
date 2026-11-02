import { supabaseClient } from "./supabase-client.js";

import {
    loadUsersPage
} from "./boundary/users-boundary.js";

   import { 
    loadCoachesPage 
} from "./boundary/coaches-boundary.js";

import {
    loadLandingPage
} from "./boundary/landing-boundary.js";

import {
    loadReviewsPage
} from "./boundary/reviews-boundary.js";

import {
    loadContentPage
} from "./boundary/content-boundary.js";

import {
    loadSubscriptionsPage
} from "./boundary/subscriptions-boundary.js";

import { 
    loadReportsPage 
} from "./boundary/reports-boundary.js";

import {
    loadAuditPage
} from "./boundary/audit-boundary.js";

import { 
    loadDashboardPage 
} from "./boundary/dashboard-boundary.js";

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
    
    // Load only the module belonging to the current page.
    if (document.getElementById("total-users")) {
        await loadDashboardPage();
    }

    if (document.querySelector(".coach-tab")) {
        await loadCoachesPage();
    }

    if (document.getElementById("users-table-body")) {
        await loadUsersPage();
    }

    if (document.getElementById("moderation-review-list")) {
        await loadReviewsPage();
    }

    if (document.getElementById("landing-page-editor")) {
        await loadLandingPage();
    }

    if (document.getElementById("content-table-body")) {
        await loadContentPage();
    }

    if (document.getElementById("subscription-list-panel")) {
        await loadSubscriptionsPage();
    }

    if (document.getElementById("report-range")) {
        await loadReportsPage();
    }

    if (document.getElementById("audit-toolbar")) {
        await loadAuditPage();
    }
}


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

    window.location.href = "../../website/index.html";
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