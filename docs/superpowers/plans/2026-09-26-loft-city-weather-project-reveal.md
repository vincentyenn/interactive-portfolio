# Loft City, Weather, and Project Reveal Implementation Plan

> **Implementation record:** Work was completed in the existing worktree, preserving its prior approved changes. Blender was unavailable, so the runtime shell patch is active while the editable Blender source is prepared for a later export.

**Goal:** Keep the portfolio inside the loft and add a top-down blueprint reveal, a visible fictional city outside real window openings, a six-minute lighting cycle, and one synthetic weather condition per browser tab.

**Architecture:** Keep the main experience on React Three Fiber. Load the room GLB and the locally bundled exterior facade glTF as separate assets; add the distant skyline in Three.js so it stays light and varied. A focused environment module owns the accelerated day cycle, per-tab weather selection, and weather effects; the existing route state continues to own navigation and project content. Preserve the existing shelf, chair, door, poster, computer, and camcorder work already present in the worktree.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Drei, GSAP, Blender Python exporter, Poly Haven CC0 glTF assets.

---

## File Structure and Ownership

- `scripts/build_loft.py`: editable loft shell, actual rear window apertures, mezzanine stair opening, and landing guardrail.
- `assets/loft-room.blend`, `public/models/loft-room.glb`: generated source and browser room model.
- `public/models/loft-city/`: the official 1K Poly Haven facade glTF, binary, textures, and source/license record.
- `src/LoftCity.tsx`: lazy city asset, lightweight skyline fallback, window lighting, and exterior precipitation geometry.
- `src/LoftEnvironment.tsx`: per-tab weather selection and live day/weather state for the R3F scene.
- `src/LoftScene.tsx`: connect environment and city, hold the overhead camera for project details, and raise the flat blueprint.
- `src/App.tsx`, `src/styles.css`: project-open class, crisp HTML project screen, and keyboard focus restoration.
- `ASSETS.md`: exact source links, licenses, changes, and final bundled asset sizes.

## Execution Order

The runtime browser scene is the current source of truth for the loft shell. When Blender is available, export `assets/loft-room.blend` and `public/models/loft-room.glb` from the updated script to bring those files into agreement. Worktree changes remain unstaged.

### Task 1: Open the stairwell and rear window bays

**Files:**
- Modify: `scripts/build_loft.py`
- Regenerate: `assets/loft-room.blend`
- Regenerate: `public/models/loft-room.glb`

- [x] **Step 1: Replace the solid rear wall with wall segments around three apertures.** Keep the existing window centers `(-4.5, -2.75, -1.0)`, opening width `1.42`, and opening range `y=3.34..5.90`. The runtime helper creates the lower wall, upper header, and piers as named plaster meshes and leaves desk and experience-display wall sections solid.
- [x] **Step 2: Cut a stair opening through the mezzanine.** The authored and runtime stair flights rise from approximately `(-4.2, 0.19, 3.0)` to `(-1.8, 2.91, -2.25)`. Runtime geometry now has the opening and removes the center section of the mezzanine edge rail where the stair enters.
- [x] **Step 3: Finish the upper landing.** The runtime helper adds a narrow oak landing and steel guardrail; the procedural handrail ends at the landing edge.
- [ ] **Step 4: Export the editable and browser models.** Blender is unavailable in this environment. `src/LoftShellFixes.ts` applies the wall, stair opening, landing, and rail fixes at runtime, and `scripts/build_loft.py` is updated for a later export. The checked-in `.blend` and room `.glb` remain stale until then.
- [ ] **Step 5: Inspect the exported mesh placement.** Requires Blender to verify aperture and stair-opening mesh volumes and inspect the exported room interactively.

### Task 2: Bundle the authored facade and assemble a varied city

**Files:**
- Create: `public/models/loft-city/` with official source glTF, binary, textures, and license text
- Modify: `ASSETS.md`

- [x] **Step 1: Bundle a web-sized human-made building asset.** Poly Haven's [Modular Urban Apartments Facade](https://polyhaven.com/a/modular_urban_apartments_facade), CC0 by James Ray Cock, is bundled as glTF with 1K textures. The 16,488,693-byte transfer is checksum-verified against the official API.
- [x] **Step 2: Assemble a varied skyline around the imported facade asset.** `src/LoftCity.tsx` places the facade near the windows and adds authored Three.js towers with varied silhouettes, rooftop equipment, and restrained lit windows outside the loft.
- [x] **Step 3: Keep the city independent of the room model.** The source glTF loads lazily from its own `Suspense` boundary. The authored skyline remains visible during loading or failure; no duplicate city GLB is required.
- [x] **Step 4: Record the exact asset provenance.** `ASSETS.md` records the asset source, artist, license, local modifications, and bundled size. The full-resolution package is not bundled.

### Task 3: Add the environment controller and progressive exterior

