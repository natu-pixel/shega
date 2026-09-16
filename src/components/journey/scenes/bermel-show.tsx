"use client";

/**
 * BERMEL DJ SHOW — the performers and front-of-stage hardware.
 *
 * Modeled on the supplied concert reference: a clean elevated stage, monitor
 * wedges along the front lip, and one hype MC at the stage edge facing the
 * crowd. The DJ riser and booth live in dj-stage.tsx; this file owns people
 * and loose stage gear. Everything is static, matching the frozen hall.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { FestivalPerson } from "../festival-person";

type Point = [number, number, number];
const black = new THREE.MeshStandardMaterial({ color: "#181a1e", roughness: 0.78 });
const steel = new THREE.MeshStandardMaterial({ color: "#9dabb5", metalness: 0.8, roughness: 0.28 });
const rubber = new THREE.MeshStandardMaterial({ color: "#08090a", roughness: 0.95 });
const monitorWedge = new THREE.BoxGeometry(0.68, 1, 0.42);
const wedgePositions = monitorWedge.getAttribute("position");
for (let i = 0; i < wedgePositions.count; i++) {
  wedgePositions.setY(i, wedgePositions.getY(i) > 0 ? 0.24 - wedgePositions.getZ(i) * 0.2 / 0.42 : 0);
}
monitorWedge.computeVertexNormals();
const grillePixels = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const shade = Math.hypot(x % 8 - 3.5, y % 8 - 3.5) < 2.5 ? 15 : 85;
  grillePixels.set([shade, shade, shade, 255], (y * 32 + x) * 4);
}
const grilleTexture = new THREE.DataTexture(grillePixels, 32, 32);
grilleTexture.colorSpace = THREE.SRGBColorSpace;
grilleTexture.wrapS = grilleTexture.wrapT = THREE.RepeatWrapping;
grilleTexture.repeat.set(8, 6);
grilleTexture.generateMipmaps = true;
grilleTexture.minFilter = THREE.LinearMipmapLinearFilter;
grilleTexture.magFilter = THREE.LinearFilter;
grilleTexture.needsUpdate = true;
const grille = new THREE.MeshStandardMaterial({ map: grilleTexture, roughness: 0.7, metalness: 0.4 });

function StageCable({ points }: { points: Point[] }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);
  return <mesh material={rubber}><tubeGeometry args={[curve, 24, 0.009, 5, false]} /></mesh>;
}

function Monitor({ position, rotation = 0 }: { position: Point; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]} name="stage-monitor">
    <mesh geometry={monitorWedge} material={black} castShadow />
    <mesh position={[0, 0.244, 0.002]} rotation={[-Math.PI / 2 + Math.atan2(0.2, 0.42), 0, 0]} material={grille}><planeGeometry args={[0.55, 0.31]} /></mesh>
  </group>;
}

/** A handheld wireless microphone, gripped in the raised hand. */
function WirelessMic() {
  return <group rotation={[0.5, 0, -0.35]}>
    <mesh position={[0, 0.055, 0]} material={black}><cylinderGeometry args={[0.016, 0.021, 0.15, 12]} /></mesh>
    <mesh position={[0, 0.148, 0]} material={steel}><sphereGeometry args={[0.03, 16, 12]} /></mesh>
  </group>;
}

export function BermelShow() {
  const mcHeight = 1.78;
  return <group name="bermel-dj-show">
    {/* The hype MC at the stage lip, facing the crowd like the reference shot. */}
    <group name="show-mc">
      <FestivalPerson position={[2.1, 0.83, -2.8]} lookAt={[-1.5, -14]} height={mcHeight} variant="red" pose="hands-up" quality="hero">
        {(anchors) => <group position={anchors.rightHand} scale={1 / mcHeight}><WirelessMic /></group>}
      </FestivalPerson>
    </group>
    {/* Monitor wedges along the front edge, angled back at the performers. */}
    <Monitor position={[-6.1, 0.83, -3.4]} rotation={0.5} />
    <Monitor position={[-3.2, 0.83, -3.5]} rotation={0.24} />
    <Monitor position={[-0.3, 0.83, -3.55]} />
    <Monitor position={[2.7, 0.83, -3.5]} rotation={-0.24} />
    <Monitor position={[5.7, 0.83, -3.4]} rotation={-0.5} />
    {/* Loose cabling from the booth toward the side wings. */}
    <StageCable points={[[-1.3, 0.85, 0.5], [-3.4, 0.84, 0.9], [-5.6, 0.85, 1.3], [-7.4, 0.86, 1.7]]} />
    <StageCable points={[[1.3, 0.85, 0.55], [3.2, 0.84, 1.1], [5.4, 0.85, 1.5], [7.3, 0.86, 1.8]]} />
    <StageCable points={[[-0.3, 0.845, -3.35], [-1.7, 0.84, -2.3], [-2.6, 0.845, -0.6], [-2.2, 0.85, 0.7]]} />
  </group>;
}
