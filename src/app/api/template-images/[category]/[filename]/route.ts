import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { LEGACY_ROOT_DIR } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ category: string; filename: string }> }
) {
  const { category, filename } = await context.params;
  const safeCat = path.basename(decodeURIComponent(category));
  const safeFile = path.basename(decodeURIComponent(filename));

  let filePath = '';

  if (safeCat === 'uploaded') {
    const tmpCandidate = path.join(
      os.tmpdir(),
      'opensky-uploads',
      'templates',
      safeFile
    );
    const publicCandidate = path.join(
      process.cwd(),
      'public',
      'uploads',
      'templates',
      safeFile
    );
    if (fs.existsSync(tmpCandidate)) {
      filePath = tmpCandidate;
    } else if (fs.existsSync(publicCandidate)) {
      filePath = publicCandidate;
    }
  } else {
    // 1. Check bundled public/template-assets/<category>/images/<filename>
    const bundledCandidate = path.join(
      process.cwd(),
      'public',
      'template-assets',
      safeCat,
      'images',
      safeFile
    );
    if (fs.existsSync(bundledCandidate)) {
      filePath = bundledCandidate;
    }

    // 2. Fallback to legacy root if local
    if (!filePath) {
      const legacyCandidate = path.join(
        LEGACY_ROOT_DIR,
        '_internal',
        'backend',
        'templates',
        safeCat,
        'images',
        safeFile
      );
      if (fs.existsSync(legacyCandidate)) {
        filePath = legacyCandidate;
      }
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Kép nem található' }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
      ? 'image/webp'
      : 'image/jpeg';

  const buf = fs.readFileSync(filePath);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
