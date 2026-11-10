import {
    loadLandingDraft,
    uploadLandingHeroImageFile,
    saveLandingHero,
    saveLandingFeatures,
    saveLandingHowItWorks,
    saveLandingFeaturedCoaches,
    loadLandingFeaturedCoaches,
    saveLandingPlans,
    publishLandingPage
} from "./landing-controller.js";


const MAX_FEATURES = 6;
let featureItems = [];

// Default features
const defaultFeatures = [
    {
        icon: "✦",
        title: "Personalised Recommendations",
        description:
            "Receive meal and nutrition recommendations based on your personal goals and preferences."
    },
    {
        icon: "✓",
        title: "Nutrition Tracking",
        description:
            "Keep track of your meals, calories and nutritional intake in one place."
    },
    {
        icon: "↗",
        title: "Progress Tracking",
        description:
            "Review your progress and understand how your nutrition habits change over time."
    }
];



const MAX_STEPS = 5;
let howItWorksItems = [];

// Default how it works steps
const defaultHowItWorksItems = [
    {
        title: "Create Your Profile",
        description: "Set up your profile and share your nutrition goals."
    },
    {
        title: "Track Your Meals",
        description: "Record your meals and keep track of your nutrition."
    },
    {
        title: "Review Your Progress",
        description: "View your progress and work towards your goals."
    }
];


const MAX_FEATURED_COACHES = 3;

let availableCoaches = [];
let selectedCoachIds = [];

let planItems = [];
const defaultPlans = [
    {
        name: "FREE",
        price: 0,
        button: "Get Started",
        period: "month",
        features: [
            "Nutrition tracking",
            "Meal logging",
            "Basic progress tracking",
            "Nutrition goals"
        ]
    },
    {
        name: "PREMIUM",
        badge: "MOST POPULAR",
        price: 9.99,
        button: "Get Premium",
        period: "month",
        features: [
            "Everything in Free",
            "Personalised meal recommendations",
            "Health coach support",
            "Advanced progress insights"
        ]
    }
];

// ==============================================
// DOM ELEMENTS
// ==============================================

// Save draft and publish buttons
const saveButton =
    document.getElementById("save-draft-button");

const publishButton =
    document.getElementById("publish-button");

// Status messages
const statusElement =
    document.getElementById("landing-status");

const messageElement =
    document.getElementById("landing-message");

// Hero editor fields
const heroTitle =
    document.getElementById("hero-title");

const heroDescription =
    document.getElementById("hero-description");

const heroImageUpload = 
    document.getElementById("hero-image-upload");

const heroImageGallery = document.getElementById("hero-image-gallery");


const defaultHeroImages = [
    "./images/fuhomepage.jpg",
    "./images/fufooddiarypage.jpg",
    "./images/fulogfoodpage.jpg",
    "./images/puhomepage.jpg"
];

let uploadedHeroImages = [...defaultHeroImages];


heroImageUpload?.addEventListener("change", async () => {
    const files = Array.from(heroImageUpload.files || []);

    if (!files.length) return;

    const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    for (const file of files) {
        if (!validTypes.includes(file.type)) {
            showNotification(
                "Please select only JPG, PNG, or WebP images."
            );
            heroImageUpload.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification(
                "Each image must be smaller than 5 MB."
            );
            heroImageUpload.value = "";
            return;
        }
    }

    heroImageUpload.disabled = true;

    try {
        for (const file of files) {

            const imageUrl = await uploadLandingHeroImageFile(file);
            uploadedHeroImages.push(imageUrl);

            renderHeroImageGallery();
        }

    } catch (error) {
        console.error("Hero image upload failed:", error);
        showNotification(
            "An image upload failed. Please try again."
        );
    } finally {
        heroImageUpload.disabled = false;
        heroImageUpload.value = "";
    }
});




const primaryButton =
    document.getElementById("hero-primary-button");

const secondaryButton =
    document.getElementById("hero-secondary-button");

// Features editor
const featuresEditor =
    document.getElementById("features-editor");

const addFeatureButton =
    document.getElementById("add-feature-button");

// How it works editor
const howItWorksEditor = 
    document.getElementById("steps-editor");

