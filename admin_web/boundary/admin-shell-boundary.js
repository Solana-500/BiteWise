import {
    loadAdminSession,
    logoutAdmin
} from "../control/auth-controller.js";
 

// redirect to landing
const ACCESS_DENIED_URL = "../website/index.html";
const LOGGED_OUT_URL = "../../website/index.html";
 
 
function showAdminProfile({ user, profile }) {
 
    const avatar = document.getElementById("admin-avatar");
    const nameElement = document.getElementById("admin-profile-name");
    const roleElement = document.getElementById("admin-profile-role");
 
    const adminName = profile?.full_name?.trim()
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
 
 
async function handleLogout() {
 
    try {
        await logoutAdmin();
    } catch (error) {
        console.error("Error logging out:", error.message);
        return;
    }
 
    window.location.href = LOGGED_OUT_URL;
}
 
 
function setupLogoutModal() {
 
    const logoutButton = document.getElementById("logout-button");
    const logoutModal = document.getElementById("logout-modal");
    const closeButton = document.getElementById("logout-modal-close");
    const cancelButton = document.getElementById("cancel-logout");
    const confirmButton = document.getElementById("confirm-logout");
 
    const open = () => logoutModal?.classList.add("show");
    const close = () => logoutModal?.classList.remove("show");
 
    logoutButton?.addEventListener("click", open);
    closeButton?.addEventListener("click", close);
    cancelButton?.addEventListener("click", close);
    confirmButton?.addEventListener("click", handleLogout);
 
    logoutModal?.addEventListener("click", event => {
        if (event.target === logoutModal) {
            close();
        }
    });
 
    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            logoutModal?.classList.contains("show")
        ) {
            close();
        }
    });
}
 

export async function startAdminPage() {
 
    setupLogoutModal();
 
    const session = await loadAdminSession();
 
    if (!session) {
        window.location.href = ACCESS_DENIED_URL;
        return false;
    }
 
    showAdminProfile(session);
 
    return true;
}