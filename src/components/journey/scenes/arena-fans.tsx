"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import atlas from "../../../../public/models/arena-fans/atlas.json";
import type { CrowdPlacement } from "../dance-crowd";
import { facingTarget } from "../posed-people";
import { useSceneTexture } from "../scene-assets";
import { ARENA_CENTER } from "./arena-layout";

function configureColorAtlas(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

const vertexShader = `
  attribute float fanHeading;
  attribute float fanPose;
  attribute vec3 fanWardrobe;
  uniform vec2 frameSize;
  uniform float groundOffset;
  uniform vec2 atlasGrid;
  varying vec2 vAtlasUv;
  varying vec3 vWardrobe;
  varying float vFill;
  #include <fog_pars_vertex>
  void main() {
    vec4 origin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 towardCamera = cameraPosition.xz - origin.xz;
    vec2 facing = normalize(towardCamera + vec2(0.00001));
    vec3 right = vec3(facing.y, 0.0, -facing.x);
    float height = length(instanceMatrix[1].xyz);
    vec3 world = origin.xyz + right * position.x * frameSize.x * height;
    world.y += ((position.y + 0.5) * frameSize.y - groundOffset) * height;
    float angle = atan(towardCamera.x, towardCamera.y) - fanHeading;
    float view = mod(floor(angle * atlasGrid.x / 6.28318530718 + 0.5), atlasGrid.x);
    vAtlasUv = vec2((view + uv.x) / atlasGrid.x, 1.0 - (fanPose + 1.0 - uv.y) / atlasGrid.y);
    vWardrobe = fanWardrobe;
    vFill = 0.25 + 0.12 * (1.0 - smoothstep(10.0, 24.0, length(origin.xz - vec2(0.0, -34.0))));
    vec4 mvPosition = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = `
  uniform sampler2D fanColor;
  uniform sampler2D clothingMask;
  varying vec2 vAtlasUv;
  varying vec3 vWardrobe;
  varying float vFill;
  #include <fog_pars_fragment>
  void main() {
    vec4 surface = texture2D(fanColor, vAtlasUv);
    if (surface.a < 0.4) discard;
    float cloth = texture2D(clothingMask, vAtlasUv).r;
    float folds = max(surface.r, max(surface.g, surface.b));
    vec3 color = mix(surface.rgb, vWardrobe * folds * 1.65, cloth * 0.88);
    gl_FragColor = vec4(color * vec3(0.88, 0.94, 1.0) * vFill, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function ArenaFans({ placements }: { placements: readonly CrowdPlacement[] }) {
  const color = useSceneTexture("/models/arena-fans/color.webp", configureColorAtlas);
  const mask = useSceneTexture("/models/arena-fans/clothing.webp");
  const mesh = useRef<THREE.InstancedMesh>(null);
  const resources = useMemo(() => {
    const { frameWidth, frameHeight, groundOffset, columns, rows } = atlas.render;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const headings = new Float32Array(placements.length);
    const poses = new Float32Array(placements.length);
    const wardrobe = new Float32Array(placements.length * 3);
    const tint = new THREE.Color();
    placements.forEach((guest, index) => {
      headings[index] = facingTarget(guest.position, ARENA_CENTER);
      poses[index] = guest.variant % rows;
      tint.set(guest.wardrobe).toArray(wardrobe, index * 3);
    });
    geometry.setAttribute("fanHeading", new THREE.InstancedBufferAttribute(headings, 1));
    geometry.setAttribute("fanPose", new THREE.InstancedBufferAttribute(poses, 1));
    geometry.setAttribute("fanWardrobe", new THREE.InstancedBufferAttribute(wardrobe, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, side: THREE.DoubleSide, fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        frameSize: { value: new THREE.Vector2(frameWidth, frameHeight) },
        groundOffset: { value: groundOffset },
        atlasGrid: { value: new THREE.Vector2(columns, rows) },
        fanColor: { value: color },
        clothingMask: { value: mask },
      },
    });
    return { geometry, material };
  }, [placements, color, mask]);

  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    const dummy = new THREE.Object3D();
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    placements.forEach((guest, index) => {
      dummy.position.fromArray(guest.position);
      dummy.scale.setScalar(guest.height);
      dummy.updateMatrix();
      instance.setMatrixAt(index, dummy.matrix);
      const radius = atlas.render.frameWidth * guest.height / 2;
      bounds.expandByPoint(point.set(guest.position[0] - radius, guest.position[1] - atlas.render.groundOffset * guest.height, guest.position[2] - radius));
      bounds.expandByPoint(point.set(guest.position[0] + radius, guest.position[1] + atlas.render.frameHeight * guest.height, guest.position[2] + radius));
    });
    instance.instanceMatrix.needsUpdate = true;
    instance.boundingBox = bounds;
    instance.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
  }, [placements]);
  useEffect(() => {
    const instance = mesh.current;
    return () => {
      instance?.dispose();
      resources.geometry.dispose();
      resources.material.dispose();
    };
  }, [resources]);

  return <instancedMesh name="arena-multi-angle-fans" ref={mesh} args={[resources.geometry, resources.material, placements.length]} dispose={null} />;
}
