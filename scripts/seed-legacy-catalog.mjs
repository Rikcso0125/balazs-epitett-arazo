#!/usr/bin/env node
/**
 * Legacy termékkatalógus betöltése az új, generikus sablon-modellbe.
 *
 * Forrás (csak olvasás):
 *   - git a6873ba:src/data/extracted_summary.json  → gyári mérettáblák (sor = kinyúlás / "B",
 *     oszlop = szélesség / "A"; cellánként ellenőrizve a legacy-python datasheet.py osztályok ellen)
 *   - legacy-python-v1.3/_internal/arkepzok.json     → aktuális árképző szorzók
 *   - legacy-python-v1.3/_internal/backend/templates/<kategória>/editor.py, datasheet.py,
 *     template.html                                   → motor / távirányító / szerelés % / LED /
 *                                                        ajándékok / szövegek / fotók
 *
 * A motor legacy-szabályokat támogató mezőit használja: matrixRow/ColAxis, matrixRow/ColSnap,
 * dimOffsets, moduleSplit + splitByModule / perModule / minModules / maxModules,
 * excludeFromPercentBase.
 *
 * Futtatás:  node scripts/seed-legacy-catalog.mjs [--dry-run]
 * Idempotens: a `tpl_legacy_` kezdetű sablonokat lecseréli (az elavultakat törli), minden mást
 * érintetlenül hagy. Kategóriák név szerint (hiányzók létrehozása, menü + kép beállítása).
 */
import { applyColorCharts } from './apply-color-charts.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const LEGACY_DIR = path.join(ROOT, 'legacy-python-v1.3', '_internal');
const DRY_RUN = process.argv.includes('--dry-run');
const NOW = new Date().toISOString();

// ---------------------------------------------------------------------------
// Források
// ---------------------------------------------------------------------------
const TABLES = JSON.parse(
  execSync('git show a6873ba:src/data/extracted_summary.json', {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  }).toString('utf-8')
).tables;

let ARK = {
  LISTA_AR_SZORZO: 1.25,
  ARKEPZO_SB400: 0.66,
  ARKEPZO_SESKY_BIO: 1,
  ARKEPZO_KEDRY_SKYLIFE: 0.65,
  ARKEPZO_REFLEKSOL_120_ZIP: 1,
  ARKEPZO_VERTICA_PRIME_ZIP: 0.65,
  ARKEPZO_UVEGFAL_RENDSZER: 1,
  ARKEPZO_PERGOLA_V_ZIIP: 0.66,
  ARKEPZO_HYDRA: 0.65,
  ARKEPZO_A100LUX: 0.65,
  ARKEPZO_POLIFIX: 1,
  ARKEPZO_VERANDA_TENS_UVEGTETOS: 0.66,
  ARKEPZO_KEPLAN: 0.65,
  ARKEPZO_ISOLA_2A: 0.65,
  ARKEPZO_VERANDA_TENS_FESZITETT_VASZNAS_TETORE: 1,
  ARKEPZO_VERANDA_V_ZIP: 0.66,
};
try {
  ARK = { ...ARK, ...JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, 'arkepzok.json'), 'utf-8')) };
} catch {
  console.warn('⚠ arkepzok.json nem olvasható, alapértékekkel számolok');
}
const LIST = ARK.LISTA_AR_SZORZO || 1.25;

const WALL = 'Épülethez rögzített';
const FREE = 'Szabadon álló';
const BIG = 1e9;

// ---------------------------------------------------------------------------
// Segédfüggvények
// ---------------------------------------------------------------------------
const r4 = (n) => Math.round(n * 10000) / 10000;

function ceilIn(list, v) {
  const sorted = [...list].sort((a, b) => a - b);
  for (const x of sorted) if (v <= x) return x;
  return sorted[sorted.length - 1];
}

function range(lo, hi, step) {
  const out = [];
  for (let x = lo; x <= hi + 1e-9; x += step) out.push(Math.round(x * 100) / 100);
  return out;
}

function matrixFromFn(rows, cols, fn, labels = {}) {
  const values = {};
  for (const r of rows) {
    values[String(r)] = {};
    for (const c of cols) {
      const v = fn(r, c);
      if (!(v > 0)) throw new Error(`Hiányzó / nem pozitív mátrix cella: ${r}×${c}`);
      values[String(r)][String(c)] = r4(v);
    }
  }
  return {
    rowLabel: labels.rowLabel || 'Kinyúlás (cm)',
    colLabel: labels.colLabel || 'Szélesség (cm)',
    rows,
    cols,
    values,
  };
}

/** Gyári tábla (sor = kinyúlás, oszlop = szélesség) → CustomMatrixTable */
function tableToMatrix(t, { colFilter, add } = {}) {
  const cols = t.cols.filter((c) => !colFilter || colFilter(c));
  return matrixFromFn(t.rows, cols, (r, c) => {
    let v = Number(t.matrix[String(r)]?.[String(c)]);
    if (add) v += Number(add.matrix[String(r)]?.[String(c)]);
    return v;
  });
}

/** Lépcsős függvény töréspontjai egész cm-enként ("következő méret felfelé" kereséshez). */
function breakpoints(fn, lo, hi) {
  const pts = [];
  for (let x = lo; x < hi; x++) if (fn(x) !== fn(x + 1)) pts.push(x);
  pts.push(hi);
  return pts;
}

/** Veszteségmentes tömörítés: elhagyható a sor/oszlop, ha megegyezik a következővel. */
function compressMatrix(t) {
  const v = (r, c) => t.values[String(r)][String(c)];
  const rows = t.rows.filter((r, i, a) => i === a.length - 1 || t.cols.some((c) => v(r, c) !== v(a[i + 1], c)));
  const cols = t.cols.filter((c, i, a) => i === a.length - 1 || rows.some((r) => v(r, c) !== v(r, a[i + 1])));
  return matrixFromFn(rows, cols, v, t);
}

const pctTiers = (...pairs) => pairs.map(([maxAmount, percent]) => ({ maxAmount, percent }));
const flatTier = (pct) => pctTiers([BIG, pct]);
// Szerelés % sávok (legacy: részösszeg < 5000 → 13%, < 7500 → 12%, egyébként 10%; egész EUR)
const TIERS_13_12_10 = pctTiers([4999, 13], [7499, 12], [BIG, 10]);

const PASS_THROUGH = [
  'matrixTable', 'percentageTiers', 'perSide', 'mountTypes', 'matrixRowAxis', 'matrixColAxis',
  'matrixRowSnap', 'matrixColSnap', 'dimOffsets', 'splitByModule', 'perModule', 'minModules',
  'maxModules', 'excludeFromPercentBase',
];

/** Teljes TemplateMaterialItem (createDefaultMaterialAlgorithm mezőkészlete), minPrice = 1. */
function mat(o) {
  const m = {
    id: o.id,
    name: o.name,
    description: o.description || '',
    itemRole: o.itemRole || 'base',
    defaultSelected: o.defaultSelected ?? o.itemRole !== 'optional',
    pricingMode: o.pricingMode || 'fixed',
    currency: 'EUR',
    dimensionSource: o.dimensionSource || 'roof',
    basePrice: o.basePrice ?? 1,
    unitPrice: o.unitPrice ?? 1,
    defaultQuantity: o.defaultQuantity ?? 1,
    unitLabel: o.unitLabel || 'db',
    m2Tiers: o.m2Tiers || [],
    percentageRate: o.percentageRate ?? 0,
    minPrice: o.minPrice ?? 1,
    multiplier: r4(o.multiplier ?? 1),
    extraDiscountPct: o.extraDiscountPct ?? 0,
    fixedSurcharge: o.fixedSurcharge ?? 0,
    listPriceMultiplier: r4(o.listPriceMultiplier ?? LIST),
    defaultNote:
      o.defaultNote ?? (o.itemRole === 'gift' ? 'Ajándék' : o.itemRole === 'optional' ? 'Opció' : ''),
    photos: [],
  };
  for (const k of PASS_THROUGH) if (o[k] !== undefined) m[k] = o[k];
  return m;
}

// --- gyakori tételek ---------------------------------------------------------
const fixedItem = (id, name, price, extra = {}) =>
  mat({ id, name, pricingMode: 'fixed', basePrice: price, unitPrice: price, ...extra });

const remote = (p, listPrice, extra = {}) =>
  fixedItem(`mat_${p}_remote`, 'Távirányító', 100, { listPriceMultiplier: listPrice / 100, ...extra });

const gift = (id, name, listPrice) =>
  mat({ id, name, itemRole: 'gift', pricingMode: 'fixed', basePrice: listPrice, unitPrice: listPrice, listPriceMultiplier: 1, defaultNote: 'Ajándék' });

const optionFixed = (id, name, price, extra = {}) =>
  fixedItem(id, name, price, { itemRole: 'optional', defaultSelected: false, ...extra });

const smartHome = (p) =>
  optionFixed(`mat_${p}_smarthome`, 'Okosotthon vezérlő', 250, {
    description: 'Conexxon, Tahoma – Somfy vagy BLEBOX applikációval',
  });

const installPct = (p, tiers, extra = {}) =>
  mat({
    id: `mat_${p}_install`,
    name: 'Szerelés, programozás',
    pricingMode: 'percentage',
    percentageRate: tiers[0].percent,
    percentageTiers: tiers,
    listPriceMultiplier: 1,
    ...extra,
  });

/** Egysoros (kinyúlás ≤ maxRow) mérettábla, amelynek oszlopai szélesség-küszöbök → érték. */
const widthKeyed = (maxRow, pairs) =>
  matrixFromFn([maxRow], pairs.map(([c]) => c), (_r, c) => pairs.find(([x]) => x === c)[1]);

// --- ZIP oldalsó árnyékoló (Refleksol 120 ZIP / Vertica PRIME ZIP) -------------
// Gyári tábla: sor = árnyékoló szélessége, oszlop = magassága.
const ZIP_T = TABLES.Refleksol_120_ZIP;
const VERT_T = TABLES.Vertica_PRIME_ZIP;
const ZIP_LABELS = { rowLabel: 'Árnyékoló szélessége (cm)', colLabel: 'Magasság (cm)' };

/**
 * Refleksol tábla, opcionálisan több modulos sorokkal kibővítve (legacy: modulszám =
 * ceil(nettó szél. / 700), modulonként int(nettó / n) a következő gyári méretre, ár × n).
 */
function refleksolMatrix(multiModule) {
  const maxW = Math.max(...ZIP_T.rows);
  const rowVal = new Map(ZIP_T.rows.map((w) => [w, { n: 1, w }]));
  if (multiModule) {
    for (const n of [2, 3]) {
      for (const w of ZIP_T.rows) {
        const thr = Math.min(n * w + (n - 1), n * maxW);
        const lo = (n - 1) * maxW;
        if (thr <= lo) continue;
        if (Math.trunc((lo + 1) / n) > w) continue; // ebbe a modul-sávba nem eső méret
        rowVal.set(thr, { n, w });
      }
    }
  }
  const rows = [...rowVal.keys()].sort((a, b) => a - b);
  return matrixFromFn(rows, ZIP_T.cols, (r, h) => {
    const { n, w } = rowVal.get(r);
    return ZIP_T.matrix[String(w)][String(h)] * n;
  }, ZIP_LABELS);
}
const verticaMatrix = () => matrixFromFn(VERT_T.rows, VERT_T.cols, (r, c) => VERT_T.matrix[String(r)][String(c)], ZIP_LABELS);

/**
 * Oldalsó ZIP árnyékoló opció egy oldalra, a valódi legacy tengelyekkel (nettó szélesség × magasság),
 * a legacy profillevonásokkal (dimOffsets). A ZIP szerelés % az árban van (szorzó).
 * side: 'A' = a szélesség oldala, 'B' = a kinyúlás oldala
 */
