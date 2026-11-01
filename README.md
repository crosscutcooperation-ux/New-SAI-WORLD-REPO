# World Dreams — textured 3D exterior explorer

A genuinely orbitable, browser-rendered 3D reconstruction based on the supplied architectural renders. The building is solid multi-volume geometry with recessed wings, projecting balcony slabs and railings, stone cornices, pilasters, pediments and tiered cupolas. Photo-derived facade materials are UV-mapped onto the solid mesh faces; the main view is not an image viewer or a panorama.

## Run

`npm start` then open http://localhost:4173. The site is static and uses locally bundled Three.js 0.170.0. No CDN is required at runtime. WebGL is required.

## Experience

- Free 360-degree orbit, pan, pinch/scroll zoom, automatic orbit, fullscreen and courtyard/aerial/boulevard/plan viewpoints.
- Tower selection and amenity camera focus; original renders are optional reference images in a separate dialog.
- Sandstone surface detail, photo-derived facade detail, HDR outdoor illumination/reflections, soft shadows, screen-space ambient occlusion in High detail mode and FXAA.
- Desktop defaults to High detail. Narrow screens default to Standard for frame rate; the detail button changes ambient occlusion.
- Keyboard: focus the canvas, use arrows to orbit, +/- to zoom and Escape to reset.

## Geometry and materials

`dist/architectural-tower.js` defines the detailed tower mesh. `dist/model.js` assembles tower groups, gardens, podium, pool, courts and illustrative context. `dist/app.js` loads materials, configures lighting and renders the interactive scene.

`scripts/prepare-render-assets.py` extracts facade/stone samples from the supplied TIFF and prepares other material maps and local Three.js addons. It uses Pillow. The HDR sky is Kloppenheim 05 (Pure Sky), Greg Zaal / Jarod Guest, from [Poly Haven](https://polyhaven.com/a/kloppenheim_05_puresky), CC0. Three.js is MIT licensed; its license is in `dist/vendor/LICENSE.three`.

`npm run check` checks JavaScript syntax. The earlier untextured GLB export remains an initial geometry artifact and is not presented as the final textured scene. The active website renders the current mesh and materials directly.

## Accuracy limits

This is a reference-based reconstruction, not the architect's original model. Photo texture extraction improves visible facade detail, but the supplied views do not determine exact geometry, dimensions, hidden elevations, material parameters or the floor schedule. Reused facade materials on unseen sides are inferred. This result does not claim to match the supplied offline architectural renders exactly.

Exact architectural fidelity and render-equivalent photorealism require the original detailed architectural model (for example .max, .blend, .fbx or .skp), associated textures and scene references. Browser delivery would then require model optimization and a lighting workflow suited to that source. Floor navigation requires confirmed floor plans/interiors. Wider neighborhood blocks are illustrative, not a geographically verified map.
