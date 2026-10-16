import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await context.params;
  const cleanId = trackingId.replace(/\.(gif|png)$/i, '');

  try {
    const db = getDb();
    const quote = db.quotes.find(
      (q) => q.trackingId === cleanId || q.id === cleanId
    );

    // Only record tracking pixel opens for quotes that were genuinely sent to a real email address
    const recipientEmail = (quote?.sentToEmail || quote?.email || '').trim();
    if (quote && quote.sentCount > 0 && recipientEmail.includes('@')) {
      const now = new Date().toISOString();
      quote.openCount = (quote.openCount || 0) + 1;
      if (!quote.firstOpenedAt) {
        quote.firstOpenedAt = now;
      }
      quote.lastOpenedAt = now;
      quote.updatedAt = now;

      if (quote.status === 'kikuldve' || quote.status === 'piszkozat') {
        quote.status = 'megnyitva';
      }

      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1';
      const ua = req.headers.get('user-agent') || 'Email Client';

      db.trackingEvents.unshift({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        quoteId: quote.id,
        trackingId: quote.trackingId,
        customerName: quote.customerName,
        email: recipientEmail,
        openedAt: now,
        ipAddress: ip,
        userAgent: ua,
        isSimulated: false,
      });

      saveDb(db);
    }
  } catch (e) {
    console.error('Tracking pixel error:', e);
  }

  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF_BUFFER.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
