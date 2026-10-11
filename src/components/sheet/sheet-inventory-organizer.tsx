import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Boxes, Loader2, PackagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface RpcResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<unknown>>;
}

interface InventoryEntry {
  id?: string;
  nome?: string;
  descricao?: string;
  espaco?: number;
}

interface InventoryContainer {
  id: string;
  name: string;
  parent_id: string | null;
}

interface InventoryPlacement {
  item_id: string;
  container_id: string | null;
}

interface InventoryOrganization {
  items: InventoryEntry[];
  containers: InventoryContainer[];
  placements: InventoryPlacement[];
}

function rpcClient() {
  return supabase as unknown as RpcClient;
}

function normalizeOrganization(value: unknown): InventoryOrganization {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    items: Array.isArray(source.items) ? (source.items as InventoryEntry[]) : [],
    containers: Array.isArray(source.containers) ? (source.containers as InventoryContainer[]) : [],
    placements: Array.isArray(source.placements) ? (source.placements as InventoryPlacement[]) : [],
  };
}

export function SheetInventoryOrganizer({
  sheetId,
  canEdit,
}: {
  sheetId: string;
  canEdit: boolean;
}) {
  const active = useRef(true);
  const readVersion = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<InventoryOrganization>({
    items: [],
    containers: [],
    placements: [],
  });
  const [newName, setNewName] = useState("");
  const [parentId, setParentId] = useState("");

  const load = useCallback(async () => {
    if (!sheetId) return;
    const version = ++readVersion.current;
    setLoading(true);
    const result = await rpcClient().rpc("get_sheet_inventory_organization", {
      p_sheet_id: sheetId,
    });
    if (!active.current || version !== readVersion.current) return;
    setLoading(false);
    if (!active.current) return;
    if (result.error) {
      toast.error("Não foi possível carregar a organização do inventário.");
      return;
    }
    setOrganization(normalizeOrganization(result.data));
  }, [sheetId]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const containerPaths = useMemo(() => {
    const byId = new Map(organization.containers.map((container) => [container.id, container]));
    const resolve = (container: InventoryContainer, seen = new Set<string>()): string => {
      if (!container.parent_id || seen.has(container.id)) return container.name;
      seen.add(container.id);
      const parent = byId.get(container.parent_id);
      return parent ? `${resolve(parent, seen)} / ${container.name}` : container.name;
    };
    return new Map(organization.containers.map((container) => [container.id, resolve(container)]));
  }, [organization.containers]);

  const placementByItem = useMemo(
    () =>
      new Map(
        organization.placements.map((placement) => [placement.item_id, placement.container_id]),
      ),
    [organization.placements],
  );

  const createContainer = async () => {
    if (!canEdit || !sheetId || !newName.trim()) return;
    const result = await rpcClient().rpc("create_sheet_inventory_container", {
      p_sheet_id: sheetId,
      p_name: newName.trim(),
      p_parent_id: parentId || null,
    });
    if (!active.current) return;
    if (result.error) {
      toast.error("Não foi possível criar o recipiente.");
      return;
    }
    setNewName("");
    setParentId("");
    await load();
  };

  const placeItem = async (itemId: string, containerId: string) => {
    if (!canEdit || !sheetId) return;
    const result = await rpcClient().rpc("place_sheet_inventory_item", {
      p_sheet_id: sheetId,
      p_item_id: itemId,
      p_container_id: containerId || null,
    });
    if (!active.current) return;
    if (result.error) {
      toast.error("Não foi possível mover o item.");
      return;
    }
    setOrganization((current) => ({
      ...current,
      placements: [
        ...current.placements.filter((placement) => placement.item_id !== itemId),
        ...(containerId ? [{ item_id: itemId, container_id: containerId }] : []),
      ],
    }));
  };

  const deleteContainer = async (containerId: string) => {
    if (!canEdit || !sheetId) return;
    const result = await rpcClient().rpc("delete_sheet_inventory_container", {
      p_container_id: containerId,
    });
    if (!active.current) return;
    if (result.error) {
      toast.error("Não foi possível remover o recipiente.");
      return;
    }
    await load();
  };

  if (!sheetId) return null;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="tadeon-inventory-organize-button gap-1.5"
        aria-label="Organizar inventário"
        onClick={() => setOpen(true)}
        title="Organizar itens em recipientes sem alterar os itens originais"
      >
        <Boxes className="h-3.5 w-3.5" />
        <span>Organizar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel">Organização do inventário</DialogTitle>
            <DialogDescription>
              Recipientes organizam onde cada item está sem modificar peso, descrição ou qualquer
              dado original. Recipientes também podem ficar dentro de outros recipientes.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando inventário...
            </div>
          ) : (
            <div className="space-y-5">
              {canEdit && (
                <section className="rounded-xl border border-border/70 bg-card/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <PackagePlus className="h-4 w-4 text-primary" />
                    <strong className="text-sm">Novo recipiente</strong>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      aria-label="Nome do recipiente"
                      placeholder="Mochila, caixa, bolso interno..."
                      maxLength={120}
                    />
                    <select
                      value={parentId}
                      onChange={(event) => setParentId(event.target.value)}
                      className="min-h-11 rounded-md border border-border bg-background px-3 text-sm"
                      aria-label="Recipiente pai"
                    >
                      <option value="">Sem recipiente pai</option>
                      {organization.containers.map((container) => (
                        <option key={container.id} value={container.id}>
                          {containerPaths.get(container.id) ?? container.name}
                        </option>
                      ))}
                    </select>
                    <Button onClick={() => void createContainer()} disabled={!newName.trim()}>
                      Criar
                    </Button>
                  </div>
                </section>
              )}
              {organization.containers.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recipientes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {organization.containers.map((container) => (
                      <span key={container.id} className="tadeon-inventory-container-chip">
                        <Boxes aria-hidden="true" />
                        {containerPaths.get(container.id) ?? container.name}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => void deleteContainer(container.id)}
                          aria-label={`Remover ${container.name}`}
                          title={`Remover ${container.name}; os itens permanecem no inventário`}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Itens
                </h3>
                {organization.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Não há itens para organizar ainda.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {organization.items.map((item, index) => {
                      const itemId = item.id || `legacy-item-${index}`;
                      return (
                        <div key={itemId} className="tadeon-inventory-placement-row">
                          <div className="min-w-0">
                            <strong>{item.nome?.trim() || `Item ${index + 1}`}</strong>
                            <small>
                              {Number(item.espaco) || 0} espaço
                              {item.descricao?.trim() ? ` · ${item.descricao.trim()}` : ""}
                            </small>
                          </div>
                          <select
                            value={placementByItem.get(itemId) ?? ""}
                            onChange={(event) => void placeItem(itemId, event.target.value)}
                            disabled={!canEdit}
                            aria-label={`Recipiente de ${item.nome || `Item ${index + 1}`}`}
                          >
                            <option value="">Sem recipiente</option>
                            {organization.containers.map((container) => (
                              <option key={container.id} value={container.id}>
                                {containerPaths.get(container.id) ?? container.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
