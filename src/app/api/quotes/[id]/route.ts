import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { generateOfficialPdfForQuote } from '@/lib/pdf-generator';
import { calculateQuoteOptions, roundHuf } from '@/lib/pricing-engine';
import { CalculatedModelOption, QuoteStatus } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const db = getDb();

    const idx = db.quotes.findIndex((q) => q.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Árajánlat nem található' }, { status: 404 });
    }

    const existing = db.quotes[idx];
    const now = new Date().toISOString();

    const termekTipus = body.termekTipus ?? existing.termekTipus;
    const beepitesTipus = body.beepitesTipus ?? existing.beepitesTipus;
    const projection =
      body.projection !== undefined ? Number(body.projection) : existing.projection;
    const width = body.width !== undefined ? Number(body.width) : existing.width;
    const height = body.height !== undefined ? Number(body.height) : existing.height;
    const eurHufRate =
      body.eurHufRate !== undefined ? Number(body.eurHufRate) : existing.eurHufRate;

    let calculatedOptions: CalculatedModelOption[] = existing.calculatedOptions;

    if (body.recalculate) {
      calculatedOptions = calculateQuoteOptions(
        { termekTipus, beepitesTipus, projection, width, height, eurHufRate },
        db.config
      );
    } else if (Array.isArray(body.calculatedOptions)) {
      calculatedOptions = body.calculatedOptions.map((opt: CalculatedModelOption) => {
        const discountMultiplier = 1 - (Number(opt.customDiscountPct) || 0) / 100;
        const rawSum =
          Number(opt.kedvezmenyesAlaparEur) +
          Number(opt.motorEur) +
          Number(opt.taviranyitoEur) +
          Number(opt.szerelesEur);
        const discountedEur = Math.round(rawSum * discountMultiplier);
        return {
          ...opt,
          alapszerkezetOsszesenEur: discountedEur,
          alapszerkezetOsszesenHuf: roundHuf(discountedEur, eurHufRate),
          ledHuf: roundHuf(Number(opt.ledEur) || 0, eurHufRate),
          zipOsszesenHuf: roundHuf(Number(opt.zipOsszesenEur) || 0, eurHufRate),
          uvegfalOsszesenHuf: roundHuf(Number(opt.uvegfalOsszesenEur) || 0, eurHufRate),
        };
      });
    }

    const selectedIdx =
      body.selectedOptionIndex !== undefined
        ? Number(body.selectedOptionIndex)
        : existing.selectedOptionIndex || 0;
    const enabledOpts = calculatedOptions.filter((o) => o.enabled);
    const primaryOpt =
      calculatedOptions[selectedIdx] && calculatedOptions[selectedIdx].enabled
        ? calculatedOptions[selectedIdx]
        : enabledOpts[0] || calculatedOptions[0];

    const primaryEur =
      body.primaryEur !== undefined
        ? Number(body.primaryEur)
        : primaryOpt
        ? primaryOpt.alapszerkezetOsszesenEur
        : existing.primaryEur;
    const primaryHuf = roundHuf(primaryEur, eurHufRate);

    const newStatus = (body.status ?? existing.status) as QuoteStatus;
    const acceptedAt =
      newStatus === 'elfogadva' && !existing.acceptedAt ? now : existing.acceptedAt;

    const customerName =
      body.customerName !== undefined ? body.customerName.trim() : existing.customerName;
    const greetingName =
      body.greetingName !== undefined
        ? body.greetingName.trim()
        : customerName.split(' ').slice(-1)[0] || customerName;

    const updated: typeof existing = {
      ...existing,
      updatedAt: now,
      status: newStatus,
      acceptedAt,
      customerName,
      greetingName,
      email: body.email !== undefined ? body.email.trim() : existing.email,
      phone: body.phone !== undefined ? body.phone.trim() : existing.phone,
      city: body.city !== undefined ? body.city.trim() : existing.city,
      szallitasiDijHuf:
        body.szallitasiDijHuf !== undefined
          ? Number(body.szallitasiDijHuf)
          : existing.szallitasiDijHuf,
      eurHufRate,
      termekTipus,
      beepitesTipus,
      projection,
      width,
      height,
      hasUvegfal:
        body.hasUvegfal !== undefined ? Boolean(body.hasUvegfal) : existing.hasUvegfal,
      hasZip: body.hasZip !== undefined ? Boolean(body.hasZip) : existing.hasZip,
      hasNoSideWall:
        body.hasNoSideWall !== undefined
          ? Boolean(body.hasNoSideWall)
          : existing.hasNoSideWall,
      hasLed: body.hasLed !== undefined ? Boolean(body.hasLed) : existing.hasLed,
      hasSensors:
        body.hasSensors !== undefined ? Boolean(body.hasSensors) : existing.hasSensors,
      hasHeating:
        body.hasHeating !== undefined ? Boolean(body.hasHeating) : existing.hasHeating,
      hasSmartHome:
        body.hasSmartHome !== undefined
          ? Boolean(body.hasSmartHome)
          : existing.hasSmartHome,
      calculatedOptions,
      selectedOptionIndex: selectedIdx,
      primaryEur,
      primaryHuf,
      customNotes:
        body.customNotes !== undefined ? body.customNotes : existing.customNotes,
      isEdited: true,
    };

    if (body.regeneratePdf) {
      const pdfFile = await generateOfficialPdfForQuote(updated);
      if (pdfFile) {
        updated.filename = pdfFile;
      }
    }

    db.quotes[idx] = updated;
    saveDb(db);

    return NextResponse.json({ ok: true, quote: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Hiba az árajánlat mentésekor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = getDb();
  db.quotes = db.quotes.filter((q) => q.id !== id);
  saveDb(db);
  return NextResponse.json({ ok: true });
}
