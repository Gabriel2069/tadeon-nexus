from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 occurrence, got {count}")
    return text.replace(old, new, 1)


# Participant service: all grids + secure movement RPC.
path = "src/lib/tabletop/tabletop-participant-service.ts"
text = read(path)
text = once(
    text,
    '    gridMode: z.enum(["square", "none"]),',
    '    gridMode: z.enum(["square", "hex_pointy", "hex_flat", "isometric", "none"]),',
    "participant grids",
)
text = once(
    text,
    '''  | "TABLETOP_PARTICIPANT_INVALID_RESPONSE"\n  | "TABLETOP_PARTICIPANT_UNAVAILABLE";''',
    '''  | "TABLETOP_PARTICIPANT_INVALID_RESPONSE"\n  | "TABLETOP_PARTICIPANT_MOVEMENT_BLOCKED"\n  | "TABLETOP_PARTICIPANT_UNAVAILABLE";''',
    "movement error code",
)
text = once(
    text,
    '''  async toggleDoor(sessionId: string, wallId: string, expectedVersion: number) {''',
    '''  async moveControlledEntity(\n    sessionId: string,\n    entityId: string,\n    points: Array<{ x: number; y: number }>,\n  ) {\n    if (\n      !uuidSchema.safeParse(sessionId).success ||\n      !uuidSchema.safeParse(entityId).success ||\n      points.length < 1 ||\n      points.length > 64 ||\n      points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))\n    ) {\n      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_INVALID_RESPONSE");\n    }\n    const { data, error } = await participantDatabase.rpc(\n      "move_tabletop_controlled_entity",\n      {\n        target_session_id: sessionId,\n        target_entity_id: entityId,\n        path_points: points,\n      },\n    );\n    if (error) {\n      if (error.code === "23514")\n        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_MOVEMENT_BLOCKED");\n      if (error.code === "42501")\n        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_FORBIDDEN");\n      if (error.code === "40001")\n        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_INVALID_RESPONSE");\n      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_UNAVAILABLE");\n    }\n    return z\n      .object({\n        entityId: uuidSchema,\n        x: finiteNumber,\n        y: finiteNumber,\n        centerX: finiteNumber,\n        centerY: finiteNumber,\n        version: z.number().int().positive(),\n      })\n      .strict()\n      .parse(data);\n  }\n\n  async toggleDoor(sessionId: string, wallId: string, expectedVersion: number) {''',
    "movement service method",
)
write(path, text)

# Realtime protocol: committed movement is distinct from drag preview.
path = "src/lib/tabletop/realtime-protocol.ts"
text = read(path)
anchor = '''  eventBaseSchema.extend({\n    type: z.literal("pointer.ping"),'''
insert = '''  eventBaseSchema.extend({\n    type: z.literal("token.move-commit"),\n    payload: z\n      .object({\n        entityId: uuidSchema,\n        x: coordinateSchema,\n        y: coordinateSchema,\n        version: z.number().int().positive(),\n      })\n      .strict(),\n  }),\n  eventBaseSchema.extend({\n    type: z.literal("pointer.ping"),'''
text = once(text, anchor, insert, "move commit protocol")
write(path, text)

# Realtime hook: helper for committed player movement.
path = "src/lib/tabletop/use-tabletop-realtime.ts"
text = read(path)
text = once(
    text,
    '''  broadcastDirectorState: (revision: number) => Promise<void>;\n  updatePresence: (presence: TabletopPresence) => Promise<void>;''',
    '''  broadcastDirectorState: (revision: number) => Promise<void>;\n  broadcastEntityMove: (payload: {\n    entityId: string;\n    x: number;\n    y: number;\n    version: number;\n  }) => Promise<void>;\n  updatePresence: (presence: TabletopPresence) => Promise<void>;''',
    "realtime result movement",
)
text = once(
    text,
    '''  const updatePresence = useCallback(async (nextPresence: TabletopPresence) => {''',
    '''  const broadcastEntityMove = useCallback(\n    async (payload: { entityId: string; x: number; y: number; version: number }) => {\n      const transport = transportRef.current;\n      if (!transport || !sceneId) {\n        throw new TabletopRealtimeTransportError(\n          "TABLETOP_REALTIME_NOT_CONNECTED",\n        );\n      }\n      sequenceRef.current += 1;\n      const sentAt = Date.now();\n      await transport.send({\n        protocol: 1,\n        eventId: `event_${sentAt.toString(36)}_${sequenceRef.current.toString(36)}`,\n        sourceId: sourceIdRef.current,\n        sceneId,\n        sequence: sequenceRef.current,\n        sentAt,\n        type: "token.move-commit",\n        payload,\n      });\n    },\n    [sceneId],\n  );\n\n  const updatePresence = useCallback(async (nextPresence: TabletopPresence) => {''',
    "broadcast move helper",
)
text = once(
    text,
    '''    broadcastStructureState,\n    broadcastDirectorState,\n    updatePresence,''',
    '''    broadcastStructureState,\n    broadcastDirectorState,\n    broadcastEntityMove,\n    updatePresence,''',
    "return move helper",
)
write(path, text)

