from pathlib import Path


def patch(path_name: str, replacements: list[tuple[str, str, str]]) -> None:
    path = Path(path_name)
    text = path.read_text(encoding="utf-8")
    for old, new, label in replacements:
        count = text.count(old)
        if count != 1:
            raise RuntimeError(f"{path_name} / {label}: expected 1 occurrence, got {count}")
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")


patch(
    "src/components/ui/button.tsx",
    [
        (
            'import "@/styles/interaction-polish.css";\n',
            'import "@/styles/interaction-polish.css";\nimport "@/styles/viewport-fit-final.css";\n',
            "global viewport stylesheet",
        ),
    ],
)

patch(
    "src/components/sheet/sheet-experience-bridge.tsx",
    [
        (
            'import { useAuth } from "@/lib/auth";\n',
            'import { useAuth } from "@/lib/auth";\nimport "@/styles/sheet-individual-fit-final.css";\n',
            "individual sheet stylesheet",
        ),
        (
            '''  const [mode, setMode] = useState<"edit" | "game">(() => {\n    if (!sheetId || typeof window === "undefined") return "edit";\n    if (queryMode() === "game" || embedded) return "game";\n    return window.sessionStorage.getItem(`tadeon-sheet-mode:${sheetId}`) === "game" ? "game" : "edit";\n  });''',
            '''  const [mode, setMode] = useState<"edit" | "game">(() => {\n    if (!sheetId || typeof window === "undefined") return "game";\n    if (embedded || queryMode() === "game") return "game";\n    if (queryMode() === "edit") return "edit";\n    const stored = window.sessionStorage.getItem(`tadeon-sheet-mode:${sheetId}`);\n    return stored === "edit" ? "edit" : "game";\n  });''',
            "game mode default",
        ),
    ],
)

patch(
    "src/components/ui/select.tsx",
    [
        (
            '>(({ className, children, position = "popper", ...props }, ref) => (',
            '>(({ className, children, position = "popper", collisionPadding = 12, sideOffset = 6, ...props }, ref) => (',
            "select collision defaults",
        ),
        (
            '      data-slot="select-content"\n      className={cn(',
            '      data-slot="select-content"\n      collisionPadding={collisionPadding}\n      sideOffset={sideOffset}\n      className={cn(',
            "select collision props",
        ),
        (
            '"relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden',
            '"relative z-50 max-h-[min(36rem,var(--radix-select-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[8rem] overflow-y-auto overflow-x-hidden overscroll-contain',
            "select viewport class",
        ),
        (
            '"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",',
            '"min-h-[var(--radix-select-trigger-height)] w-full min-w-[min(var(--radix-select-trigger-width),calc(100vw-1.5rem))]",',
            "select viewport sizing",
        ),
    ],
)

patch(
    "src/components/ui/dropdown-menu.tsx",
    [
        (
            '>(({ className, ...props }, ref) => (\n  <DropdownMenuPrimitive.SubContent',
            '>(({ className, collisionPadding = 12, ...props }, ref) => (\n  <DropdownMenuPrimitive.SubContent',
            "dropdown sub collision defaults",
        ),
        (
            '    data-slot="dropdown-menu-sub-content"\n    className={cn(',
            '    data-slot="dropdown-menu-sub-content"\n    collisionPadding={collisionPadding}\n    className={cn(',
            "dropdown sub collision prop",
        ),
        (
            '"z-50 min-w-[10rem] overflow-hidden rounded-xl',
            '"z-50 max-h-[min(36rem,var(--radix-dropdown-menu-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[10rem] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl',
            "dropdown sub containment",
        ),
        (
            '>(({ className, sideOffset = 6, ...props }, ref) => (',
            '>(({ className, sideOffset = 6, collisionPadding = 12, ...props }, ref) => (',
            "dropdown collision defaults",
        ),
        (
            '      sideOffset={sideOffset}\n      className={cn(',
            '      sideOffset={sideOffset}\n      collisionPadding={collisionPadding}\n      className={cn(',
            "dropdown collision prop",
        ),
        (
            '"z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[10rem] overflow-y-auto overflow-x-hidden',
            '"z-50 max-h-[min(36rem,var(--radix-dropdown-menu-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[10rem] overflow-y-auto overflow-x-hidden overscroll-contain',
            "dropdown containment",
        ),
    ],
)