function zipOption({ p, side, suffix = '', kind = 'refleksol', inst, offset = 0, heightOffset = 0, multiModule = false, matrixTable, mountTypes, minModules, maxModules }) {
  const isVert = kind === 'vertica';
  const k = 1 + inst / 100;
  const axis = side === 'A' ? 'width' : 'projection';
  const dimOffsets = {};
  if (offset) dimOffsets[side === 'A' ? 'widthCm' : 'projectionCm'] = -offset;
  if (heightOffset) dimOffsets.heightCm = -heightOffset;
  const sideLabel = side === 'A' ? 'a szélesség oldalára' : 'a kinyúlás oldalára';
  return mat({
    id: `mat_${p}_zip_${side.toLowerCase()}${suffix}`,
    name: isVert
      ? `Gerendába integrált oldalsó ZIP árnyékoló ${sideLabel} – Vertica PRIME ZIP, Soltis 92 ponyva, Somfy IO motor (szereléssel)`
      : `Oldalsó ZIP árnyékoló ${sideLabel} – Refleksol 120 ZIP, Serge 600 ponyva, Somfy IO motor, távirányító (szereléssel)`,
    description: `Nettó méret: ${side === 'A' ? 'szélesség' : 'kinyúlás'}${offset ? ` − ${offset} cm` : ''} × magasság${
      heightOffset ? ` − ${heightOffset} cm` : ''
    }. Az ár tartalmazza a ${inst}% szerelést, programozást.`,
    itemRole: 'optional',
    defaultSelected: false,
    pricingMode: 'matrix_cm',
    matrixTable: matrixTable || (isVert ? verticaMatrix() : refleksolMatrix(multiModule)),
    matrixRowAxis: axis,
    matrixColAxis: 'height',
    dimOffsets: Object.keys(dimOffsets).length ? dimOffsets : undefined,
    multiplier: isVert ? ARK.ARKEPZO_VERTICA_PRIME_ZIP * k : ARK.ARKEPZO_REFLEKSOL_120_ZIP * k,
    extraDiscountPct: isVert ? 10 : 0,
    fixedSurcharge: r4((isVert ? 1000 : 370) * k),
    mountTypes,
    minModules,
    maxModules,
  });
}

// --- Üvegfal (Lengyel / Spanyol) ----------------------------------------------
const GLASS_PL = [
  { maxM2: 8.5, pricePerM2: 257 },
  { maxM2: 13.5, pricePerM2: 210 },
  { maxM2: 999, pricePerM2: 200 },
];
const GLASS_ES = [
  { maxM2: 8.5, pricePerM2: 324 },
  { maxM2: 13.5, pricePerM2: 278 },
  { maxM2: 999, pricePerM2: 268 },
];

/** Üvegfal opció egy oldalra (nettó oldal × nettó magasság, sávos m²), +12% szerelés az árban. */
function glassOption({ p, side, suffix = '', offset = 0, heightOffset = 0, mountTypes, minModules, maxModules, inst = 12 }) {
  const dimOffsets = {};
  if (offset) dimOffsets[side === 'A' ? 'widthCm' : 'projectionCm'] = -offset;
  if (heightOffset) dimOffsets.heightCm = -heightOffset;
  return mat({
    id: `mat_${p}_glass_${side.toLowerCase()}${suffix}`,
    name: `Keret nélküli, elcsúsztatható üvegfalrendszer ${side === 'A' ? 'a szélesség' : 'a kinyúlás'} oldalára (10 mm edzett üveg, szereléssel)`,
    description: `Nettó ${side === 'A' ? 'szélesség' : 'kinyúlás'}${offset ? ` − ${offset} cm` : ''} × magasság${
      heightOffset ? ` − ${heightOffset} cm` : ''
    }, sávos m² ár (≤8,5 m²: 257, ≤13,5 m²: 210, felette 200 EUR/m²); az ár tartalmazza a ${inst}% szerelést.`,
    itemRole: 'optional',
    defaultSelected: false,
    pricingMode: 'tiered_m2',
    m2Tiers: GLASS_PL,
    dimensionSource: side === 'A' ? 'front_wall' : 'side_wall',
    dimOffsets: Object.keys(dimOffsets).length ? dimOffsets : undefined,
    multiplier: ARK.ARKEPZO_UVEGFAL_RENDSZER * (1 + inst / 100),
    unitLabel: 'm²',
    mountTypes,
    minModules,
    maxModules,
  });
}

/** ZIP + üvegfal opciók mindkét oldalra; a B (kinyúlás) oldali levonás beépítési módonként eltérhet. */
function sideOptions(p, { aOff, bOffWall, bOffFree, zipInst, kind = 'refleksol', heightOffset = 0 }) {
  const out = [zipOption({ p, side: 'A', offset: aOff, inst: zipInst, kind, heightOffset })];
  const bSplit = bOffWall !== bOffFree;
  if (bSplit) {
    out.push(
      zipOption({ p, side: 'B', suffix: '_wall', offset: bOffWall, inst: zipInst, kind, heightOffset, mountTypes: [WALL] }),
      zipOption({ p, side: 'B', suffix: '_free', offset: bOffFree, inst: zipInst, kind, heightOffset, mountTypes: [FREE] })
    );
  } else {
    out.push(zipOption({ p, side: 'B', offset: bOffWall, inst: zipInst, kind, heightOffset }));
  }
  out.push(glassOption({ p, side: 'A', offset: aOff, heightOffset }));
  if (bSplit) {
    out.push(
      glassOption({ p, side: 'B', suffix: '_wall', offset: bOffWall, heightOffset, mountTypes: [WALL] }),
      glassOption({ p, side: 'B', suffix: '_free', offset: bOffFree, heightOffset, mountTypes: [FREE] })
    );
  } else {
    out.push(glassOption({ p, side: 'B', offset: bOffWall, heightOffset }));
  }
  return out;
}

// --- Fotók (a legacy template.html-ben az adott termékhez tartozó képek, sorrendben) ----
function photos(tplId, list) {
  return list
    .filter(([cat, file]) => fs.existsSync(path.join(ROOT, 'public', 'uploads', 'legacy', cat, file)))
    .map(([cat, file, caption = ''], i) => ({
      id: `sphoto_legacy_${tplId.replace('tpl_legacy_', '')}_${i + 1}`,
      imageUrl: `/uploads/legacy/${cat}/${file}`,
      titleAbove: '',
      captionBelow: caption,
      widthPct: 75,
      align: 'center',
    }));
}

const NO_PROFIT_OVERRIDE = {
  // A legacy árképzők (szorzó + fix felár) már tartalmazzák a haszonkulcsot,
  // a szerelést pedig külön tétel adja → a globális haszon / szerelés képlet itt 0.
  profitMode: 'markup_percent',
  profitValue: 0,
  assemblyFixedEur: 0,
  assemblyPerM2Eur: 0,
};

const CLOSING_STD =
  'Garancia: a szerkezetre 10 év, a vásznakra/ponyvákra 5 év, a motorokra és érzékelőkre 3 év. Átfutási idő a visszaigazolástól számítva 30–60 nap. Az árajánlat a helyszíni felmérés és a műszaki tartalom pontosítása után módosulhat.';

// ---------------------------------------------------------------------------
// Kategóriák (név szerint; a kép a végigvezetett árazó termékválasztójához)
// ---------------------------------------------------------------------------
const TYPE_IMG = (n) => `/uploads/legacy/types/${n}.png`;
const CATEGORY_DEFS = [
  { key: 'bio', id: 'cat_legacy_bioklimatikus', name: 'Bioklimatikus pergola', menuId: 'menu_pergola', order: 3, description: 'Lamellás tetős, bioklimatikus pergolák', imageUrl: TYPE_IMG('bioklimatikus') },
  { key: 'feszitett', id: 'cat_legacy_feszitett', name: 'Feszített vásznas pergola', menuId: 'menu_pergola', order: 4, description: 'Elhúzható, feszített vásznas pergolák (árnyékolásra)', imageUrl: TYPE_IMG('feszitett_vasznas') },
  { key: 'ponyvas', id: 'cat_legacy_elhuzhato', name: 'Elhúzható ponyvás pergola', menuId: 'menu_pergola', order: 5, description: 'Motorosan elhúzható PVC ponyvás pergolák', imageUrl: TYPE_IMG('elhuzhato_ponyvas') },
  { key: 'poli', id: 'cat_legacy_polikarbonat', name: 'Polikarbonát tetős', menuId: 'menu_pergola', order: 6, description: '16 mm üregkamrás polikarbonát tetős alumínium pergola', imageUrl: TYPE_IMG('polikarbonatos') },
  { key: 'uvegteto', id: 'cat_legacy_uvegteto', name: 'Üvegtetős', menuId: 'menu_pergola', order: 7, description: '10 mm edzett-laminált biztonsági üvegtetős pergola', imageUrl: TYPE_IMG('uvegtetos') },
  { key: 'zip', id: 'cat_legacy_zip', name: 'ZIP árnyékoló', menuId: 'menu_arnyekolo', order: 1, description: 'Motoros, szélálló oldalsó ZIP árnyékolók', imageUrl: TYPE_IMG('ZIPes') },
  { key: 'uvegfal', id: 'cat_legacy_uvegfal', name: 'Üvegfal', menuId: 'menu_arnyekolo', order: 2, description: 'Keret nélküli, elcsúsztatható 10 mm edzett üvegfalak', imageUrl: TYPE_IMG('uvegfalas') },
  { key: 'tetore', id: 'cat_legacy_tetore', name: 'Feszített vászon tetőre', menuId: 'menu_arnyekolo', order: 3, description: 'Meglévő szerkezetre / üvegtetőre szerelhető elhúzható vászon', imageUrl: TYPE_IMG('feszitett_vasznas_tetore') },
];
// Meglévő (sablon nélküli) kategóriák képe – csak az imageUrl-t állítjuk
const CATEGORY_IMAGES_ONLY = {
  'Kazettás': TYPE_IMG('karos_napellenzos'),
  'Kazetta nélküli': TYPE_IMG('karos_napellenzos'),
  'Kézi tekerős': TYPE_IMG('karos_napellenzos'),
};

// ---------------------------------------------------------------------------
// Sablonok
// ---------------------------------------------------------------------------
const templates = [];
const addTemplate = (t) => templates.push(t);

// === 1. BIOKLIMATIKUS =========================================================
const BIO_INTRO_SUFFIX =
  ' Télen-nyáron használható: a lamellák dőlésszögével a bejutó fény és a szellőzés is szabályozható. Később üvegfallal és oldalsó árnyékolóval télikertté bővíthető.';
const BIO_CLOSING =
  'Ha a hónap végéig megrendeli az alapszerkezetet, az infrafűtést és az eső-/szélérzékelőt ajándékba adjuk. ';
// legacy datasheet: szélesség (A) a legközelebbi gyári méretre (|c−1−A| min.), kinyúlás (B) felfelé
const BIO_SNAP = { matrixColSnap: 'nearest', matrixRowSnap: 'up' };

