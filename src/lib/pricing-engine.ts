import { replaceTemplateVariables, VariableReplacementContext } from './constants';
import {
  CustomMatrixTable,
  DimensionSource,
  M2PriceTier,
  MountType,
  QuoteDocumentBlock,
  QuoteTableRow,
  QuoteTemplate,
  SystemConfig,
  TemplateMaterialItem,
} from './types';

export function roundHuf(eur: number, rate: number): number {
  return Math.round((eur * rate) / 1000) * 1000;
}

export function computeDimensionValue(
  source: DimensionSource,
  widthCm: number,
  projectionCm: number,
  heightCm: number
): { value: number; unit: string; formatted: string } {
  const wM = Math.max(0.1, (Number(widthCm) || 0) / 100);
  const pM = Math.max(0.1, (Number(projectionCm) || 0) / 100);
  const hM = Math.max(0.1, (Number(heightCm) || 0) / 100);

  switch (source) {
    case 'roof': {
      const m2 = wM * pM;
      return { value: m2, unit: 'm²', formatted: `${m2.toFixed(1)} m²` };
    }
    case 'front_wall': {
      const m2 = wM * hM;
      return { value: m2, unit: 'm²', formatted: `${m2.toFixed(1)} m²` };
    }
    case 'side_wall': {
      const m2 = pM * hM;
      return { value: m2, unit: 'm²', formatted: `${m2.toFixed(1)} m²` };
    }
    case 'both_walls': {
      const m2 = (wM + pM) * hM;
      return { value: m2, unit: 'm²', formatted: `${m2.toFixed(1)} m²` };
    }
    case 'all_walls': {
      const m2 = 2 * (wM + pM) * hM;
      return { value: m2, unit: 'm²', formatted: `${m2.toFixed(1)} m²` };
    }
    case 'width_lm': {
      return { value: wM, unit: 'fm', formatted: `${wM.toFixed(2)} fm` };
    }
    case 'proj_lm': {
      return { value: pM, unit: 'fm', formatted: `${pM.toFixed(2)} fm` };
    }
    case 'height_lm': {
      return { value: hM, unit: 'fm', formatted: `${hM.toFixed(2)} fm` };
    }
    case 'front_side_lm': {
      const fm = wM + pM;
      return { value: fm, unit: 'fm', formatted: `${fm.toFixed(2)} fm` };
    }
    case 'perimeter_lm': {
      const fm = 2 * (wM + pM);
      return { value: fm, unit: 'fm', formatted: `${fm.toFixed(2)} fm` };
    }
    default: {
      const m2 = wM * pM;
      return { value: m2, unit: 'm²', formatted: `${m2.toFixed(1)} m²` };
    }
  }
}

export function createDefaultMaterialAlgorithm(
  overrides?: Partial<TemplateMaterialItem>
): TemplateMaterialItem {
  return {
    id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    description: '',
    itemRole: 'base',
    defaultSelected: true,
    pricingMode: 'per_m2',
    currency: 'EUR',
    dimensionSource: 'roof',
    basePrice: 1500,
    unitPrice: 350,
    defaultQuantity: 1,
    unitLabel: 'db',
    m2Tiers: [
      { maxM2: 15, pricePerM2: 400 },
      { maxM2: 25, pricePerM2: 360 },
      { maxM2: 999, pricePerM2: 320 },
    ],
    matrixTable: {
      rowLabel: 'Kinyúlás (cm)',
      colLabel: 'Szélesség (cm)',
      rows: [250, 300, 350, 400],
      cols: [300, 400, 500, 600],
      values: {
        '250': { '300': 2200, '400': 2600, '500': 3100, '600': 3600 },
        '300': { '300': 2500, '400': 2950, '500': 3500, '600': 4100 },
        '350': { '300': 2800, '400': 3300, '500': 3900, '600': 4600 },
        '400': { '300': 3100, '400': 3700, '500': 4350, '600': 5100 },
      },
    },
    percentageRate: 10,
    minPrice: 300,
    multiplier: 1,
    extraDiscountPct: 0,
    fixedSurcharge: 0,
    listPriceMultiplier: 1.25,
    defaultNote: '',
    photos: [],
    ...overrides,
  };
}