const addStepButton = 
    document.getElementById("add-step-button");

// Featured coaches editor
const coachesEditor =
    document.getElementById("coaches-editor");

// Subscription plans editor
const plansEditor = 
    document.getElementById("plans-editor");

const addPlanButton = 
    document.getElementById("add-plan-button");

// Publish confirmation modal
const publishModal =
    document.getElementById("publish-confirm-modal");

const closePublishButton =
    document.getElementById("publish-confirm-close");

const cancelPublishButton =
    document.getElementById("cancel-publish");

const confirmPublishButton =
    document.getElementById("confirm-publish");

// Refresh preview
const refreshPreviewButton =
    document.getElementById("refresh-preview-button");

const previewFrame =
    document.getElementById("landing-preview-frame");


// // Notification
// const notificationElement = document.getElementById("admin-notification");
// const notificationMessage = document.getElementById("admin-notification-message");
// const notificationCloseButton = document.getElementById("admin-notification-close");

// function showNotification(message) {
//     if (!notificationElement || !notificationMessage) return;

//     notificationMessage.textContent = message;
//     notificationElement.hidden = false;
// }

// if (notificationCloseButton) {
//     notificationCloseButton.addEventListener("click", () => {
//         notificationElement.hidden = true;
//     });
// }

// ==============================================
// FUNCTIONS
// ==============================================

// Load landing page content
async function loadLandingPage() {
    try {
        statusElement.textContent = "Loading...";

        const landing = await loadLandingDraft();
        const content = landing.content || {};
        const hero = content.hero || {};
        console.log("Saved hero data:", hero);
        console.log("Default hero images:", defaultHeroImages);
        loadFeaturesEditor(content);
        loadHowItWorksEditor(content);
        await loadCoachesEditor(content);
        loadPlansEditor(content);

        // Fill in Hero editor fields
        heroTitle.value = hero.title || "";
        heroDescription.value = hero.description || "";

        
        if (Array.isArray(hero.images)) {
            // Respect the saved gallery, including an intentionally empty one.
            uploadedHeroImages = [...hero.images];
        } else if (hero.image) {
            // Support older content with a single image.
            uploadedHeroImages = [hero.image];
        } else {
            // Initialize defaults only when no gallery has been configured.
            uploadedHeroImages = [...defaultHeroImages];
        }

        renderHeroImageGallery();

        primaryButton.value = hero.primaryButton || "";
        secondaryButton.value = hero.secondaryButton || "";

        if (landing.id) {
            statusElement.textContent = "Draft";
            messageElement.textContent =
                "Your saved draft has been loaded successfully.";
        } else if (Object.keys(content).length > 0) {
            statusElement.textContent = "Published";
            messageElement.textContent =
                "The published landing page content has been loaded.";
        } else {
            statusElement.textContent = "Not configured";
            messageElement.textContent =
                "No landing page content was found.";
        }
    } catch (error) {
        console.error("Failed to load landing page:", error);

        statusElement.textContent = "Error";
        messageElement.textContent =
            "Failed to load landing page content. Please refresh and try again.";
    }
}


// Save changes as a draft
async function handleSaveDraft() {
    const hero = {
        title: heroTitle.value.trim(),
        description: heroDescription.value.trim(),
        images: [...uploadedHeroImages],
        image: uploadedHeroImages[0] || "",
        primaryButton: primaryButton.value.trim(),
        secondaryButton: secondaryButton.value.trim()
    };

    try {
        saveButton.disabled = true;

        statusElement.textContent = "Saving...";
        messageElement.textContent = "Saving your draft...";

        await saveLandingHero(hero);

        featureItems = getFeatureItemsFromEditor();
        await saveLandingFeatures({
            items: featureItems
        });

        howItWorksItems = getHowItWorksItemsFromEditor();
        await saveLandingHowItWorks({
            items: howItWorksItems
        });

        await saveLandingFeaturedCoaches({
            coachIds: selectedCoachIds
        });

        planItems = getPlansFromEditor();
        await saveLandingPlans(planItems);

        statusElement.textContent = "Draft";
        messageElement.textContent =
            "Your changes have been saved as a draft.";
        
        refreshLandingPreview();
    } catch (error) {
        console.error("Failed to save landing page:", error);

        statusElement.textContent = "Error";
        messageElement.textContent =
            error.message ||
            "Failed to save your draft. Please try again.";
    } finally {
        saveButton.disabled = false;
    }
}


