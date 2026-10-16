import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import { getDefaultPhotosForModel } from './constants';
import { getDb, LEGACY_AJANLATOK_DIR, LEGACY_ROOT_DIR } from './db';
import { AdminConfig, QuoteRecord } from './types';

const execFileAsync = promisify(execFile);

export const TMP_PDF_DIR = path.join(os.tmpdir(), 'opensky-pdfs');

function sanitizeFilenamePart(str: string): string {
  return (
    str
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, '-') || 'Ugyfel'
  );
}

function fmtDot(val: number | undefined): string {
  const n = Math.round(Number(val || 0));
  return n.toLocaleString('de-DE');
}

function fmtPlain(val: number | undefined): string {
  return String(Math.round(Number(val || 0)));
}

function resolvePhotoFilePath(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/api\/template-images\/([^/]+)\/([^/?#]+)/);
  if (m) {
    const cat = decodeURIComponent(m[1]);
    const fname = decodeURIComponent(m[2]);
    if (cat === 'uploaded') {
      const tmpP = path.join(os.tmpdir(), 'opensky-uploads', 'templates', fname);
      if (fs.existsSync(tmpP)) return tmpP;
      const pubP = path.join(
        process.cwd(),
        'public',
        'uploads',
        'templates',
        fname
      );
      if (fs.existsSync(pubP)) return pubP;
    } else {
      const bundledP = path.join(
        process.cwd(),
        'public',
        'template-assets',
        cat,
        'images',
        fname
      );
      if (fs.existsSync(bundledP)) return bundledP;
      const legacyP = path.join(
        LEGACY_ROOT_DIR,
        '_internal',
        'backend',
        'templates',
        cat,
        'images',
        fname
      );
      if (fs.existsSync(legacyP)) return legacyP;
    }
  }
  return null;
}

async function embedImageSafe(
  pdfDoc: PDFDocument,
  imgPath: string | null
): Promise<PDFImage | null> {
  if (!imgPath || !fs.existsSync(imgPath)) return null;
  try {
    const bytes = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).toLowerCase();
    if (ext === '.png') {
      return await pdfDoc.embedPng(bytes);
    }
    return await pdfDoc.embedJpg(bytes);
  } catch {
    try {
      const bytes = fs.readFileSync(imgPath);
      return await pdfDoc.embedPng(bytes);
    } catch {
      return null;
    }
  }
}

async function embedPhotoSource(
  pdfDoc: PDFDocument,
  urlOrData: string | undefined
): Promise<PDFImage | null> {
  if (!urlOrData) return null;
  const trimmed = urlOrData.trim();
  if (trimmed.startsWith('data:image/')) {
    try {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx === -1) return null;
      const b64 = trimmed.slice(commaIdx + 1);
      const bytes = Buffer.from(b64, 'base64');
      if (trimmed.startsWith('data:image/png')) {
        try {
          return await pdfDoc.embedPng(bytes);
        } catch {
          return await pdfDoc.embedJpg(bytes);
        }
      }
      try {
        return await pdfDoc.embedJpg(bytes);
      } catch {
        return await pdfDoc.embedPng(bytes);
      }
    } catch {
      return null;
    }
  }
  return embedImageSafe(pdfDoc, resolvePhotoFilePath(trimmed));
}

function wrapTextLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const paragraphs = (text || '').split(/\r?\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

async function renderQuotePdfWithPdfLib(
  quote: Partial<QuoteRecord>,
  config: AdminConfig,
  outputPdfPath: string
): Promise<boolean> {
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontRegularPath = path.join(
      process.cwd(),
      'public',
      'template-assets',
      'fonts',
      'arial.ttf'
    );
    const fontBoldPath = path.join(
      process.cwd(),
      'public',
      'template-assets',
      'fonts',
      'arialbd.ttf'
    );

    const fontRegular = await pdfDoc.embedFont(
      fs.readFileSync(fontRegularPath)
    );
    const fontBold = await pdfDoc.embedFont(fs.readFileSync(fontBoldPath));

    const bgPath = path.join(
      process.cwd(),
      'public',
      'template-assets',
      'header_footer.jpg'
    );
    const bgImg = await embedImageSafe(pdfDoc, bgPath);

    const cacheDir = path.join(
      process.cwd(),
      'public',
      'template-assets',
      '_cache'
    );
    const ralImg = await embedImageSafe(
      pdfDoc,
      path.join(cacheDir, '_ral_25.png')
    );
    const uvegRailsImg = await embedImageSafe(
      pdfDoc,
      path.join(cacheDir, '_uveg_rails.png')
    );
    const zipPhotoImg = await embedImageSafe(
      pdfDoc,
      path.join(cacheDir, '_zip_photo.png')
    );
    const balazsCardImg = await embedImageSafe(
      pdfDoc,
      path.join(cacheDir, '_balazs_card.jpg')
    );

    const A4_W = 595.28;
    const A4_H = 841.89;
    const MARGIN_X = 54;
    const CONTENT_W = A4_W - MARGIN_X * 2;
    const TOP_Y = A4_H - 108;
    const BOTTOM_Y = 76;

    const addBrandedPage = (): PDFPage => {
      const page = pdfDoc.addPage([A4_W, A4_H]);
      if (bgImg) {
        page.drawImage(bgImg, {
          x: 0,
          y: 0,
          width: A4_W,
          height: A4_H,
        });
      }
      return page;
    };

    const drawCenteredImage = (
      page: PDFPage,
      img: PDFImage | null,
      topY: number,
      targetW: number,
      maxH: number,
      align: 'center' | 'left' = 'center'
    ): number => {
      if (!img) return topY;
      const dims = img.scale(1);
      const ratio = dims.height / dims.width;
      let w = targetW;
      let h = w * ratio;
      if (h > maxH) {
        h = maxH;
        w = h / ratio;
      }
      const x =
        align === 'left' ? MARGIN_X : MARGIN_X + (CONTENT_W - w) / 2;
      const y = topY - h;
      page.drawImage(img, { x, y, width: w, height: h });
      return y - 10;
    };

    const drawParagraph = (
      page: PDFPage,
      text: string,
      topY: number,
      opts?: {
        bold?: boolean;
        size?: number;
        align?: 'left' | 'center';
        color?: [number, number, number];
      }
    ): number => {
      const f = opts?.bold ? fontBold : fontRegular;
      const sz = opts?.size ?? 10;
      const col = opts?.color
        ? rgb(opts.color[0], opts.color[1], opts.color[2])
        : rgb(0, 0, 0);
      const lines = wrapTextLines(text, f, sz, CONTENT_W);
      let y = topY;
      for (const line of lines) {
        y -= sz * 1.32;
        const lw = f.widthOfTextAtSize(line, sz);
        const x =
          opts?.align === 'center'
            ? MARGIN_X + (CONTENT_W - lw) / 2
            : MARGIN_X;
        page.drawText(line, { x, y, size: sz, font: f, color: col });
      }
      return y - 4;
    };

    const greeting =
      quote.greetingName || quote.customerName || 'Érdeklődő';
    const city = quote.city || 'Budapest';
    const proj = Number(quote.projection || 400);
    const wid = Number(quote.width || 350);
    const hei = Number(quote.height || 250);
    const eurRate = Number(quote.eurHufRate || 400);
    const szallitasHuf = Number(quote.szallitasiDijHuf ?? 40000);
    const beepites = quote.beepitesTipus || 'Épülethez rögzített';
    const options =
      quote.calculatedOptions && quote.calculatedOptions.length > 0
        ? quote.calculatedOptions
        : [];

    for (let idx = 0; idx < options.length; idx++) {
      const opt = options[idx];
      const modelCfg = config?.models?.[opt.modelId];
      const photos =
        opt.pdfPhotos && opt.pdfPhotos.length >= 2
          ? opt.pdfPhotos
          : modelCfg?.pdfPhotos && modelCfg.pdfPhotos.length >= 2
          ? modelCfg.pdfPhotos
          : getDefaultPhotosForModel(opt.modelId, quote.termekTipus);

      const photo1Img = await embedPhotoSource(pdfDoc, photos[0]?.url);
      const photo2Img = await embedPhotoSource(pdfDoc, photos[1]?.url);

      // PAGE A: Intro & Photo 1 (+ Photo 2 if idx > 0)
      const p1 = addBrandedPage();
      let y = TOP_Y;

      if (idx === 0) {
        y = drawParagraph(p1, `Kedves ${greeting}!`, y, {
          bold: true,
          size: 10.5,
        });
        y = drawParagraph(
          p1,
          `Örömmel fogadtuk megkeresését! Kérésének megfelelően küldjük tájékoztató jellegű árajánlatunkat az Ön által megadott paraméterek alapján: 1db ${proj}x${wid}x${hei} cm-es pergola szerkezetre (${beepites}).`,
          y,
          { size: 9.6 }
        );
        y = drawParagraph(
          p1,
          'Azért ajánljuk ezeket a lamellás szerkezeteket, mert télen-nyáron használhatóak, és a lamellák dőlésszögének állításával nem csak a bejutó fény mennyiségét tudjuk szabályozni, hanem a szellőzést is, így megvalósul a bioklimatikus hatás. Illetve ezeket a termékeket lehet körbe szerelni elcsúsztatható üvegfalrendszerrel és oldalsó árnyékolókkal, így megnövelve a terasz kihasználhatóságát.',
          y,
          { size: 9.4 }
        );
        y = drawParagraph(
          p1,
          '• Hóterhelés: Kedry Skylife 250 kg/m2 | SEESKYBIO 200 kg/m2 | Solare 400 150 kg/m2\n• Szélterhelése az EN 13561 szabvány szerinti legmagasabb, 6. osztályba sorolt (119 km/h).',
          y,
          { bold: true, size: 9.2 }
        );
      }

      y -= 4;
      y = drawParagraph(p1, `${idx + 1}. ${opt.modelName} (${proj}x${wid}x${hei} cm):`, y, {
        bold: true,
        size: 11.5,
      });
      if (photos[0]?.description) {
        y = drawParagraph(p1, photos[0].description, y, {
          size: 9.4,
        });
      }
      // Auto-fit Photo 1 into remaining vertical space on Page 1
      const maxPhoto1H = Math.max(85, Math.min(185, y - BOTTOM_Y - 38));
      y = drawCenteredImage(p1, photo1Img, y - 4, 345, maxPhoto1H);

      y = drawParagraph(
        p1,
        '• 100%-ban újrahasznosított alumínium • Rejtett rozsdamentes csavarok • Integrált vízelvezetés az oszlopokban • Somfy IO motorizáció • 10 év garancia a szerkezetre!',
        y,
        { bold: true, size: 9.0 }
      );

      // PAGE B: Photo 2 + Pricing Table
      const p2 = addBrandedPage();
      let y2 = TOP_Y;
      if (photos[1]?.description) {
        y2 = drawParagraph(p2, photos[1].description, y2, {
          size: 9.4,
        });
      }
      const extraRowCount = (opt.customExtraItems || []).filter((ci) => ci.selected).length;
      const maxPhoto2H = Math.max(85, Math.min(160, 165 - extraRowCount * 16));
      y2 = drawCenteredImage(p2, photo2Img, y2 - 2, 330, maxPhoto2H);

      y2 = drawParagraph(
        p2,
        `${opt.modelName} (${beepites}) — Árösszesítő táblázat (${proj}x${wid}x${hei} cm):`,
        y2 - 2,
        { bold: true, size: 10.5 }
      );

      const listaSzorzo = Number(config?.general?.listaArSzorzo || 1.25);
      const discBadgePct = Number(config?.general?.discountBadgePct || 20);
      const rows: [string, string, string, string][] = [
        ['Megnevezés', 'Listaár (EUR)', 'Kedvezményes (EUR)', 'Megjegyzés'],
        [
          `${opt.modelName} alapszerkezet (${proj}x${wid}x${hei} cm)`,
          fmtPlain(opt.listaArEur),
          fmtPlain(opt.kedvezmenyesAlaparEur),
          `-${discBadgePct}%`,
        ],
        [
          'Motor',
          fmtPlain(Math.round(opt.motorEur * listaSzorzo)),
          fmtPlain(opt.motorEur),
          opt.motorEur === 0 ? 'Ajándék / Alapárban' : '',
        ],
        [
          'Távirányító 1db',
          fmtPlain(Math.round(opt.taviranyitoEur * listaSzorzo)),
          fmtPlain(opt.taviranyitoEur),
          '',
        ],
        ['Infrafűtés 1db', '400', '0', quote.hasHeating ? 'Ajándék' : '-'],
        [
          'Eső és szél érzékelő',
          '200',
          '0',
          quote.hasSensors ? 'Ajándék' : '-',
        ],
        ...(opt.customExtraItems || [])
          .filter((ci) => ci.selected && (ci.mode === 'base' || ci.mode === 'gift'))
          .map((ci): [string, string, string, string] => [
            ci.name,
            fmtPlain(ci.priceEur > 0 ? Math.round(ci.priceEur * listaSzorzo) : 400),
            ci.mode === 'gift' ? '0' : fmtPlain(ci.priceEur),
            ci.mode === 'gift' ? 'Ajándék' : '',
          ]),
        ['Szerelés', '', fmtPlain(opt.szerelesEur), ''],
        [
          'Alapszerkezet szereléssel ÖSSZESEN:',
          '',
          `${fmtDot(opt.alapszerkezetOsszesenEur)} EUR`,
          `${fmtDot(opt.alapszerkezetOsszesenHuf)} Ft`,
        ],
        [
          'Opció: LED világítás (4 felső gerendába)',
          fmtPlain(Math.round(opt.ledEur * listaSzorzo)),
          `+ ${fmtDot(opt.ledEur)} EUR`,
          `${fmtDot(opt.ledHuf)} Ft`,
        ],
        ...(opt.customExtraItems || [])
          .filter((ci) => ci.selected && ci.mode === 'optional')
          .map((ci): [string, string, string, string] => [
            `Opció: ${ci.name}`,
            fmtPlain(Math.round(ci.priceEur * listaSzorzo)),
            `+ ${fmtDot(ci.priceEur)} EUR`,
            `${fmtDot(Math.round(ci.priceEur * eurRate))} Ft`,
          ]),
      ];

      if (quote.hasZip && opt.zipOsszesenEur > 0) {
        rows.push([
          'Opció: Motoros ZIP oldalsó árnyékolók szereléssel',
          fmtPlain(
            Math.round((opt.zipWidthEur + opt.zipProjectionEur) * listaSzorzo)
          ),
          `+ ${fmtDot(opt.zipOsszesenEur)} EUR`,
          `${fmtDot(opt.zipOsszesenHuf)} Ft`,
        ]);
      }

      if (quote.hasUvegfal && opt.uvegfalOsszesenEur > 0) {
        rows.push([
          'Opció: Keret nélküli elcsúsztatható üvegfal szereléssel',
          fmtPlain(
            Math.round(
              (opt.uvegfalWidthEur + opt.uvegfalProjectionEur) * listaSzorzo
            )
          ),
          `+ ${fmtDot(opt.uvegfalOsszesenEur)} EUR`,
          `${fmtDot(opt.uvegfalOsszesenHuf)} Ft`,
        ]);
      }

      const colWidths = [
        CONTENT_W * 0.44,
        CONTENT_W * 0.16,
        CONTENT_W * 0.2,
        CONTENT_W * 0.2,
      ];
      const rowH = 19;

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        const ry = y2 - rowH;
        if (rIdx === 0 || rIdx === 7) {
          p2.drawRectangle({
            x: MARGIN_X,
            y: ry,
            width: CONTENT_W,
            height: rowH,
            color: rIdx === 0 ? rgb(0.78, 0.78, 0.78) : rgb(0.92, 0.92, 0.92),
          });
        }
        p2.drawRectangle({
          x: MARGIN_X,
          y: ry,
          width: CONTENT_W,
          height: rowH,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
        });

        let cx = MARGIN_X;
        for (let cIdx = 0; cIdx < 4; cIdx++) {
          const cw = colWidths[cIdx];
          const cellText = row[cIdx] || '';
          const isBold = rIdx === 0 || rIdx === 7 || cIdx === 2;
          const f = isBold ? fontBold : fontRegular;
          p2.drawText(cellText.slice(0, 52), {
            x: cx + 4,
            y: ry + 5.5,
            size: 8.6,
            font: f,
            color: rgb(0, 0, 0),
          });
          cx += cw;
        }
        y2 = ry;
      }

      y2 -= 10;
      y2 = drawParagraph(
        p2,
        `Az alapszerkezet szereléssel Összesen: ${fmtDot(
          opt.alapszerkezetOsszesenEur
        )} EUR (+ Áfa)  |  ${eurRate} Ft/EUR árfolyamon: ${fmtDot(
          opt.alapszerkezetOsszesenHuf
        )} Ft (+Áfa)`,
        y2,
        { bold: true, size: 10, align: 'center' }
      );

      if (y2 - 110 > BOTTOM_Y) {
        y2 = drawParagraph(
          p2,
          'A tartószerkezetek alapszínei (25 db gyári RAL alapszín):',
          y2 - 4,
          { bold: true, size: 9.2 }
        );
        y2 = drawCenteredImage(p2, ralImg, y2, 260, 75);
      }
    }

    // CLOSING PAGE: Glass wall, ZIP, Delivery info, and Debreczeni Balázs business card
    const pClose = addBrandedPage();
    let yc = TOP_Y;
    yc = drawParagraph(
      pClose,
      'Keret nélküli, elcsúsztatható üvegfalrendszereink (GLASS WALL):',
      yc,
      { bold: true, size: 10.5 }
    );
    yc = drawParagraph(
      pClose,
      'Síneken csúszó 10 mm vastag biztonsági, edzett üvegtáblákból áll, könnyen telepíthető és keret nélküli üvegfalakkal biztosítja a zavartalan kilátást. Mindkét irányban nyithatóak és zárhatóak.',
      yc,
      { size: 9.4 }
    );
    yc = drawCenteredImage(pClose, uvegRailsImg, yc, 220, 90);

    yc = drawParagraph(
      pClose,
      'Oldalsó árnyékolónk (SCREENY GPZ ZIP rendszer):',
      yc,
      { bold: true, size: 10.5 }
    );
    yc = drawParagraph(
      pClose,
      'A napháló megvezetése speciális oldalsó zipzáras megvezetésben rejlik, amely lehetővé teszi, hogy a ponyva mindig feszes maradjon és a szúnyogháló feladatát is teljes mértékben ellátja.',
      yc,
      { size: 9.4 }
    );
    yc = drawCenteredImage(pClose, zipPhotoImg, yc, 130, 95);

    if (quote.customNotes) {
      yc = drawParagraph(
        pClose,
        `Egyedi megjegyzés az árajánlathoz: ${quote.customNotes}`,
        yc,
        { bold: true, size: 9.5 }
      );
    }

    yc = drawParagraph(
      pClose,
      `Információ: • Az ajánlat érvényes 30 napig • Szállítási költség (${city}): +${fmtDot(
        szallitasHuf
      )} Ft (+Áfa) • Garancia: szerkezetre 10 év, vásznakra 5 év, motorokra 3 év • Átfutási idő: 30-60 nap • Fizetés: 60% szerződéskötéskor, 40% átvételkor.`,
      yc,
      { bold: true, size: 9.2 }
    );

    yc = drawParagraph(
      pClose,
      'Amennyiben ajánlatunk szimpatikus Önnek, kérem e-mailben jelezzen vissza, mely után helyszíni felmérésre, méretpontosításra van szükség. Bármilyen kérdés esetén, keressen minket bizalommal.',
      yc,
      { size: 9.2 }
    );

    drawCenteredImage(pClose, balazsCardImg, yc - 4, 210, 95, 'left');

    const pdfBytes = await pdfDoc.save();
    fs.mkdirSync(path.dirname(outputPdfPath), { recursive: true });
    fs.writeFileSync(outputPdfPath, pdfBytes);
    return true;
  } catch (err) {
    console.error('renderQuotePdfWithPdfLib error:', err);
    return false;
  }
}