function lookupTieredM2Price(
  m2: number,
  tiers: M2PriceTier[]
): { total: number; rateUsed: number } {
  if (!tiers || tiers.length === 0) {
    return { total: m2 * 350, rateUsed: 350 };
  }
  const sorted = [...tiers].sort((a, b) => a.maxM2 - b.maxM2);
  for (const tier of sorted) {
    if (m2 <= tier.maxM2) {
      const rate = Math.max(1, Number(tier.pricePerM2) || 350);
      return { total: m2 * rate, rateUsed: rate };
    }
  }
  const last = sorted[sorted.length - 1];
  const fallbackRate = Math.max(1, Number(last?.pricePerM2) || 350);
  return { total: m2 * fallbackRate, rateUsed: fallbackRate };
}

function lookupCustomMatrixPrice(
  table: CustomMatrixTable | undefined,
  rowCm: number,
  colCm: number
): { price: number; matchedRow: number; matchedCol: number } {
  if (!table || !table.rows?.length || !table.cols?.length) {
    return { price: 0, matchedRow: rowCm, matchedCol: colCm };
  }
  const sortedRows = [...table.rows].sort((a, b) => a - b);
  const sortedCols = [...table.cols].sort((a, b) => a - b);

  let matchedRow = sortedRows[sortedRows.length - 1];
  for (const r of sortedRows) {
    if (rowCm <= r) {
      matchedRow = r;
      break;
    }
  }

  let matchedCol = sortedCols[sortedCols.length - 1];
  for (const c of sortedCols) {
    if (colCm <= c) {
      matchedCol = c;
      break;
    }
  }

  const val = table.values?.[String(matchedRow)]?.[String(matchedCol)];
  return {
    price: Math.max(0, Number(val) || 0),
    matchedRow,
    matchedCol,
  };
}

function applyModifiers(rawAmount: number, item: TemplateMaterialItem): number {
  const mult =
    item.multiplier !== undefined && item.multiplier > 0 ? item.multiplier : 1;
  const discPct = Math.min(95, Math.max(0, Number(item.extraDiscountPct) || 0));
  const surcharge = Number(item.fixedSurcharge) || 0;
  const afterMult = rawAmount * mult;
  const afterDisc = afterMult * (1 - discPct / 100);
  const total = afterDisc + surcharge;
  const minP = Math.max(0, Number(item.minPrice) || 0);
  return Math.max(1, minP, Math.round(total));
}

export interface CalculationContext {
  widthCm: number;
  projectionCm: number;
  heightCm: number;
  mountType: MountType;
  eurHufRate: number;
}

/**
 * Kiszámolja egy sablon összes termékét/anyagát kizárólag a beállított algoritmusok alapján,
 * és visszaadja a táblázatsorokat + összesítéseket. Soha nem enged 0 EUR árat (kivéve Ajándék kedvezményes ár).
 */
