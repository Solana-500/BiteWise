// ==============================================
// SUPABASE CONNECTION
// ==============================================

const SUPABASE_URL = "https://xxazvbjvwuvklroialwe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-mB23YADvK8aLerxzfYjyQ_OldSllfi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* ==============================================
   LANDING PAGE CONTENT
============================================== */

async function loadLandingPageContent() {
    const params = new URLSearchParams(
        window.location.search
    );

    const previewMode = params.get("preview") === "draft";

    let statusToLoad = "published";

    // Only allow an authenticated admin to request a draft
    if (previewMode) {
        try {
            const { data: userData, error: userError } =
                await supabaseClient.auth.getUser();

            if (!userError && userData.user) {
                const { data: profile, error: profileError } =
                    await supabaseClient
                        .from("profiles")
                        .select("app_role")
                        .eq("id", userData.user.id)
                        .maybeSingle();

                if (!profileError && profile?.app_role === "admin") {
                    statusToLoad = "draft";
                }
            }
        } catch (error) {
            console.error("Unable to verify preview access:", error);
        }
    }

    // Request the selected version
    let { data: landing, error } = await supabaseClient
        .from("landing_page_content")
        .select("id, status, content")
        .eq("status", statusToLoad)
        .maybeSingle();

    if (error) {
        console.error("Failed to load landing page content:", error);
        return;
    }

    // If an admin has no draft yet, preview the published version
    if (!landing && statusToLoad === "draft") {
        const result = await supabaseClient
            .from("landing_page_content")
            .select("id, status, content")
            .eq("status", "published")
            .maybeSingle();

        if (result.error) {
            console.error(
                "Failed to load published landing page:",
                result.error
            );
            return;
        }

        landing = result.data;
    }

    if (!landing?.content) {
        return;
    }

    const hero = landing.content.hero || {};

    const title = document.getElementById("landing-hero-title");
    const description = document.getElementById(
        "landing-hero-description"
    );
    const image = document.getElementById("app-preview-image");
    const primaryButton = document.getElementById(
        "landing-hero-primary-button"
    );
    const secondaryButton = document.getElementById(
        "landing-hero-secondary-button"
    );

    if (title) {
        title.textContent = hero.title || "";
    }

    if (description) {
        description.textContent = hero.description || "";
    }

    
    if (image) {
        const savedImages = Array.isArray(hero.images)
            ? hero.images.filter(Boolean)
            : hero.image
                ? [hero.image]
                : [];

        if (savedImages.length) {
            startAppPreview("app-preview-image", savedImages);
        }
    }


    if (primaryButton) {
        primaryButton.textContent = hero.primaryButton || "";
    }

    if (secondaryButton) {
        secondaryButton.textContent = hero.secondaryButton || "";
    }

    renderLandingFeatures(landing.content.features);
    renderLandingHowItWorks(landing.content.howItWorks);
    renderLandingFeaturedCoaches(
        landing.content.featuredCoaches?.coachIds || []
    );
    renderLandingFeaturedReviews(
        landing.content.featuredReviews?.reviewIds || []
    );
    renderLandingPlans(landing.content.plans);
}

// Build a feature card when the page has no card to copy
function createFeatureCard() {
    const card = document.createElement("div");
    card.className = "feature-card";

    const icon = document.createElement("div");
    icon.className = "feature-icon";

    card.append(
        icon,
        document.createElement("h3"),
        document.createElement("p")
    );

    return card;
}

// Put one saved feature (icon, title, description) into a card
function fillFeatureCard(card, feature) {
    const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
    const description = card.querySelector("p");

    const icon =
        card.querySelector("[class*='icon']") ||
        Array.from(card.children).find(
            (child) => child !== heading && child !== description
        );

    if (icon) {
        icon.textContent = feature.icon || "";
    }

    if (heading) {
        heading.textContent = feature.title || "";
    }

    if (description) {
        description.textContent = feature.description || "";
    }
}


function renderLandingFeatures(features) {
    const container = document.getElementById("landing-features");

    if (!container) return;

    container.replaceChildren();

    const items = features?.items;

    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    items.forEach((feature) => {
        const card = createFeatureCard();
        fillFeatureCard(card, feature);
        container.appendChild(card);
    });
}


function renderLandingHowItWorks(howItWorks) {
    const container = document.getElementById("landing-how-it-works");

    if (!container) return;

    container.replaceChildren();

    const items = howItWorks?.items;

    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    items.forEach((step, index) => {
        const card = document.createElement("div");
        card.className = "step-card";

        const stepNumber = document.createElement("div");
        stepNumber.className = "step-number";
        stepNumber.textContent = index + 1;

        const heading = document.createElement("h3");
        heading.textContent = step.title || "";

        const description = document.createElement("p");
        description.textContent = step.description || "";

        card.append(stepNumber, heading, description);
        container.appendChild(card);
    });
}