export async function generateOfficialPdfForQuote(
  quote: QuoteRecord
): Promise<string | null> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const citySafe = sanitizeFilenamePart(quote.city || 'Budapest');
  const nameSafe = sanitizeFilenamePart(quote.customerName || 'Ügyfél');
  const typeSafe = sanitizeFilenamePart(
    String(quote.termekTipus || 'bioklimatikus').replace(/^custom_/, '')
  );
  const suffix = quote.isEdited ? 'árajánlat-szerkesztve' : 'árajánlat';
  const pdfFilename = `${timestamp}_${citySafe}_${nameSafe}_${typeSafe}_${suffix}.pdf`;

  const pythonExe = path.join(
    LEGACY_ROOT_DIR,
    '_internal',
    'Python',
    'python.exe'
  );
  const scriptPath = path.join(process.cwd(), 'scripts', 'render_pdf.py');

  let config = getDb().config;

  // 1. Try local Python PyMuPDF engine if available
  if (fs.existsSync(pythonExe) && fs.existsSync(scriptPath)) {
    fs.mkdirSync(LEGACY_AJANLATOK_DIR, { recursive: true });
    const outputPdfPath = path.join(LEGACY_AJANLATOK_DIR, pdfFilename);
    const tmpDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpJsonPath = path.join(
      tmpDir,
      `_tmp_pdf_${quote.id}_${Date.now()}.json`
    );

    try {
      fs.writeFileSync(
        tmpJsonPath,
        JSON.stringify(
          {
            quote,
            config,
            legacyRoot: LEGACY_ROOT_DIR,
          },
          null,
          2
        ),
        'utf-8'
      );

      const { stdout } = await execFileAsync(
        pythonExe,
        [scriptPath, tmpJsonPath, outputPdfPath],
        {
          cwd: process.cwd(),
          timeout: 15000,
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
          },
        }
      );

      if (fs.existsSync(outputPdfPath) && fs.statSync(outputPdfPath).size > 0) {
        return pdfFilename;
      }

      const match = stdout.match(/GENERATED_PDF_OK:(.+)/);
      if (match && match[1]) {
        const fname = match[1].trim();
        if (fs.existsSync(path.join(LEGACY_AJANLATOK_DIR, fname))) {
          return fname;
        }
      }
    } catch (e) {
      console.error('PDF generation via PyMuPDF failed, falling back to pdf-lib:', e);
    } finally {
      try {
        if (fs.existsSync(tmpJsonPath)) {
          fs.unlinkSync(tmpJsonPath);
        }
      } catch {
        // ignore
      }
    }
  }

  // 2. Pure Node.js pdf-lib engine (for Vercel serverless or fallback)
  fs.mkdirSync(TMP_PDF_DIR, { recursive: true });
  const fallbackOutputPath = path.join(TMP_PDF_DIR, pdfFilename);
  const ok = await renderQuotePdfWithPdfLib(quote, config, fallbackOutputPath);
  if (ok) {
    return pdfFilename;
  }

  return null;
}

