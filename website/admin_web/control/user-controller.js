import {
    getUsers,
    updateUserSuspension,
    getFilteredUsers
} from "../entity/user-entity.js";


export async function loadUsers() {
    return await getUsers();
}

export async function suspendUser(userId) {
    return await updateUserSuspension(
        userId,
        true
    );
}

export async function reactivateUser(userId) {
    return await updateUserSuspension(
        userId,
        false
    );
}

export function filterUsers(
    users,
    searchTerm,
    status,
    plan = "all"
) {
    return getFilteredUsers(
        users,
        searchTerm,
        status,
        plan
    );
}