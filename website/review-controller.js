import {
    getAllModerationContent,
    updateModerationStatus,
    getPublishedReviewsForLanding
} from "./review-entity.js";


let moderationContent = [];
let currentFilter = "pending";
let currentSearch = "";
let currentReviewType = "all";


/* =========================================
   FUNCTIONS
========================================= */

export async function loadModerationContent() {
    try {
        moderationContent = await getAllModerationContent();

        return getModerationViewData();
    } catch (error) {
        console.error("Unable to load moderation content:", error);
        throw error;
    }
}


export function setModerationFilter(filter) {
    const allowedFilters = [
        "pending",
        "reported",
        "published",
        "rejected",
        "hidden"
    ];

    if (!allowedFilters.includes(filter)) {
        throw new Error("Invalid moderation filter.");
    }

    currentFilter = filter;
    return getModerationViewData();
}


export function setModerationSearch(search) {
    currentSearch = String(search ?? "").trim().toLowerCase();

    return getModerationViewData();
}


function getFilteredContent() {
    let filtered = [...moderationContent];

    if (currentFilter === "reported") {
        filtered = filtered.filter(
            (item) => Number(item.report_count ?? 0) > 0
        );
    } else {
        filtered = filtered.filter(
            (item) => item.moderation_status === currentFilter
        );
    }

    if (currentReviewType !== "all") {
        filtered = filtered.filter(
            (item) => item.content_type === currentReviewType
        );
    }
    
    if (currentSearch) {
        filtered = filtered.filter((item) => {
            const text = [
                item.content_text,
                item.content_type,
                item.id,
                item.client_id,
                item.user_id,
                item.coach_id,
                item.reviewer_name,
                item.coach_name
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(currentSearch);
        });
    }

    return filtered;
}



function getSummaryCounts() {
    return {
        pending: moderationContent.filter(
            item => item.moderation_status === "pending"
        ).length,

        reported: moderationContent.filter(
            item => Number(item.report_count ?? 0) > 0
        ).length,

        published: moderationContent.filter(
            item => item.moderation_status === "published"
        ).length,

        rejected: moderationContent.filter(
            item => item.moderation_status === "rejected"
        ).length,

        hidden: moderationContent.filter(
            item => item.moderation_status === "hidden"
        ).length
    };
}


function getModerationViewData() {
    return {
        items: getFilteredContent(),
        counts: getSummaryCounts(),
        currentFilter
    };
}


export async function moderateContent({
    contentType,
    contentId,
    status,
    adminId
}) {
    await updateModerationStatus({
        contentType,
        contentId,
        status,
        adminId
    });

    // Refresh the local data after a successful update.
    moderationContent = await getAllModerationContent();

    return getModerationViewData();
}


export function setReviewTypeFilter(type) {
    const allowedTypes = ["all", "app", "coach"];

    if (!allowedTypes.includes(type)) {
        throw new Error("Invalid review type.");
    }

    currentReviewType = type;
    return getModerationViewData();
}


export async function loadPublishedReviewsForLanding() {
    return await getPublishedReviewsForLanding();
}
