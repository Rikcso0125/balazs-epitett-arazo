export type BuiltinTermekTipusId =
  | 'bioklimatikus'
  | 'elhuzhato_ponyvas'
  | 'feszitett_vasznas'
  | 'feszitett_vasznas_tetore'
  | 'polikarbonatos'
  | 'uvegfalas'
  | 'uvegtetos'
  | 'ZIPes';

export type TermekTipusId = BuiltinTermekTipusId | string;

export type BeepitesTipusId = 'Épülethez rögzített' | 'Szabadon álló';

export type QuoteStatus =
  | 'piszkozat'
  | 'kikuldve'
  | 'megnyitva'
  | 'elfogadva'
  | 'elutasitva';

export interface M2PriceTier {
  maxM2: number;
  eurPerM2: number;
}

export interface M2FixSzerelesTier {
  maxM2: number;
  fixEur: number;
}

export interface CustomCategoryConfig {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
}

export type TemplatePricingMethod = 'm2_tiers' | 'base_plus_m2' | 'matrix_clone';

export interface TemplatePhotoItem {
  url: string;
  description: string;
}

export interface TemplateSelectablePreset {
  id: string;
  label: string;
  val: number;
  isCustom?: boolean;
}

export interface TemplateCustomExtraItem {
  id: string;
  name: string;
  priceEur: number;
  mode: 'base' | 'optional' | 'gift';
  selected: boolean;
}

export interface ModelPricingRule {
  id: string;
  name: string;
  category: TermekTipusId;
  description: string;
  enabled: boolean;
  szorzo: number; // pl. 0.66
  extraDiscountPct: number; // pl. 10 (ha -10% levonás van a szorzó után, mint Kedry Skylife-nál)
  fixFelarEur: number; // pl. 2500 EUR
  motorEur: number; // pl. 0, 523, 600, 800, 1000
  taviranyitoEur: number; // pl. 100
  ledEur: number; // pl. 700, 900, 400
  szerelesPctLow: number; // pl. 11%
  szerelesPctMid: number; // pl. 10%
  szerelesPctHigh: number; // pl. 10%
  szerelesThreshold1: number; // pl. 5000 vagy 8500 EUR
  szerelesThreshold2: number; // pl. 7500 vagy 8500 EUR
  giftInfraHeating: boolean;
  giftRainWindSensor: boolean;
  // Varázslóval létrehozott / bővített sablon mezők
  isCustomTemplate?: boolean;
  pricingMethod?: TemplatePricingMethod;
  baseStartEur?: number;
  eurPerM2Wall?: number;
  eurPerM2Free?: number;
  customM2Tiers?: M2PriceTier[];
  matrixSourceId?: string;
  supportedMountTypes?: 'both' | 'wall_only' | 'free_only';
  minProjectionCm?: number;
  maxProjectionCm?: number;
  minWidthCm?: number;
  maxWidthCm?: number;
  szerelesMode?: 'percentage' | 'fixed';
  szerelesFixEur?: number;
  szerelesMinEur?: number;
  allowZipSide?: boolean;
  allowUvegfalSide?: boolean;
  customGiftLabel?: string;
  pdfPhotos?: TemplatePhotoItem[];
  selectedMotorIds?: string[];
  customMotorPresets?: TemplateSelectablePreset[];
  selectedRemoteIds?: string[];
  customRemotePresets?: TemplateSelectablePreset[];
  selectedLedIds?: string[];
  customLedPresets?: TemplateSelectablePreset[];
  customExtraItems?: TemplateCustomExtraItem[];
  customPhoto1DescPresets?: string[];
  customPhoto2DescPresets?: string[];
}

