import { formatDotNumber, replaceTemplateVariables } from './constants';
import { QuoteRecord, SystemConfig } from './types';

/**
 * E-mail tárgy és szöveg változói: a PDF-ben is használt {{megszolitas}}, {{meret}} stb.,
 * plusz {{sorszam}}, {{osszeg_eur}}, {{osszeg_huf}}, {{ceg}}.
 */
export function fillEmailTemplate(
  template: string,
  quote: Partial<QuoteRecord>,
  config: SystemConfig
): string {
  const withQuoteVars = (template || '')
    .replace(/\{\{\s*sorszam\s*\}\}/gi, quote.quoteNumber || '')
    .replace(/\{\{\s*osszeg_eur\s*\}\}/gi, formatDotNumber(quote.primaryTotalEur || 0))
    .replace(/\{\{\s*osszeg_huf\s*\}\}/gi, formatDotNumber(quote.primaryTotalHuf || 0))
    .replace(/\{\{\s*ceg\s*\}\}/gi, config.companyName || '')
    .replace(/\{\{\s*telefon\s*\}\}/gi, config.companyPhone || '')
    .replace(/\{\{\s*weboldal\s*\}\}/gi, config.companyWebsite || '')
    .replace(/\{\{\s*email\s*\}\}/gi, config.companyEmail || '');
  return replaceTemplateVariables(withQuoteVars, {
    customerName: quote.customerName,
    greetingName: quote.greetingName,
    city: quote.city,
    widthCm: quote.widthCm,
    projectionCm: quote.projectionCm,
    heightCm: quote.heightCm,
    mountType: quote.mountType,
    eurHufRate: quote.eurHufRate,
    deliveryFeeHuf: quote.deliveryFeeHuf,
  });
}

const escapeHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Egyszerű, az alkalmazással egyező fekete-fehér HTML levél.
 */
export function buildEmailHtml(params: {
  message: string;
  quote: Partial<QuoteRecord>;
  config: SystemConfig;
  trackingPixelUrl?: string;
}): string {
  const { message, quote, config, trackingPixelUrl } = params;
  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  const contact = [config.companyEmail, config.companyWebsite, config.companyPhone]
    .filter(Boolean)
    .join(' · ');
  return `<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ebebeb;border-radius:12px;overflow:hidden">
    <div style="padding:20px 28px;border-bottom:1px solid #ebebeb">
      <div style="font-size:16px;font-weight:bold">${escapeHtml(config.companyName || '')}</div>
      <div style="font-size:12px;color:#737373;margin-top:2px">Árajánlat ${escapeHtml(quote.quoteNumber || '')}</div>
    </div>
    <div style="padding:24px 28px;font-size:14px;line-height:1.6;color:#333333">
      ${paragraphs}
      <div style="margin-top:20px;padding:14px 16px;background:#fafafa;border:1px solid #ebebeb;border-radius:8px">
        <span style="color:#737373;font-size:12px">Összesen (nettó, + Áfa)</span><br/>
        <span style="font-size:20px;font-weight:bold">${formatDotNumber(quote.primaryTotalEur || 0)} EUR</span>
        <span style="color:#737373;font-size:13px"> · ${formatDotNumber(quote.primaryTotalHuf || 0)} Ft</span>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#737373">A részletes árajánlatot PDF mellékletben küldjük.</p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #ebebeb;font-size:12px;color:#9a9a9a">
      ${escapeHtml(config.companyName || '')}${contact ? ` · ${escapeHtml(contact)}` : ''}
    </div>
  </div>
  ${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0"/>` : ''}
</body></html>`;
}