async function renderLandingFeaturedCoaches(selectedCoachIds = []) {
    const container = document.getElementById(
        "landing-featured-coaches"
    );

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(selectedCoachIds) || selectedCoachIds.length === 0) {
        return;
    }

    const { data: coaches, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, coaching_specialty")
        .eq("app_role", "coach")
        .eq("approval_status", "approved")
        .eq("is_suspended", false);

    if (error) {
        console.error("Failed to load featured coaches:", error);
        return;
    }

    const { data: reviews, error: reviewError } = await supabaseClient
        .from("coach_reviews")
        .select("coach_id, rating");

    if (reviewError) {
        console.error("Failed to load coach ratings:", reviewError);
        return;
    }

    const coachesWithRatings = (coaches || []).map((coach) => {
        const coachReviews = (reviews || []).filter(
            (review) => review.coach_id === coach.id
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

    const featuredCoaches = selectedCoachIds
        .map((id) =>
            coachesWithRatings.find((coach) => coach.id === id)
        )
        .filter(Boolean)
        .slice(0, 3);

    if (featuredCoaches.length === 0) {
        return;
    }

    featuredCoaches.forEach((coach) => {
        const card = document.createElement("div");
        card.className = "coach-card";

        const avatar = document.createElement("div");
        avatar.className = "coach-avatar";
        avatar.textContent = (coach.full_name || "HC")
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        const name = document.createElement("h3");
        name.textContent = coach.full_name || "Health Coach";

        const specialty = document.createElement("p");
        specialty.className = "coach-specialty";
        specialty.textContent =
            coach.coaching_specialty || "Health Coach";

        const ratingContainer = document.createElement("div");
        ratingContainer.className = "coach-rating";

        const stars = document.createElement("span");
        stars.className = "coach-stars";

        const ratingValue = document.createElement("span");

        if (coach.averageRating !== null) {
            stars.textContent = "★★★★★";
            ratingValue.textContent =
                `${coach.averageRating.toFixed(1)} (${coach.reviewCount})`;
        } else {
            stars.textContent = "No ratings";
            ratingValue.textContent = "";
        }

        ratingContainer.append(stars, ratingValue);
        card.append(avatar, name, specialty, ratingContainer);
        container.appendChild(card);
    });
}



async function renderLandingFeaturedReviews(selectedReviewIds = []) {
    const container = document.getElementById(
        "landing-reviews"
    );

    if (!container) return;

    container.replaceChildren();

    if (
        !Array.isArray(selectedReviewIds) ||
        selectedReviewIds.length === 0
    ) {
        return;
    }

    const { data: reviews, error } = await supabaseClient
        .from("app_feedback")
        .select(`
            id,
            user_id,
            rating,
            feedback_text,
            created_at
        `)
        .in("id", selectedReviewIds)
        .eq("moderation_status", "published")
        .not("feedback_text", "is", null)
        .neq("feedback_text", "");

    if (error) {
        console.error("Failed to load featured reviews:", error);
        return;
    }

    // Preserve the order selected by the admin
    const featuredReviews = selectedReviewIds
        .map((id) =>
            (reviews || []).find((review) => review.id === id)
        )
        .filter(Boolean);

    if (featuredReviews.length === 0) {
        return;
    }

    // Retrieve reviewer names
    const profileIds = [
        ...new Set(featuredReviews.map((review) => review.user_id))
    ];

    const { data: profiles, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds);

    if (profileError) {
        console.error("Failed to load review authors:", profileError);
        return;
    }

    const profileNames = Object.fromEntries(
        (profiles || []).map((profile) => [
            profile.id,
            profile.full_name
        ])
    );

    featuredReviews.forEach((review) => {
        const card = document.createElement("div");
        card.className = "review-card";

        // Rating stars
        const rating = document.createElement("div");
        rating.className = "stars";

        const ratingValue = Math.max(
            0,
            Math.min(5, Number(review.rating) || 0)
        );

        rating.textContent = "★".repeat(ratingValue);

        // Review text
        const reviewText = document.createElement("p");
        reviewText.className = "review-text";
        reviewText.textContent = review.feedback_text || "";

        // Reviewer information
        const reviewerContainer = document.createElement("div");
        reviewerContainer.className = "review-user";

        const reviewerName =
            profileNames[review.user_id] || "Unknown User";

        // Reviewer avatar
        const avatar = document.createElement("div");
        avatar.className = "review-avatar";

        avatar.textContent = reviewerName
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        // Reviewer name
        const reviewerDetails = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = reviewerName;

        // Review date
        const date = document.createElement("p");
        date.textContent = review.created_at
            ? new Date(review.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric"
            })
            : "";

        reviewerDetails.append(name, date);

        reviewerContainer.append(avatar, reviewerDetails);

        // Add elements to card
        card.append(
            rating,
            reviewText,
            reviewerContainer
        );

        container.appendChild(card);
    });
}




function renderLandingPlans(plans) {
    const pricingGrid = document.querySelector(".pricing-grid");

    if (!pricingGrid) return;

    pricingGrid.replaceChildren();

    if (!Array.isArray(plans) || plans.length === 0) {
        return;
    }

    plans.forEach((plan, index) => {
        const isPremium =
            plan.name?.toLowerCase().includes("premium") ||
            index > 0;

        const card = document.createElement("div");
        card.className = isPremium
            ? "pricing-card premium-card"
            : "pricing-card";

        if (plan.badge) {
            const badge = document.createElement("span");
            badge.className = "popular-badge";
            badge.textContent = plan.badge;
            card.appendChild(badge);
        }

        const name = document.createElement("p");
        name.className = "plan-name";
        name.textContent = plan.name || "Plan";

        const priceContainer = document.createElement("div");
        priceContainer.className = "price";

        const amount = document.createElement("span");
        amount.className = "price-amount";

        const price = Number(plan.price);
        amount.textContent = Number.isFinite(price)
            ? `$${price}`
            : "$0";

        const period = document.createElement("span");
        period.className = "price-period";
        period.textContent = `/ ${plan.period || "month"}`;

        priceContainer.append(amount, period);

        const featureList = document.createElement("ul");
        featureList.className = "plan-features";

        (Array.isArray(plan.features) ? plan.features : [])
            .forEach((feature) => {
                const item = document.createElement("li");
                item.textContent = feature;
                featureList.appendChild(item);
            });

        const button = document.createElement("a");
        button.href = "#";
        button.className = isPremium
            ? "plan-button premium-button open-register"
            : "plan-button free-button open-register";
        button.textContent = plan.button || "Get Started";

        card.append(
            name,
            priceContainer,
            featureList,
            button
        );

        pricingGrid.appendChild(card);
    });
}


// ==============================================
// USER REGISTRATION (2 parts: create account, then profile setup)
// ==============================================

async function registerUser() {

    // ==========================================
    // PART 1 OF 2: CREATE THE AUTH ACCOUNT
    // (email + password only, like the mobile app)
    // The profile is created in part 2 (saveUserProfile)
    // ==========================================

    const email =
        document.getElementById(
            "register-email"
        )?.value.trim();

    const password =
        document.getElementById(
            "register-password"
        )?.value;

    const confirmPassword =
        document.getElementById(
            "register-confirm-password"
        )?.value;


    function showError(message) {

        if (registerMessage) {

            registerMessage.textContent = message;

        }

    }

    showError("");


    // ==========================================
    // VALIDATION
    // ==========================================

    if (!email || !password || !confirmPassword) {

        showError(
            "Please enter your email and password."
        );

        return;

    }

    if (password !== confirmPassword) {

        showError("Passwords do not match.");

        return;

    }

    if (password.length < 6) {

        showError(
            "Password must contain at least 6 characters."
        );

        return;

    }


    if (registerMainButton) {

        registerMainButton.disabled = true;

        registerMainButton.textContent =
            "Creating account...";

    }


    try {

        // ======================================
        // CREATE AUTH USER
        // ======================================

        const {
            data: authData,
            error: authError
        } =
            await supabaseClient.auth.signUp({
                email: email,
                password: password
            });


        if (authError) {

            console.error(
                "Auth registration error:",
                authError
            );

            showError(authError.message);

            return;

        }


        if (!authData.user) {

            console.error(
                "No user was returned after signup."
            );

            showError(
                "Account could not be created."
            );

            return;

        }


        // ======================================
        // CHECK SESSION
        // (needed to create the profile in part 2)
        // ======================================

        if (!authData.session) {

            console.error(
                "No authenticated session was returned."
            );

            showError(
                "Your account was created, but your email " +
                "must be verified before you can set up your profile."
            );

            return;

        }


        console.log(
            "Auth user created successfully."
        );


        // ======================================
        // GO TO PART 2: PROFILE SETUP
        // ======================================

        showRegisterStep(onboardingStep);

    } catch (error) {

        console.error(
            "Unexpected registration error:",
            error
        );

        showError(
            "Something went wrong while creating your account."
        );

    } finally {

        if (registerMainButton) {

            registerMainButton.disabled = false;

            registerMainButton.textContent =
                "Create Account";

        }

    }

}


// ==============================================
// USER PROFILE SETUP (PART 2 OF 2)
// Saves the onboarding details as the user's profile.
// ==============================================

async function saveUserProfile() {

    const fullName =
        document.getElementById(
            "onboarding-full-name"
        )?.value.trim();

    const age =
        document.getElementById(
            "onboarding-age"
        )?.value;

    const height =
        document.getElementById(
            "onboarding-height"
        )?.value;

    const weight =
        document.getElementById(
            "onboarding-weight"
        )?.value;

    const {
        sex,
        activity,
        goal
    } = onboardingSelections;

    const saveButton =
        document.getElementById(
            "onboarding-save-button"
        );


    function showError(message) {

        if (onboardingMessage) {

            onboardingMessage.textContent = message;

        }

    }

    showError("");


    // ==========================================
    // VALIDATION
    // ==========================================

    if (
        !fullName ||
        !age ||
        !sex ||
        !height ||
        !weight ||
        !activity ||
        !goal
    ) {

        showError("Please complete all fields.");

        return;

    }

    const ageNumber = parseInt(age, 10);

    if (!(ageNumber >= 1 && ageNumber <= 120)) {

        showError("Please enter a valid age.");

        return;

    }

    if (!(parseFloat(height) > 0)) {

        showError("Please enter a valid height.");

        return;

    }

    if (!(parseFloat(weight) > 0)) {

        showError("Please enter a valid weight.");

        return;

    }


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent = "Saving...";

    }


    try {

        // ======================================
        // GET THE ACCOUNT CREATED IN PART 1
        // ======================================

        const {
            data: userData,
            error: userError
        } =
            await supabaseClient.auth.getUser();


        if (userError || !userData?.user) {

            console.error(
                "Could not get the signed-in user:",
                userError
            );

            showError(
                "We couldn't confirm your account. " +
                "Please close this popup and try again."
            );

            return;

        }


        // ======================================
        // CREATE PROFILE
        // ======================================

        const {
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .insert({

                    id:
                        userData.user.id,

                    full_name:
                        fullName,

                    age:
                        ageNumber,

                    gender:
                        sex,

                    height_cm:
                        parseFloat(height),

                    weight_kg:
                        parseFloat(weight),

                    activity_level:
                        activity,

                    fitness_goal:
                        goal,

                    updated_at:
                        new Date().toISOString()

                });


        if (profileError) {

            console.error(
                "Profile creation error:",
                profileError
            );

            showError(
                "Profile setup failed: " +
                profileError.message
            );

            return;

        }


        console.log(
            "Profile created successfully."
        );


        // ======================================
        // DONE: no web app for users, so sign out
        // and send them to the app download page
        // ======================================

        await supabaseClient.auth.signOut();

        window.location.href =
            "download.html?welcome=1";

    } catch (error) {

        console.error(
            "Unexpected profile error:",
            error
        );

        showError(
            "Something went wrong. Please try again."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent = "Save Profile";

        }

    }

}


// ==============================================
// COACH REGISTRATION
// ==============================================

async function registerCoach() {

    const fullName =
        document.getElementById(
            "register-full-name"
        )?.value.trim();

    const email =
        document.getElementById(
            "register-email"
        )?.value.trim();

    const password =
        document.getElementById(
            "register-password"
        )?.value;

    const age =
        document.getElementById(
            "coach-age"
        )?.value;

    const gender =
        document.querySelector(
            'input[name="coach-gender"]:checked'
        )?.value;

    const height =
        document.getElementById(
            "coach-height"
        )?.value;

    const weight =
        document.getElementById(
            "coach-weight"
        )?.value;

    const yearsExperience =
        document.getElementById(
            "coach-years-experience"
        )?.value;

    const credentialInput =
        document.getElementById(
            "coach-credential"
        );

    const credentialFile =
        credentialInput?.files?.[0];

    const credentialMessage =
        document.getElementById(
            "credential-message"
        );


    // ==========================================
    // FINAL VALIDATION
    // ==========================================

    if (
        !fullName ||
        !email ||
        !password
    ) {

        alert(
            "Account information is incomplete."
        );

        return;
    }


    if (
        selectedSpecialties.length === 0
    ) {

        if (specialtyMessage) {

            specialtyMessage.textContent =
                "Please select at least one coaching specialty.";

        }

        return;
    }

    if (!credentialFile) {

        if (credentialMessage) {
            credentialMessage.textContent =
                "Please upload a credential or certification document.";
        }

        return;
    }

    const allowedCredentialTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];

    if (
        !allowedCredentialTypes.includes(
            credentialFile.type
        )
    ) {

        if (credentialMessage) {
            credentialMessage.textContent =
                "Please upload a PDF, JPG, or PNG file.";
        }

        return;
    }

    const maxCredentialSize = 5 * 1024 * 1024;

    if (
        credentialFile.size >
        maxCredentialSize
    ) {

        if (credentialMessage) {
            credentialMessage.textContent =
                "Credential file must be 5 MB or smaller.";
        }

        return;
    }

    if (credentialMessage) {
        credentialMessage.textContent = "";
    }

    try {

        // ======================================
        // STEP 1: CREATE AUTH USER
        // ======================================

        const {
            data: authData,
            error: authError
        } =
            await supabaseClient.auth.signUp({

                email:
                    email.toLowerCase(),

                password: password

            });


        if (
            authError ||
            !authData.user
        ) {

            console.error(
                "Coach auth registration error:",
                authError
            );

            alert(
                authError?.message ||
                "Unable to create the coach account."
            );

            return;
        }


        // ======================================
        // STEP 2: CREATE COACH PROFILE
        // ======================================

        const {
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .insert({

                    id:
                        authData.user.id,

                    full_name:
                        fullName,

                    app_role:
                        "coach",

                    approval_status:
                        "pending",

                    coaching_specialty:
                        selectedSpecialties.join(", "),

                    years_experience:
                        yearsExperience?.trim() || null,

                    age:
                        age
                            ? parseInt(age, 10)
                            : null,

                    gender:
                        gender || null,

                    height_cm:
                        height
                            ? parseFloat(height)
                            : null,

                    weight_kg:
                        weight
                            ? parseFloat(weight)
                            : null,

                    updated_at:
                        new Date().toISOString()

                });


        if (profileError) {

            console.error(
                "Coach profile creation error:",
                profileError
            );

            alert(
                "Profile setup failed: " +
                profileError.message
            );

            return;
        }

        // ======================================
        // STEP 3: UPLOAD COACH CREDENTIAL
        // ======================================

        const coachId = authData.user.id;


        // Create a safe filename
        const safeFileName =
            credentialFile.name
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9._-]/g, "");


        // Storage policy requires:
        // <coach UUID>/<filename>
        const credentialPath =
            `${coachId}/${Date.now()}_${safeFileName}`;


        const {
            error: uploadError
        } =
            await supabaseClient.storage
                .from("coach-certificates")
                .upload(
                    credentialPath,
                    credentialFile
                );


        if (uploadError) {

            console.error(
                "Credential upload error:",
                uploadError
            );

            alert(
                "Unable to upload your credential: " +
                uploadError.message
            );

            return;
        }

        // ======================================
        // STEP 4: CREATE DOCUMENT RECORD
        // ======================================

        const {
            error: documentError
        } =
            await supabaseClient
                .from("coach_documents")
                .insert({

                    coach_id:
                        coachId,

                    file_name:
                        credentialFile.name,

                    file_path:
                        credentialPath,

                    file_type:
                        credentialFile.type,

                    verification_status:
                        "pending"

                });


        if (documentError) {

            console.error(
                "Coach document record error:",
                documentError
            );

            alert(
                "Credential information could not be saved: " +
                documentError.message
            );

            return;
        }


        // ======================================
        // STEP 5: SIGN PENDING COACH OUT
        // ======================================

        await supabaseClient.auth.signOut();


        // ======================================
        // STEP 6: COMPLETE
        // ======================================

        closeRegisterModal();

        document
            .getElementById(
                "coach-success-modal"
            )
            ?.classList.add("active");


    } catch (error) {

        console.error(
            "Unexpected coach registration error:",
            error
        );

        alert(
            error?.message ||
            "Something went wrong while creating your coach account."
        );

    }

}


