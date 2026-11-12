import { supabaseClient } from "../supabase-client.js";

const REVIEW_TABLES = {
    coach: "coach_reviews",
    app: "app_feedback"
};



async function getProfileNames(userIds) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];

    if (uniqueIds.length === 0) {
        return {};
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueIds);

    if (error) {
        throw new Error(`Unable to load profile names: ${error.message}`);
    }

    return Object.fromEntries(
        (data ?? []).map(profile => [
            profile.id,
            profile.full_name || "Unknown User"
        ])
    );
}




export async function getCoachReviews() {
    const { data, error } = await supabaseClient
        .from(REVIEW_TABLES.coach)
        .select(`
            id,
            client_id,
            coach_id,
            rating,
            review_text,
            created_at,
            moderation_status,
            report_count
        `)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Unable to load coach reviews: ${error.message}`);
    }

    const reviews = data ?? [];

    const profileNames = await getProfileNames([
        ...reviews.map(review => review.client_id),
        ...reviews.map(review => review.coach_id)
    ]);

    return reviews.map(review => ({
        ...review,
        reviewer_name: profileNames[review.client_id] || "Unknown User",
        coach_name: profileNames[review.coach_id] || "Unknown Coach",
        content_type: "coach",
        content_text: review.review_text ?? ""
    }));
}



export async function getAppFeedback() {
    const { data, error } = await supabaseClient
        .from(REVIEW_TABLES.app)
        .select(`
            id,
            user_id,
            rating,
            feedback_text,
            created_at,
            moderation_status,
            report_count
        `)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Unable to load app feedback: ${error.message}`);
    }

    const feedbackItems = data ?? [];

    const profileNames = await getProfileNames(
        feedbackItems.map(feedback => feedback.user_id)
    );

    return feedbackItems.map(feedback => ({
        ...feedback,
        reviewer_name: profileNames[feedback.user_id] || "Unknown User",
        content_type: "app",
        content_text: feedback.feedback_text ?? ""
    }));
}



export async function getAllModerationContent() {
    const [coachReviews, appFeedback] = await Promise.all([
        getCoachReviews(),
        getAppFeedback()
    ]);

    return [...coachReviews, ...appFeedback].sort(
        (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
    );
}


export async function updateModerationStatus({
    contentType,
    contentId,
    status,
    adminId
}) {
    const allowedStatuses = [
        "pending",
        "published",
        "rejected",
        "hidden"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid moderation status.");
    }

    const table = REVIEW_TABLES[contentType];

    if (!table) {
        throw new Error("Invalid review content type.");
    }

    const { data, error } = await supabaseClient
        .from(table)
        .update({
            moderation_status: status,
            moderated_at: new Date().toISOString(),
            moderated_by: adminId
        })
        .eq("id", contentId)
        .select("id, moderation_status")
        .single();

    if (error) {
        throw new Error(`Unable to update moderation status: ${error.message}`);
    }

    return data;
}



export async function markContentReported({
    contentType,
    contentId
}) {
    const table = REVIEW_TABLES[contentType];

    if (!table) {
        throw new Error("Invalid review content type.");
    }

    // Reporting will be connected to a real report source
    // once the app's reporting workflow is confirmed.
    const { data, error } = await supabaseClient
        .from(table)
        .select("id, report_count")
        .eq("id", contentId)
        .single();

    if (error) {
        throw new Error(`Unable to load report count: ${error.message}`);
    }

    return data;
}



export async function getPublishedReviewsForLanding() {
    const { data, error } = await supabaseClient
        .from("app_feedback")
        .select("id, user_id, rating, feedback_text, created_at")
        .eq("moderation_status", "published")
        .not("feedback_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) throw error;

    const rows = data || [];
    const userIds = [...new Set(rows.map(r => r.user_id))];

    let nameById = new Map();
    if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabaseClient
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

        if (profileError) throw profileError;
        nameById = new Map((profiles || []).map(p => [p.id, p.full_name]));
    }

    const reviews = rows.map(r => ({
        id: r.id,
        reviewer_name: nameById.get(r.user_id) || "BiteWise user",
        rating: r.rating,
        created_at: r.created_at,
        content_text: r.feedback_text
    }));

    return { reviews, currentPage: 1, totalPages: 1 };
}