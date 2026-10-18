export type CurrencyCode = 'EUR' | 'HUF';

export type QuoteStatus =
  | 'piszkozat'
  | 'kikuldve'
  | 'megnyitva'
  | 'elfogadva'
  | 'elutasitva';

export type MountType = 'Épülethez rögzített' | 'Szabadon álló' | 'Meglévő szerkezetre' | 'Egyedi';

/**
 * Milyen árazási módszerrel számoljon egy adott terméket vagy anyagot a rendszer:
 * - fixed: Fix darabár / csomagár (pl. 700 EUR × mennyiség)
 * - per_m2: Egyszerű m² ár (pl. 350 EUR / m²)
 * - tiered_m2: Sávos m² ár (pl. 15 m²-ig 400 EUR/m², 25 m²-ig 360 EUR/m²)
 * - base_plus_m2: Fix alapár + m² ár (pl. 1000 EUR alap + 250 EUR/m²)
 * - per_lm: Folyóméter (fm) ár (pl. Szélesség vagy Kinyúlás fm × egységár)
 * - base_plus_lm: Fix alapár + folyóméter (fm) ár
 * - matrix_cm: Szélesség (cm) × Kinyúlás/Magasság (cm) alapú mérettábla (mátrix)
 * - percentage: Százalékos díj (pl. Szerelési munkadíj az alaptételek X%-a)
 */
export type ProductPricingMode =
  | 'fixed'
  | 'per_m2'
  | 'tiered_m2'
  | 'base_plus_m2'
  | 'per_lm'
  | 'base_plus_lm'
  | 'matrix_cm'
  | 'percentage';

/**
 * Melyik méretből számolja a felületet (m²) vagy folyómétert (fm):
 */
export type DimensionSource =
  | 'roof'        // Szélesség × Kinyúlás (m²)
  | 'front_wall'  // Szélesség × Magasság (m²)
  | 'side_wall'   // Kinyúlás × Magasság (m²)
  | 'both_walls'  // (Szélesség + Kinyúlás) × Magasság (m²)
  | 'all_walls'   // (2 × Szélesség + 2 × Kinyúlás) × Magasság (m²)
  | 'width_lm'    // Szélesség (fm)
  | 'proj_lm'     // Kinyúlás (fm)
  | 'height_lm'   // Magasság (fm)
  | 'front_side_lm' // Szélesség + Kinyúlás (fm)
  | 'perimeter_lm'; // 2 × (Szélesség + Kinyúlás) (fm)

export interface M2PriceTier {
  maxM2: number;
  pricePerM2: number;
}

export interface PercentageTier {
  maxAmount: number;
  percent: number;
}

export interface CustomMatrixTable {
  rowLabel: string; // pl. "Kinyúlás (cm)" vagy "Magasság (cm)"
  colLabel: string; // pl. "Szélesség (cm)"
  rows: number[];   // pl. [200, 250, 300, 350, 400]
  cols: number[];   // pl. [300, 400, 500, 600]
  values: Record<string, Record<string, number>>; // values[row][col] = ár
}

/**
 * Fotó és a hozzá tartozó szövegdobozok (fotó feletti cím és fotó alatti leírás)
 */
export interface PhotoCaptionBlock {
  id: string;
  imageUrl: string;
  titleAbove?: string;
  captionBelow: string;
  widthPct?: number; // 30..100, alapértelmezett ~75%
  align?: 'left' | 'center' | 'right';
}

/**
 * Különálló szövegdoboz (ahová csak szöveget ír a felhasználó)
 */
export interface CustomTextBlock {
  id: string;
  title?: string;
  content: string;
  position: 'before_photos' | 'before_table' | 'after_table';
  bold?: boolean;
}

/**
 * Egy sablonhoz tartozó termék, anyag vagy munkadíj tétel
 */
