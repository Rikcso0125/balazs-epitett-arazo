import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateLivePreviewPdf,
  getLivePreviewPdfPath,
} from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pdfPath = await generateLivePreviewPdf(body || {});
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'Nem sikerült legenerálni az előnézeti PDF-et.' },
        { status: 500 }
      );
    }

    const t = Date.now();
    const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
    return NextResponse.json({
      ok: true,
      url: `/api/quotes/preview-pdf?t=${t}`,
      pdfBase64,
      timestamp: t,
    });
  } catch (e: any) {
    console.error('POST /api/quotes/preview-pdf error:', e);
    return NextResponse.json(
      { error: e?.message || 'Hiba az előnézeti PDF generálásakor.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const previewPath = getLivePreviewPdfPath();
  if (!fs.existsSync(previewPath)) {
    return NextResponse.json(
      { error: 'Még nincs legenerált előnézeti PDF.' },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(previewPath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="arajanlat_elonezet.pdf"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
