import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { generateOfficialPdfForQuote } from '@/lib/pdf-generator';
import { calculateQuoteOptions, roundHuf } from '@/lib/pricing-engine';
import {
  BeepitesTipusId,
  CalculatedModelOption,
  QuoteRecord,
  TermekTipusId,
} from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const termekTipus = (body.termekTipus || 'bioklimatikus') as TermekTipusId;
    const beepitesTipus = (body.beepitesTipus || 'Épülethez rögzített') as BeepitesTipusId;
    const projection = Number(body.projection) || 500;
    const width = Number(body.width) || 400;
    const height = Number(body.height) || 250;
    const eurHufRate = Number(body.eurHufRate) || db.config.general.defaultEurHufRate;
    const szallitasiDijHuf =
      body.szallitasiDijHuf !== undefined
        ? Number(body.szallitasiDijHuf)
        : db.config.general.defaultSzallitasiDij;

    let calculatedOptions: CalculatedModelOption[] =
      Array.isArray(body.calculatedOptions) && body.calculatedOptions.length > 0
        ? body.calculatedOptions
        : calculateQuoteOptions(
            { termekTipus, beepitesTipus, projection, width, height, eurHufRate },
            db.config
          );

    const enabledOpts = calculatedOptions.filter((o) => o.enabled);
    const primaryOpt = enabledOpts[0] || calculatedOptions[0];
    const primaryEur = primaryOpt ? primaryOpt.alapszerkezetOsszesenEur : 0;
    const primaryHuf = primaryOpt
      ? primaryOpt.alapszerkezetOsszesenHuf
      : roundHuf(primaryEur, eurHufRate);

    const now = new Date();
    const id = `quote-${Date.now()}`;
    const trackingId = `trk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextNum = db.quotes.length + 1;
    const customerName = (body.customerName || 'Ügyfél').trim();
    const greetingName = customerName.split(' ').slice(-1)[0] || customerName;

    const newQuote: QuoteRecord = {
      id,
      quoteNumber: `OSP-${now.getFullYear()}-${String(nextNum).padStart(3, '0')}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: 'piszkozat',
      customerName,
      greetingName,
      email: (body.email || '').trim(),
      phone: (body.phone || '').trim(),
      city: (body.city || 'Budapest').trim(),
      szallitasiDijHuf,
      eurHufRate,
      termekTipus,
      beepitesTipus,
      projection,
      width,
      height,
      hasUvegfal: Boolean(body.hasUvegfal),
      hasZip: Boolean(body.hasZip),
      hasNoSideWall: Boolean(body.hasNoSideWall),
      hasLed: body.hasLed !== undefined ? Boolean(body.hasLed) : true,
      hasSensors: body.hasSensors !== undefined ? Boolean(body.hasSensors) : true,
      hasHeating: body.hasHeating !== undefined ? Boolean(body.hasHeating) : true,
      hasSmartHome: Boolean(body.hasSmartHome),
      calculatedOptions,
      selectedOptionIndex: 0,
      primaryEur,
      primaryHuf,
      customNotes: body.customNotes || '',
      isHistoricalPdf: false,
      isEdited: false,
      trackingId,
      sentCount: 0,
      openCount: 0,
    };

    // Generate authentic multi-page PDF via embedded Python + wkhtmltopdf + PyMuPDF
    if (body.generatePdf !== false) {
      const pdfFile = await generateOfficialPdfForQuote(newQuote);
      if (pdfFile) {
        newQuote.filename = pdfFile;
      }
    }

    db.quotes.unshift(newQuote);
    saveDb(db);

    return NextResponse.json({ ok: true, quote: newQuote });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Hiba az árajánlat létrehozásakor' },
      { status: 500 }
    );
  }
}
