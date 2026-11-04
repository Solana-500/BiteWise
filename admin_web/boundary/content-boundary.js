import {
    loadCoachContent,
    loadWorkoutPlanDetails,
    setContentStatusFilter,
    setContentSearch,
    setContentTypeFilter,
    setContentCoachFilter,
    moderateCoachContent
} from "../control/content-controller.js";

import { supabaseClient } from "../supabase-client.js";

let selectedContent = null;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
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
    const elements = {
        "pending-content-count": counts.pending,
        "approved-content-count": counts.approved,
        "changes-requested-content-count": counts.changesRequested
    };

    Object.entries(elements).forEach(([id, count]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = count ?? 0;
    });
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getContentStatusLabel(status) {
    const statusLabels = {
        pending_review: "Pending Review",
        changes_requested: "Changes Requested",
        approved: "Approved",
        active: "Active",
        draft: "Draft",
        archived: "Archived"
    };

    return statusLabels[status] ?? status ?? "Unknown";
}

function renderContentRows(items) {
    const tbody = document.getElementById("content-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="6">
                    <div class="table-empty-state">
                        <strong>No content found</strong>
                        <span>There are no plans matching your filters.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    items.forEach(item => {
        const typeLabel = {
            meal: "Meal Plan",
            workout: "Workout Plan",
            recipe: "Recipe"
        }[item.content_type] ?? "Unknown Content";

        const statusLabel = getContentStatusLabel(item.status);

        const statusClass = {
            pending_review: "pending",
            approved: "approved",
            active: "approved",
            changes_requested: "changes",
            draft: "draft",
            archived: "archived"
        }[item.status] ?? "";

        const submittedDate = formatDate(
            item.submitted_at ?? item.created_at
        );

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeHTML(item.title || "Untitled Content")}</strong>
            </td>
            <td>${escapeHTML(item.coach_name || item.coach_id || "Unknown Coach")}</td>
            <td>${typeLabel}</td>
            <td>${submittedDate}</td>
            <td>
                <span class="content-status ${statusClass}">
                    ${escapeHTML(statusLabel)}
                </span>
            </td>
            <td>
                <div class="content-row-actions">
                    <button
                        type="button"
                        class="content-view-button"
                        data-action="view"
                        data-id="${escapeHTML(item.id)}"
                        data-type="${item.content_type}"
                    >
                        View
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}


function renderView(viewData) {
    window.__coachContentItems = viewData.items;

    renderTabCounts(viewData.counts);
    renderContentRows(viewData.items);

    const titles = {
        pending: [
            "Pending Review",
            "Review coach submissions awaiting approval."
        ],
        approved: [
            "Approved Content",
            "View content approved for users."
        ],
        changesRequested: [
            "Changes Requested",
            "View plans returned to coaches for revision and resubmission."
        ]
    };

    const [title, description] =
        titles[viewData.currentFilter] ?? titles.pending;

    const titleElement = document.getElementById("content-panel-title");
    const descriptionElement =
        document.getElementById("content-panel-description");

    if (titleElement) titleElement.textContent = title;
    if (descriptionElement) descriptionElement.textContent = description;

    document.querySelectorAll("[data-content-tab]").forEach(tab => {
        tab.classList.toggle(
            "active",
            tab.dataset.contentTab === viewData.currentFilter
        );
    });
}

function setupTabs() {
    document.querySelectorAll("[data-content-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            renderView(
                setContentStatusFilter(tab.dataset.contentTab)
            );
        });
    });
}

function setupSearch() {
    const search = document.getElementById("content-search");

    search?.addEventListener("input", () => {
        renderView(setContentSearch(search.value));
    });
}

function setupTypeFilter() {
    const filter = document.getElementById("content-type-filter");

    filter?.addEventListener("change", () => {
        renderView(setContentTypeFilter(filter.value));
    });
}

