/* Speedy List AI - CATEGORY PACKS. Everything category-specific lives in this one file.
   To add electronics (or anything else) later: copy the apparel pack, change the fields, add a matching
   server pack in miggy-store lib/speedy-categories.ts, and set SLC.ACTIVE (or add ?cat=electronics). */
'use strict';
window.SLC = window.SLC || {};

SLC.ENDPOINT = 'https://www.justaskmiggy.com/api/speedy-analyze';

SLC.PACKS = {
  apparel: {
    id: 'apparel', label: 'Apparel', serverCategory: 'apparel',
    tagline: 'Clothing, shoes & accessories',
    lede: 'Snap the front, back and tags. Speedy List AI reads the brand, size and fabric, spots flaws, prices it with the Speedy formula and writes a listing for Etsy, Shopify, Poshmark, eBay, Depop, Mercari and Facebook Marketplace.',
    sample: { url: 'img/sample-jacket.jpg', name: 'sample-denim-jacket.jpg', label: 'Try an example denim jacket photo' },

    /* Photo guide. req = required, key = needed unless the seller ticks the skip box. Max photos = shots.length. */
    shots: [
      { k: 'front', n: 'Front', h: 'Lay flat or hang it. Whole piece in frame', req: true, role: 'front (full item)' },
      { k: 'back', n: 'Back', h: 'Flip it over, whole piece in frame', req: true, role: 'back (full item)' },
      { k: 'brandtag', n: 'Brand / neck tag', h: 'Close-up of the brand label', key: 'No brand tag', role: 'brand / neck tag close-up' },
      { k: 'sizetag', n: 'Size / care tag', h: 'Size, fabric content and Made in', key: 'No size tag', role: 'size / care / fabric content tag close-up' },
      { k: 'flaws', n: 'Flaws', h: 'Stains, holes, pilling. Tick if none', key: 'No flaws', role: 'flaw close-up' },
      { k: 'detail1', n: 'Detail', h: 'Optional: logo, hardware, fabric texture', role: 'detail close-up' },
      { k: 'detail2', n: 'Detail', h: 'Optional: soles, lining, pockets, zipper', role: 'detail close-up' },
      { k: 'detail3', n: 'Detail', h: 'Optional: worn on a model or measuring tape', role: 'detail or measurement' }],
    aiOrder: ['brandtag', 'sizetag', 'front', 'back', 'flaws', 'detail1', 'detail2', 'detail3'],

    /* Speedy formula V = (R x C) + B. A sensible default only; the seller edits everything. */
    formula: { rLabel: 'R - original retail price', rStep: 5, priceStep: 1,
      note: 'Starting point only. Check sold listings for this exact item before you price it.' },
    conditions: [
      { id: 'nwt', label: 'New with tags', short: 'NWT', c: 0.60, hint: 'Brand new, store tags attached' },
      { id: 'nwot', label: 'New without tags', short: 'NWOT', c: 0.45, hint: 'Never worn, no tags' },
      { id: 'exc', label: 'Excellent', short: 'Excellent', c: 0.35, hint: 'Gently worn, no flaws' },
      { id: 'good', label: 'Good', short: 'Good', c: 0.25, hint: 'Light wear, minor flaws noted' },
      { id: 'fair', label: 'Fair', short: 'Fair', c: 0.12, hint: 'Visible wear or flaws, priced to match' }],
    aiCondition: { 'New with tags': 'nwt', 'New without tags': 'nwot', 'Excellent': 'exc', 'Good': 'good', 'Fair': 'fair' },
    defaultCondition: 'good',
    bonus: { min: 0, max: 40, step: 5, range: '$5-$40',
      // In-demand brands (lowercase match). Edit freely.
      brands: { 'Patagonia': 30, 'Lululemon': 25, "Arc'teryx": 40, 'Arcteryx': 40, 'Jordan': 30, 'Nike': 15, 'Carhartt': 20, "Levi's": 5, 'Levis': 5, 'Levi Strauss': 5,
        'Coach': 25, 'Free People': 15, 'Ralph Lauren': 10, 'Polo Ralph Lauren': 10, 'The North Face': 15, 'Stussy': 20, 'Supreme': 35, 'Doc Martens': 20,
        'Dr. Martens': 20, 'Filson': 35, 'Barbour': 30, 'Anthropologie': 10, 'Madewell': 10, 'Vuori': 20, 'Alo': 20, 'Kate Spade': 15, 'Birkenstock': 20,
        'New Balance': 10, 'Harley-Davidson': 20, 'Pendleton': 20, 'L.L.Bean': 10, 'Burberry': 40, 'Gucci': 40, 'Louis Vuitton': 40 },
      // Extra bonus when the piece is marked vintage (20+ yrs). Vintage Levi's is where the money is.
      vintageBonus: { "Levi's": 20, 'Levis': 20, 'Levi Strauss': 20, 'Carhartt': 10, 'Harley-Davidson': 15, 'Ralph Lauren': 10, 'Polo Ralph Lauren': 10, 'Pendleton': 10, 'Nike': 10 },
      note: 'In-demand brands like Patagonia, Lululemon, Nike/Jordan, Arc\'teryx, Carhartt, vintage Levi\'s, Coach, Free People and Ralph Lauren earn $5-$40.' },

    /* Item card fields shown to the seller, all editable. [key, label] */
    fields: [['brand', 'Brand'], ['itemType', 'Item type'], ['department', 'Department'], ['size', 'Size'], ['color', 'Color'],
      ['material', 'Material'], ['style', 'Style'], ['era', 'Era']],

    /* Measurement prompts by item kind (used when the AI doesn't return any). Inches, measured flat. */
    measure: {
      top: [['Pit to pit', 'Armpit seam to armpit seam, laid flat'], ['Length', 'Top of shoulder at collar to bottom hem'], ['Shoulder', 'Seam to seam across the back'], ['Sleeve', 'Shoulder seam to cuff']],
      outerwear: [['Pit to pit', 'Armpit to armpit, zipped, laid flat'], ['Length', 'Back of collar to hem'], ['Sleeve', 'Shoulder seam to cuff']],
      bottom: [['Waist', 'Across the top of the waistband, laid flat, then x2'], ['Inseam', 'Crotch seam to hem'], ['Rise', 'Crotch seam to top of waistband'], ['Leg opening', 'Across the hem, laid flat']],
      dress: [['Pit to pit', 'Armpit to armpit, laid flat'], ['Waist', 'Narrowest point, laid flat'], ['Length', 'Top of shoulder to hem']],
      shoes: [['Insole length', 'Heel to toe inside the shoe'], ['Heel height', 'Back of heel, ground to top of heel']],
      bag: [['Width', 'Across the bottom'], ['Height', 'Bottom to top edge'], ['Depth', 'Side gusset'], ['Strap drop', 'Top of strap to top of bag']],
      other: [['Length', 'Longest side'], ['Width', 'Widest point']] },
    measureKind: { top: 'top', activewear: 'top', sleepwear: 'top', swim: 'top', underwear: 'top', suit: 'outerwear', outerwear: 'outerwear', bottom: 'bottom', dress: 'dress', shoes: 'shoes', bag: 'bag' },

    /* Marketplace condition wording */
    marketCondition: {
      ebay: { nwt: 'New with tags', nwot: 'New without tags', exc: 'Pre-owned - Excellent', good: 'Pre-owned - Good', fair: 'Pre-owned - Fair' },
      poshmark: { nwt: 'New With Tags (NWT)', nwot: 'Like New', exc: 'Excellent', good: 'Good', fair: 'Fair' },
      depop: { nwt: 'Brand new', nwot: 'Like new', exc: 'Used - Excellent', good: 'Used - Good', fair: 'Used - Fair' },
      mercari: { nwt: 'New', nwot: 'Like new', exc: 'Like new', good: 'Good', fair: 'Fair' },
      facebook: { nwt: 'New', nwot: 'Used - Like New', exc: 'Used - Like New', good: 'Used - Good', fair: 'Used - Fair' },
      etsy: { nwt: 'New old stock with tags', nwot: 'Unworn', exc: 'Excellent vintage condition', good: 'Good vintage condition', fair: 'Fair vintage condition' },
      shopify: { nwt: 'New with tags', nwot: 'New without tags', exc: 'Pre-owned, excellent', good: 'Pre-owned, good', fair: 'Pre-owned, fair' } },

    /* eBay item specifics for clothing (name -> item field or function) */
    ebaySpecifics: it => [['Brand', it.brand || 'Unbranded'], ['Department', it.department], ['Type', it.itemType], ['Size', it.size], ['Size Type', it.sizeType],
      ['Color', it.color], ['Material', it.material], ['Pattern', it.pattern], ['Style', it.style], ['Fit', it.fit], ['Sleeve Length', it.sleeveLength],
      ['Neckline', it.neckline], ['Closure', it.closure], ['Features', (it.features || []).join(', ')], ['Vintage', it.isVintage ? 'Yes' : 'No'],
      ['Decade', it.isVintage ? it.era : ''], ['Country of Origin', it.madeIn]].filter(r => r[1] && r[1] !== 'Unknown'),
    shopifyCategory: it => ({ shoes: 'Apparel & Accessories > Shoes', bag: 'Apparel & Accessories > Handbags, Wallets & Cases', jewelry: 'Apparel & Accessories > Jewelry', hat: 'Apparel & Accessories > Clothing Accessories > Hats', accessory: 'Apparel & Accessories > Clothing Accessories' }[it.kind] || 'Apparel & Accessories > Clothing'),
    // Etsy only allows handmade, vintage (20+ years) or craft supplies. Resale of modern clothing is not allowed.
    etsyRule: 'Etsy only allows vintage items that are at least 20 years old (or handmade). Modern resale clothing isn\'t allowed there.',
    markets: ['ebay', 'etsy', 'poshmark', 'depop', 'mercari', 'facebook', 'shopify', 'grailed', 'vinted', 'thredup'],
    starterMarkets: ['ebay', 'poshmark', 'depop', 'facebook'] }
};
SLC.ACTIVE = 'apparel';
