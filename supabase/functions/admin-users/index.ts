import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

const VALID_ROLES = new Set(["mestre", "jogador", "espectador"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond({ error: "Método não permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-users] Supabase server secrets are unavailable.");
    return respond({ error: "Serviço administrativo indisponível." }, 503);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return respond({ error: "Sessão inválida." }, 401);
  }

  const token = authorization.slice("Bearer ".length);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) {
    return respond({ error: "Sessão inválida." }, 401);
  }

  const { data: callerRole, error: callerRoleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (callerRoleError || callerRole?.role !== "mestre") {
    return respond({ error: "Apenas o Mestre pode gerenciar usuários." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Solicitação inválida." }, 400);
  }

  if (payload.action === "list") {
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
      await Promise.all([
        admin.from("profiles").select("id,email,full_name").order("full_name"),
        admin.from("user_roles").select("user_id,role"),
      ]);

    if (profilesError || rolesError) {
      console.error("[admin-users] Could not load profiles or roles.");
      return respond({ error: "Não foi possível carregar os usuários." }, 500);
    }

    const roleByUser = new Map((roles ?? []).map((item) => [item.user_id, item.role]));
    const users = (profiles ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: roleByUser.get(profile.id) ?? "jogador",
    }));

    return respond({ users });
  }

  const userId = typeof payload.userId === "string" ? payload.userId : "";
  if (!UUID_PATTERN.test(userId)) {
    return respond({ error: "Usuário inválido." }, 400);
  }
  if (userId === user.id) {
    return respond({ error: "Você não pode alterar ou excluir a própria conta." }, 400);
  }

  if (payload.action === "change-role") {
    const role = typeof payload.role === "string" ? payload.role : "";
    if (!VALID_ROLES.has(role)) {
      return respond({ error: "Cargo inválido." }, 400);
    }

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (targetError || !target) {
      return respond({ error: "Usuário não encontrado." }, 404);
    }

    const { error } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id" });
    if (error) {
      console.error("[admin-users] Could not update the requested role.");
      return respond({ error: "Não foi possível atualizar o cargo." }, 500);
    }

    return respond({ ok: true });
  }

  if (payload.action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[admin-users] Could not delete the requested user.");
      return respond({ error: "Não foi possível excluir o usuário." }, 500);
    }

    return respond({ ok: true });
  }

  return respond({ error: "Ação inválida." }, 400);
});
