import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/nexus-contracts";

export type { AppRole } from "@/lib/nexus-contracts";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  authIssue: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PROFILE_RETRY_DELAYS = [0, 350, 900];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const hydrationRequest = useRef(0);
  const hydratedUserId = useRef<string | null>(null);

  const loadProfileAndRole = useCallback(async (userId: string) => {
    let lastFailure: unknown;

    for (const delay of PROFILE_RETRY_DELAYS) {
      if (delay) await wait(delay);

      const [profileResult, roleResult] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      if (
        !profileResult.error &&
        !roleResult.error &&
        profileResult.data &&
        roleResult.data?.role
      ) {
        return {
          profile: profileResult.data as Profile,
          role: roleResult.data.role as AppRole,
        };
      }

      lastFailure = profileResult.error ?? roleResult.error ?? new Error("Perfil incompleto");
    }

    throw lastFailure;
  }, []);

  const hydrateSession = useCallback(
    async (newSession: Session) => {
      const requestId = ++hydrationRequest.current;
      setSession(newSession);
      setLoading(true);
      setAuthIssue(null);

      try {
        const hydrated = await loadProfileAndRole(newSession.user.id);
        if (requestId !== hydrationRequest.current) return;

        setProfile(hydrated.profile);
        setRole(hydrated.role);
        hydratedUserId.current = newSession.user.id;
      } catch (error) {
        if (requestId !== hydrationRequest.current) return;

        const errorCode =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "unknown")
            : "unknown";
        console.error(`[Auth] Falha ao carregar perfil e cargo (${errorCode}).`);
        setProfile(null);
        setRole(null);
        hydratedUserId.current = null;
        setAuthIssue(
          "Sua sessão foi reconhecida, mas o perfil não pôde ser carregado. Verifique a conexão e tente novamente.",
        );
      } finally {
        if (requestId === hydrationRequest.current) setLoading(false);
      }
    },
    [loadProfileAndRole],
  );

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession) {
        hydrationRequest.current += 1;
        hydratedUserId.current = null;
        setSession(null);
        setProfile(null);
        setRole(null);
        setAuthIssue(null);
        setLoading(false);
        return;
      }

      setSession(newSession);

      const needsHydration =
        event === "INITIAL_SESSION" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && hydratedUserId.current !== newSession.user.id);

      if (!needsHydration) {
        setLoading(false);
        return;
      }

      // Supabase recommends deferring additional API calls outside this callback.
      setTimeout(() => {
        void hydrateSession(newSession);
      }, 0);
    });

    return () => {
      hydrationRequest.current += 1;
      sub.subscription.unsubscribe();
    };
  }, [hydrateSession]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refresh = async () => {
    if (session) await hydrateSession(session);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        loading,
        authIssue,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
