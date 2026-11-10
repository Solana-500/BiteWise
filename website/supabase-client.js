const SUPABASE_URL =
    "https://xxazvbjvwuvklroialwe.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_-mB23YADvK8aLerxzfYjyQ_OldSllfi";

export const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);