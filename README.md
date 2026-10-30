# PJ — Parag Jewellers

Product IDs now control model loading and gallery selection. Three distinct photo-inspired prototypes are available for p33 (Circular Gleam), p35 (Horizon) and p40 (Orbit); 43 other records explicitly report missing models. Exact CAD is still needed for all products. See [PRODUCT-ASSETS.md](PRODUCT-ASSETS.md) and [the full inventory](PRODUCT-ASSET-INVENTORY.json) for the root-cause fix, model paths, validation and asset handoff.

Ring product pages now include a 3D viewer and browser-local live hand try-on prototype. See [TRYON.md](TRYON.md) for architecture, privacy, asset replacement, validation results and limitations. The 3D shapes are clearly labelled demonstration models. Run `npm test` for geometry and camera lifecycle checks; no packages need installing.

Responsive jewellery storefront with white and green branding, product collections, search, filters, wishlist, a preview shopping bag, and reduced-motion-aware animations.

## Deploy on Vercel

Import this repository into Vercel. Use the repository root, Framework Preset **Other**, Output Directory **public**, and Node.js **22.x**. No build command, environment variables, or external packages are required. The included vercel.json configures static output and the rate API.

The storefront is in public/. The serverless endpoint api/market.ts serves /api/market. Keep both when deploying; a static-only host will not run the price tracker.

## Public reference rates

Gold and silver daily histories use IBJA data distributed by TrackLivePrice. A separate OroPocket quote supplies current published buy/sell values. Diamond history is the StoneAlgo global 1-carat natural diamond index in USD. Mumbai/Kalyan labels identify the intended audience; these are national benchmarks, not local shop prices. The UI displays source dates and unavailable states rather than inventing prices or history.

Sources:
- https://trackliveprice.com/api/gold/999.json
- https://trackliveprice.com/api/gold/916.json
- https://trackliveprice.com/api/silver.json
- https://api.oropocket.com/public/prices
- https://www.stonealgo.com/diamond-prices/1-carat-diamond-prices/

The browser refreshes every minute while visible. Server instances cache bullion for 15 minutes, current quotes for 60 seconds, and the diamond index for 6 hours. Provider availability and publication schedules determine freshness.

## Preview scope

Purchases, payments, account authentication, order tracking, and mailing-list delivery are not enabled. Wishlist and bag state are stored in the browser. Product imagery and illustrative catalogue content are retained from the design study, including reference jewellery imagery; confirm asset usage rights before a commercial launch. The Parag Jewellers emblem was supplied by the owner.
