import fs from 'fs';
import os from 'os';
import path from 'path';
import extractedData from '@/data/extracted_summary.json';
import {
  DEFAULT_ADMIN_CONFIG,
  getDefaultPhotosForModel,
} from './constants';
import { calculateQuoteOptions } from './pricing-engine';
import {
  AdminConfig,
  BeepitesTipusId,
  QuoteRecord,
  TermekTipusId,
  TrackingEvent,
} from './types';

export interface DatabaseSchema {
  config: AdminConfig;
  quotes: QuoteRecord[];
  trackingEvents: TrackingEvent[];
}

const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');
const BUNDLED_DB_PATH = path.join(BUNDLED_DATA_DIR, 'db.json');

const TMP_DATA_DIR = path.join(os.tmpdir(), 'opensky-data');
const TMP_DB_PATH = path.join(TMP_DATA_DIR, 'db.json');

export const LEGACY_ROOT_DIR = path.resolve(
  process.cwd(),
  '..',
  'OpenSkyPergola_program_release_v1.3 - final',
  'OpenSkyPergola_program_release_v1.3 - final'
);
export const LEGACY_AJANLATOK_DIR = path.join(LEGACY_ROOT_DIR, 'ajanlatok');
export const LEGACY_ARKEPZOK_JSON = path.join(
  LEGACY_ROOT_DIR,
  '_internal',
  'arkepzok.json'
);

declare global {
  // eslint-disable-next-line no-var
  var __openskyDbCache: DatabaseSchema | undefined;
}

function buildInitialDatabase(): DatabaseSchema {
  const config: AdminConfig = JSON.parse(JSON.stringify(DEFAULT_ADMIN_CONFIG));

  // Sync from legacy arkepzok.json if present
  try {
    if (fs.existsSync(LEGACY_ARKEPZOK_JSON)) {
      const rawArkepzok = JSON.parse(
        fs.readFileSync(LEGACY_ARKEPZOK_JSON, 'utf-8')
      );
      if (rawArkepzok.LISTA_AR_SZORZO) {
        config.general.listaArSzorzo = Number(rawArkepzok.LISTA_AR_SZORZO);
      }
      const mapKeyToModel: Record<string, string> = {
        ARKEPZO_SB400: 'SB400',
        ARKEPZO_SESKY_BIO: 'SESKY_BIO',
        ARKEPZO_KEDRY_SKYLIFE: 'KEDRY_SKYLIFE',
        ARKEPZO_REFLEKSOL_120_ZIP: 'REFLEKSOL_120_ZIP',
        ARKEPZO_VERTICA_PRIME_ZIP: 'VERTICA_PRIME_ZIP',
        ARKEPZO_UVEGFAL_RENDSZER: 'UVEGFAL_RENDSZER',
        ARKEPZO_PERGOLA_V_ZIIP: 'PERGOLA_V_ZIIP',
        ARKEPZO_HYDRA: 'HYDRA',
        ARKEPZO_A100LUX: 'A100LUX',
        ARKEPZO_POLIFIX: 'POLIFIX',
        ARKEPZO_VERANDA_TENS_UVEGTETOS: 'VERANDA_TENS_UVEGTETOS',
        ARKEPZO_KEPLAN: 'KEPLAN',
        ARKEPZO_ISOLA_2A: 'ISOLA_2A',
        ARKEPZO_VERANDA_TENS_FESZITETT_VASZNAS_TETORE: 'VERANDA_TENS_TETORE',
        ARKEPZO_VERANDA_V_ZIP: 'VERANDA_V_ZIP',
      };
      for (const [k, modelId] of Object.entries(mapKeyToModel)) {
        if (rawArkepzok[k] !== undefined && config.models[modelId]) {
          config.models[modelId].szorzo = Number(rawArkepzok[k]);
        }
      }
    }
  } catch {
    // ignore
  }

  const rawQuotes = (extractedData.quotes || []) as any[];
  const quotes: QuoteRecord[] = [];
  const trackingEvents: TrackingEvent[] = [];

  rawQuotes.forEach((rq, index) => {
    const termekTipus = (rq.termekTipus || 'bioklimatikus') as TermekTipusId;
    const beepitesTipus = (rq.beepitesTipus ||
      'Épülethez rögzített') as BeepitesTipusId;
    const projection = Number(rq.projection) || 500;
    const width = Number(rq.width) || 400;
    const height = Number(rq.height) || 250;
    const eurHufRate = Number(rq.eurHufRate) || 400;

    const calculatedOptions = calculateQuoteOptions(
      { termekTipus, beepitesTipus, projection, width, height, eurHufRate },
      config
    );

    const primaryEur =
      Number(rq.primaryEur) ||
      calculatedOptions[0]?.alapszerkezetOsszesenEur ||
      0;
    const primaryHuf =
      Number(rq.primaryHuf) ||
      Math.round((primaryEur * eurHufRate) / 1000) * 1000;

    if (calculatedOptions[0] && rq.primaryEur) {
      calculatedOptions[0].alapszerkezetOsszesenEur = primaryEur;
      calculatedOptions[0].alapszerkezetOsszesenHuf = primaryHuf;
    }

    const quoteId =
      rq.id || `quote-hist-${String(index + 1).padStart(3, '0')}`;
    const trackingId = `trk-${quoteId}`;
    const dateStr = (rq.createdAt || '2025-10-15').slice(0, 10);
    const yearStr = dateStr.slice(0, 4) || '2025';

    quotes.push({
      id: quoteId,
      quoteNumber: `OSP-${yearStr}-${String(index + 1).padStart(3, '0')}`,
      filename: rq.filename,
      createdAt: dateStr,
      updatedAt: dateStr,
      status: 'piszkozat',
      customerName: rq.customerName || 'Ügyfél',
      greetingName: rq.greetingName || rq.customerName || 'Ügyfél',
      email: '',
      phone: '',
      city: rq.city || '',
      szallitasiDijHuf: 40000,
      eurHufRate,
      termekTipus,
      beepitesTipus,
      projection,
      width,
      height,
      hasUvegfal: Boolean(rq.hasUvegfal),
      hasZip: Boolean(rq.hasZip),
      hasNoSideWall: !rq.hasUvegfal && !rq.hasZip,
      hasLed: true,
      hasSensors: true,
      hasHeating: true,
      hasSmartHome: false,
      calculatedOptions,
      selectedOptionIndex: 0,
      primaryEur,
      primaryHuf,
      customNotes: '',
      isHistoricalPdf: true,
      isEdited: Boolean(rq.isEdited),
      pageCount: rq.pageCount || 8,
      trackingId,
      sentCount: 0,
      openCount: 0,
    });
  });

  quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { config, quotes, trackingEvents };
}

