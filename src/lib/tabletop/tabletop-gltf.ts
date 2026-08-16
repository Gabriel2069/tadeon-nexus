export type TabletopMat4 = Float32Array;
export type TabletopVec3 = [number, number, number];
export type TabletopQuat = [number, number, number, number];

export interface TabletopGltfImage {
  mimeType: string;
  uri?: string;
  bytes?: Uint8Array;
}

export interface TabletopGltfMaterial {
  baseColorFactor: [number, number, number, number];
  baseColorTexture?: number;
  alphaMode: "OPAQUE" | "MASK" | "BLEND";
  alphaCutoff: number;
  doubleSided: boolean;
}

export interface TabletopGltfPrimitive {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  colors?: Float32Array;
  colorComponents?: 3 | 4;
  joints?: Float32Array;
  weights?: Float32Array;
  indices?: Uint32Array;
  vertexCount: number;
  materialIndex?: number;
}

export interface TabletopGltfMesh {
  primitives: TabletopGltfPrimitive[];
}

export interface TabletopGltfNode {
  children: number[];
  meshIndex?: number;
  skinIndex?: number;
  translation: TabletopVec3;
  rotation: TabletopQuat;
  scale: TabletopVec3;
  matrix?: TabletopMat4;
}

export interface TabletopGltfSkin {
  joints: number[];
  inverseBindMatrices: TabletopMat4[];
}

export interface TabletopGltfAnimationSampler {
  input: Float32Array;
  output: Float32Array;
  outputComponents: number;
  interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
}

export interface TabletopGltfAnimationChannel {
  samplerIndex: number;
  nodeIndex: number;
  path: "translation" | "rotation" | "scale";
}

export interface TabletopGltfAnimation {
  name: string;
  duration: number;
  samplers: TabletopGltfAnimationSampler[];
  channels: TabletopGltfAnimationChannel[];
}

export interface TabletopGltfBounds {
  min: TabletopVec3;
  max: TabletopVec3;
}

export interface TabletopGltfModel {
  meshes: TabletopGltfMesh[];
  nodes: TabletopGltfNode[];
  rootNodes: number[];
  skins: TabletopGltfSkin[];
  animations: TabletopGltfAnimation[];
  images: TabletopGltfImage[];
  textures: Array<{ source: number }>;
  materials: TabletopGltfMaterial[];
  bounds: TabletopGltfBounds;
}

interface GltfBufferViewJson {
  buffer?: number;
  byteOffset?: number;
  byteLength?: number;
  byteStride?: number;
}

interface GltfAccessorJson {
  bufferView?: number;
  byteOffset?: number;
  componentType?: number;
  normalized?: boolean;
  count?: number;
  type?: string;
}

interface GltfPrimitiveJson {
  attributes?: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
}

interface GltfNodeJson {
  children?: number[];
  mesh?: number;
  skin?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
}

interface GltfAnimationJson {
  name?: string;
  samplers?: Array<{
    input?: number;
    output?: number;
    interpolation?: string;
  }>;
  channels?: Array<{
    sampler?: number;
    target?: { node?: number; path?: string };
  }>;
}

interface GltfDocumentJson {
  asset?: { version?: string };
  buffers?: Array<{ uri?: string; byteLength?: number }>;
  bufferViews?: GltfBufferViewJson[];
  accessors?: GltfAccessorJson[];
  meshes?: Array<{ primitives?: GltfPrimitiveJson[] }>;
  nodes?: GltfNodeJson[];
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
  skins?: Array<{ joints?: number[]; inverseBindMatrices?: number }>;
  animations?: GltfAnimationJson[];
  images?: Array<{ uri?: string; bufferView?: number; mimeType?: string }>;
  textures?: Array<{ source?: number }>;
  materials?: Array<{
    pbrMetallicRoughness?: {
      baseColorFactor?: number[];
      baseColorTexture?: { index?: number };
    };
    alphaMode?: string;
    alphaCutoff?: number;
    doubleSided?: boolean;
  }>;
}

interface DecodedGlb {
  json: GltfDocumentJson;
  binary?: ArrayBuffer;
}

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;
const COMPONENT_SIZE: Record<number, number> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};
const TYPE_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function tuple3(value: number[] | undefined, fallback: TabletopVec3): TabletopVec3 {
  return [
    finite(value?.[0], fallback[0]),
    finite(value?.[1], fallback[1]),
    finite(value?.[2], fallback[2]),
  ];
}

