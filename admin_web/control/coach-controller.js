import {
    getCoachApplications,
    getApprovedCoaches,
    getSuspendedCoaches,
    getCoachCredentials,
    getCoachCredentialUrl,
    approveCoach as approveCoachEntity,
    rejectCoach as rejectCoachEntity,
    updateCoachSuspension
} from "../entity/coach-entity.js";

export async function loadCoachApplications() {
    return await getCoachApplications();
}

export async function loadApprovedCoaches() {
    return await getApprovedCoaches();
}

export async function loadSuspendedCoaches() {
    return await getSuspendedCoaches();
}

export async function loadCoachCredentials(coachId) {
    return await getCoachCredentials(coachId);
}

export async function openCoachCredential(filePath) {
    return await getCoachCredentialUrl(filePath);
}

export async function approveCoach(coachId) {
    return await approveCoachEntity(coachId);
}

export async function rejectCoach(coachId) {
    return await rejectCoachEntity(coachId);
}

export async function suspendCoach(coachId) {
    return await updateCoachSuspension(coachId, true);
}

export async function reactivateCoach(coachId) {
    return await updateCoachSuspension(coachId, false);
}