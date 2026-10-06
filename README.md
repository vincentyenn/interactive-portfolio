# The Loft: interactive portfolio

The portfolio lives entirely inside an original 3D loft built in Blender and rendered with React Three Fiber. There is no long page below the room. Visitors select a room object or an HTML destination control to move between the overview, projects, experience, about, and contact panels.

## Explore the loft

| Room element | Destination |
| --- | --- |
| Computer | Portfolio overview and links to the other areas |
| Workbench | Top-down view of three project blueprints and project details |
| Experience wall | Internship and research timeline |
| Personal shelf | About and interests |
| Doorway / intercom | Contact and GitHub |

The camera moves to each object. The monitor and project sheets render their content into live canvas textures on the actual 3D surfaces. Their text can scroll while the site itself remains within one viewport. Other destinations use semantic HTML panels. Invisible semantic controls preserve keyboard input, links, and screen-reader access for the textured surfaces.

## Addressable destinations

Hash routes support direct links, refresh, and browser Back / Forward while keeping the GitHub Pages project path intact:

- `#/room` opens the loft introduction.
- `#/overview` opens the computer overview.
- `#/projects` opens the workbench and blueprint list.
- `#/projects/personal-website` opens a project's details. The other project routes use their IDs from `content/portfolio.json`.
- `#/experience`, `#/about`, and `#/contact` open their matching room destinations.

The empty hash opens `#/room`. The project detail Back control returns to the blueprint list. Back to the loft returns to the opening view.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Vite's configured base path is `/interactive-portfolio/`, matching this repository name for GitHub Pages. The local server prints the exact URL. Build with `npm run build`.

The 3D model is committed at `public/models/loft-room.glb`; Blender is not needed to run the site. If WebGL cannot start, the model fails, or the rendering context is lost, the same HTML destination controls and content panels remain available over a CSS background. Append `?no3d=1` locally to preview this fallback.


## Technical notes

- React, TypeScript, Vite, Three.js, React Three Fiber, Drei, and GSAP.
- Blender 4.5 source scene, exported to GLB with embedded PBR materials.
- Mobile uses a simplified camera composition and lower render resolution; destination controls are touch-sized.
- The canvas is decorative to assistive technology. Keyboard and touch navigation use real HTML controls with visible focus states.
- Reduced-motion preferences make camera changes immediate.
- Hash routes work on GitHub Pages without a server rewrite or runtime router dependency.
- No analytics, authentication, backend, or external asset API is required at runtime. Google Fonts may load when network access is available; local font fallbacks are supplied.

## Daylight and weather

`src/LoftEnvironment.tsx` controls the six-minute day/sunset/night cycle, weather-dependent sky/fog, exterior sunlight, and interior practical lights. Reduced motion holds daylight steady. `src/WindowSunlight.tsx` adds subtle depth-tested light shafts through the existing window openings, with fewer slices on mobile. The shafts are a lightweight approximation, not a path-traced volumetric simulation.

Cloud banks sit behind the skyline; rain and round snow particles remain outside both the studio and lounge windows. Weather stays fixed for each visit. Sunlight fades under cloud cover and disappears at night, while the warm interior lamps remain available.

For local visual adjustment only, Vite development mode accepts `?weather=clear`, `?weather=cloudy`, `?weather=rain`, `?weather=thunderstorm`, or `?weather=snow` before the hash route. Production ignores this override and keeps its seasonal weighted selection.

## Interactive screen and project paper

- `src/ObjectSurfaces.tsx`: live monitor and blueprint textures, pointer/touch scrolling, paper lift animation, and semantic controls.
- `src/WorldScreens.tsx`: shared terminal commands and accessible content. The monitor starts dark, boots with a short ASCII sequence when opened, and accepts `help`, `whoami`, `about`, `education`, `experience`, `projects`, `contact`, `github`, `linkedin`, `clear`, and `room` (also `exit`/`back`). Reduced motion skips boot animation.
- A selected blueprint is the same mesh and texture already visible on the table. It rises, straightens, and fits the viewport. Wheel, drag, and arrow/Page keys scroll the printed content. Its printed return action and Escape return it to the table.
- `src/ProjectFocus.tsx`: depth-aware background blur that keeps the physical raised sheet sharp; no CSS blur or visible HTML project overlay.