function tuple4(value: number[] | undefined, fallback: TabletopQuat): TabletopQuat {
  return [
    finite(value?.[0], fallback[0]),
    finite(value?.[1], fallback[1]),
    finite(value?.[2], fallback[2]),
    finite(value?.[3], fallback[3]),
  ];
}

function dataUriBytes(uri: string) {
  const separator = uri.indexOf(",");
  if (!uri.startsWith("data:") || separator < 0) return null;
  const metadata = uri.slice(5, separator);
  const payload = uri.slice(separator + 1);
  if (metadata.includes(";base64")) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
      bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

function dataUriMime(uri: string) {
  if (!uri.startsWith("data:")) return "application/octet-stream";
  return uri.slice(5, uri.indexOf(";") > 0 ? uri.indexOf(";") : uri.indexOf(",")) || "application/octet-stream";
}

export function decodeTabletopGlb(buffer: ArrayBuffer): DecodedGlb {
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC)
    throw new Error("TABLETOP_GLTF_INVALID_GLB");
  const version = view.getUint32(4, true);
  const length = view.getUint32(8, true);
  if (version !== 2 || length > view.byteLength)
    throw new Error("TABLETOP_GLTF_UNSUPPORTED_GLB");

  let offset = 12;
  let json: GltfDocumentJson | null = null;
  let binary: ArrayBuffer | undefined;
  while (offset + 8 <= length) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > length) throw new Error("TABLETOP_GLTF_INVALID_GLB");
    if (chunkType === GLB_JSON_CHUNK) {
      const text = new TextDecoder().decode(new Uint8Array(buffer, offset, chunkLength)).replace(/\u0000+$/g, "").trim();
      json = JSON.parse(text) as GltfDocumentJson;
    } else if (chunkType === GLB_BIN_CHUNK) {
      binary = buffer.slice(offset, offset + chunkLength);
    }
    offset += chunkLength;
  }
  if (!json) throw new Error("TABLETOP_GLTF_MISSING_JSON");
  return { json, binary };
}

function parseGltfJson(buffer: ArrayBuffer): GltfDocumentJson {
  const text = new TextDecoder().decode(buffer).replace(/^\uFEFF/, "").trim();
  const json = JSON.parse(text) as GltfDocumentJson;
  if (!json.asset?.version?.startsWith("2"))
    throw new Error("TABLETOP_GLTF_UNSUPPORTED_VERSION");
  return json;
}

function normalizedComponent(value: number, componentType: number) {
  if (componentType === 5120) return Math.max(value / 127, -1);
  if (componentType === 5121) return value / 255;
  if (componentType === 5122) return Math.max(value / 32767, -1);
  if (componentType === 5123) return value / 65535;
  return value;
}

function readComponent(view: DataView, offset: number, componentType: number) {
  if (componentType === 5120) return view.getInt8(offset);
  if (componentType === 5121) return view.getUint8(offset);
  if (componentType === 5122) return view.getInt16(offset, true);
  if (componentType === 5123) return view.getUint16(offset, true);
  if (componentType === 5125) return view.getUint32(offset, true);
  if (componentType === 5126) return view.getFloat32(offset, true);
  throw new Error("TABLETOP_GLTF_UNSUPPORTED_COMPONENT");
}

function accessorFloat(
  json: GltfDocumentJson,
  buffers: ArrayBuffer[],
  accessorIndex: number,
) {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor || accessor.bufferView === undefined)
    throw new Error("TABLETOP_GLTF_SPARSE_ACCESSOR_UNSUPPORTED");
  const bufferView = json.bufferViews?.[accessor.bufferView];
  const componentType = accessor.componentType ?? 5126;
  const components = TYPE_COMPONENTS[accessor.type ?? ""] ?? 0;
  const componentSize = COMPONENT_SIZE[componentType] ?? 0;
  const count = Math.max(0, Math.trunc(finite(accessor.count)));
  const source = bufferView && buffers[bufferView.buffer ?? 0];
  if (!bufferView || !source || !components || !componentSize || !count)
    throw new Error("TABLETOP_GLTF_INVALID_ACCESSOR");
  const stride = Math.max(components * componentSize, bufferView.byteStride ?? 0);
  const base = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(source);
  const output = new Float32Array(count * components);
  for (let item = 0; item < count; item += 1) {
    const itemOffset = base + item * stride;
    for (let component = 0; component < components; component += 1) {
      const raw = readComponent(view, itemOffset + component * componentSize, componentType);
      output[item * components + component] = accessor.normalized
        ? normalizedComponent(raw, componentType)
        : raw;
    }
  }
  return { values: output, components, count };
}

