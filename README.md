# The Loft — interactive portfolio

An original, interactive 3D loft for Vincent Yen's portfolio. The opening room is a real glTF scene built in Blender, rendered with React Three Fiber. It is not a static room image. Every destination also has a semantic HTML control and a conventional content section below the hero.

## Explore the room

| Object | Destination |
| --- | --- |
| Computer | Portfolio overview and links to the other areas |
| Workbench | Overhead view of three project blueprints; select one for details |
| Experience wall | Internship and research timeline |
| Personal shelf | About and interests |
| Doorway / intercom | Contact and GitHub |

The room is intentionally a fixed-camera experience. Clicking a destination animates the camera to it; **Back to the loft** returns to the opening view. On mobile, each destination gets a wider camera view. The workbench remains a true top-down 3D view, and blueprint sheets respond to taps. Reduced-motion preferences make camera changes immediate.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Vite's configured base path is `/interactive-portfolio/`, matching this repository name for GitHub Pages. The local server prints the exact URL. Build with `npm run build`.

The 3D model is already committed at `public/models/loft-room.glb`; Blender is not needed to run the site. If WebGL cannot start, or the model fails, the full navigation and portfolio content remain in normal HTML. Append `?no3d=1` locally to preview that fallback.

## Edit the portfolio

- Content: `content/portfolio.json` (projects, roles, intro, links)
- Hero and section UI: `src/App.tsx` and `src/styles.css`
- 3D hotspots and camera positions: `src/LoftScene.tsx`
- Screen, experience wall, and blueprint artwork: `scripts/make_graphics.py`
- Editable room geometry, material assignment, and GLB export: `scripts/build_loft.py` and `assets/loft-room.blend`

To regenerate artwork and the model on macOS:

```bash
python3 scripts/make_graphics.py
blender --background --factory-startup --python scripts/build_loft.py
```

`make_graphics.py` needs Pillow. If Python does not have it, install it in a virtual environment. The Blender script expects the source assets in `assets/source/`, which are included in this repository. `scripts/fetch_assets.py` can fetch them again from Poly Haven if needed. See [ASSETS.md](ASSETS.md) for credits and license.

## Technical notes

- React, TypeScript, Vite, Three.js, React Three Fiber, Drei, and GSAP.
- Blender 4.5 source scene, exported to GLB with embedded PBR materials.
- Mobile uses lower render resolution and a simplified camera composition; all destination controls are touch-sized.
- The 3D layer is decorative to assistive technology. Actual navigation, section information, and project selection are HTML buttons and links with visible keyboard focus.
- No analytics, authentication, backend, or external asset API is required at runtime. Google Fonts may load when network access is available; local font fallbacks are supplied.