// Open publish confirmation modal
function openPublishConfirmation() {
    publishModal?.classList.add("show");
}

// Close publish confirmation modal
function closePublishConfirmation() {
    publishModal?.classList.remove("show");
}


// Publish landing page
async function handlePublishLandingPage() {
    try {
        confirmPublishButton.disabled = true;
        publishButton.disabled = true;

        statusElement.textContent = "Publishing...";
        messageElement.textContent = "Publishing your changes...";

        await publishLandingPage();

        statusElement.textContent = "Published";
        messageElement.textContent =
            "Your changes are now published.";

        closePublishConfirmation();

        // Refresh the preview
        refreshLandingPreview();

    } catch (error) {
        console.error("Failed to publish landing page:", error);

        statusElement.textContent = "Error";
        messageElement.textContent =
            error.message || "Failed to publish changes.";
    } finally {
        confirmPublishButton.disabled = false;
        publishButton.disabled = false;
    }
}

// Refresh landing page preview
function refreshLandingPreview() {
    if (previewFrame) {
        previewFrame.src = previewFrame.src;
    }
}


function renderHeroImageGallery() {
    if (!heroImageGallery) return;

    heroImageGallery.replaceChildren();

    uploadedHeroImages.forEach((imageUrl, index) => {
        const card = document.createElement("div");
        card.className = "hero-image-card";

        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = `Hero image ${index + 1}`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.className = "remove-hero-image-button";
        removeButton.setAttribute("data-remove-hero-image", "");

        removeButton.addEventListener("click", () => {
            uploadedHeroImages.splice(index, 1);
            renderHeroImageGallery();
        });

        card.append(image, removeButton);
        heroImageGallery.appendChild(card);
    });
}



// Read the current values from the editor
function getFeatureItemsFromEditor() {
    if (!featuresEditor) return [];

    return Array.from(
        featuresEditor.querySelectorAll(".feature-editor-card")
    ).map(card => ({
        icon: card.querySelector(".feature-icon-input").value.trim(),
        title: card.querySelector(".feature-title-input").value.trim(),
        description:
            card.querySelector(".feature-description-input").value.trim()
    }));
}

// Create a labelled input
function createFeatureField(labelText, className, value, multiline = false) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");

    label.textContent = labelText;

    const field = document.createElement(
        multiline ? "textarea" : "input"
    );

    if (!multiline) {
        field.type = "text";
    } else {
        field.rows = 3;
    }

    field.className = className;
    field.value = value || "";

    wrapper.append(label, field);

    return wrapper;
}

// Display the feature cards in the editor
function renderFeaturesEditor(items) {
    if (!featuresEditor) return;

    featuresEditor.replaceChildren();

    items.forEach((feature, index) => {
        const card = document.createElement("div");
        card.className = "feature-editor-card";

        // Feature heading
        const cardHeader = document.createElement("div");
        cardHeader.className = "feature-editor-header";

        const heading = document.createElement("h3");
        heading.textContent = `Feature ${index + 1}`;

        // Edit button
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "button button-secondary";
        editButton.textContent = "Edit";
        editButton.dataset.editFeature = String(index);

        // Save button
        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "button button-primary";
        saveButton.textContent = "Save";
        saveButton.dataset.saveFeature = String(index);
        saveButton.hidden = true;

        // Cancel button
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "button button-secondary";
        cancelButton.textContent = "Cancel";
        cancelButton.dataset.cancelFeature = String(index);
        cancelButton.hidden = true;

        // Remove button
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "button button-secondary";
        removeButton.textContent = "Remove";
        removeButton.dataset.removeFeature = String(index);

        const editActions = document.createElement("div");
        editActions.className = "feature-edit-actions";

        const editModeActions = document.createElement("div");
        editModeActions.className = "feature-edit-mode-actions";

        editActions.append(editButton, saveButton, cancelButton);
        editModeActions.append(removeButton);

        cardHeader.append(
            heading,
            editActions,
            editModeActions
        );

        // Feature fields
        card.append(
            cardHeader,
            createFeatureField(
                "Icon or symbol",
                "feature-icon-input",
                feature.icon
            ),
            createFeatureField(
                "Title",
                "feature-title-input",
                feature.title
            ),
            createFeatureField(
                "Description",
                "feature-description-input",
                feature.description,
                true
            )
        );

        // Lock fields by default
        card.querySelectorAll("input, textarea, select").forEach(field => {
            field.disabled = true;
        });

        featuresEditor.appendChild(card);
    });

    if (addFeatureButton) {
        const limitReached = items.length >= MAX_FEATURES;

        addFeatureButton.disabled = limitReached;

        const limitMessage =
            document.getElementById("feature-limit-message");

        if (limitMessage) {
            limitMessage.hidden = !limitReached;
        }
    }
}

