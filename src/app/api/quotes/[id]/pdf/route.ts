import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, LEGACY_AJANLATOK_DIR, saveDb } from '@/lib/db';
import {
  generateOfficialPdfForQuote,
  TMP_PDF_DIR,
} from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

function resolveExistingPdfPath(filename?: string): string | null {
  if (!filename) return null;
  const legacyPath = path.join(LEGACY_AJANLATOK_DIR, filename);
  if (fs.existsSync(legacyPath)) return legacyPath;
  const tmpPath = path.join(TMP_PDF_DIR, filename);
  if (fs.existsSync(tmpPath)) return tmpPath;
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const download = req.nextUrl.searchParams.get('download') === '1';
  const refresh = req.nextUrl.searchParams.get('refresh') === '1';

  const db = getDb();
  const quote = db.quotes.find((q) => q.id === id);
  if (!quote) {
    return NextResponse.json(
      { error: 'Árajánlat nem található' },
      { status: 404 }
    );
  }

  let pdfPath = resolveExistingPdfPath(quote.filename);

  if (refresh || !pdfPath || !fs.existsSync(pdfPath)) {
    const generatedName = await generateOfficialPdfForQuote(quote);
    if (generatedName) {
      if (
        refresh &&
        pdfPath &&
        fs.existsSync(pdfPath) &&
        quote.filename !== generatedName &&
        !quote.isHistoricalPdf
      ) {
        try {
          fs.unlinkSync(pdfPath);
        } catch {
          // ignore
        }
      }
      quote.filename = generatedName;
      saveDb(db);
      pdfPath = resolveExistingPdfPath(generatedName);
    }
  }

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return NextResponse.json(
      { error: 'A PDF fájl nem található és nem sikerült generálni.' },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(pdfPath);
  const safeName = encodeURIComponent(
    quote.filename || `${quote.quoteNumber}_arajanlat.pdf`
  );

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${
        download ? 'attachment' : 'inline'
      }; filename*=UTF-8''${safeName}`,
    },
  });
}
