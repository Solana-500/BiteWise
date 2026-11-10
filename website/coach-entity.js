import { supabaseClient } from "./supabase-client.js";

export async function getCoachApplications() {
    const { data, error } = await supabaseClient
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

    if (error) throw error;

    return data || [];
}


export async function getApprovedCoaches() {
    const { data, error } = await supabaseClient
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
        .order("full_name", { ascending: true });

    if (error) throw error;

    return data || [];
}


export async function getSuspendedCoaches() {
    const { data, error } = await supabaseClient
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
        .order("full_name", { ascending: true });

    if (error) throw error;

    return data || [];
}


export async function getCoachCredentials(coachId) {
    const { data, error } = await supabaseClient
        .from("coach_documents")
        .select(`
            id,
            file_name,
            file_path,
            file_type,
            verification_status,
            uploaded_at
        `)
        .eq("coach_id", coachId)
        .order("uploaded_at", { ascending: false });

    if (error) throw error;

    return data || [];
}


export async function getCoachCredentialUrl(filePath) {
    if (!filePath) {
        throw new Error("Credential file path is missing.");
    }

    const { data, error } = await supabaseClient.storage
        .from("coach-certificates")
        .createSignedUrl(filePath, 60);

    if (error) throw error;

    if (!data?.signedUrl) {
        throw new Error("No signed URL was returned.");
    }

    return data.signedUrl;
}


export async function approveCoach(coachId) {
    const { data, error } = await supabaseClient
        .from("profiles")
        .update({
            approval_status: "approved"
        })
        .eq("id", coachId)
        .eq("app_role", "coach")
        .eq("approval_status", "pending")
        .select("id, approval_status");

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error("No coach application was updated.");
    }

    const { error: documentError } = await supabaseClient
        .from("coach_documents")
        .update({
            verification_status: "approved"
        })
        .eq("coach_id", coachId);

    if (documentError) throw documentError;

    return data[0];
}


export async function rejectCoach(coachId) {
    const { data, error } = await supabaseClient
        .from("profiles")
        .update({
            approval_status: "rejected"
        })
        .eq("id", coachId)
        .eq("app_role", "coach")
        .eq("approval_status", "pending")
        .select("id, approval_status");

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error("No coach application was updated.");
    }

    const { error: documentError } = await supabaseClient
        .from("coach_documents")
        .update({
            verification_status: "rejected"
        })
        .eq("coach_id", coachId);

    if (documentError) throw documentError;

    return data[0];
}


export async function updateCoachSuspension(coachId, isSuspended) {
    const currentStatus = !isSuspended;

    const { data, error } = await supabaseClient
        .from("profiles")
        .update({
            is_suspended: isSuspended
        })
        .eq("id", coachId)
        .eq("app_role", "coach")
        .eq("approval_status", "approved")
        .eq("is_suspended", currentStatus)
        .select("id, is_suspended");

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error("No coach account was updated.");
    }

    return data[0];
}
