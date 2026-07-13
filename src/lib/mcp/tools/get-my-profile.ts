import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Returns the signed-in user's Tadeon Nexus profile (name, email) and current role (mestre / jogador / espectador).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile, error: pErr }, { data: role, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name").eq("id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!).maybeSingle(),
    ]);
    if (pErr || rErr) {
      return { content: [{ type: "text", text: (pErr ?? rErr)!.message }], isError: true };
    }
    const result = { profile, role: role?.role ?? null };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