function openFeedbackModal(item) {
    selectedContent = item;

    const modal = document.getElementById("content-feedback-modal");
    const title = document.getElementById("content-feedback-title");
    const feedback = document.getElementById("content-admin-feedback");

    if (!modal || !title || !feedback) {
        console.error("Content feedback modal elements are missing.");
        return;
    }

    title.textContent =
        `Request Changes: ${item.title || "Untitled Plan"}`;

    feedback.value = "";
    modal.hidden = false;
}

function closeFeedbackModal() {
    const modal = document.getElementById("content-feedback-modal");
    if (modal) modal.hidden = true;

    selectedContent = null;
}

async function handleContentAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, id, type } = button.dataset;

    const item = window.__coachContentItems?.find(
        content =>
            String(content.id) === String(id) &&
            content.content_type === type
    );

    if (action === "view") {
        if (item) showContentDetails(item);
        return;
    }

    if (!id || !type) return;

    if (action === "reject") {
        if (item) openFeedbackModal(item);
        return;
    }

    if (action !== "approve") return;

    button.disabled = true;

    try {
        const viewData = await moderateCoachContent({
            contentType: type,
            contentId: id,
            status: "approved",
            adminFeedback: "",
            adminId: await getCurrentAdminId()
        });

        renderView(viewData);
    } catch (error) {
        console.error("Unable to approve content:", error);
        button.disabled = false;
    }
}

/* ==============================================
   CONTENT DETAILS MODAL
============================================== */


async function showContentDetails(item) {
    selectedContent = item;

    const modal = document.getElementById("content-details-modal");
    const title = document.getElementById("content-details-title");
    const body = document.getElementById("content-details-body");

    if (!modal || !title || !body) {
        console.error("Content details modal elements are missing.");
        return;
    }

    const isMealPlan = item.content_type === "meal";
    const isWorkoutPlan = item.content_type === "workout";
    const isRecipe = item.content_type === "recipe";

    title.textContent = item.title || "Untitled Content";

    const typeTag = document.getElementById("content-details-type-tag");
    const coachName = document.getElementById("content-details-coach");
    const submittedDate = document.getElementById("content-details-submitted");

    if (typeTag) {
        typeTag.textContent = {
            meal: "Meal Plan",
            workout: "Workout Plan",
            recipe: "Recipe"
        }[item.content_type] ?? "Unknown Content";

        typeTag.classList.toggle("workout-tag", isWorkoutPlan);
        typeTag.classList.toggle("meal-tag", isMealPlan);
        typeTag.classList.toggle("recipe-tag", isRecipe);
    }

    if (coachName) {
        coachName.textContent =
            `Coach ${item.coach_name || "Unknown Coach"}`;
    }

    if (submittedDate) {
        submittedDate.textContent =
            `Submitted ${formatDate(item.submitted_at || item.created_at)}`;
    }

    body.innerHTML = `<p>Loading content details...</p>`;
    modal.hidden = false;

    try {
        if (isMealPlan) {
            renderMealPlanDetails(item, body);
        } else if (isWorkoutPlan) {
            const sessions = await loadWorkoutPlanDetails(item.id);
            renderWorkoutPlanDetails(item, sessions, body);
        } else if (isRecipe) {
            renderRecipeDetails(item, body);
        }

        const isPending = item.status === "pending_review";

        const approveButton =
            document.getElementById("content-details-approve");

        const rejectButton =
            document.getElementById("content-details-reject");

        if (approveButton) approveButton.hidden = !isPending;
        if (rejectButton) rejectButton.hidden = !isPending;

    } catch (error) {
        console.error("Unable to display content details:", error);

        body.innerHTML = `
            <p class="content-details-error">
                Unable to load content details. Please try again.
            </p>
        `;
    }
}


