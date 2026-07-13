import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMySheets from "./tools/list-my-sheets";
import getSheet from "./tools/get-sheet";

// OAuth issuer must be the direct Supabase host. On publish, SUPABASE_URL is
// rewritten to a proxy that mcp-js rejects (RFC 8414 issuer mismatch). The
// project ref survives publish unchanged when inlined via import.meta.env.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tadeon-nexus-mcp",
  title: "Tadeon Nexus",
  version: "0.1.0",
  instructions:
    "Tools for Tadeon Nexus, a Portuguese-language RPG character-sheet manager. Use `get_my_profile` to inspect the caller, `list_my_sheets` to enumerate accessible character sheets, and `get_sheet` to read a full sheet by id.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMySheets, getSheet],
});