function accessorIndices(
  json: GltfDocumentJson,
  buffers: ArrayBuffer[],
  accessorIndex: number,
) {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor || accessor.bufferView === undefined)
    throw new Error("TABLETOP_GLTF_INVALID_INDICES");
  const bufferView = json.bufferViews?.[accessor.bufferView];
  const componentType = accessor.componentType ?? 5123;
  const componentSize = COMPONENT_SIZE[componentType] ?? 0;
  const count = Math.max(0, Math.trunc(finite(accessor.count)));
  const source = bufferView && buffers[bufferView.buffer ?? 0];
  if (!bufferView || !source || !componentSize || !count)
    throw new Error("TABLETOP_GLTF_INVALID_INDICES");
  const stride = Math.max(componentSize, bufferView.byteStride ?? 0);
  const base = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(source);
  const output = new Uint32Array(count);
  for (let index = 0; index < count; index += 1)
    output[index] = Math.max(0, Math.trunc(readComponent(view, base + index * stride, componentType)));
  return output;
}

function bufferViewBytes(
  json: GltfDocumentJson,
  buffers: ArrayBuffer[],
  index: number,
) {
  const view = json.bufferViews?.[index];
  const source = view && buffers[view.buffer ?? 0];
  if (!view || !source) throw new Error("TABLETOP_GLTF_INVALID_BUFFER_VIEW");
  const start = view.byteOffset ?? 0;
  return new Uint8Array(source.slice(start, start + (view.byteLength ?? 0)));
}

async function loadBuffer(uri: string, baseUrl: string, signal?: AbortSignal) {
  const inline = dataUriBytes(uri);
  if (inline) return inline.buffer.slice(inline.byteOffset, inline.byteOffset + inline.byteLength);
  const url = new URL(uri, baseUrl).toString();
  const response = await fetch(url, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("TABLETOP_GLTF_BUFFER_FETCH_FAILED");
  return response.arrayBuffer();
}

async function resolveBuffers(
  json: GltfDocumentJson,
  baseUrl: string,
  binary: ArrayBuffer | undefined,
  signal?: AbortSignal,
) {
  const descriptors = json.buffers ?? [];
  const buffers: ArrayBuffer[] = [];
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor.uri && index === 0 && binary) buffers.push(binary);
    else if (descriptor.uri) buffers.push(await loadBuffer(descriptor.uri, baseUrl, signal));
    else throw new Error("TABLETOP_GLTF_MISSING_BUFFER");
  }
  if (!buffers.length && binary) buffers.push(binary);
  return buffers;
}

function parseMaterials(json: GltfDocumentJson): TabletopGltfMaterial[] {
  return (json.materials ?? []).map((material) => {
    const pbr = material.pbrMetallicRoughness;
    const factor = pbr?.baseColorFactor;
    return {
      baseColorFactor: [
        finite(factor?.[0], 1),
        finite(factor?.[1], 1),
        finite(factor?.[2], 1),
        finite(factor?.[3], 1),
      ],
      baseColorTexture:
        pbr?.baseColorTexture?.index === undefined
          ? undefined
          : Math.max(0, Math.trunc(pbr.baseColorTexture.index)),
      alphaMode:
        material.alphaMode === "MASK" || material.alphaMode === "BLEND"
          ? material.alphaMode
          : "OPAQUE",
      alphaCutoff: Math.max(0, Math.min(1, finite(material.alphaCutoff, 0.5))),
      doubleSided: material.doubleSided === true,
    };
  });
}

function parseImages(
  json: GltfDocumentJson,
  buffers: ArrayBuffer[],
  baseUrl: string,
): TabletopGltfImage[] {
  return (json.images ?? []).map((image) => {
    if (image.bufferView !== undefined)
      return {
        mimeType: image.mimeType ?? "application/octet-stream",
        bytes: bufferViewBytes(json, buffers, image.bufferView),
      };
    if (image.uri) {
      const inline = dataUriBytes(image.uri);
      if (inline) return { mimeType: dataUriMime(image.uri), bytes: inline };
      return {
        mimeType: image.mimeType ?? "application/octet-stream",
        uri: new URL(image.uri, baseUrl).toString(),
      };
    }
    return { mimeType: "application/octet-stream" };
  });
}

