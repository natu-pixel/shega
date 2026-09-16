"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerformanceMonitor, Sparkles } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, DoubleSide, Group, InstancedMesh, MathUtils, Object3D, PointLight, Shape, Vector3 } from "three";
import { eventWorlds, type EventKind } from "@/lib/events";

type SceneProps = {
  kind: EventKind;
  progress: RefObject<number>;
  active: boolean;
  onReady: () => void;
  onFallback: (message: string) => void;
};

function Truss({ x }: { x: number }) {
  return <group position={[x, 0, -1.7]}>
    {[-.1, .1].map((offset) => <mesh key={offset} position={[offset, 2.2, 0]}>
      <boxGeometry args={[.035, 4.4, .035]} /><meshStandardMaterial color="#74786c" metalness={.8} roughness={.4} />
    </mesh>)}
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, .3 + i * .46, 0]} rotation={[0, 0, i % 2 ? -.42 : .42]}>
      <boxGeometry args={[.025, .5, .025]} /><meshStandardMaterial color="#666e62" metalness={.7} roughness={.5} />
    </mesh>)}
    <mesh position={[0, .02, 0]}><boxGeometry args={[.6, .06, .6]} /><meshStandardMaterial color="#212823" /></mesh>
  </group>;
}

function Crowd({ progress, color }: { progress: RefObject<number>; color: string }) {
  const people = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    for (let i = 0; i < 96; i++) {
      const x = ((i * 137) % 860) / 100 - 4.3;
      const z = 1.5 + ((i * 53) % 370) / 100;
      const height = .16 + (i % 5) * .015;
      dummy.position.set(x, height / 2, z);
      dummy.scale.set(.065, height, .065);
      dummy.updateMatrix();
      people.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = height + .025;
      dummy.scale.setScalar(.041);
      dummy.updateMatrix();
      heads.current?.setMatrixAt(i, dummy.matrix);
    }
    if (people.current) people.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    if (group.current) {
      group.current.visible = progress.current > .4;
      group.current.scale.y = MathUtils.clamp((progress.current - .4) * 2, .001, 1);
    }
  });
  return <group ref={group}>
    <instancedMesh ref={people} args={[undefined, undefined, 96]}>
      <cylinderGeometry args={[.7, 1, 1, 5]} /><meshStandardMaterial color="#565c4b" roughness={.8} />
    </instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, 96]}>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.08} roughness={.7} />
    </instancedMesh>
  </group>;
}

function Confetti({ progress, color }: { progress: RefObject<number>; color: string }) {
  const mesh = useRef<InstancedMesh>(null);
  const start = useRef<number | null>(null);
  const dummy = useRef(new Object3D());
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    if (progress.current > .85 && start.current === null) start.current = clock.elapsedTime;
    const elapsed = start.current === null ? -1 : clock.elapsedTime - start.current;
    mesh.current.visible = elapsed >= 0 && elapsed < 3;
    if (!mesh.current.visible) return;
    for (let i = 0; i < 48; i++) {
      const angle = i * 2.399;
      const speed = .6 + i % 7 * .13;
      dummy.current.position.set(Math.cos(angle) * elapsed * speed, 1.6 + elapsed * 2.6 - elapsed * elapsed * .8, Math.sin(angle) * elapsed * speed);
      dummy.current.rotation.set(elapsed + i, elapsed * 2, i);
      dummy.current.scale.set(.035, .07, .01);
      dummy.current.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.current.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 48]} visible={false}>
    <boxGeometry /><meshBasicMaterial color={color} />
  </instancedMesh>;
}

