"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { AnimatedModel } from "../animated-model";
import { FestivalPerson } from "../festival-person";
import { HardwareBatch } from "../stage-hardware";

type Point = [number, number, number];
const box = new THREE.BoxGeometry(1, 1, 1);
const tube = new THREE.CylinderGeometry(1, 1, 1, 10);
const black = new THREE.MeshStandardMaterial({ color: "#181a1e", roughness: 0.78 });
const steel = new THREE.MeshStandardMaterial({ color: "#9dabb5", metalness: 0.8, roughness: 0.28 });
const ivory = new THREE.MeshStandardMaterial({ color: "#e2dfd4", roughness: 0.5 });
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

function transform(position: Point, scale: Point, rotation: Point = [0, 0, 0]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
}

function rod(start: Point, end: Point, radius = 0.012) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  return new THREE.Matrix4().compose(
    a.add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
    new THREE.Vector3(radius, direction.length(), radius),
  );
}

const whiteKeys = Array.from({ length: 36 }, (_, i) => transform([(i - 17.5) * 0.028, 0, -0.055], [0.0255, 0.016, 0.19]));
const blackKeys = Array.from({ length: 35 }, (_, i) => i % 7 !== 2 && i % 7 !== 6
  ? transform([(i - 17) * 0.028, 0.012, 0.003], [0.015, 0.021, 0.12]) : null)
  .filter((matrix): matrix is THREE.Matrix4 => matrix !== null);

function Keyboard({ height }: { height: number }) {
  const stand = useMemo(() => [
    rod([-0.43, -height, -0.07], [0.43, -0.12, -0.07], 0.018),
    rod([0.43, -height, -0.07], [-0.43, -0.12, -0.07], 0.018),
    ...[-0.43, 0.43].flatMap((x) => [
      rod([x, -height, -0.25], [x, -height, 0.25], 0.022),
      rod([x, -0.12, -0.19], [x, -0.12, 0.19], 0.018),
    ]),
  ], [height]);
  return <group name="61-key-stage-keyboard" position={[0, -0.025, 0]}>
    <mesh position={[0, -0.055, 0.018]} material={black} castShadow><boxGeometry args={[1.4, 0.1, 0.4]} /></mesh>
    <HardwareBatch geometry={box} material={ivory} matrices={whiteKeys} />
    <HardwareBatch geometry={box} material={rubber} matrices={blackKeys} />
    <HardwareBatch geometry={tube} material={black} matrices={stand} />
    <mesh position={[0, 0.001, 0.16]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.18, 0.045]} /><meshBasicMaterial color="#88b9c9" toneMapped={false} /></mesh>
    <mesh position={[0.61, -0.008, 0.05]} material={steel}><boxGeometry args={[0.055, 0.016, 0.12]} /></mesh>
    <mesh position={[0.13, -height + 0.0175, -0.12]} material={rubber}><boxGeometry args={[0.09, 0.035, 0.2]} /></mesh>
  </group>;
}

function MicrophoneStand({ mouth }: { mouth: Point }) {
  const stand = useMemo(() => {
    const base: Point = [mouth[0], 0.035, mouth[2] + 0.36];
    return [
      rod(base, [base[0], mouth[1] - 0.12, base[2]], 0.014),
      rod([base[0], mouth[1] - 0.12, base[2]], mouth, 0.009),
      ...[0, 1, 2].map((i) => rod(base, [base[0] + Math.cos(i * Math.PI * 2 / 3) * 0.3, 0.012, base[2] + Math.sin(i * Math.PI * 2 / 3) * 0.3], 0.011)),
    ];
  }, [mouth]);
  return <group name="vocal-microphone">
    <HardwareBatch geometry={tube} material={black} matrices={stand} />
    <group position={mouth} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.045, 0]} material={black}><cylinderGeometry args={[0.018, 0.014, 0.13, 12]} /></mesh>
      <mesh position={[0, -0.035, 0]} material={steel}><sphereGeometry args={[0.027, 16, 12]} /></mesh>
    </group>
  </group>;
}

function Conga({ position, height, radius }: { position: Point; height: number; radius: number }) {
  const shell = useMemo(() => [
    new THREE.Vector2(radius * 0.6, 0.035),
    new THREE.Vector2(radius * 0.78, height * 0.28),
    new THREE.Vector2(radius * 1.1, height * 0.65),
    new THREE.Vector2(radius, height - 0.02),
  ], [height, radius]);
  const lugs = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4;
    const x = Math.cos(angle) * (radius + 0.016), z = Math.sin(angle) * (radius + 0.016);
    return rod([x, height - 0.17, z], [x, height - 0.015, z], 0.008);
  }), [height, radius]);
  return <group position={position}>
    <mesh castShadow receiveShadow><latheGeometry args={[shell, 24]} /><meshStandardMaterial color="#713b27" roughness={0.5} /></mesh>
    <mesh position={[0, height - 0.016, 0]}><cylinderGeometry args={[radius, radius, 0.023, 32]} /><meshStandardMaterial color="#d1b68e" roughness={0.94} /></mesh>
    <mesh position={[0, height - 0.035, 0]} rotation={[Math.PI / 2, 0, 0]} material={steel}><torusGeometry args={[radius, 0.013, 8, 32]} /></mesh>
    <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} material={rubber}><torusGeometry args={[radius * 0.61, 0.018, 8, 24]} /></mesh>
    <HardwareBatch geometry={tube} material={steel} matrices={lugs} />
  </group>;
}

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