export function calculateTemplateRows(
  template: QuoteTemplate,
  ctx: CalculationContext,
  selectedMaterialIds?: string[]
): {
  rows: QuoteTableRow[];
  totalBaseEur: number;
  totalBaseHuf: number;
} {
  const { widthCm, projectionCm, heightCm, eurHufRate } = ctx;
  const rate = Math.max(1, Number(eurHufRate) || 400);

  // Ha egy sablonban véletlenül csak 'percentage' tétel lenne alaptétel nélkül,
  // az első tételt automatikusan m² alapú algoritmusként kezeljük, hogy mindig legyen valódi alapár!
  const hasNonPercentageBase = template.materials.some(
    (m) => m.pricingMode !== 'percentage' && m.itemRole === 'base'
  );

  const normalizedMaterials: TemplateMaterialItem[] = template.materials.map(
    (m, idx) => {
      if (!hasNonPercentageBase && idx === 0 && m.pricingMode === 'percentage') {
        return {
          ...m,
          pricingMode: 'per_m2',
          unitPrice: Math.max(1, Number(m.unitPrice) || 350),
        };
      }
      return m;
    }
  );

  const nonPercentageItems = normalizedMaterials.filter(
    (m) => m.pricingMode !== 'percentage'
  );
  const percentageItems = normalizedMaterials.filter(
    (m) => m.pricingMode === 'percentage'
  );

  const rowsById: Record<string, QuoteTableRow> = {};
  let runningBaseSubtotalEur = 0;

  // 1. Először a nem-százalékos tételeket számoljuk ki az algoritmusuk alapján
  for (const item of nonPercentageItems) {
    const isIncluded = selectedMaterialIds
      ? selectedMaterialIds.includes(item.id)
      : item.defaultSelected !== false;

    const qty = Math.max(1, Number(item.defaultQuantity) || 1);
    const dim = computeDimensionValue(
      item.dimensionSource || 'roof',
      widthCm,
      projectionCm,
      heightCm
    );
    const curr = item.currency || 'EUR';

    let rawPrice = 0;
    let quantityLabel = `${qty} ${item.unitLabel || 'db'}`;
    let formulaSummary = '';

    switch (item.pricingMode) {
      case 'fixed': {
        const unitBase = Math.max(
          1,
          Number(item.basePrice) || Number(item.unitPrice) || 1500
        );
        rawPrice = unitBase * qty;
        quantityLabel = `${qty} ${item.unitLabel || 'db'}`;
        formulaSummary = `Fix darabár: ${qty} ${item.unitLabel || 'db'} × ${unitBase} ${curr}`;
        break;
      }
      case 'per_m2': {
        const uPrice = Math.max(1, Number(item.unitPrice) || 350);
        rawPrice = dim.value * uPrice * qty;
        quantityLabel =
          qty > 1 ? `${qty} × ${dim.formatted}` : dim.formatted;
        formulaSummary = `m² algoritmus: ${dim.formatted} × ${uPrice} ${curr}/m²${
          qty > 1 ? ` × ${qty} db` : ''
        }`;
        break;
      }
      case 'tiered_m2': {
        const tiered = lookupTieredM2Price(dim.value, item.m2Tiers || []);
        rawPrice = tiered.total * qty;
        quantityLabel =
          qty > 1 ? `${qty} × ${dim.formatted}` : dim.formatted;
        formulaSummary = `Sávos m² algoritmus: ${dim.formatted} × ${tiered.rateUsed} ${curr}/m²`;
        break;
      }
      case 'base_plus_m2': {
        const bPrice = Math.max(0, Number(item.basePrice) || 1000);
        const uPrice = Math.max(1, Number(item.unitPrice) || 220);
        rawPrice = (bPrice + dim.value * uPrice) * qty;
        quantityLabel = `${dim.formatted}`;
        formulaSummary = `Alap + m² algoritmus: ${bPrice} ${curr} + (${dim.formatted} × ${uPrice} ${curr}/m²)`;
        break;
      }
      case 'per_lm': {
        const uPrice = Math.max(1, Number(item.unitPrice) || 180);
        rawPrice = dim.value * uPrice * qty;
        quantityLabel =
          qty > 1 ? `${qty} × ${dim.formatted}` : dim.formatted;
        formulaSummary = `Folyóméter algoritmus: ${dim.formatted} × ${uPrice} ${curr}/fm${
          qty > 1 ? ` × ${qty} db` : ''
        }`;
        break;
      }
      case 'base_plus_lm': {
        const bPrice = Math.max(0, Number(item.basePrice) || 600);
        const uPrice = Math.max(1, Number(item.unitPrice) || 150);
        rawPrice = (bPrice + dim.value * uPrice) * qty;
        quantityLabel = `${dim.formatted}`;
        formulaSummary = `Alap + fm algoritmus: ${bPrice} ${curr} + (${dim.formatted} × ${uPrice} ${curr}/fm)`;
        break;
      }
      case 'matrix_cm': {
        const matrixLookup = lookupCustomMatrixPrice(
          item.matrixTable,
          projectionCm,
          widthCm
        );
        const fallbackM2Price = Math.round(
          dim.value * Math.max(1, Number(item.unitPrice) || 350)
        );
        const effectiveMatrixPrice =
          matrixLookup.price > 0 ? matrixLookup.price : fallbackM2Price;
        rawPrice = effectiveMatrixPrice * qty;
        quantityLabel = `${widthCm}×${projectionCm} cm (${qty} db)`;
        formulaSummary = `Mérettábla algoritmus (${matrixLookup.matchedCol}×${matrixLookup.matchedRow} cm): ${effectiveMatrixPrice} ${curr} × ${qty} db`;
        break;
      }
      default: {
        const uPrice = Math.max(1, Number(item.unitPrice) || 350);
        rawPrice = dim.value * uPrice * qty;
        quantityLabel = dim.formatted;
        formulaSummary = `m² algoritmus: ${dim.formatted} × ${uPrice} ${curr}/m²`;
      }
    }

    const modifiedPrice = applyModifiers(rawPrice, item);
    const priceInEur =
      item.currency === 'HUF'
        ? Math.max(1, Math.round(modifiedPrice / rate))
        : Math.max(1, modifiedPrice);

    const listMult =
      item.listPriceMultiplier && item.listPriceMultiplier > 0
        ? item.listPriceMultiplier
        : 1.25;
    const listPriceEur = Math.max(
      priceInEur,
      Math.round(priceInEur * listMult)
    );

    const discountPriceEur = item.itemRole === 'gift' ? 0 : priceInEur;

    if (isIncluded && item.itemRole === 'base') {
      runningBaseSubtotalEur += discountPriceEur;
    }

    rowsById[item.id] = {
      id: `row_${item.id}_${Math.random().toString(36).slice(2, 6)}`,
      materialId: item.id,
      name: item.name,
      description: item.description || '',
      quantityLabel,
      listPriceEur,
      discountPriceEur,
      formulaSummary,
      currency: item.currency || 'EUR',
      itemRole: item.itemRole || 'base',
      included: isIncluded,
      note:
        item.defaultNote !== undefined
          ? item.defaultNote
          : item.itemRole === 'gift'
          ? 'Ajándék'
          : item.itemRole === 'optional'
          ? 'Opció'
          : '',
      photos: (item.photos || []).map((p) => ({ ...p })),
      algorithm: JSON.parse(JSON.stringify(item)),
    };
  }

  // 2. Most a százalékos tételeket (pl. Szerelési munkadíj) számoljuk ki az alaptételek összegéből
  for (const item of percentageItems) {
    const isIncluded = selectedMaterialIds
      ? selectedMaterialIds.includes(item.id)
      : item.defaultSelected !== false;

    let pct = Math.max(1, Number(item.percentageRate) || 10);
    if (item.percentageTiers && item.percentageTiers.length > 0) {
      const sorted = [...item.percentageTiers].sort(
        (a, b) => a.maxAmount - b.maxAmount
      );
      let matched = sorted[sorted.length - 1].percent;
      for (const t of sorted) {
        if (runningBaseSubtotalEur <= t.maxAmount) {
          matched = t.percent;
          break;
        }
      }
      pct = Math.max(1, matched);
    }

    const baseForPct =
      runningBaseSubtotalEur > 0
        ? runningBaseSubtotalEur
        : Math.round(
            computeDimensionValue('roof', widthCm, projectionCm, heightCm)
              .value * 350
          );
    const rawEur = Math.round(baseForPct * (pct / 100));
    const minEur =
      item.currency === 'HUF'
        ? Math.round(Math.max(1, Number(item.minPrice) || 80000) / rate)
        : Math.max(1, Number(item.minPrice) || 250);
    const finalEur = Math.max(
      1,
      minEur,
      rawEur + (Number(item.fixedSurcharge) || 0)
    );
    const discountPriceEur = item.itemRole === 'gift' ? 0 : finalEur;

    if (isIncluded && item.itemRole === 'base') {
      runningBaseSubtotalEur += discountPriceEur;
    }

    const listMult =
      item.listPriceMultiplier && item.listPriceMultiplier > 0
        ? item.listPriceMultiplier
        : 1.25;

    rowsById[item.id] = {
      id: `row_${item.id}_${Math.random().toString(36).slice(2, 6)}`,
      materialId: item.id,
      name: item.name,
      description: item.description || '',
      quantityLabel: `${pct}%`,
      listPriceEur: Math.max(finalEur, Math.round(finalEur * listMult)),
      discountPriceEur,
      formulaSummary: `Százalékos algoritmus: alaptételek ${pct}%-a (min. ${minEur} EUR)`,
      currency: 'EUR',
      itemRole: item.itemRole || 'base',
      included: isIncluded,
      note: item.defaultNote || '',
      photos: (item.photos || []).map((p) => ({ ...p })),
      algorithm: JSON.parse(JSON.stringify(item)),
    };
  }

  // Tartjuk az eredeti sorrendet
  const orderedRows: QuoteTableRow[] = normalizedMaterials
    .map((m) => rowsById[m.id])
    .filter(Boolean);

  const totalBaseEur = orderedRows
    .filter((r) => r.included && r.itemRole === 'base')
    .reduce((sum, r) => sum + (Number(r.discountPriceEur) || 0), 0);

  const totalBaseHuf = roundHuf(totalBaseEur, rate);

  return {
    rows: orderedRows,
    totalBaseEur,
    totalBaseHuf,
  };
}