function renderMealPlanDetails(item, body) {
    const summaryCards = [
        ["Goal", item.goal],
        ["Duration", item.duration],
        [
            "Daily Calorie Target",
            item.daily_calorie_target !== null &&
            item.daily_calorie_target !== undefined &&
            item.daily_calorie_target !== ""
                ? `${item.daily_calorie_target} kcal`
                : null
        ],
        [
            "Date Range",
            `${item.start_date
                ? formatDate(item.start_date)
                : "Not set"} – ${item.end_date
                ? formatDate(item.end_date)
                : "Not set"}`
        ]
    ];

    // No additional detail rows are needed.
    // Admin feedback is displayed in its own panel below.
    const otherDetails = [];

    // Extract the number of days from durations such as "7 days".
    const durationMatch = String(item.duration ?? "").match(/\d+/);
    const numberOfDays = durationMatch
        ? Math.min(Number(durationMatch[0]), 31)
        : 0;

    body.innerHTML = `
        <div class="workout-plan-summary">
            ${summaryCards
                .filter(([, value]) =>
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                )
                .map(([label, value]) => `
                    <div class="workout-summary-card">
                        <span>${escapeHTML(label)}</span>
                        <strong>${escapeHTML(String(value))}</strong>
                    </div>
                `)
                .join("")}
        </div>

        ${item.coach_notes
            ? `
                <section class="meal-coach-notes">
                    <span class="content-detail-label">
                        Coach notes
                    </span>
                    <p class="meal-coach-notes-content">
                        ${escapeHTML(item.coach_notes)}
                    </p>
                </section>
            `
            : ""
        }

        ${otherDetails
            .filter(([, value]) =>
                value !== null &&
                value !== undefined &&
                value !== ""
            )
            .map(([label, value]) => `
                <div class="content-detail-item">
                    <span class="content-detail-label">
                        ${escapeHTML(label)}
                    </span>
                    <span class="content-detail-value">
                        ${escapeHTML(String(value))}
                    </span>
                </div>
            `)
            .join("")}

        <section class="workout-sessions-section">
            <div class="workout-sessions-heading">
                <h3>Plan Contents</h3>
                <span class="workout-sessions-count">
                    ${numberOfDays} days
                </span>
            </div>

            ${numberOfDays > 0
                ? Array.from({ length: numberOfDays }, (_, index) => `
                    <details
                        class="workout-session"
                        ${index === 0 ? "open" : ""}
                    >
                        <summary>
                            <span class="workout-session-title">
                                <strong>Day ${index + 1}</strong>
                            </span>

                            <span class="workout-session-count">
                                0 meals
                            </span>
                        </summary>

                        <div class="workout-session-exercises">
                            <p class="content-detail-value">
                                No meals added for this day.
                            </p>
                        </div>
                    </details>
                `).join("")
                : `
                    <p class="content-detail-value">
                        No daily plan structure available.
                    </p>
                `
            }
        </section>

        ${item.admin_feedback
            ? `
                <section class="admin-change-request">
                    <div class="admin-change-request-heading">
                        <span class="admin-change-request-label">
                            Your Change Request
                        </span>
                        <p>
                            Feedback you provided when requesting changes
                            to this plan.
                        </p>
                    </div>

                    <p class="admin-change-request-message">
                        ${escapeHTML(item.admin_feedback)}
                    </p>
                </section>
            `
            : ""
        }
    `;
}