// ==============================================
// APP SCREENSHOT PREVIEW
// ==============================================

const appScreens = [
    "images/FuHomePage.jpg",
    "images/FuFoodDiaryPage.jpg",
    "images/FuLogFoodPage.jpg",
    "images/PuHomePage.jpg"
];



function startAppPreview(imageId, images = appScreens) {
    const previewImage = document.getElementById(imageId);
    if (!previewImage) return;

    const screens = Array.isArray(images)
        ? images.filter(Boolean)
        : [];

    const imagesToShow = screens.length ? screens : appScreens;

    if (!imagesToShow.length) return;

    let currentScreen = 0;
    previewImage.src = imagesToShow[currentScreen];

    setInterval(() => {
        previewImage.classList.add("fade-out");

        setTimeout(() => {
            currentScreen = (currentScreen + 1) % imagesToShow.length;
            previewImage.src = imagesToShow[currentScreen];
            previewImage.classList.remove("fade-out");
        }, 400);
    }, 3500);
}


// ==============================================
// MODALS
// ==============================================

const registerModal =
    document.getElementById(
        "register-modal"
    );

const loginModal =
    document.getElementById(
        "login-modal"
    );


const registerClose =
    document.getElementById(
        "register-close"
    );

const loginClose =
    document.getElementById(
        "login-close"
    );


