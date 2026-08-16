import { tabletopMediaKind } from "./tabletop-media";
import { isRoofStructure } from "./tabletop-spatial";
import type { TabletopVisibilityState } from "./tabletop-visibility-service";
import type { TabletopScene } from "./types";

export type TabletopPreflightSeverity = "blocking" | "warning" | "info";

export interface TabletopPreflightCheck {
  id: string;
  severity: TabletopPreflightSeverity;
  title: string;
  detail: string;
  fixHint?: string;
}

export interface TabletopPreflightReport {
  checks: TabletopPreflightCheck[];
  blockers: number;
  warnings: number;
  score: number;
  ready: boolean;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function buildTabletopPreflight(
  scene: TabletopScene,
  visibility: TabletopVisibilityState | null | undefined,
  options: {
    realtimeEnabled: boolean;
    online: boolean;
    webgl2: boolean;
  },
): TabletopPreflightReport {
  const checks: TabletopPreflightCheck[] = [];
  const push = (check: TabletopPreflightCheck) => checks.push(check);

  if (!scene.backgroundAssetUrl) {
    push({ id: "background", severity: "warning", title: "Cena sem mapa de fundo", detail: "A sessão pode abrir, mas os jogadores verão apenas a superfície vazia.", fixHint: "Adicione um mapa ou confirme que a cena é intencionalmente abstrata." });
  } else {
    push({ id: "background", severity: "info", title: "Mapa de fundo pronto", detail: "A cena possui um asset de fundo definido." });
  }

  if (!options.realtimeEnabled) {
    push({ id: "realtime", severity: "blocking", title: "Realtime desabilitado", detail: "A sala ao vivo não deve ser iniciada sem o canal de sincronização habilitado.", fixHint: "Ative Realtime para esta conta/campanha antes de abrir a sessão." });
  } else if (!options.online) {
    push({ id: "online", severity: "blocking", title: "Dispositivo sem conexão", detail: "O navegador reporta estado offline.", fixHint: "Recupere a conexão antes de abrir a sala." });
  } else {
    push({ id: "realtime", severity: "info", title: "Canal de sessão disponível", detail: "Realtime está habilitado e o navegador está online." });
  }

  if (!visibility) {
    push({ id: "visibility", severity: "warning", title: "Visibilidade ainda não carregada", detail: "Fog, luzes e arquitetura não puderam ser verificados agora.", fixHint: "Aguarde a cena terminar de carregar e rode o preflight novamente." });
  } else {
    const secretDoors = visibility.walls.filter((wall) => wall.wallType === "door_secret").length;
    const roofs = visibility.walls.filter((wall) => isRoofStructure(wall.wallType)).length;
    if (secretDoors > 0 && !visibility.fogEnabled && visibility.globalIllumination > 0.8) {
      push({ id: "secret-doors", severity: "warning", title: "Portas secretas em cena muito exposta", detail: `${secretDoors} porta(s) secreta(s) existem com fog desligado e iluminação global alta.`, fixHint: "Use o modo de participante/projeção para confirmar que nenhuma pista visual vaza." });
    } else if (secretDoors > 0) {
      push({ id: "secret-doors", severity: "info", title: "Portas secretas protegidas por arquitetura", detail: `${secretDoors} porta(s) secreta(s) serão tratadas como parede até serem reveladas.` });
    }
    if (roofs > 0) {
      push({ id: "roofs", severity: "info", title: "Roof/foreground ativo", detail: `${roofs} volume(s) de telhado serão recortados dinamicamente quando tokens entrarem sob eles.` });
    }
    if (visibility.fogEnabled && visibility.fogStrokes.length === 0) {
      push({ id: "fog-empty", severity: "warning", title: "Fog ligado sem áreas preparadas", detail: "A cena usa fog, mas ainda não há traços de revelação/cobertura persistidos.", fixHint: "Faça uma passagem rápida no modo jogador ou prepare áreas iniciais de fog." });
    }
    if (visibility.lights.some((light) => light.castsShadows && !light.enabled)) {
      push({ id: "disabled-lights", severity: "warning", title: "Luzes com sombra desativadas", detail: "Há luzes autoradas para sombra que estão desligadas; confirme se é intencional." });
    }
  }

  const modelEntities = scene.entities.filter((entity) => {
    const props = objectValue(entity.properties);
    return entity.assetUrl && tabletopMediaKind(props.mime_type, entity.assetUrl) === "model";
  });
  if (modelEntities.length && !options.webgl2) {
    push({ id: "webgl2", severity: "warning", title: "3D sem WebGL2", detail: `${modelEntities.length} modelo(s) 3D cairão para o shell seguro 2D neste dispositivo.`, fixHint: "A sessão continua funcional, mas teste a projeção em um navegador com WebGL2 para o 3D completo." });
  } else if (modelEntities.length) {
    push({ id: "webgl2", severity: "info", title: "Renderer 3D disponível", detail: `${modelEntities.length} entidade(s) podem usar o renderer nativo com máscara de visibilidade.` });
  }

  const missingAssets = scene.entities.filter((entity) => Boolean(entity.assetId) && !entity.assetUrl).length;
  if (missingAssets) {
    push({ id: "missing-assets", severity: "warning", title: "Assets sem URL resolvida", detail: `${missingAssets} entidade(s) possuem referência de asset sem URL pronta no snapshot.`, fixHint: "Abra a biblioteca/Placeables e confirme os arquivos antes da transmissão." });
  }

  const hiddenLinked = scene.entities.filter((entity) => entity.hidden && (entity.linkedSheetId || entity.linkedKnowledgeNodeId)).length;
  if (hiddenLinked) push({ id: "hidden-linked", severity: "info", title: "Conteúdo preparado no espaço do mestre", detail: `${hiddenLinked} entidade(s) vinculadas estão ocultas e disponíveis para revelação durante a sessão.` });

  const count = scene.entities.length;
  if (count > 450) {
    push({ id: "density", severity: "warning", title: "Cena muito densa", detail: `${count} entidades serão renderizadas/gerenciadas. O modo adaptativo reduzirá qualidade antes de comprometer interação.`, fixHint: "Considere dividir decoração muito distante em tiles ou níveis se a projeção ficar pesada." });
  } else {
    push({ id: "density", severity: "info", title: "Densidade dentro da faixa esperada", detail: `${count} entidade(s) na cena atual.` });
  }

  const blockers = checks.filter((check) => check.severity === "blocking").length;
  const warnings = checks.filter((check) => check.severity === "warning").length;
  const score = Math.max(0, Math.min(100, 100 - blockers * 42 - warnings * 8));
  return { checks, blockers, warnings, score, ready: blockers === 0 };
}
