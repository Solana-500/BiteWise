import { supabaseClient } from "./supabase-client.js";


const CATEGORY_TABLE = "categories";


export async function getCategories(categoryType) {
    const { data, error } = await supabaseClient
        .from(CATEGORY_TABLE)
        .select(`
            id,
            name,
            category_type,
            is_active,
            created_at
        `)
        .eq("category_type", categoryType)
        .order("name", { ascending: true });

    if (error) {
        throw new Error(`Unable to load categories: ${error.message}`);
    }

    return data ?? [];
}


export async function addCategory({ name, categoryType }) {
    const categoryName = String(name ?? "").trim();

    if (!categoryName) {
        throw new Error("Category name is required.");
    }

    const { data, error } = await supabaseClient
        .from(CATEGORY_TABLE)
        .insert({
            name: categoryName,
            category_type: categoryType
        })
        .select(`
            id,
            name,
            category_type,
            is_active,
            created_at
        `)
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("That category already exists for this type.");
        }
        throw new Error(`Unable to add category: ${error.message}`);
    }

    return data;
}


export async function updateCategory({ categoryId, name }) {
    const categoryName = String(name ?? "").trim();

    if (!categoryName) {
        throw new Error("Category name is required.");
    }

    const { data, error } = await supabaseClient
        .from(CATEGORY_TABLE)
        .update({
            name: categoryName
        })
        .eq("id", categoryId)
        .select(`
            id,
            name,
            category_type,
            is_active,
            created_at
        `)
        .maybeSingle();

    if (error) {
        if (error.code === "23505") {
            throw new Error("That category already exists for this type.");
        }
        throw new Error(`Unable to update category: ${error.message}`);
    }

    if (!data) {
        throw new Error("Category not found, or you don't have permission to change it.");
    }

    return data;
}

export async function updateCategoryStatus({ categoryId, isActive }) {
    const { data, error } = await supabaseClient
        .from(CATEGORY_TABLE)
        .update({
            is_active: isActive
        })
        .eq("id", categoryId)
        .select(`
            id,
            name,
            category_type,
            is_active,
            created_at
        `)
        .maybeSingle();

    if (error) {
        throw new Error(`Unable to update category: ${error.message}`);
    }

    if (!data) {
        throw new Error("Category not found, or you don't have permission to change it.");
    }

    return data;
}
