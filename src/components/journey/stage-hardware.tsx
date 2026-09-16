"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const tube = new THREE.CylinderGeometry(1, 1, 1, 6);
const steel = new THREE.MeshStandardMaterial({ color: "#626a70", metalness: 0.82, roughness: 0.38 });

export function HardwareBatch({ geometry, material, matrices, receiveShadow = false }: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: readonly THREE.Matrix4[];
  receiveShadow?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const instance = mesh.current;
    return () => { instance?.dispose(); };
  }, [geometry, material, matrices.length]);
  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    matrices.forEach((matrix, index) => instance.setMatrixAt(index, matrix));
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingBox();
    instance.computeBoundingSphere();
  }, [matrices]);
  return <instancedMesh ref={mesh} args={[geometry, material, matrices.length]} receiveShadow={receiveShadow} dispose={null} />;
}

export function Truss({ position, length, vertical = false }: {
  position: [number, number, number];
  length: number;
  vertical?: boolean;
}) {
  const matrices = useMemo(() => {
    if (!Number.isFinite(length) || length <= 0) throw new Error("Truss length must be positive and finite.");
    const result: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const addTube = (start: [number, number, number], end: [number, number, number], radius: number) => {
      const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
      const direction = b.clone().sub(a);
      result.push(new THREE.Matrix4().compose(
        a.add(b).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()),
        new THREE.Vector3(radius, direction.length(), radius),
      ));
    };
    for (const y of [-0.16, 0.16]) for (const z of [-0.16, 0.16]) {
      addTube([-length / 2, y, z], [length / 2, y, z], 0.025);
    }
    const count = Math.ceil(length / 0.65);
    for (let i = 0; i < count; i++) {
      const x1 = -length / 2 + i * length / count;
      const x2 = -length / 2 + (i + 1) * length / count;
      const side = i % 2 ? -0.16 : 0.16;
      for (const edge of [-0.16, 0.16]) {
        addTube([x1, side, edge], [x2, -side, edge], 0.014);
        addTube([x1, edge, side], [x2, edge, -side], 0.014);
      }
    }
    return result;
  }, [length]);

  return (
    <group position={position} rotation={[0, 0, vertical ? Math.PI / 2 : 0]} name="lighting-truss">
      <HardwareBatch geometry={tube} material={steel} matrices={matrices} />
    </group>
  );
}
