import type { TabletopEntitySeed } from "./types";

export const TADEON_UNIFIED_DRAG_MIME = "application/x-tadeon-unified-item";

export type TadeonUnifiedItem =
  | {
      kind: "asset";
      assetId: string;
      assetUrl?: string;
      label: string;
      mimeType?: string;
      entityType?: TabletopEntitySeed["type"];
      linkedKnowledgeNodeId?: string | null;
      linkedSheetId?: string | null;
    }
  | {
      kind: "knowledge";
      nodeId: string;
      label: string;
      coverAssetId?: string | null;
      linkedSheetId?: string | null;
    }
  | {
      kind: "sheet";
      sheetId: string;
      label: string;
      portraitAssetId?: string | null;
      linkedKnowledgeNodeId?: string | null;
    };

export function encodeTadeonUnifiedItem(item: TadeonUnifiedItem) {
  return JSON.stringify({ version: 1, ...item });
}

export function decodeTadeonUnifiedItem(value: string): TadeonUnifiedItem | null {
  try {
    const source = JSON.parse(value) as Record<string, unknown>;
    if (source.kind === "asset" && typeof source.assetId === "string" && typeof source.label === "string") {
      return {
        kind: "asset",
        assetId: source.assetId,
        assetUrl: typeof source.assetUrl === "string" ? source.assetUrl : undefined,
        label: source.label,
        mimeType: typeof source.mimeType === "string" ? source.mimeType : undefined,
        entityType: typeof source.entityType === "string" ? source.entityType as TabletopEntitySeed["type"] : undefined,
        linkedKnowledgeNodeId: typeof source.linkedKnowledgeNodeId === "string" ? source.linkedKnowledgeNodeId : null,
        linkedSheetId: typeof source.linkedSheetId === "string" ? source.linkedSheetId : null,
      };
    }
    if (source.kind === "knowledge" && typeof source.nodeId === "string" && typeof source.label === "string") {
      return {
        kind: "knowledge",
        nodeId: source.nodeId,
        label: source.label,
        coverAssetId: typeof source.coverAssetId === "string" ? source.coverAssetId : null,
        linkedSheetId: typeof source.linkedSheetId === "string" ? source.linkedSheetId : null,
      };
    }
    if (source.kind === "sheet" && typeof source.sheetId === "string" && typeof source.label === "string") {
      return {
        kind: "sheet",
        sheetId: source.sheetId,
        label: source.label,
        portraitAssetId: typeof source.portraitAssetId === "string" ? source.portraitAssetId : null,
        linkedKnowledgeNodeId: typeof source.linkedKnowledgeNodeId === "string" ? source.linkedKnowledgeNodeId : null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function unifiedItemToEntitySeed(item: TadeonUnifiedItem): TabletopEntitySeed {
  if (item.kind === "sheet") {
    return {
      type: "character",
      label: item.label,
      assetId: item.portraitAssetId,
      linkedSheetId: item.sheetId,
      linkedKnowledgeNodeId: item.linkedKnowledgeNodeId,
    };
  }
  if (item.kind === "knowledge") {
    return {
      type: "object",
      label: item.label,
      assetId: item.coverAssetId,
      linkedSheetId: item.linkedSheetId,
      linkedKnowledgeNodeId: item.nodeId,
    };
  }
  return {
    type: item.entityType ?? "object",
    label: item.label,
    assetId: item.assetId,
    assetUrl: item.assetUrl,
    linkedKnowledgeNodeId: item.linkedKnowledgeNodeId,
    linkedSheetId: item.linkedSheetId,
    properties: item.mimeType ? { mime_type: item.mimeType } : undefined,
  };
}
