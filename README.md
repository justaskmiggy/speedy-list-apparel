# Speedy List AI – Apparel

Live: https://justaskmiggy.github.io/speedy-list-apparel/

Photos of clothing, shoes and accessories → AI reads brand / size / fabric / era / flaws → Speedy price V = (R × C) + B → listings for eBay, Poshmark, Depop, Mercari, Facebook Marketplace, Etsy (vintage only) and Shopify (+ CSV).

## Category packs
Everything category-specific is in **`js/categories.js`** (photo guide, condition multipliers, brand bonuses, fields, measurement prompts, marketplace condition wording, eBay specifics).
`js/markets.js` builds each marketplace's listing from the item + pack. `js/app.js` is the generic engine.

To add electronics later: add a pack to `SLC.PACKS` here, add a matching server pack in `miggy-store/lib/speedy-categories.ts`
(schema + prompt), then deploy as its own repo or open this app with `?cat=electronics`.

AI runs on the server (`https://www.justaskmiggy.com/api/speedy-analyze`, alias `/api/apparel-analyze`). No keys in this repo.
Service worker cache: `speedy-list-apparel-vN` (bump `VER` in `sw.js` and `APP_VER` in `js/app.js` on each release).