/**
 * Egyetlen sablonból elkészít egy teljes, szerkeszthető QuoteDocumentBlock szekciót
 */
export function buildEditableBlockFromTemplate(
  template: QuoteTemplate,
  indexNumber: number,
  ctx: CalculationContext & VariableReplacementContext,
  config: SystemConfig,
  selectedMaterialIds?: string[]
): QuoteDocumentBlock {
  const calc = calculateTemplateRows(template, ctx, selectedMaterialIds);

  const varCtx: VariableReplacementContext = {
    customerName: ctx.customerName,
    greetingName: ctx.greetingName,
    city: ctx.city,
    widthCm: ctx.widthCm,
    projectionCm: ctx.projectionCm,
    heightCm: ctx.heightCm,
    mountType: ctx.mountType,
    eurHufRate: ctx.eurHufRate,
    deliveryFeeHuf: ctx.deliveryFeeHuf,
  };

  // Sablon fotók szövegdobozainak behelyettesítése
  const resolvedPhotos = (template.photos || []).map((p) => ({
    ...p,
    id: p.id || `photo_${Math.random().toString(36).slice(2, 8)}`,
    titleAbove: replaceTemplateVariables(p.titleAbove || '', varCtx),
    captionBelow: replaceTemplateVariables(p.captionBelow || '', varCtx),
  }));

  // Ha a sablonban külön szövegdobozok (textBlocks) is vannak, hozzáfűzzük a bevezető/záró szövegekhez
  const beforeTexts = (template.textBlocks || [])
    .filter((tb) => tb.position === 'before_photos' || tb.position === 'before_table')
    .map((tb) =>
      replaceTemplateVariables(
        tb.title ? `${tb.title}\n${tb.content}` : tb.content,
        varCtx
      )
    )
    .filter(Boolean);

  const afterTexts = (template.textBlocks || [])
    .filter((tb) => tb.position === 'after_table')
    .map((tb) =>
      replaceTemplateVariables(
        tb.title ? `${tb.title}\n${tb.content}` : tb.content,
        varCtx
      )
    )
    .filter(Boolean);

  const introCombined = [
    replaceTemplateVariables(template.introText, varCtx),
    ...beforeTexts,
  ]
    .filter(Boolean)
    .join('\n\n');

  const closingCombined = [
    replaceTemplateVariables(template.closingText, varCtx),
    ...afterTexts,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    id: `blk_tpl_${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'template_section',
    templateId: template.id,
    categoryId: template.categoryId,
    sectionTitle: `${indexNumber}. ${template.name} (${ctx.widthCm}×${ctx.projectionCm}×${ctx.heightCm} cm — ${ctx.mountType})`,
    sectionSubtitle: replaceTemplateVariables(template.subtitle || '', varCtx),
    sectionIntroText: introCombined,
    sectionPhotos: resolvedPhotos,
    tableTitle: `${template.name} — Részletes árkalkuláció (${ctx.widthCm}×${ctx.projectionCm} cm)`,
    tableHeaders: [
      'Megnevezés / Anyag / Műszaki tartalom',
      'Mennyiség / Méret',
      'Listaár (EUR)',
      `Kedvezményes ár (${config.defaultDiscountLabel || '-20%'})`,
    ],
    rows: calc.rows.map((r) => ({
      ...r,
      name: replaceTemplateVariables(r.name, varCtx),
      description: replaceTemplateVariables(r.description || '', varCtx),
      photos: (r.photos || []).map((rp) => ({
        ...rp,
        captionBelow: replaceTemplateVariables(rp.captionBelow || '', varCtx),
      })),
    })),
    autoCalculateTotals: true,
    customTotalBaseEur: calc.totalBaseEur,
    customTotalBaseHuf: calc.totalBaseHuf,
    sectionClosingText: closingCombined,
  };
}

/**
 * Felépíti a teljes, blokkosan szerkeszthető PDF dokumentumot a végigvezetett árazó (Wizard)
 * adatai alapján.
 */
export function buildFullQuoteDocumentBlocks(params: {
  customerName: string;
  greetingName: string;
  city: string;
  inquiryNotes?: string;
  widthCm: number;
  projectionCm: number;
  heightCm: number;
  mountType: MountType;
  eurHufRate: number;
  deliveryFeeHuf: number;
  selectedTemplates: QuoteTemplate[];
  selectedMaterialsByTemplate?: Record<string, string[]>;
  config: SystemConfig;
}): {
  blocks: QuoteDocumentBlock[];
  primaryTotalEur: number;
  primaryTotalHuf: number;
} {
  const {
    customerName,
    greetingName,
    city,
    widthCm,
    projectionCm,
    heightCm,
    mountType,
    eurHufRate,
    deliveryFeeHuf,
    selectedTemplates,
    selectedMaterialsByTemplate,
    config,
  } = params;

  const varCtx: VariableReplacementContext = {
    customerName,
    greetingName: greetingName || customerName,
    city,
    widthCm,
    projectionCm,
    heightCm,
    mountType,
    eurHufRate,
    deliveryFeeHuf,
  };

  const blocks: QuoteDocumentBlock[] = [];

  // 1. Megszólítás és Bevezető Szövegdoboz Blokk (automatikus név- és méret-behelyettesítéssel)
  const greetingLine = replaceTemplateVariables(
    config.defaultGreetingTemplate || 'Kedves {{megszolitas}}!',
    varCtx
  );
  const introBody = replaceTemplateVariables(
    config.defaultIntroTemplate ||
      'Örömmel fogadtuk megkeresését! Kérésének megfelelően küldjük személyre szabott árajánlatunkat ({{meret_m}} / {{meret}}, {{beepites}}).',
    varCtx
  );

  blocks.push({
    id: `blk_intro_${Date.now()}`,
    type: 'text_box',
    title: greetingLine,
    content: introBody,
    textStyle: 'greeting',
    bold: false,
    align: 'left',
  });

  // 2. Kiválasztott Sablonok és Termékek blokkjai
  let primaryTotalEur = 0;
  let primaryTotalHuf = 0;

  selectedTemplates.forEach((tpl, idx) => {
    const selectedMatIds = selectedMaterialsByTemplate?.[tpl.id];
    const tplBlock = buildEditableBlockFromTemplate(
      tpl,
      idx + 1,
      {
        widthCm,
        projectionCm,
        heightCm,
        mountType,
        eurHufRate,
        customerName,
        greetingName,
        city,
        deliveryFeeHuf,
      },
      config,
      selectedMatIds
    );
    blocks.push(tplBlock);

    if (idx === 0) {
      primaryTotalEur = tplBlock.customTotalBaseEur || 0;
      primaryTotalHuf = tplBlock.customTotalBaseHuf || 0;
    }
  });

  // 3. Záró Információs Szövegdoboz Blokk
  const closingText = replaceTemplateVariables(
    config.defaultClosingInfoTemplate ||
      'Információk és feltételek:\n• Az árajánlat érvényessége: 30 nap\n• Szállítás ({{telepules}}): {{szallitas}} (+Áfa)',
    varCtx
  );

  blocks.push({
    id: `blk_closing_${Date.now()}`,
    type: 'text_box',
    title: 'Fontos információk és vállalási feltételek',
    content: closingText,
    textStyle: 'footer_info',
    bold: false,
    align: 'left',
  });

  return {
    blocks,
    primaryTotalEur,
    primaryTotalHuf,
  };
}

/**
 * Újraszámolja egy template_section blokk összes sorát és főösszegét kizárólag a sorok mögötti
 * árazási algoritmusok (és az aktuális méretek/árfolyam) alapján.
 */
export function recalculateBlockWithAlgorithms(
  block: QuoteDocumentBlock,
  ctx: CalculationContext,
  templates?: QuoteTemplate[]
): QuoteDocumentBlock {
  if (block.type !== 'template_section' || !block.rows) return block;

  const sourceTpl = templates?.find((t) => t.id === block.templateId);

  const materialsFromRows: TemplateMaterialItem[] = block.rows.map((r, idx) => {
    const tplMat = sourceTpl?.materials?.find((m) => m.id === r.materialId);
    const baseAlg =
      r.algorithm ||
      tplMat ||
      createDefaultMaterialAlgorithm({
        id: r.materialId || `mat_row_${idx}_${Date.now()}`,
        pricingMode: 'per_m2',
        unitPrice: 350,
      });

    return {
      ...baseAlg,
      id: r.materialId || baseAlg.id || `mat_row_${idx}`,
      name: r.name,
      description: r.description || '',
      itemRole: r.itemRole || 'base',
      defaultSelected: r.included !== false,
      defaultNote: r.note ?? baseAlg.defaultNote ?? '',
      photos: r.photos || baseAlg.photos || [],
    };
  });

  const includedIds = materialsFromRows
    .filter((_, idx) => block.rows![idx].included !== false)
    .map((m) => m.id);

  const virtualTemplate: QuoteTemplate = {
    id: block.templateId || 'virtual_tpl',
    categoryId: block.categoryId || '',
    name: block.sectionTitle || '',
    subtitle: block.sectionSubtitle || '',
    enabled: true,
    introText: block.sectionIntroText || '',
    closingText: block.sectionClosingText || '',
    textBlocks: [],
    photos: block.sectionPhotos || [],
    materials: materialsFromRows,
    createdAt: '',
    updatedAt: '',
  };

  const calc = calculateTemplateRows(virtualTemplate, ctx, includedIds);

  const updatedRows: QuoteTableRow[] = calc.rows.map((calcRow, idx) => {
    const origRow = block.rows![idx];
    return {
      ...calcRow,
      id: origRow?.id || calcRow.id,
      name: origRow?.name ?? calcRow.name,
      description: origRow?.description ?? calcRow.description,
      note: origRow?.note !== undefined ? origRow.note : calcRow.note,
      photos: origRow?.photos || calcRow.photos,
    };
  });

  return {
    ...block,
    rows: updatedRows,
    autoCalculateTotals: true,
    customTotalBaseEur: calc.totalBaseEur,
    customTotalBaseHuf: calc.totalBaseHuf,
  };
}

/**
 * Újraszámolja egy template_section blokk összesített EUR és HUF alapárát a sorai alapján.
 * Mindig kötelezően az algoritmus által számolt sorokból összegzi.
 */
export function recalculateBlockTotals(
  block: QuoteDocumentBlock,
  eurHufRate: number
): QuoteDocumentBlock {
  if (block.type !== 'template_section' || !block.rows) return block;

  const rate = Math.max(1, Number(eurHufRate) || 400);
  const totalEur = block.rows
    .filter((r) => r.included && r.itemRole === 'base')
    .reduce((sum, r) => sum + (Number(r.discountPriceEur) || 0), 0);

  return {
    ...block,
    autoCalculateTotals: true,
    customTotalBaseEur: totalEur,
    customTotalBaseHuf: roundHuf(totalEur, rate),
  };
}
