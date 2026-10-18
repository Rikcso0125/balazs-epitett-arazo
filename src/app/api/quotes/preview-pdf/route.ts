import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { renderEditableQuotePdfBytes } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const pdfBytes = await renderEditableQuotePdfBytes(body, db.config);
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return NextResponse.json({
      ok: true,
      pdfBase64,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Előnézeti PDF hiba' },
      { status: 500 }
    );
  }
}
