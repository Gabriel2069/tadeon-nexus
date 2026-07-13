import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_sheet",
  title: "Get character sheet",
  description: "Returns the full character sheet (attributes, abilities, inventory, conditions, notes) for the given sheet id, subject to the caller's access.",
  inputSchema: {
    sheet_id: z.string().uuid().describe("UUID of the character sheet to fetch."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ sheet_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("character_sheets")
      .select("*")
      .eq("id", sheet_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Sheet not found or access denied." }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { sheet: data } };
  },
});
