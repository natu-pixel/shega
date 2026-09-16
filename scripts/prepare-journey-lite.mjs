/**
 * Prepare lower-memory alternates without modifying the original scene assets.
 * Generate: node scripts\prepare-journey-lite.mjs
 * Uses project Sharp and Three's bundled MeshoptSimplifier; no downloads,
 * external tool installation, environment variables, or temporary paths.
 * Inspection only: append --inspect. Verify existing outputs: append --verify.
 * Workers run sequentially in fresh, bounded heaps; Sharp uses one native thread.
 * Performer geometry, rigs, clips, scene metadata and authored material settings
 * are copied unchanged. Only the over-budget meat mesh is simplified.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(import.meta.url);
const project = path.resolve(path.dirname(script), "..");
const directory = path.join(project, "public", "models", "lite");
const require = createRequire(import.meta.url);
const SOURCES = [
  { id: "acacia-single", source: "/models/acacia-single.glb", size: 512, budget: 20000 },
  { id: "meat", source: "/models/meat.glb", size: 512, budget: 15000, target: 14000 },
  { id: "grill", source: "/models/grill.glb", size: 256, budget: 12000 },
  { id: "guitarist", source: "/models/guitarist.glb", size: 768, performer: true },
  { id: "fighter", source: "/fighter.glb", size: 768, performer: true },
];
const sourcePath = (source) => path.join(project, "public", ...source.source.split("/").filter(Boolean));
const outputPath = (source) => path.join(directory, `${source.id}.glb`);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const arrayBytes = (array) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const aligned = (size) => Math.ceil(size / 4) * 4;

function readContainer(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "Expected GLB container.");
  assert.equal(bytes.readUInt32LE(4), 2, "Expected glTF 2.0.");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "Truncated GLB.");
  const jsonSize = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "Missing JSON chunk.");
  const json = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
  const binaryStart = 28 + jsonSize;
  assert.equal(bytes.readUInt32LE(binaryStart - 4), 0x004e4942, "Missing BIN chunk.");
  assert.equal(json.buffers.length, 1, "External buffers are not supported.");
  assert(!json.buffers[0].uri, "External buffer URI is not supported.");
  const binary = bytes.subarray(binaryStart, binaryStart + json.buffers[0].byteLength);
  const views = json.bufferViews.map((view) => {
    assert.equal(view.buffer, 0);
    const start = view.byteOffset || 0;
    assert(start + view.byteLength <= binary.length, "Buffer view exceeds BIN.");
    return binary.subarray(start, start + view.byteLength);
  });
  return { json, views };
}

function visitBufferViews(value, visit) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "bufferView") value[key] = visit(child);
    else visitBufferViews(child, visit);
  }
}

function writeContainer(container) {
  const { json, views } = container;
  const used = new Set();
  visitBufferViews(json, (index) => { used.add(index); return index; });
  const mapping = new Map();
  const outputViews = [];
  let length = 0;
  for (const [index, view] of json.bufferViews.entries()) {
    if (!used.has(index)) continue;
    mapping.set(index, outputViews.length);
    outputViews.push({ ...view, byteOffset: length, byteLength: views[index].length });
    length += aligned(views[index].length);
  }
  const binary = Buffer.alloc(length);
  for (const [oldIndex, newIndex] of mapping) views[oldIndex].copy(binary, outputViews[newIndex].byteOffset);
  visitBufferViews(json, (index) => {
    assert(mapping.has(index), `Missing buffer view ${index}.`);
    return mapping.get(index);
  });
  json.bufferViews = outputViews;
  json.buffers[0].byteLength = binary.length;
  const text = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(aligned(text.length), 0x20);
  text.copy(jsonChunk);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + binary.length, 8);
  header.writeUInt32LE(jsonChunk.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(binary.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonChunk, binaryHeader, binary]);
}

function triangleCount(json) {
  return json.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((count, primitive) => {
    assert.equal(primitive.mode ?? 4, 4, "Only triangle primitives are supported.");
    return count + json.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
  }, 0), 0);
}

function mipBytes(width, height) {
  let bytes = 0;
  do {
    bytes += width * height * 4;
    if (width === 1 && height === 1) return bytes;
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
  } while (true);
}

async function textureStats(container, sharp, decode = false) {
  const images = [];
  for (const [index, image] of container.json.images.entries()) {
    const bytes = container.views[image.bufferView];
    const { width, height } = await sharp(bytes).metadata();
    assert(width && height, "Texture dimensions are missing.");
    if (decode) {
      const { info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, width);
      assert.equal(info.height, height);
      assert.equal(info.channels, 4);
    }
    images.push({
      index, name: image.name || "", mimeType: image.mimeType, width, height,
      fileBytes: bytes.length, decodedRGBABytes: width * height * 4,
      decodedRGBAWithMipmapsBytes: mipBytes(width, height),
    });
  }
  return {
    images,
    decodedRGBABytes: images.reduce((sum, image) => sum + image.decodedRGBABytes, 0),
    decodedRGBAWithMipmapsBytes: images.reduce((sum, image) => sum + image.decodedRGBAWithMipmapsBytes, 0),
  };
}

async function resizeTextures(container, size, sharp) {
  const duplicates = new Map();
  for (const image of container.json.images) {
    const bytes = await sharp(container.views[image.bufferView])
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ lossless: true, effort: 4 })
      .toBuffer();
    const digest = hash(bytes);
    if (duplicates.has(digest)) image.bufferView = duplicates.get(digest);
    else {
      container.views[image.bufferView] = bytes;
      duplicates.set(digest, image.bufferView);
    }
    image.mimeType = "image/webp";
  }
  for (const texture of container.json.textures) {
    const source = texture.source ?? texture.extensions?.EXT_texture_webp?.source;
    assert(source !== undefined, "Unsupported texture source extension.");
    texture.extensions = { ...texture.extensions, EXT_texture_webp: { source } };
    delete texture.source;
  }
  for (const key of ["extensionsUsed", "extensionsRequired"]) {
    container.json[key] = [...new Set([...(container.json[key] || []), "EXT_texture_webp"])];
  }
}

function extremaLocks(positions, worldMatrix) {
  const locks = new Uint8Array(positions.length / 3);
  for (const matrix of [null, worldMatrix]) {
    for (let axis = 0; axis < 3; axis++) {
      let min = Infinity, max = -Infinity, minIndex = 0, maxIndex = 0;
      for (let vertex = 0; vertex < locks.length; vertex++) {
        const i = vertex * 3;
        const value = matrix
          ? positions[i] * matrix[axis] + positions[i + 1] * matrix[axis + 4]
            + positions[i + 2] * matrix[axis + 8] + matrix[axis + 12]
          : positions[i + axis];
        if (value < min) { min = value; minIndex = vertex; }
        if (value > max) { max = value; maxIndex = vertex; }
      }
      locks[minIndex] = locks[maxIndex] = 1;
    }
  }
  return locks;
}

function readAccessor(container, index) {
  const definition = container.json.accessors[index];
  const types = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const Type = types[definition.componentType];
  const bytes = accessorBytes(container, definition);
  const array = new Type(bytes.buffer, bytes.byteOffset, bytes.length / Type.BYTES_PER_ELEMENT);
  return { array, width: array.length / definition.count };
}

function replaceAccessor(container, index, array, width, componentType) {
  const definition = container.json.accessors[index];
  const previousView = container.json.bufferViews[definition.bufferView];
  const bytes = arrayBytes(array);
  definition.bufferView = container.views.length;
  definition.componentType = componentType ?? definition.componentType;
  definition.count = array.length / width;
  delete definition.byteOffset;
  delete definition.sparse;
  if (definition.min || definition.max) {
    const min = Array(width).fill(Infinity);
    const max = Array(width).fill(-Infinity);
    for (let i = 0; i < array.length; i++) {
      min[i % width] = Math.min(min[i % width], array[i]);
      max[i % width] = Math.max(max[i % width], array[i]);
    }
    if (definition.min) definition.min = min;
    if (definition.max) definition.max = max;
  }
  const view = { ...previousView, buffer: 0, byteLength: bytes.length };
  delete view.byteOffset;
  delete view.byteStride;
  container.json.bufferViews.push(view);
  container.views.push(bytes);
}

async function simplifyMeat(container, bytes, source) {
  const { MeshoptSimplifier } = await import("three/addons/libs/meshopt_simplifier.module.js");
  await MeshoptSimplifier.ready;
  const runtime = await loadRuntime(bytes);
  runtime.scene.updateMatrixWorld(true);
  const initialTriangles = triangleCount(container.json);
  const meshes = container.json.meshes;
  const reports = [];
  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
    const mesh = meshes[meshIndex];
    const nodeIndex = container.json.nodes.findIndex((entry) => entry.mesh === meshIndex);
    assert(nodeIndex >= 0, "Simplified mesh must have a scene node.");
    const node = await runtime.parser.getDependency("node", nodeIndex);
    for (const definition of mesh.primitives) {
      const indices = readAccessor(container, definition.indices).array;
      const before = indices.length / 3;
      const target = Math.max(8, Math.floor(source.target * before / initialTriangles));
      const positions = readAccessor(container, definition.attributes.POSITION).array;
      const locks = extremaLocks(positions, node.matrixWorld.elements);
      const channels = ["NORMAL", "TEXCOORD_0", "TEXCOORD_1"]
        .filter((name) => definition.attributes[name] !== undefined)
        .map((name) => readAccessor(container, definition.attributes[name]));
      const stride = channels.reduce((sum, channel) => sum + channel.width, 0);
      const attributes = new Float32Array(positions.length / 3 * stride);
      const weights = [];
      let offset = 0;
      for (const channel of channels) {
        const width = channel.width;
        weights.push(...Array(width).fill(width === 3 ? 0.015 : 0.05));
        for (let i = 0; i < positions.length / 3; i++) {
          attributes.set(channel.array.subarray(i * width, (i + 1) * width), i * stride + offset);
        }
        offset += width;
      }
      let measuredError;
      const simplifier = {
        simplify(indices, vertices, positionStride, targetCount) {
          for (const permissive of [false, true]) {
            for (const error of [0.02, 0.04, 0.08]) {
              const result = MeshoptSimplifier.simplifyWithAttributes(
                indices, vertices, positionStride, attributes, stride, weights,
                locks, targetCount, error, permissive ? ["Permissive"] : [],
              );
              if (result[0].length <= targetCount + 3) {
                measuredError = result[1];
                return result;
              }
            }
          }
          throw new Error(`Cannot meet ${source.id} geometry budget without excessive error.`);
        },
      };
      const [simplified] = simplifier.simplify(new Uint32Array(indices), positions, 3, target * 3);
      const [remap, vertexCount] = MeshoptSimplifier.compactMesh(simplified);
      const compactIndices = vertexCount <= 65534 ? new Uint16Array(simplified) : simplified;
      replaceAccessor(container, definition.indices, compactIndices, 1, vertexCount <= 65534 ? 5123 : 5125);
      for (const index of Object.values(definition.attributes)) {
        const { array, width } = readAccessor(container, index);
        const compacted = new array.constructor(vertexCount * width);
        for (let vertex = 0; vertex < remap.length; vertex++) {
          if (remap[vertex] >= vertexCount) continue;
          compacted.set(array.subarray(vertex * width, (vertex + 1) * width), remap[vertex] * width);
        }
        replaceAccessor(container, index, compacted, width);
      }
      reports.push({ mesh: meshIndex, before, after: simplified.length / 3, measuredError });
    }
  }
  disposeRuntime(runtime);
  assert(triangleCount(container.json) <= source.budget, "Static triangle budget exceeded.");
  return reports;
}

function accessorBytes(container, accessor) {
  assert(!accessor.sparse, "Sparse accessors need an explicit verification path.");
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  const widths = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const size = components[accessor.type] * widths[accessor.componentType];
  const stride = container.json.bufferViews[accessor.bufferView].byteStride || size;
  const bytes = container.views[accessor.bufferView];
  const offset = accessor.byteOffset || 0;
  if (stride === size) return bytes.subarray(offset, offset + size * accessor.count);
  const packed = Buffer.alloc(accessor.count * size);
  for (let i = 0; i < accessor.count; i++) bytes.copy(packed, i * size, offset + i * stride, offset + i * stride + size);
  return packed;
}

function verifyUnchanged(source, output, geometryChanged) {
  for (const field of ["asset", "nodes", "scenes", "scene", "skins", "animations", "meshes", "materials", "samplers", "extras"]) {
    assert.deepEqual(output.json[field], source.json[field], `Authored ${field} changed.`);
  }
  assert.equal(output.json.accessors.length, source.json.accessors.length);
  let exactAccessors = 0;
  for (let index = 0; index < source.json.accessors.length; index++) {
    if (geometryChanged) break;
    const original = source.json.accessors[index];
    const prepared = output.json.accessors[index];
    const logical = (accessor) => {
      const copy = { ...accessor };
      delete copy.bufferView;
      delete copy.byteOffset;
      return copy;
    };
    assert.deepEqual(logical(prepared), logical(original), `Accessor ${index} metadata changed.`);
    assert.equal(hash(accessorBytes(source, original)), hash(accessorBytes(output, prepared)), `Accessor ${index} data changed.`);
    exactAccessors++;
  }
  assert.equal(output.json.textures.length, source.json.textures.length);
  for (let index = 0; index < source.json.textures.length; index++) {
    const original = source.json.textures[index];
    const prepared = structuredClone(output.json.textures[index]);
    const image = prepared.extensions.EXT_texture_webp.source;
    delete prepared.extensions.EXT_texture_webp;
    if (!Object.keys(prepared.extensions).length) delete prepared.extensions;
    prepared.source = image;
    assert.deepEqual(prepared, original, `Texture ${index} material/sampler mapping changed.`);
  }
  return exactAccessors;
}

async function loadRuntime(bytes) {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  // Sharp validates real image decodes separately. Offline GLTFLoader only needs
  // skeletons, matrices, materials and accessor arrays, not browser image APIs.
  for (const name of ["OFFLINE_TEXTURE_STUB", "EXT_texture_webp"]) {
    loader.register(() => ({ name, loadTexture: async () => {
      const texture = new THREE.Texture();
      texture.flipY = false;
      return texture;
    } }));
  }
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  return { THREE, ...gltf };
}

function runtimeBounds(runtime) {
  const { THREE, scene } = runtime;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const vertex = new THREE.Vector3();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    if (object.isSkinnedMesh) object.skeleton.update();
    for (let i = 0; i < object.geometry.getAttribute("position").count; i++) {
      object.getVertexPosition(i, vertex).applyMatrix4(object.matrixWorld);
      box.expandByPoint(vertex);
    }
  });
  return { min: box.min.toArray(), max: box.max.toArray() };
}

function matrixHash(runtime) {
  runtime.scene.updateMatrixWorld(true);
  const digest = createHash("sha256");
  runtime.scene.traverse((node) => digest.update(arrayBytes(new Float64Array(node.matrixWorld.elements))));
  return digest.digest("hex");
}

function disposeRuntime(runtime) {
  runtime.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
}

async function verifyRuntime(sourceBytes, outputBytes, source) {
  const original = await loadRuntime(sourceBytes);
  const output = await loadRuntime(outputBytes);
  const sourceBounds = runtimeBounds(original);
  const outputBounds = runtimeBounds(output);
  let maxBoundsDelta = 0;
  for (const side of ["min", "max"]) {
    for (let axis = 0; axis < 3; axis++) {
      maxBoundsDelta = Math.max(maxBoundsDelta, Math.abs(sourceBounds[side][axis] - outputBounds[side][axis]));
    }
  }
  assert(maxBoundsDelta < 0.00001, `Source bounds changed by ${maxBoundsDelta}.`);
  assert.equal(matrixHash(output), matrixHash(original), "Rest node transforms changed.");
  let sampledClips = 0;
  const clipSamples = [];
  assert.equal(output.animations.length, original.animations.length);
  for (const [index, clip] of original.animations.entries()) {
    const prepared = output.animations[index];
    assert.equal(prepared.name, clip.name);
    assert.equal(prepared.duration, clip.duration);
    assert.equal(prepared.tracks.length, clip.tracks.length);
    for (const [trackIndex, track] of clip.tracks.entries()) {
      const nextTrack = prepared.tracks[trackIndex];
      assert.equal(nextTrack.name, track.name);
      assert.equal(nextTrack.getInterpolation(), track.getInterpolation());
      assert.deepEqual(nextTrack.times, track.times);
      assert.deepEqual(nextTrack.values, track.values);
    }
    const mixerA = new original.THREE.AnimationMixer(original.scene);
    const mixerB = new output.THREE.AnimationMixer(output.scene);
    mixerA.clipAction(clip).play();
    mixerB.clipAction(prepared).play();
    const times = [0, clip.duration * 0.25, clip.duration * 0.5, clip.duration * 0.75, Math.max(0, clip.duration - 0.000001)];
    for (const time of times) {
      mixerA.setTime(time);
      mixerB.setTime(time);
      assert.equal(matrixHash(output), matrixHash(original), `${source.id} animation matrices changed at ${time}.`);
      assert.deepEqual(runtimeBounds(output), runtimeBounds(original), `${source.id} skinned pose changed at ${time}.`);
    }
    mixerA.stopAllAction(); mixerB.stopAllAction();
    mixerA.uncacheRoot(original.scene); mixerB.uncacheRoot(output.scene);
    clipSamples.push({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length, times });
    sampledClips++;
  }
  disposeRuntime(original);
  disposeRuntime(output);
  return {
    gltfLoader: "passed", imageDecode: "passed", exactNodeMetadata: true,
    sourceBounds, outputBounds, maxBoundsDelta, sampledClips, clipSamples,
  };
}

async function worker(source, mode) {
  const sharp = require("sharp");
  sharp.cache(false);
  sharp.concurrency(1);
  const originalBytes = await fs.readFile(sourcePath(source));
  const original = readContainer(originalBytes);
  const before = {
    fileBytes: originalBytes.length, triangles: triangleCount(original.json),
    ...await textureStats(original, sharp),
  };
  if (mode === "--inspect") {
    console.log(JSON.stringify({ id: source.id, source: source.source, attribution: original.json.asset.extras, before }, null, 2));
    return;
  }
  let geometry = [];
  if (mode !== "--verify") {
    const prepared = readContainer(originalBytes);
    if (source.target && before.triangles > source.budget) geometry = await simplifyMeat(prepared, originalBytes, source);
    await resizeTextures(prepared, source.size, sharp);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(outputPath(source), writeContainer(prepared));
  }
  const outputBytes = await fs.readFile(outputPath(source));
  const output = readContainer(outputBytes);
  const geometryChanged = triangleCount(output.json) !== before.triangles;
  assert(!source.performer || !geometryChanged, "Performer geometry cannot be simplified.");
  const exactAccessors = verifyUnchanged(original, output, geometryChanged);
  const after = {
    fileBytes: outputBytes.length, triangles: triangleCount(output.json),
    ...await textureStats(output, sharp, true),
  };
  assert(after.images.every((image) => Math.max(image.width, image.height) <= source.size), "Texture budget exceeded.");
  assert(after.fileBytes < before.fileBytes, "File size did not improve.");
  assert(after.decodedRGBABytes < before.decodedRGBABytes, "Decoded GPU texture memory did not improve.");
  if (source.budget) assert(after.triangles <= source.budget, "Geometry budget exceeded.");
  const runtime = await verifyRuntime(originalBytes, outputBytes, source);
  const report = {
    file: `/models/lite/${source.id}.glb`, original: source.source,
    attribution: original.json.asset.extras,
    sourceAssetMetadata: original.json.asset,
    changes: [
      `Textures resized to at most ${source.size}px, preserving aspect ratio; lossless WebP encoding with unchanged material/UV mapping.`,
      geometryChanged
        ? "Static mesh simplified with authored normals/UVs retained and local/world bounds extrema locked; scene transforms and names unchanged."
        : "All geometry and accessor arrays copied byte-for-byte; node hierarchy, names, skins, animation keys and original metadata unchanged.",
    ],
    sourceSHA256: hash(originalBytes), outputSHA256: hash(outputBytes),
    before, after, geometry,
    verification: { ...runtime, exactAccessors, performerGeometryAndAnimationUnchanged: source.performer ? true : undefined },
  };
  if (mode !== "--verify") await fs.writeFile(path.join(directory, `${source.id}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${source.id}: ${before.triangles.toLocaleString()} -> ${after.triangles.toLocaleString()} tris; `
    + `${before.fileBytes} -> ${after.fileBytes} file bytes; `
    + `${before.decodedRGBAWithMipmapsBytes} -> ${after.decodedRGBAWithMipmapsBytes} decoded RGBA+mip bytes; verification passed.`);
}

async function main() {
  const workerId = process.argv.find((argument) => argument.startsWith("--worker="))?.split("=")[1];
  const mode = process.argv.includes("--inspect") ? "--inspect" : process.argv.includes("--verify") ? "--verify" : "--generate";
  if (workerId) {
    const source = SOURCES.find((entry) => entry.id === workerId);
    assert(source, `Unknown asset ${workerId}.`);
    await worker(source, mode);
    return;
  }
  for (const source of SOURCES) {
    const result = spawnSync(process.execPath, [
      "--max-old-space-size=384", "--max-semi-space-size=4", "--v8-pool-size=1",
      script, `--worker=${source.id}`, mode,
    ], {
      cwd: project, stdio: "inherit",
      env: { ...process.env, UV_THREADPOOL_SIZE: "1", VIPS_CONCURRENCY: "1", MALLOC_ARENA_MAX: "2" },
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${source.id} worker failed (${result.signal || result.status}); do not increase memory limits on a shared machine.`);
  }
  if (mode !== "--generate") return;
  const assets = [];
  for (const source of SOURCES) assets.push(JSON.parse(await fs.readFile(path.join(directory, `${source.id}.report.json`), "utf8")));
  const total = (period, key) => assets.reduce((sum, asset) => sum + asset[period][key], 0);
  const manifest = {
    description: "Lightweight local alternatives for the cinematic journey. Originals remain available for higher detail.",
    generator: "scripts\\prepare-journey-lite.mjs",
    originalAttributionManifest: "/models/scene-models.attribution.json",
    license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    memoryEstimate: "Unique embedded images, decoded as RGBA8. Mip estimate sums each level down to 1x1; excludes driver alignment, duplicate texture instances, geometry, framebuffer and renderer overhead. WebP only reduces transfer bytes; resized dimensions provide GPU-memory savings.",
    totals: Object.fromEntries(["before", "after"].map((period) => [period, Object.fromEntries(
      ["fileBytes", "triangles", "decodedRGBABytes", "decodedRGBAWithMipmapsBytes"].map((key) => [key, total(period, key)]),
    )])),
    assets,
  };
  await fs.writeFile(path.join(directory, "attribution.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest.totals, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
