import extractedData from '@/data/extracted_summary.json';
import { getDefaultPhotosForModel } from './constants';
import {
  AdminConfig,
  BeepitesTipusId,
  CalculatedModelOption,
  M2FixSzerelesTier,
  M2PriceTier,
  ModelPricingRule,
  TermekTipusId,
} from './types';

interface MatrixTable {
  rows: number[];
  cols: number[];
  matrix: Record<string, Record<string, number>>;
}

const TABLES = extractedData.tables as Record<string, any>;

export function roundHuf(eur: number, rate: number): number {
  return Math.round((eur * rate) / 1000) * 1000;
}

export function getUvegfalTablakSzama(widthCm: number): number {
  return Math.floor(Math.abs(widthCm - 21) / 100) + 1;
}

function applyModelRule(rawPrice: number, rule: ModelPricingRule): number {
  const afterMultiplier = rawPrice * rule.szorzo;
  const afterExtraDiscount =
    afterMultiplier - afterMultiplier * (rule.extraDiscountPct / 100);
  return Math.trunc(afterExtraDiscount + rule.fixFelarEur);
}

function nearestProjection(target: number, cols: number[]): number {
  if (target <= cols[0]) return cols[0];
  if (target >= cols[cols.length - 1]) return cols[cols.length - 1];
  let best = cols[0];
  let bestDiff = Math.abs(cols[0] - 1 - target);
  for (const c of cols) {
    const diff = Math.abs(c - 1 - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

function ceilInList(target: number, list: number[]): number {
  for (const val of list) {
    if (target <= val) return val;
  }
  return list[list.length - 1];
}

function lookupMatrix(table: MatrixTable, rowVal: number, colVal: number): number {
  const r = ceilInList(rowVal, table.rows);
  const c = ceilInList(colVal, table.cols);
  return table.matrix[String(r)]?.[String(c)] ?? 0;
}

function lookupMatrixNearestCol(
  table: MatrixTable,
  rowVal: number,
  colVal: number
): { r: number; c: number; price: number } {
  const r = ceilInList(rowVal, table.rows);
  const c = nearestProjection(colVal, table.cols);
  const price = table.matrix[String(r)]?.[String(c)] ?? 0;
  return { r, c, price };
}

function lookupM2Tier(m2: number, tiers: M2PriceTier[]): number {
  for (const t of tiers) {
    if (m2 <= t.maxM2) return m2 * t.eurPerM2;
  }
  const last = tiers[tiers.length - 1];
  return m2 * (last ? last.eurPerM2 : 200);
}

function lookupM2FixSzereles(m2: number, tiers: M2FixSzerelesTier[]): number {
  for (const t of tiers) {
    if (m2 <= t.maxM2) return t.fixEur;
  }
  const last = tiers[tiers.length - 1];
  return last ? last.fixEur : 1000;
}

function calcRefleksolZipSide(
  netWidth: number,
  netHeight: number,
  config: AdminConfig,
  allowMultiModule = false
): number {
  const zipTable = TABLES.Refleksol_120_ZIP as MatrixTable;
  const rule = config.models.REFLEKSOL_120_ZIP;
  const maxW = zipTable.rows[zipTable.rows.length - 1];
  const modules = allowMultiModule && netWidth > maxW ? Math.ceil(netWidth / maxW) : 1;
  const singleWidth = Math.trunc(netWidth / modules);
  const rawSingle = lookupMatrix(zipTable, singleWidth, netHeight);
  const rawTotal = rawSingle * modules;
  return applyModelRule(rawTotal, rule);
}

function calcVerticaPrimeZipSide(
  netWidth: number,
  netHeight: number,
  config: AdminConfig
): number {
  const zipTable = TABLES.Vertica_PRIME_ZIP as MatrixTable;
  const rule = config.models.VERTICA_PRIME_ZIP;
  const raw = lookupMatrix(zipTable, netWidth, netHeight);
  return applyModelRule(raw, rule);
}

function calcUvegfalSide(
  netWidth: number,
  netHeight: number,
  tiers: M2PriceTier[],
  config: AdminConfig
): number {
  const m2 = (Math.max(50, netWidth) / 100) * (Math.max(50, netHeight) / 100);
  const raw = lookupM2Tier(m2, tiers);
  return applyModelRule(raw, config.models.UVEGFAL_RENDSZER);
}

function buildSizeWarning(
  origProj: number,
  origWidth: number,
  origHeight: number,
  calcProj: number,
  calcWidth: number,
  calcHeight: number
): string {
  if (origProj !== calcProj || origWidth !== calcWidth || origHeight !== calcHeight) {
    return `A megadott (${origProj}×${origWidth}×${origHeight} cm) mérethez legközelebbi gyári mérettel (${calcProj}×${calcWidth}×${calcHeight} cm) kalkulálva.`;
  }
  return '';
}

function calcSpotVilagitas(proj: number, wid: number): { count: number; price: number } {
  if (proj <= 359) {
    return wid <= 274 ? { count: 4, price: 619 } : { count: 6, price: 679 };
  }
  if (proj <= 539) {
    return wid <= 274 ? { count: 6, price: 679 } : { count: 9, price: 827 };
  }
  return wid <= 274 ? { count: 8, price: 767 } : { count: 12, price: 945 };
}

export interface QuoteCalculationInput {
  termekTipus: TermekTipusId;
  beepitesTipus: BeepitesTipusId;
  projection: number; // A | Hosszúság / Szélesség (cm)
  width: number;      // B | Kinyúlás / Mélység (cm)
  height: number;     // C | Magasság (cm)
  eurHufRate: number;
}

function calculateBuiltinQuoteOptions(
  input: QuoteCalculationInput,
  config: AdminConfig
): CalculatedModelOption[] {
  const { termekTipus, beepitesTipus, eurHufRate } = input;
  const projection = Math.max(100, Number(input.projection) || 400);
  const width = Math.max(50, Number(input.width) || 300);
  const height = Math.max(100, Number(input.height) || 250);
  const isWall = beepitesTipus === 'Épülethez rögzített';
  const listaSzorzo = config.general.listaArSzorzo;

  const results: CalculatedModelOption[] = [];

  // ---------------------------------------------------------------------------
  // 1. BIOKLIMATIKUS (SB400, SeeSky Bio, Kedry Skylife)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'bioklimatikus') {
    // 1.1 SB400
    {
      const rule = config.models.SB400;
      const tbl: MatrixTable = isWall
        ? TABLES.SB400.wall_mounted
        : TABLES.SB400.free_standing;
      const { c: calcProj, price: rawPrice } = lookupMatrixNearestCol(tbl, width, projection);
      const minW = tbl.rows[0];
      const maxW = tbl.rows[tbl.rows.length - 1];
      const calcWidth = width < minW ? minW : width > maxW ? maxW : width;
      const kedvAlap = applyModelRule(rawPrice, rule);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const szerelesPct =
        kedvAlap < rule.szerelesThreshold1 ? rule.szerelesPctLow : rule.szerelesPctMid;
      const szerelesEur = Math.trunc(kedvAlap * (szerelesPct / 100));
      const osszesenEur = kedvAlap + rule.motorEur + rule.taviranyitoEur + szerelesEur;

      const widthNet = isWall ? calcWidth - 8.5 : calcWidth - 17;
      const projNet = calcProj - 30;
      const zipW = calcRefleksolZipSide(widthNet, height, config);
      const zipP = calcRefleksolZipSide(projNet, height, config);
      const zipSzer = Math.trunc(
        (zipW + zipP) * (config.general.zipSzerelesBioklimatikusPct / 100)
      );
      const zipOssz = zipW + zipP + zipSzer;

      const uvegW = calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegP = calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegSzer = Math.trunc(
        (uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100)
      );
      const uvegOssz = uvegW + uvegP + uvegSzer;
      const spot = calcSpotVilagitas(calcProj, calcWidth);

      results.push({
        modelId: 'SB400',
        modelName: rule.name,
        subtitle: rule.description,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: isWall ? 2 : 4,
        modulesCount: 1,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: rule.motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: rule.ledEur,
        ledHuf: roundHuf(rule.ledEur, eurHufRate),
        spotCount: spot.count,
        spotEur: spot.price,
        zipWidthNetCm: widthNet,
        zipProjectionNetCm: projNet,
        zipWidthEur: zipW,
        zipProjectionEur: zipP,
        zipSzerelesEur: zipSzer,
        zipOsszesenEur: zipOssz,
        zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
        uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
        uvegfalWidthEur: uvegW,
        uvegfalProjectionEur: uvegP,
        uvegfalSzerelesEur: uvegSzer,
        uvegfalOsszesenEur: uvegOssz,
        uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
      });
    }

    // 1.2 SEESKY BIO
    {
      const rule = config.models.SESKY_BIO;
      const seeskyProjections: number[] = [];
      for (let p = 140; p <= 640; p += 20) seeskyProjections.push(p);
      const calcProj = nearestProjection(projection, seeskyProjections);
      const calcWidth = Math.min(470, Math.max(150, width));
      const m2 = (calcProj / 100) * (calcWidth / 100);
      const tiers = isWall ? config.m2Tiers.seeskyBioWall : config.m2Tiers.seeskyBioFree;
      const rawPrice = lookupM2Tier(m2, tiers);
      const kedvAlap = applyModelRule(rawPrice, rule);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const szerelesPct =
        kedvAlap < rule.szerelesThreshold1 ? rule.szerelesPctLow : rule.szerelesPctMid;
      const szerelesEur = Math.trunc(kedvAlap * (szerelesPct / 100));
      const osszesenEur = kedvAlap + rule.motorEur + rule.taviranyitoEur + szerelesEur;

      const widthNet = isWall ? calcWidth - 16 : calcWidth - 32;
      const projNet = calcProj - 32;
      const zipW = calcRefleksolZipSide(widthNet, height, config);
      const zipP = calcRefleksolZipSide(projNet, height, config);
      const zipSzer = Math.trunc(
        (zipW + zipP) * (config.general.zipSzerelesBioklimatikusPct / 100)
      );
      const zipOssz = zipW + zipP + zipSzer;

      const uvegW = calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegP = calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegSzer = Math.trunc(
        (uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100)
      );
      const uvegOssz = uvegW + uvegP + uvegSzer;

      results.push({
        modelId: 'SESKY_BIO',
        modelName: rule.name,
        subtitle: rule.description,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: isWall ? 2 : 4,
        modulesCount: 1,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: rule.motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: rule.ledEur,
        ledHuf: roundHuf(rule.ledEur, eurHufRate),
        zipWidthNetCm: widthNet,
        zipProjectionNetCm: projNet,
        zipWidthEur: zipW,
        zipProjectionEur: zipP,
        zipSzerelesEur: zipSzer,
        zipOsszesenEur: zipOssz,
        zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
        uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
        uvegfalWidthEur: uvegW,
        uvegfalProjectionEur: uvegP,
        uvegfalSzerelesEur: uvegSzer,
        uvegfalOsszesenEur: uvegOssz,
        uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
      });
    }

    // 1.3 KEDRY SKYLIFE
    {
      const rule = config.models.KEDRY_SKYLIFE;
      const tbl: MatrixTable = isWall
        ? TABLES.KedrySkylife.wall_mounted
        : TABLES.KedrySkylife.free_standing;
      const { c: calcProj, price: rawPrice } = lookupMatrixNearestCol(tbl, width, projection);
      const minW = tbl.rows[0];
      const maxW = tbl.rows[tbl.rows.length - 1];
      const calcWidth = width < minW ? minW : width > maxW ? maxW : width;
      const kedvAlap = applyModelRule(rawPrice, rule);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const szerelesPct =
        kedvAlap < rule.szerelesThreshold1 ? rule.szerelesPctLow : rule.szerelesPctMid;
      const szerelesEur = Math.trunc(kedvAlap * (szerelesPct / 100));
      const osszesenEur = kedvAlap + rule.motorEur + rule.taviranyitoEur + szerelesEur;

      const widthNet = isWall ? calcWidth - 16 : calcWidth - 32;
      const projNet = calcProj - 32;
      const zipW = calcVerticaPrimeZipSide(widthNet, height, config);
      const zipP = calcVerticaPrimeZipSide(projNet, height, config);
      const zipSzer = Math.trunc(
        (zipW + zipP) * (config.general.zipSzerelesBioklimatikusPct / 100)
      );
      const zipOssz = zipW + zipP + zipSzer;

      const uvegW = calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegP = calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegSzer = Math.trunc(
        (uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100)
      );
      const uvegOssz = uvegW + uvegP + uvegSzer;

      results.push({
        modelId: 'KEDRY_SKYLIFE',
        modelName: rule.name,
        subtitle: rule.description,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: isWall ? 2 : 4,
        modulesCount: 1,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: rule.motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: rule.ledEur,
        ledHuf: roundHuf(rule.ledEur, eurHufRate),
        zipWidthNetCm: widthNet,
        zipProjectionNetCm: projNet,
        zipWidthEur: zipW,
        zipProjectionEur: zipP,
        zipSzerelesEur: zipSzer,
        zipOsszesenEur: zipOssz,
        zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
        uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
        uvegfalWidthEur: uvegW,
        uvegfalProjectionEur: uvegP,
        uvegfalSzerelesEur: uvegSzer,
        uvegfalOsszesenEur: uvegOssz,
        uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
      });
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // 2. ELHÚZHATÓ PONYVÁS (Gennius A100 LUX, Keplan, Isola 2A)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'elhuzhato_ponyvas') {
    // 2.1 GENNIUS A100 LUX
    {
      const rule = config.models.A100LUX;
      const modNum = projection <= 500 ? 1 : projection <= 900 ? 2 : 3;
      const tbl: MatrixTable =
        modNum === 1 ? TABLES.A100Lux['1_modul'] : TABLES.A100Lux['2_3_modul'];
      const tblEloteto: MatrixTable =
        modNum === 1
          ? TABLES.A100Lux['1_modul_eloteto']
          : TABLES.A100Lux['2_3_modul_eloteto'];
      const calcProj = ceilInList(projection, tbl.cols);
      const calcWidth = ceilInList(width, tbl.rows);
      const rawBase = lookupMatrix(tbl, calcWidth, calcProj);
      const rawEloteto = lookupMatrix(tblEloteto, calcWidth, calcProj);
      const modExtra = modNum === 1 ? 0 : modNum === 2 ? 1400 : 2400;
      const kedvAlap = applyModelRule(rawBase + rawEloteto, rule) + modExtra;
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const motorEur = rule.motorEur + (modNum - 1) * 100;
      const reszosszeg = kedvAlap + motorEur + rule.taviranyitoEur;
      const szerelesPct =
        reszosszeg < rule.szerelesThreshold1
          ? rule.szerelesPctLow
          : reszosszeg < rule.szerelesThreshold2
          ? rule.szerelesPctMid
          : rule.szerelesPctHigh;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;
      const ledEur = rule.ledEur + (modNum - 1) * 200;

      const legs = modNum + 1;
      const widthNet = calcWidth - 11;
      const projNet = calcProj - legs * 6;
      const zipW = calcRefleksolZipSide(widthNet, height, config);
      const zipP = calcRefleksolZipSide(projNet, height, config);
      const zipSzer = Math.trunc((zipW + zipP) * (config.general.zipSzerelesPergolaPct / 100));
      const zipOssz = zipW + zipP + zipSzer;

      const uvegW = calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegP = calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegSzer = Math.trunc((uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100));
      const uvegOssz = uvegW + uvegP + uvegSzer;

      results.push({
        modelId: 'A100LUX',
        modelName: rule.name,
        subtitle: `${rule.description} (${modNum} modul, elöl ${legs} lábbal)`,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: legs,
        modulesCount: modNum,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur,
        ledHuf: roundHuf(ledEur, eurHufRate),
        zipWidthNetCm: widthNet,
        zipProjectionNetCm: projNet,
        zipWidthEur: zipW,
        zipProjectionEur: zipP,
        zipSzerelesEur: zipSzer,
        zipOsszesenEur: zipOssz,
        zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
        uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
        uvegfalWidthEur: uvegW,
        uvegfalProjectionEur: uvegP,
        uvegfalSzerelesEur: uvegSzer,
        uvegfalOsszesenEur: uvegOssz,
        uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
      });
    }

    // 2.2 KEPLAN
    {
      const rule = config.models.KEPLAN;
      const tbl: MatrixTable = isWall
        ? TABLES.Keplan.wall_mounted
        : TABLES.Keplan.free_standing;
      const calcProj = ceilInList(projection, tbl.cols);
      const calcWidth = ceilInList(width, tbl.rows);
      const rawPrice = lookupMatrix(tbl, calcWidth, calcProj);
      const kedvAlap = applyModelRule(rawPrice, rule);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const reszosszeg = kedvAlap + rule.motorEur + rule.taviranyitoEur;
      const szerelesPct = rule.szerelesPctLow;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;

      const widthNet = isWall ? calcWidth - 11 : calcWidth - 22;
      const projNet = calcProj - 22;
      const zipW = calcRefleksolZipSide(widthNet, height, config);
      const zipP = calcRefleksolZipSide(projNet, height, config);
      const zipSzer = Math.trunc((zipW + zipP) * (config.general.zipSzerelesPergolaPct / 100));
      const zipOssz = zipW + zipP + zipSzer;

      const uvegW = calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegP = calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegSzer = Math.trunc((uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100));
      const uvegOssz = uvegW + uvegP + uvegSzer;

      results.push({
        modelId: 'KEPLAN',
        modelName: rule.name,
        subtitle: rule.description,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: isWall ? 2 : 4,
        modulesCount: 1,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: rule.motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: rule.ledEur,
        ledHuf: roundHuf(rule.ledEur, eurHufRate),
        zipWidthNetCm: widthNet,
        zipProjectionNetCm: projNet,
        zipWidthEur: zipW,
        zipProjectionEur: zipP,
        zipSzerelesEur: zipSzer,
        zipOsszesenEur: zipOssz,
        zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
        uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
        uvegfalWidthEur: uvegW,
        uvegfalProjectionEur: uvegP,
        uvegfalSzerelesEur: uvegSzer,
        uvegfalOsszesenEur: uvegOssz,
        uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
      });
    }

    // 2.3 ISOLA 2A
    {
      const rule = config.models.ISOLA_2A;
      const tbl: MatrixTable = isWall
        ? TABLES.Isola.wall_mounted
        : TABLES.Isola.free_standing;
      const calcProj = ceilInList(projection, tbl.cols);
      const calcWidth = ceilInList(width, tbl.rows);
      const rawPrice = lookupMatrix(tbl, calcWidth, calcProj);
      const isLarge = projection > 700;
      const kedvAlap = applyModelRule(rawPrice, rule) + (isLarge ? 650 : 0);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const motorEur = isLarge ? rule.motorEur + 200 : rule.motorEur;
      const reszosszeg = kedvAlap + motorEur + rule.taviranyitoEur;
      const szerelesPct = isLarge ? rule.szerelesPctMid : rule.szerelesPctLow;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;
      const ledEur = isLarge ? rule.ledEur + 300 : rule.ledEur;
      const legs = isWall ? (isLarge ? 3 : 2) : isLarge ? 6 : 4;

      const widthNet = isWall ? calcWidth - 12 : calcWidth - 24;
      const projNet = isLarge ? calcProj - 36 : calcProj - 24;
      const zipW = calcRefleksolZipSide(widthNet, height, config);
      const zipP = calcRefleksolZipSide(projNet, height, config);
      const zipSzer = Math.trunc((zipW + zipP) * (config.general.zipSzerelesPergolaPct / 100));
      const zipOssz = zipW + zipP + zipSzer;

      const uvegW = calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegP = calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config);
      const uvegSzer = Math.trunc((uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100));
      const uvegOssz = uvegW + uvegP + uvegSzer;

      results.push({
        modelId: 'ISOLA_2A',
        modelName: rule.name,
        subtitle: `${rule.description} (${legs} lábbal)`,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: legs,
        modulesCount: isLarge ? 2 : 1,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur,
        ledHuf: roundHuf(ledEur, eurHufRate),
        zipWidthNetCm: widthNet,
        zipProjectionNetCm: projNet,
        zipWidthEur: zipW,
        zipProjectionEur: zipP,
        zipSzerelesEur: zipSzer,
        zipOsszesenEur: zipOssz,
        zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
        uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
        uvegfalWidthEur: uvegW,
        uvegfalProjectionEur: uvegP,
        uvegfalSzerelesEur: uvegSzer,
        uvegfalOsszesenEur: uvegOssz,
        uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
      });
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // 3. FESZÍTETT VÁSZNAS (Pergola V ZIIP, Hydra, Gennius A100 LUX)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'feszitett_vasznas') {
    // 3.1 PERGOLA V ZIIP
    {
      const rule = config.models.PERGOLA_V_ZIIP;
      const tbl = TABLES.PergolaVZIIP as MatrixTable;
      const modNum = Math.max(1, Math.ceil(projection / 500));
      const singleProj = ceilInList(Math.trunc(projection / modNum), tbl.cols);
      const calcProj = singleProj * modNum;
      const calcWidth = ceilInList(width, tbl.rows);
      const rawSingle = lookupMatrix(tbl, calcWidth, singleProj);
      const kedvAlap = applyModelRule(rawSingle * modNum, rule);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const reszosszeg = kedvAlap + rule.motorEur + rule.taviranyitoEur;
      const szerelesPct =
        reszosszeg < rule.szerelesThreshold1
          ? rule.szerelesPctLow
          : reszosszeg < rule.szerelesThreshold2
          ? rule.szerelesPctMid
          : rule.szerelesPctHigh;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;

      results.push({
        modelId: 'PERGOLA_V_ZIIP',
        modelName: rule.name,
        subtitle: `${rule.description} (${modNum} modul, ${modNum * 2} lábbal)`,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: modNum * 2,
        modulesCount: modNum,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: rule.motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: 0,
        ledHuf: 0,
        zipWidthNetCm: calcWidth - 12,
        zipProjectionNetCm: calcProj - 24,
        zipWidthEur: 0,
        zipProjectionEur: 0,
        zipSzerelesEur: 0,
        zipOsszesenEur: 0,
        zipOsszesenHuf: 0,
        uvegfalWidthTablak: 0,
        uvegfalProjectionTablak: 0,
        uvegfalWidthEur: 0,
        uvegfalProjectionEur: 0,
        uvegfalSzerelesEur: 0,
        uvegfalOsszesenEur: 0,
        uvegfalOsszesenHuf: 0,
      });
    }

    // 3.2 HYDRA
    {
      const rule = config.models.HYDRA;
      const tbl = TABLES.Hydra as MatrixTable;
      const modNum = projection <= 600 ? 1 : 2;
      const calcProj = ceilInList(projection, tbl.cols);
      const calcWidth = ceilInList(width, tbl.rows);
      const rawPrice = lookupMatrix(tbl, calcWidth, calcProj);
      const kedvAlap = applyModelRule(rawPrice, rule) + (modNum === 2 ? 525 : 0);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const motorEur = rule.motorEur * modNum;
      const reszosszeg = kedvAlap + motorEur + rule.taviranyitoEur;
      const szerelesPct =
        reszosszeg < rule.szerelesThreshold1
          ? rule.szerelesPctLow
          : reszosszeg < rule.szerelesThreshold2
          ? rule.szerelesPctMid
          : rule.szerelesPctHigh;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;
      const ledEur =
        modNum === 1
          ? projection < 500
            ? 400
            : 500
          : projection < 950
          ? 600
          : 700;

      results.push({
        modelId: 'HYDRA',
        modelName: rule.name,
        subtitle: `${rule.description} (${modNum} modul, ${modNum + 1} lábbal)`,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: modNum + 1,
        modulesCount: modNum,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur,
        ledHuf: roundHuf(ledEur, eurHufRate),
        zipWidthNetCm: calcWidth - 12,
        zipProjectionNetCm: calcProj - 24,
        zipWidthEur: 0,
        zipProjectionEur: 0,
        zipSzerelesEur: 0,
        zipOsszesenEur: 0,
        zipOsszesenHuf: 0,
        uvegfalWidthTablak: 0,
        uvegfalProjectionTablak: 0,
        uvegfalWidthEur: 0,
        uvegfalProjectionEur: 0,
        uvegfalSzerelesEur: 0,
        uvegfalOsszesenEur: 0,
        uvegfalOsszesenHuf: 0,
      });
    }

    // 3.3 GENNIUS A100 LUX (mint PVC alternatíva)
    const ponyvasOpts = calculateQuoteOptions(
      { ...input, termekTipus: 'elhuzhato_ponyvas' },
      config
    );
    if (ponyvasOpts[0]) {
      results.push({
        ...ponyvasOpts[0],
        ledEur: 400,
        ledHuf: roundHuf(400, eurHufRate),
      });
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // 4. FESZÍTETT VÁSZNAS TETŐRE (Veranda Tens, Veranda V ZIIP)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'feszitett_vasznas_tetore') {
    // 4.1 VERANDA TENS
    {
      const rule = config.models.VERANDA_TENS_TETORE;
      const tbl = TABLES.VerandaTens as MatrixTable;
      const modNum = Math.max(1, Math.ceil(projection / 450));
      const singleProj = ceilInList(Math.trunc(projection / modNum), tbl.cols);
      const calcProj = singleProj * modNum;
      const calcWidth = ceilInList(width, tbl.rows);
      const rawSingle = lookupMatrix(tbl, calcWidth, singleProj);
      const kedvAlap = applyModelRule(rawSingle * modNum, rule);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const motorEur = rule.motorEur * modNum;
      const reszosszeg = kedvAlap + motorEur + rule.taviranyitoEur;
      const szerelesPct = modNum === 1 ? rule.szerelesPctLow : rule.szerelesPctMid;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;

      results.push({
        modelId: 'VERANDA_TENS_TETORE',
        modelName: rule.name,
        subtitle: `${rule.description} (${modNum} modul)`,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: 0,
        modulesCount: modNum,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: 0,
        ledHuf: 0,
        zipWidthNetCm: 0,
        zipProjectionNetCm: 0,
        zipWidthEur: 0,
        zipProjectionEur: 0,
        zipSzerelesEur: 0,
        zipOsszesenEur: 0,
        zipOsszesenHuf: 0,
        uvegfalWidthTablak: 0,
        uvegfalProjectionTablak: 0,
        uvegfalWidthEur: 0,
        uvegfalProjectionEur: 0,
        uvegfalSzerelesEur: 0,
        uvegfalOsszesenEur: 0,
        uvegfalOsszesenHuf: 0,
      });
    }

    // 4.2 VERANDA V ZIIP
    {
      const rule = config.models.VERANDA_V_ZIP;
      const tbl = TABLES.VerandaVZIP as MatrixTable;
      const modNum = Math.max(1, Math.ceil(projection / 500));
      const singleProj = ceilInList(Math.trunc(projection / modNum), tbl.cols);
      const calcProj = singleProj * modNum;
      const calcWidth = ceilInList(width, tbl.rows);
      const rawSingle = lookupMatrix(tbl, calcWidth, singleProj);
      const kedvAlap = applyModelRule(rawSingle * modNum, rule) + (modNum > 1 ? 500 : 0);
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const reszosszeg = kedvAlap + rule.taviranyitoEur;
      const szerelesPct = rule.szerelesPctLow;
      const szerelesEur = Math.trunc(reszosszeg * (szerelesPct / 100));
      const osszesenEur = reszosszeg + szerelesEur;

      results.push({
        modelId: 'VERANDA_V_ZIP',
        modelName: rule.name,
        subtitle: `${rule.description} (${modNum} modul)`,
        enabled: rule.enabled,
        calculatedProjection: calcProj,
        calculatedWidth: calcWidth,
        calculatedHeight: height,
        sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
        legsCount: 0,
        modulesCount: modNum,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: 0,
        taviranyitoEur: rule.taviranyitoEur,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: 0,
        ledHuf: 0,
        zipWidthNetCm: 0,
        zipProjectionNetCm: 0,
        zipWidthEur: 0,
        zipProjectionEur: 0,
        zipSzerelesEur: 0,
        zipOsszesenEur: 0,
        zipOsszesenHuf: 0,
        uvegfalWidthTablak: 0,
        uvegfalProjectionTablak: 0,
        uvegfalWidthEur: 0,
        uvegfalProjectionEur: 0,
        uvegfalSzerelesEur: 0,
        uvegfalOsszesenEur: 0,
        uvegfalOsszesenHuf: 0,
      });
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // 5. POLIKARBONÁTOS (Polifix)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'polikarbonatos') {
    const rule = config.models.POLIFIX;
    const calcProj = Math.min(1800, Math.max(100, projection));
    const calcWidth = Math.min(600, Math.max(50, width));
    const legs = calcProj <= 600 ? 2 : calcProj <= 1200 ? 3 : 4;
    const m2 = (calcProj / 100) * (calcWidth / 100);
    const tiers =
      legs === 2
        ? config.m2Tiers.polifix2Lab
        : legs === 3
        ? config.m2Tiers.polifix3Lab
        : config.m2Tiers.polifix4Lab;
    const rawPrice = lookupM2Tier(m2, tiers);
    const kedvAlap = applyModelRule(rawPrice, rule);
    const listaAr = Math.trunc(kedvAlap * listaSzorzo);
    const szerelesEur = lookupM2FixSzereles(m2, config.m2Tiers.polifixSzereles);
    const osszesenEur = kedvAlap + szerelesEur;

    const widthNet = Math.max(100, calcWidth - 14);
    const projNet = Math.max(100, calcProj - 22);
    const heightNet = Math.max(100, Math.trunc(height - (10 * calcWidth) / 100));

    const zipW = calcRefleksolZipSide(widthNet, heightNet, config, true);
    const zipP = calcRefleksolZipSide(projNet, heightNet, config, true);
    const zipSzer = Math.trunc((zipW + zipP) * (config.general.zipSzerelesPergolaPct / 100));
    const zipOssz = zipW + zipP + zipSzer;

    const uvegW = calcUvegfalSide(widthNet, heightNet, config.m2Tiers.uvegfalLengyel, config);
    const uvegP = calcUvegfalSide(projNet, heightNet, config.m2Tiers.uvegfalLengyel, config);
    const uvegSzer = Math.trunc((uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100));
    const uvegOssz = uvegW + uvegP + uvegSzer;

    results.push({
      modelId: 'POLIFIX',
      modelName: rule.name,
      subtitle: `${rule.description} (${m2.toFixed(1)} m², elöl ${legs} lábbal)`,
      enabled: rule.enabled,
      calculatedProjection: calcProj,
      calculatedWidth: calcWidth,
      calculatedHeight: height,
      sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
      legsCount: legs,
      modulesCount: 1,
      listaArEur: listaAr,
      kedvezmenyesAlaparEur: kedvAlap,
      motorEur: 0,
      taviranyitoEur: 0,
      szerelesEur,
      szerelesPct: Math.round((szerelesEur / Math.max(1, kedvAlap)) * 100),
      customDiscountPct: 0,
      alapszerkezetOsszesenEur: osszesenEur,
      alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
      ledEur: config.general.spotVilagitasDarabArEur * 6,
      ledHuf: roundHuf(config.general.spotVilagitasDarabArEur * 6, eurHufRate),
      spotCount: 6,
      spotEur: config.general.spotVilagitasDarabArEur,
      zipWidthNetCm: widthNet,
      zipProjectionNetCm: projNet,
      zipWidthEur: zipW,
      zipProjectionEur: zipP,
      zipSzerelesEur: zipSzer,
      zipOsszesenEur: zipOssz,
      zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
      uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
      uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
      uvegfalWidthEur: uvegW,
      uvegfalProjectionEur: uvegP,
      uvegfalSzerelesEur: uvegSzer,
      uvegfalOsszesenEur: uvegOssz,
      uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
    });
    return results;
  }

  // ---------------------------------------------------------------------------
  // 6. ÜVEGTETŐS (Glassfix + Veranda Tens tetőárnyékoló)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'uvegtetos') {
    const rule = config.models.GLASSFIX;
    const calcProj = Math.min(1800, Math.max(100, projection));
    const calcWidth = Math.min(400, Math.max(50, width));
    const legs = calcProj <= 600 ? 2 : calcProj <= 1200 ? 3 : 4;
    const m2 = (calcProj / 100) * (calcWidth / 100);
    const tiers =
      legs === 2
        ? config.m2Tiers.glassfix2Lab
        : legs === 3
        ? config.m2Tiers.glassfix3Lab
        : config.m2Tiers.glassfix4Lab;
    const rawPrice = lookupM2Tier(m2, tiers);
    const kedvAlap = applyModelRule(rawPrice, rule);
    const listaAr = Math.trunc(kedvAlap * listaSzorzo);
    const szerelesEur = lookupM2FixSzereles(m2, config.m2Tiers.glassfixSzereles);
    const osszesenEur = kedvAlap + szerelesEur;

    // Veranda Tens tetőárnyékoló opció
    const vtRule = config.models.VERANDA_TENS_UVEGTETOS;
    const vtTbl = TABLES.VerandaTens as MatrixTable;
    const vtDarab = Math.max(1, Math.ceil(calcProj / 450));
    const vtSingleProj = ceilInList(Math.trunc(calcProj / vtDarab), vtTbl.cols);
    const vtRawSingle = lookupMatrix(vtTbl, ceilInList(calcWidth, vtTbl.rows), vtSingleProj);
    const vtAlap = applyModelRule(vtRawSingle * vtDarab, vtRule);
    const vtTartozekok = (vtRule.motorEur + vtRule.taviranyitoEur + 800) * vtDarab;
    const tetoArnyekoloEur = vtAlap + vtTartozekok;

    const widthNet = Math.max(100, calcWidth - 14);
    const projNet = Math.max(100, calcProj - legs * 11);
    const heightNet = Math.max(100, Math.trunc(height - (10 * calcWidth) / 100));

    const zipW = calcRefleksolZipSide(widthNet, heightNet, config, true);
    const zipP = calcRefleksolZipSide(projNet, heightNet, config, true);
    const zipSzer = Math.trunc((zipW + zipP) * (config.general.zipSzerelesPergolaPct / 100));
    const zipOssz = zipW + zipP + zipSzer;

    const uvegW = calcUvegfalSide(widthNet, heightNet, config.m2Tiers.uvegfalLengyel, config);
    const uvegP = calcUvegfalSide(projNet, heightNet, config.m2Tiers.uvegfalLengyel, config);
    const haromszogEur = Math.trunc(calcWidth * 1.3);
    const uvegSzer = Math.trunc(
      (uvegW + uvegP + haromszogEur) * (config.general.uvegfalSzerelesPct / 100)
    );
    const uvegOssz = uvegW + uvegP + haromszogEur + uvegSzer;

    results.push({
      modelId: 'GLASSFIX',
      modelName: rule.name,
      subtitle: `${rule.description} (${m2.toFixed(1)} m², elöl ${legs} lábbal)`,
      enabled: rule.enabled,
      calculatedProjection: calcProj,
      calculatedWidth: calcWidth,
      calculatedHeight: height,
      sizeWarning: buildSizeWarning(projection, width, height, calcProj, calcWidth, height),
      legsCount: legs,
      modulesCount: 1,
      listaArEur: listaAr,
      kedvezmenyesAlaparEur: kedvAlap,
      motorEur: 0,
      taviranyitoEur: 0,
      szerelesEur,
      szerelesPct: Math.round((szerelesEur / Math.max(1, kedvAlap)) * 100),
      customDiscountPct: 0,
      alapszerkezetOsszesenEur: osszesenEur,
      alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
      ledEur: config.general.spotVilagitasDarabArEur * 6,
      ledHuf: roundHuf(config.general.spotVilagitasDarabArEur * 6, eurHufRate),
      spotCount: 6,
      spotEur: config.general.spotVilagitasDarabArEur,
      tetoArnyekoloEur,
      tetoArnyekoloHuf: roundHuf(tetoArnyekoloEur, eurHufRate),
      zipWidthNetCm: widthNet,
      zipProjectionNetCm: projNet,
      zipWidthEur: zipW,
      zipProjectionEur: zipP,
      zipSzerelesEur: zipSzer,
      zipOsszesenEur: zipOssz,
      zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
      uvegfalWidthTablak: getUvegfalTablakSzama(widthNet),
      uvegfalProjectionTablak: getUvegfalTablakSzama(projNet),
      uvegfalWidthEur: uvegW,
      uvegfalProjectionEur: uvegP,
      uvegfalHaromszogEur: haromszogEur,
      uvegfalSzerelesEur: uvegSzer,
      uvegfalOsszesenEur: uvegOssz,
      uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
    });
    return results;
  }

  // ---------------------------------------------------------------------------
  // 7. ÜVEGFALAS (Spanyol Line Glass & Lengyel Sliding Doors)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'uvegfalas') {
    const rule = config.models.UVEGFAL_RENDSZER;
    // 7.1 Spanyol Line Glass
    {
      const side1 = calcUvegfalSide(projection, height, config.m2Tiers.uvegfalSpanyol, config);
      const side2 = calcUvegfalSide(width, height, config.m2Tiers.uvegfalSpanyol, config);
      const kedvAlap = side1 + side2;
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const szerelesPct = config.general.uvegfalSpanyolSzerelesPct;
      const szerelesEur = Math.trunc(kedvAlap * (szerelesPct / 100));
      const osszesenEur = kedvAlap + szerelesEur;

      results.push({
        modelId: 'LINE_GLASS_SPANYOL',
        modelName: 'LINE GLASS / RUN 2 (Spanyol prémium üvegfal)',
        subtitle: `10 mm edzett üvegfal: ${projection}×${height} cm (${getUvegfalTablakSzama(projection)} tábla) + ${width}×${height} cm (${getUvegfalTablakSzama(width)} tábla)`,
        enabled: rule.enabled,
        calculatedProjection: projection,
        calculatedWidth: width,
        calculatedHeight: height,
        sizeWarning: '',
        legsCount: 0,
        modulesCount: 2,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: 0,
        taviranyitoEur: 0,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: 0,
        ledHuf: 0,
        zipWidthNetCm: width,
        zipProjectionNetCm: projection,
        zipWidthEur: 0,
        zipProjectionEur: 0,
        zipSzerelesEur: 0,
        zipOsszesenEur: 0,
        zipOsszesenHuf: 0,
        uvegfalWidthTablak: getUvegfalTablakSzama(width),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projection),
        uvegfalWidthEur: side2,
        uvegfalProjectionEur: side1,
        uvegfalSzerelesEur: szerelesEur,
        uvegfalOsszesenEur: osszesenEur,
        uvegfalOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
      });
    }

    // 7.2 Lengyel Sliding Doors
    {
      const side1 = calcUvegfalSide(projection, height, config.m2Tiers.uvegfalLengyel, config);
      const side2 = calcUvegfalSide(width, height, config.m2Tiers.uvegfalLengyel, config);
      const kedvAlap = side1 + side2;
      const listaAr = Math.trunc(kedvAlap * listaSzorzo);
      const szerelesPct = config.general.uvegfalSzerelesPct;
      const szerelesEur = Math.trunc(kedvAlap * (szerelesPct / 100));
      const osszesenEur = kedvAlap + szerelesEur;

      results.push({
        modelId: 'SLIDING_DOORS_LENGYEL',
        modelName: 'SLIDING DOORS (Lengyel középkategóriás üvegfal)',
        subtitle: `10 mm edzett üvegfal: ${projection}×${height} cm (${getUvegfalTablakSzama(projection)} tábla) + ${width}×${height} cm (${getUvegfalTablakSzama(width)} tábla)`,
        enabled: rule.enabled,
        calculatedProjection: projection,
        calculatedWidth: width,
        calculatedHeight: height,
        sizeWarning: '',
        legsCount: 0,
        modulesCount: 2,
        listaArEur: listaAr,
        kedvezmenyesAlaparEur: kedvAlap,
        motorEur: 0,
        taviranyitoEur: 0,
        szerelesEur,
        szerelesPct,
        customDiscountPct: 0,
        alapszerkezetOsszesenEur: osszesenEur,
        alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
        ledEur: 0,
        ledHuf: 0,
        zipWidthNetCm: width,
        zipProjectionNetCm: projection,
        zipWidthEur: 0,
        zipProjectionEur: 0,
        zipSzerelesEur: 0,
        zipOsszesenEur: 0,
        zipOsszesenHuf: 0,
        uvegfalWidthTablak: getUvegfalTablakSzama(width),
        uvegfalProjectionTablak: getUvegfalTablakSzama(projection),
        uvegfalWidthEur: side2,
        uvegfalProjectionEur: side1,
        uvegfalSzerelesEur: szerelesEur,
        uvegfalOsszesenEur: osszesenEur,
        uvegfalOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
      });
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // 8. ZIPES (Önálló Vertica 120 ZIP / Screeny GPZ)
  // ---------------------------------------------------------------------------
  if (termekTipus === 'ZIPes') {
    const rule = config.models.REFLEKSOL_120_ZIP;
    const zipP = calcRefleksolZipSide(projection, height, config, true);
    const zipW = calcRefleksolZipSide(width, height, config, true);
    const kedvAlap = zipP + zipW;
    const listaAr = Math.trunc(kedvAlap * listaSzorzo);
    const szerelesPct = config.general.zipSzerelesOnalloPct;
    const szerelesEur = Math.trunc(kedvAlap * (szerelesPct / 100));
    const osszesenEur = kedvAlap + szerelesEur;

    results.push({
      modelId: 'REFLEKSOL_120_ZIP',
      modelName: rule.name,
      subtitle: `1 db ${projection}×${height} cm + 1 db ${width}×${height} cm motoros ZIP árnyékoló (Somfy IO)`,
      enabled: rule.enabled,
      calculatedProjection: projection,
      calculatedWidth: width,
      calculatedHeight: height,
      sizeWarning: '',
      legsCount: 0,
      modulesCount: 2,
      listaArEur: listaAr,
      kedvezmenyesAlaparEur: kedvAlap,
      motorEur: 0,
      taviranyitoEur: 0,
      szerelesEur,
      szerelesPct,
      customDiscountPct: 0,
      alapszerkezetOsszesenEur: osszesenEur,
      alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
      ledEur: 0,
      ledHuf: 0,
      zipWidthNetCm: width,
      zipProjectionNetCm: projection,
      zipWidthEur: zipW,
      zipProjectionEur: zipP,
      zipSzerelesEur: szerelesEur,
      zipOsszesenEur: osszesenEur,
      zipOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
      uvegfalWidthTablak: 0,
      uvegfalProjectionTablak: 0,
      uvegfalWidthEur: 0,
      uvegfalProjectionEur: 0,
      uvegfalSzerelesEur: 0,
      uvegfalOsszesenEur: 0,
      uvegfalOsszesenHuf: 0,
    });
    return results;
  }

  return results;
}

export function calculateSingleCustomTemplate(
  rule: ModelPricingRule,
  input: QuoteCalculationInput,
  config: AdminConfig
): CalculatedModelOption {
  const { beepitesTipus, eurHufRate } = input;
  const projection = Math.max(100, Number(input.projection) || 400);
  const width = Math.max(50, Number(input.width) || 300);
  const height = Math.max(100, Number(input.height) || 250);
  const isWall = beepitesTipus === 'Épülethez rögzített';
  const listaSzorzo = config.general.listaArSzorzo;

  const minProj = rule.minProjectionCm || 100;
  const maxProj = rule.maxProjectionCm || 900;
  const minW = rule.minWidthCm || 100;
  const maxW = rule.maxWidthCm || 700;

  const calcProj = Math.min(maxProj, Math.max(minProj, projection));
  const calcWidth = Math.min(maxW, Math.max(minW, width));
  const m2 = (calcProj / 100) * (calcWidth / 100);

  let rawPrice = 0;
  const method = rule.pricingMethod || 'm2_tiers';

  if (method === 'base_plus_m2') {
    const startBase = Number(rule.baseStartEur) || 1200;
    const perM2 = isWall
      ? Number(rule.eurPerM2Wall) || 280
      : Number(rule.eurPerM2Free) || Number(rule.eurPerM2Wall) || 310;
    rawPrice = startBase + m2 * perM2;
  } else if (method === 'matrix_clone') {
    const src = rule.matrixSourceId || 'SB400';
    let tbl: MatrixTable | undefined;
    if (src === 'SB400') {
      tbl = isWall ? TABLES.SB400.wall_mounted : TABLES.SB400.free_standing;
    } else if (TABLES[src]) {
      tbl = TABLES[src] as MatrixTable;
    }
    if (tbl && tbl.rows && tbl.cols) {
      rawPrice = lookupMatrix(tbl, calcWidth, calcProj);
    } else {
      rawPrice = m2 * 360;
    }
  } else {
    // 'm2_tiers'
    if (rule.customM2Tiers && rule.customM2Tiers.length > 0) {
      rawPrice = lookupM2Tier(m2, rule.customM2Tiers);
    } else {
      const perM2 = isWall
        ? Number(rule.eurPerM2Wall) || 360
        : Number(rule.eurPerM2Free) || 395;
      rawPrice = m2 * perM2;
    }
  }

  const kedvAlap = Math.max(0, applyModelRule(rawPrice, rule));
  const listaAr = Math.trunc(kedvAlap * listaSzorzo);

  let szerelesPct = rule.szerelesPctLow ?? 11;
  let szerelesEur = 0;
  if (rule.szerelesMode === 'fixed') {
    szerelesEur = Number(rule.szerelesFixEur) || 550;
    szerelesPct = kedvAlap > 0 ? Math.round((szerelesEur / kedvAlap) * 100) : 10;
  } else {
    if (kedvAlap >= (rule.szerelesThreshold2 || 7500)) {
      szerelesPct = rule.szerelesPctHigh ?? rule.szerelesPctMid ?? 10;
    } else if (kedvAlap >= (rule.szerelesThreshold1 || 5000)) {
      szerelesPct = rule.szerelesPctMid ?? 10;
    } else {
      szerelesPct = rule.szerelesPctLow ?? 11;
    }
    szerelesEur = Math.max(
      Number(rule.szerelesMinEur) || 0,
      Math.trunc(kedvAlap * (szerelesPct / 100))
    );
  }

  const motorEur = Number(rule.motorEur) || 0;
  const taviranyitoEur = Number(rule.taviranyitoEur) || 0;
  const osszesenEur = kedvAlap + motorEur + taviranyitoEur + szerelesEur;

  // Side options (ZIP & Üvegfal)
  const allowZip = rule.allowZipSide !== false;
  const allowUvegfal = rule.allowUvegfalSide !== false;

  const widthNet = Math.max(50, isWall ? calcWidth - 8.5 : calcWidth - 17);
  const projNet = Math.max(50, calcProj - 17);

  const zipW = allowZip ? calcRefleksolZipSide(widthNet, height, config) : 0;
  const zipP = allowZip ? calcRefleksolZipSide(projNet, height, config) : 0;
  const zipSzer = allowZip
    ? Math.trunc((zipW + zipP) * (config.general.zipSzerelesPergolaPct / 100))
    : 0;
  const zipOssz = zipW + zipP + zipSzer;

  const uvegW = allowUvegfal
    ? calcUvegfalSide(widthNet, height, config.m2Tiers.uvegfalLengyel, config)
    : 0;
  const uvegP = allowUvegfal
    ? calcUvegfalSide(projNet, height, config.m2Tiers.uvegfalLengyel, config)
    : 0;
  const uvegSzer = allowUvegfal
    ? Math.trunc((uvegW + uvegP) * (config.general.uvegfalSzerelesPct / 100))
    : 0;
  const uvegOssz = uvegW + uvegP + uvegSzer;

  const legsCount = isWall ? (calcProj > 450 ? 3 : 2) : calcProj > 450 ? 6 : 4;
  const warnings: string[] = [];
  if (
    (rule.supportedMountTypes === 'wall_only' && !isWall) ||
    (rule.supportedMountTypes === 'free_only' && isWall)
  ) {
    warnings.push(
      rule.supportedMountTypes === 'wall_only'
        ? 'Ez a sablon elsősorban épülethez rögzített kivitelben érhető el.'
        : 'Ez a sablon elsősorban szabadon álló kivitelben érhető el.'
    );
  }
  const sizeWarn = buildSizeWarning(
    projection,
    width,
    height,
    calcProj,
    calcWidth,
    height
  );
  if (sizeWarn) warnings.push(sizeWarn);

  return {
    modelId: rule.id,
    modelName: rule.name,
    subtitle:
      rule.description ||
      `Egyedi sablon (${calcProj}×${calcWidth} cm • ${m2.toFixed(1)} m²)`,
    enabled: rule.enabled,
    calculatedProjection: calcProj,
    calculatedWidth: calcWidth,
    calculatedHeight: height,
    sizeWarning: warnings.join(' '),
    legsCount,
    modulesCount: calcProj > 600 ? 2 : 1,
    listaArEur: listaAr,
    kedvezmenyesAlaparEur: kedvAlap,
    motorEur,
    taviranyitoEur,
    szerelesEur,
    szerelesPct,
    customDiscountPct: 0,
    alapszerkezetOsszesenEur: osszesenEur,
    alapszerkezetOsszesenHuf: roundHuf(osszesenEur, eurHufRate),
    ledEur: Number(rule.ledEur) || 0,
    ledHuf: roundHuf(Number(rule.ledEur) || 0, eurHufRate),
    zipWidthNetCm: widthNet,
    zipProjectionNetCm: projNet,
    zipWidthEur: zipW,
    zipProjectionEur: zipP,
    zipSzerelesEur: zipSzer,
    zipOsszesenEur: zipOssz,
    zipOsszesenHuf: roundHuf(zipOssz, eurHufRate),
    uvegfalWidthTablak: allowUvegfal ? getUvegfalTablakSzama(widthNet) : 0,
    uvegfalProjectionTablak: allowUvegfal ? getUvegfalTablakSzama(projNet) : 0,
    uvegfalWidthEur: uvegW,
    uvegfalProjectionEur: uvegP,
    uvegfalSzerelesEur: uvegSzer,
    uvegfalOsszesenEur: uvegOssz,
    uvegfalOsszesenHuf: roundHuf(uvegOssz, eurHufRate),
    pdfPhotos: rule.pdfPhotos,
  };
}

export function calculateQuoteOptions(
  input: QuoteCalculationInput,
  config: AdminConfig
): CalculatedModelOption[] {
  const builtinResults = calculateBuiltinQuoteOptions(input, config);
  const builtinIds = new Set(builtinResults.map((r) => r.modelId));

  const customRules = Object.values(config.models || {}).filter(
    (rule) =>
      rule.isCustomTemplate &&
      rule.category === input.termekTipus &&
      !builtinIds.has(rule.id)
  );

  const customResults = customRules.map((rule) =>
    calculateSingleCustomTemplate(rule, input, config)
  );

  return [...builtinResults, ...customResults].map((opt) => ({
    ...opt,
    pdfPhotos:
      opt.pdfPhotos && opt.pdfPhotos.length >= 2
        ? opt.pdfPhotos
        : config.models?.[opt.modelId]?.pdfPhotos?.length
        ? config.models[opt.modelId].pdfPhotos
        : getDefaultPhotosForModel(opt.modelId, input.termekTipus),
  }));
}
