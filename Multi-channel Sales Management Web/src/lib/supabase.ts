import { createClient } from "@supabase/supabase-js";

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Supabase / Backend database client configuration
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);