patch(
    "src/components/ui/context-menu.tsx",
    [
        (
            '>(({ className, ...props }, ref) => (\n  <ContextMenuPrimitive.SubContent',
            '>(({ className, collisionPadding = 12, ...props }, ref) => (\n  <ContextMenuPrimitive.SubContent',
            "context sub collision defaults",
        ),
        (
            '    data-slot="context-menu-sub-content"\n    className={cn(',
            '    data-slot="context-menu-sub-content"\n    collisionPadding={collisionPadding}\n    className={cn(',
            "context sub collision prop",
        ),
        (
            '"z-50 min-w-[10rem] overflow-hidden rounded-xl',
            '"z-50 max-h-[min(36rem,var(--radix-context-menu-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[10rem] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl',
            "context sub containment",
        ),
        (
            '>(({ className, ...props }, ref) => (\n  <ContextMenuPrimitive.Portal>',
            '>(({ className, collisionPadding = 12, ...props }, ref) => (\n  <ContextMenuPrimitive.Portal>',
            "context collision defaults",
        ),
        (
            '      data-slot="context-menu-content"\n      className={cn(',
            '      data-slot="context-menu-content"\n      collisionPadding={collisionPadding}\n      className={cn(',
            "context collision prop",
        ),
        (
            '"z-50 max-h-(--radix-context-menu-content-available-height) min-w-[10rem] overflow-y-auto overflow-x-hidden',
            '"z-50 max-h-[min(36rem,var(--radix-context-menu-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[10rem] overflow-y-auto overflow-x-hidden overscroll-contain',
            "context containment",
        ),
    ],
)

patch(
    "src/components/ui/hover-card.tsx",
    [
        (
            '>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (\n  <HoverCardPrimitive.Content',
            '>(({ className, align = "center", sideOffset = 6, collisionPadding = 12, ...props }, ref) => (\n  <HoverCardPrimitive.Portal>\n  <HoverCardPrimitive.Content',
            "hover portal and collision",
        ),
        (
            '    sideOffset={sideOffset}\n    className={cn(',
            '    sideOffset={sideOffset}\n    collisionPadding={collisionPadding}\n    className={cn(',
            "hover collision prop",
        ),
        (
            '"z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl',
            '"z-50 max-h-[min(36rem,var(--radix-hover-card-content-available-height))] w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl',
            "hover containment",
        ),
        (
            '    {...props}\n  />\n));\nHoverCardContent.displayName',
            '    {...props}\n  />\n  </HoverCardPrimitive.Portal>\n));\nHoverCardContent.displayName',
            "hover portal close",
        ),
    ],
)

patch(
    "src/routes/master-panel.tsx",
    [
        (
            '  const [assetsEnabled, setAssetsEnabled] = useState(false);\n',
            '''  const [assetsEnabled, setAssetsEnabled] = useState(false);\n  const [activeTab, setActiveTab] = useState<MasterTab>(() => {\n    if (search.tab) return search.tab;\n    if (typeof window === "undefined") return "dashboard";\n    const stored = window.sessionStorage.getItem("tadeon-master-active-tab");\n    return MASTER_TAB_VALUES.includes(stored as MasterTab)\n      ? (stored as MasterTab)\n      : "dashboard";\n  });\n''',
            "master persistent active tab",
        ),
        (
            '''  const openMasterTab = (tab: MasterTab) =>\n    void navigate({\n      to: "/master-panel",\n      search: { tab: tab === "dashboard" ? undefined : tab },\n    });''',
            '''  const selectMasterTab = (tab: MasterTab) => {\n    setActiveTab(tab);\n    if (typeof window === "undefined") return;\n    window.sessionStorage.setItem("tadeon-master-active-tab", tab);\n    const url = new URL(window.location.href);\n    if (tab === "dashboard") url.searchParams.delete("tab");\n    else url.searchParams.set("tab", tab);\n    window.history.replaceState(\n      window.history.state,\n      "",\n      `${url.pathname}${url.search}${url.hash}`,\n    );\n  };\n\n  const openMasterTab = (tab: MasterTab) => selectMasterTab(tab);''',
            "master local tab navigation",
        ),
        (
            '''        value={\n          search.tab === "assets" && !assetsEnabled ? "dashboard" : (search.tab ?? "dashboard")\n        }\n        onValueChange={(value) =>\n          void navigate({\n            to: "/master-panel",\n            search: {\n              tab: value === "dashboard" ? undefined : (value as MasterTab),\n            },\n            replace: true,\n          })\n        }''',
            '''        value={activeTab === "assets" && !assetsEnabled ? "dashboard" : activeTab}\n        onValueChange={(value) => selectMasterTab(value as MasterTab)}''',
            "master tabs no route remount",
        ),
    ],
)

