import {
  DimensionSource,
  MountType,
  ProductPricingMode,
  QuoteStatus,
  SystemConfig,
} from './types';

export const MOUNT_TYPES: { id: MountType; label: string; description: string }[] = [
  {
    id: 'Épülethez rögzített',
    label: 'Épülethez rögzített',
    description: 'Homlokzathoz / falhoz csatlakozó kivitel',
  },
  {
    id: 'Szabadon álló',
    label: 'Szabadon álló',
    description: 'Önálló lábakon álló szerkezet',
  },
  {
    id: 'Meglévő szerkezetre',
    label: 'Meglévő szerkezetre',
    description: 'Meglévő pergola, tető vagy nyílászáró fölé/alá',
  },
  {
    id: 'Egyedi',
    label: 'Egyedi beépítés',
    description: 'Speciális helyszíni kialakítás',
  },
];

export const PRICING_MODE_OPTIONS: {
  id: ProductPricingMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'fixed',
    label: 'Fix darabár / csomagár',
    shortLabel: 'Fix ár',
    description: 'Fix összeg (pl. motor, távirányító, LED szett, szenzor, kiegészítő)',
  },
  {
    id: 'per_m2',
    label: 'Négyzetméter (m²) alapú ár',
    shortLabel: 'm² ár',
    description: 'Felület (m²) × megadott m² egységár',
  },
  {
    id: 'tiered_m2',
    label: 'Sávos négyzetméter (m²) ár',
    shortLabel: 'Sávos m² ár',
    description: 'Mérettől függő m² ár (pl. 15 m²-ig X EUR/m², 15 m² felett Y EUR/m²)',
  },
  {
    id: 'base_plus_m2',
    label: 'Fix alapár + m² ár',
    shortLabel: 'Alapár + m²',
    description: 'Fix induló alapár + minden négyzetméter után m² felár',
  },
  {
    id: 'per_lm',
    label: 'Folyóméter (fm) alapú ár',
    shortLabel: 'Folyóméter ár',
    description: 'Szélesség, kinyúlás vagy kerület (fm) × folyóméter ár',
  },
  {
    id: 'base_plus_lm',
    label: 'Fix alapár + folyóméter (fm) ár',
    shortLabel: 'Alapár + fm',
    description: 'Fix induló alapár + folyóméterenkénti díj',
  },
  {
    id: 'matrix_cm',
    label: 'Mérettábla / Mátrix árazás (cm × cm)',
    shortLabel: 'Mérettábla (Mátrix)',
    description: 'Szélesség (cm) és Kinyúlás/Magasság (cm) táblázatból kikeresett ár',
  },
  {
    id: 'percentage',
    label: 'Százalékos díj (pl. Szerelési munkadíj)',
    shortLabel: 'Százalékos (%)',
    description: 'A sablonban lévő alaptételek összegének megadott százaléka (minimum díjjal)',
  },
];

export const DIMENSION_SOURCE_OPTIONS: {
  id: DimensionSource;
  label: string;
  unit: 'm²' | 'fm';
}[] = [
  { id: 'roof', label: 'Tetőfelület: Szélesség × Kinyúlás (m²)', unit: 'm²' },
  { id: 'front_wall', label: 'Első oldal: Szélesség × Magasság (m²)', unit: 'm²' },
  { id: 'side_wall', label: 'Oldalsó fal: Kinyúlás × Magasság (m²)', unit: 'm²' },
  { id: 'both_walls', label: 'Szélesség + Kinyúlás oldalfal × Magasság (m²)', unit: 'm²' },
  { id: 'all_walls', label: 'Mind a 4 oldal kerülete × Magasság (m²)', unit: 'm²' },
  { id: 'width_lm', label: 'Szélesség / Hosszúság (folyóméter)', unit: 'fm' },
  { id: 'proj_lm', label: 'Kinyúlás / Mélység (folyóméter)', unit: 'fm' },
  { id: 'height_lm', label: 'Magasság (folyóméter)', unit: 'fm' },
  { id: 'front_side_lm', label: 'Szélesség + Kinyúlás együtt (folyóméter)', unit: 'fm' },
  { id: 'perimeter_lm', label: 'Teljes kerület: 2 × (Szélesség + Kinyúlás) (fm)', unit: 'fm' },
];

