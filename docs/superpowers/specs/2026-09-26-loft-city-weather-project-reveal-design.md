# Loft City, Weather, and Project Reveal

## Status

The design sections were approved in chat on 2026-09-26. This document is ready for user review before implementation planning.

## Goal

Keep the portfolio entirely within its interactive loft while making project selection feel like a physical blueprint reveal, fixing the stair-to-mezzanine intersection, and adding a living city view beyond the loft windows.

## Current State

- `src/LoftScene.tsx` uses React Three Fiber, Drei, Three.js, and GSAP for one GLB loft scene and camera marks.
- The Projects route already frames the workbench from above. Selecting a project currently moves the camera to a front-facing detail mark and rotates the blueprint upright.
- `scripts/build_loft.py` creates the mezzanine as a single solid slab. The staircase is composed in the browser, and its upper rail intersects the slab.
- The rear wall is a solid plaster wall; window panes are placed in front of it, so an exterior city cannot be seen through them.
- The current room lighting, background, and fog use fixed colors and intensities.
- Threepipe is used separately for the About-page camcorder preview. The main loft remains on React Three Fiber.

## Approved Design

### Project reveal

- Keep the camera at the existing top-down Projects mark after a blueprint is selected. Remove the project-detail camera marks and camera transition.
- Keep the selected blueprint horizontal. Animate it upward toward the fixed camera, with a restrained scale increase, and present its existing scrollable semantic HTML project screen over it.
- Blur and dim the WebGL canvas while the project is open. Keep the HTML project screen, links, controls, and focus states sharp and usable.
- Keep the Back to blueprints route and restore focus to the selected blueprint when returning to the workbench.
- For reduced motion, show the final project position immediately and avoid animated blur or blueprint movement. Mobile uses a shorter, smaller reveal.

### Stairs and loft structure

- Replace the uninterrupted mezzanine slab in the Blender source with geometry that leaves a stair opening at the upper landing.
- Align the top tread and handrail to the opening. Add trim and guardrail around the opening so the transition to the mezzanine reads as a finished stair landing.
- Keep the procedural browser staircase and exported GLB geometry in agreement. Re-export `public/models/loft-room.glb` from `scripts/build_loft.py`.

### City and windows

- Build a fictional contemporary tech district, drawing on New York’s vertical scale and dense mixed-use blocks, with Tokyo and Taipei influences in layered storefront signs, balconies, rooftop equipment, and compact urban lighting. Do not reproduce a specific city block, trademark, or sign.
- Use varied imported, human-made building assets rather than repeating one facade. A candidate base is Poly Haven’s Modular Urban Apartments Facade, a 118K-triangle PBR asset available in glTF and CC0. Use a web-appropriate texture resolution and optimize the combined asset before it is bundled. Review the selected assets’ attribution and license requirements and record them in `ASSETS.md`.
- Rebuild the rear wall around actual framed window openings, then place the city geometry beyond the wall so it is visible from the room and from the project workbench view. Add facade lighting and atmospheric depth as separate scene elements that can respond to the day cycle.
- Do not use AI-generated environment imagery or depend on a remote city service at runtime.

### Day and weather

- Add one environment controller in the existing React Three Fiber scene. It coordinates scene background, fog, ambient and directional light, exterior light, and city window illumination without replacing the renderer or adding another scene stack.
- Run a six-minute loop from day to sunset to night and back to day, with smooth color and light transitions. The cycle starts in the day phase.
- Pick one synthetic weather condition per browser tab visit and preserve it while moving between portfolio routes. Do not query local conditions or a weather API.
- Weather options are clear, cloudy, rain, thunderstorm, and snow. Clear and cloudy together should be the common result (about 70–80% of selections); the remaining probability is shared across rain and storms. Snow is eligible in November through February using the Northern Hemisphere calendar, and replaces part of the clear/cloudy probability in those months.
- Keep rain and snow outside the window openings. A thunderstorm may add occasional soft exterior lightning illumination. The selected weather condition remains fixed for the visit while rain, snow, and lightning effects animate within that condition.
- Reduce particle counts and transition effects on mobile. Honor reduced-motion settings by stopping moving precipitation and lightning flashes while retaining a visible indication of the selected weather and current day phase.

### Loading, fallback, and access

- Load the city asset progressively after the loft shell; the navigation and project content remain available while it loads.
- If the city asset fails, show a lightweight skyline fallback beyond the windows. If the existing WebGL scene fails, preserve the current HTML navigation and portfolio fallback.
- Keep semantic HTML controls for blueprint selection and project details. Keyboard, touch, and pointer access continue to work.
- Keep the site viewport-sized with no document scrolling.

## Architecture and Scope

- Keep the current Vite, React, Three.js, React Three Fiber, Drei, and GSAP stack for the main loft.
- Add focused scene modules for the city/environment controller or precipitation if `src/LoftScene.tsx` would otherwise absorb unrelated responsibilities.
- Expected edits: `scripts/build_loft.py`, `assets/loft-room.blend`, `public/models/loft-room.glb`, `src/LoftScene.tsx`, `src/App.tsx` for project-open styling state if needed, `src/styles.css`, and `ASSETS.md`; add a small city/environment component only if needed for a clear boundary.
- Keep Threepipe confined to its existing camcorder preview.
- Do not add a weather API, routing dependency, or full renderer migration.

## Acceptance Checks

1. The Projects camera remains overhead before, during, and after project selection.
2. Selecting a blueprint raises it flat toward the camera, blurs the WebGL scene, and keeps the scrollable HTML project content sharp and operable.
3. Back to blueprints restores the overhead blueprint layout and keyboard focus.
4. The upper stair reaches a landing without the tread or rail intersecting the mezzanine slab; the opening and guardrail are visible in the room scene.
5. The rear windows are real openings and reveal a varied fictional downtown skyline.
6. The day phase cycles through day, sunset, and night on a six-minute loop, independently of weather.
7. A tab visit selects one weather condition; route changes preserve it. Clear and cloudy are more common than precipitation, and snow is only eligible in the defined winter window.
8. Rain, snow, and thunderstorm effects remain outside the loft. Mobile, reduced-motion, and unavailable-asset fallbacks remain usable.
9. Existing navigation, scroll behavior, and WebGL failure handling continue to work.

## Risks and Mitigations

- **City asset weight:** use reduced texture resolutions, merge repeated geometry where appropriate, and load the exterior progressively. Keep distant buildings simpler than nearer facades.
- **Visual mismatch between assets:** select a restrained shared material palette and adjust roughness, exposure, and window-light color in the Blender export and scene lighting.
- **Weather can obscure the city:** keep particle density and contrast low enough that the skyline remains readable, especially on mobile.
- **Stair opening can weaken the mezzanine silhouette:** keep the opening aligned to the actual stair path and frame it with a slim landing trim and guardrail.
