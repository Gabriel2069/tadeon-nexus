import {
  loadTabletopGltf,
  tabletopAnimatedNodeMatrices,
  tabletopMat4Identity,
  tabletopMat4Multiply,
  tabletopSkinMatrices,
  type TabletopGltfImage,
  type TabletopGltfMaterial,
  type TabletopGltfModel,
  type TabletopGltfPrimitive,
  type TabletopMat4,
} from "./tabletop-gltf";
import { tabletopMediaKind } from "./tabletop-media";
import type { TabletopBrowserRuntime } from "./tabletop-player-runtime";
import type { TabletopEntity, TabletopSnapshot } from "./types";

interface GpuPrimitive {
  position: WebGLBuffer;
  normal?: WebGLBuffer;
  uv?: WebGLBuffer;
  color?: WebGLBuffer;
  colorComponents: 3 | 4;
  joints?: WebGLBuffer;
  weights?: WebGLBuffer;
  indices?: WebGLBuffer;
  count: number;
  materialIndex?: number;
}

interface GpuModel {
  source: TabletopGltfModel;
  meshes: GpuPrimitive[][];
  textures: Array<WebGLTexture | null>;
}

interface ModelRecord {
  url: string;
  cpu?: TabletopGltfModel;
  gpu?: GpuModel;
  pending?: Promise<void>;
  failed?: boolean;
}

interface Uniforms {
  entityRoot: WebGLUniformLocation;
  nodeMatrix: WebGLUniformLocation;
  useSkin: WebGLUniformLocation;
  joints: WebGLUniformLocation | null;
  originPx: WebGLUniformLocation;
  basisX: WebGLUniformLocation;
  basisZ: WebGLUniformLocation;
  elevationPx: WebGLUniformLocation;
  viewport: WebGLUniformLocation;
  depthAxis: WebGLUniformLocation;
  depthScale: WebGLUniformLocation;
  baseColor: WebGLUniformLocation;
  useTexture: WebGLUniformLocation;
  texture: WebGLUniformLocation;
  useColor: WebGLUniformLocation;
  hasNormal: WebGLUniformLocation;
  selected: WebGLUniformLocation;
  alphaCutoff: WebGLUniformLocation;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("TABLETOP_3D_SHADER_CREATE_FAILED");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "shader";
    gl.deleteShader(shader);
    throw new Error(`TABLETOP_3D_SHADER_FAILED:${message}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, maxJoints: number) {
  const vertex = createShader(
    gl,
    gl.VERTEX_SHADER,
    `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aColor;
layout(location=4) in vec4 aJoints;
layout(location=5) in vec4 aWeights;
uniform mat4 uEntityRoot;
uniform mat4 uNodeMatrix;
uniform bool uUseSkin;
uniform mat4 uJoints[${maxJoints}];
uniform vec2 uOriginPx;
uniform vec2 uBasisX;
uniform vec2 uBasisZ;
uniform float uElevationPx;
uniform vec2 uViewport;
uniform vec2 uDepthAxis;
uniform float uDepthScale;
uniform bool uHasNormal;
out vec3 vNormal;
out vec2 vUv;
out vec4 vColor;
void main() {
  vec4 modelPosition;
  vec3 modelNormal;
  if (uUseSkin) {
    ivec4 joints = ivec4(aJoints + 0.5);
    mat4 skin =
      aWeights.x * uJoints[joints.x] +
      aWeights.y * uJoints[joints.y] +
      aWeights.z * uJoints[joints.z] +
      aWeights.w * uJoints[joints.w];
    modelPosition = skin * vec4(aPosition, 1.0);
    modelNormal = mat3(skin) * aNormal;
  } else {
    modelPosition = uNodeMatrix * vec4(aPosition, 1.0);
    modelNormal = mat3(uNodeMatrix) * aNormal;
  }
  vec4 world = uEntityRoot * modelPosition;
  vec2 pixel = uOriginPx + uBasisX * world.x + uBasisZ * world.z;
  pixel.y -= uElevationPx * world.y;
  vec2 clip = vec2(
    pixel.x / max(1.0, uViewport.x) * 2.0 - 1.0,
    1.0 - pixel.y / max(1.0, uViewport.y) * 2.0
  );
  float depth = clamp(
    0.5 - dot(world.xz, uDepthAxis) * uDepthScale + world.y * uDepthScale * 0.12,
    0.01,
    0.99
  );
  gl_Position = vec4(clip, depth * 2.0 - 1.0, 1.0);
  vNormal = uHasNormal ? normalize(mat3(uEntityRoot) * modelNormal) : vec3(0.0, 1.0, 0.0);
  vUv = aUv;
  vColor = aColor;
}
`,
  );
  const fragment = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
in vec4 vColor;
uniform vec4 uBaseColor;
uniform bool uUseTexture;
uniform sampler2D uTexture;
uniform bool uUseColor;
uniform bool uHasNormal;
uniform bool uSelected;
uniform float uAlphaCutoff;
out vec4 outColor;
void main() {
  vec4 color = uBaseColor;
  if (uUseTexture) color *= texture(uTexture, vUv);
  if (uUseColor) color *= vColor;
  if (color.a < uAlphaCutoff) discard;
  vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.46));
  float diffuse = uHasNormal ? max(0.0, dot(normalize(vNormal), lightDirection)) : 0.7;
  float light = 0.44 + diffuse * 0.56;
  vec3 shaded = color.rgb * light;
  if (uSelected) {
    vec3 selection = vec3(0.85, 0.82, 0.52);
    shaded = mix(shaded, selection, 0.22) + selection * 0.08;
  }
  outColor = vec4(shaded, color.a);
}
`,
  );
  const program = gl.createProgram();
  if (!program) throw new Error("TABLETOP_3D_PROGRAM_CREATE_FAILED");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "program";
    gl.deleteProgram(program);
    throw new Error(`TABLETOP_3D_PROGRAM_FAILED:${message}`);
  }
  return program;
}

function uniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`TABLETOP_3D_UNIFORM_MISSING:${name}`);
  return location;
}

function copyToArrayBufferBytes(view: ArrayBufferView<ArrayBufferLike>): Uint8Array<ArrayBuffer> {
  const source = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const copy = new Uint8Array(new ArrayBuffer(view.byteLength));
  copy.set(source);
  return copy;
}

function createBuffer(
  gl: WebGL2RenderingContext,
  target: number,
  values: ArrayBufferView<ArrayBufferLike>,
) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("TABLETOP_3D_BUFFER_CREATE_FAILED");
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, copyToArrayBufferBytes(values), gl.STATIC_DRAW);
  return buffer;
}

function mat4Translation(x: number, y: number, z: number) {
  const matrix = tabletopMat4Identity();
  matrix[12] = x;
  matrix[13] = y;
  matrix[14] = z;
  return matrix;
}

function mat4Scale(value: number) {
  const matrix = tabletopMat4Identity();
  matrix[0] = value;
  matrix[5] = value;
  matrix[10] = value;
  return matrix;
}

function mat4RotationY(angle: number) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new Float32Array([
    cosine,
    0,
    -sine,
    0,
    0,
    1,
    0,
    0,
    sine,
    0,
    cosine,
    0,
    0,
    0,
    0,
    1,
  ]);
}

function entityRootMatrix(entity: TabletopEntity, model: TabletopGltfModel) {
  const properties = objectValue(entity.properties);
  const [minX, minY, minZ] = model.bounds.min;
  const [maxX, maxY, maxZ] = model.bounds.max;
  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  const depth = Math.max(0.001, maxZ - minZ);
  const footprint = Math.max(width, depth, height * 0.45, 0.001);
  const target = Math.max(8, Math.sqrt(Math.max(8, entity.width) * Math.max(8, entity.height)));
  const authoredScale = clamp(finite(properties.model_scale, 1), 0.05, 20);
  const scale = (target / footprint) * authoredScale;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const yawOffset = finite(properties.model_yaw, 0);
  const rotation = ((-entity.rotation + yawOffset) * Math.PI) / 180;
  const elevationOffset = finite(properties.model_elevation_offset, 0);
  const normalized = mat4Translation(-centerX, -minY, -centerZ);
  const scaled = tabletopMat4Multiply(mat4Scale(scale), normalized);
  const rotated = tabletopMat4Multiply(mat4RotationY(rotation), scaled);
  return tabletopMat4Multiply(
    mat4Translation(
      entity.x + entity.width / 2,
      finite(entity.elevation) + elevationOffset,
      entity.y + entity.height / 2,
    ),
    rotated,
  );
}