function Arena({ kind, progress }: Pick<SceneProps, "kind" | "progress">) {
  const stage = useRef<Group>(null);
  const lights = useRef<Group>(null);
  const spark = useRef<Group>(null);
  const cursorLight = useRef<PointLight>(null);
  const color = eventWorlds.find((world) => world.id === kind)!.color;
  const target = useRef(new Vector3());
  const sparkShape = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const radius = i % 2 ? .13 : i % 4 ? .42 : .56;
      const x = Math.sin(angle) * radius;
      const y = Math.cos(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);
  useFrame(({ camera, pointer, clock }, delta) => {
    const p = progress.current;
    target.current.set(7 + pointer.x * .35, 5.2 + pointer.y * .18 - p * .5, 10 - p * .55);
    camera.position.lerp(target.current, 1 - Math.exp(-delta * 2));
    camera.lookAt(0, 1.2, .1);
    if (cursorLight.current) {
      cursorLight.current.position.x = MathUtils.damp(cursorLight.current.position.x, pointer.x * 4, 2, delta);
      cursorLight.current.position.z = MathUtils.damp(cursorLight.current.position.z, 3 + pointer.y * 2, 2, delta);
    }
    if (stage.current) stage.current.position.y = -.45 + p * .45;
    if (lights.current) lights.current.scale.y = .1 + p * .9;
    if (spark.current) {
      spark.current.position.set(Math.sin(p * 5 + .4) * 2, 2.5 + Math.sin(clock.elapsedTime * .7) * .12, Math.cos(p * 5) * .8);
      spark.current.rotation.y += delta * .5;
    }
  });

  return <>
    <fog attach="fog" args={["#141912", 12, 25]} />
    <ambientLight intensity={.85} color="#a8b4a2" />
    <directionalLight position={[4, 9, 6]} intensity={2.3} color="#ffe1af" />
    <pointLight position={[0, 3, 0]} intensity={20} color={color} distance={12} decay={2} />
    <pointLight ref={cursorLight} position={[0, 4, 3]} intensity={8} color="#ffe4b2" distance={10} decay={2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.12, 1]}>
      <planeGeometry args={[20, 18]} /><meshStandardMaterial color="#171e19" roughness={.85} />
    </mesh>
    <gridHelper args={[18, 25, "#454335", "#27322a"]} position={[0, -.105, 1]} material-transparent material-opacity={.18} />
    <mesh position={[0, 2.7, -3.6]}>
      <torusGeometry args={[2.5, .012, 6, 100]} /><meshBasicMaterial color={color} transparent opacity={.25} />
    </mesh>
    <group ref={stage}>
      <mesh position={[0, .08, -.45]}>
        <boxGeometry args={[6.4, .3, 3.5]} /><meshStandardMaterial color="#293329" metalness={.5} roughness={.7} />
      </mesh>
      <mesh position={[0, .25, 1.3]}>
        <boxGeometry args={[6.4, .025, .025]} /><meshBasicMaterial color={color} />
      </mesh>
      <Truss x={-3} /><Truss x={3} />
      <mesh position={[0, 4.32, -1.7]}>
        <boxGeometry args={[6.2, .14, .12]} /><meshStandardMaterial color="#72786a" metalness={.8} roughness={.4} />
      </mesh>
      {kind === "fight" ? <group position={[0, .3, 0]}>
        <mesh><boxGeometry args={[3.5, .12, 2.7]} /><meshStandardMaterial color="#827b60" /></mesh>
        {[-1.75, 1.75].flatMap((x) => [-1.35, 1.35].map((z) => <mesh key={`${x}-${z}`} position={[x, .45, z]}>
          <cylinderGeometry args={[.035, .035, .95, 8]} /><meshStandardMaterial color={color} />
        </mesh>))}
        {[.3, .55, .8].flatMap((y) => [
          ...[-1.35, 1.35].map((z) => <mesh key={`h-${y}-${z}`} position={[0, y, z]}><boxGeometry args={[3.5, .017, .017]} /><meshBasicMaterial color={color} /></mesh>),
          ...[-1.75, 1.75].map((x) => <mesh key={`v-${y}-${x}`} position={[x, y, 0]}><boxGeometry args={[.017, .017, 2.7]} /><meshBasicMaterial color={color} /></mesh>),
        ])}
      </group> : kind === "culture" ? <group>
        {[-2, 0, 2].map((x) => <group key={x} position={[x, .8, -.6]}>
          <mesh><boxGeometry args={[1.5, 1.1, 1.1]} /><meshStandardMaterial color="#666347" /></mesh>
          <mesh position={[0, .95, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.2, .8, 4]} /><meshStandardMaterial color={color} roughness={.8} /></mesh>
          <mesh position={[0, .1, .56]}><planeGeometry args={[1.1, .65]} /><meshBasicMaterial color={color} /></mesh>
        </group>)}
      </group> : <group>
        <mesh position={[0, 2.15, -1.68]}>
          <boxGeometry args={[4.2, 2.7, .12]} /><meshStandardMaterial color="#171e19" emissive={color} emissiveIntensity={.025} />
        </mesh>
        <mesh position={[0, 2.2, -1.6]}>
          <ringGeometry args={[.78, .8, 64]} /><meshBasicMaterial color={color} side={DoubleSide} />
        </mesh>
        <Float speed={1} rotationIntensity={.15} floatIntensity={.2}>
          <mesh position={[0, 2.2, -1.45]}>
            <extrudeGeometry args={[sparkShape, { depth: .05, bevelEnabled: false }]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} metalness={.3} roughness={.3} />
          </mesh>
        </Float>
        {[-2.6, 2.6].map((x) => <mesh key={x} position={[x, 1.15, -.85]}>
          <boxGeometry args={[.55, 1.8, .6]} /><meshStandardMaterial color="#111712" metalness={.4} roughness={.5} />
        </mesh>)}
      </group>}
    </group>
    <group ref={lights}>
      {[-2.7, -.9, .9, 2.7].map((x, i) => <group key={x} position={[x, 2.1, -1.4]} rotation={[.2, 0, (i - 1.5) * -.18]}>
        <mesh>
          <cylinderGeometry args={[.015, .85, 4.5, 20, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={.075} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
        <mesh position={[0, 2.25, 0]}><sphereGeometry args={[.06, 8, 8]} /><meshBasicMaterial color="#fff5d9" /></mesh>
      </group>)}
    </group>
    <group ref={spark}>
      <mesh><octahedronGeometry args={[.065]} /><meshBasicMaterial color="#fff3d1" /></mesh>
      <pointLight intensity={3} color={color} distance={2} />
    </group>
    <Sparkles count={32} scale={[9, 5, 6]} size={1.4} speed={.18} color={color} opacity={.4} />
    <Crowd progress={progress} color={color} />
    <Confetti progress={progress} color={color} />
  </>;
}

export default function ArenaScene({ active, onReady, onFallback, ...props }: SceneProps) {
  return <Canvas
    camera={{ position: [7, 5.2, 10], fov: 39 }}
    dpr={[1, 1.5]}
    frameloop={active ? "always" : "never"}
    gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    onCreated={({ gl }) => {
      const context = gl.getContext();
      const debug = context.getExtension("WEBGL_debug_renderer_info");
      const renderer: unknown = debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER);
      if (typeof renderer === "string" && /swiftshader|llvmpipe|software|microsoft basic render/i.test(renderer)) {
        onFallback("Optimized illustrated experience for this device");
        return;
      }
      onReady();
    }}
    fallback={<span className="scene-status">Static experience · 3D is unavailable on this device</span>}
  >
    {active && <PerformanceMonitor
      iterations={8}
      ms={250}
      bounds={() => [24, 55]}
      onDecline={() => onFallback("Optimized illustrated experience to keep things responsive")}
    />}
    <Arena {...props} />
  </Canvas>;
}
