import {
    getAllCoachContent,
    getWorkoutPlanDetails,
    updateContentStatus
} from "../entity/content-entity.js";

let coachContent = [];
let currentFilter = "pending";
let currentSearch = "";
let currentContentType = "all";


const STATUS_MAP = {
    pending: ["pending_review"],
    approved: ["approved", "active"],
    changesRequested: ["changes_requested"]
};


export async function loadCoachContent() {
    try {
        coachContent = await getAllCoachContent();
        return getContentViewData();
    } catch (error) {
        console.error("Unable to load coach content:", error);
        throw error;
    }
}


export function setContentStatusFilter(status) {
    const allowedStatuses = [
        "pending",
        "approved",
        "changesRequested"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid content status filter.");
    }

    currentFilter = status;
    return getContentViewData();
}


export function setContentSearch(search) {
    currentSearch = String(search ?? "").trim().toLowerCase();
    return getContentViewData();
}


export function setContentTypeFilter(type) {
    const allowedTypes = ["all", "meal", "workout"];

    if (!allowedTypes.includes(type)) {
        throw new Error("Invalid content type filter.");
    }

    currentContentType = type;
    return getContentViewData();
}


function getFilteredContent() {
    let filtered = coachContent.filter(item =>
        STATUS_MAP[currentFilter].includes(item.status)
    );

    if (currentContentType !== "all") {
        filtered = filtered.filter(
            item => item.content_type === currentContentType
        );
    }

    if (currentSearch) {
        filtered = filtered.filter(item => {
            const searchableText = [
                item.title,
                item.goal,
                item.coach_name,
                item.coach_id,
                item.content_type
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(currentSearch);
        });
    }

    return filtered;
}


function getContentCounts() {
    return {
        pending: coachContent.filter(
            item => STATUS_MAP.pending.includes(item.status)
        ).length,

        approved: coachContent.filter(
            item => STATUS_MAP.approved.includes(item.status)
        ).length,

        changesRequested: coachContent.filter(
            item => STATUS_MAP.changesRequested.includes(item.status)
        ).length
    };
}


function getContentViewData() {
    return {
        items: getFilteredContent(),
        counts: getContentCounts(),
        currentFilter,
        currentSearch,
        currentContentType
    };
}


export async function moderateCoachContent({
    contentType,
    contentId,
    status,
    adminFeedback = "",
    adminId
}) {
    const allowedStatuses = [
        "approved",
        "changes_requested"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid moderation action.");
    }

    if (
        status === "changes_requested" &&
        !String(adminFeedback).trim()
    ) {
        throw new Error(
            "Please provide feedback when requesting changes."
        );
    }

    const result = await updateContentStatus({
        contentType,
        contentId,
        status,
        adminFeedback,
        adminId
    });

    // Reload content after the Supabase update succeeds.
    coachContent = await getAllCoachContent();

    return {
        ...getContentViewData(),
        updatedContent: result
    };
}


export async function loadWorkoutPlanDetails(planId) {
    try {
        return await getWorkoutPlanDetails(planId);
    } catch (error) {
        console.error("Unable to load workout plan details:", error);
        throw error;
    }
}