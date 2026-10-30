import { supabaseClient } from "../supabase-client.js";

async function getCoachEmailsById() {
    const { data, error } =
        await supabaseClient.functions.invoke(
            "get-user-emails",
            {
                body: {}
            }
        );

    if (error) {
        throw error;
    }

    const users = data?.users || [];

    return new Map(
        users
            .filter(user => user.app_role === "coach")
            .map(user => [user.id, user.email])
    );
}


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
            approval_status,
            created_at
        `)
        .eq("app_role", "coach")
        .eq("approval_status", "pending")
        .order("full_name", { ascending: true });

    if (error) throw error;

    const applications = data || [];

    if (applications.length === 0) {
        return [];
    }

    const emailById = await getCoachEmailsById();

    return applications.map(coach => ({
        ...coach,
        email: emailById.get(coach.id) || null
    }));
}



export async function getApprovedCoaches() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select(`
            id,
            full_name,
            age,
            gender,
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

    const coaches = data || [];

    if (coaches.length === 0) {
        return [];
    }

    const emailById = await getCoachEmailsById();

    return coaches.map(coach => ({
        ...coach,
        email: emailById.get(coach.id) || null
    }));
}


export async function getSuspendedCoaches() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select(`
            id,
            full_name,
            age,
            gender,
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

    const coaches = data || [];

    if (coaches.length === 0) {
        return [];
    }

    const emailById = await getCoachEmailsById();

    return coaches.map(coach => ({
        ...coach,
        email: emailById.get(coach.id) || null
    }));
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


export async function getApprovedCoachesForLanding() {
    // Get all approved, non-suspended coaches
    const coaches = await getApprovedCoaches();

    if (coaches.length === 0) {
        return [];
    }

    // Get coach ratings
    const coachIds = coaches.map(coach => coach.id);

    const { data: reviews, error: reviewError } = await supabaseClient
        .from("coach_reviews")
        .select("coach_id, rating")
        .in("coach_id", coachIds);

    if (reviewError) throw reviewError;

    // Calculate each coach's average rating
    const coachesWithRatings = coaches.map(coach => {
        const coachReviews = (reviews ?? []).filter(
            review => review.coach_id === coach.id
        );

        const averageRating = coachReviews.length
            ? coachReviews.reduce(
                (sum, review) => sum + Number(review.rating),
                0
            ) / coachReviews.length
            : null;

        return {
            ...coach,
            averageRating,
            reviewCount: coachReviews.length
        };
    });

    // Rated coaches first, highest average rating first
    coachesWithRatings.sort((a, b) => {
        if (a.averageRating === null) return 1;
        if (b.averageRating === null) return -1;

        return b.averageRating - a.averageRating;
    });

    // Return all coaches; pagination will be handled in the boundary
    return coachesWithRatings;
}