function renderWorkoutPlanDetails(item, sessions, body) {
    const equipment = Array.isArray(item.equipment)
        ? item.equipment
        : item.equipment
            ? String(item.equipment).split(",").map(value => value.trim())
            : [];

    const preferredDays = Array.isArray(item.preferred_days)
        ? item.preferred_days
        : item.preferred_days
            ? String(item.preferred_days).split(",").map(value => value.trim())
            : [];

    const summaryCards = [
        ["Goal", item.goal],
        [
            "Duration",
            item.duration_weeks ? `${item.duration_weeks} weeks` : null
        ],
        [
            "Frequency",
            item.sessions_per_week
                ? `${item.sessions_per_week} per week`
                : null
        ],
        [
            "Session length",
            item.session_length_minutes
                ? `${item.session_length_minutes} min`
                : null
        ]
    ];

    const otherDetails = [
        ["Health Notes", item.health_notes],
        ["Coach Notes", item.coach_notes]
    ];

    const totalExercises = sessions.reduce(
        (total, session) => total + (session.exercises?.length ?? 0),
        0
    );

    body.innerHTML = `
        <div class="workout-plan-summary">
            ${summaryCards
                .filter(([, value]) =>
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                )
                .map(([label, value]) => `
                    <div class="workout-summary-card">
                        <span>${escapeHTML(label)}</span>
                        <strong>${escapeHTML(String(value))}</strong>
                    </div>
                `)
                .join("")}
        </div>

        <div class="workout-plan-preferences">
            <div class="workout-preference">
                <span class="content-detail-label">Training location</span>
                <strong>
                    ${escapeHTML(item.training_location || "Not specified")}
                </strong>
            </div>

            <div class="workout-preference">
                <span class="content-detail-label">Experience level</span>
                <strong>
                    ${escapeHTML(item.experience_level || "Not specified")}
                </strong>
            </div>

            <div class="workout-preference">
                <span class="content-detail-label">Equipment</span>
                <div class="workout-chips">
                    ${equipment.length
                        ? equipment.map(value => `
                            <span class="workout-chip">
                                ${escapeHTML(value)}
                            </span>
                        `).join("")
                        : `<span class="content-detail-value">Not specified</span>`
                    }
                </div>
            </div>

            <div class="workout-preference">
                <span class="content-detail-label">Preferred days</span>
                <div class="workout-chips">
                    ${preferredDays.length
                        ? preferredDays.map(value => `
                            <span class="workout-chip">
                                ${escapeHTML(value)}
                            </span>
                        `).join("")
                        : `<span class="content-detail-value">Not specified</span>`
                    }
                </div>
            </div>
        </div>

        ${otherDetails
            .filter(([, value]) =>
                value !== null &&
                value !== undefined &&
                value !== ""
            )
            .map(([label, value]) => `
                <div class="content-detail-item">
                    <span class="content-detail-label">
                        ${escapeHTML(label)}
                    </span>
                    <span class="content-detail-value">
                        ${escapeHTML(String(value))}
                    </span>
                </div>
            `)
            .join("")}

        <section class="workout-sessions-section">
            <div class="workout-sessions-heading">
                <h3>Plan contents</h3>
                <span class="workout-sessions-count">
                    ${sessions.length} sessions · ${totalExercises} exercises
                </span>
            </div>

            ${sessions.length
                ? sessions.map((session, index) => {
                    const exercises = session.exercises ?? [];

                    return `
                        <details
                            class="workout-session"
                            ${index === 0 ? "open" : ""}
                        >
                            <summary>
                                <span class="workout-session-title">
                                    <strong>
                                        Session ${index + 1}${session.focus
                                            ? ` · ${escapeHTML(session.focus)}`
                                            : ""}
                                    </strong>
                                </span>

                                <span class="workout-session-count">
                                    ${exercises.length}
                                    ${exercises.length === 1
                                        ? "exercise"
                                        : "exercises"}
                                </span>
                            </summary>

                            <div class="workout-session-exercises">
                                ${exercises.length
                                    ? exercises.map(exercise => `
                                        <div class="workout-exercise">
                                            <div class="workout-exercise-info">
                                                <strong>
                                                    ${escapeHTML(
                                                        exercise.name ||
                                                        "Unnamed exercise"
                                                    )}
                                                </strong>

                                                ${exercise.category
                                                    ? `<small>${escapeHTML(exercise.category)}</small>`
                                                    : ""}

                                                ${exercise.notes
                                                    ? `<p>${escapeHTML(exercise.notes)}</p>`
                                                    : ""}
                                            </div>

                                            <div class="workout-exercise-stats">
                                                ${exercise.sets != null
                                                    ? `<span>${escapeHTML(String(exercise.sets))} sets</span>`
                                                    : ""}

                                                ${exercise.reps != null
                                                    ? `<span>${escapeHTML(String(exercise.reps))} reps</span>`
                                                    : ""}

                                                ${exercise.rest_seconds != null
                                                    ? `<span>${escapeHTML(String(exercise.rest_seconds))}s rest</span>`
                                                    : ""}

                                                ${exercise.load != null &&
                                                    exercise.load !== ""
                                                    ? `<span>${escapeHTML(String(exercise.load))}</span>`
                                                    : ""}
                                            </div>
                                        </div>
                                    `).join("")
                                    : `<p class="content-detail-value">
                                        No exercises added to this session.
                                    </p>`
                                }
                            </div>
                        </details>
                    `;
                }).join("")
                : `<p class="content-detail-value">
                    No workout sessions found for this plan.
                </p>`
            }
        </section>

        ${item.admin_feedback
            ? `
                <section class="admin-change-request">
                    <div class="admin-change-request-heading">
                        <span class="admin-change-request-label">
                            Your Change Request
                        </span>
                        <p>
                            Feedback you provided when requesting changes
                            to this plan.
                        </p>
                    </div>

                    <p class="admin-change-request-message">
                        ${escapeHTML(item.admin_feedback)}
                    </p>
                </section>
            `
            : ""
        }
    `;
}




