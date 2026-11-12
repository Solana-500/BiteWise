import { supabaseClient } from "../supabase-client.js";
 
 
// Anyone not admin is signed out
export async function getAdminSession() {
 
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();
 
    if (userError || !user) {
        return null;
    }
 
    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("full_name, app_role")
        .eq("id", user.id)
        .single();
 
    if (profileError || !profile || profile.app_role !== "admin") {
        await supabaseClient.auth.signOut();
        return null;
    }
 
    return { user, profile };
}
 
 
export async function signOutAdmin() {
 
    const { error } = await supabaseClient.auth.signOut();
 
    if (error) throw error;
}