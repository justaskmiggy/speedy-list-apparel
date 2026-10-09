/* Speedy List AI – category app engine. Category-specific content comes from js/categories.js (SLC.PACKS);
   marketplace formatting from js/markets.js (SLM). Real AI via the server; the OpenAI key never reaches the browser. */
(function () {
'use strict';
const APP_VER = 'apparel-v3';
const qs = new URLSearchParams(location.search);
const P = SLC.PACKS[qs.get('cat')] || SLC.PACKS[SLC.ACTIVE];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const MK = P.markets.map(id => Object.assign({ id }, SLM.M[id]));
const mono = m => `<span class="mono" style="background:${m.hue}">${esc(m.mono)}</span>`;
const ITEMS_KEY = 'sla.' + P.id + '.items.v1';

let tt; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }
$('#verTag').textContent = 'v' + APP_VER;

/* theme + PWA */
$('#themeBtn').addEventListener('click', () => { const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('sla.theme', next); } catch (e) {} });
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').hidden = true; });

/* static copy from the pack */
$('#catPill').textContent = P.label; $('#eyebrow').textContent = P.tagline; $('#lede').textContent = P.lede;
$('#sampleBtn').textContent = P.sample ? 'No photo handy? ' + P.sample.label : ''; $('#sampleBtn').hidden = !P.sample;
$('#mkStrip').innerHTML = MK.map(m => `<span>${esc(m.name)}</span>`).join('');
const WHERE = { ebay: 'Item specifics filled in for you. Biggest national audience.', poshmark: 'Brand, size, NWT and style tags ready.', depop: 'Hashtags and Gen-Z friendly copy.',
  mercari: 'Quick listing, shipping-label friendly.', facebook: 'Local pickup and "Message me" copy.', etsy: 'Vintage only (20+ years). 13 tags written for you.', shopify: 'Product copy plus a CSV for bulk import.' };
$('#whereGrid').innerHTML = MK.map(m => `<article><h3>${mono(m)}${esc(m.name)}</h3><p>${esc(WHERE[m.id] || '')}</p></article>`).join('');

/* ---------- photo slots ---------- */
const SHOTS = P.shots, MAX_SHOTS = SHOTS.length, REQ = SHOTS.filter(x => x.req), KEYS = SHOTS.filter(x => x.key);
const st = { shots: {}, shotUrls: {}, skip: {}, files: [], urls: [], item: null, run: 0, cond: P.defaultCondition, retail: 0, bonus: 0, price: 0, tab: MK[0].id,
  priceDirty: false, titleDirty: false, descDirty: false, bonusDirty: false };