# Master live session: receive authoritative movement commits.
path = "src/components/tabletop/tabletop-live-session.tsx"
text = read(path)
text = once(
    text,
    '''  getCurrentCamera,\n}: {''',
    '''  getCurrentCamera,\n  onRemoteEntityMove,\n}: {''',
    "live session prop destructure",
)
text = once(
    text,
    '''  getCurrentCamera?: () => TabletopDirectorCamera | null | undefined;\n}) {''',
    '''  getCurrentCamera?: () => TabletopDirectorCamera | null | undefined;\n  onRemoteEntityMove?: (payload: {\n    entityId: string;\n    x: number;\n    y: number;\n    version: number;\n  }) => void;\n}) {''',
    "live session prop type",
)
text = once(
    text,
    '''      if (event.type === "scene.transition") {\n        void refresh().catch(() => undefined);\n      }\n    },\n    [refresh],''',
    '''      if (event.type === "scene.transition") {\n        void refresh().catch(() => undefined);\n        return;\n      }\n      if (event.type === "token.move-commit") {\n        onRemoteEntityMove?.(event.payload);\n      }\n    },\n    [onRemoteEntityMove, refresh],''',
    "master movement handling",
)
write(path, text)

# Participant workspace: direct control without scene reload/focus jumps.
path = "src/components/tabletop/tabletop-participant-workspace.tsx"
text = read(path)
text = once(
    text,
    '''    case "TABLETOP_PARTICIPANT_INVALID_RESPONSE":\n      return "A cena recebida não passou pela validação de segurança.";''',
    '''    case "TABLETOP_PARTICIPANT_INVALID_RESPONSE":\n      return "A cena recebida não passou pela validação de segurança.";\n    case "TABLETOP_PARTICIPANT_MOVEMENT_BLOCKED":\n      return "O trajeto cruza uma barreira que bloqueia movimento.";''',
    "movement UI error",
)
text = once(
    text,
    '''  const broadcastStructureStateRef = useRef<\n    | ((payload: {\n        wallId: string;\n        wallType: "door_open" | "door_closed";\n        version: number;\n      }) => Promise<void>)\n    | null\n  >(null);''',
    '''  const broadcastStructureStateRef = useRef<\n    | ((payload: {\n        wallId: string;\n        wallType: "door_open" | "door_closed";\n        version: number;\n      }) => Promise<void>)\n    | null\n  >(null);\n  const broadcastEntityMoveRef = useRef<\n    | ((payload: {\n        entityId: string;\n        x: number;\n        y: number;\n        version: number;\n      }) => Promise<void>)\n    | null\n  >(null);''',
    "movement broadcast ref",
)
old_handler = '''      if (event.type === "structure.state") {\n        if (session) void loadView(session);\n        return;\n      }\n      if (event.type !== "token.drag-preview") return;\n      setView((current) => {\n        if (!current?.scene || current.scene.id !== event.sceneId)\n          return current;\n        return {\n          ...current,\n          scene: {\n            ...current.scene,\n            entities: current.scene.entities.map((entity) =>\n              entity.id === event.payload.entityId\n                ? { ...entity, x: event.payload.x, y: event.payload.y }\n                : entity,\n            ) as TabletopParticipantScene["entities"],\n          },\n        };\n      });'''
new_handler = '''      if (event.type === "structure.state") {\n        if (session) void loadView(session);\n        return;\n      }\n      if (event.type === "token.drag-preview" || event.type === "token.move-commit") {\n        engineRef.current?.applyRemoteEntityPatch(event.payload.entityId, {\n          x: event.payload.x,\n          y: event.payload.y,\n        });\n      }'''
text = once(text, old_handler, new_handler, "participant realtime movement")
text = once(
    text,
    '''            controlledTokenId: null,''',
    '''            controlledTokenId:\n              view.scene.entities.find((entity) => entity.controllable)?.id ?? null,''',
    "presence controlled token",
)
text = once(
    text,
    '''  useEffect(() => {\n    broadcastStructureStateRef.current = realtime.broadcastStructureState;\n  }, [realtime.broadcastStructureState]);\n\n  return (''',
    '''  useEffect(() => {\n    broadcastStructureStateRef.current = realtime.broadcastStructureState;\n    broadcastEntityMoveRef.current = realtime.broadcastEntityMove;\n  }, [realtime.broadcastEntityMove, realtime.broadcastStructureState]);\n\n  useEffect(() => {\n    const onMoveRequest = (event: Event) => {\n      const detail = (event as CustomEvent<{\n        entityId?: string;\n        points?: Array<{ x: number; y: number }>;\n      }>).detail;\n      const activeSession = sessionRef.current;\n      if (!activeSession || !detail?.entityId || !Array.isArray(detail.points)) return;\n      const entity = view?.scene?.entities.find((item) => item.id === detail.entityId);\n      if (!entity?.controllable) return;\n      void tabletopParticipantService\n        .moveControlledEntity(activeSession.id, entity.id, detail.points)\n        .then(async (result) => {\n          engineRef.current?.applyRemoteEntityPatch(result.entityId, {\n            x: result.x,\n            y: result.y,\n          });\n          try {\n            await broadcastEntityMoveRef.current?.({\n              entityId: result.entityId,\n              x: result.x,\n              y: result.y,\n              version: result.version,\n            });\n          } catch {\n            // A RPC é a fonte de verdade; o servidor continua consistente.\n          }\n        })\n        .catch((error) => {\n          toast.error(participantErrorMessage(error));\n          void loadViewRef.current?.(activeSession);\n        });\n    };\n    window.addEventListener("tadeon-tabletop-move-request", onMoveRequest);\n    return () => window.removeEventListener("tadeon-tabletop-move-request", onMoveRequest);\n  }, [view?.scene?.entities]);\n\n  return (''',
    "participant move listener",
)
write(path, text)