const registerOverlay =
    document.querySelector(
        ".register-modal-overlay"
    );

const loginOverlay =
    document.querySelector(
        ".login-modal-overlay"
    );


const registerButtons =
    document.querySelectorAll(
        ".open-register"
    );

const loginButtons =
    document.querySelectorAll(
        ".open-login"
    );


// ==============================================
// FORGOT PASSWORD MODAL
// ==============================================

const forgotPasswordModal =
    document.getElementById(
        "forgot-password-modal"
    );

const forgotPasswordLink =
    document.getElementById(
        "forgot-password-link"
    );

const forgotPasswordClose =
    document.getElementById(
        "forgot-password-close"
    );

const forgotPasswordOverlay =
    document.getElementById(
        "forgot-password-overlay"
    );

const backToLogin =
    document.getElementById(
        "back-to-login"
    );

const forgotPasswordEmail =
    document.getElementById(
        "forgot-password-email"
    );

const forgotPasswordForm =
    document.getElementById(
        "forgot-password-form"
    );

const forgotPasswordMessage =
    document.getElementById(
        "forgot-password-message"
    );


// ==============================================
// REGISTER STEPS
// ==============================================

const accountStep =
    document.getElementById(
        "register-step-account"
    );

const coachDetailsStep =
    document.getElementById(
        "register-step-coach-details"
    );

