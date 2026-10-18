import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ category: string; filename: string }> }
) {
  const { filename } = await context.params;
  const safeName = path.basename(decodeURIComponent(filename));

  const candidates = [
    path.join(process.cwd(), 'public', 'uploads', safeName),
    path.join(os.tmpdir(), 'custom-pricer-uploads', safeName),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const bytes = fs.readFileSync(filePath);
      const ext = path.extname(safeName).toLowerCase();
      const contentType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  }

  return new NextResponse('Not found', { status: 404 });
}