// 1.1 SOLARE 400 (SB400)
{
  const p = 'sb400';
  const m = ARK.ARKEPZO_SB400;
  const wall = tableToMatrix(TABLES.SB400.wall_mounted);
  const free = tableToMatrix(TABLES.SB400.free_standing);
  const desc =
    'Alumínium váz, 0–120° között elforgatható lamellák (21,6 cm), oszlopokban rejtett esővíz-elvezetés. Profilok: gerenda 21×8,5 cm, oszlop 15×8,5 cm. Az ár tartalmazza a motort (Somfy IO).';
  // LED spot (legacy LedSpotVilagitas): a pergola kerekített méretei szerint 4/6/9/8/12 db
  const spot = matrixFromFn(wall.rows, wall.cols, (b, a) => {
    const narrow = b <= 274;
    if (a <= 359) return narrow ? 619 : 679;
    if (a <= 539) return narrow ? 679 : 827;
    return narrow ? 767 : 945;
  });
  addTemplate({
    id: 'tpl_legacy_sb400',
    cat: 'bio',
    name: 'SOLARE 400 bioklimatikus pergola',
    subtitle: 'Forgatható lamellás tető, Somfy IO motorral – 150 kg/m² hóterhelés',
    sizeLimits: { minWidthCm: 340, maxWidthCm: 700, minProjectionCm: 150, maxProjectionCm: 400 },
    catalogRef: { productAlias: 'Selt SB400 / Solare 400', note: `legacy: templates/bioklimatikus/datasheet.py SB400 + editor.py item1; ár = gyári × ${m} + 2500 (arkepzok.json ARKEPZO_SB400); szerelés 11% (< 8500) / 10% az alapszerkezetre` },
    introText:
      'A SOLARE 400 ({{meret}}, {{beepites}}) kedvező árú, forgatható lamellás pergola látható fali konzolokkal és jó terhelési indexekkel; zárt lamellák esetén teljesen vízzáró. Gyártási idő 20–30 nap.' + BIO_INTRO_SUFFIX,
    closingText: BIO_CLOSING + CLOSING_STD,
    photos: photos('tpl_legacy_sb400', [
      ['bioklimatikus', 'image_01.jpg', 'Alumínium vázával, 0–120° között elforgatható lamellával, oszlopaiban rejtett esővíz-elvezetéssel jó választás az időjárás elemeivel szemben.'],
      ['bioklimatikus', 'image_02.jpg', 'A lamellák állása szabályozza a bejutó fényt. A motor a pergola tetején látható, opcionálisan a gerendákban elrejtve is kérhető.'],
      ['bioklimatikus', 'image_03.jpg'],
    ]),
    materials: [
      mat({ id: `mat_${p}_wall`, name: 'SOLARE 400 – elforgatható lamellákkal, falhoz rögzítve, elöl 2 lábbal', description: desc, pricingMode: 'matrix_cm', matrixTable: wall, ...BIO_SNAP, multiplier: m, fixedSurcharge: 2500, mountTypes: [WALL] }),
      mat({ id: `mat_${p}_free`, name: 'SOLARE 400 – elforgatható lamellákkal, szabadon álló, 4 lábbal', description: desc, pricingMode: 'matrix_cm', matrixTable: free, ...BIO_SNAP, multiplier: m, fixedSurcharge: 2500, mountTypes: [FREE] }),
      remote(p, 125, { excludeFromPercentBase: true }),
      gift(`mat_${p}_gift_infra`, 'Infrafűtés 1 db', 400),
      gift(`mat_${p}_gift_sensor`, 'Eső- és szélérzékelő', 200),
      installPct(p, pctTiers([8499, 11], [BIG, 10]), { description: 'Alapszerkezet 11%-a (8500 EUR-tól 10%)' }),
      optionFixed(`mat_${p}_led`, 'LED világítás a 4 felső gerendába, belülről (szabályozható fényerejű, meleg fehér LED-szalag)', 700, { listPriceMultiplier: 1000 / 700 }),
      mat({ id: `mat_${p}_spot`, name: 'LED spot világítás a lamellákban (szabályozható fényerejű)', description: 'Darabszám a méret szerint: 4 / 6 / 8 / 9 / 12 db spot', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: spot, ...BIO_SNAP }),
      mat({ id: `mat_${p}_ral_wall`, name: 'Egyedi RAL szín (+20% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: wall, ...BIO_SNAP, multiplier: m * 0.2, fixedSurcharge: 500, mountTypes: [WALL] }),
      mat({ id: `mat_${p}_ral_free`, name: 'Egyedi RAL szín (+20% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: free, ...BIO_SNAP, multiplier: m * 0.2, fixedSurcharge: 500, mountTypes: [FREE] }),
      smartHome(p),
      ...sideOptions(p, { aOff: 30, bOffWall: 8.5, bOffFree: 17, zipInst: 8 }),
    ],
  });
}

// 1.2 SEESKY BIO
{
  const p = 'seesky';
  const wallTiers = [{ maxM2: 13, pricePerM2: 761 }, { maxM2: 16, pricePerM2: 659 }, { maxM2: 999, pricePerM2: 610 }];
  const freeTiers = [{ maxM2: 13, pricePerM2: 800 }, { maxM2: 16, pricePerM2: 695 }, { maxM2: 999, pricePerM2: 631 }];
  const desc =
    'Hőszigetelt, 0–135° között elforgatható lamellák (20 cm), rejtett motor a gerendákban, oszlopokban rejtett esővíz-elvezetés. Profilok: gerenda 20×16 cm, oszlop 16×16 cm. Az ár tartalmazza a motort.';
  const m = ARK.ARKEPZO_SESKY_BIO;
  addTemplate({
    id: 'tpl_legacy_seesky_bio',
    cat: 'bio',
    name: 'SEESKY BIO bioklimatikus pergola',
    subtitle: 'Hőszigetelt lamellák, rejtett motor – 200 kg/m² hóterhelés',
    sizeLimits: { minWidthCm: 140, maxWidthCm: 640, minProjectionCm: 150, maxProjectionCm: 470 },
    catalogRef: { productAlias: 'SeeSky Bio', note: 'legacy: templates/bioklimatikus/datasheet.py SeeSkyBio (m² sávok, szélesség 20 cm-es gyári lépcsőkben) + editor.py item2; ARKEPZO_SESKY_BIO = 1' },
    introText:
      'A SEESKY BIO ({{meret}}, {{beepites}}) magas minőségű, hőszigetelt lamellás pergola rejtett motorral és rejtett csavarokkal; zárt lamellák esetén teljesen vízzáró. Gyártási idő 30–40 nap.' + BIO_INTRO_SUFFIX,
    closingText: BIO_CLOSING + CLOSING_STD,
    photos: photos('tpl_legacy_seesky_bio', [
      ['bioklimatikus', 'image_09.png', 'Prémium hőszigetelt lamellás pergola. A lamellák mozgatását villanymotor végzi, távirányítóval vagy okostelefonnal vezérelve. Motor rejtve a gerendákban.'],
      ['bioklimatikus', 'image_10.png', 'A lamellák állása szabályozza a bejutó fényt és a természetes légáramlást.'],
    ]),
    materials: [
      mat({ id: `mat_${p}_wall`, name: 'SEESKY BIO – elforgatható, szigetelt lamellákkal, falhoz rögzítve, elöl 2 lábbal', description: desc, pricingMode: 'tiered_m2', m2Tiers: wallTiers, multiplier: m, unitLabel: 'm²', mountTypes: [WALL] }),
      mat({ id: `mat_${p}_free`, name: 'SEESKY BIO – elforgatható, szigetelt lamellákkal, szabadon álló, 4 lábbal', description: desc, pricingMode: 'tiered_m2', m2Tiers: freeTiers, multiplier: m, unitLabel: 'm²', mountTypes: [FREE] }),
      remote(p, 120, { excludeFromPercentBase: true }),
      gift(`mat_${p}_gift_sensor`, 'Eső- és szélérzékelő', 500),
      gift(`mat_${p}_gift_infra`, 'Infrafűtés 1 db', 200),
      installPct(p, pctTiers([8499, 11], [BIG, 10]), { description: 'Alapszerkezet 11%-a (8500 EUR-tól 10%)' }),
      optionFixed(`mat_${p}_led`, 'LED világítás a 4 felső gerendába, belülről (szabályozható fényerejű, meleg fehér LED-szalag)', 700, { listPriceMultiplier: 1200 / 700 }),
      optionFixed(`mat_${p}_rgb`, 'Színes (RGB) LED-szalag világítás a gerendák belső oldalain', 300),
      optionFixed(`mat_${p}_lamella_led`, 'LED-szalag világítás a lamellák belső felén – 3 db', 800),
      mat({ id: `mat_${p}_ral_wall`, name: 'Katalógusból választható RAL szín (+5% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'tiered_m2', m2Tiers: wallTiers, multiplier: m * 0.05, unitLabel: 'm²', mountTypes: [WALL] }),
      mat({ id: `mat_${p}_ral_free`, name: 'Katalógusból választható RAL szín (+5% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'tiered_m2', m2Tiers: freeTiers, multiplier: m * 0.05, unitLabel: 'm²', mountTypes: [FREE] }),
      smartHome(p),
      ...sideOptions(p, { aOff: 32, bOffWall: 16, bOffFree: 32, zipInst: 8 }),
    ],
  });
}

// 1.3 KEDRY SKYLIFE
{
  const p = 'kedry';
  const m = ARK.ARKEPZO_KEDRY_SKYLIFE;
  const wall = tableToMatrix(TABLES.KedrySkylife.wall_mounted);
  const free = tableToMatrix(TABLES.KedrySkylife.free_standing);
  const desc =
    'Forgatva elhúzható lamellák (0–85°, 24,5 cm), rejtett motorok, csavarok és fali konzolok, oszlopokban rejtett esővíz-elvezetés. Profilok: gerenda 23×16 cm, oszlop 16×16 cm.';
  addTemplate({
    id: 'tpl_legacy_kedry_skylife',
    cat: 'bio',
    name: 'KEDRY SKYLIFE bioklimatikus pergola',
    subtitle: 'Forgatva elhúzható lamellás tető, olasz prémium – 250 kg/m² hóterhelés',
    sizeLimits: { minWidthCm: 211, maxWidthCm: 611, minProjectionCm: 200, maxProjectionCm: 450 },
    catalogRef: { productAlias: 'KE Kedry Skylife 1L', note: `legacy: templates/bioklimatikus/datasheet.py KedrySkylife + editor.py item3; ár = gyári × ${m} × 0,9 + 3500; szerelés 10% (< 8500) / 8% az alapszerkezetre` },
    introText:
      'A KEDRY SKYLIFE ({{meret}}, {{beepites}}) lamellái elhúzás közben elforognak – minőségben a legmagasabb szint: rejtett motorok, csavarok és fali konzolok, hatalmas hóterhelési index. Olasz prémium termék, gyártási idő 30–40 nap.' + BIO_INTRO_SUFFIX,
    closingText: BIO_CLOSING + CLOSING_STD + ' (SKYLIFE termékre +2 év garancia kérhető.)',
    photos: photos('tpl_legacy_kedry_skylife', [
      ['bioklimatikus', 'image_13.png', 'Olasz csúcskategóriás bioklimatikus pergola: a lamellák egyetlen mozdulattal elforgathatók és el is húzhatók.'],
      ['bioklimatikus', 'image_14.jpg', 'Rejtett motorizáció, gerendába integrálható Vertica PRIME ZIP árnyékoló és panoráma üvegfalrendszer.'],
      ['bioklimatikus', 'image_15.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_wall`, name: 'KEDRY SKYLIFE 1L – forgatva elhúzható lamellákkal, falhoz rögzítve, elöl 2 lábbal', description: desc, pricingMode: 'matrix_cm', matrixTable: wall, ...BIO_SNAP, multiplier: m, extraDiscountPct: 10, fixedSurcharge: 3500, mountTypes: [WALL] }),
      mat({ id: `mat_${p}_free`, name: 'KEDRY SKYLIFE 1L – forgatva elhúzható lamellákkal, szabadon álló, 4 lábbal', description: desc, pricingMode: 'matrix_cm', matrixTable: free, ...BIO_SNAP, multiplier: m, extraDiscountPct: 10, fixedSurcharge: 3500, mountTypes: [FREE] }),
      fixedItem(`mat_${p}_motor`, 'Motor – automatizált, Somfy IO – 1 db', 523, { listPriceMultiplier: 627 / 523, excludeFromPercentBase: true }),
      remote(p, 120, { excludeFromPercentBase: true }),
      gift(`mat_${p}_gift_sensor`, 'Eső- és szélérzékelő', 500),
      gift(`mat_${p}_gift_infra`, 'Infrafűtés 1 db', 200),
      installPct(p, pctTiers([8499, 10], [BIG, 8]), { description: 'Alapszerkezet 10%-a (8500 EUR-tól 8%)' }),
      optionFixed(`mat_${p}_led`, 'LED világítás a 4 felső gerendába, belülről (szabályozható fényerejű, meleg fehér LED-szalag)', 900, { listPriceMultiplier: 1200 / 900 }),
      optionFixed(`mat_${p}_rgb`, 'RGB színes LED világítás körben a felső gerendákban, kívül-belül', 1000),
      mat({ id: `mat_${p}_ral_wall`, name: 'Katalógusból választható egyedi szín (+5% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: wall, ...BIO_SNAP, multiplier: m * 0.05, extraDiscountPct: 10, fixedSurcharge: 175, mountTypes: [WALL] }),
      mat({ id: `mat_${p}_ral_free`, name: 'Katalógusból választható egyedi szín (+5% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: free, ...BIO_SNAP, multiplier: m * 0.05, extraDiscountPct: 10, fixedSurcharge: 175, mountTypes: [FREE] }),
      smartHome(p),
      ...sideOptions(p, { aOff: 32, bOffWall: 16, bOffFree: 32, zipInst: 8, kind: 'vertica' }),
    ],
  });
}

// === 2. FESZÍTETT VÁSZNAS =====================================================
// 2.1 PERGOLA V ZIIP — legacy: modulszám = ceil(kinyúlás / 600), modulonként int(kinyúlás / n), ár × n
{
  const p = 'pvziip';
  const m = ARK.ARKEPZO_PERGOLA_V_ZIIP;
  addTemplate({
    id: 'tpl_legacy_pergola_v_ziip',
    cat: 'feszitett',
    name: 'PERGOLA V ZIIP feszített vásznas pergola',
    subtitle: 'Elhúzható, ZIP-megvezetésű feszített vászon – árnyékolásra; 600 cm kinyúlásonként új modul',
    sizeLimits: { minWidthCm: 200, maxWidthCm: 500, minProjectionCm: 200, maxProjectionCm: 1800 },
    moduleSplit: { axis: 'projection', maxCm: 600 },
    catalogRef: { productAlias: 'Selt Pergola V-ZIIP', note: `legacy: templates/feszitett_vasznas/datasheet.py PergolaVZIIP + editor.py item1; ár = (gyári × modulszám) × ${m} + 2100; motor az árban; szerelés 13/12/10%` },
    introText:
      'A PERGOLA V ZIIP ({{meret}}) elhúzható, feszített vásznas pergola: a ponyva mindkét oldalára hegesztett zipzár az oldalsó profilokban vezeti a vásznat, így az mindig feszes, ráncmentes marad. Elsősorban árnyékolásra ajánljuk; szélállóság EN 13561 3. osztály (50–70 km/h).',
    closingText: 'Hóesésben nem használható. ' + CLOSING_STD,
    photos: photos('tpl_legacy_pergola_v_ziip', [
      ['feszitett_vasznas', 'image_01.png', 'ZIP-rendszerű oldalsó megvezetés – a ponyva mindig feszes és ráncmentes marad.'],
      ['feszitett_vasznas', 'image_02.png'],
      ['feszitett_vasznas', 'image_03.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_base`, name: 'Pergola V ZIIP – elhúzható, feszített ponyvával, Serge 600 szövet (modulonként elöl 2 láb)', description: 'Az ár tartalmazza a motort (Somfy IO, modulonként 1 db).', pricingMode: 'matrix_cm', matrixTable: tableToMatrix(TABLES.PergolaVZIIP), splitByModule: true, multiplier: m, fixedSurcharge: 2100 }),
      remote(p, 120),
      gift(`mat_${p}_gift_sensor`, 'Szélérzékelő', 500),
      installPct(p, TIERS_13_12_10, { description: 'Részösszeg 13% (< 5000 EUR) / 12% (< 7500 EUR) / 10%' }),
      smartHome(p),
    ],
  });
}

// 2.2 HYDRA (1–2 modul; a gyári tábla 650 cm szélességtől a 2 modulos árakat tartalmazza)
{
  const p = 'hydra';
  const m = ARK.ARKEPZO_HYDRA;
  const matrix = tableToMatrix(TABLES.Hydra);
  const common = { pricingMode: 'matrix_cm', matrixTable: matrix, multiplier: m, extraDiscountPct: 10 };
  addTemplate({
    id: 'tpl_legacy_hydra',
    cat: 'feszitett',
    name: 'HYDRA feszített vásznas pergola',
    subtitle: 'Olasz elhúzható feszített vászon víztaszító szövettel – 1 modul 600 cm-ig, felette 2 modul',
    sizeLimits: { minWidthCm: 200, maxWidthCm: 1200, minProjectionCm: 200, maxProjectionCm: 500 },
    moduleSplit: { axis: 'width', maxCm: 600, maxModules: 2 },
    catalogRef: { productAlias: 'KE Hydra', note: `legacy: templates/feszitett_vasznas/datasheet.py Hydra + editor.py item2; ár = gyári × ${m} × 0,9 + 2345 (+525 két modulnál), motor 600/modul; szerelés 13/12/10%` },
    introText:
      'A HYDRA ({{meret}}) olasz, elhúzható feszített vásznas pergola: a kazettába zárt, zipzáras oldalvezetésű ponyva mindig feszes marad, víztaszító szövettel kisebb esőben is használható. Szélállóság EN 13561 3. osztály (50–70 km/h).',
    closingText: 'Hóesésben nem használható. ' + CLOSING_STD,
    photos: photos('tpl_legacy_hydra', [
      ['feszitett_vasznas', 'image_05.png', 'Olasz elhúzható feszített vásznas pergola víztaszító szövettel, távirányítóról kezelhetően.'],
      ['feszitett_vasznas', 'image_06.png', 'Rejtett esővíz-elvezetés az első oszlopokban, opcionális LED világítással.'],
      ['feszitett_vasznas', 'image_07.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_base`, name: 'HYDRA – elhúzható, feszített ponyvával, Acrilico szövet, elöl 2 lábbal (1 modul)', ...common, fixedSurcharge: 2345, maxModules: 1 }),
      mat({ id: `mat_${p}_base_2m`, name: 'HYDRA – elhúzható, feszített ponyvával, Acrilico szövet, elöl 3 lábbal (2 modul)', ...common, fixedSurcharge: 2345 + 525, minModules: 2 }),
      fixedItem(`mat_${p}_motor`, 'Motor – automatizált, Somfy IO (modulonként 1 db)', 600, { perModule: true }),
      remote(p, 125),
      gift(`mat_${p}_gift_sensor`, 'Szélérzékelő', 300),
      installPct(p, TIERS_13_12_10, { description: 'Részösszeg 13% (< 5000 EUR) / 12% (< 7500 EUR) / 10%' }),
      mat({ id: `mat_${p}_led`, name: 'LED világítás a hátsó, fali profilban (szabályozható, meleg fehér LED-szalag)', description: '1 modul: 500 cm alatt 400, felette 500 EUR; 2 modul: 950 cm alatt 600, felette 700 EUR', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: widthKeyed(500, [[499, 400], [600, 500], [949, 600], [1200, 700]]) }),
      smartHome(p),
    ],
  });
}

// === 3. ELHÚZHATÓ PONYVÁS =====================================================
// 3.1 GENIUS A100 LUX (1–3 modul: ≤500 cm 1, ≤900 cm 2, ≤1300 cm 3 modul)
// A modulhatárok (500/900/1300) nem ceil(szélesség / X) alakúak, ezért a modulfüggő tételek
// szélesség-küszöbös mérettáblák; a 2–3 modulos felár (+1400 / +2400 EUR) a tábla celláiban van
// (÷ 0,585, hogy az árképző után pontosan a felárat adja).
{
  const p = 'a100';
  const m = ARK.ARKEPZO_A100LUX;
  const eff = m * 0.9;
  const t1 = TABLES.A100Lux['1_modul'];
  const e1 = TABLES.A100Lux['1_modul_eloteto'];
  const t23 = TABLES.A100Lux['2_3_modul'];
  const e23 = TABLES.A100Lux['2_3_modul_eloteto'];
  const cols = [...t1.cols, ...t23.cols];
  const matrix = matrixFromFn(t1.rows, cols, (b, a) => {
    if (a <= 500) return t1.matrix[b][a] + e1.matrix[b][a];
    const bb = Math.min(b, Math.max(...t23.rows)); // 2–3 modulnál a kinyúlás max. 500 (legacy: a legnagyobb sor)
    const extra = a <= 900 ? 1400 : 2400;
    return t23.matrix[bb][a] + e23.matrix[bb][a] + extra / eff;
  });
  const legsOf = (a) => (a <= 500 ? 2 : a <= 900 ? 3 : 4);
  // A oldali ZIP: nettó = szélesség − lábszám × 6 → a bruttó szélesség szerinti sorok
  const zipA = (() => {
    const fn = (a) => ceilIn(ZIP_T.rows, a - legsOf(a) * 6);
    const rows = breakpoints(fn, 250, 1300);
    return matrixFromFn(rows, ZIP_T.cols, (a, h) => ZIP_T.matrix[String(fn(a))][String(h)], { rowLabel: 'Pergola szélessége (cm)', colLabel: 'Magasság (cm)' });
  })();
  addTemplate({
    id: 'tpl_legacy_a100_lux',
    cat: 'ponyvas',
    name: 'GENIUS A100 LUX elhúzható PVC ponyvás pergola',
    subtitle: 'Ferde tetős, négy évszakos, előtetővel – 1–3 modul (500 / 900 / 1300 cm-ig)',
    sizeLimits: { minWidthCm: 250, maxWidthCm: 1300, minProjectionCm: 250, maxProjectionCm: 600 },
    catalogRef: { productAlias: 'Gennius A100 LUX', note: `legacy: templates/elhuzhato_ponyvas/datasheet.py A100Lux (1_modul / 2_3_modul + előtető táblák) + editor.py item1; ár = (gyári + előtető) × ${m} × 0,9 + 2470 (+1400 / +2400 a 2 / 3 modulnál); motor 800 + 100/modul; szerelés 13/12/10%` },
    introText:
      'A GENIUS A100 LUX ({{meret}}) jó ár-érték arányú, ferde tetős, elcsúsztatható PVC ponyvás pergola előtetővel; négy évszakos, zárt ponyva esetén teljesen vízzáró. Szélállóság EN 13561 6. osztály (119 km/h).',
    closingText: 'Hóesésben a termék használata nem ajánlott. ' + CLOSING_STD,
    photos: photos('tpl_legacy_a100_lux', [
      ['elhuzhato_ponyvas', 'image_01.jpg', 'Olasz elhúzható PVC ponyvás pergola előtetővel; a ponyva motorosan elhúzható és távirányítóval vezérelhető.'],
      ['elhuzhato_ponyvas', 'image_02.png', 'Integrált esőcsatorna és az első oszlopokban rejtett csapadékvíz-elvezetés, 1–3 modulos kivitel.'],
      ['elhuzhato_ponyvas', 'image_03.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_base`, name: 'GENIUS A100 LUX elhúzható PVC ponyvás pergola előtetővel – Opatex Flat szövet', description: '1 modul 500 cm-ig (elöl 2 láb), 2 modul 900 cm-ig (3 láb), 3 modul 1300 cm-ig (4 láb). Profilok: gerenda 14×13 cm, oszlop 13×10 cm.', pricingMode: 'matrix_cm', matrixTable: matrix, multiplier: m, extraDiscountPct: 10, fixedSurcharge: 2470 }),
      mat({ id: `mat_${p}_motor`, name: 'Motor – automatizált, Somfy IO', pricingMode: 'matrix_cm', matrixTable: widthKeyed(600, [[500, 800], [900, 900], [1300, 1000]]) }),
      remote(p, 125),
      gift(`mat_${p}_gift_sensor`, 'Szél- vagy esőérzékelő', 300),
      installPct(p, TIERS_13_12_10, { description: 'Részösszeg 13% (< 5000 EUR) / 12% (< 7500 EUR) / 10%' }),
      mat({ id: `mat_${p}_led`, name: 'LED világítás a felső keresztprofil(ok)ban (modulonként 1 db, szabályozható LED-szalag)', itemRole: 'optional', defaultSelected: false, pricingMode: 'matrix_cm', matrixTable: widthKeyed(600, [[500, 400], [900, 600], [1300, 800]]) }),
      smartHome(p),
      zipOption({ p, side: 'A', inst: 10, heightOffset: 30, matrixTable: zipA }),
      zipOption({ p, side: 'B', offset: 11, inst: 10, heightOffset: 30 }),
      glassOption({ p, side: 'A', offset: 18, heightOffset: 30 }),
      glassOption({ p, side: 'B', offset: 11, heightOffset: 30 }),
    ],
  });
}

// 3.2 KEPLAN
{
  const p = 'keplan';
  const m = ARK.ARKEPZO_KEPLAN;
  addTemplate({
    id: 'tpl_legacy_keplan',
    cat: 'ponyvas',
    name: 'KEPLAN sík tetejű elhúzható PVC ponyvás pergola',
    subtitle: 'Sík tető, négy évszakos – falra szerelt (550 × 600) vagy szabadon álló (450 × 500)',
    sizeLimits: { minWidthCm: 250, maxWidthCm: 550, minProjectionCm: 250, maxProjectionCm: 600 },
    catalogRef: { productAlias: 'KE Keplan A', note: `legacy: templates/elhuzhato_ponyvas/datasheet.py Keplan + editor.py item2; ár = gyári × ${m} + 2470; motor 800; szerelés 12%` },
    introText:
      'A KEPLAN ({{meret}}, {{beepites}}) sík tetejű, elhúzható-összecsukható PVC ponyvás alumínium pergola; a tető mozgatását villanymotor végzi, távirányítóval vagy okostelefonnal. Négy évszakos, zárt ponyva esetén vízzáró. Szélállóság EN 13561 6. osztály.',
    closingText: 'Hóesésben a termék használata nem ajánlott. ' + CLOSING_STD,
    photos: photos('tpl_legacy_keplan', [
      ['elhuzhato_ponyvas', 'image_05.jpg', 'Vízszintes, sík tetejű elhúzható ponyvás pergola, villanymotoros mozgatással.'],
      ['elhuzhato_ponyvas', 'image_06.png'],
      ['elhuzhato_ponyvas', 'image_07.png'],
      ['elhuzhato_ponyvas', 'image_08.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_wall`, name: 'KEPLAN A elhúzható PVC ponyvás pergola – Opatex Flat szövet, falhoz rögzítve, elöl 2 lábbal', description: 'Profilok: gerenda 11×11 cm, oszlop 11×11 cm.', pricingMode: 'matrix_cm', matrixTable: tableToMatrix(TABLES.Keplan.wall_mounted), multiplier: m, fixedSurcharge: 2470, mountTypes: [WALL] }),
      mat({ id: `mat_${p}_free`, name: 'KEPLAN A elhúzható PVC ponyvás pergola – Opatex Flat szövet, szabadon álló, 4 lábbal', description: 'Profilok: gerenda 11×11 cm, oszlop 11×11 cm.', pricingMode: 'matrix_cm', matrixTable: tableToMatrix(TABLES.Keplan.free_standing), multiplier: m, fixedSurcharge: 2470, mountTypes: [FREE] }),
      fixedItem(`mat_${p}_motor`, 'Motor – automatizált, Somfy IO', 800),
      remote(p, 125),
      gift(`mat_${p}_gift_sensor`, 'Szél- vagy esőérzékelő', 300),
      installPct(p, flatTier(12), { description: 'Részösszeg 12%-a' }),
      optionFixed(`mat_${p}_led`, 'LED világítás a felső keresztprofilban (1 db, szabályozható LED-szalag)', 300),
      smartHome(p),
      ...sideOptions(p, { aOff: 22, bOffWall: 11, bOffFree: 22, zipInst: 10, heightOffset: 10 }),
    ],
  });
}

// 3.3 ISOLA 2A (700 cm felett: +650 EUR, motor 1200, szerelés 9%, LED 1200, 3/6 láb)
{
  const p = 'isola';
  const m = ARK.ARKEPZO_ISOLA_2A;
  const base = (mount, large) => {
    const t = mount === WALL ? TABLES.Isola.wall_mounted : TABLES.Isola.free_standing;
    const legs = mount === WALL ? (large ? 3 : 2) : large ? 6 : 4;
    return mat({
      id: `mat_${p}_${mount === WALL ? 'wall' : 'free'}${large ? '_2m' : ''}`,
      name: `ISOLA 2A – elhúzható PVC ponyvával, ${mount === WALL ? 'falhoz rögzítve, elöl' : 'szabadon álló,'} ${legs} lábbal${large ? ' (700 cm felett)' : ''}`,
      description: 'Profilok: gerenda 22×13 cm, oszlop 12×12 cm.',
      pricingMode: 'matrix_cm',
      matrixTable: tableToMatrix(t),
      multiplier: m,
      extraDiscountPct: 10,
      fixedSurcharge: 370 + 2500 + (large ? 650 : 0),
      mountTypes: [mount],
      ...(large ? { minModules: 2 } : { maxModules: 1 }),
    });
  };
  addTemplate({
    id: 'tpl_legacy_isola_2a',
    cat: 'ponyvas',
    name: 'ISOLA 2A prémium elhúzható ponyvás pergola',
    subtitle: 'Olasz prémium, sík tető, rejtett motor – 700 cm-ig 1, 1000 cm-ig 2 modul',
    sizeLimits: { minWidthCm: 250, maxWidthCm: 1000, minProjectionCm: 250, maxProjectionCm: 550 },
    moduleSplit: { axis: 'width', maxCm: 700, maxModules: 2 },
    catalogRef: { productAlias: 'KE Isola 2', note: `legacy: templates/elhuzhato_ponyvas/datasheet.py Isola + editor.py item3; ár = gyári × ${m} × 0,9 + 2870 (+650 700 cm felett); motor 1000/1200; szerelés 8% / 9%` },
    introText:
      'Az ISOLA 2A ({{meret}}, {{beepites}}) prémium kategóriás, sík tetejű, elhúzható PVC ponyvás pergola: rejtett motorok, csavarok és fali konzolok, a legmodernebb technológiával. Négy évszakos, zárt ponyva esetén vízzáró; szélállóság EN 13561 6. osztály.',
    closingText: 'Hóesésben a termék használata nem ajánlott. ' + CLOSING_STD,
    photos: photos('tpl_legacy_isola_2a', [
      ['elhuzhato_ponyvas', 'image_10.jpg', 'Olasz prémium, sík tetejű elhúzható ponyvás pergola vízszintes csúsztatással.'],
      ['elhuzhato_ponyvas', 'image_11.jpg', 'Somfy motoros tetőmozgatás, rejtett vízelvezetés, integrálható LED világítás.'],
      ['elhuzhato_ponyvas', 'image_12.png'],
    ]),
    materials: [
      base(WALL, false),
      base(FREE, false),
      base(WALL, true),
      base(FREE, true),
      fixedItem(`mat_${p}_motor`, 'Motor – automatizált, Somfy IO – 1 db', 1000, { maxModules: 1 }),
      fixedItem(`mat_${p}_motor_2m`, 'Motor – automatizált, Somfy IO – 1 db', 1200, { minModules: 2 }),
      remote(p, 125),
      gift(`mat_${p}_gift_sensor`, 'Esőérzékelő', 200),
      gift(`mat_${p}_gift_infra`, 'Infrafűtés', 300),
      installPct(p, flatTier(8), { description: 'Részösszeg 8%-a', maxModules: 1 }),
      installPct(p, flatTier(9), { id: `mat_${p}_install_2m`, description: 'Részösszeg 9%-a (700 cm felett)', minModules: 2 }),
      optionFixed(`mat_${p}_led`, 'LED világítás a 4 felső gerendába, belülről (szabályozható LED-szalag)', 900, { maxModules: 1 }),
      optionFixed(`mat_${p}_led_2m`, 'LED világítás a 4 felső gerendába, belülről (szabályozható LED-szalag)', 1200, { minModules: 2 }),
      smartHome(p),
      zipOption({ p, side: 'A', offset: 24, inst: 10, maxModules: 1 }),
      zipOption({ p, side: 'A', suffix: '_2m', offset: 36, inst: 10, minModules: 2 }),
      zipOption({ p, side: 'B', suffix: '_wall', offset: 12, inst: 10, mountTypes: [WALL] }),
      zipOption({ p, side: 'B', suffix: '_free', offset: 24, inst: 10, mountTypes: [FREE] }),
      glassOption({ p, side: 'A', offset: 24, maxModules: 1 }),
      glassOption({ p, side: 'A', suffix: '_2m', offset: 36, minModules: 2 }),
      glassOption({ p, side: 'B', suffix: '_wall', offset: 12, mountTypes: [WALL] }),
      glassOption({ p, side: 'B', suffix: '_free', offset: 24, mountTypes: [FREE] }),
    ],
  });
}

// === 4. FESZÍTETT VÁSZON TETŐRE ==============================================
// 4.1 VERANDA TENS — modulszám = ceil(szélesség / 450), modulonként int(szél. / n), ár × n
{
  const p = 'veranda_tens';
  const m = ARK.ARKEPZO_VERANDA_TENS_FESZITETT_VASZNAS_TETORE;
  addTemplate({
    id: 'tpl_legacy_veranda_tens',
    cat: 'tetore',
    name: 'VERANDA TENS tetőárnyékoló (meglévő szerkezetre)',
    subtitle: 'Bowden-huzalos, rugós feszítésű elhúzható vászon tető fölé vagy alá – 450 cm-enként új modul',
    sizeLimits: { minWidthCm: 125, maxWidthCm: 1800, minProjectionCm: 150, maxProjectionCm: 400 },
    moduleSplit: { axis: 'width', maxCm: 450 },
    catalogRef: { productAlias: 'Veranda Tens', note: `legacy: templates/feszitett_vasznas_tetore/datasheet.py VerandaTens + editor.py item1; ár = (gyári × modulszám) × ${m} + 125, motor 350/modul, szerelés 15% (1 modul) / 13% (több modul)` },
    introText:
      'A VERANDA TENS ({{szelesseg}} × {{kinyulas}} cm) meglévő szerkezetre – télikertre, üvegtetőre vagy pergolára – építhető elhúzható vásznas árnyékoló, a tető fölé és alá is szerelhető; egymodulos és többmodulos kivitelben. Csak motoros vezérléssel; szélállóság EN 13561 2. osztály (30–50 km/h).',
    closingText: 'Csak árnyékolásra ajánljuk, hóesésben nem használható. ' + CLOSING_STD,
    photos: photos('tpl_legacy_veranda_tens', [
      ['feszitett_vasznas_tetore', 'image_01.png', 'Meglévő télikertre, üvegtetőre vagy pergolára (tető fölé és alá is) szerelhető motoros tetőárnyékoló.'],
      ['feszitett_vasznas_tetore', 'image_02.png'],
      ['feszitett_vasznas_tetore', 'image_03.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_base`, name: 'Veranda Tens – elhúzható ponyvával, Acrilico ponyva, tető fölé (modulonként 1 db)', pricingMode: 'matrix_cm', matrixTable: tableToMatrix(TABLES.VerandaTens), splitByModule: true, multiplier: m, fixedSurcharge: 125 }),
      fixedItem(`mat_${p}_motor`, 'Motor – automatizált, Somfy IO (modulonként 1 db)', 350, { perModule: true }),
      remote(p, 120),
      gift(`mat_${p}_gift_sensor`, 'Szélérzékelő', 300),
      installPct(p, flatTier(15), { description: 'Részösszeg 15%-a (1 modul)', maxModules: 1 }),
      installPct(p, flatTier(13), { id: `mat_${p}_install_multi`, description: 'Részösszeg 13%-a (több modul)', minModules: 2 }),
    ],
  });
}

// 4.2 VERANDA V ZIIP — modulszám = ceil(szélesség / 500); több modulnál +500 EUR
{
  const p = 'veranda_vzip';
  const m = ARK.ARKEPZO_VERANDA_V_ZIP;
  const common = { pricingMode: 'matrix_cm', matrixTable: tableToMatrix(TABLES.VerandaVZIP), splitByModule: true, multiplier: m, description: 'Az ár tartalmazza a motort (Somfy IO, modulonként 1 db).' };
  addTemplate({
    id: 'tpl_legacy_veranda_v_zip',
    cat: 'tetore',
    name: 'VERANDA V ZIIP feszített vászon (meglévő szerkezetre)',
    subtitle: 'ZIP-megvezetésű, feszített elhúzható vászon meglévő szerkezet tetejére – 500 cm-enként új modul',
    sizeLimits: { minWidthCm: 200, maxWidthCm: 2000, minProjectionCm: 200, maxProjectionCm: 600 },
    moduleSplit: { axis: 'width', maxCm: 500 },
    catalogRef: { productAlias: 'Selt Veranda V-ZIIP', note: `legacy: templates/feszitett_vasznas_tetore/datasheet.py VerandaVZIP + editor.py item2; ár = (gyári × modulszám) × ${m} + 1125 (+500 több modulnál); szerelés 12%` },
    introText:
      'A VERANDA V ZIIP ({{szelesseg}} × {{kinyulas}} cm) meglévő szerkezetre építhető, ZIP-rendszerű feszített árnyékoló: a zipzáras oldalvezetés miatt a ponyva mindig feszes marad. Szélállóság EN 13561 3. osztály (50–70 km/h).',
    closingText: 'Csak árnyékolásra ajánljuk, hóesésben nem használható. ' + CLOSING_STD,
    photos: photos('tpl_legacy_veranda_v_zip', [
      ['feszitett_vasznas_tetore', 'image_05.png', 'Meglévő szerkezetre építhető ZIP-rendszerű feszített árnyékoló.'],
      ['feszitett_vasznas_tetore', 'image_06.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_base`, name: 'Veranda V ZIIP – elhúzható, feszített ponyvával, Serge 600 szövet, meglévő szerkezet tetejére', ...common, fixedSurcharge: 1125, maxModules: 1 }),
      mat({ id: `mat_${p}_base_multi`, name: 'Veranda V ZIIP – elhúzható, feszített ponyvával, Serge 600 szövet, meglévő szerkezet tetejére (több modul)', ...common, fixedSurcharge: 1125 + 500, minModules: 2 }),
      remote(p, 125),
      gift(`mat_${p}_gift_sensor`, 'Szélérzékelő', 500),
      installPct(p, flatTier(12), { description: 'Részösszeg 12%-a' }),
    ],
  });
}

// === 5. POLIFIX és 6. GLASSFIX — lábszám = modulszám + 1, modul = ceil(szélesség / 600) ======
const POLIFIX_TIERS = {
  1: [[12, 238], [18, 196], [24, 176], [36, 156]],
  2: [[24, 238], [36, 205], [48, 186], [72, 166]],
  3: [[36, 238], [54, 205], [72, 186], [108, 166]],
};
const GLASSFIX_TIERS = {
  1: [[12, 312.5], [18, 273.5], [24, 252.5]],
  2: [[24, 312.5], [36, 260.5], [48, 231]],
  3: [[36, 312.5], [54, 260.5], [72, 231]],
};
const POLIFIX_INSTALL = [[24, 700], [36, 900], [48, 1100], [72, 1300], [108, 1500]];
const GLASSFIX_INSTALL = [[24, 800], [36, 1200], [48, 1500], [72, 2000]];
const toTiers = (pairs) => pairs.map(([maxM2, pricePerM2], i, a) => ({ maxM2: i === a.length - 1 ? 999 : maxM2, pricePerM2 }));
const bandFix = (bands, m2) => (bands.find(([max]) => m2 <= max + 1e-9) || bands[bands.length - 1])[1];

/** Fix szerelés m² sávonként: 10 cm-es rácsban, a cella felső sarkának m²-e szerint (tömörítve). */
function installMatrix(bands, maxB) {
  const rows = range(50, maxB, 10);
  const cols = range(100, 1800, 10);
  return compressMatrix(matrixFromFn(rows, cols, (r, c) => bandFix(bands, (r / 100) * (c / 100))));
}

// Veranda Tens tetőárnyékoló az üvegtetőre (legacy: darab = ceil(szél. / 450); (gyári × darab) × 0,66 + 100
// + darabonként motor 250 + távirányító 200 + szerelés 800)
function verandaOnGlassMatrix() {
  const T = TABLES.VerandaTens;
  const fn = (B, A) => {
    const n = Math.max(1, Math.ceil(A / 450));
    const a = ceilIn(T.cols, Math.trunc(A / n));
    const b = ceilIn(T.rows, B);
    const raw = T.matrix[String(b)][String(a)] * n;
    return Math.trunc(raw * ARK.ARKEPZO_VERANDA_TENS_UVEGTETOS + 100) + (250 + 200 + 800) * n;
  };
  const colSet = new Set();
  for (const B of T.rows) breakpoints((A) => fn(B, A), 100, 1800).forEach((c) => colSet.add(c));
  const cols = [...colSet].sort((a, b) => a - b);
  return compressMatrix(matrixFromFn(T.rows, cols, fn));
}

for (const kind of ['polifix', 'glassfix']) {
  const isGlass = kind === 'glassfix';
  const p = kind;
  const maxB = isGlass ? 400 : 600;
  const tplId = `tpl_legacy_${kind}`;
  const tierSet = isGlass ? GLASSFIX_TIERS : POLIFIX_TIERS;
  const materials = [];
  for (const mod of [1, 2, 3]) {
    materials.push(
      mat({
        id: `mat_${p}_base_${mod + 1}lab`,
        name: isGlass
          ? `GLASSFIX – 10 mm vastag biztonsági üvegtetővel, falhoz rögzítve, elöl ${mod + 1} lábbal`
          : `POLIFIX – 16 mm opál polikarbonát tetővel, falhoz rögzítve, elöl ${mod + 1} lábbal`,
        description: (isGlass
          ? 'Edzett-laminált biztonsági üvegtető, belső csatornás esővíz-elvezetés, min. 6° lejtés. Profilok: gerenda 11×15 cm, oszlop 11×14 cm.'
          : 'Szinterezett alumínium váz, SOLAR CONTROL polikarbonát (10 év garancia UV és jégeső ellen), min. 8° lejtés. Profilok: gerenda 19×15 / 6×12 cm, oszlop 11×14 cm.') +
          ` Sávos m² ár (${mod + 1} láb).`,
        pricingMode: 'tiered_m2',
        m2Tiers: toTiers(tierSet[mod]),
        multiplier: ARK.ARKEPZO_POLIFIX,
        unitLabel: 'm²',
        minModules: mod,
        maxModules: mod,
      })
    );
  }
  if (isGlass) materials.push(gift(`mat_${p}_gift_infra`, 'Infrafűtés', 200));
  const instBands = isGlass ? GLASSFIX_INSTALL : POLIFIX_INSTALL;
  materials.push(
    mat({
      id: `mat_${p}_install`,
      name: 'Szerelés',
      description: `Fix szerelési díj a tetőfelület szerint: ${instBands
        .map(([m2, eur], i, a) => (i === a.length - 1 ? `${a[i - 1][0]} m² felett ${eur} EUR` : `${m2} m²-ig ${eur} EUR`))
        .join(', ')}`,
      pricingMode: 'matrix_cm',
      matrixTable: installMatrix(instBands, maxB),
      listPriceMultiplier: 1,
    }),
    optionFixed(`mat_${p}_spot`, 'LED spot világítás a felső gerendákba, belülről (szabályozható, meleg fehér LED-spot)', 50, { defaultQuantity: 6, description: '50 EUR / db' })
  );
  if (!isGlass) {
    for (const mod of [1, 2, 3]) {
      materials.push(
        mat({ id: `mat_${p}_ral_${mod + 1}lab`, name: 'Egyedi RAL szín (+10% felár)', itemRole: 'optional', defaultSelected: false, pricingMode: 'tiered_m2', m2Tiers: toTiers(tierSet[mod]), multiplier: ARK.ARKEPZO_POLIFIX * 0.1, unitLabel: 'm²', minModules: mod, maxModules: mod })
      );
    }
  } else {
    materials.push(
      mat({
        id: `mat_${p}_veranda`,
        name: 'Veranda Tens tetőárnyékoló a pergola tetejére – motoros, szélérzékelős, távirányítós (szereléssel)',
        description: 'Darabszám: szélesség / 450 cm felfelé kerekítve; darabonként motor 250 + távirányító 200 + szerelés 800 EUR',
        itemRole: 'optional',
        defaultSelected: false,
        pricingMode: 'matrix_cm',
        matrixTable: verandaOnGlassMatrix(),
      })
    );
  }
  // ZIP / üvegfal: nettó szélesség (Polifix −22; Glassfix − lábszám × 11), kinyúlás −14,
  // magasság: legacy H − 10% × kinyúlás → itt fix −30 cm (300 cm-es kinyúlásnál pontos)
  for (const mod of [1, 2, 3]) {
    const aOff = isGlass ? (mod + 1) * 11 : 22;
    if (!isGlass && mod > 1) continue;
    const modRange = isGlass ? { minModules: mod, maxModules: mod } : {};
    const sfx = isGlass ? `_${mod + 1}lab` : '';
    materials.push(
      zipOption({ p, side: 'A', suffix: sfx, offset: aOff, inst: 10, heightOffset: 30, multiModule: true, ...modRange }),
      glassOption({ p, side: 'A', suffix: sfx, offset: aOff, heightOffset: 30, ...modRange })
    );
  }
  materials.push(
    zipOption({ p, side: 'B', offset: 14, inst: 10, heightOffset: 30, multiModule: true }),
    glassOption({ p, side: 'B', offset: 14, heightOffset: 30 })
  );
  if (isGlass) {
    materials.push(
      mat({ id: `mat_${p}_glass_triangle`, name: 'Háromszögrész beépítése üvegből – 1 db (szereléssel)', description: 'Kinyúlás (cm) × 1,3 EUR, +12% szerelés', itemRole: 'optional', defaultSelected: false, pricingMode: 'per_lm', dimensionSource: 'proj_lm', unitPrice: 130, multiplier: 1.12, unitLabel: 'fm' })
    );
  }
  addTemplate({
    id: tplId,
    cat: isGlass ? 'uvegteto' : 'poli',
    name: isGlass ? 'GLASSFIX üvegtetős pergola' : 'POLIFIX polikarbonát tetős pergola',
    subtitle: `Falhoz rögzítve; elöl 2 láb 6 m-ig, 3 láb 12 m-ig, 4 láb 18 m-ig – max. ${maxB / 100} m kinyúlás`,
    sizeLimits: { minWidthCm: 100, maxWidthCm: 1800, minProjectionCm: 50, maxProjectionCm: maxB },
    moduleSplit: { axis: 'width', maxCm: 600, maxModules: 3 },
    catalogRef: {
      productAlias: isGlass ? 'Glassfix' : 'Polifix',
      note: `legacy: templates/${isGlass ? 'uvegtetos/datasheet.py Glassfix' : 'polikarbonatos/datasheet.py Polifix'} (lábszám szerinti sávos m² ár, fix szerelés m² szerint) + editor.py; ARKEPZO_POLIFIX = ${ARK.ARKEPZO_POLIFIX}`,
    },
    introText: isGlass
      ? 'A GLASSFIX ({{meret}}) fix tetejű alumínium pergola 10 mm vastag, edzett-laminált biztonsági üvegtetővel (opál vagy víztiszta). Télen-nyáron használható, az üvegtetőn át elegendő fény jut a tető alá; később üvegfallal, oldalsó és tetőárnyékolóval bővíthető.'
      : 'A POLIFIX ({{meret}}) fix tetejű alumínium pergola 16 mm vastag, opál üregkamrás polikarbonát tetővel: elegendő fényt enged át, de a meleget megszűri. Szélállóság EN 13561 6. osztály; később üvegfallal és oldalsó árnyékolóval bővíthető.',
    closingText: isGlass
      ? 'Hóterhelés: üvegtető max. 120 kg/m², szerkezet 200 kg/m². Garancia: szerkezet és üveg 10 év, vásznak 5 év, motorok, érzékelők 3 év. Átfutási idő 30–60 nap. A lábak rögzítéséhez beton alap szükséges.'
      : 'Hóterhelés: szerkezet max. 150 kg/m², polikarbonát lemez 85 kg/m². Garancia: szerkezet 10 év, tető 5 év. Átfutási idő 10–30 nap. A lábak rögzítéséhez beton alap szükséges.',
    photos: photos(tplId, isGlass
      ? [
          ['uvegtetos', 'image_01.png', '10 mm vastag edzett, laminált biztonsági üvegtetős alumínium pergola belső csatornás esővíz-elvezetéssel.'],
          ['uvegtetos', 'image_02.png'],
          ['uvegtetos', 'image_03.png'],
          ['uvegtetos', 'image_04.png', 'Opció: motoros Veranda tetőárnyékoló a pergola tetejére.'],
        ]
      : [
          ['polikarbonatos', 'image_01.jpg', '16 mm-es opál üregkamrás polikarbonát fedés, 10 év garancia UV-sugárzás és jégeső ellen.'],
          ['polikarbonatos', 'image_02.png'],
          ['polikarbonatos', 'image_03.png'],
          ['polikarbonatos', 'image_04.png'],
        ]),
    materials,
  });
}

// === 7. ÜVEGFAL (önálló) =====================================================
for (const es of [true, false]) {
  const p = es ? 'uvegfal_es' : 'uvegfal_pl';
  const tiers = es ? GLASS_ES : GLASS_PL;
  const inst = es ? 11 : 12;
  const tplId = es ? 'tpl_legacy_uvegfal_spanyol' : 'tpl_legacy_uvegfal_lengyel';
  addTemplate({
    id: tplId,
    cat: 'uvegfal',
    name: es ? 'LINE GLASS spanyol prémium üvegfal' : 'SLIDING DOORS lengyel üvegfal',
    subtitle: es ? 'Keret nélküli, elcsúsztatható 10 mm edzett üvegfal – prémium kategória' : 'Keret nélküli, elcsúsztatható 10 mm edzett üvegfal – középkategória',
    sizeLimits: { minWidthCm: 50, minProjectionCm: 50 },
    catalogRef: { productAlias: es ? 'Line Glass / Run 2' : 'Sliding Doors', note: `legacy: templates/uvegfalas/datasheet.py ${es ? 'Spanyol' : 'Lengyel'} (sávos m² ár oldalanként) + editor.py item${es ? 1 : 2}; szerelés ${inst}%` },
    introText: es
      ? 'Meglévő terasz vagy pergola beépítése keret nélküli, síneken csúszó LINE GLASS üvegfalrendszerrel: 1 db {{szelesseg}}×{{magassag}} cm-es és 1 db {{kinyulas}}×{{magassag}} cm-es oldal. A táblák mozgatás közben csatlakoznak egymáshoz; belső biztonsági zár és levehető szilikon profil az alapár része.'
      : 'Meglévő terasz vagy pergola beépítése keret nélküli, síneken csúszó SLIDING DOORS üvegfalrendszerrel: 1 db {{szelesseg}}×{{magassag}} cm-es és 1 db {{kinyulas}}×{{magassag}} cm-es oldal. 10 mm edzett biztonsági üveg, a táblák elhúzás közben csatlakoznak egymáshoz.',
    closingText: 'Szélállóság EN 13561 6. osztály (119 km/h). Garancia az üvegfalrendszerre 3 év. Átfutási idő 30–60 nap. Az árajánlat a helyszíni felmérés után módosulhat.',
    photos: photos(tplId, es
      ? [
          ['uvegfalas', 'image_01.png', 'Keret nélküli, síneken csúszó 10 mm vastag edzett biztonsági üvegfalrendszer.'],
          ['uvegfalas', 'image_02.png', 'Belső zár, alapár része, üvegfalanként 2 db alul.'],
          ['uvegfalas', 'image_03.png', 'Kilincs típusok'],
          ['uvegfalas', 'image_06.jpg'],
        ]
      : [
          ['uvegfalas', 'image_07.jpg', 'SLIDING DOORS: síneken csúszó, keret nélküli üvegtáblák.'],
          ['uvegfalas', 'image_08.jpg'],
          ['uvegfalas', 'image_09.jpg'],
        ]),
    materials: [
      mat({ id: `mat_${p}_a`, name: 'Keret nélküli, elcsúsztatható üvegfalrendszer 10 mm edzett üveggel a szélesség oldalán, profilok RAL színben – 1 db', description: `Szélesség × magasság, sávos m² ár (≤8,5 m²: ${tiers[0].pricePerM2}, ≤13,5 m²: ${tiers[1].pricePerM2}, felette ${tiers[2].pricePerM2} EUR/m²)`, pricingMode: 'tiered_m2', m2Tiers: tiers, dimensionSource: 'front_wall', multiplier: ARK.ARKEPZO_UVEGFAL_RENDSZER, unitLabel: 'm²' }),
      mat({ id: `mat_${p}_b`, name: 'Keret nélküli, elcsúsztatható üvegfalrendszer 10 mm edzett üveggel a kinyúlás oldalán, profilok RAL színben – 1 db', description: 'Kinyúlás × magasság, sávos m² ár', pricingMode: 'tiered_m2', m2Tiers: tiers, dimensionSource: 'side_wall', multiplier: ARK.ARKEPZO_UVEGFAL_RENDSZER, unitLabel: 'm²' }),
      installPct(p, flatTier(inst), { name: 'Üvegfalak szerelése', description: `Üvegfalak ${inst}%-a` }),
    ],
  });
}

// === 8. ZIP ÁRNYÉKOLÓ (önálló) — tábla: árnyékoló szélessége × magassága ==========
{
  const p = 'zip';
  const tplId = 'tpl_legacy_refleksol_zip';
  const tbl = refleksolMatrix(false);
  const common = { pricingMode: 'matrix_cm', matrixTable: tbl, matrixColAxis: 'height', multiplier: ARK.ARKEPZO_REFLEKSOL_120_ZIP, fixedSurcharge: 370 };
  addTemplate({
    id: tplId,
    cat: 'zip',
    name: 'Refleksol 120 ZIP oldalsó árnyékoló',
    subtitle: 'Motoros, szélálló ZIP árnyékoló, Serge 600 naphálóval, Somfy IO motorral – oldalanként',
    sizeLimits: { minWidthCm: 100, maxWidthCm: 700, minProjectionCm: 100, maxProjectionCm: 700, minHeightCm: 100, maxHeightCm: 400 },
    catalogRef: { productAlias: 'Vertica 120 ZIP / Screeny GPZ', note: 'legacy: templates/ZIPes/datasheet.py Refleksol_120_ZIP + editor.py; ár = gyári (szélesség × magasság) + 370; szerelés 12%' },
    introText:
      'Meglévő terasz beépítése oldalsó ZIP árnyékolóval: 1 db {{szelesseg}}×{{magassag}} cm-es és 1 db {{kinyulas}}×{{magassag}} cm-es vertikális árnyékoló, motoros működéssel. A ponyvára hegesztett zipzár miatt a napháló mindig feszes, szúnyoghálóként is működik; szélállóság EN 13561 6. osztály (119 km/h).',
    closingText: 'Garancia: ponyvákra 5 év, motorokra és érzékelőkre 3 év. Átfutási idő 30–60 nap. Az árajánlat a helyszíni felmérés után módosulhat.',
    photos: photos(tplId, [
      ['ZIPes', 'image_01.jpg', 'Szélálló motoros oldalsó ZIP árnyékoló Serge 600 naphálóval és Somfy IO motorral.'],
      ['ZIPes', 'image_02.jpg', 'Az oldalsó zipzáras megvezetés biztosítja a ponyva feszességét és a szúnyogháló funkciót.'],
      ['ZIPes', 'image_03.png'],
      ['ZIPes', 'image_04.png'],
    ]),
    materials: [
      mat({ id: `mat_${p}_a`, name: 'Külön szerelt oldalsó árnyékoló a szélesség oldalára – Refleksol 120 ZIP, Serge 600 ponyva, Somfy IO motor, távirányító – 1 db', description: 'Ár: szélesség × magasság', ...common, matrixRowAxis: 'width' }),
      mat({ id: `mat_${p}_b`, name: 'Külön szerelt oldalsó árnyékoló a kinyúlás oldalára – Refleksol 120 ZIP, Serge 600 ponyva, Somfy IO motor, távirányító – 1 db', description: 'Ár: kinyúlás × magasság', ...common, matrixRowAxis: 'projection' }),
      gift(`mat_${p}_gift_sensor`, 'Szélérzékelő – Somfy IO', 300),
      installPct(p, flatTier(12), { name: 'Árnyékolók szerelése, programozása', description: 'Árnyékolók 12%-a' }),
      smartHome(p),
    ],
  });
}
{
  const p = 'vertica';
  const tplId = 'tpl_legacy_vertica_zip';
  const m = ARK.ARKEPZO_VERTICA_PRIME_ZIP;
  const common = { pricingMode: 'matrix_cm', matrixTable: verticaMatrix(), matrixColAxis: 'height', multiplier: m, extraDiscountPct: 10, fixedSurcharge: 1000 };
  addTemplate({
    id: tplId,
    cat: 'zip',
    name: 'Vertica PRIME ZIP gerendába integrált árnyékoló',
    subtitle: 'Pergola gerendába rejtett motoros ZIP árnyékoló, Soltis 92 textil, Somfy IO – oldalanként',
    sizeLimits: { minWidthCm: 120, maxWidthCm: 600, minProjectionCm: 120, maxProjectionCm: 600, minHeightCm: 140, maxHeightCm: 300 },
    catalogRef: { productAlias: 'KE Vertica PRIME ZIP', note: `legacy: templates/bioklimatikus/datasheet.py OldalfalZaras_Vertica_PRIME_ZIP (Kedry Skylife opció); ár = gyári × ${m} × 0,9 + 1000, szerelés 8%` },
    introText:
      'A Vertica PRIME ZIP a pergola (pl. Kedry Skylife) gerendájába rejtve integrálható prémium motoros ZIP árnyékoló Soltis 92 mikroperforált textillel: 1 db {{szelesseg}}×{{magassag}} cm-es és 1 db {{kinyulas}}×{{magassag}} cm-es oldal. Távirányítóval vagy okostelefonról vezérelhető.',
    closingText: 'Garancia: ponyvákra 5 év, motorokra és érzékelőkre 3 év. Átfutási idő 30–60 nap. Az árajánlat a helyszíni felmérés után módosulhat.',
    photos: photos(tplId, [
      ['bioklimatikus', 'image_14.jpg', 'Gerendába integrált Vertica PRIME ZIP árnyékoló Kedry Skylife pergolán.'],
    ]),
    materials: [
      mat({ id: `mat_${p}_a`, name: 'Felső gerendába integrált oldalsó árnyékoló a szélesség oldalára – Vertica PRIME ZIP, Soltis 92 ponyva, Somfy IO motor – 1 db', description: 'Ár: szélesség × magasság', ...common, matrixRowAxis: 'width' }),
      mat({ id: `mat_${p}_b`, name: 'Felső gerendába integrált oldalsó árnyékoló a kinyúlás oldalára – Vertica PRIME ZIP, Soltis 92 ponyva, Somfy IO motor – 1 db', description: 'Ár: kinyúlás × magasság', ...common, matrixRowAxis: 'projection' }),
      installPct(p, flatTier(8), { name: 'Árnyékolók szerelése, programozása', description: 'Árnyékolók 8%-a' }),
      smartHome(p),
    ],
  });
}

// ---------------------------------------------------------------------------
// Fotók a legacy template.html alapján
//  - sablon szint: a termékhez mutatott összes termékfotó, legacy sorrendben
//  - tétel szint (csak ha a tétel szerepel az ajánlatban): műszaki rajz / alapszínek az
//    alapszerkezeten, színkártya a RAL opción, LED közeli kép a LED opción, ZIP / üvegfal képek
//    az oldalzárási opciókon. Ajándék és szerelés: nincs fotó.
// ---------------------------------------------------------------------------
const L = (cat, file, caption = '') => [cat, file, caption];
const BIO = 'bioklimatikus', PON = 'elhuzhato_ponyvas', FESZ = 'feszitett_vasznas', TET = 'feszitett_vasznas_tetore';
const POLI = 'polikarbonatos', UT = 'uvegtetos', UF = 'uvegfalas', ZIPC = 'ZIPes', C = '_cache';
const ZIP_PHOTOS = [L(C, '_zip_photo.png', 'Oldalsó ZIP árnyékoló'), L(ZIPC, 'image_03.png', 'Refleksol 120 ZIP kazetta')];
const GLASS_PHOTOS = [L(C, '_uveg_photo.jpg', 'Keret nélküli, elcsúsztatható üvegfalrendszer'), L(C, '_uveg_rails.png', 'Sínrendszer (3–5 sínes kivitel)')];
const BIO_LED = [L(BIO, 'image_12.png', 'LED világítás')];

const TEMPLATE_PHOTOS = {
  tpl_legacy_sb400: [L(BIO, 'image_01.jpg', 'Alumínium váz, 0–120° között elforgatható lamellák, oszlopokban rejtett esővíz-elvezetés.'), L(BIO, 'image_02.jpg', 'A lamellák állása szabályozza a bejutó fényt; a motor a pergola tetején látható, kérésre a gerendába rejtve.'), L(BIO, 'image_03.jpg')],
  tpl_legacy_seesky_bio: [L(BIO, 'image_09.png', 'Hőszigetelt lamellák, motor rejtve a gerendákban.'), L(BIO, 'image_10.png', 'A lamellák állása szabályozza a bejutó fényt és a természetes légáramlást.')],
  tpl_legacy_kedry_skylife: [L(BIO, 'image_13.png', 'A lamellák elhúzás közben elforognak – rejtett motorok, csavarok és fali konzolok.'), L(BIO, 'image_14.jpg')],
  tpl_legacy_pergola_v_ziip: [L(FESZ, 'image_01.png', 'ZIP-megvezetés: a ponyva mindig feszes, ráncmentes.'), L(FESZ, 'image_02.png'), L(FESZ, 'image_03.png')],
  tpl_legacy_hydra: [L(FESZ, 'image_05.png', 'Kazettába zárt, feszített ponyva víztaszító szövettel.'), L(FESZ, 'image_06.png'), L(FESZ, 'image_07.png')],
  tpl_legacy_a100_lux: [L(PON, 'image_01.jpg', 'Elhúzható PVC ponyvás pergola előtetővel.'), L(PON, 'image_02.png')],
  tpl_legacy_keplan: [L(PON, 'image_05.jpg', 'Sík tetejű, elhúzható-összecsukható PVC ponyva.'), L(PON, 'image_06.png'), L(PON, 'image_07.png')],
  tpl_legacy_isola_2a: [L(PON, 'image_10.jpg', 'Prémium, sík tetejű elhúzható ponyvás pergola rejtett motorral.'), L(PON, 'image_11.jpg')],
  tpl_legacy_veranda_tens: [L(TET, 'image_01.png', 'Meglévő szerkezetre, tető fölé vagy alá szerelhető elhúzható vászon.'), L(TET, 'image_02.png'), L(TET, 'image_03.png')],
  tpl_legacy_veranda_v_zip: [L(TET, 'image_05.png', 'ZIP-megvezetésű feszített vászon meglévő szerkezetre.'), L(TET, 'image_06.png')],
  tpl_legacy_polifix: [
    L(POLI, 'image_01.jpg', '16 mm opál üregkamrás polikarbonát tető, 10 év garancia UV és jégeső ellen.'), L(POLI, 'image_02.png'), L(POLI, 'image_03.png'), L(POLI, 'image_04.png'),
    L(POLI, 'image_06.jpg', 'Opcionálisan fix polikarbonát oldalfallal is kérhető.'), L(POLI, 'image_07.jpg'),
    L(POLI, 'image_08.jpg', 'Opál színű polikarbonát'), L(POLI, 'image_09.png', 'Víztiszta polikarbonát'),
  ],
  tpl_legacy_glassfix: [
    L(UT, 'image_01.png', '10 mm edzett-laminált biztonsági üvegtető, belső csatornás esővíz-elvezetés.'), L(UT, 'image_02.png'), L(UT, 'image_03.png'),
    L(UT, 'image_05.jpg', 'Opcionálisan fix polikarbonát oldalfallal is kérhető.'), L(UT, 'image_06.jpg'), L(UT, 'image_07.jpg'), L(UT, 'image_08.jpg'),
  ],
  tpl_legacy_uvegfal_spanyol: [L(UF, 'image_01.png', 'LINE GLASS / RUN 2 – keret nélküli, síneken csúszó üvegfal.'), L(UF, 'image_02.png', 'Belső zár, alapár része, üvegfalanként 2 db alul'), L(UF, 'image_03.png', 'Kilincs típusok'), L(UF, 'image_04.jpg'), L(UF, 'image_05.jpg'), L(UF, 'image_06.jpg')],
  tpl_legacy_uvegfal_lengyel: [L(UF, 'image_07.jpg', 'SLIDING DOORS – keret nélküli, síneken csúszó üvegfal.'), L(UF, 'image_08.jpg'), L(UF, 'image_09.jpg')],
  tpl_legacy_refleksol_zip: [L(ZIPC, 'image_01.jpg', 'Szélálló (EN 13561 6. osztály) motoros ZIP árnyékoló, Serge 600 napháló.'), L(ZIPC, 'image_02.jpg', 'Zipzáras oldalsó megvezetés – szúnyogháló funkcióval.'), L(ZIPC, 'image_03.png'), L(ZIPC, 'image_04.png'), L(ZIPC, 'image_05.png')],
  tpl_legacy_vertica_zip: [L(BIO, 'image_14.jpg', 'Gerendába integrált Vertica PRIME ZIP árnyékoló (Kedry Skylife).')],
};

// [tétel-id minta, fotók]
const ITEM_PHOTOS = {
  tpl_legacy_sb400: [[/_ral_/, [4, 5, 6, 7, 8].map((n) => L(BIO, `image_0${n}.png`, n === 4 ? 'Választható színek (25 alapszín)' : '')).concat([L(C, '_ral_25.png')])], [/_(led|spot)$/, BIO_LED]],
  tpl_legacy_seesky_bio: [[/_ral_/, [L(BIO, 'image_11.png', 'Választható színek'), L(C, '_ral_5.png')]], [/_(led|rgb|lamella_led)$/, BIO_LED]],
  tpl_legacy_kedry_skylife: [[/^_kedry_(wall|free)$/, [L(BIO, 'image_15.png', 'Műszaki rajz')]], [/_ral_/, [L(BIO, 'image_16.png', 'Választható színek'), L(C, '_ral_5.png')]], [/_(led|rgb)$/, BIO_LED], [/_zip_/, [L(BIO, 'image_14.jpg', 'Gerendába integrált Vertica PRIME ZIP árnyékoló')]]],
  tpl_legacy_pergola_v_ziip: [[/_base$/, [L(FESZ, 'image_04.png', 'Alapszínek')]]],
  tpl_legacy_hydra: [[/_base(_2m)?$/, [L(FESZ, 'image_08.png', 'Alapszínek')]]],
  tpl_legacy_a100_lux: [[/_base$/, [L(PON, 'image_03.png', 'Műszaki rajz'), L(PON, 'image_04.png', 'Alapszínek')]]],
  tpl_legacy_keplan: [[/^_keplan_(wall|free)$/, [L(PON, 'image_08.png', 'Műszaki rajz'), L(PON, 'image_09.png', 'Alapszínek')]]],
  tpl_legacy_isola_2a: [[/^_isola_(wall|free)(_2m)?$/, [L(PON, 'image_12.png', 'Műszaki rajz'), L(PON, 'image_13.png', 'Alapszínek')]]],
  tpl_legacy_veranda_tens: [[/_base$/, [L(TET, 'image_04.png', 'Alapszínek')]]],
  tpl_legacy_veranda_v_zip: [[/_base(_multi)?$/, [L(TET, 'image_07.png', 'Alapszínek')]]],
  tpl_legacy_polifix: [
    [/_base_/, [L(POLI, 'image_05.png', 'Alapszínek')]],
    [/_ral_/, [L(POLI, 'image_05.png', 'Alapszínek – egyedi RAL szín felár ellenében')]],
    [/_glass_/, [L(POLI, 'image_10.jpg', 'Profil metszet'), L(POLI, 'image_11.jpg'), L(POLI, 'image_12.jpg'), L(POLI, 'image_13.jpg'), L(C, '_uveg_rails.png', 'Sínrendszer')]],
    [/_zip_/, [L(POLI, 'image_14.png', 'Oldalsó ZIP árnyékoló'), L(ZIPC, 'image_03.png')]],
  ],
  tpl_legacy_glassfix: [
    [/_base_/, [L(UT, 'image_09.png', 'Alapszínek')]],
    [/_veranda$/, [L(UT, 'image_04.png', 'Veranda tetőárnyékoló')]],
    [/_glass_/, [L(UT, 'image_10.jpg', 'Keret nélküli üvegfal'), L(UT, 'image_11.jpg'), L(UT, 'image_12.jpg'), L(UT, 'image_13.jpg'), L(C, '_uveg_rails.png', 'Sínrendszer')]],
    [/_zip_/, [L(UT, 'image_14.png', 'Oldalsó ZIP árnyékoló'), L(ZIPC, 'image_03.png')]],
  ],
  tpl_legacy_refleksol_zip: [[/_(a|b)$/, [L(ZIPC, 'image_04.png', 'Kazetta méretek')]]],
  tpl_legacy_vertica_zip: [],
};
// Közös szabály: oldalsó ZIP / üvegfal opciók (ha a sablon nem ad sajátot)
const COMMON_ITEM_PHOTOS = [[/_zip_/, ZIP_PHOTOS], [/_glass_/, GLASS_PHOTOS]];

function itemPhotos(tplId, m) {
  if (m.itemRole === 'gift' || m.pricingMode === 'percentage' || /_install/.test(m.id)) return [];
  const rules = [...(ITEM_PHOTOS[tplId] || []), ...COMMON_ITEM_PHOTOS];
  const hit = rules.find(([re]) => re.test(m.id.replace(/^mat_/, '_')));
  if (!hit) return [];
  return photos(`tpl_legacy_i_${m.id.replace(/^mat_/, '')}`, hit[1]).map((ph) => ({ ...ph, id: ph.id.replace('sphoto_legacy_i_', 'iphoto_legacy_') }));
}

for (const t of templates) {
  if (TEMPLATE_PHOTOS[t.id]) t.photos = photos(t.id, TEMPLATE_PHOTOS[t.id]);
  for (const m of t.materials) m.photos = itemPhotos(t.id, m);
}

// ---------------------------------------------------------------------------
// Adatbázis frissítése
// ---------------------------------------------------------------------------
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
db.categories = Array.isArray(db.categories) ? db.categories : [];
db.templates = Array.isArray(db.templates) ? db.templates : [];

const norm = (s) => String(s || '').trim().toLowerCase();
const catIdByKey = {};
const catLog = [];
for (const def of CATEGORY_DEFS) {
  let cat = db.categories.find((c) => norm(c.name) === norm(def.name));
  if (!cat) {
    cat = {
      id: def.id,
      name: def.name,
      shortName: def.name,
      description: def.description,
      questionPrompt: `Kér az ügyfél ${def.name.toLowerCase()} terméket?`,
      categoryType: 'main_structure',
      allowMultipleTemplates: true,
      order: def.order,
      menuId: def.menuId,
    };
    db.categories.push(cat);
    catLog.push(`+ ${def.name} (${def.menuId})`);
  } else if (cat.menuId !== def.menuId) {
    catLog.push(`~ ${def.name}: ${cat.menuId} → ${def.menuId}`);
    cat.menuId = def.menuId;
  } else {
    catLog.push(`= ${def.name}`);
  }
  cat.imageUrl = def.imageUrl;
  catIdByKey[def.key] = cat.id;
}
for (const [name, imageUrl] of Object.entries(CATEGORY_IMAGES_ONLY)) {
  const cat = db.categories.find((c) => norm(c.name) === norm(name));
  if (cat) {
    cat.imageUrl = imageUrl;
    catLog.push(`= ${name} (kép)`);
  }
}

const previous = new Map(db.templates.map((t) => [t.id, t]));
const kept = db.templates.filter((t) => !String(t.id).startsWith('tpl_legacy_'));
const newIds = new Set(templates.map((t) => t.id));
const removed = db.templates.filter((t) => String(t.id).startsWith('tpl_legacy_') && !newIds.has(t.id)).map((t) => t.id);
const orderByCat = {};
const built = templates.map((t) => {
  const categoryId = catIdByKey[t.cat];
  orderByCat[categoryId] = (orderByCat[categoryId] || 0) + 1;
  const prev = previous.get(t.id);
  const ids = new Set();
  for (const m of t.materials) {
    if (ids.has(m.id)) throw new Error(`Duplikált material id: ${m.id} (${t.id})`);
    ids.add(m.id);
  }
  const tpl = {
    id: t.id,
    categoryId,
    name: t.name,
    subtitle: t.subtitle,
    enabled: true,
    status: 'active',
    order: t.order ?? orderByCat[categoryId],
    sizeLimits: t.sizeLimits,
    catalogRef: { pdfFile: '', pages: '', ...t.catalogRef },
    pricingOverride: { ...NO_PROFIT_OVERRIDE },
    introText: t.introText,
    closingText: t.closingText,
    textBlocks: [],
    photos: t.photos,
    materials: t.materials,
    createdAt: prev?.createdAt || NOW,
    updatedAt: NOW,
  };
  if (t.moduleSplit) tpl.moduleSplit = t.moduleSplit;
  return tpl;
});
// Az extrák a régi rendszerben saját szereléssel szerepeltek: a szerelés % alapjába nem számítanak,
// akkor sem, ha az árazóban bepipálják (ilyenkor alaptétellé válnak)
for (const t of built) {
  for (const m of t.materials) {
    if (m.itemRole === 'optional') m.excludeFromPercentBase = true;
  }
}
db.templates = [...kept, ...built];
// A színkártya-képek helyett valódi színválaszték (kód + mintaszín)
applyColorCharts({ templates: built });

console.log('Kategóriák:\n  ' + catLog.join('\n  '));
console.log(`Sablonok: ${built.length} legacy (+${kept.length} meglévő megtartva)`);
if (removed.length) console.log(`Törölt elavult legacy sablonok: ${removed.join(', ')}`);
for (const t of built) {
  const cat = db.categories.find((c) => c.id === t.categoryId);
  const withPh = t.materials.filter((m) => m.photos.length);
  console.log(`  - [${cat?.name}] ${t.name} (${t.materials.length} tétel, ${t.photos.length} sablonfotó, ${withPh.reduce((s, m) => s + m.photos.length, 0)} tételfotó ${withPh.length} tételen)`);
}

if (DRY_RUN) {
  console.log('\n--dry-run: data/db.json nem módosult');
} else {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_PATH);
  console.log(`\n✓ data/db.json frissítve (${(fs.statSync(DB_PATH).size / 1024).toFixed(0)} KB)`);
}
