import fs from 'fs';
import os from 'os';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import { formatDotNumber, replaceTemplateVariables } from './constants';
import { getDb, SAVED_PDFS_DIR } from './db';
import {
  PhotoCaptionBlock,
  QuoteDocumentBlock,
  QuoteRecord,
  SystemConfig,
} from './types';

export const TMP_PDF_DIR = path.join(os.tmpdir(), 'custom-pricer-pdfs');

export function sanitizeFilenamePart(str: string): string {
  return (
    (str || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, '-') || 'Ajanlat'
  );
}

function resolveLocalFileFromUrl(urlOrData: string | undefined): string | null {
  if (!urlOrData) return null;
  const clean = urlOrData.trim().split('?')[0];
  if (clean.startsWith('/uploads/')) {
    const rel = decodeURIComponent(clean.replace(/^\/+/, ''));
    const pubPath = path.join(process.cwd(), 'public', rel);
    if (fs.existsSync(pubPath)) return pubPath;
    const tmpPath = path.join(os.tmpdir(), 'custom-pricer-uploads', path.basename(rel));
    if (fs.existsSync(tmpPath)) return tmpPath;
  }
  if (clean.startsWith('/api/media/file/')) {
    const fname = decodeURIComponent(clean.replace('/api/media/file/', ''));
    const pubPath = path.join(process.cwd(), 'public', 'uploads', fname);
    if (fs.existsSync(pubPath)) return pubPath;
    const tmpPath = path.join(os.tmpdir(), 'custom-pricer-uploads', fname);
    if (fs.existsSync(tmpPath)) return tmpPath;
  }
  return null;
}

