/**
 * Externalize the original hero images without decoding/re-encoding geometry or images.
 * node scripts\prepare-shared-people.mjs
 * node scripts\prepare-shared-people.mjs --verify
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODELS = path.join(ROOT, "public", "models");
const OUTPUT = path.join(MODELS, "shared-people");
const PROFILES = {
  hero: {
    file: "festival-people-hero.glb",
    sha256: "47e61451881f5748a5ded8357ec5ac1e101f5b6779ee8de680ffe84073c8790b",
    trianglesPerPose: 24000,
    glbBytes: 6_150_000,
  },
  standard: {
    file: "festival-people.glb",
    sha256: "c8987a59a8ab3ae1ed570a378b3ce51b2cce778707dd8fbdd536e3fefa5ca8d5",
    trianglesPerPose: 5000,
    glbBytes: 1_700_000,
  },
};
const BUDGETS = {
  sharedImages: 10,
  sharedTextureBytes: 5_100_000,
  sharedDecodedRgbaMipBytes: 40_000_000,
  combinedAssetBytes: 13_000_000,
  posesPerProfile: 12,
};
const SLOT_COLOR_SPACE = {
  "pbrMetallicRoughness.baseColorTexture": "srgb",
  "pbrMetallicRoughness.metallicRoughnessTexture": "linear",
  normalTexture: "linear",
  occlusionTexture: "linear",
  emissiveTexture: "srgb",
};
const FORMATS = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
};
const ANCHORS = ["leftHand", "rightHand", "head", "headTop", "chest", "forward"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const align4 = (value) => Math.ceil(value / 4) * 4;
const clone = (value) => structuredClone(value);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function parseGlb(bytes, label) {
  assert(bytes.length >= 28, `${label}: truncated GLB`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${label}: GLB magic`);
  assert.equal(bytes.readUInt32LE(4), 2, `${label}: GLB version`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${label}: GLB length`);
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length, `${label}: truncated chunk header`);
    const length = bytes.readUInt32LE(offset);
    assert.equal(length % 4, 0, `${label}: chunk alignment`);
    assert(offset + 8 + length <= bytes.length, `${label}: truncated chunk`);
    chunks.push({ type: bytes.readUInt32LE(offset + 4), data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.deepEqual(chunks.map(({ type }) => type), [0x4e4f534a, 0x004e4942], `${label}: expected JSON and BIN only`);
  const json = JSON.parse(chunks[0].data.toString("utf8"));
  assert.equal(json.asset.version, "2.0", `${label}: glTF version`);
  assert.equal(json.buffers.length, 1, `${label}: expected one buffer`);
  assert.equal(json.buffers[0].uri, undefined, `${label}: external buffers unsupported`);
  const length = json.buffers[0].byteLength;
  assert(Number.isSafeInteger(length) && length > 0, `${label}: buffer length`);
  assert(length <= chunks[1].data.length && chunks[1].data.length - length < 4, `${label}: BIN length`);
  const bin = chunks[1].data.subarray(0, length);
  for (const [index, view] of json.bufferViews.entries()) {
    const offset = view.byteOffset ?? 0;
    assert.equal(view.buffer, 0, `${label}: bufferView ${index} buffer`);
    assert(Number.isSafeInteger(offset) && offset >= 0 && offset % 4 === 0, `${label}: bufferView ${index} offset`);
    assert(Number.isSafeInteger(view.byteLength) && view.byteLength > 0, `${label}: bufferView ${index} length`);
    assert(offset + view.byteLength <= bin.length, `${label}: bufferView ${index} bounds`);
    assert.equal(view.extensions, undefined, `${label}: compressed bufferViews unsupported`);
  }
  return { json, bin, bytes };
}

function writeGlb(json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(align4(jsonBytes.length), 0x20);
  jsonBytes.copy(jsonChunk);
  const binChunk = Buffer.alloc(align4(bin.length));
  bin.copy(binChunk);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + binChunk.length, 8);
  const chunkHeader = (length, type) => {
    const result = Buffer.alloc(8);
    result.writeUInt32LE(length, 0);
    result.writeUInt32LE(type, 4);
    return result;
  };
  return Buffer.concat([
    header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk,
    chunkHeader(binChunk.length, 0x004e4942), binChunk,
  ]);
}

function viewPayload(asset, index) {
  const view = asset.json.bufferViews[index];
  assert(view, `Missing bufferView ${index}`);
  const offset = view.byteOffset ?? 0;
  return asset.bin.subarray(offset, offset + view.byteLength);
}

function decodedMipBytes(width, height) {
  let bytes = 0;
  while (true) {
    bytes += width * height * 4;
    if (width === 1 && height === 1) return bytes;
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
  }
}

function imageSource(texture) {
  assert(texture, "Missing texture");
  const webp = texture.extensions?.EXT_texture_webp?.source;
  const source = webp ?? texture.source;
  assert(Number.isInteger(source) && source >= 0, "Texture has no image source");
  assert(webp === undefined || texture.source === undefined || texture.source === webp, "Ambiguous WebP fallback image");
  assert(Object.keys(texture.extensions ?? {}).every((key) => key === "EXT_texture_webp"), "Unsupported texture extension");
  return source;
}

function materialSlots(material) {
  const slots = [];
  function visit(value, prefix = "") {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "extras") continue;
      const slot = prefix ? `${prefix}.${key}` : key;
      if (key.endsWith("Texture")) {
        assert(Object.hasOwn(SLOT_COLOR_SPACE, slot), `Unsupported texture slot ${slot}`);
        assert(Number.isInteger(child.index) && child.index >= 0, `Invalid texture index in ${slot}`);
        assert(Object.keys(child.extensions ?? {}).every((name) => name === "KHR_texture_transform"), `Unsupported texture-info extension in ${slot}`);
        // GLTFParser.assignTexture clones for alternate UV channels or texture transforms.
        assert(child.texCoord === undefined || child.texCoord === 0, `${material.name}/${slot}: pooled textures require texCoord 0`);
        assert(!Object.hasOwn(child.extensions ?? {}, "KHR_texture_transform"), `${material.name}/${slot}: KHR_texture_transform is incompatible with clone-free texture pooling`);
        slots.push({ slot, info: child, colorSpace: SLOT_COLOR_SPACE[slot] });
      } else {
        visit(child, slot);
      }
    }
  }
  visit(material);
  return slots;
}

function materialIdentity(material) {
  const result = clone(material);
  for (const { info } of materialSlots(result)) delete info.index;
  return result;
}

function samplerSettings(asset, texture) {
  const sampler = texture.sampler === undefined ? {} : asset.json.samplers?.[texture.sampler];
  assert(sampler, "Missing sampler");
  assert(Object.keys(sampler).every((key) => ["magFilter", "minFilter", "wrapS", "wrapT", "name", "extras"].includes(key)), "Unsupported sampler setting");
  const settings = {
    magFilter: sampler.magFilter ?? 9729,
    minFilter: sampler.minFilter ?? 9987,
    wrapS: sampler.wrapS ?? 10497,
    wrapT: sampler.wrapT ?? 10497,
  };
  assert([9728, 9729].includes(settings.magFilter), "Invalid magFilter");
  assert([9728, 9729, 9984, 9985, 9986, 9987].includes(settings.minFilter), "Invalid minFilter");
  assert([33071, 33648, 10497].includes(settings.wrapS) && [33071, 33648, 10497].includes(settings.wrapT), "Invalid texture wrapping");
  return settings;
}

function usageSettings(asset, texture, slot) {
  return {
    sampler: samplerSettings(asset, texture),
    colorSpace: slot.colorSpace,
    texCoord: slot.info.extensions?.KHR_texture_transform?.texCoord ?? slot.info.texCoord ?? 0,
    transform: slot.info.extensions?.KHR_texture_transform ?? null,
  };
}

function textureKey(image, settings) {
  const { sampler, colorSpace, texCoord, transform } = settings;
  return `shega-shared-people:v1:${image.sha256}:mag${sampler.magFilter}:min${sampler.minFilter}:s${sampler.wrapS}:t${sampler.wrapT}:${colorSpace}:uv${texCoord}:transform${hash(canonical(transform))}`;
}

function staticGeometry(asset, profile) {
  const { json } = asset;
  assert.equal(json.skins?.length ?? 0, 0, `${profile}: unexpected skins`);
  assert.equal(json.animations?.length ?? 0, 0, `${profile}: unexpected animations`);
  assert.equal(json.nodes.length, BUDGETS.posesPerProfile, `${profile}: pose count`);
  assert.equal(json.meshes.length, BUDGETS.posesPerProfile, `${profile}: mesh count`);
  assert.equal(new Set(json.nodes.map(({ name }) => name)).size, json.nodes.length, `${profile}: duplicate pose names`);
  const poses = json.nodes.map((node) => {
    assert.equal(node.skin, undefined, `${profile}: skinned node`);
    for (const anchor of ANCHORS) {
      assert(Array.isArray(node.extras?.[anchor]) && node.extras[anchor].length === 3 && node.extras[anchor].every(Number.isFinite), `${profile}/${node.name}: invalid ${anchor}`);
    }
    const mesh = json.meshes[node.mesh];
    assert(mesh, `${profile}/${node.name}: missing mesh`);
    let triangles = 0;
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, `${profile}/${node.name}: non-triangles`);
      assert.equal(primitive.extensions, undefined, `${profile}: compressed geometry unsupported`);
      assert.equal(primitive.targets, undefined, `${profile}: morph targets unsupported`);
      assert(!Object.keys(primitive.attributes).some((name) => /^(JOINTS|WEIGHTS)_/.test(name)), `${profile}: skeletal attributes`);
      const accessor = json.accessors[primitive.indices ?? primitive.attributes.POSITION];
      assert(accessor && accessor.count % 3 === 0, `${profile}/${node.name}: triangle accessor`);
      triangles += accessor.count / 3;
    }
    assert(triangles <= PROFILES[profile].trianglesPerPose, `${profile}/${node.name}: triangle budget`);
    assert.equal(triangles, node.extras.triangles, `${profile}/${node.name}: pose triangle metadata`);
    return { name: node.name, triangles, extras: clone(node.extras) };
  });
  return {
    meshes: json.meshes.length,
    accessors: json.accessors.length,
    materials: json.materials.length,
    animations: 0,
    skins: 0,
    triangles: poses.reduce((sum, pose) => sum + pose.triangles, 0),
    maxTrianglesPerPose: Math.max(...poses.map(({ triangles }) => triangles)),
    poses,
  };
}

async function loadSource(profile) {
  const config = PROFILES[profile];
  const bytes = await fs.readFile(path.join(MODELS, config.file));
  assert.equal(hash(bytes), config.sha256, `${profile}: source checksum changed; refusing to alter the approved geometry/poses`);
  const asset = { ...parseGlb(bytes, profile), profile };
  asset.geometry = staticGeometry(asset, profile);
  const attributionFile = config.file.replace(".glb", ".attribution.json");
  const attributionBytes = await fs.readFile(path.join(MODELS, attributionFile));
  asset.attribution = JSON.parse(attributionBytes);
  asset.attributionSource = { file: `/models/${attributionFile}`, sha256: hash(attributionBytes) };
  assert.equal(asset.attribution.bytes, bytes.length, `${profile}: attribution size mismatch`);
  assert.equal(asset.attribution.profile, profile, `${profile}: attribution profile mismatch`);
  assert.deepEqual(asset.attribution.sources, asset.json.extras.sources, `${profile}: source credits mismatch`);
  assert.equal(asset.json.images.length, BUDGETS.sharedImages, `${profile}: image count`);
  asset.images = await Promise.all(asset.json.images.map(async (image, index) => {
    assert(Number.isInteger(image.bufferView), `${profile}: image ${index} is not embedded`);
    assert.equal(image.uri, undefined, `${profile}: unexpected source URI`);
    assert.equal(image.extensions, undefined, `${profile}: unsupported image extension`);
    const bytes = viewPayload(asset, image.bufferView);
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    const format = FORMATS[metadata.format];
    assert(format, `${profile}: unsupported image format ${metadata.format}`);
    assert.equal(image.mimeType, format.mimeType, `${profile}: image MIME mismatch`);
    assert.equal(metadata.pages ?? 1, 1, `${profile}: animated image unsupported`);
    const sha256 = hash(bytes);
    return {
      index, bytes, sha256, width: metadata.width, height: metadata.height,
      mimeType: format.mimeType, uri: `${sha256}.${format.extension}`,
      decodedRgbaMipBytes: decodedMipBytes(metadata.width, metadata.height),
    };
  }));
  assert.deepEqual(asset.images.map(({ width, height }) => `${width}x${height}`).sort(), [
    ...Array(6).fill("1024x1024"), ...Array(4).fill("512x512"),
  ].sort(), `${profile}: image dimension budget`);
  return asset;
}

function matchProfiles(hero, standard) {
  const records = [];
  const images = { hero: new Map(), standard: new Map() };
  const textures = { hero: new Map(), standard: new Map() };
  const materials = (asset) => {
    const result = new Map();
    asset.json.materials.forEach((material, index) => {
      assert(material.name && !result.has(material.name), `${asset.profile}: ambiguous material identity`);
      result.set(material.name, { material, index });
    });
    return result;
  };
  const heroMaterials = materials(hero);
  const standardMaterials = materials(standard);
  assert.deepEqual([...heroMaterials.keys()].sort(), [...standardMaterials.keys()].sort(), "Material identities differ");
  for (const [name, { material: heroMaterial, index: heroIndex }] of heroMaterials) {
    const { material: standardMaterial, index: standardIndex } = standardMaterials.get(name);
    assert.deepEqual(materialIdentity(heroMaterial), materialIdentity(standardMaterial), `${name}: material settings differ`);
    const standardSlots = new Map(materialSlots(standardMaterial).map((slot) => [slot.slot, slot]));
    const record = { material: name, heroMaterialIndex: heroIndex, standardMaterialIndex: standardIndex, slots: [] };
    for (const heroSlot of materialSlots(heroMaterial)) {
      const standardSlot = standardSlots.get(heroSlot.slot);
      assert(standardSlot, `${name}: missing ${heroSlot.slot}`);
      const heroTexture = hero.json.textures[heroSlot.info.index];
      const standardTexture = standard.json.textures[standardSlot.info.index];
      const heroImageIndex = imageSource(heroTexture);
      const standardImageIndex = imageSource(standardTexture);
      const heroImage = hero.images[heroImageIndex];
      const standardImage = standard.images[standardImageIndex];
      assert(heroImage && standardImage, `${name}: missing source image`);
      assert.deepEqual([heroImage.width, heroImage.height], [standardImage.width, standardImage.height], `${name}: image dimensions differ`);
      const settings = usageSettings(hero, heroTexture, heroSlot);
      assert.deepEqual(settings, usageSettings(standard, standardTexture, standardSlot), `${name}: sampler/color/UV usage differs`);
      const key = textureKey(heroImage, settings);
      for (const [asset, sourceImageIndex, slot] of [[hero, heroImageIndex, heroSlot], [standard, standardImageIndex, standardSlot]]) {
        const previousImage = images[asset.profile].get(sourceImageIndex);
        assert(previousImage === undefined || previousImage === heroImageIndex, `${name}: incompatible image slot sharing`);
        images[asset.profile].set(sourceImageIndex, heroImageIndex);
        const texture = { heroImageIndex, key, settings };
        const previousTexture = textures[asset.profile].get(slot.info.index);
        assert(!previousTexture || canonical(previousTexture) === canonical(texture), `${name}: incompatible texture slot sharing`);
        textures[asset.profile].set(slot.info.index, texture);
      }
      record.slots.push({
        slot: heroSlot.slot, heroTextureIndex: heroSlot.info.index, standardTextureIndex: standardSlot.info.index,
        heroImageIndex, standardImageIndex, heroImageSha256: heroImage.sha256, standardImageSha256: standardImage.sha256,
        sharedImageUri: heroImage.uri, sharedTextureKey: key, ...settings,
      });
    }
    records.push(record);
  }
  for (const asset of [hero, standard]) {
    assert.equal(images[asset.profile].size, asset.images.length, `${asset.profile}: unmatched image`);
    assert.equal(new Set(images[asset.profile].values()).size, hero.images.length, `${asset.profile}: image mapping is not bijective`);
    assert.equal(textures[asset.profile].size, asset.json.textures.length, `${asset.profile}: unused texture`);
    assert.equal(new Set([...textures[asset.profile].values()].map(({ key }) => key)).size, asset.json.textures.length, `${asset.profile}: texture keys must be unique`);
  }
  const standardNodes = new Map(standard.json.nodes.map((node) => [node.name, node]));
  for (const node of hero.json.nodes) {
    const other = standardNodes.get(node.name);
    assert(other, `Missing standard pose ${node.name}`);
    const poseIdentity = ({ extras }) => {
      const identity = clone(extras);
      delete identity.triangles;
      delete identity.primitives;
      return identity;
    };
    assert.deepEqual(poseIdentity(node), poseIdentity(other), `${node.name}: pose anchors/metadata differ across profiles`);
  }
  return { materials: records, images, textures };
}

function remapBufferViews(value, mapping, location = "") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "extras") continue;
    const address = location ? `${location}.${key}` : key;
    if (key === "bufferView") {
      assert(Number.isInteger(child) && mapping.has(child), `${address}: reference to a removed/missing image bufferView`);
      value[key] = mapping.get(child);
    } else {
      remapBufferViews(child, mapping, address);
    }
  }
}

function externalize(asset, hero, matching) {
  const json = clone(asset.json);
  const removed = new Set(json.images.map(({ bufferView }) => bufferView));
  assert.equal(removed.size, json.images.length, `${asset.profile}: image bufferViews overlap`);
  const kept = json.bufferViews.map((view, index) => ({ view, index })).filter(({ index }) => !removed.has(index));
  const mapping = new Map(kept.map(({ index }, newIndex) => [index, newIndex]));
  const payloads = [];
  let byteLength = 0;
  let previousEnd = 0;
  for (const { view, index } of [...kept].sort((a, b) => (a.view.byteOffset ?? 0) - (b.view.byteOffset ?? 0))) {
    assert((view.byteOffset ?? 0) >= previousEnd, `${asset.profile}: overlapping geometry bufferViews`);
    previousEnd = (view.byteOffset ?? 0) + view.byteLength;
    const padding = align4(byteLength) - byteLength;
    if (padding) payloads.push(Buffer.alloc(padding));
    byteLength += padding;
    view.byteOffset = byteLength;
    payloads.push(viewPayload(asset, index));
    byteLength += view.byteLength;
  }
  json.bufferViews = kept.map(({ view }) => view);
  json.buffers[0].byteLength = byteLength;
  json.images = json.images.map((image, index) => {
    const selected = hero.images[matching.images[asset.profile].get(index)];
    delete image.bufferView;
    image.uri = selected.uri;
    image.mimeType = selected.mimeType;
    return image;
  });
  remapBufferViews(json, mapping);
  json.textures.forEach((texture, index) => {
    const source = imageSource(texture);
    texture.source = source;
    if (texture.extensions?.EXT_texture_webp) {
      delete texture.extensions.EXT_texture_webp;
      if (!Object.keys(texture.extensions).length) delete texture.extensions;
    }
    assert(texture.extras?.shegaSharedTexture === undefined, `${asset.profile}: pre-existing shared texture key`);
    texture.extras = { ...texture.extras, shegaSharedTexture: matching.textures[asset.profile].get(index).key };
  });
  for (const field of ["extensionsUsed", "extensionsRequired"]) {
    if (!json[field]) continue;
    json[field] = json[field].filter((name) => name !== "EXT_texture_webp");
    if (!json[field].length) delete json[field];
  }
  const bin = Buffer.concat(payloads);
  assert.equal(bin.length, byteLength);
  const bytes = writeGlb(json, bin);
  assert(bytes.length <= PROFILES[asset.profile].glbBytes, `${asset.profile}: output GLB budget`);
  const bufferViews = kept.map(({ index }, outputIndex) => ({
    sourceIndex: index, outputIndex, byteLength: asset.json.bufferViews[index].byteLength,
    sha256: hash(viewPayload(asset, index)),
  }));
  return { ...parseGlb(bytes, `${asset.profile} output`), bufferViews, removedImageBufferViews: [...removed].sort((a, b) => a - b) };
}

function verifyPreservation(source, output, expected) {
  const label = source.profile;
  assert.equal(hash(output.bytes), hash(expected.bytes), `${label}: generated GLB checksum mismatch`);
  const json = output.json;
  for (const field of ["meshes", "nodes", "materials", "samplers", "scenes", "scene", "extras", "skins", "animations"]) {
    assert.deepEqual(json[field], source.json[field], `${label}: ${field} changed`);
  }
  assert.equal(json.images.length, BUDGETS.sharedImages, `${label}: output image count`);
  assert(!json.extensionsUsed?.includes("EXT_texture_webp") && !json.extensionsRequired?.includes("EXT_texture_webp"), `${label}: WebP plugin still required`);
  for (const [index, texture] of json.textures.entries()) {
    assert(Number.isInteger(texture.source) && json.images[texture.source], `${label}: missing direct texture source`);
    assert.equal(texture.extensions?.EXT_texture_webp, undefined, `${label}: WebP texture extension still present`);
    assert.equal(typeof texture.extras?.shegaSharedTexture, "string", `${label}: missing texture cache key ${index}`);
  }
  for (const image of json.images) {
    assert.equal(image.bufferView, undefined, `${label}: image remains embedded`);
    assert(/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(image.uri), `${label}: unsafe/non-content-addressed image URI`);
  }
  for (const { sourceIndex, outputIndex, sha256 } of expected.bufferViews) {
    const original = source.json.bufferViews[sourceIndex];
    const actual = json.bufferViews[outputIndex];
    assert.deepEqual({ ...actual, byteOffset: original.byteOffset }, original, `${label}: bufferView settings changed`);
    assert.equal(hash(viewPayload(output, outputIndex)), sha256, `${label}: bufferView ${sourceIndex} payload changed`);
    assert(viewPayload(output, outputIndex).equals(viewPayload(source, sourceIndex)), `${label}: geometry bytes changed`);
  }
  const restored = clone(json);
  const inverse = new Map(expected.bufferViews.map(({ sourceIndex, outputIndex }) => [outputIndex, sourceIndex]));
  remapBufferViews(restored, inverse);
  assert.deepEqual(restored.accessors, source.json.accessors, `${label}: accessor changed beyond bufferView remapping`);
  for (const field of ["bufferViews", "buffers", "images", "textures", "extensionsUsed", "extensionsRequired"]) {
    if (Object.hasOwn(source.json, field)) restored[field] = clone(source.json[field]);
    else delete restored[field];
  }
  assert.deepEqual(restored, source.json, `${label}: unexpected glTF changes`);
  staticGeometry(output, label);
}

async function prepare() {
  const [hero, standard] = await Promise.all(Object.keys(PROFILES).map(loadSource));
  const matching = matchProfiles(hero, standard);
  const sources = { hero, standard };
  const outputs = Object.fromEntries(Object.entries(sources).map(([profile, asset]) => [profile, externalize(asset, hero, matching)]));
  for (const profile of Object.keys(PROFILES)) verifyPreservation(sources[profile], outputs[profile], outputs[profile]);
  const sharedImages = hero.images.map(({ bytes, ...image }) => ({ ...image, bytes: bytes.length }));
  assert.equal(new Set(sharedImages.map(({ uri }) => uri)).size, BUDGETS.sharedImages, "Expected ten unique shared images");
  const sharedTextureBytes = sharedImages.reduce((sum, image) => sum + image.bytes, 0);
  const sharedDecodedRgbaMipBytes = sharedImages.reduce((sum, image) => sum + image.decodedRgbaMipBytes, 0);
  const originalAssetBytes = hero.bytes.length + standard.bytes.length;
  const combinedAssetBytes = outputs.hero.bytes.length + outputs.standard.bytes.length + sharedTextureBytes;
  const originalDecodedRgbaMipBytes = [hero, standard].flatMap(({ images }) => images).reduce((sum, image) => sum + image.decodedRgbaMipBytes, 0);
  assert(sharedTextureBytes <= BUDGETS.sharedTextureBytes, "Shared encoded image budget");
  assert(sharedDecodedRgbaMipBytes <= BUDGETS.sharedDecodedRgbaMipBytes, "Shared decoded image budget");
  assert(combinedAssetBytes <= BUDGETS.combinedAssetBytes && combinedAssetBytes < originalAssetBytes, "Combined transfer budget");
  const manifest = {
    schemaVersion: 1,
    license: hero.attribution.license,
    licenseURL: hero.attribution.licenseURL,
    sources: hero.attribution.sources,
    modifications: "Geometry, accessor payloads, material settings, static poses and all anchors are unchanged. Only embedded images are externalized, bufferView references/offsets are repacked, and texture sources/cache-key extras are normalized. Standard now uses the original, higher-quality hero JPEG/PNG image bytes without re-encoding.",
    generation: "node scripts\\prepare-shared-people.mjs",
    verification: "node scripts\\prepare-shared-people.mjs --verify",
    runtime: {
      cacheKey: "textures[index].extras.shegaSharedTexture",
      loader: "GLTFParser.loadTexture(index); direct texture.source and sibling relative image URI, no EXT_texture_webp dependency",
      cacheKeyIdentity: "v1 + original hero compressed-image SHA256 + effective mag/min filters + wrapS/wrapT + slot color space + UV channel + texture-transform SHA256",
      ownership: "Both asset profiles must retain pooled textures until their last asset owner releases them.",
      colorSpace: "srgb for baseColorTexture/emissiveTexture; linear (THREE.NoColorSpace) for data slots",
      cloneFreeTextureUsage: {
        texCoord: 0,
        textureTransforms: 0,
        textureCountPerProfile: matching.textures.hero.size,
        colorSpaceTextureCountsPerProfile: Object.fromEntries(["srgb", "linear"].map((colorSpace) => [
          colorSpace,
          [...matching.textures.hero.values()].filter(({ settings }) => settings.colorSpace === colorSpace).length,
        ])),
      },
    },
    budgets: {
      ...BUDGETS,
      profiles: Object.fromEntries(Object.entries(PROFILES).map(([profile, { glbBytes, trianglesPerPose }]) => [profile, { glbBytes, trianglesPerPose }])),
    },
    totals: {
      sharedImages: sharedImages.length, sharedTextureBytes, sharedDecodedRgbaMipBytes,
      originalDecodedRgbaMipBytes, decodedRgbaMipBytesSaved: originalDecodedRgbaMipBytes - sharedDecodedRgbaMipBytes,
      originalAssetBytes, combinedAssetBytes, assetBytesSaved: originalAssetBytes - combinedAssetBytes,
      decodedMipCalculation: "Exact RGBA8 sum from full-size level through 1x1, excluding driver/JS overhead",
    },
    images: sharedImages,
    materialTextureMapping: matching.materials,
    profiles: Object.fromEntries(Object.entries(sources).map(([profile, source]) => [profile, {
      source: { file: `/models/${PROFILES[profile].file}`, sha256: PROFILES[profile].sha256, bytes: source.bytes.length },
      sourceAttribution: source.attributionSource,
      originalAttribution: source.attribution,
      output: { file: `/models/shared-people/${profile}.glb`, sha256: hash(outputs[profile].bytes), bytes: outputs[profile].bytes.length },
      geometry: source.geometry,
      bufferViews: outputs[profile].bufferViews,
      removedImageBufferViews: outputs[profile].removedImageBufferViews,
      sourceImages: source.images.map(({ index, bytes, sha256, mimeType, width, height }) => ({
        index, bytes: bytes.length, sha256, mimeType, width, height,
        heroImageIndex: matching.images[profile].get(index),
        sharedUri: hero.images[matching.images[profile].get(index)].uri,
      })),
    }])),
    verifiedInvariants: [
      "Pinned source GLB SHA256 and recorded source-attribution SHA256",
      "Material-name plus texture-slot bijection; dimensions and sampler/color/UV compatibility",
      "All texture-info texCoord values are absent or zero; no KHR_texture_transform or clone-dependent UV usage",
      "Hero compressed image bytes unchanged; ten content-addressed sibling texture files",
      "Texture keys unique within each profile and identical across compatible profile slots",
      "Exact surviving bufferView payloads/settings; accessor changes limited to bufferView indices",
      "Exact meshes, material settings, samplers, nodes, all pose extras/anchors, scenes and asset metadata",
      "No skins, animations, morph targets, skeletal attributes or embedded output images",
      "Triangle, GLB, shared image, decoded mip and combined asset byte budgets",
      "Deterministic output GLB checksums and exact expected output-directory inventory",
    ],
  };
  return { sources, outputs, images: hero.images, manifest };
}

async function verify(prepared) {
  const { sources, outputs, images, manifest } = prepared;
  const expectedNames = ["hero.glb", "standard.glb", "attribution.json", ...images.map(({ uri }) => uri)].sort();
  assert.deepEqual((await fs.readdir(OUTPUT)).sort(), expectedNames, "Unexpected/missing shared asset files");
  const recorded = JSON.parse(await fs.readFile(path.join(OUTPUT, "attribution.json"), "utf8"));
  assert.deepEqual(recorded, manifest, "Attribution/source checksums/mapping/budgets differ from verified inputs");
  for (const [profile, source] of Object.entries(sources)) {
    const bytes = await fs.readFile(path.join(OUTPUT, `${profile}.glb`));
    verifyPreservation(source, parseGlb(bytes, profile), outputs[profile]);
  }
  for (const image of images) {
    const bytes = await fs.readFile(path.join(OUTPUT, image.uri));
    assert.equal(hash(bytes), image.sha256, `Shared image SHA256 mismatch: ${image.uri}`);
    assert(bytes.equals(image.bytes), `Hero image bytes changed: ${image.uri}`);
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    assert.deepEqual([metadata.width, metadata.height], [image.width, image.height], `Shared image dimensions changed: ${image.uri}`);
  }
  for (const [profile, source] of Object.entries(sources)) {
    assert.equal(hash(await fs.readFile(path.join(MODELS, PROFILES[profile].file))), hash(source.bytes), `${profile}: source changed during processing`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 0 || (args.length === 1 && args[0] === "--verify"), "Usage: node scripts\\prepare-shared-people.mjs [--verify]");
  const prepared = await prepare();
  if (!args.length) {
    await fs.mkdir(OUTPUT, { recursive: true });
    const allowed = new Set(["hero.glb", "standard.glb", "attribution.json", ...prepared.images.map(({ uri }) => uri)]);
    for (const name of await fs.readdir(OUTPUT)) assert(allowed.has(name), `Refusing to remove/overwrite unexpected shared asset: ${name}`);
    for (const [profile, output] of Object.entries(prepared.outputs)) await fs.writeFile(path.join(OUTPUT, `${profile}.glb`), output.bytes);
    for (const image of prepared.images) await fs.writeFile(path.join(OUTPUT, image.uri), image.bytes);
    await fs.writeFile(path.join(OUTPUT, "attribution.json"), `${JSON.stringify(prepared.manifest, null, 2)}\n`);
  }
  await verify(prepared);
  console.log(JSON.stringify({
    status: args.length ? "verified" : "generated and verified",
    profiles: Object.fromEntries(Object.entries(prepared.manifest.profiles).map(([profile, { output, geometry }]) => [profile, {
      ...output, triangles: geometry.triangles, maxTrianglesPerPose: geometry.maxTrianglesPerPose,
    }])),
    ...prepared.manifest.totals,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Shared people: ${error.message}`);
  process.exitCode = 1;
});
