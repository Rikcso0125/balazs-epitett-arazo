import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ADMIN_CONFIG } from '@/lib/constants';
import { getDb, saveDb, syncConfigToLegacyArkepzok } from '@/lib/db';
import { calculateQuoteOptions } from '@/lib/pricing-engine';
import { AdminConfig } from '@/lib/types';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const newConfig = body.config as AdminConfig;
    const recalculateAll = Boolean(body.recalculateAll);

    const db = getDb();
    db.config = newConfig;

    // Sync to legacy _internal/arkepzok.json
    syncConfigToLegacyArkepzok(newConfig);

    if (recalculateAll) {
      db.quotes = db.quotes.map((q) => {
        const opts = calculateQuoteOptions(
          {
            termekTipus: q.termekTipus,
            beepitesTipus: q.beepitesTipus,
            projection: q.projection,
            width: q.width,
            height: q.height,
            eurHufRate: q.eurHufRate,
          },
          newConfig
        );
        const firstEnabled = opts.find((o) => o.enabled) || opts[0];
        return {
          ...q,
          calculatedOptions: opts,
          primaryEur: firstEnabled ? firstEnabled.alapszerkezetOsszesenEur : q.primaryEur,
          primaryHuf: firstEnabled ? firstEnabled.alapszerkezetOsszesenHuf : q.primaryHuf,
          updatedAt: new Date().toISOString(),
        };
      });
    }

    saveDb(db);
    return NextResponse.json({ ok: true, config: db.config, quotes: db.quotes });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Hiba a konfiguráció mentésekor' },
      { status: 500 }
    );
  }
}

export async function POST() {
  const db = getDb();
  db.config = JSON.parse(JSON.stringify(DEFAULT_ADMIN_CONFIG));
  syncConfigToLegacyArkepzok(db.config);
  saveDb(db);
  return NextResponse.json({ ok: true, config: db.config });
}
