/** Visible names shared by navigation, search, headings and browser metadata. URLs stay stable. */
export const UTILITY_AREAS = {
  offline: { label: "Consulta offline", to: "/offline" },
  users: { label: "Usuários", to: "/manage-users" },
  backup: { label: "Backup e diagnóstico", to: "/nexus-tools" },
} as const;