// Load saved features, or use the existing website defaults
function loadFeaturesEditor(content) {
    const savedItems = content.features?.items;

    featureItems = Array.isArray(savedItems)
        ? savedItems
        : defaultFeatures.map(feature => ({ ...feature }));

    renderFeaturesEditor(featureItems);
}


function getHowItWorksItemsFromEditor() {
    if (!howItWorksEditor) return [];

    return Array.from(
        howItWorksEditor.querySelectorAll(".step-editor-card")
    ).map(card => ({
        title: card.querySelector(".step-title-input").value.trim(),
        description: card.querySelector(".step-description-input").value.trim()
    }));
}

function loadHowItWorksEditor(content) {
    const items = content.howItWorks?.items;

    howItWorksItems = Array.isArray(items)
        ? items.map(item => ({ ...item }))
        : defaultHowItWorksItems.map(item => ({ ...item }));

    renderHowItWorksEditor(howItWorksItems);
}

function renderHowItWorksEditor(items) {
    if (!howItWorksEditor) return;

    howItWorksEditor.replaceChildren();

    items.forEach((step, index) => {
        const card = document.createElement("div");
        card.className = "step-editor-card";

        const header = document.createElement("div");
        header.className = "feature-editor-header";

        const heading = document.createElement("h3");
        heading.textContent = `Step ${index + 1}`;

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "button button-secondary";
        editButton.textContent = "Edit";
        editButton.dataset.editStep = String(index);

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "button button-primary";
        saveButton.textContent = "Save";
        saveButton.dataset.saveStep = String(index);
        saveButton.hidden = true;

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "button button-secondary";
        cancelButton.textContent = "Cancel";
        cancelButton.dataset.cancelStep = String(index);
        cancelButton.hidden = true;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "button button-secondary";
        removeButton.textContent = "Remove";
        removeButton.dataset.removeStep = String(index);

        const editActions = document.createElement("div");
        editActions.className = "feature-edit-actions";
        editActions.append(editButton, saveButton, cancelButton);

        const removeActions = document.createElement("div");
        removeActions.className = "feature-edit-mode-actions";
        removeActions.append(removeButton);

        header.append(heading, editActions, removeActions);

        card.append(
            header,
            createFeatureField(
                "Step title",
                "step-title-input",
                step.title
            ),
            createFeatureField(
                "Step description",
                "step-description-input",
                step.description,
                true
            )
        );

        card.querySelectorAll("input, textarea, select").forEach(field => {
            field.disabled = true;
        });

        howItWorksEditor.appendChild(card);
    });

    if (addStepButton) {
        const limitReached = items.length >= MAX_STEPS;

        addStepButton.disabled = limitReached;

        const limitMessage =
            document.getElementById("step-limit-message");

        if (limitMessage) {
            limitMessage.hidden = !limitReached;
        }
    }
}