## Experience wall and personal shelf

The experience collection has separate USAA, UT Dallas, and education artifacts. About uses the existing camcorder, headphones, and football models alongside a hinged cookbook and personal frame. Each object opens a camera close-up, with its text drawn on a physical surface. Escape and the printed Back action return to the collection.

Content, dimensions, and close-up targets live in `src/roomArtifacts.ts`; rendering and object interactions live in `src/PersonalArtifacts.tsx`. Links such as `#/experience/usaa`, `#/experience/utd`, `#/about/camcorder`, and `#/about/cookbook` support direct entry and browser history. Semantic controls provide keyboard and screen-reader access. The cookbook and object turns honor reduced motion.

The writing currently uses existing portfolio facts. No personal reel, playlist, recipe, portrait, company badge image, or claimed learning outcome has been invented. Supply those assets/details for a later content pass; the camcorder currently displays videography notes rather than playing a reel.

## Floating shelves and listening nook

The About collection sits on three oak planks mounted into the right wall. The source freestanding shelf and its steel supports are hidden at runtime; the existing collection positions and close-ups remain aligned.

`src/ListeningNook.tsx` adds a seating area below the mezzanine and beside the stair flight, using an imported leather lounge chair and wood materials shared with the room. Click the chair or use Listening nook (`#/nook`) to enter. The reading sconce toggles independently; the mug steam and stereo meters stop animating with reduced motion.

Click the physical stereo or rear lounge record player to control the shared music queue. In local development, five user-supplied tracks play in order and loop; the stereo display shows the current title and its small arrow controls move between tracks. The hidden keyboard and screen-reader controls expose play/pause, previous, and next. Playback starts only after a visitor clicks and pauses when the tab is hidden.

The supplied MP3 files live in the gitignored `.local-media/music/` folder. Vite serves them only from its development server through `vite.config.ts`; production builds contain neither the tracks nor their filenames in a playable manifest. Add audio to a public build only after securing distribution rights. Missing local files report an error on the stereo screen.

## Furniture and composition pass

`content/loft-layout.json` now defines a 0.72 horizontal workbench scale around its original center. Blender geometry, blueprint positions, hitboxes, and camera framing use that same transform. The drafting area sits nearer the gallery wall with a bound textile rug, linear pendant and materials trolley. The experience frames sit lower above a detailed slatted credenza.

`scripts/loft_realism.py` adds the imported cabinet and leather lounge chair, rugs, task pendant, and upholstery geometry details. The lounge sofa uses photographed linen maps, slightly irregular cushions, and modeled piping. The floating shelves use a detailed succulent. A low-intensity bundled HDR provides material reflections without replacing the animated city sky. Source model animation and constraints are stripped during static furniture import so articulated parts retain their authored placement.

## Rendering performance

- `src/batchStaticMeshes.ts` groups compatible, opaque static room meshes by material and spatial cell. Original vertices, UVs, normals, and texture maps are preserved; interactive objects and transparent panes remain separate. Static transforms are frozen.
- `src/RenderBudget.tsx` caches the existing 2048px shadow maps. It refreshes them during object transitions (at most 15 times per second), then reuses them while the camera moves. Changes to light color/intensity do not require regenerating depth maps. New moving shadow casters or changes to light position must invalidate these maps.
- Desktop rendering adapts between 1 and 1.5 device pixels per CSS pixel (mobile: 1 to 1.15), with slow recovery to prevent resolution oscillation. Texture resolution is unchanged. The project blur target follows this render resolution.
- Zero-intensity night fill lights are excluded during daylight; the existing nighttime lighting is preserved. Lightning is only mounted for thunderstorms.
- Transparent window panes use a lightweight standard material instead of an additional transmission render pass.
- Hidden tabs pause the WebGL frame loop and resume at the same point in the day/night cycle.

In development, the canvas `data-render-stats` attribute exposes two-second FPS samples, draw calls, triangle submissions, and render resolution. These are local diagnostics, not production telemetry or a guaranteed frame rate.
