import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { LEGACY_ROOT_DIR } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  uploaded: 'Saját feltöltött fotók',
  bioklimatikus: 'Bioklimatikus pergola',
  elhuzhato_ponyvas: 'Elhúzható ponyvás pergola',
  feszitett_vasznas: 'Feszített vásznas pergola',
  feszitett_vasznas_tetore: 'Tetőre szerelt feszített vásznas',
  polikarbonatos: 'Polikarbonátos előtető',
  uvegfalas: 'Üvegfal rendszer',
  uvegtetos: 'Üvegtetős pergola',
  ZIPes: 'ZIP oldalsó árnyékoló',
};

const SKIP_FILES: Record<string, Set<string>> = {
  bioklimatikus: new Set([
    'image_04.png',
    'image_05.png',
    'image_06.png',
    'image_07.png',
    'image_08.png',
    'image_11.png',
    'image_12.png',
    'image_16.png',
    'image_20.jpg',
  ]),
};

export interface GalleryImageItem {
  id: string;
  category: string;
  categoryLabel: string;
  filename: string;
  url: string;
}

export async function GET() {
  const items: GalleryImageItem[] = [];
  const seenUploaded = new Set<string>();

  // 1. User-uploaded images in /tmp/opensky-uploads/templates or public/uploads/templates
  const uploadDirs = [
    path.join(os.tmpdir(), 'opensky-uploads', 'templates'),
    path.join(process.cwd(), 'public', 'uploads', 'templates'),
  ];

  for (const uploadDir of uploadDirs) {
    if (fs.existsSync(uploadDir)) {
      const files = fs
        .readdirSync(uploadDir)
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
        .sort()
        .reverse();
      for (const fn of files) {
        if (seenUploaded.has(fn)) continue;
        seenUploaded.add(fn);
        items.push({
          id: `uploaded/${fn}`,
          category: 'uploaded',
          categoryLabel: CATEGORY_LABELS.uploaded,
          filename: fn,
          url: `/api/template-images/uploaded/${encodeURIComponent(fn)}`,
        });
      }
    }
  }

  // 2. Built-in category images (from bundled public/template-assets or legacy root)
  const bundledRoot = path.join(process.cwd(), 'public', 'template-assets');
  const legacyTemplatesRoot = path.join(
    LEGACY_ROOT_DIR,
    '_internal',
    'backend',
    'templates'
  );
  const categories = [
    'bioklimatikus',
    'elhuzhato_ponyvas',
    'feszitett_vasznas',
    'feszitett_vasznas_tetore',
    'polikarbonatos',
    'uvegfalas',
    'uvegtetos',
    'ZIPes',
  ];

  for (const cat of categories) {
    let imgDir = path.join(bundledRoot, cat, 'images');
    if (!fs.existsSync(imgDir)) {
      imgDir = path.join(legacyTemplatesRoot, cat, 'images');
    }
    if (!fs.existsSync(imgDir)) continue;

    const allFiles = fs
      .readdirSync(imgDir)
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .sort();

    const candidateFiles =
      allFiles.length > 1 ? allFiles.slice(0, -1) : allFiles;
    const skipSet = SKIP_FILES[cat] || new Set<string>();

    for (const fn of candidateFiles) {
      if (skipSet.has(fn)) continue;
      try {
        const stat = fs.statSync(path.join(imgDir, fn));
        if (stat.size < 8000) continue;
      } catch {
        continue;
      }
      items.push({
        id: `${cat}/${fn}`,
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat] || cat,
        filename: fn,
        url: `/api/template-images/${encodeURIComponent(
          cat
        )}/${encodeURIComponent(fn)}`,
      });
    }
  }

  return NextResponse.json({ images: items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, dataUrl } = body as {
      filename?: string;
      dataUrl?: string;
    };
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Érvénytelen képfájl formátum.' },
        { status: 400 }
      );
    }

    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: 'Nem sikerült dekódolni a képet.' },
        { status: 400 }
      );
    }

    const extRaw = match[1].toLowerCase();
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw === 'png' ? 'png' : 'jpg';
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const baseName = (filename || 'foto')
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 40);

    const savedName = `${Date.now()}_${baseName || 'foto'}.${ext}`;

    let savedOk = false;
    if (!process.env.VERCEL) {
      try {
        const uploadDir = path.join(
          process.cwd(),
          'public',
          'uploads',
          'templates'
        );
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, savedName), buffer);
        savedOk = true;
      } catch {
        // fallback to tmp
      }
    }
    if (!savedOk) {
      const tmpUploadDir = path.join(os.tmpdir(), 'opensky-uploads', 'templates');
      fs.mkdirSync(tmpUploadDir, { recursive: true });
      fs.writeFileSync(path.join(tmpUploadDir, savedName), buffer);
    }

    const url = process.env.VERCEL
      ? dataUrl
      : `/api/template-images/uploaded/${encodeURIComponent(savedName)}`;
    return NextResponse.json({
      id: `uploaded/${savedName}`,
      category: 'uploaded',
      categoryLabel: CATEGORY_LABELS.uploaded,
      filename: savedName,
      url,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Hiba a képfeltöltés során.' },
      { status: 500 }
    );
  }
}
