// ==============================================
// SUPABASE CONNECTION
// ==============================================

const SUPABASE_URL = "https://xxazvbjvwuvklroialwe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-mB23YADvK8aLerxzfYjyQ_OldSllfi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// ==============================================
// USER REGISTRATION
// ==============================================

async function registerUser() {

    const fullNameInput =
        document.getElementById("register-full-name");

    const emailInput =
        document.getElementById("register-email");

    const passwordInput =
        document.getElementById("register-password");

    const confirmPasswordInput =
        document.getElementById("register-confirm-password");

    const healthGoalInput =
        document.getElementById("health-goal");


    // ==========================================
    // CHECK FORM ELEMENTS
    // ==========================================

    if (
        !fullNameInput ||
        !emailInput ||
        !passwordInput ||
        !confirmPasswordInput ||
        !healthGoalInput
    ) {

        console.error(
            "Registration form fields could not be found."
        );

        alert(
            "There is a problem with the registration form."
        );

        return;
    }


    const fullName =
        fullNameInput.value.trim();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;

    const healthGoal =
        healthGoalInput.value;


    // ==========================================
    // VALIDATION
    // ==========================================

    if (
        !fullName ||
        !email ||
        !password ||
        !confirmPassword ||
        !healthGoal
    ) {

        alert("Please complete all fields.");

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


    try {

        // ======================================
        // STEP 1: CREATE AUTH USER
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

            alert(authError.message);

            return;
        }


        if (!authData.user) {

            console.error(
                "No user was returned after signup."
            );

            alert(
                "Account could not be created."
            );

            return;
        }


        console.log(
            "Auth user created successfully."
        );


        // ======================================
        // STEP 2: CHECK SESSION
        // ======================================

        if (!authData.session) {

            console.error(
                "No authenticated session was returned."
            );

            alert(
                "Your account was created, but your email must be verified before your profile can be completed."
            );

            return;
        }


        // ======================================
        // STEP 3: CREATE PROFILE
        // ======================================

        const {
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .insert({
                    id: authData.user.id,
                    full_name: fullName,
                    fitness_goal: healthGoal
                });


        if (profileError) {

            console.error(
                "Profile creation error:",
                profileError
            );

            alert(
                "Your account was created, but your profile could not be created. Please check the console."
            );

            return;
        }


        console.log(
            "Profile created successfully."
        );


        // ======================================
        // STEP 4: REGISTRATION COMPLETE
        // ======================================

        window.location.href =
            "download.html?welcome=1";


    } catch (error) {

        console.error(
            "Unexpected registration error:",
            error
        );


        alert(
            "Something went wrong while creating your account."
        );

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
        // STEP 3: SIGN PENDING COACH OUT
        // ======================================

        await supabaseClient.auth.signOut();


        // ======================================
        // STEP 4: COMPLETE
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


function startAppPreview(imageId) {

    const previewImage =
        document.getElementById(imageId);


    if (!previewImage) {
        return;
    }


    let currentScreen = 0;


    setInterval(() => {

        previewImage.classList.add("fade-out");


        setTimeout(() => {

            currentScreen =
                (currentScreen + 1) %
                appScreens.length;


            previewImage.src =
                appScreens[currentScreen];


            previewImage.classList.remove(
                "fade-out"
            );

        }, 400);

    }, 3500);

}


startAppPreview("app-preview-image");
startAppPreview("download-preview-image");



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

function showRegisterStep(step) {

    accountStep?.classList.add(
        "hidden"
    );

    coachDetailsStep?.classList.add(
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
// LOGIN ACCOUNT TYPE
// ==============================================

const accountTabs =
    document.querySelectorAll(
        ".account-tab"
    );


const accountTypeInput =
    document.getElementById(
        "account-type"
    );


const loginSubtitle =
    document.getElementById(
        "login-subtitle"
    );


const accountSubtitles = {

    User:
        "Registered User Sign In",

    Coach:
        "Health Coach Sign In",

    Admin:
        "System Admin Sign In"

};


// Text under the Log In button changes per account type.
// Admin has no sign-up, so it shows a plain note instead.

const loginSwitchLink =
    document.getElementById(
        "login-switch-link"
    );

const loginAdminNote =
    document.getElementById(
        "login-admin-note"
    );

const loginSwitchOptions = {

    User: {
        text: "Don't have a user account? Sign Up",
        registerAs: "User"
    },

    Coach: {
        text: "New coach? Register as a Coach",
        registerAs: "Coach"
    }

};


function updateLoginFooter(accountType) {

    const option =
        loginSwitchOptions[accountType];

    if (loginSwitchLink) {

        loginSwitchLink.hidden = !option;

        if (option) {

            loginSwitchLink.textContent =
                option.text;

            loginSwitchLink.dataset.registerAs =
                option.registerAs;

        }

    }

    if (loginAdminNote) {

        loginAdminNote.hidden = !!option;

    }

}


loginSwitchLink?.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        const registerAs =
            loginSwitchLink.dataset.registerAs ||
            "User";

        openRegisterModal();

        // Pre-select the matching tab in the register popup

        registerAccountTabs.forEach(
            (tab) => {

                if (
                    tab.dataset.registerAccount ===
                    registerAs
                ) {

                    tab.click();

                }

            }
        );

    }
);


// ==============================================
// LOGIN
// ==============================================
//
// Users and health coaches are checked and then sent to the
// download page (there is no web app for them). Admins are
// checked too, but the admin portal is not built yet.

const loginForm =
    document.getElementById(
        "login-form"
    );

const loginMessage =
    document.getElementById(
        "login-message"
    );

const loginRoleForTab = {
    User: "user",
    Coach: "coach",
    Admin: "admin"
};

const loginAccountLabel = {
    User: "a user account",
    Coach: "a coach account",
    Admin: "an admin account"
};


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

        const selectedAccount =
            accountTypeInput?.value || "User";

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

            submitButton.textContent =
                "Logging in...";

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
                        "app_role, approval_status"
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
            // STEP 3: CHECK ROLE MATCHES TAB
            // ==================================

            const expectedRole =
                loginRoleForTab[selectedAccount];

            if (profile.app_role !== expectedRole) {

                await supabaseClient.auth.signOut();

                showLoginMessage(
                    "This isn't " +
                    loginAccountLabel[selectedAccount] +
                    ". Please choose the correct tab above."
                );

                return;

            }


            // ==================================
            // STEP 4: COACH APPROVAL
            // ==================================

            if (expectedRole === "coach") {

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
            // STEP 5: ADMIN (PORTAL NOT BUILT YET)
            // ==================================

            if (expectedRole === "admin") {

                await supabaseClient.auth.signOut();

                showLoginMessage(
                    "Admin web portal coming soon.",
                    "info"
                );

                return;

            }


            // ==================================
            // STEP 6: USER / APPROVED COACH
            // ==================================
            //
            // No web app for these accounts, so sign out
            // and send them to the mobile app download page.

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


accountTabs.forEach((tab) => {

    tab.addEventListener(
        "click",
        function() {

            accountTabs.forEach(
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
                tab.dataset.account;


            if (accountTypeInput) {

                accountTypeInput.value =
                    selectedAccount;

            }


            if (loginSubtitle) {

                loginSubtitle.textContent =
                    accountSubtitles[
                        selectedAccount
                    ];

            }


            updateLoginFooter(selectedAccount);
            showLoginMessage("");

        }
    );

});



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


const healthGoalGroup =
    document.getElementById(
        "health-goal-group"
    );


const healthGoalSelect =
    document.getElementById(
        "health-goal"
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


    // Show Health Goal

    healthGoalGroup?.classList.remove(
        "hidden"
    );


    if (healthGoalSelect) {

        healthGoalSelect.required = true;

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



// ==============================================
// OPEN BUTTONS
// ==============================================

registerButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openRegisterModal();

            }
        );

    }
);


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
                // ==================================

                if (
                    selectedAccount ===
                    "User"
                ) {

                    healthGoalGroup
                        ?.classList
                        .remove(
                            "hidden"
                        );


                    if (
                        healthGoalSelect
                    ) {

                        healthGoalSelect
                            .required =
                            true;

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

                    healthGoalGroup
                        ?.classList
                        .add(
                            "hidden"
                        );


                    if (
                        healthGoalSelect
                    ) {

                        healthGoalSelect
                            .required =
                            false;

                        healthGoalSelect
                            .value = "";

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