import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PRODUCT_TYPES } from '@/lib/constants';
import { getDb, LEGACY_AJANLATOK_DIR, saveDb } from '@/lib/db';
import { generateOfficialPdfForQuote } from '@/lib/pdf-generator';

function formatNum(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const db = getDb();

    const quote = db.quotes.find((q) => q.id === id);
    if (!quote) {
      return NextResponse.json({ error: 'Árajánlat nem található' }, { status: 404 });
    }

    const recipientEmail = (body.email || quote.email || '').trim();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Kérlek adj meg egy érvényes email címet a kiküldéshez!' },
        { status: 400 }
      );
    }

    const emailCfg = db.config.emailSettings;
    const productInfo =
      PRODUCT_TYPES.find((p) => p.id === quote.termekTipus) || PRODUCT_TYPES[0];
    const meretStr = `${quote.projection}×${quote.width}×${quote.height}`;

    const enabledOptions = quote.calculatedOptions.filter((o) => o.enabled);
    const optionsTextLines = enabledOptions.map(
      (o, i) =>
        `${i + 1}. ${o.modelName} (${o.calculatedProjection}×${o.calculatedWidth}×${o.calculatedHeight} cm): ${formatNum(
          o.alapszerkezetOsszesenEur
        )} EUR + ÁFA (${formatNum(o.alapszerkezetOsszesenHuf)} Ft + ÁFA)`
    );

    const replacePlaceholders = (tpl: string) =>
      tpl
        .replace(/\{\{ugyfel_nev\}\}/g, quote.greetingName || quote.customerName)
        .replace(/\{\{teljes_nev\}\}/g, quote.customerName)
        .replace(/\{\{termek_nev\}\}/g, productInfo.name)
        .replace(/\{\{meret\}\}/g, meretStr)
        .replace(/\{\{beepites\}\}/g, quote.beepitesTipus)
        .replace(/\{\{telepules\}\}/g, quote.city)
        .replace(/\{\{szallitasi_dij\}\}/g, formatNum(quote.szallitasiDijHuf))
        .replace(/\{\{arfolyam\}\}/g, String(quote.eurHufRate))
        .replace(/\{\{ar_eur\}\}/g, formatNum(quote.primaryEur))
        .replace(/\{\{ar_huf\}\}/g, formatNum(quote.primaryHuf))
        .replace(
          /\{\{opciok_osszefoglalo\}\}/g,
          optionsTextLines.join('\n') || `${formatNum(quote.primaryEur)} EUR`
        );

    const subject = body.subject
      ? replacePlaceholders(body.subject)
      : replacePlaceholders(emailCfg.subjectTemplate);
    const plainBody = body.message
      ? replacePlaceholders(body.message)
      : replacePlaceholders(emailCfg.bodyTemplate);

    const baseUrl = (
      emailCfg.publicBaseUrl ||
      req.nextUrl.origin ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    const trackingPixelUrl = `${baseUrl}/api/track/open/${quote.trackingId}.gif`;
    const pdfDownloadUrl = `${baseUrl}/api/quotes/${quote.id}/pdf`;

    const optionsHtmlRows = enabledOptions
      .map(
        (o) => `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
            ${o.modelName}
            <div style="font-size:12px;font-weight:400;color:#64748b;margin-top:2px;">
              Méret: ${o.calculatedProjection}×${o.calculatedWidth}×${o.calculatedHeight} cm • ${quote.beepitesTipus}
            </div>
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#059669;">
            ${formatNum(o.alapszerkezetOsszesenEur)} EUR
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">
            ${formatNum(o.alapszerkezetOsszesenHuf)} Ft
          </td>
        </tr>`
      )
      .join('');

    const htmlEmail = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Calibri,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px 30px;color:#ffffff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#34d399;font-weight:700;">
        ${db.config.general.companyName} • Egyedi Árajánlat (${quote.quoteNumber})
      </div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">
        ${productInfo.name} – ${meretStr} cm
      </h1>
    </div>
    <div style="padding:28px 30px;line-height:1.6;font-size:15px;">
      ${plainBody
        .split('\n')
        .map((line) =>
          line.trim()
            ? `<p style="margin:0 0 12px;">${line}</p>`
            : '<br/>'
        )
        .join('')}

      <div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f8fafc;color:#475569;text-align:left;">
              <th style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">Ajánlott Modell / Kivitel</th>
              <th style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;">Szereléssel (EUR + ÁFA)</th>
              <th style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;">Forintban (Ft + ÁFA)</th>
            </tr>
          </thead>
          <tbody>
            ${optionsHtmlRows}
          </tbody>
        </table>
      </div>

      ${
        quote.customNotes
          ? `<div style="padding:14px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;margin-bottom:20px;font-size:14px;color:#92400e;">
              <strong>Egyedi megjegyzés:</strong> ${quote.customNotes}
            </div>`
          : ''
      }

      <div style="margin-top:24px;text-align:center;">
        <a href="${pdfDownloadUrl}" style="display:inline-block;padding:12px 24px;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;font-size:14px;">
          📄 Részletes illusztrált PDF árajánlat megnyitása
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 30px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;display:flex;justify-content:space-between;">
      <span>${db.config.general.companyName} • ${db.config.general.companyEmail} • ${db.config.general.companyPhone}</span>
    </div>
  </div>
  ${
    emailCfg.enableTrackingPixel
      ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`
      : ''
  }
</body>
</html>`;

    // Ensure PDF exists if possible
    let pdfPath = quote.filename
      ? path.join(LEGACY_AJANLATOK_DIR, quote.filename)
      : null;
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      const genName = await generateOfficialPdfForQuote(quote);
      if (genName) {
        quote.filename = genName;
        pdfPath = path.join(LEGACY_AJANLATOK_DIR, genName);
      }
    }

    let smtpSent = false;
    let smtpNote =
      'Az árajánlat rögzítve lett kiküldöttként a beágyazott követő pixellel. (Valódi SMTP kiküldéshez add meg az SMTP adatokat az Admin panelen.)';

    if (emailCfg.smtpHost && emailCfg.smtpUser && emailCfg.smtpPass) {
      const transporter = nodemailer.createTransport({
        host: emailCfg.smtpHost,
        port: Number(emailCfg.smtpPort) || 587,
        secure: Number(emailCfg.smtpPort) === 465,
        auth: {
          user: emailCfg.smtpUser,
          pass: emailCfg.smtpPass,
        },
      });

      const attachments =
        pdfPath && fs.existsSync(pdfPath)
          ? [
              {
                filename: quote.filename || `${quote.quoteNumber}_arajanlat.pdf`,
                path: pdfPath,
              },
            ]
          : [];

      await transporter.sendMail({
        from: `"${emailCfg.senderName}" <${emailCfg.senderEmail || emailCfg.smtpUser}>`,
        to: recipientEmail,
        subject,
        text: plainBody,
        html: htmlEmail,
        attachments,
      });

      smtpSent = true;
      smtpNote = `Email sikeresen elküldve SMTP-n keresztül a(z) ${recipientEmail} címre (PDF melléklettel + követő pixellel)!`;
    }

    const now = new Date().toISOString();
    quote.email = recipientEmail;
    quote.sentToEmail = recipientEmail;
    quote.sentAt = now;
    quote.sentCount = (quote.sentCount || 0) + 1;
    quote.updatedAt = now;
    if (quote.status === 'piszkozat') {
      quote.status = 'kikuldve';
    }

    saveDb(db);

    return NextResponse.json({
      ok: true,
      smtpSent,
      message: smtpNote,
      quote,
      subject,
      trackingPixelUrl,
      htmlPreview: htmlEmail,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Hiba az email küldésekor' },
      { status: 500 }
    );
  }
}