async function loadCoachesEditor(content) {
    if (!coachesEditor) return;

    coachesEditor.textContent = "Loading approved coaches...";

    try {
        availableCoaches = await loadLandingFeaturedCoaches();

        const savedIds = content.featuredCoaches?.coachIds;

        selectedCoachIds = Array.isArray(savedIds)
            ? savedIds.filter(id =>
                availableCoaches.some(coach => coach.id === id)
            )
            : [];

        renderCoachesEditor();
    } catch (error) {
        console.error("Failed to load approved coaches:", error);
        coachesEditor.textContent =
            "Failed to load approved coaches. Please refresh and try again.";
    }
}

function renderCoachesEditor() {
    if (!coachesEditor) return;

    coachesEditor.replaceChildren();

    const selectionHeader = document.createElement("div");
    selectionHeader.className = "coach-selection-header";

    const selectionTitle = document.createElement("h3");
    selectionTitle.textContent = "Available coaches";

    const selectionCount = document.createElement("span");
    selectionCount.className = "coach-selection-count";
    selectionCount.textContent =
        `${selectedCoachIds.length} of ${MAX_FEATURED_COACHES} selected`;

    selectionHeader.append(selectionTitle, selectionCount);
    coachesEditor.appendChild(selectionHeader);

    if (availableCoaches.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "coach-empty-message";
        emptyMessage.textContent = "No approved coaches found.";
        coachesEditor.appendChild(emptyMessage);
        return;
    }

    const coachList = document.createElement("div");
    coachList.className = "coach-card-list";

    availableCoaches.forEach((coach, index) => {
        const isSelected = selectedCoachIds.includes(coach.id);
        const limitReached =
            selectedCoachIds.length >= MAX_FEATURED_COACHES;

        const card = document.createElement("label");
        card.className = "coach-editor-card";

        if (isSelected) {
            card.classList.add("selected");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = coach.id;
        checkbox.checked = isSelected;
        checkbox.disabled = !isSelected && limitReached;

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                if (
                    selectedCoachIds.length >= MAX_FEATURED_COACHES
                ) {
                    return;
                }

                selectedCoachIds.push(coach.id);
            } else {
                selectedCoachIds = selectedCoachIds.filter(
                    id => id !== coach.id
                );
            }

            renderCoachesEditor();
        });

        const initials = document.createElement("div");
        initials.className = "coach-avatar";
        initials.textContent = (coach.full_name || "Coach")
            .trim()
            .split(/\s+/)
            .map(part => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        const details = document.createElement("div");
        details.className = "coach-card-details";

        const name = document.createElement("h4");
        name.textContent = coach.full_name || "Unnamed coach";

        const specialty = document.createElement("p");
        specialty.className = "coach-card-specialty";
        specialty.textContent =
            coach.coaching_specialty || "Health Coach";

        const rating = document.createElement("p");
        rating.className = "coach-card-rating";

        rating.textContent = coach.averageRating !== null
            ? `★ ${coach.averageRating.toFixed(1)} · ${coach.reviewCount} ${
                coach.reviewCount === 1 ? "review" : "reviews"
              }`
            : "☆ No ratings yet";

        details.append(name, specialty, rating);

        const rank = document.createElement("span");
        rank.className = "coach-rank";
        rank.textContent = `#${index + 1}`;

        const cardMain = document.createElement("div");
        cardMain.className = "coach-card-main";
        cardMain.append(initials, details);

        card.append(checkbox, cardMain, rank);
        coachList.appendChild(card);
    });

    coachesEditor.appendChild(coachList);

    const selectionNote = document.createElement("p");
    selectionNote.className = "coach-selection-note";

    selectionNote.textContent =
        selectedCoachIds.length >= MAX_FEATURED_COACHES
            ? "Selection limit reached. Unselect a coach to choose another."
            : "Choose up to 3 coaches to display on your landing page.";

    coachesEditor.appendChild(selectionNote);
}

function loadPlansEditor(content) {
    const savedPlans = content.plans;

    planItems = Array.isArray(savedPlans)
        ? savedPlans.map(plan => ({
            ...plan,
            features: Array.isArray(plan.features)
                ? [...plan.features]
                : []
        }))
        : defaultPlans.map(plan => ({
            ...plan,
            features: [...plan.features]
        }));

    renderPlansEditor(planItems);
}


