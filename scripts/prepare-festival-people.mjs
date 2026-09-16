/**
 * Bake the credited local character rigs into reusable, textured static poses.
 * Run with GLTF_TRANSFORM_MODULES pointing to an existing tool node_modules:
 *   node scripts\prepare-festival-people.mjs [--inspect | --profile=all|hero|standard|far]
 * No downloads, browser APIs, runtime skeletons, or runtime animation mixers.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const require = createRequire(import.meta.url);
const toolRequire = process.env.GLTF_TRANSFORM_MODULES
  ? createRequire(path.join(process.env.GLTF_TRANSFORM_MODULES, "..", "package.json"))
  : require;
const { Document, NodeIO, Logger } = toolRequire("@gltf-transform/core");
const { ALL_EXTENSIONS } = toolRequire("@gltf-transform/extensions");
const { cloneDocument, dedup, joinPrimitives, mergeDocuments, prune, simplifyPrimitive, textureCompress, weld } =
  toolRequire("@gltf-transform/functions");
const { MeshoptSimplifier } = toolRequire("meshoptimizer");
const sharp = toolRequire("sharp");

const PROFILES = {
  hero: { suffix: "-hero", triangles: 24000, target: 23000, textureSize: 2048, error: 0.015, bytes: 18000000 },
  standard: { suffix: "", triangles: 5000, target: 4400, textureSize: 1024, error: 0.035, bytes: 3500000 },
  far: { suffix: "-far", triangles: 1000, target: 920, textureSize: 512, error: 0.4, bytes: 1500000 },
};
const ANCHORS = ["leftHand", "rightHand", "head", "headTop", "chest"];
const SOURCES = [
  { id: "manuel", file: "dancer.glb", arm: /upperarm_([lr])_/, forearm: /lowerarm_([lr])_/, hand: /hand_([lr])_/, foot: /foot_([lr])_/, toe: /foot_end_([lr])_/, head: /_head_0/ },
  { id: "red", file: "dancer3.glb", arm: /(Left|Right)Arm_/, forearm: /(Left|Right)ForeArm_/, hand: /(Left|Right)Hand_/, foot: /(Left|Right)Foot_/, toe: /(Left|Right)ToeBase_/, head: /Head_0/ },
  { id: "kandace", file: "dancer4.glb", arm: /(Left|Right)Arm_/, forearm: /(Left|Right)ForeArm_/, hand: /(Left|Right)Hand_/, foot: /(Left|Right)Foot_/, toe: /(Left|Right)ToeBase_/, head: /Head_0/ },
];
const POSES = {
  manuel: [{ name: "manuel-hands-up", time: 29 }, { name: "manuel-groove", time: 9.5 }, { name: "manuel-work", time: 0, arms: "work" }, { name: "manuel-stand", bind: true, arms: "stand" }],
  red: [{ name: "red-hands-up", time: 7.5, arms: "raised" }, { name: "red-groove", time: 2 }, { name: "red-work", bind: true, arms: "work" }, { name: "red-stand", bind: true, arms: "stand" }],
  kandace: [{ name: "kandace-hands-up", time: 11.5, arms: "raised" }, { name: "kandace-groove", time: 3.5 }, { name: "kandace-work", bind: true, arms: "work" }, { name: "kandace-stand", bind: true, arms: "stand" }],
};
const V = () => new THREE.Vector3();
const world = (node) => node.getWorldPosition(V());
const round = (n) => Math.round(n * 100000) / 100000;
const vector = (v) => v.toArray().map(round);

async function loadRig(file) {
  const bytes = await fs.readFile(path.join("public", "models", file));
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const loader = new GLTFLoader();
  // Texture bytes and material references are preserved in the original NodeIO
  // document. THREE only needs bones and vertex buffers for offline skinning.
  const textureStub = (name) => ({
    name,
    loadTexture: async () => {
      const texture = new THREE.Texture();
      texture.flipY = false;
      return texture;
    },
  });
  loader.register(() => textureStub("OFFLINE_TEXTURE_STUB"));
  loader.register(() => textureStub("EXT_texture_webp"));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  gltf.scene.updateMatrixWorld(true);
  return { ...gltf, json };
}

function anchors(scene, source) {
  const bones = [];
  scene.traverse((node) => { if (node.isBone) bones.push(node); });
  const paired = (pattern, side) => bones.find((bone) => {
    const match = bone.name.match(pattern);
    return match && match[1].toLowerCase().startsWith(side);
  });
  const result = { head: bones.find((bone) => source.head.test(bone.name)) };
  for (const side of ["l", "r"]) {
    for (const kind of ["arm", "forearm", "hand", "foot", "toe"]) {
      result[`${side}${kind}`] = paired(source[kind], side);
    }
  }
  for (const [name, node] of Object.entries(result)) {
    if (!node) throw new Error(`Missing ${source.id} ${name} anchor`);
  }
  return result;
}

function facing(a) {
  const lateral = world(a.larm).sub(world(a.rarm));
  lateral.y = 0;
  lateral.normalize();
  const forward = new THREE.Vector3(-lateral.z, 0, lateral.x);
  return new THREE.Matrix4().makeRotationY(-Math.atan2(forward.x, forward.z));
}

function posedGeometry(mesh) {
  if (mesh.isSkinnedMesh) mesh.skeleton.update();
  const geometry = mesh.geometry.clone();
  const positions = new Float32Array(geometry.getAttribute("position").count * 3);
  const sourceNormals = geometry.getAttribute("normal");
  const normals = sourceNormals ? new Float32Array(positions.length) : null;
  const normal = V(), skinnedNormal = V(), boneNormal = V();
  const boneMatrix = new THREE.Matrix4();
  const worldNormalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const skinIndices = geometry.getAttribute("skinIndex");
  const skinWeights = geometry.getAttribute("skinWeight");
  const vertex = V();
  for (let i = 0; i < geometry.getAttribute("position").count; i++) {
    mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
    vertex.toArray(positions, i * 3);
    if (sourceNormals) {
      normal.fromBufferAttribute(sourceNormals, i);
      if (mesh.isSkinnedMesh) {
        normal.transformDirection(mesh.bindMatrix);
        skinnedNormal.set(0, 0, 0);
        for (let joint = 0; joint < 4; joint++) {
          const weight = skinWeights.getComponent(i, joint);
          if (!weight) continue;
          boneMatrix.fromArray(mesh.skeleton.boneMatrices, skinIndices.getComponent(i, joint) * 16);
          boneNormal.copy(normal).transformDirection(boneMatrix);
          skinnedNormal.addScaledVector(boneNormal, weight);
        }
        normal.copy(skinnedNormal).transformDirection(mesh.bindMatrixInverse);
      }
      normal.applyNormalMatrix(worldNormalMatrix).toArray(normals, i * 3);
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  geometry.deleteAttribute("tangent");
  // Keep authored smooth normals across UV seams instead of refaceting faces.
  if (normals) geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  else geometry.computeVertexNormals();
  return geometry;
}

function rigMeshes(scene) {
  const meshes = [];
  scene.traverse((node) => { if (node.isMesh) meshes.push(node); });
  return meshes;
}

async function inspect(source) {
  const rig = await loadRig(source.file);
  const a = anchors(rig.scene, source);
  const meshes = rigMeshes(rig.scene);
  const bindBox = new THREE.Box3();
  for (const mesh of meshes) {
    const geometry = posedGeometry(mesh);
    geometry.computeBoundingBox();
    bindBox.union(geometry.boundingBox);
    geometry.dispose();
  }
  console.log(source.id, "bind bounds", vector(bindBox.min), vector(bindBox.max));
  console.log("anchors", Object.fromEntries(Object.entries(a).map(([key, node]) => [key, [node.name, vector(world(node))]])));
  const mixer = new THREE.AnimationMixer(rig.scene);
  mixer.clipAction(rig.animations[0]).play();
  const samples = [];
  for (let time = 0; time < rig.animations[0].duration; time += 0.5) {
    mixer.setTime(time);
    rig.scene.updateMatrixWorld(true);
    const ground = Math.min(world(a.lfoot).y, world(a.rfoot).y);
    const head = world(a.head).y - ground;
    samples.push({
      time, head: round(head), left: round((world(a.lhand).y - ground) / head),
      right: round((world(a.rhand).y - ground) / head),
      foot: round(world(a.lfoot).distanceTo(world(a.rfoot)) / head),
    });
  }
  console.log("hands-up candidates", samples.toSorted((a, b) => Math.min(b.left, b.right) - Math.min(a.left, a.right)).slice(0, 8));
  console.log("natural candidates", samples.filter((s) => s.left < 0.8 && s.right < 0.8 && s.foot < 0.45).slice(0, 8));
  mixer.stopAllAction();
  mixer.uncacheRoot(rig.scene);
}

function aimBone(bone, child, direction) {
  const from = world(child).sub(world(bone)).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(from, direction.clone().normalize());
  const desired = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.copy(parent.multiply(desired));
  bone.updateWorldMatrix(false, true);
}

function adjustArms(a, pose, heading) {
  if (!pose.arms) return;
  const inverse = heading.clone().invert();
  for (const side of ["l", "r"]) {
    const sign = side === "l" ? 1 : -1;
    const raised = pose.arms === "raised";
    const upper = raised ? new THREE.Vector3(sign * 0.6, 0.78, 0.15) : new THREE.Vector3(sign * 0.1, -0.97, 0.18);
    const lower = raised ? new THREE.Vector3(-sign * 0.15, 0.95, 0.28) : new THREE.Vector3(-sign * 0.12, -0.43, 0.9);
    if (pose.arms === "stand") {
      upper.set(sign * 0.12, -0.99, 0.02);
      lower.set(sign * 0.02, -0.99, 0.12);
    }
    aimBone(a[`${side}arm`], a[`${side}forearm`], upper.transformDirection(inverse));
    aimBone(a[`${side}forearm`], a[`${side}hand`], lower.transformDirection(inverse));
  }
}

function triangleCount(mesh) {
  return mesh.listPrimitives().reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0);
}

async function bakeSource(io, source) {
  const rig = await loadRig(source.file);
  const document = await io.read(path.join("public", "models", source.file));
  const a = anchors(rig.scene, source);
  const sourceMeshes = rigMeshes(rig.scene);
  const bindBounds = new THREE.Box3();
  for (const mesh of sourceMeshes) {
    const geometry = posedGeometry(mesh);
    geometry.computeBoundingBox();
    bindBounds.union(geometry.boundingBox);
    geometry.dispose();
  }
  // Standing height is measured before sampling any dance or raised-arm pose.
  const standingHeight = bindBounds.max.y - bindBounds.min.y;
  if (!(standingHeight > 0)) throw new Error(`Invalid standing height: ${source.id}`);
  const crown = world(a.head);
  crown.y = bindBounds.max.y;
  a.head.worldToLocal(crown);
  const restTransforms = [];
  rig.scene.traverse((node) => restTransforms.push({
    node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(),
  }));
  const buffer = document.createBuffer(source.id);
  const originalNodes = document.getRoot().listNodes();
  const originalScenes = document.getRoot().listScenes();
  const originalMeshes = new Map(originalNodes.filter((node) => node.getMesh()).map((node) => [node.getName(), node.getMesh()]));
  const scene = document.createScene(`festival-${source.id}`);
  document.getRoot().setDefaultScene(scene);
  const mixer = new THREE.AnimationMixer(rig.scene);
  mixer.clipAction(rig.animations[0]).play();
  const reports = [];

  for (const pose of POSES[source.id]) {
    if (pose.bind) {
      for (const rest of restTransforms) {
        rest.node.position.copy(rest.position);
        rest.node.quaternion.copy(rest.quaternion);
        rest.node.scale.copy(rest.scale);
      }
    } else {
      mixer.setTime(pose.time);
    }
    rig.scene.updateMatrixWorld(true);
    const heading = facing(a);
    adjustArms(a, pose, heading);
    rig.scene.updateMatrixWorld(true);
    const geometries = sourceMeshes.map((mesh) => posedGeometry(mesh).applyMatrix4(heading));
    const bounds = new THREE.Box3();
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      bounds.union(geometry.boundingBox);
    }
    const feet = world(a.lfoot).add(world(a.rfoot)).multiplyScalar(0.5).applyMatrix4(heading);
    const origin = new THREE.Vector3(feet.x, bounds.min.y, feet.z);
    const normalizedAnchor = (node) => world(node).applyMatrix4(heading).sub(origin).divideScalar(standingHeight);
    const poseNode = document.createNode(pose.name);
    const poseMesh = document.createMesh(pose.name);
    scene.addChild(poseNode);
    poseNode.setMesh(poseMesh);
    let sourceTriangles = 0;

    for (let part = 0; part < sourceMeshes.length; part++) {
      const originalMesh = originalMeshes.get(sourceMeshes[part].name);
      if (!originalMesh || originalMesh.listPrimitives().length !== 1) {
        throw new Error(`Unexpected source primitive layout: ${sourceMeshes[part].name}`);
      }
      const original = originalMesh.listPrimitives()[0];
      const geometry = geometries[part];
      geometry.translate(-origin.x, -origin.y, -origin.z).scale(1 / standingHeight, 1 / standingHeight, 1 / standingHeight);
      const primitive = document.createPrimitive().setMaterial(original.getMaterial());
      for (const [attribute, semantic, type] of [["position", "POSITION", "VEC3"], ["normal", "NORMAL", "VEC3"]]) {
        primitive.setAttribute(semantic, document.createAccessor(`${pose.name}-${part}-${semantic}`, buffer)
          .setType(type).setArray(new Float32Array(geometry.getAttribute(attribute).array)));
      }
      for (const semantic of original.listSemantics().filter((name) => name.startsWith("TEXCOORD"))) {
        // Preserve UV topology exactly; each baked position retains its original
        // vertex index, including duplicated vertices along texture seams.
        primitive.setAttribute(semantic, original.getAttribute(semantic));
      }
      primitive.setIndices(original.getIndices());
      sourceTriangles += original.getIndices().getCount() / 3;
      poseMesh.addPrimitive(primitive);
      geometry.dispose();
    }

    const anatomicalForward = new THREE.Vector3(0, 0, 1);
    const toeDirection = world(a.ltoe).sub(world(a.lfoot)).add(world(a.rtoe).sub(world(a.rfoot)));
    toeDirection.y = 0;
    toeDirection.normalize().transformDirection(heading);
    const metadata = {
      source: source.id,
      sourceFile: source.file,
      poseTime: pose.time ?? null,
      armAdjustment: pose.arms ?? "source-animation",
      standingHeight: 1,
      sourceStandingHeight: round(standingHeight),
      facing: "+Z",
      forward: vector(anatomicalForward),
      toeForwardDot: round(toeDirection.z),
      leftHand: vector(normalizedAnchor(a.lhand)),
      rightHand: vector(normalizedAnchor(a.rhand)),
      head: vector(normalizedAnchor(a.head)),
      headTop: vector(a.head.localToWorld(crown.clone()).applyMatrix4(heading).sub(origin).divideScalar(standingHeight)),
      chest: vector(normalizedAnchor(a.larm).add(normalizedAnchor(a.rarm)).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.045, 0.02))),
      sourceTriangles,
      attribution: rig.json.asset.extras,
    };
    poseNode.setExtras(metadata);
    reports.push({ name: pose.name, ...metadata });
  }

  mixer.stopAllAction();
  mixer.uncacheRoot(rig.scene);
  for (const animation of document.getRoot().listAnimations()) {
    for (const channel of animation.listChannels()) channel.dispose();
    for (const sampler of animation.listSamplers()) sampler.dispose();
    animation.dispose();
  }
  for (const skin of document.getRoot().listSkins()) skin.dispose();
  for (const node of originalNodes) node.dispose();
  for (const oldScene of originalScenes) oldScene.dispose();
  for (const mesh of new Set(originalMeshes.values())) mesh.dispose();
  document.getRoot().setExtras({ attribution: rig.json.asset.extras, modifications: "Animation sampled to static poses; arm posing; grounded and normalized; geometry simplified; textures resized." });
  // Convert before prune: unlit primitives otherwise lose their smooth normals.
  for (const material of document.getRoot().listMaterials()) {
    if (material.getExtension("KHR_materials_unlit")) {
      material.setExtension("KHR_materials_unlit", null);
      material.setRoughnessFactor(material.getName() === "Bodymat" ? 0.72 : 0.85);
      material.setMetallicFactor(0);
      // Retain texture alpha without expensive, incorrectly sorted body blending.
      material.setAlphaMode("MASK").setAlphaCutoff(0.4);
    }
    if (["Hairmat", "braid01"].includes(material.getName())) {
      material.setAlphaMode("MASK").setAlphaCutoff(0.4).setDoubleSided(true);
    }
  }
  await document.transform(prune(), weld());

  for (const mesh of document.getRoot().listMeshes()) {
    // Combine parts sharing a material into one primitive without touching UVs.
    const byMaterial = new Map();
    for (const primitive of mesh.listPrimitives()) {
      const material = primitive.getMaterial();
      const parts = byMaterial.get(material) ?? [];
      parts.push(primitive);
      byMaterial.set(material, parts);
    }
    for (const parts of byMaterial.values()) {
      if (parts.length < 2) continue;
      mesh.addPrimitive(joinPrimitives(parts));
      for (const primitive of parts) { mesh.removePrimitive(primitive); primitive.dispose(); }
    }
  }
  await document.transform(dedup(), prune());
  return { document, reports, attribution: rig.json.asset.extras };
}

function simplifyProfilePrimitive(primitive, target, profileName, error) {
  const count = primitive.getIndices().getCount() / 3;
  if (count <= target) return;
  const uv = primitive.getAttribute("TEXCOORD_0");
  const normal = primitive.getAttribute("NORMAL");
  const positions = primitive.getAttribute("POSITION");
  const attributes = new Float32Array(positions.getCount() * 5);
  for (let i = 0; i < positions.getCount(); i++) {
    if (normal) attributes.set(normal.getArray().subarray(i * 3, i * 3 + 3), i * 5);
    if (uv) attributes.set(uv.getArray().subarray(i * 2, i * 2 + 2), i * 5 + 3);
  }
  // Lock the original sole vertices, so all LODs share the exact same ground
  // and unmodified skeletal anchors. No profile-dependent recentering.
  const simplifier = {
    simplify(indices, vertices, stride, targetCount, targetError) {
      const locks = new Uint8Array(vertices.length / stride);
      for (let i = 0; i < locks.length; i++) locks[i] = vertices[i * stride + 1] < 0.00001 ? 1 : 0;
      return MeshoptSimplifier.simplifyWithAttributes(
        indices, vertices, stride, attributes, 5,
        profileName === "far" ? [0.01, 0.01, 0.01, 0.02, 0.02] : [0.1, 0.1, 0.1, 0.2, 0.2],
        locks, targetCount, targetError, profileName === "far" ? ["Permissive"] : [],
      );
    },
  };
  simplifyPrimitive(primitive, { simplifier, ratio: target / count, error, lockBorder: false });
}

async function prepareProfile(document, sourceReports, name) {
  const profile = PROFILES[name];
  const reports = structuredClone(sourceReports);
  for (const mesh of document.getRoot().listMeshes()) {
    const primitives = mesh.listPrimitives();
    const before = triangleCount(mesh);
    const target = name === "standard" && mesh.getName().endsWith("-work") ? 4800 : profile.target;
    const weights = primitives.map((primitive) => {
      const material = primitive.getMaterial();
      if (!material) throw new Error(`Missing material: ${mesh.getName()}`);
      const weight = name === "hero" && /teeth/i.test(material.getName()) ? 0.12 : 1;
      return primitive.getIndices().getCount() / 3 * weight;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (before > profile.triangles) {
      for (let i = 0; i < primitives.length; i++) {
        simplifyProfilePrimitive(primitives[i], Math.max(8, Math.floor(target * weights[i] / totalWeight)), name, profile.error);
      }
    }
    const report = reports.find((entry) => entry.name === mesh.getName());
    report.triangles = triangleCount(mesh);
    report.primitives = primitives.length;
    if (report.triangles > profile.triangles) {
      throw new Error(`${name} triangle budget exceeded: ${report.name} (${report.triangles}/${profile.triangles})`);
    }
    document.getRoot().listNodes().find((node) => node.getMesh() === mesh).setExtras(report);
  }
  // Native sources are only 1024px. Hero keeps original bytes: upscaling or
  // recompressing cannot recover detail that the local originals do not have.
  if (name !== "hero") {
    await document.transform(textureCompress({
      encoder: sharp, targetFormat: "webp", resize: [profile.textureSize, profile.textureSize],
      quality: name === "far" ? 82 : 88, effort: 4,
    }));
  }
  await document.transform(dedup(), prune());
  return reports;
}

async function validate(io, filename, reports, profileName) {
  const profile = PROFILES[profileName];
  const document = await io.read(filename);
  const root = document.getRoot();
  if (root.listAnimations().length || root.listSkins().length) throw new Error("Export must be completely static.");
  for (const report of reports) {
    const node = root.listNodes().find((node) => node.getName() === report.name);
    if (!node?.getMesh()) throw new Error(`Missing pose ${report.name}`);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const primitive of node.getMesh().listPrimitives()) {
      if (!primitive.getMaterial()) throw new Error(`Missing exported material: ${report.name}`);
      if (primitive.getMaterial().getBaseColorTexture() && !primitive.getAttribute("TEXCOORD_0")) {
        throw new Error(`Missing textured UVs: ${report.name}`);
      }
      const positions = primitive.getAttribute("POSITION").getArray();
      const normals = primitive.getAttribute("NORMAL")?.getArray();
      if (!normals) throw new Error(`Missing smooth normals: ${profileName}/${report.name}`);
      for (let i = 0; i < normals.length; i += 3) {
        const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
        if (!Number.isFinite(length) || Math.abs(length - 1) > 0.001) {
          throw new Error(`Invalid smooth normal: ${profileName}/${report.name}`);
        }
      }
      for (let i = 0; i < positions.length; i++) {
        if (!Number.isFinite(positions[i])) throw new Error(`Non-finite vertex: ${report.name}`);
        if (i % 3 === 1) { minY = Math.min(minY, positions[i]); maxY = Math.max(maxY, positions[i]); }
      }
    }
    if (Math.abs(minY) > 0.00001) throw new Error(`Ungrounded pose ${report.name}: ${minY}`);
    for (const anchor of ANCHORS) {
      if (JSON.stringify(node.getExtras()[anchor]) !== JSON.stringify(report[anchor])) {
        throw new Error(`Anchor mismatch: ${profileName}/${report.name}/${anchor}`);
      }
    }
    report.boundsY = [round(minY), round(maxY)];
    if (report.name.endsWith("hands-up") && Math.min(report.leftHand[1], report.rightHand[1]) <= report.head[1]) {
      throw new Error(`Hands are not raised for ${report.name}`);
    }
  }
  let maxTextureSize = 0;
  for (const texture of root.listTextures()) {
    const metadata = await sharp(texture.getImage()).metadata();
    maxTextureSize = Math.max(maxTextureSize, metadata.width, metadata.height);
    if (maxTextureSize > profile.textureSize) throw new Error(`Oversized ${profileName} texture.`);
  }
  const runtime = await loadRig(path.basename(filename));
  for (const report of reports) {
    const node = runtime.scene.getObjectByName(report.name);
    if (!node) throw new Error(`GLTFLoader cannot resolve pose ${report.name}`);
    let triangles = 0;
    node.traverse((child) => {
      if (child.isSkinnedMesh) throw new Error("Runtime skeleton found.");
      if (!child.isMesh) return;
      if (!child.matrixWorld.equals(new THREE.Matrix4())) throw new Error(`Non-identity part transform: ${child.name}`);
      triangles += child.geometry.index.count / 3;
    });
    if (triangles !== report.triangles) throw new Error(`Runtime triangle mismatch: ${report.name}`);
  }
  return { textures: root.listTextures().length, maxTextureSize, materials: root.listMaterials().length, animations: 0, skins: 0 };
}

async function main() {
  if (process.argv.includes("--inspect")) {
    for (const source of SOURCES) await inspect(source);
    return;
  }
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const combined = new Document();
  combined.setLogger(new Logger(Logger.Verbosity.WARN));
  const scene = combined.createScene("festival-people");
  combined.getRoot().setDefaultScene(scene);
  const reports = [];
  const sources = [];
  for (const source of SOURCES) {
    const result = await bakeSource(io, source);
    mergeDocuments(combined, result.document);
    reports.push(...result.reports);
    sources.push(result.attribution);
  }
  for (const otherScene of combined.getRoot().listScenes()) {
    if (otherScene === scene) continue;
    for (const child of otherScene.listChildren()) scene.addChild(child);
    otherScene.dispose();
  }
  combined.getRoot().setExtras({ sources, license: "CC-BY-4.0", facing: "+Z", standingHeight: 1 });
  await combined.transform(dedup(), prune());
  const buffers = combined.getRoot().listBuffers();
  for (const accessor of combined.getRoot().listAccessors()) accessor.setBuffer(buffers[0]);
  for (const buffer of buffers.slice(1)) buffer.dispose();
  const requested = process.argv.find((arg) => arg.startsWith("--profile="))?.split("=")[1] ?? "all";
  if (requested !== "all" && !Object.hasOwn(PROFILES, requested)) throw new Error(`Unknown profile: ${requested}`);
  for (const name of requested === "all" ? Object.keys(PROFILES) : [requested]) {
    const profile = PROFILES[name];
    const document = cloneDocument(combined);
    const profileReports = await prepareProfile(document, reports, name);
    for (const report of profileReports) {
      const canonical = reports.find((entry) => entry.name === report.name);
      for (const anchor of ANCHORS) {
        if (JSON.stringify(report[anchor]) !== JSON.stringify(canonical[anchor])) {
          throw new Error(`Profile changed canonical anchor: ${name}/${report.name}/${anchor}`);
        }
      }
    }
    const modifications = `Static pose baking, original smooth normals, arm adjustments, ${profile.triangles}-triangle budget, native textures capped at ${profile.textureSize}px, PBR lighting, preserved alpha hair, shared grounded one-metre normalization and +Z facing.`;
    document.getRoot().getAsset().extras = {
      title: `Shega Festival — ${name} static textured dance and work poses`,
      sources, license: "CC-BY-4.0", modifications,
    };
    const basename = `festival-people${profile.suffix}`;
    const filename = path.join("public", "models", `${basename}.glb`);
    await io.write(filename, document);
    const validation = await validate(io, filename, profileReports, name);
    const manifest = {
    asset: `/models/${basename}.glb`,
    profile: name,
    budgets: { trianglesPerPose: profile.triangles, textureSize: profile.textureSize, bytes: profile.bytes },
    license: "CC-BY-4.0",
    licenseURL: "https://creativecommons.org/licenses/by/4.0/",
    sources,
    modifications,
    textureNote: "The existing source textures are at most 1024px; hero retains original image bytes without invented detail or skin tinting.",
    units: "Scale every variant by the desired adult standing height in metres. Raised hands may extend beyond this height.",
    ...validation,
    bytes: (await fs.stat(filename)).size,
    variants: profileReports,
  };
    if (manifest.bytes > profile.bytes) throw new Error(`${name} byte budget exceeded: ${manifest.bytes}`);
    await fs.writeFile(path.join("public", "models", `${basename}.attribution.json`), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({ file: filename, ...validation, bytes: manifest.bytes, poses: profileReports.map(({ name, triangles, primitives, boundsY }) => ({ name, triangles, primitives, boundsY })) }, null, 2));
  }
}

await main();