const fileIn = $('#fileIn'), drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
fileIn.addEventListener('change', () => { addFiles(fileIn.files); fileIn.value = ''; });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); if (!drop.contains(e.target) && e.dataTransfer.files.length) { showStep('stepDrop'); addFiles(e.dataTransfer.files); } });
const isImg = f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name);
const filled = () => SHOTS.filter(x => st.shots[x.k]);
const keyOk = k => !!(st.shots[k] || st.skip[k]);
function setShot(k, f) { if (st.shotUrls[k]) URL.revokeObjectURL(st.shotUrls[k]); if (f) { st.shots[k] = f; st.shotUrls[k] = URL.createObjectURL(f); delete st.skip[k]; } else { delete st.shots[k]; delete st.shotUrls[k]; } }
function addFiles(list) {
  const files = Array.from(list || []).filter(isImg);
  if (!files.length) { toast('Pick an image file (JPG, PNG, HEIC...)'); return; }
  showStep('stepDrop');
  const open = SHOTS.filter(x => !st.shots[x.k]);
  if (!open.length) { toast(`That's ${MAX_SHOTS} photos, the max. Remove one to swap it.`); return; }
  files.slice(0, open.length).forEach((f, i) => setShot(open[i].k, f));
  if (files.length > open.length) toast(`Max ${MAX_SHOTS} photos per item. ${files.length - open.length} left out.`);
  renderShots();
}
function renderShots() {
  const n = filled().length, r = REQ.filter(x => st.shots[x.k]).length;
  $('#shots').innerHTML = SHOTS.map((x, i) => { const u = st.shotUrls[x.k], sk = !!st.skip[x.k];
    const tag = x.req ? 'Required' : x.key ? (u ? 'Added' : sk ? 'Skipped' : 'Needed') : 'Optional';
    return `<div class="shot ${x.req ? 'req' : ''} ${x.key ? 'key' : ''} ${u ? 'done' : ''} ${sk ? 'skipped' : ''}" role="listitem">
      <div class="box"><label class="pick" title="${esc(x.h)}"><span class="num">${i + 1}</span>${u ? `<img src="${u}" alt="${esc(x.n)} photo"><span class="tick">${ICON_CHECK}</span>` : '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'}
        <input type="file" accept="image/*" data-slot="${x.k}" aria-label="${u ? 'Replace' : 'Add'} ${esc(x.n)} photo"></label>
      ${u ? `<button type="button" class="rm" data-rm="${x.k}" aria-label="Remove ${esc(x.n)} photo">${ICON_X}</button>` : ''}</div>
      <span class="nm">${esc(x.n)}</span><span class="tag">${tag}</span>
      ${x.key && !u ? `<label class="skipchk"><input type="checkbox" data-skip="${x.k}" ${sk ? 'checked' : ''}>${esc(x.key)}</label>` : ''}</div>`; }).join('');
  const keysLeft = KEYS.filter(x => !keyOk(x.k)), miss = REQ.filter(x => !st.shots[x.k]);
  const c = $('#shotCount'); c.innerHTML = `${n} of ${MAX_SHOTS} photos`; c.classList.toggle('ok', !miss.length && !keysLeft.length);
  $('#shotFlags').innerHTML = KEYS.map(x => `<span class="sflag ${st.shots[x.k] ? 'ok' : st.skip[x.k] ? '' : 'need'}">${st.shots[x.k] ? '&#10003; ' : st.skip[x.k] ? 'No ' : ''}${esc(x.n.replace(/ \/.*/, ''))}</span>`).join('');
  const b = $('#analyzeBtn');
  b.disabled = !!miss.length || !!keysLeft.length;
  b.textContent = miss.length ? `Add the ${miss.map(x => x.n.toLowerCase()).join(' and ')} photo${miss.length > 1 ? 's' : ''}` : keysLeft.length ? `Add ${keysLeft.map(x => x.n.toLowerCase()).join(', ')}` : `Analyze ${n} photo${n === 1 ? '' : 's'}`;
  $('#analyzeWhy').textContent = miss.length ? 'Front and back are required.' : keysLeft.length ? `Snap ${keysLeft.map(x => x.n.toLowerCase()).join(', ')}, or tick ${keysLeft.map(x => '"' + x.key + '"').join(' / ')}.` : n < MAX_SHOTS ? `Ready. You can add ${MAX_SHOTS - n} more detail shot${MAX_SHOTS - n === 1 ? '' : 's'}.` : 'All photos in.';
}
$('#shots').addEventListener('change', e => { const t = e.target;
  if (t.dataset.slot) { const f = Array.from(t.files || []).find(isImg); t.value = ''; if (f) { setShot(t.dataset.slot, f); renderShots(); } }
  if (t.dataset.skip) { if (t.checked) st.skip[t.dataset.skip] = true; else delete st.skip[t.dataset.skip]; renderShots(); } });
$('#shots').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; e.preventDefault(); setShot(b.dataset.rm, null); renderShots(); });
function resetShots() { SHOTS.forEach(x => setShot(x.k, null)); st.skip = {}; $('#notesIn').value = ''; renderShots(); }
function showStep(id) { ['stepDrop', 'stepId', 'stepResult'].forEach(s => { $('#' + s).hidden = s !== id; }); }

$('#analyzeBtn').addEventListener('click', () => {
  st.files = P.aiOrder.filter(k => st.shots[k]).map(k => ({ file: st.shots[k], role: SHOTS.find(x => x.k === k).role }));
  st.urls = SHOTS.filter(x => st.shots[x.k]).map(x => st.shotUrls[x.k]);
  st.sample = false; startAnalysis();
});
$('#sampleBtn').addEventListener('click', async () => {
  try { const r = await fetch(P.sample.url); const b = await r.blob(); const f = new File([b], P.sample.name, { type: b.type || 'image/jpeg' });
    st.sample = true; st.files = [{ file: f, role: 'front (full item); example photo, no tags visible' }]; st.urls = [URL.createObjectURL(f)]; startAnalysis(); }
  catch (e) { toast('Example photo unavailable offline'); }
});

