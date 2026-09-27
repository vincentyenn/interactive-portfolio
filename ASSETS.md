# Asset credits

This room was modeled and arranged for this portfolio. Architecture, stairs, desks, monitor, headphones, blueprint layouts, signs, and screen artwork were authored for this project in Blender/Python. Detailed props are imported as editable 3D models. The `.blend` source and scripts are included so the scene can be changed without treating the GLB as a black box.

The hero rebuilds the front stair flight in React Three Fiber to create a clearer diagonal silhouette. Its mesh is hidden in the browser while the source stair geometry remains in the Blender file and exported GLB.

The browser also adjusts a clone of the GLB at load time: it aims the desk chair toward the monitor, moves the personal shelf to the right wall, cuts a real doorway opening into that wall, and paints the Experience timeline onto the existing framed 3D display. These runtime fixes live in `src/ChairShelfFixes.ts` and `src/DoorPosterFixes.ts`; the checked-in Blender file and GLB retain their original placements.

The room's 1K PBR textures and detailed prop models were downloaded from [Poly Haven](https://polyhaven.com/), whose assets are [CC0](https://polyhaven.com/license). They are embedded into the room GLB and also kept as source files in `assets/source/`. The exterior city facade is bundled separately under `public/models/loft-city/` with its own source and checksum records.

The build script keeps the source images intact and packs reduced 512px copies of small prop maps and roughness masks into the `.blend` and GLB, while retaining higher-resolution architectural maps where they carry visible detail. The current room GLB is about 20 MB.

| Asset | Use | Source |
| --- | --- | --- |
| Concrete Floor Worn 001 | Loft floor | [Poly Haven](https://polyhaven.com/a/concrete_floor_worn_001) |
| Painted Plaster Wall | Loft walls | [Poly Haven](https://polyhaven.com/a/painted_plaster_wall) |
| Oak Wood Planks | Desks, stairs, beams | [Poly Haven](https://polyhaven.com/a/oak_wood_planks) |
| Oak Veneer 01 | Shelves, door, trim | [Poly Haven](https://polyhaven.com/a/oak_veneer_01) |
| Brick Wall 10 | Side wall | [Poly Haven](https://polyhaven.com/a/brick_wall_10) |
| American Football | Personal shelf | [Poly Haven](https://polyhaven.com/a/american_football) |
| Vintage Video Camera | Computer desk | [Poly Haven](https://polyhaven.com/a/vintage_video_camera) |
| Desk Lamp Arm 01 | Workbench | [Poly Haven](https://polyhaven.com/a/desk_lamp_arm_01) |
| Modern Arm Chair 01 | Computer desk | [Poly Haven](https://polyhaven.com/a/modern_arm_chair_01) |
| Studio Small 03 HDRI | Lighting and reflections for the About camcorder viewer | [Poly Haven](https://polyhaven.com/a/studio_small_03) |
| Modular Urban Apartments Facade | Imported city facade outside the loft windows; bundled as a separate 1K glTF (16,488,693 bytes including textures and binary) | [Poly Haven](https://polyhaven.com/a/modular_urban_apartments_facade) — James Ray Cock, CC0 |

The city also includes original Three.js high-rise silhouettes and deterministic window layouts, authored for this project. The imported facade is loaded from `public/models/loft-city/` in its own Suspense boundary so the procedural skyline remains visible while it loads or if the asset fails. The source files and checksum manifest are kept alongside the model.

This project does not use assets, imagery, copy, or branding from Basement Studio; that site was a high-level interaction reference.

## Asset and lighting workflow reviewed

The reference repositories were checked before selecting assets. [LUMEN-PS](https://github.com/Samukashvili/LUMEN-PS) produces PBR material maps from four photometric-stereo captures; it is not a browser lighting library, and this scene has no scanner captures to process. The room uses Three.js lights and the PBR maps listed above. [AI Forge MCP](https://github.com/HurtzDonutStudios/ai-forge-mcp), [Build World](https://github.com/thrixel/build-world), and [QtMeshEditor](https://github.com/fernandotonon/QtMeshEditor) are asset-production or editing tools rather than ready-to-drop prop libraries. [OS3A Gallery](https://github.com/ToxSam/os3a-gallery) catalogs CC0 models; its inspected studio props have a faceted style that clashes with the realistic PBR props in this room, so they were left out.

[Threepipe](https://github.com/repalash/threepipe) is used in a separate, lazy-loaded viewer on the About page to present the vintage camcorder as a draggable 3D object. It loads the glTF model and local HDR environment, and uses screen-space ambient occlusion and tone mapping; the main loft remains in React Three Fiber. See the [Threepipe loading guide](https://threepipe.org/guide/loading-files.html) and [render pipeline guide](https://threepipe.org/guide/render-pipeline.html) for these capabilities. This is an isolated compatibility trial: Threepipe expects a custom Three.js fork, while the site uses upstream Three.js 0.186. The regular ESM entry expects symbols absent from the installed Three version, so the viewer imports Threepipe's bundled `dist` entry. `.npmrc` enables legacy peer resolution, and the root `@types/three` override avoids installing Threepipe's private type package. The core is Apache-2.0; review licenses for optional plugins individually. [Vapory](https://github.com/Zulko/vapory) is a MIT-licensed Python wrapper around POV-Ray for offline still rendering. It requires POV-Ray and does not provide an interactive browser scene, so it is not used in the hero.