export interface TemplateMaterialItem {
  id: string;
  name: string;               // pl. "Alapszerkezet", "Somfy IO Motor", "Serge 600 ponyva", "Helyszíni szerelés"
  description: string;        // Műszaki tartalom / rövid leírás
  itemRole: 'base' | 'optional' | 'gift'; // Alaptétel, Opcionális tétel, vagy Ajándék
  defaultSelected: boolean;   // Alapértelmezetten be legyen-e pipálva az árazóban
  pricingMode: ProductPricingMode;
  currency: CurrencyCode;
  dimensionSource: DimensionSource;
  // Árazási paraméterek
  basePrice: number;          // Fix ár vagy alapár
  unitPrice: number;          // m² ár vagy fm ár
  defaultQuantity: number;    // Alapértelmezett darabszám (pl. 1)
  unitLabel: string;          // pl. "db", "m²", "fm", "szett"
  m2Tiers: M2PriceTier[];     // Sávos m² árazásnál
  matrixTable?: CustomMatrixTable; // Mérettábla (cm × cm) árazásnál
  percentageRate: number;     // Százalékos díjnál (pl. 10%)
  percentageTiers?: PercentageTier[];
  minPrice: number;           // Minimum ár (pl. minimum szerelési díj)
  // Szorzók és kedvezmények
  multiplier: number;         // Beszerzési / árképzési szorzó (alapértelmezetten 1.0)
  extraDiscountPct: number;   // Extra kedvezmény % (alapértelmezetten 0)
  fixedSurcharge: number;     // Fix felár (alapértelmezetten 0)
  listPriceMultiplier: number; // Listaár szorzó a PDF táblázathoz (pl. 1.25 = +25% listaár)
  defaultNote: string;        // Megjegyzés oszlop a PDF táblázatban (pl. "-20%", "Ajándék", "Opció")
  // Termékhez közvetlenül felcsatolt fotók + fotó alatti szövegdobozok
  photos: PhotoCaptionBlock[];
}

/**
 * Fő kategória / Termékcsoport (pl. Pergola, Előtető, Napellenző, Üvegtető, Üvegfal, LED világítás)
 */
export interface ProductCategory {
  id: string;
  name: string;               // pl. "Napellenző", "Pergola", "Üvegfal", "LED világítás"
  shortName: string;
  description: string;
  questionPrompt: string;     // pl. "Kér az ügyfél napellenzőt?"
  categoryType: 'main_structure' | 'accessory'; // Fő szerkezet vagy kiegészítő
  allowMultipleTemplates: boolean; // Több sablon is kiválasztható-e egyszerre
  order: number;
}

/**
 * Sablon (pl. Napellenzőn belül 1. sablon, 2. sablon, 3. sablon...)
 * Tartalmazza a sablon szövegdobozait, képeit+képaláírásait, valamint a termékeket/anyagokat.
 */
export interface QuoteTemplate {
  id: string;
  categoryId: string;
  name: string;               // pl. "Prémium Kazettás Napellenző", "Bioklimatikus Pergola Sablon A"
  subtitle: string;           // Rövid alcím / műszaki kiemelés
  enabled: boolean;
  // Sablon szövegdobozok (automatikus {{ugyfel_nev}}, {{meret}} stb. helyettesítéssel)
  introText: string;          // Sablon bevezető szövegdoboz
  closingText: string;        // Sablon záró / összegzés alatti szövegdoboz
  textBlocks: CustomTextBlock[]; // További külön szövegdobozok
  // Sablonhoz tartozó fotók + alájuk írható szövegdobozok
  photos: PhotoCaptionBlock[];
  // Sablonhoz tartozó termékek, anyagok, opciók és munkadíjak
  materials: TemplateMaterialItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Feltöltött képek médiatára (hogy a feltöltött fotókat újra fel lehessen használni)
 */
export interface UploadedMediaItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  category?: string;
  uploadedAt: string;
}

/**
 * A generálandó és utólag is szerkeszthető PDF árajánlat táblázatának egy sora
 */
export interface QuoteTableRow {
  id: string;
  materialId?: string;
  name: string;               // Szerkeszthető szövegdoboz: Tétel / Termék / Anyag megnevezése
  description?: string;       // Opcionális kiegészítő sorleírás
  quantityLabel: string;      // Algoritmus által számolt mennyiség/méret (pl. "24.0 m²", "1 db")
  listPriceEur: number;       // Algoritmus által számolt listaár (EUR)
  discountPriceEur: number;   // Algoritmus által számolt kedvezményes ár (EUR)
  formulaSummary?: string;    // Rövid leírás az algoritmus számításáról (pl. "24.0 m² × 350 EUR/m²")
  currency: CurrencyCode;
  itemRole: 'base' | 'optional' | 'gift';
  included: boolean;          // Benne van-e a PDF-ben
  note: string;               // Szerkeszthető megjegyzés (pl. "-20%", "Ajándék", "Opció")
  photos: PhotoCaptionBlock[]; // Termékhez csatolt fotók + fotó alatti szövegdobozok
  algorithm?: TemplateMaterialItem; // A tétel mögötti kötelező árazási algoritmus
}