/* ---------- AI ---------- */
function toDataUrl(file, max = 1280) {
  return new Promise((resolve, reject) => { const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable image')); }; img.src = url; });
}
async function analyzeFiles(list) {
  const imgs = [];
  for (const x of list.slice(0, MAX_SHOTS)) { try { imgs.push({ role: x.role, dataUrl: await toDataUrl(x.file) }); } catch (e) {} }
  if (!imgs.length) throw Object.assign(new Error('photo'), { why: "I couldn't read that photo. Try a JPG or PNG." });
  const notes = [$('#notesIn').value.trim(), ...KEYS.filter(x => st.skip[x.k]).map(x => 'Seller says: ' + x.key + '.')].filter(Boolean).join(' ');
  const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 90000);
  let r;
  try { r = await fetch(SLC.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ category: P.serverCategory, images: imgs, hints: { notes: notes || undefined } }) }); }
  catch (e) { throw Object.assign(e, { why: navigator.onLine === false ? "You're offline. Check your signal and tap Analyze again." : "I couldn't reach Speedy AI just now. Tap Analyze again in a minute." }); }
  finally { clearTimeout(to); }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j || typeof j.title !== 'string') throw Object.assign(new Error('backend ' + r.status), { why: r.status === 429 ? 'Too many scans in a row. Wait a minute and tap Analyze again.'
    : r.status === 503 ? "Speedy AI isn't available right now. Try again in a bit." : "Speedy AI couldn't finish this one. Tap Analyze again." });
  return j;
}
// AI text never carries prices, phone numbers, emails or links into listings.
const BAD = /\$\s?\d|(\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b|@\w+\.\w|https?:\/\/|www\./i;
const cleanText = t => String(t || '').split(/(?<=[.!?])\s+/).filter(x => x && !BAD.test(x)).join(' ').trim();
const cleanArr = a => (Array.isArray(a) ? a : []).map(x => String(x || '').trim()).filter(x => x && !BAD.test(x));
const rangeOf = r => { const lo = Math.round(+(r && r.low) || 0), hi = Math.round(+(r && r.high) || 0); return hi > 0 ? { low: Math.min(lo || hi, hi), high: Math.max(lo, hi) } : null; };
function measFor(j) {
  const kind = P.measureKind[j.kind] || 'other';
  const ai = Array.isArray(j.measurements) ? j.measurements.filter(m => m && m.name).slice(0, 6) : [];
  const base = ai.length ? ai.map(m => ({ name: String(m.name).slice(0, 30), how: String(m.how || '').slice(0, 90), value: '' }))
    : (P.measure[kind] || P.measure.other).map(([name, how]) => ({ name, how, value: '' }));
  return base;
}
function fromAI(j) {
  return { ai: true, brand: j.brand || '', itemType: j.itemType || '', kind: j.kind || 'other', department: j.department && j.department !== 'Unknown' ? j.department : '',
    size: j.size || '', sizeType: j.sizeType || '', color: j.color || '', material: j.material || '', pattern: j.pattern || '', style: j.style || '', era: j.era || '',
    isVintage: !!j.isVintage, vintageEvidence: cleanText(j.vintageEvidence), madeIn: j.madeIn || '', sleeveLength: j.sleeveLength || '', neckline: j.neckline || '',
    closure: j.closure || '', fit: j.fit || '', features: cleanArr(j.features), flaws: cleanArr(j.flaws), meas: measFor(j),
    title: cleanText(j.title).slice(0, 80) || [j.brand, j.itemType].filter(Boolean).join(' '), desc: cleanText(j.description), conditionNote: cleanText(j.conditionReason),
    keywords: cleanArr(j.keywords).slice(0, 20), etsyTags: cleanArr(j.etsyTags), hashtags: cleanArr(j.hashtags),
    retail: Math.round(+j.retailPrice || 0), range: rangeOf(j.resaleRange), priceBasis: cleanText(j.priceBasis),
    review: cleanArr(j.needsReview).slice(0, 5).map(x => x.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^made in$/, 'made in (country)')), confidence: j.confidence || 'low', cond: P.aiCondition[j.condition] || P.defaultCondition };
}
const BLANK = () => ({ ai: false, brand: '', itemType: '', kind: 'other', department: '', size: '', sizeType: '', color: '', material: '', pattern: '', style: '', era: '', isVintage: false,
  vintageEvidence: '', madeIn: '', sleeveLength: '', neckline: '', closure: '', fit: '', features: [], flaws: [], meas: P.measure.other.map(([name, how]) => ({ name, how, value: '' })),
  title: '', desc: '', conditionNote: '', keywords: [], etsyTags: [], hashtags: [], retail: 0, range: null, priceBasis: '', review: [], confidence: 'low', cond: P.defaultCondition });

