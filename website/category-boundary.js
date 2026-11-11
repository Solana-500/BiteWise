import {
    loadCategories,
    createCategory,
    editCategory,
    deactivateCategory,
    reactivateCategory
} from "./category-controller.js";

import {
    escapeHTML
} from "./ui-utils.js";


let selectedCategory = null;
let selectedCategoryType = null;


function setupCategoryTabs() {
    const mainTabs = document.querySelectorAll(
        "[data-category-tab]"
    );

    const mainContents = document.querySelectorAll(
        "[data-category-content]"
    );

    mainTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const selected = tab.dataset.categoryTab;

            mainTabs.forEach(item =>
                item.classList.remove("active")
            );

            mainContents.forEach(content =>
                content.classList.remove("active")
            );

            tab.classList.add("active");

            document
                .querySelector(
                    `[data-category-content="${selected}"]`
                )
                ?.classList.add("active");
        });
    });
}


function setupWorkoutCategoryTabs() {
    const workoutTabs = document.querySelectorAll(
        "[data-workout-tab]"
    );

    const workoutContents = document.querySelectorAll(
        "[data-workout-content]"
    );

    workoutTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const selected = tab.dataset.workoutTab;

            workoutTabs.forEach(item =>
                item.classList.remove("active")
            );

            workoutContents.forEach(content =>
                content.classList.remove("active")
            );

            tab.classList.add("active");

            document
                .querySelector(
                    `[data-workout-content="${selected}"]`
                )
                ?.classList.add("active");
        });
    });
}


function setupCategoryPageTabs() {
    setupCategoryTabs();
    setupWorkoutCategoryTabs();
}


const categoryTables = {
    exercise_log: "exercise-category-table-body",
    workout_plan: "workout-plan-category-table-body",
    coach_specialty: "coach-speciality-table-body"
};


