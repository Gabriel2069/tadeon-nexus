from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, got {count}")
    return text.replace(old, new, 1)


# Director preview styles.
path = "src/components/tabletop/tabletop-director-remote.tsx"
text = read(path)
text = once(
    text,
    'import "@/styles/tabletop-director-remote.css";\n',
    'import "@/styles/tabletop-director-remote.css";\nimport "@/styles/tabletop-director-preview-final.css";\n',
    "director preview stylesheet",
)
write(path, text)

# Tactical targeting built on the real Trama geometry.
path = "src/components/tabletop/tabletop-player-interaction-bridge.tsx"
text = read(path)
text = once(
    text,
    'import type { Point, TabletopSnapshot } from "@/lib/tabletop/types";',
    'import type { Point, TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";',
    "target entity type",
)
text = once(
    text,
    '''function pathForTemplate(template: TabletopPowerTemplate, origin: Point, target: Point) {''',
    '''function pointInsideEntity(point: Point, entity: TabletopEntity) {
  const center = { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
  const angle = (-entity.rotation * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(localX) <= entity.width / 2 && Math.abs(localY) <= entity.height / 2;
}

function topTargetAtPoint(snapshot: TabletopSnapshot, point: Point, sourceId?: string) {
  const source = sourceId ? snapshot.scene.entities.find((entity) => entity.id === sourceId) : null;
  return [...snapshot.scene.entities]
    .filter(
      (entity) =>
        entity.id !== sourceId &&
        !entity.hidden &&
        (!source?.levelId || !entity.levelId || entity.levelId === source.levelId) &&
        pointInsideEntity(point, entity),
    )
    .sort((left, right) => right.zIndex - left.zIndex)[0] ?? null;
}

function pointInsidePolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    const intersects =
      (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function geometryContainsPoint(
  geometry: ReturnType<typeof templatePath>,
  point: Point,
) {
  if (geometry.kind === "circle")
    return Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) <= geometry.radius;
  if (geometry.kind === "segment")
    return distanceToSegment(point, geometry.start, geometry.end) <= geometry.width / 2;
  return pointInsidePolygon(point, geometry.points);
}

function pathForTemplate(template: TabletopPowerTemplate, origin: Point, target: Point) {''',
    "target geometry helpers",
)
text = once(
    text,
    '''  const [activePower, setActivePower] = useState<TabletopPowerTemplate | null>(null);
  const [loadingPowers, setLoadingPowers] = useState(false);''',
    '''  const [activePower, setActivePower] = useState<TabletopPowerTemplate | null>(null);
  const [targetIds, setTargetIds] = useState<Set<string>>(() => new Set());
  const [loadingPowers, setLoadingPowers] = useState(false);''',
    "target state",
)
text = once(
    text,
    '''  useEffect(() => {
    const text = activePower''',
    '''  useEffect(() => {
    setTargetIds(new Set());
  }, [activePower?.id]);

  useEffect(() => {
    const text = activePower''',
    "reset target on power",
)
text = once(
    text,
    '''  const powerGeometry = useMemo(
    () => activePower && origin && cursorWorld
      ? pathForTemplate(activePower, origin, cursorWorld)
      : null,
    [activePower, cursorWorld, origin],
  );''',
    '''  const powerWorldGeometry = useMemo(
    () => activePower && origin && cursorWorld
      ? templatePath(activePower, origin, cursorWorld)
      : null,
    [activePower, cursorWorld, origin],
  );
  const powerGeometry = useMemo(
    () => activePower && origin && cursorWorld
      ? pathForTemplate(activePower, origin, cursorWorld)
      : null,
    [activePower, cursorWorld, origin],
  );
  const affectedEntities = useMemo(() => {
    if (!snapshot || mode !== "power" || !powerWorldGeometry) return [];
    return snapshot.scene.entities.filter((candidate) => {
      if (candidate.id === entity?.id || candidate.hidden) return false;
      if (entity?.levelId && candidate.levelId && candidate.levelId !== entity.levelId) return false;
      return geometryContainsPoint(powerWorldGeometry, centerOf(candidate));
    });
  }, [entity?.id, entity?.levelId, mode, powerWorldGeometry, snapshot]);''',
    "affected targets",
)
text = once(
    text,
    '''      if (mode === "movement") {
        setMovementPoints((current) => {
          const start = current.length ? current : origin ? [origin] : [];
          return [...start, world];
        });
      }''',
    '''      if (mode === "movement") {
        setMovementPoints((current) => {
          const start = current.length ? current : origin ? [origin] : [];
          return [...start, world];
        });
        return;
      }
      if (mode === "power") {
        const target = topTargetAtPoint(runtime.snapshot(), world, entity?.id);
        if (!target) return;
        setTargetIds((current) => {
          const next = new Set(current);
          if (next.has(target.id)) next.delete(target.id);
          else next.add(target.id);
          return next;
        });
      }''',
    "power click targeting",
)
text = once(
    text,
    '''      setActivePower(null);
    };''',
    '''      setActivePower(null);
      setTargetIds(new Set());
    };''',
    "escape clears targets",
)
text = once(text, '  }, [mode, origin]);', '  }, [entity?.id, mode, origin]);', "target effect dependencies")
text = once(
    text,
    '''        {mode === "power" && powerGeometry?.kind === "segment" && (
          <line
            x1={powerGeometry.start.x}
            y1={powerGeometry.start.y}
            x2={powerGeometry.end.x}
            y2={powerGeometry.end.y}
            strokeWidth={powerGeometry.width}
            className="tadeon-tactical-overlay__power-line"
          />
        )}''',
    '''        {mode === "power" && powerGeometry?.kind === "segment" && (
          <line
            x1={powerGeometry.start.x}
            y1={powerGeometry.start.y}
            x2={powerGeometry.end.x}
            y2={powerGeometry.end.y}
            strokeWidth={powerGeometry.width}
            className="tadeon-tactical-overlay__power-line"
          />
        )}
        {mode === "power" && affectedEntities.map((candidate) => {
          const point = screenPoint(centerOf(candidate));
          const marked = targetIds.has(candidate.id);
          return (
            <g key={`affected-${candidate.id}`} className={marked ? "tadeon-tactical-target is-marked" : "tadeon-tactical-target is-affected"}>
              <circle cx={point.x} cy={point.y} r={marked ? 17 : 12} />
              {marked && <><line x1={point.x - 23} y1={point.y} x2={point.x - 10} y2={point.y} /><line x1={point.x + 10} y1={point.y} x2={point.x + 23} y2={point.y} /><line x1={point.x} y1={point.y - 23} x2={point.x} y2={point.y - 10} /><line x1={point.x} y1={point.y + 10} x2={point.x} y2={point.y + 23} /></>}
            </g>
          );
        })}
        {mode === "power" && [...targetIds]
          .filter((id) => !affectedEntities.some((candidate) => candidate.id === id))
          .map((id) => snapshot.scene.entities.find((candidate) => candidate.id === id))
          .filter((candidate): candidate is TabletopEntity => Boolean(candidate))
          .map((candidate) => {
            const point = screenPoint(centerOf(candidate));
            return (
              <g key={`target-${candidate.id}`} className="tadeon-tactical-target is-marked is-outside">
                <circle cx={point.x} cy={point.y} r={17} />
                <line x1={point.x - 23} y1={point.y} x2={point.x - 10} y2={point.y} />
                <line x1={point.x + 10} y1={point.y} x2={point.x + 23} y2={point.y} />
                <line x1={point.x} y1={point.y - 23} x2={point.x} y2={point.y - 10} />
                <line x1={point.x} y1={point.y + 10} x2={point.x} y2={point.y + 23} />
              </g>
            );
          })}''',
    "target overlay",
)
text = once(
    text,
    '''              setActivePower(null);
              setCursorWorld(null);''',
    '''              setActivePower(null);
              setTargetIds(new Set());
              setCursorWorld(null);''',
    "movement clears targets",
)
text = once(
    text,
    '''                      setActivePower(template);
                      setMode("power");
                      setMovementPoints([]);
                      setCursorWorld(origin);''',
    '''                      setActivePower(template);
                      setTargetIds(new Set());
                      setMode("power");
                      setMovementPoints([]);
                      setCursorWorld(origin);''',
    "power selection clears targets",
)
text = once(
    text,
    '''                setActivePower(null);
              }}''',
    '''                setActivePower(null);
                setTargetIds(new Set());
              }}''',
    "close clears targets",
)
text = once(
    text,
    '''              <small>{activePower.source.damage || activePower.source.effect || "prévia visual da Trama"}</small>''',
    '''              <small title={activePower.source.damage || activePower.source.effect || "Prévia visual da Trama"}>
                {affectedEntities.length} na área · {targetIds.size} marcado{targetIds.size === 1 ? "" : "s"}
              </small>''',
    "target readout",
)
write(path, text)

# Target visuals appended to the existing tactical stylesheet.
path = "src/styles/tabletop-player-interaction.css"
text = read(path)
text += '''\n.tadeon-tactical-target{fill:none;stroke-linecap:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 7px hsl(188 70% 54% / .28))}.tadeon-tactical-target circle,.tadeon-tactical-target line{fill:none;stroke:currentColor;stroke-width:2;vector-effect:non-scaling-stroke}.tadeon-tactical-target.is-affected{color:hsl(188 78% 72% / .72)}.tadeon-tactical-target.is-affected circle{stroke-dasharray:4 4}.tadeon-tactical-target.is-marked{color:hsl(42 88% 72% / .98);filter:drop-shadow(0 0 8px hsl(42 82% 58% / .38))}.tadeon-tactical-target.is-outside{color:hsl(8 80% 68% / .92)}\n'''
write(path, text)

print("Tabletop targets and director preview wired")