const onboardingStep =
    document.getElementById(
        "register-step-onboarding"
    );

function showRegisterStep(step) {

    accountStep?.classList.add(
        "hidden"
    );

    coachDetailsStep?.classList.add(
    "hidden"
    );

    onboardingStep?.classList.add(
        "hidden"
    );


    step?.classList.remove(
        "hidden"
    );


    // Scroll popup back to top
    // when changing steps

    const registerCard =
        document.querySelector(
            ".register-card"
        );


    if (registerCard) {
        registerCard.scrollTop = 0;
    }

}



// ==============================================
// LOGIN
// ==============================================
//
// Users and health coaches are checked and then sent to the download page. 
// Admins are checked and then sent to the system admin web portal.

const loginForm =
    document.getElementById(
        "login-form"
    );

const loginMessage =
    document.getElementById(
        "login-message"
    );


function showLoginMessage(text, type) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = text || "";

    loginMessage.classList.toggle(
        "info",
        type === "info"
    );
}


loginForm?.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        showLoginMessage("");

        const email =
            document.getElementById(
                "login-email"
            )?.value.trim();

        const password =
            document.getElementById(
                "login-password"
            )?.value;

        const submitButton =
            loginForm.querySelector(
                ".login-submit-button"
            );


        if (!email || !password) {

            showLoginMessage(
                "Please enter your email and password."
            );

            return;
        }


        if (submitButton) {

            submitButton.disabled = true;

            submitButton.innerHTML =
                '<span class="button-spinner"></span>';
        }


        try {

            // ==================================
            // STEP 1: SIGN IN
            // ==================================

            const {
                data: authData,
                error: authError
            } =
                await supabaseClient.auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });


            if (authError || !authData?.user) {

                showLoginMessage(
                    authError?.message ===
                    "Invalid login credentials"
                        ? "Incorrect email or password."
                        : (
                            authError?.message ||
                            "Unable to log in."
                        )
                );

                return;
            }


            // ==================================
            // STEP 2: LOAD PROFILE
            // ==================================

            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient
                    .from("profiles")
                    .select(
                        "app_role, approval_status, is_suspended"
                    )
                    .eq("id", authData.user.id)
                    .single();


            if (profileError || !profile) {

                console.error(
                    "Login profile error:",
                    profileError
                );

                await supabaseClient.auth.signOut();

                showLoginMessage(
                    "We couldn't load your profile. Please try again."
                );

                return;
            }


            // ==================================
            // STEP 3: CHECK ACCOUNT SUSPENSION
            // ==================================

            if (profile.is_suspended === true) {

                await supabaseClient.auth.signOut();

                showLoginMessage(
                    "Your account has been suspended and access is currently unavailable."
                );

                return;
            }


            // ==================================
            // STEP 4: COACH APPROVAL
            // ==================================

            if (profile.app_role === "coach") {

                if (
                    profile.approval_status ===
                    "pending"
                ) {

                    await supabaseClient.auth.signOut();

                    showLoginMessage(
                        "Your application is still being reviewed. " +
                        "You'll be able to log in once it's approved."
                    );

                    return;
                }


                if (
                    profile.approval_status ===
                    "rejected"
                ) {

                    await supabaseClient.auth.signOut();

                    showLoginMessage(
                        "Your coach application was not approved."
                    );

                    return;
                }
            }


            // ==================================
            // STEP 5: ADMIN
            // ==================================

            if (profile.app_role === "admin") {
                window.location.href = "../admin_web/ui/admin-dashboard.html";
                return;
            }


            // ==================================
            // STEP 6: USER / APPROVED COACH
            // ==================================

            await supabaseClient.auth.signOut();

            window.location.href =
                "download.html";


        } catch (error) {

            console.error(
                "Unexpected login error:",
                error
            );

            showLoginMessage(
                "Something went wrong. Please try again."
            );


        } finally {

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Log In";
            }
        }
    }
);


// ==============================================
// LOGIN → REGISTRATION LINKS
// ==============================================

const loginUserRegisterLink =
    document.getElementById(
        "login-user-register-link"
    );

const loginCoachRegisterLink =
    document.getElementById(
        "login-coach-register-link"
    );


loginUserRegisterLink?.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        openRegisterModal();

        registerAccountTabs.forEach((tab) => {

            if (
                tab.dataset.registerAccount ===
                "User"
            ) {
                tab.click();
            }
        });
    }
);


loginCoachRegisterLink?.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        openRegisterModal();

        registerAccountTabs.forEach((tab) => {

            if (
                tab.dataset.registerAccount ===
                "Coach"
            ) {
                tab.click();
            }
        });
    }
);


// ==============================================
// REGISTER ACCOUNT TYPE
// ==============================================

const registerAccountTabs =
    document.querySelectorAll(
        ".register-account-tab"
    );


const registerAccountTypeInput =
    document.getElementById(
        "register-account-type"
    );


const registerFullNameGroup =
    document.getElementById(
        "register-full-name-group"
    );


const registerFullNameInput =
    document.getElementById(
        "register-full-name"
    );


const registerMainButton =
    document.getElementById(
        "register-main-button"
    );


const registerMessage =
    document.getElementById(
        "register-message"
    );



// ==============================================
// COACH REGISTRATION VARIABLES
// ==============================================

const coachDetailsBack =
    document.getElementById(
        "coach-details-back"
    );

const specialtyOptions =
    document.querySelectorAll(
        ".specialty-option"
    );

const specialtyMessage =
    document.getElementById(
        "specialty-message"
    );