async function embedImageFromSource(
  pdfDoc: PDFDocument,
  urlOrData: string | undefined
): Promise<PDFImage | null> {
  if (!urlOrData) return null;
  const trimmed = urlOrData.trim();

  // 1. Base64 Data URL
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

  // 2. Local file in public/uploads or tmp
  const localPath = resolveLocalFileFromUrl(trimmed);
  if (localPath && fs.existsSync(localPath)) {
    try {
      const bytes = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      if (ext === '.png') {
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

  return null;
}

function wrapTextLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const paragraphs = String(text || '').split(/\r?\n/);
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

export async function renderEditableQuotePdfBytes(
  quote: Partial<QuoteRecord>,
  config: SystemConfig
): Promise<Uint8Array> {
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

  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(fontRegularPath));
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(fontBoldPath));

  const bgImg = await embedImageFromSource(pdfDoc, config.pdfPageBackgroundUrl);
  const logoImg = await embedImageFromSource(pdfDoc, config.pdfLogoUrl);
  const sigCardImg = await embedImageFromSource(
    pdfDoc,
    config.pdfSignatureCardUrl
  );

  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN_X = 46;
  const CONTENT_W = A4_W - MARGIN_X * 2;
  const TOP_Y = bgImg ? A4_H - 96 : A4_H - 82;
  const BOTTOM_Y = bgImg ? 70 : 54;

  const pages: PDFPage[] = [];

  const createNewPage = (): { page: PDFPage; y: number } => {
    const page = pdfDoc.addPage([A4_W, A4_H]);
    pages.push(page);

    if (bgImg) {
      page.drawImage(bgImg, {
        x: 0,
        y: 0,
        width: A4_W,
        height: A4_H,
      });
    } else {
      // Clean modern header bar
      page.drawRectangle({
        x: 0,
        y: A4_H - 62,
        width: A4_W,
        height: 62,
        color: rgb(0.09, 0.11, 0.16),
      });

      let titleX = MARGIN_X;
      if (logoImg) {
        const dims = logoImg.scale(1);
        const ratio = dims.height / Math.max(1, dims.width);
        const h = 34;
        const w = Math.min(110, h / ratio);
        page.drawImage(logoImg, {
          x: MARGIN_X,
          y: A4_H - 48,
          width: w,
          height: h,
        });
        titleX = MARGIN_X + w + 12;
      }

      page.drawText(config.companyName || 'Árajánlat', {
        x: titleX,
        y: A4_H - 32,
        size: 13,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      if (config.companySubtitle) {
        page.drawText(config.companySubtitle.slice(0, 75), {
          x: titleX,
          y: A4_H - 47,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.75, 0.8, 0.88),
        });
      }

      const rightInfo = quote.quoteNumber || new Date().toLocaleDateString('hu-HU');
      const rw = fontBold.widthOfTextAtSize(rightInfo, 9.5);
      page.drawText(rightInfo, {
        x: A4_W - MARGIN_X - rw,
        y: A4_H - 35,
        size: 9.5,
        font: fontBold,
        color: rgb(0.9, 0.94, 1),
      });
    }

    return { page, y: TOP_Y };
  };

  let current = createNewPage();

  const ensureSpace = (neededHeight: number) => {
    if (current.y - neededHeight < BOTTOM_Y) {
      current = createNewPage();
    }
  };

  const varCtx = {
    customerName: quote.customerName || 'Ügyfél',
    greetingName: quote.greetingName || quote.customerName || 'Érdeklődő',
    city: quote.city || 'Budapest',
    widthCm: quote.widthCm || 600,
    projectionCm: quote.projectionCm || 400,
    heightCm: quote.heightCm || 250,
    mountType: quote.mountType || 'Épülethez rögzített',
    eurHufRate: quote.eurHufRate || config.defaultEurHufRate || 400,
    deliveryFeeHuf: quote.deliveryFeeHuf ?? config.defaultDeliveryFeeHuf ?? 40000,
  };

  const drawTextParagraph = (
    rawText: string,
    opts?: {
      bold?: boolean;
      size?: number;
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
      bgHighlight?: [number, number, number];
      indentX?: number;
    }
  ) => {
    const resolved = replaceTemplateVariables(rawText, varCtx);
    if (!resolved.trim()) return;
    const f = opts?.bold ? fontBold : fontRegular;
    const sz = opts?.size ?? 10;
    const indent = opts?.indentX ?? 0;
    const maxW = CONTENT_W - indent;
    const lines = wrapTextLines(resolved, f, sz, maxW);
    const lineHeight = sz * 1.35;

    if (opts?.bgHighlight) {
      const totalBoxH = lines.length * lineHeight + 10;
      ensureSpace(totalBoxH + 6);
      current.page.drawRectangle({
        x: MARGIN_X + indent,
        y: current.y - totalBoxH + 2,
        width: maxW,
        height: totalBoxH,
        color: rgb(
          opts.bgHighlight[0],
          opts.bgHighlight[1],
          opts.bgHighlight[2]
        ),
        borderColor: rgb(0.82, 0.85, 0.9),
        borderWidth: 0.6,
      });
      current.y -= 4;
    }

    const col = opts?.color
      ? rgb(opts.color[0], opts.color[1], opts.color[2])
      : rgb(0.08, 0.09, 0.12);

    for (const line of lines) {
      if (!opts?.bgHighlight) {
        ensureSpace(lineHeight + 2);
      }
      current.y -= lineHeight;
      if (line) {
        const lw = f.widthOfTextAtSize(line, sz);
        let x = MARGIN_X + indent + (opts?.bgHighlight ? 8 : 0);
        if (opts?.align === 'center') {
          x = MARGIN_X + (CONTENT_W - lw) / 2;
        } else if (opts?.align === 'right') {
          x = MARGIN_X + CONTENT_W - lw;
        }
        current.page.drawText(line, {
          x,
          y: current.y,
          size: sz,
          font: f,
          color: col,
        });
      }
    }
    current.y -= opts?.bgHighlight ? 10 : 4;
  };

  const drawPhotoWithCaption = async (
    photoBlock: PhotoCaptionBlock,
    maxHeightPt = 195
  ) => {
    if (!photoBlock) return;
    const titleAbove = replaceTemplateVariables(
      photoBlock.titleAbove || '',
      varCtx
    ).trim();
    const captionBelow = replaceTemplateVariables(
      photoBlock.captionBelow || '',
      varCtx
    ).trim();

    const img = await embedImageFromSource(pdfDoc, photoBlock.imageUrl);

    if (titleAbove) {
      ensureSpace(24);
      drawTextParagraph(titleAbove, { bold: true, size: 10 });
    }

    if (img) {
      const dims = img.scale(1);
      const ratio = dims.height / Math.max(1, dims.width);
      const widthPct = Math.min(100, Math.max(30, Number(photoBlock.widthPct) || 75));
      let targetW = CONTENT_W * (widthPct / 100);
      let targetH = targetW * ratio;
      if (targetH > maxHeightPt) {
        targetH = maxHeightPt;
        targetW = targetH / ratio;
      }

      const captionLines = captionBelow
        ? wrapTextLines(captionBelow, fontRegular, 9.4, CONTENT_W)
        : [];
      const captionH = captionLines.length > 0 ? captionLines.length * 13 + 12 : 0;

      ensureSpace(targetH + captionH + 14);

      let x = MARGIN_X + (CONTENT_W - targetW) / 2;
      if (photoBlock.align === 'left') x = MARGIN_X;
      if (photoBlock.align === 'right') x = MARGIN_X + CONTENT_W - targetW;

      const imgY = current.y - targetH;
      current.page.drawImage(img, {
        x,
        y: imgY,
        width: targetW,
        height: targetH,
      });
      current.y = imgY - 6;
    }

    if (captionBelow) {
      drawTextParagraph(captionBelow, {
        size: 9.5,
        color: [0.18, 0.22, 0.28],
        bgHighlight: [0.96, 0.97, 0.99],
      });
    }
    current.y -= 4;
  };

  const blocks: QuoteDocumentBlock[] = Array.isArray(quote.blocks)
    ? quote.blocks
    : [];

  for (const block of blocks) {
    if (block.type === 'page_break') {
      current = createNewPage();
      continue;
    }

    if (block.type === 'text_box') {
      if (block.title) {
        ensureSpace(24);
        drawTextParagraph(block.title, {
          bold: true,
          size: block.textStyle === 'greeting' ? 11.5 : 10.8,
          align: block.align || 'left',
          color:
            block.textStyle === 'highlight' ? [0.07, 0.35, 0.25] : [0.06, 0.09, 0.15],
        });
      }
      if (block.content) {
        drawTextParagraph(block.content, {
          bold: Boolean(block.bold),
          size: block.textStyle === 'footer_info' ? 9.2 : 10,
          align: block.align || 'left',
          bgHighlight:
            block.textStyle === 'highlight'
              ? [0.93, 0.98, 0.95]
              : block.textStyle === 'footer_info'
              ? [0.96, 0.96, 0.97]
              : undefined,
        });
      }
      current.y -= 6;
      continue;
    }

    if (block.type === 'photo_box' && block.photo) {
      await drawPhotoWithCaption(block.photo, 220);
      continue;
    }

    if (block.type === 'template_section') {
      ensureSpace(65);
      // Section header bar
      if (block.sectionTitle) {
        const headerH = 24;
        ensureSpace(headerH + 12);
        current.page.drawRectangle({
          x: MARGIN_X,
          y: current.y - headerH,
          width: CONTENT_W,
          height: headerH,
          color: rgb(0.15, 0.2, 0.28),
        });
        const resolvedTitle = replaceTemplateVariables(block.sectionTitle, varCtx);
        current.page.drawText(resolvedTitle.slice(0, 82), {
          x: MARGIN_X + 8,
          y: current.y - 16,
          size: 10.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        current.y -= headerH + 6;
      }

      if (block.sectionSubtitle) {
        drawTextParagraph(block.sectionSubtitle, {
          bold: true,
          size: 9.6,
          color: [0.25, 0.3, 0.38],
        });
      }

      if (block.sectionIntroText) {
        drawTextParagraph(block.sectionIntroText, { size: 9.8 });
      }

      // Section photos + their captions below
      if (Array.isArray(block.sectionPhotos)) {
        for (const sp of block.sectionPhotos) {
          if (sp.imageUrl || sp.captionBelow || sp.titleAbove) {
            await drawPhotoWithCaption(sp, 185);
          }
        }
      }

      // Product-specific photos (if any product row has attached photos)
      const activeRows = (block.rows || []).filter((r) => r.included !== false);
      for (const row of activeRows) {
        if (Array.isArray(row.photos) && row.photos.length > 0) {
          for (const rp of row.photos) {
            if (rp.imageUrl || rp.captionBelow) {
              await drawPhotoWithCaption(
                {
                  ...rp,
                  titleAbove: rp.titleAbove || row.name,
                },
                165
              );
            }
          }
        }
      }

      // Pricing Table
      if (activeRows.length > 0) {
        ensureSpace(58);
        if (block.tableTitle) {
          drawTextParagraph(block.tableTitle, { bold: true, size: 10.2 });
        }

        const headers = block.tableHeaders || [
          'Megnevezés / Anyag',
          'Mennyiség',
          'Listaár (EUR)',
          'Kedvezményes (EUR)',
        ];

        const colW = [
          CONTENT_W * 0.44,
          CONTENT_W * 0.16,
          CONTENT_W * 0.16,
          CONTENT_W * 0.24,
        ];

        const drawTableHeader = () => {
          const thH = 20;
          ensureSpace(thH + 22);
          const ry = current.y - thH;
          current.page.drawRectangle({
            x: MARGIN_X,
            y: ry,
            width: CONTENT_W,
            height: thH,
            color: rgb(0.84, 0.86, 0.9),
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 0.5,
          });
          let cx = MARGIN_X;
          for (let c = 0; c < 4; c++) {
            current.page.drawText((headers[c] || '').slice(0, 38), {
              x: cx + 4,
              y: ry + 6,
              size: 8.6,
              font: fontBold,
              color: rgb(0.08, 0.08, 0.1),
            });
            cx += colW[c];
          }
          current.y = ry;
        };

        drawTableHeader();

        const baseAndGiftRows = activeRows.filter(
          (r) => r.itemRole === 'base' || r.itemRole === 'gift'
        );
        const optionalRows = activeRows.filter((r) => r.itemRole === 'optional');

        const drawDataRow = (
          col1: string,
          col2: string,
          col3: string,
          col4: string,
          opts?: { bold?: boolean; bg?: [number, number, number] }
        ) => {
          const nameLines = wrapTextLines(col1, opts?.bold ? fontBold : fontRegular, 8.8, colW[0] - 8);
          const rowH = Math.max(19, nameLines.length * 11.5 + 7);
          if (current.y - rowH < BOTTOM_Y) {
            current = createNewPage();
            drawTableHeader();
          }
          const ry = current.y - rowH;
          if (opts?.bg) {
            current.page.drawRectangle({
              x: MARGIN_X,
              y: ry,
              width: CONTENT_W,
              height: rowH,
              color: rgb(opts.bg[0], opts.bg[1], opts.bg[2]),
            });
          }
          current.page.drawRectangle({
            x: MARGIN_X,
            y: ry,
            width: CONTENT_W,
            height: rowH,
            borderColor: rgb(0.3, 0.3, 0.35),
            borderWidth: 0.4,
          });

          // Column 1 (wrapped)
          let lineY = current.y - 11;
          for (const nl of nameLines) {
            current.page.drawText(nl, {
              x: MARGIN_X + 4,
              y: lineY,
              size: 8.8,
              font: opts?.bold ? fontBold : fontRegular,
              color: rgb(0.08, 0.08, 0.1),
            });
            lineY -= 11.5;
          }

          // Columns 2, 3, 4
          const cells = [col2, col3, col4];
          let cx = MARGIN_X + colW[0];
          for (let c = 0; c < 3; c++) {
            const f = c === 2 || opts?.bold ? fontBold : fontRegular;
            current.page.drawText((cells[c] || '').slice(0, 32), {
              x: cx + 4,
              y: ry + rowH / 2 - 3.5,
              size: 8.8,
              font: f,
              color: rgb(0.08, 0.08, 0.1),
            });
            cx += colW[c + 1];
          }
          current.y = ry;
        };

        for (const r of baseAndGiftRows) {
          const labelWithDesc = r.description
            ? `${r.name} (${r.description})`
            : r.name;
          const listStr =
            r.listPriceEur > 0 ? `${formatDotNumber(r.listPriceEur)} EUR` : '-';
          const discStr =
            r.itemRole === 'gift' || r.discountPriceEur === 0
              ? `0 EUR ${r.note ? `(${r.note})` : '(Ajándék)'}`
              : `${formatDotNumber(r.discountPriceEur)} EUR ${
                  r.note ? `(${r.note})` : ''
                }`;

          drawDataRow(
            replaceTemplateVariables(labelWithDesc, varCtx),
            r.quantityLabel || '1 db',
            listStr,
            discStr
          );
        }

        const eurRate = Number(quote.eurHufRate || config.defaultEurHufRate || 400);
        const totalEur =
          block.customTotalBaseEur ??
          baseAndGiftRows
            .filter((r) => r.itemRole === 'base')
            .reduce((s, r) => s + (Number(r.discountPriceEur) || 0), 0);
        const totalHuf =
          block.customTotalBaseHuf ??
          Math.round((totalEur * eurRate) / 1000) * 1000;

        drawDataRow(
          'Alapszerkezet / Alaptételek ÖSSZESEN (+Áfa):',
          '',
          `${formatDotNumber(totalEur)} EUR`,
          `${formatDotNumber(totalHuf)} Ft`,
          { bold: true, bg: [0.91, 0.95, 0.93] }
        );

        for (const r of optionalRows) {
          const labelWithDesc = r.description
            ? `Opció: ${r.name} (${r.description})`
            : `Opció: ${r.name}`;
          const listStr =
            r.listPriceEur > 0 ? `${formatDotNumber(r.listPriceEur)} EUR` : '-';
          const optHuf = Math.round(((Number(r.discountPriceEur) || 0) * eurRate) / 1000) * 1000;
          const discStr = `+ ${formatDotNumber(r.discountPriceEur)} EUR (${formatDotNumber(
            optHuf
          )} Ft)`;

          drawDataRow(
            replaceTemplateVariables(labelWithDesc, varCtx),
            r.quantityLabel || 'Opció',
            listStr,
            discStr,
            { bg: [0.97, 0.98, 1] }
          );
        }

        current.y -= 8;
        drawTextParagraph(
          `Összesen: ${formatDotNumber(totalEur)} EUR (+Áfa)  |  ${eurRate} Ft/EUR árfolyamon: ${formatDotNumber(
            totalHuf
          )} Ft (+Áfa)`,
          { bold: true, size: 10.2, align: 'center' }
        );
      }

      if (block.sectionClosingText) {
        current.y -= 2;
        drawTextParagraph(block.sectionClosingText, { size: 9.5 });
      }

      current.y -= 10;
    }
  }

  // Optional Signature / Business Card image at the end
  if (sigCardImg) {
    const dims = sigCardImg.scale(1);
    const ratio = dims.height / Math.max(1, dims.width);
    let w = 210;
    let h = w * ratio;
    if (h > 95) {
      h = 95;
      w = h / ratio;
    }
    ensureSpace(h + 15);
    current.page.drawImage(sigCardImg, {
      x: MARGIN_X,
      y: current.y - h,
      width: w,
      height: h,
    });
    current.y -= h + 10;
  }

  // Draw clean footer on all pages if no custom full-page background
  if (!bgImg) {
    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      const p = pages[i];
      p.drawRectangle({
        x: MARGIN_X,
        y: 34,
        width: CONTENT_W,
        height: 0.6,
        color: rgb(0.82, 0.84, 0.88),
      });
      const contactParts = [
        config.companyName,
        config.companyPhone,
        config.companyEmail,
        config.companyWebsite,
      ].filter(Boolean);
      const footerLeft = contactParts.join('  •  ').slice(0, 90);
      p.drawText(footerLeft, {
        x: MARGIN_X,
        y: 21,
        size: 8,
        font: fontRegular,
        color: rgb(0.42, 0.45, 0.5),
      });
      const pageLabel = `${i + 1} / ${totalPages}. oldal`;
      const pw = fontRegular.widthOfTextAtSize(pageLabel, 8);
      p.drawText(pageLabel, {
        x: A4_W - MARGIN_X - pw,
        y: 21,
        size: 8,
        font: fontRegular,
        color: rgb(0.42, 0.45, 0.5),
      });
    }
  }

  return await pdfDoc.save();
}

export async function generateAndSaveQuotePdf(
  quote: QuoteRecord
): Promise<{ filename: string; bytes: Uint8Array }> {
  const db = getDb();
  const bytes = await renderEditableQuotePdfBytes(quote, db.config);

  const datePart = (quote.createdAt || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  const citySafe = sanitizeFilenamePart(quote.city || 'Budapest');
  const nameSafe = sanitizeFilenamePart(quote.customerName || 'Ugyfel');
  const suffix = quote.isEditedAfterGeneration ? 'arajanlat-szerkesztett' : 'arajanlat';
  const filename = `${datePart}_${citySafe}_${nameSafe}_${quote.quoteNumber || quote.id}_${suffix}.pdf`;

  try {
    fs.mkdirSync(SAVED_PDFS_DIR, { recursive: true });
    fs.writeFileSync(path.join(SAVED_PDFS_DIR, filename), bytes);
  } catch {
    // fallback to tmp
  }

  try {
    fs.mkdirSync(TMP_PDF_DIR, { recursive: true });
    fs.writeFileSync(path.join(TMP_PDF_DIR, filename), bytes);
  } catch {
    // ignore
  }

  return { filename, bytes };
}
