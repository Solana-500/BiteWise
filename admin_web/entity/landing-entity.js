import { supabaseClient } from "../supabase-client.js";

export async function getLandingDraft() {
    const { data: draft, error: draftError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "draft")
        .maybeSingle();

    if (draftError) throw draftError;

    if (draft) {
        return draft;
    }

    const { data: published, error: publishedError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "published")
        .maybeSingle();

    if (publishedError) throw publishedError;

    return {
        id: null,
        content: published?.content || {}
    };
}

export async function uploadLandingHeroImage(file) {
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const filePath = `hero/${crypto.randomUUID()}.${fileExtension}`;

    const { data, error } = await supabaseClient.storage
        .from("landing-page-images")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data: publicUrlData } = supabaseClient.storage
        .from("landing-page-images")
        .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
}

export async function saveHeroDraft(hero) {
    const { data: draft, error: draftError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "draft")
        .maybeSingle();

    if (draftError) throw draftError;

    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!userData.user) {
        throw new Error("You must be logged in to save a draft.");
    }

    let existingContent = draft?.content || {};

    // If no draft exists, start from the published version
    if (!draft) {
        const { data: published, error: publishedError } =
            await supabaseClient
                .from("landing_page_content")
                .select("content")
                .eq("status", "published")
                .maybeSingle();

        if (publishedError) throw publishedError;

        existingContent = published?.content || {};
    }

    const updatedContent = {
        ...existingContent,
        hero
    };

    if (draft) {
        const { data, error } = await supabaseClient
            .from("landing_page_content")
            .update({ content: updatedContent })
            .eq("id", draft.id)
            .select("id, content")
            .single();

        if (error) throw error;

        return data;
    }

    const { data, error } = await supabaseClient
        .from("landing_page_content")
        .insert({
            status: "draft",
            content: updatedContent,
            created_by: userData.user.id
        })
        .select("id, content")
        .single();

    if (error) throw error;

    return data;
}


export async function saveFeaturesDraft(features) {
    const { data: draft, error: draftError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "draft")
        .maybeSingle();

    if (draftError) throw draftError;

    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!userData.user) {
        throw new Error("You must be logged in to save a draft.");
    }

    let existingContent = draft?.content || {};

    // If no draft exists, start from the published version
    if (!draft) {
        const { data: published, error: publishedError } =
            await supabaseClient
                .from("landing_page_content")
                .select("content")
                .eq("status", "published")
                .maybeSingle();

        if (publishedError) throw publishedError;

        existingContent = published?.content || {};
    }

    // Update Features without overwriting Hero or other sections
    const updatedContent = {
        ...existingContent,
        features
    };

    if (draft) {
        const { data, error } = await supabaseClient
            .from("landing_page_content")
            .update({ content: updatedContent })
            .eq("id", draft.id)
            .select("id, content")
            .single();

        if (error) throw error;

        return data;
    }

    const { data, error } = await supabaseClient
        .from("landing_page_content")
        .insert({
            status: "draft",
            content: updatedContent,
            created_by: userData.user.id
        })
        .select("id, content")
        .single();

    if (error) throw error;

    return data;
}


export async function saveHowItWorksDraft(howItWorks) {
    const { data: draft, error: draftError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "draft")
        .maybeSingle();

    if (draftError) throw draftError;

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("You must be logged in to save a draft.");

    let existingContent = draft?.content || {};

    if (!draft) {
        const { data: published, error: publishedError } = await supabaseClient
            .from("landing_page_content")
            .select("content")
            .eq("status", "published")
            .maybeSingle();

        if (publishedError) throw publishedError;

        existingContent = published?.content || {};
    }

    const updatedContent = {
        ...existingContent,
        howItWorks
    };

    if (draft) {
        const { error } = await supabaseClient
            .from("landing_page_content")
            .update({ content: updatedContent })
            .eq("id", draft.id);

        if (error) throw error;
    } else {
        const { error } = await supabaseClient
            .from("landing_page_content")
            .insert({
                content: updatedContent,
                status: "draft",
                created_by: user.id
            });

        if (error) throw error;
    }
}


export async function saveFeaturedCoachesDraft(featuredCoaches) {
    const { data: draft, error: draftError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "draft")
        .maybeSingle();

    if (draftError) throw draftError;

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error("You must be logged in to save a draft.");
    }

    let existingContent = draft?.content || {};

    // If no draft exists, start from the published version.
    if (!draft) {
        const { data: published, error: publishedError } =
            await supabaseClient
                .from("landing_page_content")
                .select("content")
                .eq("status", "published")
                .maybeSingle();

        if (publishedError) throw publishedError;

        existingContent = published?.content || {};
    }

    const updatedContent = {
        ...existingContent,
        featuredCoaches
    };

    if (draft) {
        const { error } = await supabaseClient
            .from("landing_page_content")
            .update({ content: updatedContent })
            .eq("id", draft.id);

        if (error) throw error;
    } else {
        const { error } = await supabaseClient
            .from("landing_page_content")
            .insert({
                content: updatedContent,
                status: "draft",
                created_by: user.id
            });

        if (error) throw error;
    }
}



export async function loadApprovedCoachesForLanding() {
    // Load approved health coaches.
    const { data: coaches, error: coachError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, coaching_specialty")
        .eq("app_role", "coach")
        .eq("approval_status", "approved");

    if (coachError) throw coachError;

    // Load ratings visible to the current user.
    const { data: reviews, error: reviewError } = await supabaseClient
        .from("coach_reviews")
        .select("coach_id, rating");

    if (reviewError) throw reviewError;

    // Calculate each coach's average rating.
    const coachesWithRatings = coaches.map(coach => {
        const coachReviews = reviews.filter(
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

    // Put rated coaches first, highest average rating first.
    coachesWithRatings.sort((a, b) => {
        if (a.averageRating === null) return 1;
        if (b.averageRating === null) return -1;

        return b.averageRating - a.averageRating;
    });

    // Return the top 10 for the admin to choose from.
    return coachesWithRatings.slice(0, 10);
}



export async function savePlansDraft(plans) {
    const { data: draft, error: draftError } = await supabaseClient
        .from("landing_page_content")
        .select("id, content")
        .eq("status", "draft")
        .maybeSingle();

    if (draftError) throw draftError;

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error("You must be logged in to save a draft.");
    }

    let existingContent = draft?.content || {};

    // If no draft exists, start from the published version.
    if (!draft) {
        const { data: published, error: publishedError } =
            await supabaseClient
                .from("landing_page_content")
                .select("content")
                .eq("status", "published")
                .maybeSingle();

        if (publishedError) throw publishedError;

        existingContent = published?.content || {};
    }

    // Update only the plans section.
    const updatedContent = {
        ...existingContent,
        plans
    };

    if (draft) {
        const { error } = await supabaseClient
            .from("landing_page_content")
            .update({ content: updatedContent })
            .eq("id", draft.id);

        if (error) throw error;
    } else {
        const { error } = await supabaseClient
            .from("landing_page_content")
            .insert({
                content: updatedContent,
                status: "draft",
                created_by: user.id
            });

        if (error) throw error;
    }
}


export async function publishLandingDraft() {
    const { error } = await supabaseClient.rpc(
        "publish_landing_page_draft"
    );

    if (error) {
        throw error;
    }
}
