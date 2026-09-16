# Shega Journey — 3D Model Briefs

Briefs for generating every character and prop with a 3D-modeling AI. One section per scene.
Paste the **Prompt** text into your generator, then export with the **Global rules** below.

## Global rules (apply to every model)

- Format: **GLB** (glTF binary), PBR materials (base color + roughness + normal), no embedded lights or cameras.
- Scale: **real-world meters** (1 scene unit = 1 m). A standing adult ≈ 1.7 m tall.
- Orientation: **Y up**, character facing **+Z**, pivot/origin at the **center of the feet on the ground**.
- People: Ethiopian men and women, natural dark-brown skin tones, realistic faces (or stylized-realistic if your generator can't do faces well), contemporary casual clothing unless stated.
- Poly budgets: close-up characters ≤ 40k triangles; background characters ≤ 10k; props ≤ 20k; texture ≤ 2048px (512px for background people).
- No text, logos, or brand marks on anything.
- Save into `public/models/` using the exact file name given.

Style keywords to include in every prompt:
`realistic, cinematic, physically based materials, natural proportions, game-ready, clean topology`

---

## SCENE 1 — BERMEL FEST (night concert)

Mood: dark open-air festival, purple/blue stage light, smoke, high energy.

| File name | Model | Prompt | Size / pose notes |
|---|---|---|---|
| `bermel-artist.glb` | The performing artist | "Young Ethiopian male musician performing on stage, holding a microphone in right hand raised toward the crowd, left arm stretched up in triumph, stylish black jacket, energetic wide stance, realistic, cinematic" | 1.8 m tall. Seen from 3–6 m during a camera orbit — needs a good face and hands. ≤ 40k tris. |
| `bermel-fan-a.glb` | Crowd fan, arms up | "Ethiopian young man in a festival crowd, both arms raised high, head tilted up, cheering, t-shirt and jeans, night concert lighting, realistic" | 1.75 m. Background instancing — ≤ 10k tris, 512px texture. |
| `bermel-fan-b.glb` | Crowd fan, jumping | "Ethiopian young woman jumping at a concert, one fist in the air, joyful open-mouth smile, casual top and trousers, realistic" | 1.65 m, mid-jump pose with feet just off ground. ≤ 10k tris. |
| `bermel-fan-c.glb` | Crowd fan, phone up | "Ethiopian man in his twenties filming a concert with his phone held high, other hand in pocket, hoodie, realistic" | 1.75 m. ≤ 10k tris. |
| `bermel-fan-d.glb` | Crowd fan, dancing | "Ethiopian woman dancing at a night festival, arms bent at elbows, hips mid-motion, braided hair, casual dress, realistic" | 1.65 m. ≤ 10k tris. |
| `bermel-stage.glb` | Stage set | "Outdoor concert stage: 14 m wide, 0.8 m high black platform, large LED video wall 12 m wide × 7 m tall behind it, metal truss frame, two big black PA speaker stacks left and right, moving-head light fixtures on top truss, realistic concert equipment" | Footprint 14 × 8 m. Camera passes within 3 m. ≤ 60k tris total. |

The website adds the beams, smoke, and crowd duplication itself — do not bake light cones or fog into the models.

---

## SCENE 2 — ETFC (MMA cage)

Mood: dark arena, one hard white spotlight over the cage, tension.

| File name | Model | Prompt | Size / pose notes |
|---|---|---|---|
| `etfc-fighter-red.glb` | Fighter A | "Ethiopian male MMA fighter in red fight shorts and red 4 oz open-finger gloves, athletic muscular build, southpaw guard stance, fists up protecting chin, slight forward lean, sweat sheen on skin, realistic" | 1.8 m in stance. THE closest model in the whole site (camera comes within 1 m) — best quality, ≤ 40k tris, 2048px skin texture. |
| `etfc-fighter-blue.glb` | Fighter B | "Ethiopian male MMA fighter in dark blue shorts and blue gloves, lean athletic build, orthodox stance mid-kick with right leg raised, arms guarding, intense focused expression, realistic" | 1.8 m. Same quality as fighter A. |
| `etfc-referee.glb` | Referee (optional) | "MMA referee, Ethiopian man, black shirt and black trousers, black latex gloves, alert crouched watching pose, realistic" | 1.75 m. ≤ 15k tris. |
| `etfc-cage.glb` | The octagon | "Professional MMA octagon cage: 12 m across, dark gray canvas floor with subtle wear, black padded edge, chain-link fence walls 2.4 m high with black vinyl coating, padded posts at each corner, **two opposite gate openings left fully open**, realistic sports equipment" | CRITICAL: two open gates roughly 90° apart (camera enters one, exits the other). Floor top surface at y = 0.29 m. ≤ 50k tris. |
| `etfc-spectator-a.glb` | Ringside fan, tense | "Spectator at a fight night, Ethiopian man leaning forward with fists clenched, shouting, casual shirt, realistic" | 1.75 m. ≤ 10k tris. |
| `etfc-spectator-b.glb` | Ringside fan, cheering | "Spectator at a fight night, Ethiopian woman standing with both arms raised celebrating, excited expression, realistic" | 1.65 m. ≤ 10k tris. |

---

## SCENE 3 — ARENA EXIT CORRIDOR

Mood: dark concrete passage opening into warm daylight.

| File name | Model | Prompt | Size / pose notes |
|---|---|---|---|
| `arena-corridor.glb` | Corridor section | "Sports arena service corridor, 12 m long, 5 m wide clear passage, 4 m tall, raw concrete walls with subtle stains, exposed cable trays and pipes along the ceiling, a few wall-mounted work lights (unlit geometry only), double door frame standing open at the far end, realistic architecture" | The camera flies straight down the middle — nothing may intrude into the central 4 m of the passage. ≤ 40k tris. |

---

## SCENE 4 — HARER ENA SENGAW (golden-hour meat festival)

Mood: warm Ethiopian late-afternoon sun, open field, trees, smoke, friends and food.

| File name | Model | Prompt | Size / pose notes |
|---|---|---|---|
| `harer-elder-sitting-a.glb` | Seated elder, feeding gesture | "Older Ethiopian man about 60, seated on a low wooden bench, leaning forward offering a piece of food with his right hand in a warm feeding-a-friend gesture (gursha), white traditional cotton shawl (gabi) over shoulder, gentle smile, realistic" | Seated height ≈ 1.3 m. Seen within 2–3 m: ≤ 25k tris. |
| `harer-elder-sitting-b.glb` | Seated elder, receiving/laughing | "Older Ethiopian woman, seated, laughing warmly with head slightly back, one hand near her mouth, traditional white dress with woven colored border, headwrap, realistic" | Seated ≈ 1.25 m. ≤ 25k tris. |
| `harer-guest-sitting-c.glb` | Seated guest, eating | "Ethiopian man in his forties seated at a wooden table, cutting a piece of raw meat with a small knife over a wooden platter, relaxed posture, casual shirt, realistic" | ≤ 20k tris. |
| `harer-cook.glb` | The grill cook | "Ethiopian man grilling meat, standing over a charcoal grill, turning meat with long metal tongs in right hand, slight forward lean, apron over casual clothes, focused friendly expression, realistic" | 1.75 m. Camera comes within 1.5 m of the grill — good hands/face. ≤ 30k tris. |
| `harer-toast-a.glb` | Friend toasting | "Ethiopian man early thirties, standing relaxed, raising a beer bottle at chest-to-eye height toward a friend in a toast, other hand loose, big genuine smile, casual shirt, realistic" | 1.75 m. Toast happens 1 m from camera. ≤ 30k tris. |
| `harer-toast-b.glb` | Friend toasting (mirrored) | "Ethiopian woman late twenties, raising a beer glass in a toast, laughing, braided hair, casual jacket, realistic" | 1.65 m. ≤ 30k tris. |
| `harer-table-set.glb` | Table + benches + food | "Rustic wooden festival table 2.6 m long with two benches, on top: round wooden platters with cubes of raw beef, small bowls of red spice paste (awaze and mitmita), injera flatbread rolls, a knife, water bottles, realistic Ethiopian meat festival table" | Table top at 0.72 m. ≤ 25k tris. |
| `harer-grill.glb` | Charcoal grill station | "Large rectangular charcoal grill 2.5 m long, dark weathered steel body, grill grate with strips of sizzling marbled beef (tibs), glowing orange charcoal visible below the grate, metal side table with tongs, realistic" | Grate at 0.9 m. Charcoal should use an **emissive orange material** so the site's bloom makes it glow. ≤ 30k tris. |
| `harer-tree.glb` | Acacia tree | "African acacia tree with wide flat umbrella-shaped canopy, slightly leaning trunk, dry-season olive-green foliage, realistic, game-ready with alpha-card leaves" | 5–7 m tall. Instanced many times: ≤ 15k tris. |
| `harer-walker-a.glb` | Festival guest walking | "Ethiopian man strolling casually with hands relaxed, mid-step, casual weekend clothes, realistic" | 1.75 m. ≤ 10k tris. |
| `harer-walker-b.glb` | Festival guest chatting | "Ethiopian woman standing in conversation, one hand gesturing, scarf over shoulders, warm expression, realistic" | 1.65 m. ≤ 10k tris. |

The site provides fire flames, smoke, sun, and ground — don't model those (except the emissive charcoal).

---

## Priority order

If you generate in stages, do the close-up models first — they carry the whole experience:

1. `etfc-fighter-red` + `etfc-fighter-blue` (camera circles them at 1 m)
2. `harer-toast-a` + `harer-toast-b` and `harer-cook` + `harer-grill`
3. `bermel-artist`
4. `harer-elder-sitting-a/b` + `harer-table-set`
5. Everything else (crowd variants, trees, stage, cage, corridor)

## After generation

Drop the `.glb` files into `public/models/` and tell the site which scene each belongs to —
integration uses `useGLTF` inside the matching file in `src/components/journey/scenes/`
(see "Use your own 3D" in the README). Every scene file's header comment lists the exact
coordinates where each model goes and the space that must stay clear for the camera.
