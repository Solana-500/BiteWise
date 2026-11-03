import {
    getCategories,
    addCategory,
    updateCategory,
    updateCategoryStatus
} from "../entity/category-entity.js";



export async function loadCategories(categoryType) {
    return await getCategories(categoryType);
}

export async function createCategory(name, categoryType) {
    return await addCategory({
        name,
        categoryType
    });
}

export async function editCategory(categoryId, name) {
    return await updateCategory({
        categoryId,
        name
    });
}

export async function deactivateCategory(categoryId) {
    return await updateCategoryStatus({
        categoryId,
        isActive: false
    });
}

export async function reactivateCategory(categoryId) {
    return await updateCategoryStatus({
        categoryId,
        isActive: true
    });
}