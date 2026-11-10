import {
    loadModerationContent,
    setModerationFilter,
    setModerationSearch,
    setReviewTypeFilter,
    moderateContent
} from "./review-controller.js";

import { supabaseClient } from "../supabase-client.js";

let moderationItems = [];


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


async function getCurrentAdminId() {
    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
        throw new Error("Unable to identify the logged-in admin.");
    }

    return user.id;
}


function renderTabCounts(counts) {
    const tabCounts = {
        "pending-tab-count": counts.pending,
        "reported-tab-count": counts.reported,
        "published-tab-count": counts.published,
        "rejected-tab-count": counts.rejected,
        "hidden-tab-count": counts.hidden
    };

    Object.entries(tabCounts).forEach(([elementId, count]) => {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = count ?? 0;
        }
    });
}


function setupReviewTypeFilter() {
    const typeFilter = document.getElementById("review-type-filter");

    if (!typeFilter) return;

    typeFilter.addEventListener("change", () => {
        const viewData = setReviewTypeFilter(typeFilter.value);
        renderView(viewData);
    });
}


function renderReviewCards(items) {
    const list = document.getElementById("moderation-review-list");
    const emptyState = document.getElementById("review-empty-state");
    const loadingState = document.getElementById("review-loading-state");

    if (!list) {
        console.error("Review list element was not found.");
        return;
    }

    if (loadingState) {
        loadingState.hidden = true;
    }

    if (emptyState) {
        emptyState.hidden = items.length > 0;
    }

    list.querySelectorAll(".moderation-review-card").forEach((card) => {
        card.remove();
    });

    
    items.forEach((item) => {
        const reviewerName = escapeHTML(item.reviewer_name || "Unknown User");
        const reviewerId = escapeHTML(item.client_id ?? item.user_id ?? "");
        const initials = reviewerName
            .split(/\s+/)
            .filter(Boolean)
            .map(name => name.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

        const contentTypeLabel =
            item.content_type === "coach"
                ? "Health Coach Review"
                : "App Review";

        const coachName = escapeHTML(item.coach_name || "Unknown Coach");
        const content = escapeHTML(
            item.content_text || "No written feedback provided."
        );

        const numericRating = Number(item.rating);
        const rating = Number.isFinite(numericRating)
            ? Math.max(0, Math.min(5, numericRating))
            : 0;

        const date = item.created_at
            ? new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
            : "Unknown date";

        const card = document.createElement("article");
        card.className = "moderation-review-card";

        const coachDetails = item.content_type === "coach"
            ? `<div class="review-coach-line">
                <span class="review-content-type">${contentTypeLabel}</span>
                <span class="review-coach-name">for <strong>${coachName}</strong></span>
            </div>`
            : `<div class="review-coach-line">
                <span class="review-content-type">${contentTypeLabel}</span>
            </div>`;

        card.innerHTML = `
            <div class="review-card-top">
                <div class="review-reviewer-info">
                    <div class="reviewer-avatar">${initials}</div>

                    <div class="reviewer-details">
                        <strong class="reviewer-name">${reviewerName}</strong>
                        <div class="review-date">
                            ${date}
                            ${reviewerId ? ` · ID ${reviewerId}` : ""}
                        </div>
                    </div>
                </div>

                <div class="review-rating" aria-label="${rating.toFixed(1)} out of 5 stars">
                    <span class="review-stars" aria-hidden="true">${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))}</span>
                    <strong>${rating.toFixed(1)}</strong>
                </div>
            </div>

            ${coachDetails}

            <p class="review-content">${content}</p>

            <div class="moderation-review-actions">
                ${
                    item.moderation_status === "pending"
                        ? `
                            <button type="button" data-action="publish"
                                data-id="${escapeHTML(item.id)}"
                                data-type="${item.content_type}">
                                Approve &amp; Publish
                            </button>
                            <button type="button" data-action="reject"
                                data-id="${escapeHTML(item.id)}"
                                data-type="${item.content_type}">
                                Reject
                            </button>
                        `
                        : ""
                }

                ${
                    item.moderation_status === "published"
                        ? `
                            <button type="button" data-action="hide"
                                data-id="${escapeHTML(item.id)}"
                                data-type="${item.content_type}">
                                Hide
                            </button>
                        `
                        : ""
                }

                ${
                    item.moderation_status === "rejected"
                        ? `
                            <button type="button" data-action="pending"
                                data-id="${escapeHTML(item.id)}"
                                data-type="${item.content_type}">
                                Return to Pending
                            </button>
                        `
                        : ""
                }

                ${
                    item.moderation_status === "hidden"
                        ? `
                            <button type="button" data-action="publish"
                                data-id="${escapeHTML(item.id)}"
                                data-type="${item.content_type}">
                                Restore to Published
                            </button>
                        `
                        : ""
                }
            </div>
        `;

        list.appendChild(card);
    });

}



function renderView(viewData) {
    moderationItems = viewData.items;

    renderTabCounts(viewData.counts);
    renderReviewCards(viewData.items);
}



document.querySelectorAll("[data-review-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
        document.querySelectorAll("[data-review-filter]").forEach((item) => {
            item.classList.remove("active");
        });

        tab.classList.add("active");

        const viewData = setModerationFilter(tab.dataset.reviewFilter);
        renderView(viewData);
    });
});



const searchInput = document.getElementById("review-search-input");

searchInput?.addEventListener("input", () => {
    const viewData = setModerationSearch(searchInput.value);
    renderView(viewData);
});



document.getElementById("moderation-review-list")
    ?.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const contentId = button.dataset.id;
        const contentType = button.dataset.type;

        const statusByAction = {
            publish: "published",
            reject: "rejected",
            hide: "hidden",
            pending: "pending"
        };

        const status = statusByAction[action];

        if (!status || !contentId || !contentType) return;

        button.disabled = true;

        try {
            const adminId = await getCurrentAdminId();

            const viewData = await moderateContent({
                contentType,
                contentId,
                status,
                adminId
            });

            renderView(viewData);

        } catch (error) {
            console.error("Moderation action failed:", error);
            button.disabled = false;
        }
    });


const typeFilter = document.getElementById("review-type-filter");

typeFilter?.addEventListener("change", () => {
    const viewData = setReviewTypeFilter(typeFilter.value);
    renderView(viewData);
});


export async function loadReviewsPage() {
    const loadingState = document.getElementById("review-loading-state");

    if (loadingState) {
        loadingState.hidden = false;
    }

    try {
        const viewData = await loadModerationContent();
        renderView(viewData);
    } catch (error) {
        console.error("Unable to load reviews:", error);

        if (loadingState) {
            loadingState.textContent =
                "Unable to load reviews. Please check your connection and permissions.";
            loadingState.hidden = false;
        }
    }
}
