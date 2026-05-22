import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteUserFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const v = d as { userId?: string };
    if (!v?.userId || typeof v.userId !== "string") throw new Error("userId é obrigatório");
    return { userId: v.userId };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const callerId = context.userId;

    const { data: callerRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isMestre = (callerRoles ?? []).some((r: { role: string }) => r.role === "mestre");
    if (!isMestre) throw new Error("Apenas o Mestre pode excluir usuários.");

    if (data.userId === callerId) {
      throw new Error("Você não pode excluir sua própria conta por aqui.");
    }

    await supabaseAdmin.from("character_sheets").delete().eq("owner_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });
