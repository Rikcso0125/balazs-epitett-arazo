/**
 * Felületi előnézet: a beépített (legacy) képek kicsinyített JPEG-másolata
 * (scripts/make-thumbnails.py). Feltöltött képeknél az eredeti URL marad.
 */
export function thumbUrl(url?: string): string {
  if (!url) return '';
  return url.startsWith('/uploads/legacy/') ? `/uploads/_thumb${url.slice('/uploads'.length)}.jpg` : url;
}
