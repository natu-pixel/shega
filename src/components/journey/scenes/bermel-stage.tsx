"use client";

/**
 * SCENE 1 — BERMEL FEST (scroll 0.00 → 0.26)
 *
 * Zone: stage at (0, 0), LED wall behind it at z = +3.6, crowd fills z = -4 … -24.
 * The camera orbits the artist, then travels forward through the crowd toward
 * the ETFC cage at (0, -34), passing above a continuous audience rather than an aisle.
 *
 * Replace anything inside <group> with your own 3D. To load a Blender export, put
 * the file in public/models and use drei's useGLTF — see "Use your own 3D" in the README.
 */

import { FestivalCrowd } from "../dance-crowd";
import { DjStage } from "./dj-stage";
import { BermelHall } from "./bermel-hall";

export function BermelStage() {
  return (
    <group name="bermel-static-world">
      <BermelHall />
      <DjStage />
      <pointLight position={[-3.5, 7, -2]} color="#ffe8cf" intensity={120} distance={28} decay={2} />
      <pointLight position={[0, 5.8, -10]} color="#ffddad" intensity={58} distance={26} decay={2} />
      <pointLight position={[0, 4.8, -21]} color="#f2dcc0" intensity={34} distance={23} decay={2} />
      <FestivalCrowd count={520} center={[0, -14.1]} spread={[22.2, 18.5]} seed={11} target={[0, -2.7]} />
    </group>
  );
}