function modelKey(entity: TabletopEntity) {
  return entity.assetId ?? entity.assetUrl ?? entity.id;
}

function isModelEntity(entity: TabletopEntity) {
  const properties = objectValue(entity.properties);
  return (
    !entity.hidden &&
    properties.model_visible !== false &&
    tabletopMediaKind(properties.mime_type, entity.assetUrl) === "model" &&
    typeof entity.assetUrl === "string" &&
    entity.assetUrl.length > 0
  );
}

async function imageSource(image: TabletopGltfImage, signal?: AbortSignal) {
  let blob: Blob;
  if (image.bytes) blob = new Blob([image.bytes], { type: image.mimeType });
  else if (image.uri) {
    const response = await fetch(image.uri, { signal, credentials: "omit" });
    if (!response.ok) throw new Error("TABLETOP_3D_TEXTURE_FETCH_FAILED");
    blob = await response.blob();
  } else throw new Error("TABLETOP_3D_TEXTURE_MISSING");

  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const imageElement = new Image();
    imageElement.crossOrigin = "anonymous";
    imageElement.src = url;
    await imageElement.decode();
    return imageElement;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createTexture(
  gl: WebGL2RenderingContext,
  image: TabletopGltfImage | undefined,
  signal?: AbortSignal,
) {
  if (!image) return null;
  try {
    const source = await imageSource(image, signal);
    const texture = gl.createTexture();
    if (!texture) return null;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    if ("close" in source && typeof source.close === "function") source.close();
    return texture;
  } catch {
    return null;
  }
}

function gpuPrimitive(gl: WebGL2RenderingContext, primitive: TabletopGltfPrimitive): GpuPrimitive {
  return {
    position: createBuffer(gl, gl.ARRAY_BUFFER, primitive.positions),
    normal: primitive.normals ? createBuffer(gl, gl.ARRAY_BUFFER, primitive.normals) : undefined,
    uv: primitive.uvs ? createBuffer(gl, gl.ARRAY_BUFFER, primitive.uvs) : undefined,
    color: primitive.colors ? createBuffer(gl, gl.ARRAY_BUFFER, primitive.colors) : undefined,
    colorComponents: primitive.colorComponents ?? 4,
    joints: primitive.joints ? createBuffer(gl, gl.ARRAY_BUFFER, primitive.joints) : undefined,
    weights: primitive.weights ? createBuffer(gl, gl.ARRAY_BUFFER, primitive.weights) : undefined,
    indices: primitive.indices ? createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, primitive.indices) : undefined,
    count: primitive.indices?.length ?? primitive.vertexCount,
    materialIndex: primitive.materialIndex,
  };
}

async function gpuModel(
  gl: WebGL2RenderingContext,
  model: TabletopGltfModel,
  signal?: AbortSignal,
): Promise<GpuModel> {
  const textures: Array<WebGLTexture | null> = [];
  for (const texture of model.textures) {
    textures.push(await createTexture(gl, model.images[texture.source], signal));
  }
  return {
    source: model,
    meshes: model.meshes.map((mesh) =>
      mesh.primitives.map((primitive) => gpuPrimitive(gl, primitive)),
    ),
    textures,
  };
}

function deleteGpuModel(gl: WebGL2RenderingContext, model: GpuModel) {
  for (const mesh of model.meshes) {
    for (const primitive of mesh) {
      gl.deleteBuffer(primitive.position);
      if (primitive.normal) gl.deleteBuffer(primitive.normal);
      if (primitive.uv) gl.deleteBuffer(primitive.uv);
      if (primitive.color) gl.deleteBuffer(primitive.color);
      if (primitive.joints) gl.deleteBuffer(primitive.joints);
      if (primitive.weights) gl.deleteBuffer(primitive.weights);
      if (primitive.indices) gl.deleteBuffer(primitive.indices);
    }
  }
  for (const texture of model.textures) if (texture) gl.deleteTexture(texture);
}

