import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { PopupGallery } from "@/components/visual-audit/popup-gallery";
import { ResponsiveAuditLab } from "@/components/visual-audit/responsive-audit-lab";

export const Route = createFileRoute("/visual-audit" as never)({
  head: () => ({
    meta: [
      { title: "Auditoria visual · Tadeon Nexus" },
      { name: "description", content: "Laboratório interno de responsividade do Tadeon Nexus." },
    ],
  }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <VisualAuditPage />
    </ProtectedShell>
  ),
});

function VisualAuditPage() {
  const href = useRouterState({ select: (state) => state.location.href });
  return href.includes("gallery=1") ? <PopupGallery /> : <ResponsiveAuditLab />;
}