export function BermelBand() {
  const keyboardHeight = 1.76;
  const percussionHeight = 1.84;
  const singerHeight = 1.73;
  return <group name="bermel-live-band">
    <group name="band-guitarist">
      <AnimatedModel url="/models/guitarist.glb" fitHeight={1.84} position={[-2.7, 0.83, -0.8]} rotationY={Math.PI - 0.16} timeOffset={1.2} />
      <mesh position={[-4.85, 1.17, 1.35]} material={black} castShadow><boxGeometry args={[0.9, 0.68, 0.48]} /></mesh>
      <mesh position={[-4.85, 1.18, 1.1]} material={grille}><boxGeometry args={[0.77, 0.51, 0.012]} /></mesh>
    </group>
    <group name="band-percussionist">
      <mesh position={[-2.8, 0.94, 1.48]} material={black} castShadow receiveShadow><boxGeometry args={[2.75, 0.22, 2.2]} /></mesh>
      <FestivalPerson position={[-2.8, 1.05, 2.12]} rotationY={Math.PI} height={percussionHeight} variant="manuel" pose="work" quality="hero">
        {(anchors) => <>
          {[anchors.leftHand, anchors.rightHand].map((hand, i) => <group key={i} position={hand} scale={1 / percussionHeight}>
            <mesh position={[0, -0.06, 0.13]} rotation={[2.05, 0, i ? 0.09 : -0.09]}><cylinderGeometry args={[0.006, 0.007, 0.38, 10]} /><meshStandardMaterial color="#c7a36e" roughness={0.8} /></mesh>
          </group>)}
          <group scale={1 / percussionHeight}>
            {[anchors.leftHand, anchors.rightHand].map((hand, i) => <Conga key={i} position={[hand[0] * percussionHeight, 0, hand[2] * percussionHeight + 0.29]} height={hand[1] * percussionHeight - 0.145} radius={i ? 0.155 : 0.165} />)}
          </group>
        </>}
      </FestivalPerson>
    </group>
    <group name="band-keyboardist">
      <FestivalPerson position={[4.25, 0.83, 1.35]} rotationY={Math.PI} height={keyboardHeight} variant="kandace" pose="work" quality="hero">
        {(anchors) => {
          const center: Point = [
            (anchors.leftHand[0] + anchors.rightHand[0]) / 2,
            (anchors.leftHand[1] + anchors.rightHand[1]) / 2,
            (anchors.leftHand[2] + anchors.rightHand[2]) / 2,
          ];
          return <group position={center} scale={1 / keyboardHeight}><Keyboard height={center[1] * keyboardHeight - 0.025} /></group>;
        }}
      </FestivalPerson>
    </group>
    <group name="band-vocalist">
      <FestivalPerson position={[0, 0.83, -2.7]} rotationY={Math.PI + 0.08} height={singerHeight} variant="red" pose="stand" quality="hero">
        {(anchors) => <group scale={1 / singerHeight}>
          <MicrophoneStand mouth={[anchors.head[0] * singerHeight, (anchors.head[1] + (anchors.headTop[1] - anchors.head[1]) * 0.28) * singerHeight, anchors.head[2] * singerHeight + 0.14]} />
        </group>}
      </FestivalPerson>
    </group>
    <Monitor position={[-3.4, 0.83, -3.45]} rotation={0.55} />
    <Monitor position={[1.3, 0.83, -3.45]} />
    <Monitor position={[4.7, 0.83, -3.1]} rotation={-0.21} />
    <StageCable points={[[-2.7, 0.86, -0.5], [-3.4, 0.85, -0.5], [-5.1, 0.85, 0.15], [-4.9, 0.85, 1.12]]} />
    <StageCable points={[[0, 0.86, -3], [1.2, 0.85, -2.7], [3, 0.85, 0.2], [3.5, 0.85, 2.65], [5, 0.85, 2.7]]} />
    <StageCable points={[[4.6, 0.87, 0.8], [5.1, 0.85, 0.6], [5.4, 0.85, 1.8], [5, 0.85, 2.7]]} />
  </group>;
}