function getPlansFromEditor() {
    if (!plansEditor) return [];

    return Array.from(
        plansEditor.querySelectorAll(".plan-editor-card")
    ).map(card => {
        const plan = {
            name: card.querySelector(".plan-name-input").value.trim(),
            price: Number(card.querySelector(".plan-price-input").value),
            button: card.querySelector(".plan-button-input").value.trim(),
            period: card.querySelector(".plan-period-input").value,
            features: Array.from(
                card.querySelectorAll(".plan-feature-input")
            ).map(input => input.value.trim())
        };

        const badgeInput = card.querySelector(".plan-badge-input");

        if (badgeInput && badgeInput.value.trim()) {
            plan.badge = badgeInput.value.trim();
        }

        return plan;
    });
}



function renderPlansEditor(items) {
    if (!plansEditor) return;

    plansEditor.replaceChildren();

    items.forEach((plan, index) => {
        const card = document.createElement("div");
        card.className = "plan-editor-card";

        const header = document.createElement("div");
        header.className = "plan-editor-header";

        const heading = document.createElement("h3");
        heading.textContent = `Plan ${index + 1}`;

        const actions = document.createElement("div");
        actions.className = "feature-edit-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "button button-secondary";
        editButton.textContent = "Edit";
        editButton.dataset.editPlan = String(index);

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "button button-primary";
        saveButton.textContent = "Save";
        saveButton.dataset.savePlan = String(index);
        saveButton.hidden = true;

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "button button-secondary";
        cancelButton.textContent = "Cancel";
        cancelButton.dataset.cancelPlan = String(index);
        cancelButton.hidden = true;

        actions.append(editButton, saveButton, cancelButton);
        header.append(heading, actions);
        card.appendChild(header);

        const fieldsContainer = document.createElement("div");
        fieldsContainer.className = "plan-editor-fields";

        fieldsContainer.append(
            createFeatureField(
                "Plan name",
                "plan-name-input",
                plan.name
            ),
            createFeatureField(
                "Price",
                "plan-price-input",
                String(plan.price ?? 0)
            ),
            createFeatureField(
                "Button text",
                "plan-button-input",
                plan.button
            )
        );

        card.appendChild(fieldsContainer);

        // Use a dropdown for the billing period.
        const periodWrapper = document.createElement("div");
        const periodLabel = document.createElement("label");
        periodLabel.textContent = "Billing period";

        const periodSelect = document.createElement("select");
        periodSelect.className = "plan-period-input";

        ["month", "year"].forEach(period => {
            const option = document.createElement("option");
            option.value = period;
            option.textContent =
                period.charAt(0).toUpperCase() + period.slice(1);

            periodSelect.appendChild(option);
        });

        periodSelect.value = plan.period || "month";
        periodWrapper.append(periodLabel, periodSelect);
        card.appendChild(periodWrapper);

        periodWrapper.className = "plan-period-field";
        fieldsContainer.appendChild(periodWrapper);

        // Premium badge 
        fieldsContainer.appendChild(
            createFeatureField(
                "Badge (optional)",
                "plan-badge-input",
                plan.badge || ""
            )
        );

        const featuresHeading = document.createElement("h4");
        featuresHeading.textContent = "Plan features";
        card.appendChild(featuresHeading);

        const featureList = document.createElement("div");
        featureList.className = "plan-feature-list";

        (plan.features || []).forEach(feature => {
            const featureRow = document.createElement("div");
            featureRow.className = "plan-feature-row";

            const input = document.createElement("input");
            input.type = "text";
            input.className = "plan-feature-input";
            input.value = feature;

            const removeFeatureButton = document.createElement("button");
            removeFeatureButton.type = "button";
            removeFeatureButton.className = "button button-secondary";
            removeFeatureButton.textContent = "Remove feature";
            removeFeatureButton.dataset.removePlanFeature = "";

            featureRow.append(input, removeFeatureButton);
            featureList.appendChild(featureRow);
        });

        const addFeatureButton = document.createElement("button");
        addFeatureButton.type = "button";
        addFeatureButton.className = "button button-secondary";
        addFeatureButton.textContent = "+ Add feature";
        addFeatureButton.dataset.addPlanFeature = "";

        card.append(featureList, addFeatureButton);

        // Initially lock the fields.
        card.querySelectorAll("input, select").forEach(field => {
            field.disabled = true;
        });

        plansEditor.appendChild(card);
    });
}