function parseMeshes(json: GltfDocumentJson, buffers: ArrayBuffer[]) {
  const meshes: TabletopGltfMesh[] = [];
  let min: TabletopVec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  let max: TabletopVec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const mesh of json.meshes ?? []) {
    const primitives: TabletopGltfPrimitive[] = [];
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.mode !== undefined && primitive.mode !== 4) continue;
      const positionAccessor = primitive.attributes?.POSITION;
      if (positionAccessor === undefined) continue;
      const position = accessorFloat(json, buffers, positionAccessor);
      if (position.components !== 3) continue;
      const normal = primitive.attributes?.NORMAL === undefined
        ? undefined
        : accessorFloat(json, buffers, primitive.attributes.NORMAL);
      const uv = primitive.attributes?.TEXCOORD_0 === undefined
        ? undefined
        : accessorFloat(json, buffers, primitive.attributes.TEXCOORD_0);
      const color = primitive.attributes?.COLOR_0 === undefined
        ? undefined
        : accessorFloat(json, buffers, primitive.attributes.COLOR_0);
      const joints = primitive.attributes?.JOINTS_0 === undefined
        ? undefined
        : accessorFloat(json, buffers, primitive.attributes.JOINTS_0);
      const weights = primitive.attributes?.WEIGHTS_0 === undefined
        ? undefined
        : accessorFloat(json, buffers, primitive.attributes.WEIGHTS_0);
      for (let index = 0; index < position.values.length; index += 3) {
        min = [
          Math.min(min[0], position.values[index]),
          Math.min(min[1], position.values[index + 1]),
          Math.min(min[2], position.values[index + 2]),
        ];
        max = [
          Math.max(max[0], position.values[index]),
          Math.max(max[1], position.values[index + 1]),
          Math.max(max[2], position.values[index + 2]),
        ];
      }
      primitives.push({
        positions: position.values,
        normals: normal?.components === 3 ? normal.values : undefined,
        uvs: uv?.components === 2 ? uv.values : undefined,
        colors: color && (color.components === 3 || color.components === 4) ? color.values : undefined,
        colorComponents: color?.components === 3 || color?.components === 4 ? color.components : undefined,
        joints: joints?.components === 4 ? joints.values : undefined,
        weights: weights?.components === 4 ? weights.values : undefined,
        indices: primitive.indices === undefined ? undefined : accessorIndices(json, buffers, primitive.indices),
        vertexCount: position.count,
        materialIndex: primitive.material,
      });
    }
    meshes.push({ primitives });
  }
  if (!Number.isFinite(min[0])) {
    min = [-0.5, 0, -0.5];
    max = [0.5, 1, 0.5];
  }
  return { meshes, bounds: { min, max } };
}

export function tabletopMat4Identity(): TabletopMat4 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function tabletopMat4Multiply(left: TabletopMat4, right: TabletopMat4): TabletopMat4 {
  const output = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let index = 0; index < 4; index += 1)
        value += left[index * 4 + row] * right[column * 4 + index];
      output[column * 4 + row] = value;
    }
  }
  return output;
}

export function tabletopMat4FromTrs(
  translation: TabletopVec3,
  rotation: TabletopQuat,
  scale: TabletopVec3,
): TabletopMat4 {
  const [x, y, z, w] = rotation;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const [sx, sy, sz] = scale;
  return new Float32Array([
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ]);
}

function matrixFromNode(node: GltfNodeJson) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16)
    return new Float32Array(node.matrix.map((value) => finite(value)));
  return tabletopMat4FromTrs(
    tuple3(node.translation, [0, 0, 0]),
    tuple4(node.rotation, [0, 0, 0, 1]),
    tuple3(node.scale, [1, 1, 1]),
  );
}

function parseNodes(json: GltfDocumentJson): TabletopGltfNode[] {
  return (json.nodes ?? []).map((node) => ({
    children: (node.children ?? []).filter((index) => Number.isInteger(index) && index >= 0),
    meshIndex: node.mesh,
    skinIndex: node.skin,
    translation: tuple3(node.translation, [0, 0, 0]),
    rotation: tuple4(node.rotation, [0, 0, 0, 1]),
    scale: tuple3(node.scale, [1, 1, 1]),
    matrix: Array.isArray(node.matrix) && node.matrix.length === 16 ? matrixFromNode(node) : undefined,
  }));
}