function backfillModelPhotos(parsed: DatabaseSchema): boolean {
  let mutated = false;
  if (parsed?.config?.models) {
    for (const [modelId, model] of Object.entries(parsed.config.models)) {
      if (!model.pdfPhotos || model.pdfPhotos.length < 2) {
        model.pdfPhotos = getDefaultPhotosForModel(modelId, model.category);
        mutated = true;
      }
    }
  }
  return mutated;
}

export function getDb(): DatabaseSchema {
  const isVercel = Boolean(process.env.VERCEL);

  // 1. On Vercel, check /tmp/opensky-data/db.json or globalThis cache first
  if (isVercel) {
    if (fs.existsSync(TMP_DB_PATH)) {
      try {
        const raw = fs.readFileSync(TMP_DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        backfillModelPhotos(parsed);
        globalThis.__openskyDbCache = parsed;
        return parsed;
      } catch {
        // fallback
      }
    }
    if (globalThis.__openskyDbCache) {
      return globalThis.__openskyDbCache;
    }
  }

  // 2. Read bundled data/db.json if it exists
  if (fs.existsSync(BUNDLED_DB_PATH)) {
    try {
      const raw = fs.readFileSync(BUNDLED_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      const mutated = backfillModelPhotos(parsed);
      if (mutated) {
        saveDb(parsed);
      }
      globalThis.__openskyDbCache = parsed;
      return parsed;
    } catch {
      // fallback
    }
  }

  // 3. Build initial database and save
  const initial = buildInitialDatabase();
  saveDb(initial);
  return initial;
}

export function saveDb(db: DatabaseSchema): void {
  globalThis.__openskyDbCache = db;
  const jsonStr = JSON.stringify(db, null, 2);

  if (!process.env.VERCEL) {
    try {
      if (!fs.existsSync(BUNDLED_DATA_DIR)) {
        fs.mkdirSync(BUNDLED_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(BUNDLED_DB_PATH, jsonStr, 'utf-8');
      return;
    } catch {
      // Fall through to /tmp if local write fails
    }
  }

  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TMP_DB_PATH, jsonStr, 'utf-8');
  } catch (e) {
    console.error('Failed to write db to tmp:', e);
  }
}

export function syncConfigToLegacyArkepzok(config: AdminConfig): void {
  try {
    if (!fs.existsSync(path.dirname(LEGACY_ARKEPZOK_JSON))) return;
    const legacyObj = {
      LISTA_AR_SZORZO: config.general.listaArSzorzo,
      ARKEPZO_SB400: config.models.SB400?.szorzo ?? 0.66,
      ARKEPZO_SESKY_BIO: config.models.SESKY_BIO?.szorzo ?? 1.0,
      ARKEPZO_KEDRY_SKYLIFE: config.models.KEDRY_SKYLIFE?.szorzo ?? 0.65,
      ARKEPZO_REFLEKSOL_120_ZIP:
        config.models.REFLEKSOL_120_ZIP?.szorzo ?? 1.0,
      ARKEPZO_VERTICA_PRIME_ZIP:
        config.models.VERTICA_PRIME_ZIP?.szorzo ?? 0.65,
      ARKEPZO_UVEGFAL_RENDSZER: config.models.UVEGFAL_RENDSZER?.szorzo ?? 1.0,
      ARKEPZO_PERGOLA_V_ZIIP: config.models.PERGOLA_V_ZIIP?.szorzo ?? 0.66,
      ARKEPZO_HYDRA: config.models.HYDRA?.szorzo ?? 0.65,
      ARKEPZO_A100LUX: config.models.A100LUX?.szorzo ?? 0.65,
      ARKEPZO_POLIFIX: config.models.POLIFIX?.szorzo ?? 1.0,
      ARKEPZO_VERANDA_TENS_UVEGTETOS:
        config.models.VERANDA_TENS_UVEGTETOS?.szorzo ?? 0.66,
      ARKEPZO_KEPLAN: config.models.KEPLAN?.szorzo ?? 0.65,
      ARKEPZO_ISOLA_2A: config.models.ISOLA_2A?.szorzo ?? 0.65,
      ARKEPZO_VERANDA_TENS_FESZITETT_VASZNAS_TETORE:
        config.models.VERANDA_TENS_TETORE?.szorzo ?? 1.0,
      ARKEPZO_VERANDA_V_ZIP: config.models.VERANDA_V_ZIP?.szorzo ?? 0.66,
    };
    fs.writeFileSync(
      LEGACY_ARKEPZOK_JSON,
      JSON.stringify(legacyObj, null, 4),
      'utf-8'
    );
  } catch (e) {
    console.error('Failed to sync legacy arkepzok.json:', e);
  }
}
