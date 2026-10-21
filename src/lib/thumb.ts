/**
 * Felületi előnézet: a beépített (legacy) képek kicsinyített JPEG-másolata
 * (scripts/make-thumbnails.py). Feltöltött képeknél az eredeti URL marad.
 */
export function thumbUrl(url?: string): string {
  if (!url) return '';
  return url.startsWith('/uploads/legacy/') ? `/uploads/_thumb${url.slice('/uploads'.length)}.jpg` : url;
}

/**
 * A termék borítóképe: a sablon első fotója, ha nincs, egy alaptétel fotója.
 * Extrák képe (színkártya, LED, érzékelő) nem lehet borítókép.
 */
export function templateCoverUrl(tpl: {
  photos?: { imageUrl?: string }[];
  materials?: { itemRole?: string; photos?: { imageUrl?: string }[] }[];
}): string {
  const own = tpl.photos?.find((p) => p.imageUrl)?.imageUrl;
  if (own) return own;
  for (const m of (tpl.materials || []).filter((x) => x.itemRole === 'base')) {
    const u = m.photos?.find((p) => p.imageUrl)?.imageUrl;
    if (u) return u;
  }
  return '';
}