# Workspace: autosave updates persistence baseline without reloading/refitting the canvas.
path = "src/components/tabletop/tabletop-workspace.tsx"
text = read(path)
text = once(
    text,
    '''      installScene(saved);\n      await Promise.all([refreshScenes(saved.campaignId), loadSnapshots(saved.id)]);\n      if (!options.silent)''',
    '''      persistedSceneRef.current = saved;\n      setPersistedScene(saved);\n      setDirty(false);\n      setConflict(false);\n      engineRef.current?.setReadOnly(saved.status === "archived");\n      if (!options.silent)\n        await Promise.all([refreshScenes(saved.campaignId), loadSnapshots(saved.id)]);\n      if (!options.silent)''',
    "non disruptive save",
)
write(path, text)

# Grid snapping: use the actual lattice implementation for hex/isometric modes.
path = "src/lib/tabletop/tabletop-engine.ts"
text = read(path)
text = once(
    text,
    'import { GridRenderer } from "./grid-renderer";',
    'import { GridRenderer, snapPointToGrid } from "./grid-renderer";',
    "grid snap import",
)
text = once(
    text,
    '''  private snap(point: Point): Point {\n    const scene = this.scenes.scene;\n    if (!scene.snap || scene.gridMode === "none") return point;\n    const size = scene.gridSize * scene.gridScale;\n    return {\n      x: Math.round(point.x / size) * size,\n      y: Math.round(point.y / size) * size,\n    };\n  }''',
    '''  private snap(point: Point): Point {\n    const scene = this.scenes.scene;\n    if (!scene.snap || scene.gridMode === "none") return point;\n    return snapPointToGrid(\n      point,\n      scene.gridMode,\n      scene.gridSize * scene.gridScale,\n    );\n  }''',
    "advanced snapping",
)
write(path, text)

# Director bridge: coalesce mutations and avoid observer -> React -> observer feedback loops.
path = "src/components/tabletop/tabletop-director-enhancement-bridge.tsx"
text = read(path)
text = text.replace('  const [heartbeat, setHeartbeat] = useState(0);\n', '')
text = once(
    text,
    '''  useEffect(() => {\n    const refresh = () => {\n      setCommands(discoverDirectorCommands());\n      setHeartbeat((value) => value + 1);\n    };\n    refresh();\n    const observer = new MutationObserver(refresh);\n    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "aria-selected"] });\n    return () => {\n      observer.disconnect();\n    };\n  }, []);''',
    '''  useEffect(() => {\n    let frame = 0;\n    const refresh = () => {\n      frame = 0;\n      const next = discoverDirectorCommands();\n      setCommands((current) => {\n        const before = current.map((item) => `${item.id}:${item.disabled}`).join("|");\n        const after = next.map((item) => `${item.id}:${item.disabled}`).join("|");\n        return before === after ? current : next;\n      });\n    };\n    const schedule = () => {\n      if (!frame) frame = window.requestAnimationFrame(refresh);\n    };\n    refresh();\n    const observer = new MutationObserver(schedule);\n    observer.observe(document.body, {\n      childList: true,\n      subtree: true,\n      attributes: true,\n      attributeFilter: ["disabled", "aria-selected", "aria-pressed"],\n    });\n    return () => {\n      observer.disconnect();\n      if (frame) window.cancelAnimationFrame(frame);\n    };\n  }, []);''',
    "stable director observer",
)
text = text.replace('[commands, heartbeat],', '[commands],')
write(path, text)

# Placeables: query spatial records only while the inspector is open.
path = "src/components/tabletop/tabletop-placeables-inspector-bridge.tsx"
text = read(path)
text = once(
    text,
    '''  const refreshSpatial = useCallback(async () => {\n    if (!sceneId || sceneId === "local-scene") {''',
    '''  const refreshSpatial = useCallback(async () => {\n    if (!open) return;\n    if (!sceneId || sceneId === "local-scene") {''',
    "placeables open guard",
)
text = once(text, '  }, [sceneId]);', '  }, [open, sceneId]);', "placeables deps")
write(path, text)

print("Final tabletop player control and stability patch applied")
