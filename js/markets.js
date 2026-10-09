/* Speedy List AI - marketplace listing builders. Generic: they read the item + the active category pack.
   Each build() returns { fields:[{label,value,long,max}], table:[[k,v]], warn, note }. No phone numbers ever: buyers "Message me". */
'use strict';
window.SLM = (function () {
  const money = n => '$' + Math.round(+n || 0).toLocaleString('en-US');
  const cut = (s, n) => { s = String(s || '').trim(); return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '').trim(); };
  const list = a => (a || []).filter(Boolean);
  const measLine = it => { const m = list(it.meas).filter(x => x.value !== '' && x.value != null);
    return m.length ? 'Measurements (laid flat, inches): ' + m.map(x => `${x.name} ${x.value}"`).join(' · ') : ''; };
  const flawLine = it => it.flaws.length ? 'Flaws: ' + it.flaws.join('; ') + '.' : 'No flaws noted.';
  const facts = it => list([it.brand && 'Brand: ' + it.brand, it.size && 'Size: ' + it.size + (it.sizeType && !/Regular|Unknown/.test(it.sizeType) ? ' ' + it.sizeType : ''),
    it.color && 'Color: ' + it.color, it.material && 'Material: ' + it.material, it.isVintage && it.era && !/modern/i.test(it.era) && 'Era: ' + it.era, it.madeIn && 'Made in ' + it.madeIn]).join('\n');
  function body(it, cond, close) {
    return list([it.desc, `Condition: ${cond}. ${it.conditionNote || ''}`.trim(), flawLine(it), measLine(it), facts(it), close || 'Message me with any questions or if you want more photos.']).join('\n\n');
  }
  const hashtags = it => list(it.hashtags).slice(0, 5).map(h => '#' + String(h).replace(/[^a-z0-9]/gi, '').toLowerCase()).filter(h => h.length > 1).join(' ');
  const html = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const etsyTags = it => { const seen = new Set(), out = [];
    for (const t of list(it.etsyTags).concat(list(it.keywords))) { const x = cut(String(t).replace(/[^\w\s'&-]/g, '').toLowerCase(), 20); if (x && !seen.has(x)) { seen.add(x); out.push(x); } if (out.length === 13) break; }
    return out; };

  const M = {
    ebay: { name: 'eBay', mono: 'eB', hue: '#e53238', site: 'https://www.ebay.com/sl/sell',
      build: (it, P) => { const c = P.marketCondition.ebay[it.cond];
        return { fields: [{ label: 'Title', value: cut(it.title, 80), max: 80 }, { label: 'Condition', value: c }, { label: 'Price', value: money(it.price) },
          { label: 'Item specifics', value: P.ebaySpecifics(it).map(r => r[0] + ': ' + r[1]).join('\n'), long: true },
          { label: 'Description', value: body(it, c), long: true }], table: P.ebaySpecifics(it) }; } },
    poshmark: { name: 'Poshmark', mono: 'P', hue: '#7f0353', site: 'https://poshmark.com/create-listing',
      build: (it, P) => { const c = P.marketCondition.poshmark[it.cond];
        return { fields: [{ label: 'Title', value: cut(it.title, 80), max: 80 }, { label: 'Description', value: cut(body(it, c), 1500), long: true, max: 1500 },
          { label: 'Category', value: list([it.department, it.itemType]).join(' > ') }, { label: 'Brand', value: it.brand }, { label: 'Size', value: it.size },
          { label: 'Color', value: it.color }, { label: 'Condition', value: c }, { label: 'Original price', value: it.retail ? money(it.retail) : '' },
          { label: 'Listing price', value: money(it.price) }, { label: 'Style tags (3)', value: list(it.keywords).slice(0, 3).join(', ') }] }; } },
    depop: { name: 'Depop', mono: 'D', hue: '#ff2300', site: 'https://www.depop.com/products/create/',
      build: (it, P) => { const c = P.marketCondition.depop[it.cond];
        const d = list([cut(it.title, 80), it.desc, flawLine(it), measLine(it), facts(it), 'Message me with any questions!', hashtags(it)]).join('\n\n');
        return { fields: [{ label: 'Description (with hashtags)', value: cut(d, 1000), long: true, max: 1000 }, { label: 'Category', value: list([it.department, it.itemType]).join(' > ') },
          { label: 'Brand', value: it.brand }, { label: 'Size', value: it.size }, { label: 'Condition', value: c }, { label: 'Color', value: it.color },
          { label: 'Price', value: money(it.price) }], note: 'Depop uses the first line as the title. Up to 5 hashtags are included.' }; } },
    mercari: { name: 'Mercari', mono: 'M', hue: '#4dc9ff', site: 'https://www.mercari.com/sell/',
      build: (it, P) => { const c = P.marketCondition.mercari[it.cond];
        return { fields: [{ label: 'Title', value: cut(it.title, 80), max: 80 }, { label: 'Description', value: cut(body(it, c), 1000), long: true, max: 1000 },
          { label: 'Brand', value: it.brand }, { label: 'Condition', value: c }, { label: 'Size', value: it.size }, { label: 'Color', value: it.color },
          { label: 'Price', value: money(it.price) }] }; } },
    facebook: { name: 'Facebook Marketplace', mono: 'FB', hue: '#1877f2', site: 'https://www.facebook.com/marketplace/create/item',
      build: (it, P) => { const c = P.marketCondition.facebook[it.cond];
        return { fields: [{ label: 'Title', value: cut(it.title, 100), max: 100 }, { label: 'Price', value: money(it.price) }, { label: 'Condition', value: c },
          { label: 'Description', value: body(it, c, "Message me if you're interested. Happy to answer questions or send more photos."), long: true }],
          note: 'Category: Clothing & Shoes (or Bags & Luggage / Jewelry & Accessories).' }; } },
    etsy: { name: 'Etsy', mono: 'Et', hue: '#f1641e', site: 'https://www.etsy.com/your/shops/me/listing-editor/create', vintageOnly: true,
      build: (it, P) => { const c = P.marketCondition.etsy[it.cond]; const tags = etsyTags(it);
        const t = cut(/vintage/i.test(it.title) ? it.title : `Vintage ${it.era && !/modern/i.test(it.era) ? it.era + ' ' : ''}${it.title}`, 140);
        return { warn: it.isVintage ? '' : P.etsyRule + ' Tick "Vintage (20+ years)" above only if this piece truly is.',
          fields: [{ label: 'Title', value: t, max: 140 }, { label: 'About: who / what / when', value: `Another company or person · A finished product · ${it.era && !/modern/i.test(it.era) ? it.era : 'Pick the decade (20+ years ago)'}` },
            { label: 'Description', value: body(it, c) + (it.vintageEvidence ? '\n\nVintage details: ' + it.vintageEvidence : ''), long: true },
            { label: `Tags (${tags.length}/13)`, value: tags.join(', ') }, { label: 'Materials', value: it.material }, { label: 'Price', value: money(it.price) }],
          note: P.etsyRule }; } },
    shopify: { name: 'Shopify', mono: 'S', hue: '#5e8e3e', site: 'https://admin.shopify.com/', csv: true,
      build: (it, P) => { const c = P.marketCondition.shopify[it.cond];
        return { fields: [{ label: 'Title', value: cut(it.title, 255) }, { label: 'Description (HTML)', value: shopifyHtml(it, c), long: true },
          { label: 'Vendor', value: it.brand }, { label: 'Product type', value: it.itemType }, { label: 'Tags', value: shopifyTags(it).join(', ') },
          { label: 'Option: Size', value: it.size }, { label: 'Price', value: money(it.price) }, { label: 'SKU', value: it.sku }],
          note: 'Add the photos in Shopify after import. Use the CSV buttons to import one item or a whole batch.' }; } } };

  const plain = (it, P, cond, extra) => [{ label: 'Title', value: cut(it.title, 80), max: 80 }, { label: 'Description', value: body(it, cond), long: true },
    { label: 'Brand', value: it.brand }, { label: 'Size', value: it.size }, { label: 'Condition', value: cond }, { label: 'Color', value: it.color }, { label: 'Price', value: money(it.price) }].concat(extra || []);
  M.grailed = { name: 'Grailed', mono: 'G', hue: '#111111', site: 'https://www.grailed.com/sell/new',
    build: (it, P) => { const c = { nwt: 'New/Never Worn', nwot: 'New/Never Worn', exc: 'Gently Used', good: 'Used', fair: 'Very Worn' }[it.cond];
      return { fields: plain(it, P, c, [{ label: 'Category', value: list([it.department, it.itemType]).join(' > ') }]), note: "Grailed is menswear and designer focused (it also has a women's section)." }; } };
  M.vinted = { name: 'Vinted', mono: 'V', hue: '#09b1ba', site: 'https://www.vinted.com/items/new',
    build: (it, P) => { const c = { nwt: 'New with tags', nwot: 'New without tags', exc: 'Very good', good: 'Good', fair: 'Satisfactory' }[it.cond];
      return { fields: plain(it, P, c, [{ label: 'Material', value: it.material }]) }; } };
  M.thredup = { name: 'ThredUp', mono: 'tU', hue: '#1a8a7d', site: 'https://www.thredup.com/cleanout', consign: true,
    build: (it, P) => ({ warn: "ThredUp doesn't take seller-written listings. You mail items in a Clean Out Kit and ThredUp prices and lists them, so there's nothing to paste.",
      fields: [{ label: 'Item for your kit list', value: list([it.brand, it.itemType, it.size && 'size ' + it.size, it.color]).join(', ') }],
      note: 'Best for lower-value pieces you want gone without the work. Payouts are set by ThredUp.' }) };
  // Honest posting method per site (same meaning as the equipment app):
  // direct = an official seller API exists (posting today is still copy & open); assisted = we prepare it, you paste and Publish; consign = the site lists it for you (ThredUp), nothing to paste.
  const META = { ebay: ['direct', 'Official Sell Inventory API (eBay OAuth).'], etsy: ['direct', 'Official Etsy Open API v3 (draft listings).'], shopify: ['direct', 'Official Shopify Admin API (your own store).'],
    poshmark: ['assisted', 'No open listing API for third-party apps.'], depop: ['assisted', 'Selling API is limited to approved partners.'], mercari: ['assisted', 'No open listing API for third-party apps.'],
    facebook: ['assisted', 'Listing API is limited to partners.'], grailed: ['assisted', 'No open listing API for third-party apps.'], vinted: ['assisted', 'Pro integrations only; no open listing API.'],
    thredup: ['consign', 'Consignment: you mail it in, ThredUp lists it. No listing API.'] };
  Object.keys(META).forEach(id => { if (M[id]) { M[id].method = META[id][0]; M[id].how = META[id][1]; } });
  function shopifyTags(it) { return Array.from(new Set(list([it.department, it.kind, it.brand, it.isVintage && 'vintage', it.era && !/modern/i.test(it.era) && it.era, P_cond(it)].concat(list(it.keywords).slice(0, 10))).map(s => String(s).trim()))); }
  const P_cond = it => ({ nwt: 'new with tags', nwot: 'new without tags', exc: 'excellent', good: 'good', fair: 'fair' }[it.cond]);
  function shopifyHtml(it, c) {
    const m = list(it.meas).filter(x => x.value !== '' && x.value != null);
    return `<p>${html(it.desc)}</p>\n<ul>\n${list([it.brand && 'Brand: ' + it.brand, it.size && 'Size: ' + it.size, it.color && 'Color: ' + it.color, it.material && 'Material: ' + it.material, 'Condition: ' + c, it.flaws.length ? 'Flaws: ' + it.flaws.join('; ') : 'No flaws noted'])
      .map(x => `<li>${html(x)}</li>`).join('\n')}\n</ul>${m.length ? `\n<p><strong>Measurements (laid flat, inches):</strong> ${m.map(x => html(x.name) + ' ' + html(x.value) + '"').join(' · ')}</p>` : ''}\n<p>Message me with any questions.</p>`;
  }
  const CSV_HEAD = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Grams',
    'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable',
    'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description', 'Status'];
  const q = v => { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const handle = it => (String(it.title || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + String(it.sku || '').toLowerCase()).replace(/-$/, '');
  function csvRow(it, P) { const c = P.marketCondition.shopify[it.cond];
    return [handle(it), it.title, shopifyHtml(it, c), it.brand, P.shopifyCategory(it), it.itemType, shopifyTags(it).join(', '), 'FALSE', 'Size', it.size || 'One Size', it.sku, '',
      'shopify', 1, 'deny', 'manual', (+it.price || 0).toFixed(2), 'TRUE', 'TRUE', '', '', '', 'FALSE', cut(it.title, 70), cut(it.desc, 160), 'draft'].map(q).join(','); }
  function csv(items, P) { return '\uFEFF' + CSV_HEAD.join(',') + '\r\n' + items.map(it => csvRow(it, P)).join('\r\n') + '\r\n'; }
  return { M, csv, etsyTags };
})();