function parseSkins(json: GltfDocumentJson, buffers: ArrayBuffer[]): TabletopGltfSkin[] {
  return (json.skins ?? []).map((skin) => {
    const joints = (skin.joints ?? []).filter((index) => Number.isInteger(index) && index >= 0);
    let inverseBindMatrices = joints.map(() => tabletopMat4Identity());
    if (skin.inverseBindMatrices !== undefined) {
      const accessor = accessorFloat(json, buffers, skin.inverseBindMatrices);
      if (accessor.components === 16 && accessor.count >= joints.length) {
        inverseBindMatrices = joints.map((_, index) =>
          accessor.values.slice(index * 16, index * 16 + 16),
        );
      }
    }
    return { joints, inverseBindMatrices };
  });
}

function parseAnimations(json: GltfDocumentJson, buffers: ArrayBuffer[]) {
  return (json.animations ?? []).map((animation, animationIndex): TabletopGltfAnimation => {
    const samplers = (animation.samplers ?? []).map((sampler): TabletopGltfAnimationSampler => {
      if (sampler.input === undefined || sampler.output === undefined)
        throw new Error("TABLETOP_GLTF_INVALID_ANIMATION");
      const input = accessorFloat(json, buffers, sampler.input);
      const output = accessorFloat(json, buffers, sampler.output);
      return {
        input: input.values,
        output: output.values,
        outputComponents: output.components,
        interpolation:
          sampler.interpolation === "STEP" || sampler.interpolation === "CUBICSPLINE"
            ? sampler.interpolation
            : "LINEAR",
      };
    });
    const channels: TabletopGltfAnimationChannel[] = [];
    for (const channel of animation.channels ?? []) {
      const path = channel.target?.path;
      if (
        channel.sampler === undefined ||
        channel.target?.node === undefined ||
        (path !== "translation" && path !== "rotation" && path !== "scale")
      ) continue;
      channels.push({
        samplerIndex: channel.sampler,
        nodeIndex: channel.target.node,
        path,
      });
    }
    const duration = samplers.reduce(
      (maximum, sampler) => Math.max(maximum, sampler.input.at(-1) ?? 0),
      0,
    );
    return {
      name: animation.name?.trim() || `Animação ${animationIndex + 1}`,
      duration,
      samplers,
      channels,
    };
  });
}

export function tabletopQuatSlerp(
  from: TabletopQuat,
  to: TabletopQuat,
  amount: number,
): TabletopQuat {
  let [tx, ty, tz, tw] = to;
  let cosine = from[0] * tx + from[1] * ty + from[2] * tz + from[3] * tw;
  if (cosine < 0) {
    cosine = -cosine;
    tx = -tx;
    ty = -ty;
    tz = -tz;
    tw = -tw;
  }
  if (cosine > 0.9995) {
    const result: TabletopQuat = [
      from[0] + amount * (tx - from[0]),
      from[1] + amount * (ty - from[1]),
      from[2] + amount * (tz - from[2]),
      from[3] + amount * (tw - from[3]),
    ];
    const length = Math.hypot(...result) || 1;
    return result.map((value) => value / length) as TabletopQuat;
  }
  const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
  const sine = Math.sin(angle) || 1;
  const left = Math.sin((1 - amount) * angle) / sine;
  const right = Math.sin(amount * angle) / sine;
  return [
    from[0] * left + tx * right,
    from[1] * left + ty * right,
    from[2] * left + tz * right,
    from[3] * left + tw * right,
  ];
}

function sampledComponents(
  sampler: TabletopGltfAnimationSampler,
  time: number,
  components: number,
) {
  const times = sampler.input;
  if (!times.length) return new Array<number>(components).fill(0);
  let rightIndex = times.findIndex((value) => value > time);
  if (rightIndex < 0) rightIndex = times.length - 1;
  const leftIndex = Math.max(0, rightIndex - 1);
  if (rightIndex === 0) rightIndex = 0;
  const leftTime = times[leftIndex] ?? 0;
  const rightTime = times[rightIndex] ?? leftTime;
  const amount = sampler.interpolation === "STEP" || rightTime <= leftTime
    ? 0
    : Math.max(0, Math.min(1, (time - leftTime) / (rightTime - leftTime)));
  const stride = sampler.interpolation === "CUBICSPLINE" ? components * 3 : components;
  const valueOffset = sampler.interpolation === "CUBICSPLINE" ? components : 0;
  const leftOffset = leftIndex * stride + valueOffset;
  const rightOffset = rightIndex * stride + valueOffset;
  const left = Array.from(sampler.output.slice(leftOffset, leftOffset + components));
  const right = Array.from(sampler.output.slice(rightOffset, rightOffset + components));
  return { left, right, amount };
}