**Files:**
- Create: `src/LoftEnvironment.tsx`
- Create: `src/LoftCity.tsx`
- Modify: `src/App.tsx`
- Modify: `src/LoftScene.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Define stable visit weather.** `src/visitWeather.ts` selects and stores one condition per session tab, using the approved weights and winter snow adjustment. App keeps its choice in state if storage is unavailable, and passes it through navigation to the scene.
- [x] **Step 2: Implement the accelerated daylight state.** `src/LoftEnvironment.tsx` exposes `{ weather, phase, daylight }` through context and interpolates lighting over a 360-second R3F clock cycle without per-frame React state updates.
- [x] **Step 3: Implement weather visuals outside the loft.** `src/LoftCity.tsx` bounds clouds and precipitation to the exterior, animates rain/snow, uses occasional soft storm pulses, freezes precipitation and suppresses lightning for reduced motion, and reduces particle counts on mobile.
- [x] **Step 4: Load the imported city after the room.** The locally bundled glTF uses its own `Suspense` and error boundary. The authored skyline is the loading and failure fallback.
- [x] **Step 5: Connect city and weather to the scene.** The environment controller and city are mounted inside the loft scene; task lights remain as fixed practical lamps.
- [x] **Step 6: Keep the viewport and fallback behavior intact.** The existing viewport, WebGL fallback, HTML panels, and semantic weather description remain in place.

### Task 4: Make the project reveal stay overhead

**Files:**
- Modify: `src/LoftScene.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Remove the project-detail camera switch.** The detail camera marks were removed. The Projects route uses the same overhead camera mark when a project is selected.
- [x] **Step 2: Raise the selected blueprint flat toward the fixed camera.** Only the selected blueprint's vertical position and restrained scale change. Its project screen remains scrollable; reduced motion shows the final state immediately, with a shorter, smaller lift on mobile.
- [x] **Step 3: Blur only the WebGL canvas while details are open.** The `project-open` class applies blur and dimming to `.loft-canvas`; the Drei HTML sheet and page navigation remain sharp.
- [x] **Step 4: Restore keyboard focus to the selected blueprint.** In-world buttons and accessible project choices carry `data-blueprint-index`. Back returns focus to the selected in-world blueprint, with the semantic list as fallback.

### Task 5: Build and verify the complete interaction

**Files:**
- No new files unless a mismatch is found; fix the owning file from Tasks 1–4.

- [x] **Step 1: Run the production build.** `npm run build` completed successfully after the implementation.
- [x] **Step 2: Verify scene asset outputs.** The room GLB exists; the city glTF, binary, and textures are bundled under `public/models/loft-city/` and use Vite's base-aware path. The room GLB still needs regeneration from Blender.
- [x] **Step 3: Verify project screen and browser fallback.** Browser accessibility inspection confirmed project detail content and the `?no3d` navigation/project choices. A visual interaction pass was not possible in the available browser tooling, so overhead camera movement, blur, scrolling, and focus return are established by code review rather than screenshot evidence.
- [ ] **Step 4: Verify scene adaptations visually.** Desktop/mobile layout and reduced-motion behavior still need a visual pass; Blender is unavailable for checking the exported shell. The CUA browser exposed accessibility trees but not screenshots, and headless Chrome exited before producing one.
- [ ] **Step 5: Verify cycling and visit state visually.** The six-minute interpolation and per-session weather persistence are implemented, but a full accelerated-cycle visual inspection has not been completed.

## Spec Coverage Review

- The project-open camera, flat blueprint, canvas blur, scrolling DOM screen, focus return, mobile sizing, and reduced-motion endpoint are covered by Task 4. Browser content and fallback DOM checks passed; visual motion/focus behavior remains unverified.
- The stair opening, aligned flight, landing guardrail, and true rear apertures are covered by Task 1.
- The fictional modern city, imported human-made detail, local optimization, separate progressive load, skyline fallback, and asset provenance are covered by Task 2 and Task 3.
- The six-minute day cycle, fixed per-tab weather, winter-only snow, exterior-only precipitation, mobile reduction, and reduced-motion behavior are covered by Task 3; animated phases still need visual confirmation.
- Navigation, WebGL fallback, no-scroll viewport, desktop/mobile/reduced-motion/browser acceptance checks are covered by Task 5.
- Existing shelf/chair, door, Experience artwork, computer screen, camcorder preview, and Threepipe separation are intentionally preserved.

## Plan Self-Review

- Placeholder scan: no TODO/TBD steps remain.
- Interface consistency: `Weather` is defined once in `LoftEnvironment.tsx` and passed from App to LoftScene; the environment context is consumed by the city visual components.
- Scope: all features share the same viewport-sized loft and are sequenced around the room GLB, city GLB, and route state, so one integrated plan is appropriate.
- License and payload: the source kit is CC0; the official glTF bundle with 1K textures is checksum-verified and measures 16,488,693 bytes.
