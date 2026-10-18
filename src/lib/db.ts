import fs from 'fs';
import os from 'os';
import path from 'path';
import { DEFAULT_SYSTEM_CONFIG } from './constants';
import { DatabaseSchema } from './types';

const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');
const BUNDLED_DB_PATH = path.join(BUNDLED_DATA_DIR, 'db.json');

const TMP_DATA_DIR = path.join(os.tmpdir(), 'custom-pricer-data');
const TMP_DB_PATH = path.join(TMP_DATA_DIR, 'db.json');

export const SAVED_PDFS_DIR = path.join(process.cwd(), 'data', 'pdfs');

declare global {
  // eslint-disable-next-line no-var
  var __customPricerDbCache: DatabaseSchema | undefined;
}

export function createEmptyDatabase(): DatabaseSchema {
  return {
    config: { ...DEFAULT_SYSTEM_CONFIG },
    categories: [],
    templates: [],
    quotes: [],
    mediaLibrary: [],
  };
}

function normalizeDatabase(raw: any): DatabaseSchema {
  const empty = createEmptyDatabase();
  if (!raw || typeof raw !== 'object') return empty;
  return {
    config: {
      ...empty.config,
      ...(raw.config && typeof raw.config === 'object' ? raw.config : {}),
    },
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
    mediaLibrary: Array.isArray(raw.mediaLibrary) ? raw.mediaLibrary : [],
  };
}

export function getDb(): DatabaseSchema {
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel) {
    if (fs.existsSync(TMP_DB_PATH)) {
      try {
        const parsed = normalizeDatabase(
          JSON.parse(fs.readFileSync(TMP_DB_PATH, 'utf-8'))
        );
        globalThis.__customPricerDbCache = parsed;
        return parsed;
      } catch {
        // ignore
      }
    }
    if (globalThis.__customPricerDbCache) {
      return globalThis.__customPricerDbCache;
    }
  }

  if (fs.existsSync(BUNDLED_DB_PATH)) {
    try {
      const parsed = normalizeDatabase(
        JSON.parse(fs.readFileSync(BUNDLED_DB_PATH, 'utf-8'))
      );
      globalThis.__customPricerDbCache = parsed;
      return parsed;
    } catch {
      // ignore
    }
  }

  const initial = createEmptyDatabase();
  saveDb(initial);
  return initial;
}

export function saveDb(data: DatabaseSchema): void {
  const normalized = normalizeDatabase(data);
  globalThis.__customPricerDbCache = normalized;
  const serialized = JSON.stringify(normalized, null, 2);

  if (!process.env.VERCEL) {
    try {
      fs.mkdirSync(BUNDLED_DATA_DIR, { recursive: true });
      fs.writeFileSync(BUNDLED_DB_PATH, serialized, 'utf-8');
      return;
    } catch {
      // fallback to tmp
    }
  }

  try {
    fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
    fs.writeFileSync(TMP_DB_PATH, serialized, 'utf-8');
  } catch (e) {
    console.error('Failed to persist db.json:', e);
  }
}