async function startAnalysis() {
  $('#thumbs').innerHTML = st.urls.map((u, i) => `<img src="${u}" alt="Photo ${i + 1}">`).join('');
  $('#scanImg').src = st.urls[0];
  await runAnalysis();
  $('#flow').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function runAnalysis() {
  const run = ++st.run; showStep('stepId');
  const lis = $$('#identSteps li'); lis.forEach(l => l.className = '');
  const anim = (async () => { for (const li of lis) { if (run !== st.run) return; li.className = 'on'; await sleep(1100); li.className = 'done'; } })();
  let item, why = '';
  try { item = fromAI(await analyzeFiles(st.files)); }
  catch (e) { console.info('[Speedy AI]', e.message); item = BLANK(); why = e.why || "Speedy AI couldn't finish this one. Tap Analyze again."; }
  await anim; if (run !== st.run) return;
  item.sku = 'SL' + Date.now().toString(36).toUpperCase().slice(-6);
  st.item = item; st.aiWhy = why; st.cond = item.cond;
  st.priceDirty = st.titleDirty = st.descDirty = st.bonusDirty = false;
  loadItem(); showStep('stepResult');
}

/* ---------- result ---------- */
const bonusKey = b => { const s = String(b || '').toLowerCase().replace(/[’']/g, "'"); if (!s) return null;
  return Object.keys(P.bonus.brands).sort((a, c) => c.length - a.length).find(k => s.includes(k.toLowerCase())) || null; };
function defaultBonus(it) { const k = bonusKey(it.brand); if (!k) return 0; let b = P.bonus.brands[k];
  const vb = P.bonus.vintageBonus; if (vb && it.isVintage && vb[k]) b += vb[k]; return Math.min(P.bonus.max, b); }
function loadItem() {
  const it = st.item;
  $('#itemImg').src = st.urls[0];
  $('#itemName').textContent = it.ai ? (it.title || 'Your item') : 'Not identified yet';
  const conf = $('#itemConf'); conf.textContent = it.ai ? ({ high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }[it.confidence] || 'AI read') : 'Type it in';
  conf.className = 'badge ' + (it.ai && it.confidence !== 'low' ? 'ok' : 'demo');
  $('#aiNote').innerHTML = it.ai ? 'Read by Speedy AI. ' + (it.review.length ? '<b>Double-check:</b> ' + it.review.map(esc).join(', ') + '.' : 'Double-check the tags, then edit anything.') + (st.sample ? ' <i>(Example photo, no tags visible.)</i>' : '')
    : esc(st.aiWhy) + ' You can also type the details in below.';
  $('#fieldGrid').innerHTML = P.fields.map(([k, l]) => `<div class="field"><label for="f_${k}">${esc(l)}</label><input id="f_${k}" data-f="${k}" value="${esc(it[k])}"></div>`).join('');
  $('#vintageChk').checked = it.isVintage; $('#vintageWhy').textContent = it.vintageEvidence ? '· ' + it.vintageEvidence : '';
  $('#flawsIn').value = it.flaws.join('\n');
  renderMeas();
  $$('#condSeg button').forEach(x => { const on = x.dataset.c === st.cond; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
  st.retail = it.retail; $('#retailIn').value = it.retail || '';
  st.bonus = defaultBonus(it); $('#bonusIn').value = st.bonus;
  $('#titleIn').value = it.title; $('#descIn').value = it.desc; $('#kwIn').value = it.keywords.join(', ');
  $('#titleCount').textContent = it.title.length + '/80';
  reprice();
}
function renderMeas() { $('#meas').innerHTML = st.item.meas.map((m, i) => `<div class="field"><label for="m_${i}">${esc(m.name)}</label><input id="m_${i}" data-m="${i}" type="number" inputmode="decimal" step="0.25" min="0" value="${esc(m.value)}" placeholder="in"><small>${esc(m.how)}</small></div>`).join(''); }
$('#fieldGrid').addEventListener('input', e => { const k = e.target.dataset.f; if (!k) return; st.item[k] = e.target.value.trim();
  if (k === 'brand' && !st.bonusDirty) { st.bonus = defaultBonus(st.item); $('#bonusIn').value = st.bonus; reprice(); } else renderMarket(); });
$('#vintageChk').addEventListener('change', e => { st.item.isVintage = e.target.checked; if (!st.bonusDirty) { st.bonus = defaultBonus(st.item); $('#bonusIn').value = st.bonus; } reprice(); });
$('#flawsIn').addEventListener('input', e => { st.item.flaws = cleanArr(e.target.value.split('\n')); renderMarket(); });
$('#meas').addEventListener('input', e => { const i = e.target.dataset.m; if (i == null) return; st.item.meas[+i].value = e.target.value; renderMarket(); });
$('#retryBtn').addEventListener('click', () => { if (st.files.length) runAnalysis(); });

/* Speedy price V = (R x C) + B */
$('#startNote').textContent = P.formula.note; $('#retailLbl').textContent = P.formula.rLabel; $('#retailIn').step = P.formula.rStep;
$('#bonusIn').min = P.bonus.min; $('#bonusIn').max = P.bonus.max; $('#bonusIn').step = P.bonus.step;
$('#condSeg').innerHTML = P.conditions.map(c => `<button type="button" role="radio" data-c="${c.id}" title="${esc(c.hint)}">${esc(c.short)}<small>&times; ${c.c.toFixed(2)}</small></button>`).join('');
$('#condSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.cond = b.dataset.c;
  $$('#condSeg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); reprice(); });
$('#retailIn').addEventListener('input', e => { st.retail = Math.max(0, +e.target.value || 0); reprice(); });
$('#bonusIn').addEventListener('input', e => { st.bonus = +e.target.value; st.bonusDirty = true; reprice(); });
$('#priceIn').addEventListener('input', e => { st.priceDirty = true; st.price = Math.max(0, +e.target.value || 0); priceState(); renderMarket(); });
$('#titleIn').addEventListener('input', e => { st.titleDirty = true; st.item.title = e.target.value; $('#titleCount').textContent = e.target.value.length + '/80'; renderMarket(); });
$('#descIn').addEventListener('input', e => { st.descDirty = true; st.item.desc = e.target.value.trim(); renderMarket(); });
$('#kwIn').addEventListener('input', e => { st.item.keywords = cleanArr(e.target.value.split(',')); renderMarket(); });
function reprice() {
  const it = st.item, c = P.conditions.find(x => x.id === st.cond), B = st.bonus || 0, rg = it.range, bk = bonusKey(it.brand);
  st.item.cond = st.cond;
  const V = st.retail > 0 ? st.retail * c.c + B : rg ? (rg.low + rg.high) / 2 : 0;
  $('#bonusOut').textContent = money(B);
  $('#goldTag').hidden = !bk;
  $('#bonusNote').textContent = bk ? `${bk} is an in-demand brand: default ${money(defaultBonus(it))}${P.bonus.vintageBonus && P.bonus.vintageBonus[bk] && !it.isVintage ? ` (more if it's vintage: tick Vintage above)` : ''}. Range ${P.bonus.range}. Slide to adjust.` : `${it.brand ? it.brand + " isn't" : "This brand isn't"} on the in-demand list, so B starts at $0. ${P.bonus.note}`;
  $('#calc').innerHTML = st.retail > 0 ? `V = (<b>${money(st.retail)}</b> &times; <b>${c.c.toFixed(2)}</b>) + <b>${money(B)}</b> = <b>${money(V)}</b>${rg ? `<br><span class="tiny">AI resale range for comparison: ${money(rg.low)}-${money(rg.high)}${it.priceBasis ? '. ' + esc(it.priceBasis) : ''}</span>` : ''}`
    : rg ? `No original retail found, so this is Speedy AI's resale estimate: <b>${money(rg.low)} - ${money(rg.high)}</b>. Add the original retail price to use the formula.`
    : 'No price found from the photos. Type the original retail price above, or enter your asking price below.';
  $('#calc').classList.toggle('wrap', true);
  $('#vOut').textContent = V > 0 ? money(V) : '-';
  if (!st.priceDirty) { st.price = V > 0 ? Math.max(1, Math.round(V)) : 0; $('#priceIn').value = st.price || ''; }
  priceState(); renderMarket();
}
function priceState() { const need = !(st.price > 0); $('#priceIn').classList.toggle('need', need); $('#priceNeed').hidden = !need; return !need; }

/* ---------- marketplace tabs ---------- */
$('#mtabs').innerHTML = MK.map(m => `<button type="button" class="mtab" role="tab" data-tab="${m.id}">${mono(m)}${esc(m.name.replace(' Marketplace', ''))}</button>`).join('');
$('#mtabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; renderMarket(); });
const curItem = () => Object.assign({}, st.item, { price: st.price, retail: st.retail, cond: st.cond });
let lastOut = null;
function renderMarket() {
  if (!st.item) return;
  const it = curItem();
  $$('#mtabs .mtab').forEach(b => { b.classList.toggle('on', b.dataset.tab === st.tab); b.classList.toggle('off', !!(SLM.M[b.dataset.tab].vintageOnly && !it.isVintage)); });
  const m = MK.find(x => x.id === st.tab), out = m.build(it, P); lastOut = out;
  const rows = out.fields.map((f, i) => { const v = String(f.value || ''); const over = f.max && v.length > f.max;
    return `<div class="mrow"><div class="mrow-h"><span>${esc(f.label)}${f.max ? ` <span class="${over ? 'gold' : ''}">${v.length}/${f.max}</span>` : ''}</span>${v ? `<button type="button" class="cbtn" data-copy="${i}">Copy</button>` : ''}</div>
      <div class="mrow-v ${v ? '' : 'empty'}">${v ? esc(v) : 'Not set, add it above'}</div></div>`; }).join('');
  $('#mpanel').innerHTML = (out.warn ? `<div class="mwarn">${esc(out.warn)}</div>` : '') + rows + (out.note ? `<p class="mnote">${esc(out.note)}</p>` : '') +
    `<div class="mact"><button class="btn primary" type="button" data-copy="all">Copy all</button><a class="btn ghost" href="${esc(m.site)}" target="_blank" rel="noopener">Open ${esc(m.name.replace(' Marketplace', ''))}</a></div>` +
    (m.csv ? `<div class="mact"><button class="btn ghost" type="button" id="csvOne">Download CSV (this item)</button><button class="btn ghost" type="button" id="csvAll">Batch CSV (${savedItems().length})</button></div>` : '');
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) {
  const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} ta.remove(); return ok; } }
$('#mpanel').addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (b) { if (!priceState()) { toast('Enter your price first'); $('#priceIn').focus(); return; }
    const t = b.dataset.copy === 'all' ? lastOut.fields.filter(f => f.value).map(f => f.label + ':\n' + f.value).join('\n\n') : String(lastOut.fields[+b.dataset.copy].value);
    if (await copyText(t)) { toast(b.dataset.copy === 'all' ? 'Whole listing copied' : 'Copied'); b.classList.add('done'); b.textContent = b.dataset.copy === 'all' ? 'Copied all' : 'Copied'; } else toast('Copy blocked. Long-press the text to copy.');
    return; }
  if (e.target.id === 'csvOne') { if (!priceState()) { toast('Enter your price first'); return; } download(SLM.csv([curItem()], P), `shopify-${st.item.sku}.csv`); }
  if (e.target.id === 'csvAll') { const all = savedItems(); if (!all.length) { toast('Tap "Save to my items" first, then export the batch'); return; } download(SLM.csv(all, P), `shopify-batch-${all.length}-items.csv`); }
});
function download(text, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('CSV downloaded'); }

/* saved items (this browser only) for batch export */
const savedItems = () => LS.get(ITEMS_KEY, []);
function savedNote() { const n = savedItems().length; $('#savedNote').textContent = n ? `${n} item${n === 1 ? '' : 's'} saved in this browser for the Shopify batch CSV.` : ''; }
$('#saveBtn').addEventListener('click', () => { if (!priceState()) { toast('Enter your price first'); return; }
  const all = savedItems().filter(x => x.sku !== st.item.sku); const it = curItem(); delete it.range; all.push(it); LS.set(ITEMS_KEY, all.slice(-200)); savedNote(); renderMarket(); toast('Saved to my items'); });
$('#againBtn').addEventListener('click', () => { resetShots(); showStep('stepDrop'); $('#list').scrollIntoView({ behavior: 'smooth' }); });

/* init */
renderShots(); savedNote();
window.SpeedyList = { pack: P, version: APP_VER, addFiles };
})();