const specialtyCount =
    document.getElementById(
        "specialty-count"
    );

const submitCoachRegistration =
    document.getElementById(
        "submit-coach-registration"
    );

let selectedSpecialties = [];



// ==============================================
// RESET REGISTRATION
// ==============================================

function resetRegistration() {

    showRegisterStep(accountStep);

    // Reset account form fields

    const registerAccountForm =
        document.getElementById(
            "register-account-form"
        );

    registerAccountForm?.reset();


    // Reset account type to User

    registerAccountTabs.forEach(
        (tab) => {

            tab.classList.remove(
                "active"
            );


            if (
                tab.dataset
                    .registerAccount ===
                "User"
            ) {

                tab.classList.add(
                    "active"
                );

            }

        }
    );


    if (registerAccountTypeInput) {

        registerAccountTypeInput.value =
            "User";

    }


    // Full name is only asked here for health coaches

    registerFullNameGroup?.classList.add(
        "hidden"
    );

    if (registerFullNameInput) {

        registerFullNameInput.required = false;

    }

    if (registerMessage) {

        registerMessage.textContent = "";

    }


    // Reset user profile setup step

    document.getElementById(
        "onboarding-form"
    )?.reset();

    onboardingSelections = {
        sex: "",
        activity: "",
        goal: ""
    };

    document.querySelectorAll(
        ".choice-chip"
    ).forEach(
        (chip) => {

            chip.classList.remove("active");

            chip.setAttribute(
                "aria-pressed",
                "false"
            );

        }
    );

    if (onboardingMessage) {

        onboardingMessage.textContent = "";

    }


    // Reset main button text

    if (registerMainButton) {

        registerMainButton.textContent =
            "Create Account";

    }


    // Reset coach specialties

    selectedSpecialties = [];

    specialtyOptions.forEach(
        (option) => {

            option.classList.remove(
                "active"
            );

        }
    );

    if (specialtyCount) {

        specialtyCount.textContent =
            "0/3 selected";

    }

    if (specialtyMessage) {

        specialtyMessage.textContent = "";

    }

    // Reset coach personal information

    const coachAge =
        document.getElementById(
            "coach-age"
        );

    const coachGenderOptions =
        document.querySelectorAll(
            'input[name="coach-gender"]'
        );

    const coachHeight =
        document.getElementById(
            "coach-height"
        );

    const coachWeight =
        document.getElementById(
            "coach-weight"
        );

    const coachYearsExperience =
        document.getElementById(
            "coach-years-experience"
        );


    if (coachAge) {

        coachAge.value = "";

    }


    coachGenderOptions.forEach(
        (option) => {

            option.checked = false;

        }
    );


    if (coachHeight) {

        coachHeight.value = "";

    }


    if (coachWeight) {

        coachWeight.value = "";

    }


    if (coachYearsExperience) {

        coachYearsExperience.value = "";

    }

}



// ==============================================
// OPEN / CLOSE MODALS
// ==============================================

function openRegisterModal() {

    loginModal?.classList.remove(
        "active"
    );

    registerModal?.classList.add(
        "active"
    );

    registerModal?.setAttribute(
        "aria-hidden",
        "false"
    );

    loginModal?.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.add(
        "modal-open"
    );

}


function closeRegisterModal() {

    // Account already exists at the profile step, so check first

    if (
        onboardingStep &&
        !onboardingStep.classList.contains("hidden")
    ) {

        const leave = confirm(
            "Your account has been created, but your profile " +
            "isn't finished yet. Close anyway?"
        );

        if (!leave) {

            return;

        }

    }

    registerModal?.classList.remove(
        "active"
    );

    registerModal?.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

    resetRegistration();

}


function openLoginModal() {

    registerModal?.classList.remove(
        "active"
    );

    loginModal?.classList.add(
        "active"
    );

    registerModal?.setAttribute(
        "aria-hidden",
        "true"
    );

    loginModal?.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

}


function closeLoginModal() {

    showLoginMessage("");

    loginModal?.classList.remove(
        "active"
    );

    loginModal?.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

}


function openForgotPasswordModal() {

    const loginEmail =
        document.getElementById(
            "login-email"
        )?.value.trim();

    // Close login modal
    loginModal?.classList.remove("active");

    loginModal?.setAttribute(
        "aria-hidden",
        "true"
    );

    // Open forgot password modal
    forgotPasswordModal?.classList.add(
        "active"
    );

    forgotPasswordModal?.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    // Carry over email if user already entered one
    if (forgotPasswordEmail && loginEmail) {
        forgotPasswordEmail.value = loginEmail;
    }
}


function closeForgotPasswordModal() {

    forgotPasswordModal?.classList.remove(
        "active"
    );

    forgotPasswordModal?.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

}


// ==============================================
// OPEN BUTTONS
// ==============================================

document.addEventListener("click", function(event) {
    const button = event.target.closest(".open-register");

    if (!button) {
        return;
    }

    event.preventDefault();
    openRegisterModal();
});


loginButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openLoginModal();

            }
        );

    }
);



// ==============================================
// CLOSE BUTTONS
// ==============================================

registerClose?.addEventListener(
    "click",
    closeRegisterModal
);


loginClose?.addEventListener(
    "click",
    closeLoginModal
);


registerOverlay?.addEventListener(
    "click",
    closeRegisterModal
);


loginOverlay?.addEventListener(
    "click",
    closeLoginModal
);

// ==============================================
// FORGOT PASSWORD BUTTONS
// ==============================================

forgotPasswordLink?.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        openForgotPasswordModal();

    }
);


forgotPasswordClose?.addEventListener(
    "click",
    closeForgotPasswordModal
);


forgotPasswordOverlay?.addEventListener(
    "click",
    closeForgotPasswordModal
);


backToLogin?.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        closeForgotPasswordModal();

        openLoginModal();

    }
);


// ==============================================
// SEND PASSWORD RESET EMAIL
// ==============================================