patch(
    "src/components/knowledge/nexus-workspace.tsx",
    [
        (
            '  Unlink,\n  X,\n} from "lucide-react";',
            '  Unlink,\n  Trash2,\n  X,\n} from "lucide-react";',
            "nexus trash icon",
        ),
        (
            '''import { Input } from "@/components/ui/input";''',
            '''import {\n  AlertDialog,\n  AlertDialogAction,\n  AlertDialogCancel,\n  AlertDialogContent,\n  AlertDialogDescription,\n  AlertDialogFooter,\n  AlertDialogHeader,\n  AlertDialogTitle,\n} from "@/components/ui/alert-dialog";\nimport { Input } from "@/components/ui/input";''',
            "nexus delete dialog imports",
        ),
        (
            '  const [portabilityOpen, setPortabilityOpen] = useState(false);\n',
            '  const [portabilityOpen, setPortabilityOpen] = useState(false);\n  const [deleteOpen, setDeleteOpen] = useState(false);\n  const [deleting, setDeleting] = useState(false);\n',
            "nexus delete state",
        ),
        (
            '''              <Button\n                variant="ghost"\n                size="sm"\n                className="w-full justify-start text-muted-foreground"\n                onClick={async () => {\n                  try {\n                    const archived = await knowledgeService.archive(selected);\n                    await openNode(archived.node);\n                    toast.success("Página arquivada.");\n                  } catch (error) {\n                    toast.error(errorMessage(error));\n                  }\n                }}\n              >\n                <Archive className="h-4 w-4" />\n                Arquivar página\n              </Button>''',
            '''              <Button\n                variant="ghost"\n                size="sm"\n                className="w-full justify-start text-muted-foreground"\n                onClick={async () => {\n                  try {\n                    const archived = await knowledgeService.archive(selected);\n                    await openNode(archived.node);\n                    toast.success("Página arquivada.");\n                  } catch (error) {\n                    toast.error(errorMessage(error));\n                  }\n                }}\n              >\n                <Archive className="h-4 w-4" />\n                Arquivar página\n              </Button>\n              <Button\n                variant="ghost"\n                size="sm"\n                className="w-full justify-start text-destructive hover:text-destructive"\n                onClick={() => setDeleteOpen(true)}\n              >\n                <Trash2 className="h-4 w-4" />\n                Excluir página\n              </Button>''',
            "nexus visible delete action",
        ),
        (
            '''      <Dialog open={graphOpen} onOpenChange={setGraphOpen}>''',
            '''      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>\n        <AlertDialogContent>\n          <AlertDialogHeader>\n            <AlertDialogTitle>Excluir {selected?.title ?? "esta página"}?</AlertDialogTitle>\n            <AlertDialogDescription>\n              A página sairá do Nexus ativo. Relações e histórico permanecem preservados para recuperação administrativa.\n            </AlertDialogDescription>\n          </AlertDialogHeader>\n          <AlertDialogFooter>\n            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>\n            <AlertDialogAction\n              disabled={deleting || !selected}\n              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"\n              onClick={(event) => {\n                event.preventDefault();\n                if (!selected || deleting) return;\n                const target = selected;\n                setDeleting(true);\n                void knowledgeService\n                  .softDelete(target)\n                  .then(async () => {\n                    setNodes((current) => current.filter((node) => node.id !== target.id));\n                    setRecent((current) => current.filter((node) => node.id !== target.id));\n                    setFavorites((current) => current.filter((node) => node.id !== target.id));\n                    setOpenNodes((current) => current.filter((node) => node.id !== target.id));\n                    setSelected(null);\n                    setDeleteOpen(false);\n                    toast.success("Página excluída do Nexus.");\n                    await loadNodes();\n                  })\n                  .catch((error) => toast.error(errorMessage(error)))\n                  .finally(() => setDeleting(false));\n              }}\n            >\n              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}\n              Excluir\n            </AlertDialogAction>\n          </AlertDialogFooter>\n        </AlertDialogContent>\n      </AlertDialog>\n\n      <Dialog open={graphOpen} onOpenChange={setGraphOpen}>''',
            "nexus delete confirmation",
        ),
    ],
)

patch(
    "src/components/assets/asset-library-panel.tsx",
    [
        (
            '"Arquivo arquivado. O binário permanece protegido para recuperação.",',
            '"Arquivo excluído da biblioteca ativa. A recuperação continua disponível no catálogo.",',
            "asset delete toast",
        ),
        (
            '                        Arquivar\n',
            '                        Excluir arquivo\n',
            "asset menu delete label",
        ),
        (
            '              Arquivar {deleteAsset?.display_name}?',
            '              Excluir {deleteAsset?.display_name}?',
            "asset dialog title",
        ),
        (
            '              Arquivar\n            </AlertDialogAction>',
            '              Excluir\n            </AlertDialogAction>',
            "asset dialog action",
        ),
    ],
)

patch(
    "src/routes/tabletop.tsx",
    [
        (
            '  const { role } = useAuth();\n',
            '  const { role, user } = useAuth();\n',
            "tabletop auth user",
        ),
        (
            '''  useEffect(() => {\n    let active = true;\n    void loadFeatureFlags().then((nextFlags) => {\n      if (active) setFlags(nextFlags);\n    });\n    return () => {\n      active = false;\n    };\n  }, []);''',
            '''  useEffect(() => {\n    if (!user?.id) return;\n    let active = true;\n    void loadFeatureFlags(user.id).then((nextFlags) => {\n      if (active) setFlags(nextFlags);\n    });\n    return () => {\n      active = false;\n    };\n  }, [user?.id]);''',
            "tabletop feature flags without duplicate auth lookup",
        ),
    ],
)

print("runtime/UI/CRUD final patch applied")
