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

        alert("Passwords do not match.");

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
            "download.html";


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

const specialtyStep =
    document.getElementById(
        "register-step-specialty"
    );

const credentialsStep =
    document.getElementById(
        "register-step-credentials"
    );


function showRegisterStep(step) {

    accountStep?.classList.add(
        "hidden"
    );

    specialtyStep?.classList.add(
        "hidden"
    );

    credentialsStep?.classList.add(
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


// FIXED:
// Previously this said "healh-goal"

const healthGoalSelect =
    document.getElementById(
        "health-goal"
    );


const registerMainButton =
    document.getElementById(
        "register-main-button"
    );



// ==============================================
// COACH SPECIALTY VARIABLES
// ==============================================

const specialtyOptions =
    document.querySelectorAll(
        ".specialty-option"
    );


const specialtyContinue =
    document.getElementById(
        "specialty-continue"
    );


const specialtyMessage =
    document.getElementById(
        "specialty-message"
    );


let selectedSpecialty = null;



// ==============================================
// COACH CREDENTIAL VARIABLES
// ==============================================

const credentialInput =
    document.getElementById(
        "coach-credentials"
    );


const selectedFileName =
    document.getElementById(
        "selected-file-name"
    );


const credentialMessage =
    document.getElementById(
        "credential-message"
    );



// ==============================================
// RESET REGISTRATION
// ==============================================

function resetRegistration() {

    showRegisterStep(accountStep);


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


    // Reset specialty

    selectedSpecialty = null;


    specialtyOptions.forEach(
        (option) => {

            option.classList.remove(
                "active"
            );

        }
    );


    if (specialtyMessage) {

        specialtyMessage.textContent = "";

    }


    // Reset credential message

    if (credentialMessage) {

        credentialMessage.textContent = "";

    }


    if (selectedFileName) {

        selectedFileName.textContent =
            "No file selected";

    }


    if (credentialInput) {

        credentialInput.value = "";

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

            showRegisterStep(
                specialtyStep
            );

        }

    }
);



// ==============================================
// COACH SPECIALTY
// ==============================================

specialtyOptions.forEach(
    (option) => {

        option.addEventListener(
            "click",
            function() {

                specialtyOptions.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                option.classList.add(
                    "active"
                );


                selectedSpecialty =
                    option.dataset
                        .specialty;


                if (specialtyMessage) {

                    specialtyMessage
                        .textContent = "";

                }

            }
        );

    }
);



specialtyContinue?.addEventListener(
    "click",
    function() {

        if (!selectedSpecialty) {

            if (specialtyMessage) {

                specialtyMessage
                    .textContent =
                    "Please select a coaching specialty.";

            }

            return;

        }


        showRegisterStep(
            credentialsStep
        );

    }
);



// ==============================================
// COACH CREDENTIAL FILE
// ==============================================

credentialInput?.addEventListener(
    "change",
    function() {

        const file =
            credentialInput.files[0];


        if (file) {

            if (selectedFileName) {

                selectedFileName
                    .textContent =
                    file.name;

            }


            if (credentialMessage) {

                credentialMessage
                    .textContent = "";

            }

        } else {

            if (selectedFileName) {

                selectedFileName
                    .textContent =
                    "No file selected";

            }

        }

    }
);



// ==============================================
// SUBMIT COACH REGISTRATION
// ==============================================

const submitCoachRegistration =
    document.getElementById(
        "submit-coach-registration"
    );


submitCoachRegistration
    ?.addEventListener(
        "click",
        function() {

            const file =
                credentialInput
                    ?.files[0];


            if (!file) {

                if (
                    credentialMessage
                ) {

                    credentialMessage
                        .textContent =
                        "Please upload your coaching credentials.";

                }

                return;

            }


            /*
                HEALTH COACH REGISTRATION
                IS STILL PROTOTYPE-ONLY.

                Later we will:

                1. Create Supabase Auth user
                2. Create profiles row
                3. Set app_role = "coach"
                4. Set coaching_specialty
                5. Upload credential file
                6. Create coach_documents row

                We are NOT doing those database
                operations yet.
            */


            console.log(
                "Coach prototype data:"
            );

            console.log(
                "Specialty:",
                selectedSpecialty
            );

            console.log(
                "Credential file:",
                file.name
            );


            alert(
                "Coach registration is not connected to Supabase yet."
            );

        }
    );



// ==============================================
// COACH STEP BACK BUTTONS
// ==============================================

const specialtyBack =
    document.getElementById(
        "specialty-back"
    );


const credentialsBack =
    document.getElementById(
        "credentials-back"
    );


specialtyBack?.addEventListener(
    "click",
    function() {

        showRegisterStep(
            accountStep
        );

    }
);


credentialsBack?.addEventListener(
    "click",
    function() {

        showRegisterStep(
            specialtyStep
        );

    }
);