function renderRecipeDetails(item, body) {
    const ingredients = Array.isArray(item.ingredients)
        ? item.ingredients
        : [];

    const steps = Array.isArray(item.steps)
        ? item.steps
        : [];

    const nutrition = item.nutrition ?? {};

    const summaryCards = [
        [
            "Meal Type",
            item.meal_type
                ? item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)
                : null
        ],
        ["Servings", item.servings],
        [
            "Preparation Time",
            item.preparation_minutes != null
                ? `${item.preparation_minutes} min`
                : null
        ],
        [
            "Calories per Serving",
            nutrition.calories_per_serving != null
                ? `${nutrition.calories_per_serving} kcal`
                : null
        ]
    ];

    body.innerHTML = `
        <!-- Recipe summary -->
        <div class="workout-plan-summary">
            ${summaryCards
                .filter(([, value]) =>
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                )
                .map(([label, value]) => `
                    <div class="workout-summary-card">
                        <span>${escapeHTML(label)}</span>
                        <strong>${escapeHTML(String(value))}</strong>
                    </div>
                `)
                .join("")}
        </div>

        <!-- Description -->
        ${item.description
            ? `
                <section class="recipe-description">
                    <span class="content-detail-label">
                        Description
                    </span>

                    <p class="recipe-description-content">
                        ${escapeHTML(item.description)}
                    </p>
                </section>
            `
            : ""
        }

        <!-- Ingredients -->
        <section class="workout-sessions-section">
            <div class="workout-sessions-heading">
                <h3>Ingredients</h3>
                <span class="workout-sessions-count">
                    ${ingredients.length}
                    ${ingredients.length === 1
                        ? "ingredient"
                        : "ingredients"}
                </span>
            </div>

            ${ingredients.length
                ? ingredients.map((ingredient, index) => `
                    <div class="workout-exercise">
                        <div class="workout-exercise-info">
                            <strong>
                                ${escapeHTML(
                                    ingredient.name || "Unknown Ingredient"
                                )}
                            </strong>
                        </div>

                        <div class="workout-exercise-stats">
                            ${ingredient.quantity
                                ? `<span>${escapeHTML(ingredient.quantity)}</span>`
                                : ""}
                        </div>
                    </div>
                `).join("")
                : `
                    <p class="content-detail-value">
                        No ingredients provided.
                    </p>
                `
            }
        </section>

        <!-- Instructions -->
        <section class="workout-sessions-section">
            <div class="workout-sessions-heading">
                <h3>Instructions</h3>
                <span class="workout-sessions-count">
                    ${steps.length}
                    ${steps.length === 1 ? "step" : "steps"}
                </span>
            </div>

            ${steps.length
                ? steps.map((step, index) => `
                    <details
                        class="workout-session"
                        ${index === 0 ? "open" : ""}
                    >
                        <summary>
                            <span class="workout-session-title">
                                <strong>Step ${index + 1}</strong>
                            </span>
                        </summary>

                        <div class="workout-session-exercises">
                            <p class="content-detail-value">
                                ${escapeHTML(String(step))}
                            </p>
                        </div>
                    </details>
                `).join("")
                : `
                    <p class="content-detail-value">
                        No instructions provided.
                    </p>
                `
            }
        </section>

        <!-- Coach notes -->
        ${item.coach_notes
            ? `
                <section class="meal-coach-notes">
                    <span class="content-detail-label">
                        Coach Notes
                    </span>

                    <p class="meal-coach-notes-content">
                        ${escapeHTML(item.coach_notes)}
                    </p>
                </section>
            `
            : ""
        }

        <!-- Admin feedback -->
        ${item.admin_feedback
            ? `
                <section class="admin-change-request">
                    <div class="admin-change-request-heading">
                        <span class="admin-change-request-label">
                            Your Change Request
                        </span>

                        <p>
                            Feedback you provided when requesting changes
                            to this recipe.
                        </p>
                    </div>

                    <p class="admin-change-request-message">
                        ${escapeHTML(item.admin_feedback)}
                    </p>
                </section>
            `
            : ""
        }
    `;
}