export function getLivePreviewPdfPath(): string {
  const localPath = path.join(process.cwd(), 'data', '_live_preview.pdf');
  const tmpPath = path.join(TMP_PDF_DIR, '_live_preview.pdf');
  if (!process.env.VERCEL && fs.existsSync(localPath)) {
    return localPath;
  }
  if (fs.existsSync(tmpPath)) {
    return tmpPath;
  }
  return localPath;
}

export async function generateLivePreviewPdf(
  draftQuote: Partial<QuoteRecord>
): Promise<string | null> {
  const normalizedDraft: Partial<QuoteRecord> = {
    id: 'live-preview',
    customerName: draftQuote.customerName || 'Minta Ügyfél',
    greetingName:
      draftQuote.greetingName || draftQuote.customerName || 'Érdeklődő',
    city: draftQuote.city || 'Budapest',
    szallitasiDijHuf: draftQuote.szallitasiDijHuf ?? 40000,
    eurHufRate: draftQuote.eurHufRate ?? 400,
    termekTipus: draftQuote.termekTipus || 'bioklimatikus',
    beepitesTipus: draftQuote.beepitesTipus || 'Épülethez rögzített',
    projection: draftQuote.projection || 400,
    width: draftQuote.width || 350,
    height: draftQuote.height || 250,
    hasUvegfal: draftQuote.hasUvegfal ?? true,
    hasZip: draftQuote.hasZip ?? true,
    hasNoSideWall: draftQuote.hasNoSideWall ?? false,
    hasLed: draftQuote.hasLed ?? true,
    hasSensors: draftQuote.hasSensors ?? true,
    hasHeating: draftQuote.hasHeating ?? true,
    hasSmartHome: draftQuote.hasSmartHome ?? false,
    calculatedOptions: draftQuote.calculatedOptions || [],
    selectedOptionIndex: draftQuote.selectedOptionIndex || 0,
    customNotes: draftQuote.customNotes || '',
  };

  const config = getDb().config;
  const pythonExe = path.join(
    LEGACY_ROOT_DIR,
    '_internal',
    'Python',
    'python.exe'
  );
  const scriptPath = path.join(process.cwd(), 'scripts', 'render_pdf.py');

  // 1. Try local Python PyMuPDF engine if available
  if (!process.env.VERCEL && fs.existsSync(pythonExe) && fs.existsSync(scriptPath)) {
    const tmpDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(tmpDir, { recursive: true });
    const outputPdfPath = path.join(tmpDir, '_live_preview.pdf');
    const tmpJsonPath = path.join(
      tmpDir,
      `_tmp_preview_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`
    );

    try {
      fs.writeFileSync(
        tmpJsonPath,
        JSON.stringify(
          {
            quote: normalizedDraft,
            config,
            legacyRoot: LEGACY_ROOT_DIR,
          },
          null,
          2
        ),
        'utf-8'
      );

      await execFileAsync(pythonExe, [scriptPath, tmpJsonPath, outputPdfPath], {
        cwd: process.cwd(),
        timeout: 15000,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
        },
      });

      if (fs.existsSync(outputPdfPath) && fs.statSync(outputPdfPath).size > 0) {
        return outputPdfPath;
      }
    } catch (e) {
      console.error('Live preview PDF via PyMuPDF failed, using pdf-lib:', e);
    } finally {
      try {
        if (fs.existsSync(tmpJsonPath)) {
          fs.unlinkSync(tmpJsonPath);
        }
      } catch {
        // ignore
      }
    }
  }

  // 2. Pure Node.js pdf-lib engine (for Vercel serverless or fallback)
  fs.mkdirSync(TMP_PDF_DIR, { recursive: true });
  const fallbackPreviewPath = path.join(TMP_PDF_DIR, '_live_preview.pdf');
  const ok = await renderQuotePdfWithPdfLib(
    normalizedDraft,
    config,
    fallbackPreviewPath
  );
  if (ok) {
    return fallbackPreviewPath;
  }

  return null;
}