export const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; badgeClass: string }
> = {
  piszkozat: {
    label: 'Piszkozat / Szerkeszthető',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  kikuldve: {
    label: 'Kiküldve ügyfélnek',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  megnyitva: {
    label: 'Ügyfél megnyitotta',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  elfogadva: {
    label: 'Elfogadva / Megrendelve',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  elutasitva: {
    label: 'Elutasítva / Lejárt',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const QUICK_CATEGORY_SUGGESTIONS = [
  {
    name: 'Pergola',
    questionPrompt: 'Kér az ügyfél pergolát?',
    categoryType: 'main_structure' as const,
    description: 'Bioklimatikus, ponyvás vagy fix tetős pergolák',
  },
  {
    name: 'Előtető',
    questionPrompt: 'Kér az ügyfél előtetőt?',
    categoryType: 'main_structure' as const,
    description: 'Polikarbonát, üveg vagy alumínium előtetők',
  },
  {
    name: 'Üvegtető',
    questionPrompt: 'Kér az ügyfél üvegtetőt?',
    categoryType: 'main_structure' as const,
    description: 'Edzett, laminált biztonsági üvegtetős rendszerek',
  },
  {
    name: 'Napellenző',
    questionPrompt: 'Kér az ügyfél napellenzőt?',
    categoryType: 'accessory' as const,
    description: 'Kazettás, könyökkaros és tetőre szerelhető napellenzők',
  },
  {
    name: 'Üvegfal',
    questionPrompt: 'Kér az ügyfél üvegfalat?',
    categoryType: 'accessory' as const,
    description: 'Keret nélküli eltolható vagy fix biztonsági üvegfalak',
  },
  {
    name: 'Oldalsó árnyékoló (ZIP)',
    questionPrompt: 'Kér az ügyfél oldalsó árnyékolót (ZIP)?',
    categoryType: 'accessory' as const,
    description: 'Motoros, szélálló oldalsó textilárnyékoló rendszerek',
  },
  {
    name: 'LED világítás',
    questionPrompt: 'Kér az ügyfél LED világítást?',
    categoryType: 'accessory' as const,
    description: 'Integrált LED szalag, spot világítás vagy RGBW rendszer',
  },
];

export const TEMPLATE_VARIABLES_HELP = [
  { token: '{{ugyfel_nev}}', label: 'Ügyfél teljes neve (pl. Kovács János)' },
  { token: '{{megszolitas}}', label: 'Megszólítás (pl. Kovács János / János)' },
  { token: '{{telepules}}', label: 'Település (pl. Budapest)' },
  { token: '{{meret}}', label: 'Méret cm-ben (pl. 600x400x250 cm)' },
  { token: '{{meret_m}}', label: 'Méret méterben (pl. 6 x 4 m)' },
  { token: '{{szelesseg}}', label: 'Szélesség cm-ben (pl. 600)' },
  { token: '{{kinyulas}}', label: 'Kinyúlás cm-ben (pl. 400)' },
  { token: '{{magassag}}', label: 'Magasság cm-ben (pl. 250)' },
  { token: '{{m2}}', label: 'Alapterület m²-ben (pl. 24.0 m²)' },
  { token: '{{beepites}}', label: 'Beépítés módja (pl. Épülethez rögzített)' },
  { token: '{{arfolyam}}', label: 'EUR/HUF árfolyam (pl. 400)' },
  { token: '{{szallitas}}', label: 'Szállítási díj Ft-ban (pl. 40.000 Ft)' },
  { token: '{{datum}}', label: 'Mai dátum (pl. 2026. 10. 18.)' },
];

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  companyName: 'Egyedi Pergola & Árnyékolástechnika',
  companySubtitle: 'Pergolák • Előtetők • Napellenzők • Üvegtetők • Árnyékolók',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  defaultEurHufRate: 400,
  defaultDeliveryFeeHuf: 40000,
  defaultListPriceMultiplier: 1.25,
  defaultDiscountLabel: '-20%',
  defaultGreetingTemplate: 'Kedves {{megszolitas}}!',
  defaultIntroTemplate:
    'Örömmel fogadtuk megkeresését! Kérésének megfelelően küldjük személyre szabott árajánlatunkat az Ön által megadott ({{meret_m}} / {{meret}}, {{beepites}}) paraméterek alapján.',
  defaultClosingInfoTemplate:
    'Információk és feltételek:\n• Az árajánlat érvényessége: 30 nap\n• Helyszín / Szállítás ({{telepules}}): {{szallitas}} (+Áfa)\n• Árfolyam: {{arfolyam}} Ft/EUR\n• Amennyiben ajánlatunk elnyerte tetszését, kérjük jelezzen vissza helyszíni felmérés és pontosítás céljából.',
  pdfPageBackgroundUrl: '',
  pdfLogoUrl: '',
  pdfSignatureCardUrl: '',
};

export interface VariableReplacementContext {
  customerName?: string;
  greetingName?: string;
  city?: string;
  widthCm?: number;
  projectionCm?: number;
  heightCm?: number;
  mountType?: string;
  eurHufRate?: number;
  deliveryFeeHuf?: number;
}

export function formatDotNumber(val: number | undefined | null): string {
  const n = Math.round(Number(val || 0));
  return n.toLocaleString('de-DE');
}

export function replaceTemplateVariables(
  text: string | undefined,
  ctx: VariableReplacementContext
): string {
  if (!text) return '';
  const customerName = (ctx.customerName || 'Ügyfél').trim();
  const greetingName = (ctx.greetingName || customerName || 'Érdeklődő').trim();
  const city = (ctx.city || 'Budapest').trim();
  const w = Number(ctx.widthCm || 600);
  const p = Number(ctx.projectionCm || 400);
  const h = Number(ctx.heightCm || 250);
  const wMeter = (w / 100).toFixed(w % 100 === 0 ? 0 : 1).replace('.', ',');
  const pMeter = (p / 100).toFixed(p % 100 === 0 ? 0 : 1).replace('.', ',');
  const m2 = ((w / 100) * (p / 100)).toFixed(1).replace('.', ',');
  const mount = ctx.mountType || 'Épülethez rögzített';
  const rate = Number(ctx.eurHufRate || 400);
  const delivery = formatDotNumber(ctx.deliveryFeeHuf ?? 40000) + ' Ft';
  const today = new Date().toLocaleDateString('hu-HU');

  return text
    .replace(/\{\{\s*ugyfel_nev\s*\}\}/gi, customerName)
    .replace(/\{\{\s*nev\s*\}\}/gi, customerName)
    .replace(/\{\{\s*megszolitas\s*\}\}/gi, greetingName)
    .replace(/\{\{\s*telepules\s*\}\}/gi, city)
    .replace(/\{\{\s*szelesseg\s*\}\}/gi, String(w))
    .replace(/\{\{\s*kinyulas\s*\}\}/gi, String(p))
    .replace(/\{\{\s*magassag\s*\}\}/gi, String(h))
    .replace(/\{\{\s*meret\s*\}\}/gi, `${w}x${p}x${h} cm`)
    .replace(/\{\{\s*meret_m\s*\}\}/gi, `${wMeter} x ${pMeter} m`)
    .replace(/\{\{\s*m2\s*\}\}/gi, `${m2} m²`)
    .replace(/\{\{\s*beepites\s*\}\}/gi, mount)
    .replace(/\{\{\s*arfolyam\s*\}\}/gi, String(rate))
    .replace(/\{\{\s*szallitas\s*\}\}/gi, delivery)
    .replace(/\{\{\s*datum\s*\}\}/gi, today);
}