export interface AdminConfig {
  general: {
    listaArSzorzo: number; // 1.25
    discountBadgePct: number; // 20 (-20%)
    defaultEurHufRate: number; // 400
    defaultSzallitasiDij: number; // 40000
    zipSzerelesBioklimatikusPct: number; // 8
    zipSzerelesPergolaPct: number; // 10
    zipSzerelesOnalloPct: number; // 12
    uvegfalSzerelesPct: number; // 12
    uvegfalSpanyolSzerelesPct: number; // 11
    spotVilagitasDarabArEur: number; // 50
    companyName: string;
    companyEmail: string;
    companyPhone: string;
  };
  models: Record<string, ModelPricingRule>;
  customCategories?: CustomCategoryConfig[];
  m2Tiers: {
    seeskyBioFree: M2PriceTier[];
    seeskyBioWall: M2PriceTier[];
    uvegfalLengyel: M2PriceTier[];
    uvegfalSpanyol: M2PriceTier[];
    polifix2Lab: M2PriceTier[];
    polifix3Lab: M2PriceTier[];
    polifix4Lab: M2PriceTier[];
    polifixSzereles: M2FixSzerelesTier[];
    glassfix2Lab: M2PriceTier[];
    glassfix3Lab: M2PriceTier[];
    glassfix4Lab: M2PriceTier[];
    glassfixSzereles: M2FixSzerelesTier[];
  };
  emailSettings: {
    senderName: string;
    senderEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    subjectTemplate: string;
    bodyTemplate: string;
    enableTrackingPixel: boolean;
    publicBaseUrl: string;
  };
}

export interface CalculatedModelOption {
  modelId: string;
  modelName: string;
  subtitle: string;
  enabled: boolean;
  calculatedProjection: number;
  calculatedWidth: number;
  calculatedHeight: number;
  sizeWarning: string;
  legsCount: number;
  modulesCount: number;
  // Alapszerkezet árak (EUR)
  listaArEur: number;
  kedvezmenyesAlaparEur: number;
  motorEur: number;
  taviranyitoEur: number;
  szerelesEur: number;
  szerelesPct: number;
  customDiscountPct: number; // Egyedi ajánlat-szintű kedvezmény/felár %
  alapszerkezetOsszesenEur: number;
  alapszerkezetOsszesenHuf: number;
  // Opcionális tételek (EUR / HUF)
  ledEur: number;
  ledHuf: number;
  spotCount?: number;
  spotEur?: number;
  zipWidthNetCm: number;
  zipProjectionNetCm: number;
  zipWidthEur: number;
  zipProjectionEur: number;
  zipSzerelesEur: number;
  zipOsszesenEur: number;
  zipOsszesenHuf: number;
  uvegfalWidthTablak: number;
  uvegfalProjectionTablak: number;
  uvegfalWidthEur: number;
  uvegfalProjectionEur: number;
  uvegfalHaromszogEur?: number;
  uvegfalSzerelesEur: number;
  uvegfalOsszesenEur: number;
  uvegfalOsszesenHuf: number;
  tetoArnyekoloEur?: number;
  tetoArnyekoloHuf?: number;
  pdfPhotos?: TemplatePhotoItem[];
  customExtraItems?: TemplateCustomExtraItem[];
}

export interface TrackingEvent {
  id: string;
  quoteId: string;
  trackingId: string;
  customerName: string;
  email: string;
  openedAt: string;
  ipAddress: string;
  userAgent: string;
  isSimulated?: boolean;
}

export interface QuoteRecord {
  id: string;
  quoteNumber: string;
  filename?: string;
  createdAt: string;
  updatedAt: string;
  status: QuoteStatus;
  // Ügyfél adatok
  customerName: string;
  greetingName: string;
  email: string;
  phone: string;
  city: string;
  szallitasiDijHuf: number;
  eurHufRate: number;
  // Termék és méretek
  termekTipus: TermekTipusId;
  beepitesTipus: BeepitesTipusId;
  projection: number; // A | Hosszúság / Szélesség (cm)
  width: number;      // B | Kinyúlás / Mélység (cm)
  height: number;     // C | Magasság (cm)
  // Opciók
  hasUvegfal: boolean;
  hasZip: boolean;
  hasNoSideWall: boolean;
  hasLed: boolean;
  hasSensors: boolean;
  hasHeating: boolean;
  hasSmartHome: boolean;
  // Kalkulált tételek és összegek
  calculatedOptions: CalculatedModelOption[];
  selectedOptionIndex: number; // Melyik fő opció számít elsődlegesnek a statisztikában
  primaryEur: number;
  primaryHuf: number;
  customNotes: string;
  isHistoricalPdf: boolean;
  isEdited: boolean;
  pageCount?: number;
  // Email & Pixel Tracking
  trackingId: string;
  sentAt?: string;
  sentToEmail?: string;
  sentCount: number;
  openCount: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  acceptedAt?: string;
}
