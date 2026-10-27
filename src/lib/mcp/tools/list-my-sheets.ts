import { constitution, tdv2CharacterSchema } from "@/lib/tdv2";
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_sheets",
  title: "List my character sheets",
  description:
    "Lists character sheets the signed-in user can access in Tadeon Nexus. Returns identity, rules edition and its progress (Desenvolvimento in TdV II, Exposição in the previous edition).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("character_sheets")
      .select("id,name,owner_id,updated_at,rules_version,exposure,tdv2_data")
      .order("updated_at", { ascending: false });
    if (error)
      return { content: [{ type: "text", text: "Failed to load sheets." }], isError: true };

    const sheets = (data ?? []).map((row) => {
      const base = {
        id: row.id,
        name: row.name,
        owner_id: row.owner_id,
        updated_at: row.updated_at,
        rules_version: row.rules_version ?? 1,
      };
      if (row.rules_version !== 2) return { ...base, exposure: row.exposure };
      const parsed = tdv2CharacterSchema.safeParse(row.tdv2_data);
      if (!parsed.success) return { ...base, requires_review: true };
      try {
        return { ...base, development: constitution(parsed.data).development };
      } catch {
        return { ...base, requires_review: true };
      }
    });
    return {
      content: [{ type: "text", text: JSON.stringify(sheets) }],
      structuredContent: { sheets },
    };
  },
});