forgotPasswordForm?.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const email =
            forgotPasswordEmail?.value.trim();

        const submitButton =
            forgotPasswordForm.querySelector(
                ".login-submit-button"
            );

        forgotPasswordMessage.textContent = "";

        if (!email) {
            forgotPasswordMessage.textContent =
                "Please enter your email address.";
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="button-spinner"></span>';
        }

        try {

            const { error } =
                await supabaseClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                            new URL(
                                "reset-password.html",
                                window.location.href
                            ).href
                        }
                    );

            if (error) {

                console.error(
                    "Password reset error:",
                    error
                );

                forgotPasswordMessage.textContent =
                    error.message;

                return;
            }

            forgotPasswordMessage.textContent =
                "If an account exists for this email, a password reset link has been sent.";

        } catch (error) {

            console.error(
                "Unexpected password reset error:",
                error
            );

            forgotPasswordMessage.textContent =
                "Something went wrong. Please try again.";

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "Send Reset Link";
            }

        }

    }
);


// ==============================================
// ESCAPE KEY
// ==============================================

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Escape") {

            if (
                registerModal?.classList
                    .contains("active")
            ) {

                closeRegisterModal();

            }


            if (
                loginModal?.classList
                    .contains("active")
            ) {

                closeLoginModal();

            }

            if (
                forgotPasswordModal?.classList
                    .contains("active")
            ) {

                closeForgotPasswordModal();

            }

        }

    }
);



// ==============================================
// SWITCH REGISTER ACCOUNT TYPE
// ==============================================

registerAccountTabs.forEach(
    (tab) => {

        tab.addEventListener(
            "click",
            function() {

                registerAccountTabs.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                tab.classList.add(
                    "active"
                );


                const selectedAccount =
                    tab.dataset
                        .registerAccount;


                if (
                    registerAccountTypeInput
                ) {

                    registerAccountTypeInput
                        .value =
                        selectedAccount;

                }


                // ==================================
                // USER
                // (email + password only; personal
                //  details come in the profile step)
                // ==================================

                if (
                    selectedAccount ===
                    "User"
                ) {

                    registerFullNameGroup
                        ?.classList
                        .add(
                            "hidden"
                        );


                    if (
                        registerFullNameInput
                    ) {

                        registerFullNameInput
                            .required =
                            false;

                        registerFullNameInput
                            .value = "";

                    }


                    if (
                        registerMainButton
                    ) {

                        registerMainButton
                            .textContent =
                            "Create Account";

                    }

                }


                // ==================================
                // HEALTH COACH
                // ==================================

                if (
                    selectedAccount ===
                    "Coach"
                ) {

                    registerFullNameGroup
                        ?.classList
                        .remove(
                            "hidden"
                        );


                    if (
                        registerFullNameInput
                    ) {

                        registerFullNameInput
                            .required =
                            true;

                    }


                    if (
                        registerMainButton
                    ) {

                        registerMainButton
                            .textContent =
                            "Continue →";

                    }

                }

            }
        );

    }
);



// ==============================================
// REGISTRATION STEP 1
// ==============================================

const registerAccountForm =
    document.getElementById(
        "register-account-form"
    );


registerAccountForm?.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        if (registerMessage) {

            registerMessage.textContent = "";

        }


        const selectedAccount =
            registerAccountTypeInput
                ?.value;


        // ======================================
        // USER REGISTRATION
        // ======================================

        if (
            selectedAccount === "User"
        ) {

            await registerUser();

            return;

        }


        // ======================================
        // HEALTH COACH REGISTRATION
        // ======================================

        if (
            selectedAccount === "Coach"
        ) {

            const fullName =
                document.getElementById(
                    "register-full-name"
                )?.value.trim();

            const email =
                document.getElementById(
                    "register-email"
                )?.value.trim();

            const password =
                document.getElementById(
                    "register-password"
                )?.value;

            const confirmPassword =
                document.getElementById(
                    "register-confirm-password"
                )?.value;


            if (
                !fullName ||
                !email ||
                !password ||
                !confirmPassword
            ) {

                alert(
                    "Please complete all fields."
                );

                return;

            }


            if (password !== confirmPassword) {

                if (registerMessage) {

                    registerMessage.textContent =
                        "Passwords do not match.";

                }

                return;

            }


            if (password.length < 6) {

                alert(
                    "Password must contain at least 6 characters."
                );

                return;

            }


            showRegisterStep(
                coachDetailsStep
            );

        }

    }
);



// ==============================================
// USER PROFILE SETUP (ONBOARDING STEP)
// ==============================================

const onboardingForm =
    document.getElementById(
        "onboarding-form"
    );

const onboardingMessage =
    document.getElementById(
        "onboarding-message"
    );

const choiceChips =
    document.querySelectorAll(
        ".choice-chip"
    );

let onboardingSelections = {
    sex: "",
    activity: "",
    goal: ""
};


// Single-choice chips (sex, activity level, fitness goal)

choiceChips.forEach(
    (chip) => {

        chip.addEventListener(
            "click",
            function() {

                const group =
                    chip.dataset.group;

                choiceChips.forEach(
                    (other) => {

                        if (
                            other.dataset.group ===
                            group
                        ) {

                            other.classList.remove(
                                "active"
                            );

                            other.setAttribute(
                                "aria-pressed",
                                "false"
                            );

                        }

                    }
                );

                chip.classList.add("active");

                chip.setAttribute(
                    "aria-pressed",
                    "true"
                );

                onboardingSelections[group] =
                    chip.dataset.value;

            }
        );

    }
);


onboardingForm?.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        await saveUserProfile();

    }
);



// ==============================================
// COACH SPECIALTY SELECTION
// ==============================================

specialtyOptions.forEach(
    (option) => {

        option.addEventListener(
            "click",
            function() {

                const specialty =
                    option.dataset.specialty;

                const alreadySelected =
                    selectedSpecialties.includes(
                        specialty
                    );


                // Remove selected specialty

                if (alreadySelected) {

                    selectedSpecialties =
                        selectedSpecialties.filter(
                            (item) =>
                                item !== specialty
                        );

                    option.classList.remove(
                        "active"
                    );

                }

                // Add specialty if below limit

                else {

                    if (
                        selectedSpecialties.length >= 3
                    ) {

                        if (specialtyMessage) {

                            specialtyMessage.textContent =
                                "You can select up to 3 specialties.";

                        }

                        return;

                    }


                    selectedSpecialties.push(
                        specialty
                    );

                    option.classList.add(
                        "active"
                    );

                }


                // Update counter

                if (specialtyCount) {

                    specialtyCount.textContent =
                        `${selectedSpecialties.length}/3 selected`;

                }


                if (specialtyMessage) {

                    specialtyMessage.textContent = "";

                }

            }
        );

    }
);