// ==============================================
// EVENT LISTENERS
// ==============================================

// Save draft
saveButton?.addEventListener(
    "click",
    handleSaveDraft
);

// Open publish confirmation
publishButton?.addEventListener(
    "click",
    openPublishConfirmation
);

// Close publish confirmation
closePublishButton?.addEventListener(
    "click",
    closePublishConfirmation
);

cancelPublishButton?.addEventListener(
    "click",
    closePublishConfirmation
);

// Close when clicking outside the modal
publishModal?.addEventListener(
    "click",
    function(event) {
        if (event.target === publishModal) {
            closePublishConfirmation();
        }
    }
);

// Close when Esc is pressed
document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        publishModal?.classList.contains("show")
    ) {
        closePublishConfirmation();
    }
});

// Confirm publication
confirmPublishButton?.addEventListener(
    "click",
    handlePublishLandingPage
);

// Refresh preview
refreshPreviewButton?.addEventListener(
    "click",
    refreshLandingPreview
);

// Add feature
addFeatureButton?.addEventListener("click", () => {
    featureItems = getFeatureItemsFromEditor();

    if (featureItems.length >= MAX_FEATURES) {
        return;
    }

    featureItems.push({
        icon: "✦",
        title: "",
        description: ""
    });

    renderFeaturesEditor(featureItems);

    // Automatically open the new feature for editing
    const newCard = featuresEditor.lastElementChild;

    if (newCard) {
        newCard.querySelector("[data-edit-feature]")?.click();
    }
});

// Remove feature
featuresEditor?.addEventListener("click", event => {
    const removeButton = event.target.closest(
        "[data-remove-feature]"
    );

    if (!removeButton) return;

    featureItems = getFeatureItemsFromEditor();

    const index = Number(removeButton.dataset.removeFeature);

    featureItems.splice(index, 1);

    renderFeaturesEditor(featureItems);
});


featuresEditor?.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const card = button.closest(".feature-editor-card");
    if (!card) return;

    const fields = card.querySelectorAll(
        ".feature-icon-input, .feature-title-input, .feature-description-input"
    );

    // Edit: remember the current values and unlock the fields
    if (button.matches("[data-edit-feature]")) {
        card.dataset.originalValues = JSON.stringify(
            Array.from(fields, field => field.value)
        );

        fields.forEach(field => {
            field.disabled = false;
        });

        card.querySelector("[data-edit-feature]").hidden = true;
        card.querySelector("[data-save-feature]").hidden = false;
        card.querySelector("[data-cancel-feature]").hidden = false;
        return;
    }

    // Save: keep the edited values in the editor
    if (button.matches("[data-save-feature]")) {
        fields.forEach(field => {
            field.disabled = true;
        });

        card.querySelector("[data-edit-feature]").hidden = false;
        card.querySelector("[data-save-feature]").hidden = true;
        card.querySelector("[data-cancel-feature]").hidden = true;
        return;
    }

    // Cancel: restore the original values
    if (button.matches("[data-cancel-feature]")) {
        const originalValues = JSON.parse(
            card.dataset.originalValues || "[]"
        );

        fields.forEach((field, index) => {
            if (originalValues[index] !== undefined) {
                field.value = originalValues[index];
            }

            field.disabled = true;
        });

        card.querySelector("[data-edit-feature]").hidden = false;
        card.querySelector("[data-save-feature]").hidden = true;
        card.querySelector("[data-cancel-feature]").hidden = true;
    }
});


