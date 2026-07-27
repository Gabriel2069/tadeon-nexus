export const DEFAULT_SUPABASE_PROJECT_ID = "nkxpstyfrzufsnowjrdi";
export const DEFAULT_SUPABASE_URL = "https://nkxpstyfrzufsnowjrdi.supabase.co";
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TNGEtvRCuME_Kn00KwqkAw_BwdmxQRb";

export interface PublicSupabaseEnvironment {
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_PROJECT_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}

function firstConfigured(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function resolvePublicSupabaseConfig(environment: PublicSupabaseEnvironment = {}) {
  return {
    projectId:
      firstConfigured(environment.VITE_SUPABASE_PROJECT_ID, environment.SUPABASE_PROJECT_ID) ??
      DEFAULT_SUPABASE_PROJECT_ID,
    url:
      firstConfigured(environment.VITE_SUPABASE_URL, environment.SUPABASE_URL) ??
      DEFAULT_SUPABASE_URL,
    publishableKey:
      firstConfigured(
        environment.VITE_SUPABASE_PUBLISHABLE_KEY,
        environment.SUPABASE_PUBLISHABLE_KEY,
      ) ?? DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}