function bindAttribute(
  gl: WebGL2RenderingContext,
  location: number,
  buffer: WebGLBuffer | undefined,
  size: number,
  fallback: [number, number, number, number],
) {
  if (buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  } else {
    gl.disableVertexAttribArray(location);
    gl.vertexAttrib4f(location, ...fallback);
  }
}

function materialFor(model: GpuModel, index: number | undefined): TabletopGltfMaterial {
  return (
    (index === undefined ? undefined : model.source.materials[index]) ?? {
      baseColorFactor: [1, 1, 1, 1],
      alphaMode: "OPAQUE",
      alphaCutoff: 0,
      doubleSided: false,
    }
  );
}

export class TabletopNativeModelRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly uniforms: Uniforms;
  private readonly maxJoints: number;
  private readonly models = new Map<string, ModelRecord>();
  private readonly abort = new AbortController();
  private previousHostPosition = "";

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "tadeon-tabletop-native-model-layer";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "6",
    });
    const computed = getComputedStyle(host);
    if (computed.position === "static") {
      this.previousHostPosition = host.style.position;
      host.style.position = "relative";
    }
    host.appendChild(this.canvas);
    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("TABLETOP_3D_WEBGL2_UNAVAILABLE");
    this.gl = gl;
    const uniformVectors = Number(gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)) || 256;
    this.maxJoints = Math.max(16, Math.min(64, Math.floor((uniformVectors - 32) / 4)));
    this.program = createProgram(gl, this.maxJoints);
    this.uniforms = {
      entityRoot: uniform(gl, this.program, "uEntityRoot"),
      nodeMatrix: uniform(gl, this.program, "uNodeMatrix"),
      useSkin: uniform(gl, this.program, "uUseSkin"),
      joints: gl.getUniformLocation(this.program, "uJoints[0]"),
      originPx: uniform(gl, this.program, "uOriginPx"),
      basisX: uniform(gl, this.program, "uBasisX"),
      basisZ: uniform(gl, this.program, "uBasisZ"),
      elevationPx: uniform(gl, this.program, "uElevationPx"),
      viewport: uniform(gl, this.program, "uViewport"),
      depthAxis: uniform(gl, this.program, "uDepthAxis"),
      depthScale: uniform(gl, this.program, "uDepthScale"),
      baseColor: uniform(gl, this.program, "uBaseColor"),
      useTexture: uniform(gl, this.program, "uUseTexture"),
      texture: uniform(gl, this.program, "uTexture"),
      useColor: uniform(gl, this.program, "uUseColor"),
      hasNormal: uniform(gl, this.program, "uHasNormal"),
      selected: uniform(gl, this.program, "uSelected"),
      alphaCutoff: uniform(gl, this.program, "uAlphaCutoff"),
    };
    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.texture, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  private ensureCanvasSize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.host.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.host.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
    return { width: this.host.clientWidth, height: this.host.clientHeight, ratio };
  }

  private requestModel(entity: TabletopEntity) {
    const key = modelKey(entity);
    const url = entity.assetUrl;
    if (!url) return;
    let record = this.models.get(key);
    if (record?.url === url && (record.gpu || record.pending || record.failed)) return;
    if (record?.gpu) deleteGpuModel(this.gl, record.gpu);
    record = { url };
    this.models.set(key, record);
    record.pending = (async () => {
      try {
        const cpu = await loadTabletopGltf(url, this.abort.signal);
        if (this.abort.signal.aborted) return;
        const gpu = await gpuModel(this.gl, cpu, this.abort.signal);
        if (this.abort.signal.aborted) {
          deleteGpuModel(this.gl, gpu);
          return;
        }
        const current = this.models.get(key);
        if (!current || current.url !== url) {
          deleteGpuModel(this.gl, gpu);
          return;
        }
        current.cpu = cpu;
        current.gpu = gpu;
        current.pending = undefined;
      } catch {
        const current = this.models.get(key);
        if (current?.url === url) {
          current.failed = true;
          current.pending = undefined;
        }
      }
    })();
  }

  preload(snapshot: TabletopSnapshot) {
    for (const entity of snapshot.scene.entities) {
      if (isModelEntity(entity)) this.requestModel(entity);
    }
  }

  private cameraUniforms(runtime: TabletopBrowserRuntime, snapshot: TabletopSnapshot) {
    const hostRect = this.host.getBoundingClientRect();
    const originClient = runtime.worldToClient({ x: 0, y: 0 });
    const xClient = runtime.worldToClient({ x: 1, y: 0 });
    const zClient = runtime.worldToClient({ x: 0, y: 1 });
    const view = runtime.view();
    const basisX: [number, number] = [
      xClient.x - originClient.x,
      xClient.y - originClient.y,
    ];
    const basisZ: [number, number] = [
      zClient.x - originClient.x,
      zClient.y - originClient.y,
    ];
    const depthLength = Math.hypot(basisX[1], basisZ[1]) || 1;
    const depthAxis: [number, number] = [
      basisX[1] / depthLength,
      basisZ[1] / depthLength,
    ];
    const maxDimension = Math.max(snapshot.scene.width, snapshot.scene.height, 512);
    return {
      origin: [originClient.x - hostRect.left, originClient.y - hostRect.top] as [number, number],
      basisX,
      basisZ,
      elevationPx:
        view.projection === "isometric"
          ? view.zoom * view.orientation.elevationScale
          : 0,
      depthAxis,
      depthScale: 0.42 / maxDimension,
    };
  }

  private animationIndex(entity: TabletopEntity, model: TabletopGltfModel) {
    if (!model.animations.length) return -1;
    const properties = objectValue(entity.properties);
    const requestedName = typeof properties.model_animation_name === "string"
      ? properties.model_animation_name.trim().toLowerCase()
      : "";
    if (requestedName) {
      const byName = model.animations.findIndex(
        (animation) => animation.name.toLowerCase() === requestedName,
      );
      if (byName >= 0) return byName;
    }
    return Math.max(
      0,
      Math.min(
        model.animations.length - 1,
        Math.trunc(finite(properties.model_animation, 0)),
      ),
    );
  }

  private animationTime(entity: TabletopEntity, seconds: number) {
    const properties = objectValue(entity.properties);
    if (properties.model_animation_paused === true)
      return Math.max(0, finite(properties.model_animation_time, 0));
    const speed = clamp(finite(properties.model_animation_speed, 1), 0.05, 4);
    return Math.max(0, seconds * speed + finite(properties.model_animation_offset, 0));
  }

  private drawPrimitive(
    model: GpuModel,
    primitive: GpuPrimitive,
    nodeMatrix: TabletopMat4,
    entityRoot: TabletopMat4,
    skinMatrices: TabletopMat4[],
    selected: boolean,
  ) {
    const gl = this.gl;
    const material = materialFor(model, primitive.materialIndex);
    bindAttribute(gl, 0, primitive.position, 3, [0, 0, 0, 1]);
    bindAttribute(gl, 1, primitive.normal, 3, [0, 1, 0, 0]);
    bindAttribute(gl, 2, primitive.uv, 2, [0, 0, 0, 1]);
    bindAttribute(gl, 3, primitive.color, primitive.colorComponents, [1, 1, 1, 1]);
    bindAttribute(gl, 4, primitive.joints, 4, [0, 0, 0, 0]);
    bindAttribute(gl, 5, primitive.weights, 4, [1, 0, 0, 0]);

    const canSkin =
      skinMatrices.length > 0 &&
      skinMatrices.length <= this.maxJoints &&
      primitive.joints !== undefined &&
      primitive.weights !== undefined &&
      this.uniforms.joints !== null;
    gl.uniformMatrix4fv(this.uniforms.entityRoot, false, entityRoot);
    gl.uniformMatrix4fv(this.uniforms.nodeMatrix, false, canSkin ? tabletopMat4Identity() : nodeMatrix);
    gl.uniform1i(this.uniforms.useSkin, canSkin ? 1 : 0);
    if (canSkin && this.uniforms.joints) {
      const flattened = new Float32Array(this.maxJoints * 16);
      for (let index = 0; index < this.maxJoints; index += 1) {
        flattened.set(skinMatrices[index] ?? tabletopMat4Identity(), index * 16);
      }
      gl.uniformMatrix4fv(this.uniforms.joints, false, flattened);
    }

    gl.uniform4fv(this.uniforms.baseColor, material.baseColorFactor);
    const textureIndex = material.baseColorTexture;
    const texture = textureIndex === undefined ? null : model.textures[textureIndex] ?? null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uniforms.useTexture, texture && primitive.uv ? 1 : 0);
    gl.uniform1i(this.uniforms.useColor, primitive.color ? 1 : 0);
    gl.uniform1i(this.uniforms.hasNormal, primitive.normal ? 1 : 0);
    gl.uniform1i(this.uniforms.selected, selected ? 1 : 0);
    gl.uniform1f(
      this.uniforms.alphaCutoff,
      material.alphaMode === "MASK" ? material.alphaCutoff : 0.001,
    );
    if (material.doubleSided) gl.disable(gl.CULL_FACE);
    else {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    }

    if (primitive.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices);
      gl.drawElements(gl.TRIANGLES, primitive.count, gl.UNSIGNED_INT, 0);
    } else {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, primitive.count);
    }
  }

  render(runtime: TabletopBrowserRuntime, snapshot: TabletopSnapshot, timeMs: number) {
    const dimensions = this.ensureCanvasSize();
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const entities = snapshot.scene.entities.filter(
      (entity) =>
        isModelEntity(entity) &&
        (!snapshot.activeLevelId || !entity.levelId || entity.levelId === snapshot.activeLevelId),
    );
    if (!entities.length) return;
    for (const entity of entities) this.requestModel(entity);

    const camera = this.cameraUniforms(runtime, snapshot);
    const ratio = dimensions.ratio;
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.originPx, camera.origin[0] * ratio, camera.origin[1] * ratio);
    gl.uniform2f(this.uniforms.basisX, camera.basisX[0] * ratio, camera.basisX[1] * ratio);
    gl.uniform2f(this.uniforms.basisZ, camera.basisZ[0] * ratio, camera.basisZ[1] * ratio);
    gl.uniform1f(this.uniforms.elevationPx, camera.elevationPx * ratio);
    gl.uniform2f(this.uniforms.viewport, dimensions.width * ratio, dimensions.height * ratio);
    gl.uniform2f(this.uniforms.depthAxis, camera.depthAxis[0], camera.depthAxis[1]);
    gl.uniform1f(this.uniforms.depthScale, camera.depthScale);

    const selected = new Set(snapshot.selectedIds);
    const seconds = timeMs / 1000;
    for (const entity of entities) {
      const record = this.models.get(modelKey(entity));
      const gpu = record?.gpu;
      if (!gpu) continue;
      const model = gpu.source;
      const animationIndex = this.animationIndex(entity, model);
      const matrices = tabletopAnimatedNodeMatrices(
        model,
        animationIndex,
        this.animationTime(entity, seconds),
      );
      const entityRoot = entityRootMatrix(entity, model);
      for (let nodeIndex = 0; nodeIndex < model.nodes.length; nodeIndex += 1) {
        const node = model.nodes[nodeIndex];
        if (node.meshIndex === undefined) continue;
        const mesh = gpu.meshes[node.meshIndex];
        if (!mesh) continue;
        const skinMatrices = node.skinIndex === undefined
          ? []
          : tabletopSkinMatrices(model, node.skinIndex, matrices);
        for (const primitive of mesh) {
          this.drawPrimitive(
            gpu,
            primitive,
            matrices[nodeIndex] ?? tabletopMat4Identity(),
            entityRoot,
            skinMatrices,
            selected.has(entity.id),
          );
        }
      }
    }
  }

  destroy() {
    this.abort.abort();
    const gl = this.gl;
    for (const record of this.models.values()) {
      if (record.gpu) deleteGpuModel(gl, record.gpu);
    }
    this.models.clear();
    gl.deleteProgram(this.program);
    this.canvas.remove();
    if (this.previousHostPosition !== "") this.host.style.position = this.previousHostPosition;
  }
}
