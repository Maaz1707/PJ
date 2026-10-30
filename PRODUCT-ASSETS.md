# Product-specific 3D asset correction

## Root cause

The original viewer rendered real GLB geometry through Three.js; it did not use a flat photograph as the 3D scene. However, its product metadata and model selection were separate. `selectProduct()` changed the title, price and tracking defaults without invoking the loader. `tryOnProduct()` defaulted to `DEMO_MODELS[0]`; `loadModel()` selected from an independent shape dropdown. As a result, every product could retain the same generic shape regardless of its ID. There was no per-product model cache to diagnose: the original mismatch originated before loading.

That independent shape selector and default fallback are removed. The storefront layout is otherwise retained.

## Current data flow

Product ID → `asset-registry.js[id]` → model status + exact asset URL/version + gallery/variant/render/tracking settings → abortable fetch using ID/version/URL cache key → GLTFLoader.parseAsync → normalized scene carrying `userData.productId` → bounds-based camera framing and PBR rendering.

The loader clears the previous scene before requesting another asset. Selection tickets, abort signals and loader generation checks prevent a delayed request from becoming the selected product. Missing records and load failures leave no model in the scene. Retry is explicit. Raw GLB buffers are cached under product-specific keys (maximum four records per viewer session); each activation gets its own scene and materials. Metal changes reuse geometry unless the registry explicitly supplies a variant model URL. Geometry/materials/textures are disposed when scenes are replaced; cache buffers are released on close.

`model.render` controls coordinate origin, inner radius normalization, initial viewer rotation, camera direction/padding, exposure and gemstone colour. `model.tracking` is separate and supplies finger, anchor, offset and scale. Product switching in camera mode stops the previous stream and requires an explicit camera restart with the newly loaded product. Non-ring tracking is unavailable.

## Available geometry and missing assets

There are **zero approved, exact product CAD assets** in the supplied catalogue. The registry covers all 46 catalogue IDs. Three products have distinct, original, photo-inspired procedural **prototypes**:

| ID | Catalogue design | Prototype geometry | GLB position vertices | Model version |
| --- | --- | --- | ---: | --- |
| p33 | Circular Gleam 9KT Diamond Ring | Spiral motif with a stone arc | 3,585 | 9220b492b7806b83 |
| p35 | Horizon 9KT Gold Ring | Offset frames and gold bead rows | 5,358 | e2d36a8a12c05ce6 |
| p40 | Orbit 9KT Diamond Ring | Circular motif and diagonal stone bar | 3,619 | 16459c69285855d1 |

Each is explicitly labelled **PRODUCT-SPECIFIC PROTOTYPE** beside its reference image. They are approximations, not manufacturing models or guaranteed replicas. The other **43 records have no model** and show an asset-missing state with camera try-on disabled. The three prototype products also still need approved CAD to become exact product representations. See [PRODUCT-ASSET-INVENTORY.json](PRODUCT-ASSET-INVENTORY.json) for every ID, SKU, name, category, prototype URL and missing gallery views.

The registry does not assign a generic ring to earrings, necklaces, bracelets or unmatched rings. It supports independently supplied GLBs for every category, but does not manufacture missing assets. Prototype finishes are visual previews, not a claim about stock or available metal variants.

## Galleries and provenance

All existing products have their own catalogue reference image. Most were sourced from the design study; some backgrounds were previously edited. They are not verified photographs of Parag inventory. No new product photography or fake views were created for this fix.

Each registry entry has separate reference, front, side, top, detail and lifestyle slots. Unavailable views are null, with a reason; the gallery displays only supplied images and states that additional angles are missing. Adding distinct, approved URLs to these slots enables gallery thumbnails without code changes. Both the product page and the viewer resolve the gallery by product ID; image thumbnails never stand in for GLB geometry.

## Asset handoff and Blender workflow

1. Obtain the actual product CAD from the designer/manufacturer, or model the product against dimensioned front/side/top references. A single photograph cannot establish accurate hidden geometry.
2. Keep metal, stones and settings as separate named meshes/materials. Use the material slot names listed in the registry (`metal`, `gem` by default), or configure the names for that product. Preserve non-metal materials.
3. Apply transforms, correct normals, triangulate, remove hidden/unnecessary geometry, embed required textures and export binary GLB. Avoid external resources for camera/photo reliability.
4. For rings, align the hole to local Y and setting toward +Z. Record the hole centre in `origin` and its radius in the source units in `innerRadius`; the renderer normalizes these while keeping viewer framing independent from tracking pose. Validate orientation using an asymmetric design.
5. Place the GLB under `/models/jewellery/<category>/<sku>-<design>.glb`. Add its product-ID record, unique version/hash, allowed variants, materials and camera/tracking settings. Never choose a file by catalogue array index. Variant-only colour changes need no separate GLB; geometry variants may provide `variants[finish].modelUrl`.
6. Set status `verified` only after comparing the loaded geometry with the actual product/CAD and confirming asset rights. Keep `prototype` for approximations and `missing`/null when no asset exists. Supply approved gallery angles independently.
7. Test product switching, model failures and camera fit on actual devices before claiming a production-ready try-on. Monocular tracking still cannot determine physical ring size or full skin occlusion.

`generate-product-assets.mjs` reproducibly generates the three explicitly labelled prototypes, the registry and the inventory report. Edit its product specifications and registry records as assets arrive; regenerating overwrites the generated registry, so keep approved records in that source. The retired generic demonstration generator is not used by the current application.

## Verification

- Registry test covers all 46 product IDs, SKUs and image paths, validates GLB headers/hashes, and rejects shared/fallback URLs. Three model hashes and geometry signatures differ.
- Browser tests select p33 → p35 → p40, inspect the loaded `userData.productId` and asset URL, and compare vertex counts and coordinate checksums. They exercise finishes, camera framing, cached return, rapid delayed switching, missing assets, 404/retry, gallery changes, product return and mobile overflow.
- Two earring records and two necklace records are tested for their missing-model states only. The catalogue has one bracelet record, also missing its model. Rendering tests for these categories cannot pass without assets; they have not been reported as passing.
- Camera tests exercise genuine MediaPipe inference with the existing moving-image video fixture, product-model replacement in camera mode, tracking loss, capture/download, retake and cleanup. The synthetic fixture tests the real inference pipeline, not physical fit.
- Native granted-camera initialization/cleanup, denied/missing camera states, geometry smoothing and the original storefront regression checks are retained.

No physical phone, live-hand fit, multi-skin-tone or production-inventory validation is claimed. This fixes product asset architecture and demonstrates distinct product-linked prototype geometry; it does not complete the missing commercial asset library.

## Run tests

`npm test` runs the Node geometry/camera and registry tests in the GitHub checkout. Browser tests require optional Playwright development tooling and a local server on port 8081: `node check-product-switching.cjs`, `node check-tryon.cjs`, `node check-camera.cjs`, and `node check-tracking.cjs`. The tracking fixture setup and camera privacy details are in [TRYON.md](TRYON.md). `npm run models:generate` regenerates the product prototypes and registry.
