import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_ROLES = ["mestre", "jogador", "espectador"] as const;
type ManagedRole = (typeof VALID_ROLES)[number];

interface ManagedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ManagedRole;
}

function validateUserId(d: unknown) {
  const value = d as { userId?: unknown };
  if (typeof value?.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.userId)) {
    throw new Error("Usuário inválido.");
  }
  return { userId: value.userId };
}

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: callerRoles, error: callerRoleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (callerRoleError || !(callerRoles ?? []).some((row) => row.role === "mestre")) {
      throw new Error("Apenas o Mestre pode gerenciar usuários.");
    }

    const { data, error } = await context.supabase.functions.invoke("admin-users", {
      body: { action: "list" },
    });
    if (error || !Array.isArray(data?.users)) {
      throw new Error("Não foi possível carregar os usuários.");
    }

    return { users: data.users as ManagedUser[] };
  });

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

    const { data: result, error } = await context.supabase.functions.invoke("admin-users", {
      body: { action: "delete", userId: data.userId },
    });
    if (error || result?.ok !== true) {
      throw new Error("Não foi possível excluir o usuário. Tente novamente.");
    }

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

    const { data: result, error } = await context.supabase.functions.invoke("admin-users", {
      body: { action: "change-role", userId: data.userId, role: data.role },
    });
    if (error || result?.ok !== true) {
      throw new Error("Não foi possível atualizar o cargo.");
    }

    return { ok: true };
  });
