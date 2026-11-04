# Sai World Dreams — 3D Architectural Explorer

A genuinely orbitable, browser-rendered 3D reconstruction based on the supplied architectural renders. The building is solid multi-volume geometry with recessed wings, projecting balcony slabs and railings, stone cornices, pilasters, pediments and tiered cupolas. Photo-derived facade materials are UV-mapped onto the solid mesh faces; the main view is not an image viewer or a panorama.

## Run

`npm start` then open http://localhost:4173. The site is static and uses locally bundled Three.js 0.170.0. No CDN is required at runtime. WebGL is required.

## Experience

- Free 360-degree orbit, pan, pinch/scroll zoom, automatic orbit, fullscreen and courtyard/aerial/boulevard/plan viewpoints.
- Tap the pool/water or courtyard in the model, use the floating entry markers, or choose a walking area in the sidebar. The camera lowers to eye level.
- Outdoor walking zones cover the pool deck and central courtyard. Drag to look, use WASD/arrows or the on-screen movement pad, and tap clear paths to walk to them. Click-to-walk routes around the water and obstacles; movement stays on the modeled outdoor surfaces.
- Each walking area has a guided route, pause/resume and live canvas video recording. Completed clips download locally without microphone access or uploads. Browser support is detected before offering recording.
- Tower selection uses simple picking proxies. Small static pieces are batched, shadows are cached, distant fine rails are culled, idle views stop redrawing and active movement renders at the display frame rate. Roof label sizes are cached between layout changes, and inactive outdoor lights are excluded from daylight rendering.
- Balanced rendering is the default on every screen. High detail loads ambient occlusion on demand. Render resolution can reduce under sustained load.
- In overview, arrows orbit, +/- zoom and Escape resets. In walking mode, arrows/WASD move and Escape returns to overview.

## Geometry and materials

`dist/architectural-tower.js` defines the detailed tower mesh. `dist/model.js` assembles tower groups, gardens, podium, pool, courts and illustrative context. `dist/app.js` loads materials, configures lighting and renders the interactive scene.

`scripts/prepare-render-assets.py` extracts facade/stone samples from the supplied TIFF and prepares other material maps and local Three.js addons. It uses Pillow. The HDR sky is Kloppenheim 05 (Pure Sky), Greg Zaal / Jarod Guest, from [Poly Haven](https://polyhaven.com/a/kloppenheim_05_puresky), CC0. Three.js is MIT licensed; its license is in `dist/vendor/LICENSE.three`.

`npm run check` checks JavaScript syntax; `npm test` verifies route reachability, collision avoidance, area boundaries and static batching. `dist/walk-navigation.js` contains the walkable limits and route planner; `dist/walkthrough-controller.js` controls walking, guided routes and recording. The GLB export contains the current untextured geometry. The active website renders the current mesh and materials directly.

## Accuracy limits

This is a reference-based reconstruction, not the architect's original model. Photo texture extraction improves visible facade detail, but the supplied views do not determine exact geometry, dimensions, hidden elevations, material parameters or the floor schedule. Reused facade materials on unseen sides are inferred. This result does not claim to match the supplied offline architectural renders exactly.

Exact architectural fidelity and render-equivalent photorealism require the original detailed architectural model (for example .max, .blend, .fbx or .skp), associated textures and scene references. Browser delivery would then require model optimization and a lighting workflow suited to that source. Floor navigation requires confirmed floor plans/interiors. Wider neighborhood blocks are illustrative, not a geographically verified map.