/**
 * Blokkos, utólag is szabadon szerkeszthető PDF Dokumentum Elemek (QuoteDocumentBlock)
 */
export type QuoteBlockType =
  | 'text_box'         // Különálló szövegrész / szövegdoboz (megszólítás, bevezető, műszaki szöveg, záradék)
  | 'photo_box'        // Önálló fotó + fotó feletti/alatti szövegdoboz
  | 'template_section' // Felrakott sablon blokk (cím, szövegdobozok, fotók+leírások, termékek és ártáblázat)
  | 'page_break';      // Explicit oldaltörés a PDF-ben

export interface QuoteDocumentBlock {
  id: string;
  type: QuoteBlockType;
  // 1) 'text_box' mezők
  title?: string;
  content?: string;
  textStyle?: 'greeting' | 'normal' | 'highlight' | 'footer_info';
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  // 2) 'photo_box' mezők
  photo?: PhotoCaptionBlock;
  // 3) 'template_section' mezők
  templateId?: string;
  categoryId?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  sectionIntroText?: string;
  sectionPhotos?: PhotoCaptionBlock[];
  tableTitle?: string;
  tableHeaders?: [string, string, string, string];
  rows?: QuoteTableRow[];
  autoCalculateTotals?: boolean;
  customTotalBaseEur?: number;
  customTotalBaseHuf?: number;
  sectionClosingText?: string;
}

/**
 * Egy elmentett, bármikor újraszerkeszthető és újragenerálható Árajánlat (QuoteRecord)
 */
export interface QuoteRecord {
  id: string;
  quoteNumber: string;
  filename?: string;
  createdAt: string;
  updatedAt: string;
  status: QuoteStatus;
  // Ügyfél & Név-automatizáció adatok
  customerName: string;       // Ügyfél teljes neve (pl. "Kovács János")
  greetingName: string;       // Megszólítás (pl. "Kovács János" vagy "János")
  email: string;
  phone: string;
  city: string;
  inquiryNotes: string;       // Weboldalról bejött nyers megkeresés / ügyféligény szövege
  // Méretek (cm) és alapbeállítások
  widthCm: number;            // Szélesség / Hosszúság (cm), pl. 600 cm (6 m)
  projectionCm: number;       // Kinyúlás / Mélység (cm), pl. 400 cm (4 m)
  heightCm: number;           // Magasság (cm), pl. 250 cm
  mountType: MountType;       // Beépítés módja
  eurHufRate: number;         // EUR/HUF árfolyam
  deliveryFeeHuf: number;     // Szállítási díj (HUF)
  // Végigvezetett árazóban kiválasztott kategóriák és sablonok
  selectedCategoryIds: string[];
  selectedTemplateIds: string[];
  // A teljes, blokkosan szerkeszthető PDF dokumentum felépítése
  blocks: QuoteDocumentBlock[];
  // Összesített fő árak a listázáshoz
  primaryTotalEur: number;
  primaryTotalHuf: number;
  isEditedAfterGeneration: boolean;
}

/**
 * Rendszer és PDF megjelenési beállítások
 */
export interface SystemConfig {
  companyName: string;
  companySubtitle: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  defaultEurHufRate: number;
  defaultDeliveryFeeHuf: number;
  defaultListPriceMultiplier: number; // pl. 1.25 (+25% listaár)
  defaultDiscountLabel: string;       // pl. "-20%"
  // Alapértelmezett globális szövegsablonok (automatikus helyettesítőkkel)
  defaultGreetingTemplate: string;
  defaultIntroTemplate: string;
  defaultClosingInfoTemplate: string;
  // Opcionális saját feltöltött PDF dizájn elemek (ha üres, tiszta modern fejlécet rajzol)
  pdfPageBackgroundUrl?: string;      // Saját A4-es fejléc/lábléc háttérkép URL
  pdfLogoUrl?: string;                // Saját logó URL
  pdfSignatureCardUrl?: string;       // Saját névjegy / aláírás kép URL a PDF végére
}

export interface DatabaseSchema {
  config: SystemConfig;
  categories: ProductCategory[];
  templates: QuoteTemplate[];
  quotes: QuoteRecord[];
  mediaLibrary: UploadedMediaItem[];
}
