"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

export default function ScenePostprocessing() {
  return <EffectComposer multisampling={0}>
    <Bloom mipmapBlur intensity={0.65} luminanceThreshold={0.85} luminanceSmoothing={0.25} />
    <Vignette offset={0.22} darkness={0.6} />
  </EffectComposer>;
}