howItWorksEditor?.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const card = button.closest(".step-editor-card");
    if (!card) return;

    const fields = card.querySelectorAll(
        ".step-title-input, .step-description-input"
    );

    // Edit step
    if (button.matches("[data-edit-step]")) {
        card.dataset.originalValues = JSON.stringify(
            Array.from(fields, field => field.value)
        );

        fields.forEach(field => {
            field.disabled = false;
        });

        card.querySelector("[data-edit-step]").hidden = true;
        card.querySelector("[data-save-step]").hidden = false;
        card.querySelector("[data-cancel-step]").hidden = false;

        return;
    }

    // Save step in the editor
    if (button.matches("[data-save-step]")) {
        fields.forEach(field => {
            field.disabled = true;
        });

        card.querySelector("[data-edit-step]").hidden = false;
        card.querySelector("[data-save-step]").hidden = true;
        card.querySelector("[data-cancel-step]").hidden = true;

        return;
    }

    // Cancel editing and restore original values
    if (button.matches("[data-cancel-step]")) {
        const originalValues = JSON.parse(
            card.dataset.originalValues || "[]"
        );

        fields.forEach((field, index) => {
            if (originalValues[index] !== undefined) {
                field.value = originalValues[index];
            }

            field.disabled = true;
        });

        card.querySelector("[data-edit-step]").hidden = false;
        card.querySelector("[data-save-step]").hidden = true;
        card.querySelector("[data-cancel-step]").hidden = true;

        return;
    }

    // Remove step immediately
    if (button.matches("[data-remove-step]")) {
        howItWorksItems = getHowItWorksItemsFromEditor();

        const index = Number(button.dataset.removeStep);
        howItWorksItems.splice(index, 1);

        renderHowItWorksEditor(howItWorksItems);
    }
});


addStepButton?.addEventListener("click", () => {
    howItWorksItems = getHowItWorksItemsFromEditor();

    if (howItWorksItems.length >= MAX_STEPS) {
        return;
    }

    howItWorksItems.push({
        title: "",
        description: ""
    });

    renderHowItWorksEditor(howItWorksItems);

    // Automatically open the new step for editing
    const newCard = howItWorksEditor.lastElementChild;

    newCard?.querySelector("[data-edit-step]")?.click();
});



plansEditor?.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const card = button.closest(".plan-editor-card");
    if (!card) return;

    // Add a feature row
    if (button.matches("[data-add-plan-feature]")) {
        const row = document.createElement("div");
        row.className = "plan-feature-row";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "plan-feature-input";
        input.placeholder = "Enter a plan feature";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "button button-secondary";
        removeButton.textContent = "Remove feature";
        removeButton.dataset.removePlanFeature = "";

        row.append(input, removeButton);
        card.querySelector(".plan-feature-list").appendChild(row);
        input.disabled = false;
        input.focus();
        return;
    }

    // Remove a feature row
    if (button.matches("[data-remove-plan-feature]")) {
        button.closest(".plan-feature-row")?.remove();
        return;
    }

    const fields = card.querySelectorAll("input, select");

    // Edit
    if (button.matches("[data-edit-plan]")) {
        const planIndex = Array.from(
            plansEditor.querySelectorAll(".plan-editor-card")
        ).indexOf(card);

        card.dataset.originalPlan = JSON.stringify(planItems[planIndex]);

        fields.forEach(field => {
            field.disabled = false;
        });

        button.hidden = true;
        card.querySelector("[data-save-plan]").hidden = false;
        card.querySelector("[data-cancel-plan]").hidden = false;

        return;
    }

    // Save the edits in the editor
    if (button.matches("[data-save-plan]")) {
        fields.forEach(field => {
            field.disabled = true;
        });

        card.querySelector("[data-edit-plan]").hidden = false;
        card.querySelector("[data-save-plan]").hidden = true;
        card.querySelector("[data-cancel-plan]").hidden = true;

        planItems = getPlansFromEditor();
        renderPlansEditor(planItems);
        return;
    }

    // Cancel and restore the original values.
    if (button.matches("[data-cancel-plan]")) {
        const originalPlan = JSON.parse(
            card.dataset.originalPlan || "{}"
        );

        const planIndex = Array.from(
            plansEditor.querySelectorAll(".plan-editor-card")
        ).indexOf(card);

        if (planIndex !== -1 && originalPlan.name) {
            planItems[planIndex] = originalPlan;
        }

        renderPlansEditor(planItems);
        return;
    }
});

// Initialise page
loadLandingPage();

export {
    loadLandingPage
};
