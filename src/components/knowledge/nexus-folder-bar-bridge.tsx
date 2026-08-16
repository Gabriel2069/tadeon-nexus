import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Folder, FolderOpen, LibraryBig } from "lucide-react";

type FolderDefinition = {
  id: "all" | "people" | "world" | "story" | "rules" | "items" | "archive";
  label: string;
  labels: readonly string[];
};

const FOLDERS = [
  { id: "all", label: "Tudo", labels: [] },
  {
    id: "people",
    label: "Pessoas",
    labels: ["Personagem", "NPC", "Criatura", "Povo", "Organização"],
  },
  {
    id: "world",
    label: "Mundo",
    labels: [
      "Reino",
      "Região",
      "Cidade",
      "Local",
      "Rio",
      "Mar",
      "Relevo",
      "Terreno",
      "Placa tectônica",
      "Cultura",
      "Religião",
      "Idioma",
    ],
  },
  {
    id: "story",
    label: "História",
    labels: ["Evento histórico", "Evento", "Trama", "Pista", "Sessão"],
  },
  {
    id: "rules",
    label: "Regras",
    labels: ["Regra", "Conceito"],
  },
  {
    id: "items",
    label: "Itens & poderes",
    labels: ["Fragmento", "Habilidade transcendental", "Habilidade", "Arma", "Objeto"],
  },
  {
    id: "archive",
    label: "Documentos",
    labels: ["Documento", "Mapa", "Campanha", "Nota livre"],
  },
] satisfies readonly FolderDefinition[];

type FolderId = FolderDefinition["id"];

function pageType(button: HTMLElement) {
  const metadata = button.querySelectorAll("span")[1]?.textContent ?? "";
  return metadata.split("·")[0]?.trim() ?? "";
}

function folderForType(type: string): FolderId {
  return FOLDERS.find(
    (folder) => folder.id !== "all" && folder.labels.includes(type),
  )?.id ?? "archive";
}

export function NexusFolderBarBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [folder, setFolder] = useState<FolderId>("all");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    let observer: MutationObserver | null = null;
    let timer = 0;

    const install = () => {
      if (!alive) return;
      const index = document.querySelector<HTMLElement>(".tadeon-nexus-index");
      const firstNode = index?.querySelector<HTMLElement>(".tadeon-nexus-index__node");
      const list = firstNode?.parentElement;
      if (!index || !list) {
        timer = window.setTimeout(install, 300);
        return;
      }

      let mount = index.querySelector<HTMLElement>("[data-nexus-folder-host]");
      if (!mount) {
        mount = document.createElement("div");
        mount.dataset.nexusFolderHost = "true";
        list.before(mount);
      }
      setHost(mount);

      observer?.disconnect();
      observer = new MutationObserver(() => setRevision((value) => value + 1));
      observer.observe(list, { childList: true, subtree: true, characterData: true });
    };

    install();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      observer?.disconnect();
      setHost(null);
    };
  }, []);

  const counts = useMemo(() => {
    void revision;
    const values = new Map<FolderId, number>(FOLDERS.map((entry) => [entry.id, 0]));
    const buttons = document.querySelectorAll<HTMLElement>(".tadeon-nexus-index__node");
    values.set("all", buttons.length);
    buttons.forEach((button) => {
      const id = folderForType(pageType(button));
      values.set(id, (values.get(id) ?? 0) + 1);
    });
    return values;
  }, [revision]);

  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLElement>(".tadeon-nexus-index__node");
    buttons.forEach((button) => {
      const hidden = folder !== "all" && folderForType(pageType(button)) !== folder;
      button.dataset.folderHidden = hidden ? "true" : "false";
      button.setAttribute("aria-hidden", hidden ? "true" : "false");
    });
  }, [folder, revision]);

  if (!host) return null;

  return createPortal(
    <nav className="tadeon-nexus-folderbar" aria-label="Pastas simples das páginas do Nexus">
      {FOLDERS.map((entry) => {
        const active = folder === entry.id;
        const Icon = entry.id === "all" ? LibraryBig : active ? FolderOpen : Folder;
        return (
          <button
            key={entry.id}
            type="button"
            aria-pressed={active}
            onClick={() => setFolder(entry.id)}
            title={`${entry.label} · ${counts.get(entry.id) ?? 0} página(s)`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{entry.label}</span>
            <small>{counts.get(entry.id) ?? 0}</small>
          </button>
        );
      })}
    </nav>,
    host,
  );
}
