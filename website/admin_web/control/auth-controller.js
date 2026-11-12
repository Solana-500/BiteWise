import {
    getAdminSession,
    signOutAdmin
} from "../entity/auth-entity.js";
 
 
export async function loadAdminSession() {
    return await getAdminSession();
}
 
export async function logoutAdmin() {
    await signOutAdmin();
}