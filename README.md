# Shega Events

A continuous-camera, scroll-controlled concept preview for Shega Events.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

```powershell
npm run lint -- src next.config.ts
npm run build
npm start
```

On a memory-constrained machine, the webpack build uses less native memory:

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=384 --max-semi-space-size=4"
npm run build -- --webpack
```

Build parallelism is limited to one worker to accommodate the shared development machine.

## Experience

- Next.js, React, and TypeScript.
- One persistent camera viewport, one native-scroll timeline, and GSAP ScrollTrigger.
- Bermel stage orbit -> crowd -> cage entrance -> ETFC -> arena exit -> Ethiopian landscape -> shared raw meat -> tibs -> beer celebration -> ascent.
- Scroll advances or reverses the route on desktop and mobile; stopping holds the picture. The camera journey does not autoplay or switch between separate event players.
- The current milestone renders one connected real-time 3D world (React Three Fiber) with cinematic lighting, shadows, bloom, grain, and vignette. It is explicitly labeled a concept preview, not filmed event footage or a finished photoreal film.
- Every scene has its own description in a reserved side rail on desktop and below the picture on mobile. Descriptions, labels, controls, and the finale never overlay the camera image.
- Reduced motion, data saving, short viewports, explicit static mode, or media failure provide the complete non-pinned illustrated story.
- Drawing stops when not needed, outside the viewport, and while the browser tab is hidden. The former WebGL arena is no longer loaded by the homepage.
- Responsive navigation, About, social links, and the existing event-brief composer with all four generic event types remain.
- Sound defaults off. The consent-gated audio controller is ready for approved ambience/cues; the current UI honestly displays "Sound pending" because no licensed audio is supplied.
- No autoplay audio, required countdown, runtime Instagram scraping, tracking, or third-party media requests.
- Google fonts, including Ethiopic coverage, are downloaded at build time by Next.js and served locally at runtime.

### Detailed scenes with a hybrid crowd

There is one detailed presentation, with no Light/High switch. The continuous camera route, main-stage DJ show, 520-person Bermel crowd and 1,214-person arena remain:

- Foreground guests and performers use detailed human geometry, with distance-based LOD where appropriate. The cage has shadows and a textured canvas; restrained bloom and color grading remain enabled. Pixel ratio follows the device up to 1.5 with a 1920 x 1080 drawing-pixel budget, preventing oversized 4K/retina rendering buffers. HTML text and controls retain native display resolution. Drawing is display-synchronized and capped at 30 frames/second.
- Bermel is a 3D indoor hall inspired by the supplied references: layered, pleated red ceiling swags, 30 ribbed paper lanterns, black curtains, a modular charcoal stage, front monitors and a crowd barrier. Its 520 guests use nine poses, weighted toward standing with scattered frozen cheers and muted clothing instead of synchronized raised arms. Fixed warm lighting prioritizes the stage over the audience. A wider lens reveals the hall, returning smoothly to the existing MMA framing without changing camera coordinates. The whole Bermel show — DJ, MC, crowd, lights and lanterns — is static, matching the frozen-hall direction. Sweeping beams and animated Bermel smoke remain disabled. Lantern ribs use one 1 KiB procedural texture rather than extra image downloads; all 36 stage-floor panels share one instanced draw.
- [Movement-driven animation](src/components/journey/journey-motion.ts) combines camera movement with distance and view-frustum checks. The fighters, flames, smoke, grass and lantern flicker advance only while nearby and relevant to the moving camera. **Every world freezes when the camera settles**, with no idle animation/render loop. A [shared hook](src/components/journey/use-nearby-animation.tsx) retains only numeric playback times per placement, so leaving/reloading a world or the whole canvas resumes rather than resetting its animation. Paused wall-clock time is never added on resume. Time-driven film grain is removed; bloom and vignette remain. Static instanced crowds are not given animation mixers.
- Harer's [festival entrance](src/components/journey/scenes/harer-entrance.tsx) is an original earthen-and-timber gateway with an ox-horn crown, two-sided welcome sign, woven accents and static lanterns. It sits beyond the arena corridor, leaving the existing camera path clear. The opening briefly widens the lens to reveal the crown below the fixed header, then returns to the food-story framing. The gateway adds 26 draws, about 14,000 triangles and one 512 x 128 canvas texture, with no model downloads or extra lights/shadow maps. Its resources are released with the Harar world.
- Hero and standard people load the [shared-people profiles](public/models/shared-people), which keep the original geometry, poses, UVs and anchors but reference one pooled set of ten external images. The [cross-model texture pool](src/components/journey/shared-model-textures.ts) decodes each image once for both profiles — one 37.33 MiB decoded RGBA+mipmap set instead of two — and releases it after the last consumer leaves.
- Crowds use a distance-to-route detail ladder. Bermel guests the camera route never approaches within 5.5 m render as the decimated far build (about 5x fewer triangles, no download beyond one 0.76 MiB model shared with the arena). The Bermel crowd close-up drops from about 3.7 M to about 1.8 M submitted triangles per frame.
- The MMA audience uses a three-tier ladder: full 3D fans within 5.5 m of the camera route, the decimated far build for the visible middle rows, and **972 distant 2D fans**. The background uses four instanced cutout batches (1,944 triangles), rather than thousands of animated objects. The ring view drops from about 1.25 M to about 0.73 M submitted triangles per frame.
- Cutouts are baked from the same licensed human models, with eight viewpoints per pose, transparent hair/hand silhouettes and a separate clothing mask. The shader selects the appropriate viewpoint as the camera passes, preserves vertical posture and grounded feet, and tints clothes without tinting skin. Fans still face the cage; they are not one flat crowd photograph.
- Large prop/performer assets use [optimized copies](public/models/lite), with smaller decoded textures and unchanged performer geometry. These are automatic asset optimizations, not a second visual mode.
- [World residency](src/components/journey/world-residency.ts) keeps at most two heavy worlds mounted. The arena now mounts near the hall handoff (16% scroll) rather than early in Bermel — through Bermel's curtained doorway the unlit far room reads as the same near-black fog — and Bermel unloads inside the MMA entrance instead of remaining resident through the ring close-ups; Harar loads during the arena exit. Small differences between entering and leaving thresholds prevent repeated loading when scrolling back and forth at a boundary. Pausing animation saves processing; unloading worlds and releasing their assets saves memory. The camera route itself is unchanged.
- The arena lights remain mounted independently of its models, avoiding a change in every lit material's shader when entering the crowd. Shadows remain on the cage and performers; the instanced audiences no longer enter the cage's shadow pass. Their textured 3D geometry and colored clothing are unchanged. In Harar, only hero objects cast sun shadows — trees, people, the shop structure and the grill — while grass, rocks, fire stones, meat cuts, drinks and other small props skip the shadow pass, cutting the festival's shadow draw calls by roughly 35–40%.
- [Shared asset leases](src/components/journey/scene-assets.ts) release cached glTF geometry, textures, decoded image bitmaps and derived crowd materials after their last consumer leaves. Geometry is never disposed per instanced person. Short cleanup delays accommodate Strict Mode and scene handoffs. Procedural ground textures are also disposed on unmount rather than accumulating when revisiting Harar.
- Rendering stops offscreen and in hidden tabs. After five seconds outside the journey, the canvas is unmounted to release its resources while visitors browse the rest of the site. Returning restores the camera at the current scroll position; returning to a visible tab does not restart an offscreen canvas.
- The 3D renderer and postprocessing are lazy-loaded separately. **Reading view**, reduced motion, and the automatic data-saving view do not start WebGL or request model files. Reading view exposes the same ten-part story and credits; visitors using data saving may explicitly choose the camera journey.
- The complete event story is also server-rendered for JavaScript-disabled visitors. The gallery and enquiry content remain outside the canvas.

Asset selection lives in [journey-models.ts](src/lib/journey-models.ts). Regenerate the five optimized prop/performer models using [prepare-journey-lite.mjs](scripts/prepare-journey-lite.mjs); keep original files unchanged. The fighter geometry and clip must stay identical because cage grounding is tied to that asset.

```powershell
node scripts\prepare-journey-lite.mjs
node scripts\prepare-journey-lite.mjs --verify
```

For the five prepared assets, total transfer size is 34.35 MB -> 10.48 MB, and estimated decoded RGBA texture memory including mipmaps is 85.28 MB -> 33.55 MB. These are asset budgets, not total browser memory; driver allocations, framebuffers, JavaScript, and other page content add overhead. The [generated attribution/verification report](public/models/lite/attribution.json) records individual dimensions, triangle counts, bounds and preservation checks.

The [arena atlas baker](scripts/prepare-arena-fans.mjs) regenerates the transparent crowd textures and [projection/attribution metadata](public/models/arena-fans/atlas.json). [ArenaFans](src/components/journey/scenes/arena-fans.tsx) reads that same projection metadata, so changes to atlas dimensions do not move people's feet. [Audience placement](src/components/journey/scenes/arena-audience-layout.ts) retains every original fan while protecting near-camera people from looking flat.

The shared-human optimization is active: both people profiles load from `public/models/shared-people`. Regenerate and verify those assets after rebuilding either original human profile:

```powershell
node scripts\prepare-shared-people.mjs
node scripts\prepare-shared-people.mjs --verify
```

The generated shared-texture attribution report must record the input hashes, material mapping and unchanged geometry checks. Sharing the ten images replaces two 37.33 MiB decoded RGBA texture sets with one (including mipmaps); this is a decoded-texture estimate, not a measurement of total browser RAM.

## Interactive event gallery

The Moments section uses native image albums and video players, not Instagram iframes. Event filters group the selected posts into Bermel Fest, Kemn Ljemr - Album Release, and Hello Hawassa. Each card opens its complete ordered album and retains a canonical **Visit Instagram** link. The viewer supports previous/next buttons, thumbnails, arrow keys, Home/End, touch swipes on photos, and Escape. Native video controls keep playback opt-in; changing slides or closing the viewer stops and unloads video.

This is a curated local snapshot, not an automatically updating Instagram feed:

- [Media records](src/lib/instagram-gallery-media.ts) preserve each unique post's ID, canonical URL, event group, publisher credit, and ordered media.
- [Gallery types and event labels](src/lib/instagram-gallery.ts) define the required image/video metadata.
- Files are served from [public/media/instagram](public/media/instagram). Videos require a local poster as well as a playable full video file. Keep dimensions and alt text accurate; never substitute a cover image or partial video for complete media.
- To add or replace content, place the approved files in that directory and update the typed records. Do not store expiring CDN URLs, authentication tokens, or tracking parameters in source.
- Public availability on Instagram does not itself grant redistribution rights. Confirm permission to host the selected copies and verify credits before publishing.

## Use your own 3D

The active stage and cage are custom geometry, not the old concert-diorama or octagon model slots:

- [Bermel's main stage](src/components/journey/scenes/dj-stage.tsx) is staged like the supplied festival photos: eight staggered vertical LED columns form a glowing skyline behind the DJ, showing procedural washed-out live visuals (teal, white and warm variants from three tiny generated canvas textures), with truss masts topped by cool-white par bars between them and a bright deck skirt along the stage lip. The original Bermel LED artwork remains the hero center screen in front of the columns. The booth and headphoned DJ sit front and center on a raised riser with orange glow strips, while the [show layer](src/components/journey/scenes/bermel-show.tsx) adds a hype MC with a wireless mic at the stage lip, two dancers flanking the riser, four on-stage lighting totems with lit amber par heads, sub stacks at the front corners, road cases at the rear wings, five monitor wedges along the front edge and loose stage cabling. The former four-piece band layout is removed; its fantasy-creature drummer is not used.
- The DJ show is fully static, so Bermel requests no animated performer model. The animated-model helper and its movement/proximity controller remain in use by the arena fighters; an explicit `paused` prop can keep an individual actor still.
- [ETFC's cage](src/components/journey/scenes/etfc-cage.tsx) is integrated with a custom indoor venue, not a claimed reconstruction of Adwa. Keep its entry and corridor exit open. [fighter.glb](public/fighter.glb), **MMA Ground and Pound** by [mortaleiros](https://sketchfab.com/mortaleiros), already contains **two fighters**; render exactly one scene instance.
- [Prepared humans](src/components/journey/festival-person.tsx) preserve normalized hand/head anchors and share source geometry/materials. [Crowds](src/components/journey/dance-crowd.tsx) use static instancing, varied clothing and target-facing placement; do not add individual animation mixers or a synchronized bouncing shader.
- Rebuild prepared human detail profiles with [the existing preparation script](scripts/prepare-festival-people.mjs), retaining source credits and compatible pose names. Use distant detail for upper-tier fans, not high-detail copies for every person.
- [Scene credits](public/models/scene-models.attribution.json) identify the band/fighter assets and link to [prepared-human credits](public/models/festival-people.attribution.json). Both camera and reading views expose the credits.

Generating models with a 3D AI instead? [MODELS.md](MODELS.md) contains ready-to-paste briefs for every remaining character and prop — prompts, sizes, poses, file names, and priority order.

Each environment lives under [src/components/journey/scenes](src/components/journey/scenes). To integrate another model:

1. Export a `.glb` with compressed textures, real-world scale close to the placeholder layout noted in the scene file header.
2. Put the file in `public/models` (only assets you have rights to).
3. Use [ModelSlot](src/components/journey/model-slot.tsx) for optional props, or load directly with drei's `useGLTF` for full control. Use [AnimatedModel](src/components/journey/animated-model.tsx) only for an asset with a valid animation clip.
4. Keep the two cage openings, the corridor width, and the festival walking line clear (each header lists them), or adjust the flight in [camera-path.ts](src/components/journey/camera-path.ts) to match your geometry.
5. Check the journey by scrolling through in both directions and watching the console for loading errors. Large GLBs slow the first paint — compress with Draco/KTX2 where possible.

**License note:** retain CC BY attribution and adaptation details when shipping these models. An embeddable Sketchfab page alone does not grant permission to download, modify or redistribute its model.

## Continuous master integration

The production footage is an external dependency. The real-time scene validates the route and interaction; true photorealism comes from an offline-rendered or filmed master (Blender/Unreal/camera) scrubbed by the same scroll controller. The separate 12-second portrait promo is no longer in scope.

1. Produce and approve ONE seamless filmed/VFX master. Match camera position, perspective, movement, exposure, and human action across every hidden join. Doorways and foreground occlusion must remain plausible in both scroll directions.
2. Protect landscape and portrait compositions; export frame-aligned renditions of the same route with the same constant frame rate and frame count. No arbitrary event-clip crossfades.
3. Create silent, seek-friendly web encodes (early metadata, short keyframe intervals) and a poster. Host with byte-range support. Keep camera originals, large edit masters, and private release forms outside the web app.
4. Set the approved rendition paths, poster, frame count, and fps in [the journey manifest](src/lib/journey.ts). Align beat starts with the approved timeline. Only switch the manifest from `storyboard` to `approved` after checking media and rights.
5. Add licensed separate audio cues to the same manifest. They load only after an explicit sound gesture. Ambience follows route position; it is not a reversed or lip-synced video soundtrack.
6. Verify displayed frames at fixed scroll positions, stop/hold behavior, reversal across all joins, rapid scrolling, hidden-tab return, and actual mobile seeking. Optimize the encoding before declaring the media ready.

The renderer keeps a single paused video element mounted across the journey. If final encoding cannot provide acceptable seeking on target devices, a bounded image-sequence decoder of the **same master** is a possible follow-up, not an implemented or automatic fallback. It must not be replaced by mobile autoplay.

## Preview boundaries

This is not a production event archive. The cinematic scenes are labeled 3D concepts, not event footage. The separate gallery uses the user-selected Instagram media with source-post links and publisher credits. Confirm public event details, credits, and media permissions before production; no stock images are presented as Shega events.

The event form creates a brief in browser memory. It does not store or transmit personal details and has no backend. Visitors can explicitly copy the brief and open [Shega's Instagram](https://www.instagram.com/shega_events/) to send it themselves. Clipboard failures preserve the brief and offer manual copying.

Search indexing is disabled in [the layout metadata](src/app/layout.tsx) until the preview content is verified and ready to publish.

## Main components

- [Page composition and interactions](src/components/shega-experience.tsx)
- [Single camera stage and unobscured scene descriptions](src/components/camera-journey.tsx)
- [Continuous 3D world composer, camera rig, and post effects](src/components/journey/scene.tsx)
- [Camera flight path and world map](src/components/journey/camera-path.ts)
- Separate scene files to rebuild individually: [Bermel stage](src/components/journey/scenes/bermel-stage.tsx), [ETFC cage](src/components/journey/scenes/etfc-cage.tsx), [exit corridor](src/components/journey/scenes/exit-corridor.tsx), [Harer festival](src/components/journey/scenes/harer-festival.tsx)
- Shared scene toolkit: [placeholder people](src/components/journey/people.tsx) and [smoke, fire, dust, ground](src/components/journey/effects.tsx)
- [Approved master renderer](src/components/journey-media.tsx)
- [Scroll lifecycle](src/lib/use-journey-progress.ts) and [opt-in audio lifecycle](src/lib/use-journey-audio.ts)
- [Static story](src/components/journey-static-story.tsx)
- [Journey data, media approval state, and audio cues](src/lib/journey.ts)
- [Interactive local-media gallery and album viewer](src/components/instagram-moments.tsx)
- [Event brief](src/components/event-brief.tsx)
- [Event data and Instagram destination](src/lib/events.ts)
- [Existing site styles](src/app/globals.css) and [journey layout and responsive styles](src/app/journey.css)

## UI UX Pro Max helper

The project-scoped Copilot helper is installed at [.github/skills/ui-ux-pro-max](.github/skills/ui-ux-pro-max), with its MIT license and local Python search runtime. It comes from the [official repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), pinned to `7f69fed6a2717900085f1bc3b263721f8ba025e2`. No global installation or Python packages are required.

```powershell
python -B .\.github\skills\ui-ux-pro-max\scripts\search.py "scroll reveal" --domain gsap
```

The helper informs design and accessibility; React Three Fiber, postprocessing, the paused-video renderer, GSAP, and CSS provide the journey runtime.

Before production, replace concept artwork with authorized media where appropriate, confirm all public credits, connect a real enquiry destination if desired, review privacy requirements, and measure performance with the final media on representative devices.