export function tabletopAnimatedNodeMatrices(
  model: TabletopGltfModel,
  animationIndex: number,
  timeSeconds: number,
) {
  const translations = model.nodes.map((node) => [...node.translation] as TabletopVec3);
  const rotations = model.nodes.map((node) => [...node.rotation] as TabletopQuat);
  const scales = model.nodes.map((node) => [...node.scale] as TabletopVec3);
  const animation = model.animations[animationIndex];
  if (animation && animation.duration > 0) {
    const time = ((timeSeconds % animation.duration) + animation.duration) % animation.duration;
    for (const channel of animation.channels) {
      const sampler = animation.samplers[channel.samplerIndex];
      const node = model.nodes[channel.nodeIndex];
      if (!sampler || !node || node.matrix) continue;
      const components = channel.path === "rotation" ? 4 : 3;
      const sample = sampledComponents(sampler, time, components);
      if (Array.isArray(sample)) continue;
      if (channel.path === "rotation") {
        rotations[channel.nodeIndex] = tabletopQuatSlerp(
          sample.left as TabletopQuat,
          sample.right as TabletopQuat,
          sample.amount,
        );
      } else {
        const value = sample.left.map(
          (entry, index) => entry + (sample.right[index] - entry) * sample.amount,
        ) as TabletopVec3;
        if (channel.path === "translation") translations[channel.nodeIndex] = value;
        else scales[channel.nodeIndex] = value;
      }
    }
  }

  const local = model.nodes.map((node, index) =>
    node.matrix ?? tabletopMat4FromTrs(translations[index], rotations[index], scales[index]),
  );
  const global = model.nodes.map(() => tabletopMat4Identity());
  const visited = new Set<number>();
  const walk = (index: number, parent: TabletopMat4) => {
    if (!model.nodes[index] || visited.has(index)) return;
    visited.add(index);
    global[index] = tabletopMat4Multiply(parent, local[index]);
    for (const child of model.nodes[index].children) walk(child, global[index]);
  };
  for (const root of model.rootNodes) walk(root, tabletopMat4Identity());
  for (let index = 0; index < model.nodes.length; index += 1)
    if (!visited.has(index)) walk(index, tabletopMat4Identity());
  return global;
}

export function tabletopSkinMatrices(
  model: TabletopGltfModel,
  skinIndex: number,
  globalMatrices: TabletopMat4[],
) {
  const skin = model.skins[skinIndex];
  if (!skin) return [];
  return skin.joints.map((joint, index) =>
    tabletopMat4Multiply(
      globalMatrices[joint] ?? tabletopMat4Identity(),
      skin.inverseBindMatrices[index] ?? tabletopMat4Identity(),
    ),
  );
}

export async function loadTabletopGltf(
  url: string,
  signal?: AbortSignal,
): Promise<TabletopGltfModel> {
  const response = await fetch(url, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("TABLETOP_GLTF_FETCH_FAILED");
  const buffer = await response.arrayBuffer();
  const mime = response.headers.get("content-type")?.toLowerCase() ?? "";
  const isGlb = mime.includes("gltf-binary") || new DataView(buffer).byteLength >= 4 && new DataView(buffer).getUint32(0, true) === GLB_MAGIC;
  const decoded = isGlb ? decodeTabletopGlb(buffer) : { json: parseGltfJson(buffer), binary: undefined };
  const buffers = await resolveBuffers(decoded.json, url, decoded.binary, signal);
  const parsedMeshes = parseMeshes(decoded.json, buffers);
  const nodes = parseNodes(decoded.json);
  const sceneIndex = Math.max(0, Math.trunc(finite(decoded.json.scene)));
  const rootNodes = (decoded.json.scenes?.[sceneIndex]?.nodes ?? decoded.json.scenes?.[0]?.nodes ?? nodes.map((_, index) => index))
    .filter((index) => Number.isInteger(index) && index >= 0);
  return {
    ...parsedMeshes,
    nodes,
    rootNodes,
    skins: parseSkins(decoded.json, buffers),
    animations: parseAnimations(decoded.json, buffers),
    images: parseImages(decoded.json, buffers, url),
    textures: (decoded.json.textures ?? []).map((texture) => ({ source: Math.max(0, Math.trunc(finite(texture.source))) })),
    materials: parseMaterials(decoded.json),
  };
}