async function loadCategoryTable(categoryType) {
    const tableBody = document.getElementById(
        categoryTables[categoryType]
    );

    if (!tableBody) return;

    try {
        const categories = await loadCategories(categoryType);

        renderCategoryTable(tableBody, categories);

    } catch (error) {
        console.error("Unable to load categories:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    Unable to load categories.
                </td>
            </tr>
        `;
    }
}


function renderCategoryTable(tableBody, categories) {
    if (categories.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    No categories found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = categories.map(category => `
        <tr>
            <td>${escapeHTML(category.name)}</td>

            <td>
                <span class="category-status ${category.is_active ? "active" : "inactive"}">
                    ${category.is_active ? "Active" : "Inactive"}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="category-action-button edit"
                    data-category-id="${category.id}">
                    Edit
                </button>

                <button
                    type="button"
                    class="category-action-button ${category.is_active ? "deactivate" : "reactivate"}"
                    data-category-id="${category.id}"
                    data-is-active="${category.is_active}">
                    ${category.is_active ? "Deactivate" : "Reactivate"}
                </button>
            </td>
        </tr>
    `).join("");
}


/* =========================================
   ADD CATEGORY MODAL
========================================= */

function openAddCategoryModal(categoryType) {
    selectedCategoryType = categoryType;

    const modal = document.getElementById("add-category-modal");
    const input = document.getElementById("add-category-name");
    const errorMessage = document.getElementById("add-category-error");

    if (!modal) {
        console.error("Add category modal not found!");
        return;
    }

    input.value = "";
    errorMessage.textContent = "";

    modal.classList.add("show");

    input.focus();
}


function closeAddCategoryModal() {
    document
        .getElementById("add-category-modal")
        ?.classList.remove("show");

    selectedCategoryType = null;

    document.getElementById("add-category-name").value = "";
    document.getElementById("add-category-error").textContent = "";
}


async function handleAddCategory() {
    if (!selectedCategoryType) return;

    const categoryNameInput = document.getElementById("add-category-name");
    const errorMessage = document.getElementById("add-category-error");

    const categoryName = categoryNameInput.value.trim();

    errorMessage.textContent = "";

    if (!categoryName) {
        errorMessage.textContent = "Category name is required.";
        categoryNameInput.focus();
        return;
    }

    try {
        await createCategory(categoryName, selectedCategoryType);

        const categoryType = selectedCategoryType;

        closeAddCategoryModal();

        await loadCategoryTable(categoryType);

    } catch (error) {
        console.error("Unable to add category:", error);
        errorMessage.textContent = error.message;
    }
}


function openEditCategoryModal(categoryId, categoryType, currentName) {
    const modal = document.getElementById("edit-category-modal");

    if (!modal) {
        console.error("Edit modal not found!");
        return;
    }

    selectedCategory = {
        id: categoryId,
        type: categoryType
    };

    document.getElementById("edit-category-error").textContent = "";

    document.getElementById("edit-category-name").value = currentName;

    modal.classList.add("show");
}


function closeEditCategoryModal() {
    document
        .getElementById("edit-category-modal")
        ?.classList.remove("show");

    selectedCategory = null;
}


async function handleEditCategory() {
    if (!selectedCategory) return;

    const categoryId = selectedCategory.id;
    const categoryType = selectedCategory.type;

    const categoryInput = document.getElementById("edit-category-name");
    const errorMessage = document.getElementById("edit-category-error");

    const categoryName = categoryInput.value.trim();

    errorMessage.textContent = "";

    if (!categoryName) {
        errorMessage.textContent = "Category name is required.";
        categoryInput.focus();
        return;
    }

    try {
        await editCategory(categoryId, categoryName);

        closeEditCategoryModal();

        await loadCategoryTable(categoryType);

    } catch (error) {
        console.error(error);
        errorMessage.textContent = error.message;
    }
}

function openDeactivateModal(categoryId, categoryType) {
    selectedCategory = { id: categoryId, type: categoryType };

    const msg = document.getElementById("deactivate-category-error");
    if (msg) msg.textContent = "";

    document
        .getElementById("deactivate-category-modal")
        ?.classList.add("show");
}


function closeDeactivateModal() {
    document
        .getElementById("deactivate-category-modal")
        ?.classList.remove("show");

    selectedCategory = null;
}


async function handleDeactivateCategory() {
    if (!selectedCategory) return;

    const categoryId = selectedCategory.id;
    const categoryType = selectedCategory.type;

    try {
        await deactivateCategory(categoryId);

        closeDeactivateModal();

        await loadCategoryTable(categoryType);

    } catch (error) {
        console.error(error);

        const msg = document.getElementById("deactivate-category-error");
        if (msg) msg.textContent = error.message;
    }
}

function openReactivateModal(categoryId, categoryType) {
    selectedCategory = {
        id: categoryId,
        type: categoryType
    };

    const msg = document.getElementById("reactivate-category-error");
    if (msg) msg.textContent = "";

    document
        .getElementById("reactivate-category-modal")
        ?.classList.add("show");
}


function closeReactivateModal() {
    document
        .getElementById("reactivate-category-modal")
        ?.classList.remove("show");

    selectedCategory = null;
}


async function handleReactivateCategory() {
    if (!selectedCategory) return;

    const categoryId = selectedCategory.id;
    const categoryType = selectedCategory.type;

    try {
        await reactivateCategory(categoryId);

        closeReactivateModal();

        await loadCategoryTable(categoryType);

    } catch (error) {
        console.error(error);
        const msg = document.getElementById("reactivate-category-error");
        if (msg) msg.textContent = error.message;
    }
}

function getCategoryType(section) {
    if (section.dataset.categoryContent === "coach") {
        return "coach_specialty";
    }

    if (section.dataset.workoutContent === "user") {
        return "exercise_log";
    }

    if (section.dataset.workoutContent === "coach") {
        return "workout_plan";
    }

    return null;
}


function setupCategoryActions() {

    // Add Category buttons
    document.querySelectorAll(".category-add-button").forEach(button => {
        button.addEventListener("click", () => {

            const section = button.closest(
                "[data-category-content], [data-workout-content]"
            );

            if (!section) return;

            const categoryType = getCategoryType(section);

            if (categoryType) {
                openAddCategoryModal(categoryType);
            }
        });
    });


    // Category table buttons
    document.querySelectorAll(".category-table").forEach(table => {

        table.addEventListener("click", event => {

            const button = event.target.closest("button");

            if (!button) return;

            const categoryId = button.dataset.categoryId;

            const row = button.closest("tr");

            const categoryName = row
                ?.querySelector("td")
                ?.textContent.trim();

            const section = table.closest(
                "[data-category-content], [data-workout-content]"
            );

            if (!section || !categoryId) return;

            const categoryType = getCategoryType(section);

            if (!categoryType) return;


            // Edit
            if (button.classList.contains("edit")) {
                openEditCategoryModal(
                    categoryId,
                    categoryType,
                    categoryName
                );
            }


            // Deactivate
            if (button.classList.contains("deactivate")) {
                openDeactivateModal(
                    categoryId,
                    categoryType
                );
            }


            // Reactivate
            if (button.classList.contains("reactivate")) {
                openReactivateModal(
                    categoryId,
                    categoryType
                );
            }

        });
    });

    /* Add */
    document
        .getElementById("add-category-modal-close")
        ?.addEventListener("click", closeAddCategoryModal);

    document
        .getElementById("cancel-add-category")
        ?.addEventListener("click", closeAddCategoryModal);

    document
        .getElementById("confirm-add-category")
        ?.addEventListener("click", handleAddCategory);


    /* Edit */
    document
        .getElementById("edit-category-modal-close")
        ?.addEventListener("click", closeEditCategoryModal);

    document
        .getElementById("cancel-edit-category")
        ?.addEventListener("click", closeEditCategoryModal);

    document
        .getElementById("confirm-edit-category")
        ?.addEventListener("click", handleEditCategory);


    /* Deactivate */
    document
        .getElementById("deactivate-category-modal-close")
        ?.addEventListener("click", closeDeactivateModal);

    document
        .getElementById("cancel-deactivate-category")
        ?.addEventListener("click", closeDeactivateModal);

    document
        .getElementById("confirm-deactivate-category")
        ?.addEventListener("click", handleDeactivateCategory);


    /* Reactivate */
    document
        .getElementById("reactivate-category-modal-close")
        ?.addEventListener("click", closeReactivateModal);

    document
        .getElementById("cancel-reactivate-category")
        ?.addEventListener("click", closeReactivateModal);

    document
        .getElementById("confirm-reactivate-category")
        ?.addEventListener("click", handleReactivateCategory);
}


function setupCategorySearch() {
    const sections = document.querySelectorAll(
        "[data-category-content], [data-workout-content]"
    );

    sections.forEach(section => {
        const searchInput = section.querySelector(
            ".category-search-input"
        );

        const statusFilter = section.querySelector(
            ".category-status-filter"
        );

        if (!searchInput || !statusFilter) return;

        function filterCategories() {
            const searchTerm = searchInput.value
                .trim()
                .toLowerCase();

            const selectedStatus = statusFilter.value;

            const tableBody = section.querySelector(
                ".category-table tbody"
            );

            if (!tableBody) return;

            tableBody.querySelector(
                ".category-no-results"
            )?.remove();

            const rows = Array.from(
                tableBody.querySelectorAll("tr")
            ).filter(row =>
                !row.classList.contains("category-no-results")
            );

            let matchCount = 0;

            rows.forEach(row => {
                const cells = row.querySelectorAll("td");

                if (cells.length < 2) return;

                const categoryName = cells[0].textContent
                    .trim()
                    .toLowerCase();

                const categoryStatus = cells[1].textContent
                    .trim()
                    .toLowerCase();

                const matchesSearch =
                    categoryName.includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "all" ||
                    categoryStatus === selectedStatus;

                const isMatch = matchesSearch && matchesStatus;

                row.style.display = isMatch ? "" : "none";

                if (isMatch) {
                    matchCount++;
                }
            });

            // Show no-results message
            if (matchCount === 0 && (searchTerm !== "" || selectedStatus !== "all")) {
                const messageRow = document.createElement("tr");

                messageRow.className = "category-no-results";

                messageRow.innerHTML = `
                    <td colspan="3">
                        <div class="category-empty-state">
                            <h3>No content found</h3>
                            <p>There are no categories matching your filters.</p>
                        </div>
                    </td>
                `;

                tableBody.appendChild(messageRow);
            }
        }

        searchInput.addEventListener("input", filterCategories);

        statusFilter.addEventListener("change", filterCategories);
    });
}


async function loadAllCategories() {
    await Promise.all([
        loadCategoryTable("exercise_log"),
        loadCategoryTable("workout_plan"),
        loadCategoryTable("coach_specialty")
    ]);
}


export function loadCategoriesPage() {
    setupCategoryPageTabs();
    setupCategoryActions();
    setupCategorySearch();

    loadAllCategories();
}
