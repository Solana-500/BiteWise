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



export async function getPublishedReviewsForLanding(page = 1, pageSize = 10) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabaseClient
        .from("app_feedback")
        .select(`
            id,
            user_id,
            rating,
            feedback_text,
            created_at,
            moderation_status
        `, { count: "exact" })
        .eq("moderation_status", "published")
        .not("feedback_text", "is", null)
        .neq("feedback_text", "")
        .order("rating", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        throw new Error(`Unable to load featured reviews: ${error.message}`);
    }

    const reviews = data ?? [];

    const profileNames = await getProfileNames(
        reviews.map(review => review.user_id)
    );

    const formattedReviews = reviews.map(review => ({
        ...review,
        reviewer_name: profileNames[review.user_id] || "Unknown User",
        content_type: "app",
        content_text: review.feedback_text ?? ""
    }));

    return {
        reviews: formattedReviews,
        totalCount: count ?? 0,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize)
    };
}