// ==============================================
// COACH REGISTRATION BUTTON
// (validates personal + coaching details, then registers)
// ==============================================

submitCoachRegistration?.addEventListener(
    "click",
    async function() {

        function showError(message) {

            if (specialtyMessage) {

                specialtyMessage.textContent = message;

            }

        }

        showError("");


        const age =
            document.getElementById(
                "coach-age"
            )?.value;

        const gender =
            document.querySelector(
                'input[name="coach-gender"]:checked'
            );

        const height =
            document.getElementById(
                "coach-height"
            )?.value;

        const weight =
            document.getElementById(
                "coach-weight"
            )?.value;

        const yearsExperience =
            document.getElementById(
                "coach-years-experience"
            )?.value;


        // Personal information

        if (!gender || !height || !weight) {

            showError(
                "Please complete your gender, height and weight."
            );

            return;

        }

        if (age && Number(age) < 18) {

            showError("Age must be at least 18.");

            return;

        }

        if (Number(height) <= 0) {

            showError("Please enter a valid height.");

            return;

        }

        if (Number(weight) <= 0) {

            showError("Please enter a valid weight.");

            return;

        }


        // Coaching information

        if (selectedSpecialties.length === 0) {

            showError(
                "Please select at least one coaching specialty."
            );

            return;

        }

        if (
            yearsExperience === undefined ||
            yearsExperience === ""
        ) {

            showError(
                "Please enter your years of experience."
            );

            return;

        }

        if (Number(yearsExperience) < 0) {

            showError(
                "Years of experience cannot be negative."
            );

            return;

        }


        await registerCoach();

    }
);


// ==============================================
// COACH STEP BACK BUTTONS
// ==============================================

coachDetailsBack?.addEventListener(
    "click",
    function() {

        showRegisterStep(
            accountStep
        );

    }
);


// ==============================================
// COACH SUCCESS POPUP
// ==============================================

const coachSuccessModal =
    document.getElementById(
        "coach-success-modal"
    );

const coachSuccessClose =
    document.getElementById(
        "coach-success-close"
    );

const coachSuccessLater =
    document.getElementById(
        "coach-success-later"
    );

const coachSuccessOverlay =
    document.getElementById(
        "coach-success-overlay"
    );


function closeCoachSuccessModal() {

    coachSuccessModal
        ?.classList.remove("active");

}


coachSuccessClose?.addEventListener(
    "click",
    closeCoachSuccessModal
);

coachSuccessLater?.addEventListener(
    "click",
    closeCoachSuccessModal
);

coachSuccessOverlay?.addEventListener(
    "click",
    closeCoachSuccessModal
);

// ==============================================
// RESET PASSWORD
// ==============================================

const resetPasswordForm =
    document.getElementById(
        "reset-password-form"
    );

const newPasswordInput =
    document.getElementById(
        "new-password"
    );

const confirmNewPasswordInput =
    document.getElementById(
        "confirm-new-password"
    );

const resetPasswordMessage =
    document.getElementById(
        "reset-password-message"
    );


// ==============================================
// UPDATE PASSWORD
// ==============================================

resetPasswordForm?.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const newPassword =
            newPasswordInput?.value;

        const confirmPassword =
            confirmNewPasswordInput?.value;

        const submitButton =
            document.getElementById(
                "reset-password-button"
            );


        // Clear previous message
        if (resetPasswordMessage) {
            resetPasswordMessage.textContent = "";
        }


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!newPassword || !confirmPassword) {

            resetPasswordMessage.textContent =
                "Please enter and confirm your new password.";

            return;
        }


        if (newPassword !== confirmPassword) {

            resetPasswordMessage.textContent =
                "Passwords do not match.";

            return;
        }


        if (newPassword.length < 6) {

            resetPasswordMessage.textContent =
                "Password must contain at least 6 characters.";

            return;
        }


        // ==========================================
        // UPDATE PASSWORD
        // ==========================================

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.innerHTML = '<span class="button-spinner"></span>';
        }


        try {

            const { error } =
                await supabaseClient.auth.updateUser({
                    password: newPassword
                });


            if (error) {

                console.error(
                "Password reset error:",
                error
            );

            if (
                error.message ===
                "New password should be different from the old password."
            ) {
                resetPasswordMessage.textContent =
                    "Your new password must be different from your current password.";
            } else {
                resetPasswordMessage.textContent =
                    "Unable to reset password. Please request a new reset link.";
            }

            return;
            }


            // ======================================
            // SUCCESS
            // ======================================

            resetPasswordForm.reset();

            resetPasswordForm.hidden = true;

            document
                .getElementById("reset-password-icon")
                ?.setAttribute("hidden", "");

            document
                .querySelector(".reset-password-card > h1")
                ?.setAttribute("hidden", "");

            document
                .querySelector(".reset-password-description")
                ?.setAttribute("hidden", "");

            document
                .getElementById("reset-return-login")
                ?.setAttribute("hidden", "");

            document
                .getElementById("reset-password-success")
                ?.removeAttribute("hidden");


        } catch (error) {

            console.error(
                "Unexpected password reset error:",
                error
            );

            resetPasswordMessage.textContent =
                "Something went wrong. Please try again.";

        } finally {

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Reset Password";
            }

        }

    }
);

// ==============================================
// OPEN LOGIN MODAL FROM URL
// ==============================================

const pageParams =
    new URLSearchParams(
        window.location.search
    );

if (pageParams.get("login") === "1") {

    openLoginModal();

    // Remove ?login=1 from the URL after opening
    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );
}

loadLandingPageContent();