function closeContentDetailsModal() {
    const modal = document.getElementById("content-details-modal");

    if (modal) {
        modal.hidden = true;
    }
}

function setupContentDetailsModal() {
    document.getElementById("content-details-close")
        ?.addEventListener("click", closeContentDetailsModal);

    document.getElementById("content-details-cancel")
        ?.addEventListener("click", closeContentDetailsModal);

    document.getElementById("content-details-approve")
        ?.addEventListener("click", async () => {
            if (!selectedContent) return;

            const button =
                document.getElementById("content-details-approve");

            button.disabled = true;

            try {
                const viewData = await moderateCoachContent({
                    contentType: selectedContent.content_type,
                    contentId: selectedContent.id,
                    status: "approved",
                    adminId: await getCurrentAdminId()
                });

                closeContentDetailsModal();
                selectedContent = null;
                renderView(viewData);
            } catch (error) {
                console.error("Unable to approve content:", error);
            } finally {
                button.disabled = false;
            }
        });

    document.getElementById("content-details-reject")
        ?.addEventListener("click", () => {
            if (!selectedContent) return;

            const item = selectedContent;

            closeContentDetailsModal();
            openFeedbackModal(item);
        });
}

function setupFeedbackModal() {
    document.getElementById("content-feedback-close")
        ?.addEventListener("click", closeFeedbackModal);

    document.getElementById("content-feedback-cancel")
        ?.addEventListener("click", closeFeedbackModal);

    document.getElementById("content-feedback-confirm")
        ?.addEventListener("click", async () => {
            if (!selectedContent) return;

            const feedback =
                document.getElementById("content-admin-feedback");

            const message = feedback?.value.trim() ?? "";

            if (!message) {
                console.error("Admin feedback is required.");
                feedback?.focus();
                return;
            }

            const button =
                document.getElementById("content-feedback-confirm");

            if (button) button.disabled = true;

            try {
                const viewData = await moderateCoachContent({
                    contentType: selectedContent.content_type,
                    contentId: selectedContent.id,
                    status: "changes_requested",
                    adminFeedback: message,
                    adminId: await getCurrentAdminId()
                });

                closeFeedbackModal();
                renderView(viewData);
            } catch (error) {
                console.error("Unable to request changes:", error);
            } finally {
                if (button) button.disabled = false;
            }
        });
}

export async function loadContentPage() {
    setupTabs();
    setupSearch();
    setupTypeFilter();
    setupContentDetailsModal();
    setupFeedbackModal();

    const params = new URLSearchParams(window.location.search);
    const coachId = params.get("coach_id");

    if (coachId) {
        setContentCoachFilter(coachId);
    }

    document.getElementById("content-table-body")
        ?.addEventListener("click", handleContentAction);

    try {
        const viewData = await loadCoachContent();

        window.__coachContentItems = viewData.items;
        renderView(viewData);
    } catch (error) {
        console.error("Unable to load coach content:", error);
    }
}