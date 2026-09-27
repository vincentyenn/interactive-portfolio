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

The camera moves to each object while its information appears in a semantic HTML panel. The site stays within one viewport and does not use document or panel scrolling. On mobile, a compact destination menu and fixed detail panel leave part of the scene visible for camera movement and hotspot taps.

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

## Edit the portfolio

- Content: `content/portfolio.json` (projects, roles, introduction, and links)
- Destination panels and route state: `src/App.tsx`
- 3D hotspots and camera positions: `src/LoftScene.tsx`
- Layout and responsive states: `src/styles.css`
- Screen, experience wall, and blueprint artwork: `scripts/make_graphics.py`
- Editable room geometry, material assignment, and GLB export: `scripts/build_loft.py` and `assets/loft-room.blend`

To regenerate artwork and the model on macOS:

```bash
python3 scripts/make_graphics.py
blender --background --factory-startup --python scripts/build_loft.py
```

`make_graphics.py` needs Pillow. If Python does not have it, install it in a virtual environment. The Blender script expects the source assets in `assets/source/`, which are included in this repository. `scripts/fetch_assets.py` can fetch them again from Poly Haven. See [ASSETS.md](ASSETS.md) for credits and license.

## Technical notes

- React, TypeScript, Vite, Three.js, React Three Fiber, Drei, and GSAP.
- Blender 4.5 source scene, exported to GLB with embedded PBR materials.
- Mobile uses a simplified camera composition and lower render resolution; destination controls are touch-sized.
- The canvas is decorative to assistive technology. Keyboard and touch navigation use real HTML controls with visible focus states.
- Reduced-motion preferences make camera changes immediate.
- Hash routes work on GitHub Pages without a server rewrite or runtime router dependency.
- No analytics, authentication, backend, or external asset API is required at runtime. Google Fonts may load when network access is available; local font fallbacks are supplied.
