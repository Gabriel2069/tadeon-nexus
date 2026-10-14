import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { ReadingPreferences } from "@/lib/knowledge/use-reading-preferences";
/** A stable pair of panels: changing view/orientation never replaces the editor subtree. */
export function KnowledgeReadingPanes({
  preferences,
  onChange,
  document,
  graph,
}: {
  preferences: ReadingPreferences;
  onChange: (patch: Partial<ReadingPreferences>) => void;
  document: ReactNode;
  graph: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const group = useRef<GroupImperativeHandle>(null);
  const [vertical, setVertical] = useState(false);
  const { view } = preferences;
  const percentage = vertical ? preferences.vertical : preferences.horizontal;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setVertical(entry.contentRect.width < 720));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const layout = {
    document: view === "graph" ? 0 : view === "document" ? 100 : percentage,
    graph: view === "graph" ? 100 : view === "document" ? 0 : 100 - percentage,
  };
  useEffect(() => {
    // Panel registration/constraint updates precede imperative mode changes.
    const frame = requestAnimationFrame(() => {
      const handle = group.current;
      if (handle && Object.keys(handle.getLayout()).length === 2)
        handle.setLayout({
          document: view === "graph" ? 0 : view === "document" ? 100 : percentage,
          graph: view === "graph" ? 100 : view === "document" ? 0 : 100 - percentage,
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [percentage, view, vertical]);
  return (
    <div
      ref={host}
      className="tadeon-nexus-reading__panes"
      data-reading-view={view}
      data-reading-axis={vertical ? "vertical" : "horizontal"}
    >
      <ResizablePanelGroup
        groupRef={group}
        defaultLayout={layout}
        orientation={vertical ? "vertical" : "horizontal"}
        resizeTargetMinimumSize={{ coarse: 44, fine: 12 }}
        disabled={view !== "split"}
        onLayoutChanged={(layout, meta) => {
          if (meta.isUserInteraction && view === "split")
            onChange(vertical ? { vertical: layout.document } : { horizontal: layout.document });
        }}
      >
        <ResizablePanel
          id="document"
          minSize={view === "split" ? (vertical ? "480px" : "280px") : 0}
          defaultSize="50%"
          className="tadeon-nexus-reading__pane"
          inert={view === "graph"}
          aria-hidden={view === "graph"}
        >
          <div hidden={view === "graph"}>{document}</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          hidden={view !== "split"}
          className="tadeon-nexus-reading__separator"
          data-reading-axis={vertical ? "vertical" : "horizontal"}
          aria-label="Ajustar espaço entre documento e grafo"
        />
        <ResizablePanel
          id="graph"
          minSize={view === "split" ? (vertical ? "480px" : "280px") : 0}
          defaultSize="50%"
          className="tadeon-nexus-reading__pane"
          inert={view === "document"}
          aria-hidden={view === "document"}
        >
          <div hidden={view === "document"}>{graph}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
