import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VALID_ROLES = ["mestre", "jogador", "espectador"] as const;
type ManagedRole = (typeof VALID_ROLES)[number];

function validateUserId(d: unknown) {
  const value = d as { userId?: unknown };
  if (typeof value?.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.userId)) {
    throw new Error("Usuário inválido.");
  }
  return { userId: value.userId };
}

export const deleteUserFn = createServerFn({ method: "POST" })
  .validator(validateUserId)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const callerId = context.userId;
    const { data: callerRoles, error: callerRoleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (callerRoleError || !(callerRoles ?? []).some((row) => row.role === "mestre")) {
      throw new Error("Apenas o Mestre pode gerenciar usuários.");
    }

    if (data.userId === callerId) {
      throw new Error("Você não pode excluir sua própria conta por aqui.");
    }

    // All dependent rows use ON DELETE CASCADE. Deleting the auth user first keeps
    // the operation atomic from the application's point of view: if it fails,
    // profile, role and character sheets remain untouched.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authErr) throw new Error("Não foi possível excluir o usuário. Tente novamente.");

    return { ok: true };
  });

export const changeUserRoleFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const value = d as { userId?: unknown; role?: unknown };
    const { userId } = validateUserId(value);
    if (typeof value.role !== "string" || !VALID_ROLES.includes(value.role as ManagedRole)) {
      throw new Error("Cargo inválido.");
    }
    return { userId, role: value.role as ManagedRole };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: callerRoles, error: callerRoleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (callerRoleError || !(callerRoles ?? []).some((row) => row.role === "mestre")) {
      throw new Error("Apenas o Mestre pode gerenciar usuários.");
    }

    if (data.userId === context.userId) {
      throw new Error("Você não pode alterar o próprio cargo.");
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError || !target) throw new Error("Usuário não encontrado.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id" });
    if (error) throw new Error("Não foi possível atualizar o cargo.");

    return { ok: true };
  });
