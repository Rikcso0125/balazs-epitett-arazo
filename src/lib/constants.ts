import {
  AdminConfig,
  BeepitesTipusId,
  QuoteStatus,
  TemplatePhotoItem,
  TermekTipusId,
} from './types';

export interface ProductTypeInfo {
  id: TermekTipusId;
  name: string;
  shortName: string;
  subtitle: string;
  image: string;
  modelsSummary: string;
  badgeColor: string;
}

export const LEGACY_MODEL_DEFAULT_PHOTOS: Record<string, TemplatePhotoItem[]> = {
  SB400: [
    {
      url: '/api/template-images/bioklimatikus/image_01.jpg',
      description:
        'Alumínium vázával, 0-120° között elforgatható lamellával, oszlopaiban rejtett esővíz elvezetésével jó választás az időjárás elemeivel szemben. A lamellák mozgatását villanymotor végzi, amelyet távirányítóval vezérelhetünk.',
    },
    {
      url: '/api/template-images/bioklimatikus/image_02.jpg',
      description:
        'A lamellák állása szabályozza a bejutó fényt. A motor látható a pergola tetején, opcionálisan lehet kérni elrejtve, a gerendákban elhelyezve.',
    },
  ],
  SESKY_BIO: [
    {
      url: '/api/template-images/bioklimatikus/image_09.png',
      description:
        'Spanyol prémium hőszigetelt lamellás pergola. A lamellák mozgatását villanymotor végzi, amelyet távirányítóval vagy okostelefonnal vezérelhetünk. Motor rejtve a gerendákban.',
    },
    {
      url: '/api/template-images/bioklimatikus/image_10.png',
      description:
        'A lamellák állása szabályozza a bejutó fényt és a természetes légáramlást, oszlopaiban rejtett esővíz elvezetéssel.',
    },
  ],
  KEDRY_SKYLIFE: [
    {
      url: '/api/template-images/bioklimatikus/image_13.png',
      description:
        'Olasz csúcskategóriás bioklimatikus pergola, amelynél a lamellák egyetlen mozdulattal elforgathatóak és el is húzhatóak (250 kg/m² hóterhelés).',
    },
    {
      url: '/api/template-images/bioklimatikus/image_14.jpg',
      description:
        'Rejtett motorizációval, gerendába integrálható Vertica Prime ZIP árnyékolóval és panoráma üvegfalrendszerrel.',
    },
  ],
  A100LUX: [
    {
      url: '/api/template-images/elhuzhato_ponyvas/image_01.jpg',
      description:
        'Olasz elhúzható PVC ponyvás pergola rendszer előtetővel. A feszített, 3 rétegű hővédő PVC ponyva motorosan elhúzható és távirányítóval vezérelhető.',
    },
    {
      url: '/api/template-images/elhuzhato_ponyvas/image_02.png',
      description:
        'Integrált esőcsatornával és az első oszlopokban rejtett csapadékvíz-elvezetéssel, 1–3 modulos kivitelben.',
    },
  ],
  KEPLAN: [
    {
      url: '/api/template-images/elhuzhato_ponyvas/image_05.jpg',
      description:
        'Modern, vízszintes sík tetejű elhúzható ponyvás pergola rendszer, amelynek mozgatását villanymotor végzi, távirányítóval vagy okostelefonnal vezérelve.',
    },
    {
      url: '/api/template-images/elhuzhato_ponyvas/image_06.png',
      description:
        'Letisztult olasz formatervezés, kiváló ár-érték arányú teraszfedés opcionális LED világítással és oldalzárással.',
    },
  ],
  ISOLA_2A: [
    {
      url: '/api/template-images/elhuzhato_ponyvas/image_10.jpg',
      description:
        'Olasz KE prémium, alacsony ívelésű feszített ponyvás pergola, amely különleges megjelenésével és vízszintes csúsztatásával emelkedik ki.',
    },
    {
      url: '/api/template-images/elhuzhato_ponyvas/image_11.jpg',
      description:
        'A tető mozgatását Somfy motor végzi, rejtett vízelvezetéssel, integrálható LED világítással és üvegfalrendszerrel.',
    },
  ],
  PERGOLA_V_ZIIP: [
    {
      url: '/api/template-images/feszitett_vasznas/image_01.png',
      description:
        'Speciális ZIP-rendszerű oldalsó megvezetéssel ellátott feszített vásznas pergola, amely biztosítja, hogy a ponyva mindig feszes és ráncoktól mentes maradjon.',
    },
    {
      url: '/api/template-images/feszitett_vasznas/image_02.png',
      description:
        'Motoros vezérléssel, távirányítóval és időjárás-érzékelőkkel, modern antracit vagy egyedi RAL alumínium vázzal.',
    },
  ],
  HYDRA: [
    {
      url: '/api/template-images/feszitett_vasznas/image_05.png',
      description:
        'Olasz elhúzható feszített vásznas pergola víztaszító szövettel, szél- és fényérzékelő szenzorokkal, egyetlen gombnyomással távirányítóról kezelhetően.',
    },
    {
      url: '/api/template-images/feszitett_vasznas/image_06.png',
      description:
        'Rejtett esővíz-elvezetés az első oszlopokban, opcionális szabályozható LED világítással és oldalsó árnyékolókkal.',
    },
  ],
  VERANDA_TENS_TETORE: [
    {
      url: '/api/template-images/feszitett_vasznas_tetore/image_01.png',
      description:
        'Meglévő télikertre, üvegtetőre vagy pergolára (tető fölé és alá is) szerelhető, bowden huzalos feszített motoros tetőárnyékoló.',
    },
    {
      url: '/api/template-images/feszitett_vasznas_tetore/image_02.png',
      description:
        'Kapható egymodulos és többmodulos változatban is, Somfy IO motoros ponyvavezérléssel és távirányítóval.',
    },
  ],
  VERANDA_V_ZIP: [
    {
      url: '/api/template-images/feszitett_vasznas_tetore/image_05.png',
      description:
        'Meglévő szerkezetre építhető ZIP-rendszerű feszített árnyékoló, amely lehetővé teszi, hogy a ponyva mindig feszes maradjon az oldalsó megvezető profilokban.',
    },
    {
      url: '/api/template-images/feszitett_vasznas_tetore/image_06.png',
      description:
        'Szélálló kivitel motoros meghajtással, tökéletes hő- és fényvédelem üvegtetők és pergolák fölé vagy alá.',
    },
  ],
  POLIFIX: [
    {
      url: '/api/template-images/polikarbonatos/image_01.jpg',
      description:
        '16 mm-es opál vagy víztiszta üregkamrás polikarbonát fedésű prémium alumínium pergola, amely magas fényáteresztést és 10 év garanciát biztosít UV-sugárzással és jégesővel szemben.',
    },
    {
      url: '/api/template-images/polikarbonatos/image_02.png',
      description:
        'Integrált vízelvezetéssel, opcionális fix polikarbonát oldalfallal, eltolható üvegfalrendszerrel és LED világítással.',
    },
  ],
  GLASSFIX: [
    {
      url: '/api/template-images/uvegtetos/image_01.png',
      description:
        '10 mm vastag edzett, laminált biztonsági üvegtetős prémium alumínium pergola belső csatornarendszerű esővíz-elvezetéssel.',
    },
    {
      url: '/api/template-images/uvegtetos/image_02.png',
      description:
        'Bővíthető motoros Veranda Tens tetőárnyékolóval és keret nélküli eltolható üvegfalakkal, teljes értékű télikertet kialakítva.',
    },
  ],
  VERANDA_TENS_UVEGTETOS: [
    {
      url: '/api/template-images/uvegtetos/image_04.png',
      description:
        'Üvegtető fölé vagy alá szerelhető motoros feszített vásznas tetőárnyékoló szél-, eső- és fényérzékelő automatikával.',
    },
    {
      url: '/api/template-images/uvegtetos/image_05.jpg',
      description:
        'Hatékonyan megakadályozza az üvegtető alatti tér felmelegedését, távirányítóval vagy okosotthon vezérlővel irányítható.',
    },
  ],
  REFLEKSOL_120_ZIP: [
    {
      url: '/api/template-images/ZIPes/image_01.jpg',
      description:
        'Szélálló (EN 13561 6. osztály, 119 km/h) motoros oldalsó ZIP árnyékoló Serge 600 üvegszálas naphálóval és Somfy / Blebox IO motorral.',
    },
    {
      url: '/api/template-images/ZIPes/image_02.jpg',
      description:
        'A speciális oldalsó zipzáras megvezetés biztosítja a ponyva feszességét és a teljes szúnyogháló funkciót is.',
    },
  ],
  VERTICA_PRIME_ZIP: [
    {
      url: '/api/template-images/ZIPes/image_03.png',
      description:
        'Pergola gerendába rejtve integrálható prémium motoros ZIP árnyékoló Soltis 92 mikroperforált textilből.',
    },
    {
      url: '/api/template-images/ZIPes/image_04.png',
      description:
        'Láthatatlanul illeszkedik a szerkezetbe, távirányítóval vagy okostelefonos applikációval vezérelhető.',
    },
  ],
  UVEGFAL_RENDSZER: [
    {
      url: '/api/template-images/uvegfalas/image_01.png',
      description:
        'Keret nélküli, síneken csúszó 10 mm vastag edzett biztonsági üvegfalrendszer, amely megvédi a belső teret a széltől, esőtől és zajtól.',
    },
    {
      url: '/api/template-images/uvegfalas/image_04.jpg',
      description:
        'Az üvegtáblák sorolhatóak, mozgatás közben egymáshoz csatlakoznak, átlátszó szilikon profillal és belső biztonsági zárral.',
    },
  ],
};

export const CATEGORY_DEFAULT_PHOTOS: Record<string, TemplatePhotoItem[]> = {
  bioklimatikus: LEGACY_MODEL_DEFAULT_PHOTOS.SB400,
  elhuzhato_ponyvas: LEGACY_MODEL_DEFAULT_PHOTOS.A100LUX,
  feszitett_vasznas: LEGACY_MODEL_DEFAULT_PHOTOS.PERGOLA_V_ZIIP,
  feszitett_vasznas_tetore: LEGACY_MODEL_DEFAULT_PHOTOS.VERANDA_TENS_TETORE,
  polikarbonatos: LEGACY_MODEL_DEFAULT_PHOTOS.POLIFIX,
  uvegtetos: LEGACY_MODEL_DEFAULT_PHOTOS.GLASSFIX,
  uvegfalas: LEGACY_MODEL_DEFAULT_PHOTOS.UVEGFAL_RENDSZER,
  ZIPes: LEGACY_MODEL_DEFAULT_PHOTOS.REFLEKSOL_120_ZIP,
};

export function getDefaultPhotosForModel(
  modelId?: string,
  category?: string
): TemplatePhotoItem[] {
  if (modelId && LEGACY_MODEL_DEFAULT_PHOTOS[modelId]) {
    return LEGACY_MODEL_DEFAULT_PHOTOS[modelId].map((p) => ({ ...p }));
  }
  if (category && CATEGORY_DEFAULT_PHOTOS[category]) {
    return CATEGORY_DEFAULT_PHOTOS[category].map((p) => ({ ...p }));
  }
  return LEGACY_MODEL_DEFAULT_PHOTOS.SB400.map((p) => ({ ...p }));
}

export const PRODUCT_TYPES: ProductTypeInfo[] = [
  {
    id: 'bioklimatikus',
    name: 'Bioklimatikus pergola',
    shortName: 'Bioklimatikus',
    subtitle: 'Forgatható / elhúzható lamellás tetővel (3 modell)',
    image: '/images/products/bioklimatikus.png',
    modelsSummary: 'Solare 400 • SeeSky Bio • Kedry Skylife',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'elhuzhato_ponyvas',
    name: 'Elhúzható PVC ponyvás',
    shortName: 'Elhúzható ponyvás',
    subtitle: 'Motoros elhúzható PVC tetős pergolák (3 modell)',
    image: '/images/products/elhuzhato_ponyvas.png',
    modelsSummary: 'Gennius A100 LUX • Keplan • Isola 2A',
    badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  {
    id: 'feszitett_vasznas',
    name: 'Feszített vásznas pergola',
    shortName: 'Feszített vásznas',
    subtitle: 'Elhúzható feszített vásznas és PVC pergolák (3 modell)',
    image: '/images/products/feszitett_vasznas.png',
    modelsSummary: 'Pergola V ZIIP • Hydra • Gennius A100 LUX',
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'feszitett_vasznas_tetore',
    name: 'Feszített vásznas tetőre',
    shortName: 'Vásznas tetőre',
    subtitle: 'Meglévő szerkezetre építhető árnyékolók (2 modell)',
    image: '/images/products/feszitett_vasznas_tetore.png',
    modelsSummary: 'Veranda Tens • Veranda V ZIIP',
    badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  {
    id: 'polikarbonatos',
    name: 'Polikarbonátos pergola',
    shortName: 'Polikarbonátos',
    subtitle: '16 mm opál üregkamrás polikarbonát tetővel',
    image: '/images/products/polikarbonatos.png',
    modelsSummary: 'Polifix alumínium pergola rendszer',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'uvegtetos',
    name: 'Üvegtetős pergola',
    shortName: 'Üvegtetős',
    subtitle: '10 mm edzett, laminált biztonsági üvegtetővel',
    image: '/images/products/uvegtetos.png',
    modelsSummary: 'Glassfix + opcionális Veranda Tens tetőárnyékoló',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'uvegfalas',
    name: 'Üvegfal rendszer',
    shortName: 'Üvegfalas',
    subtitle: 'Keret nélküli, elcsúsztatható 10 mm edzett üvegfal (2 modell)',
    image: '/images/products/uvegfalas.png',
    modelsSummary: 'Line Glass (Spanyol) • Sliding Doors (Lengyel)',
    badgeColor: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  {
    id: 'ZIPes',
    name: 'ZIP oldalsó árnyékoló',
    shortName: 'ZIP árnyékoló',
    subtitle: 'Motoros, szélálló oldalsó textilárnyékoló rendszer',
    image: '/images/products/ZIPes.png',
    modelsSummary: 'Vertica 120 ZIP / Screeny GPZ + Somfy IO',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
];

export function getAllProductTypes(config?: AdminConfig): ProductTypeInfo[] {
  const custom = (config?.customCategories || []).map((c) => {
    const modelsInCat = Object.values(config?.models || {})
      .filter((m) => m.category === c.id)
      .map((m) => m.name);
    return {
      id: c.id,
      name: c.name,
      shortName: c.shortName || c.name,
      subtitle: c.subtitle || 'Egyedi árajánlat sablon kategória',
      image: '/images/products/bioklimatikus.png',
      modelsSummary:
        modelsInCat.length > 0 ? modelsInCat.join(' • ') : 'Egyedi sablon',
      badgeColor: 'bg-zinc-900/10 text-zinc-900 border-zinc-300',
    };
  });
  return [...PRODUCT_TYPES, ...custom];
}

export const BEEPITES_TYPES: {
  id: BeepitesTipusId;
  label: string;
  subtitle: string;
  image: string;
}[] = [
  {
    id: 'Épülethez rögzített',
    label: 'Épülethez rögzített',
    subtitle: 'Homlokzathoz rögzítve, elöl 2–3 db lábbal',
    image: '/images/beepites/epulethez_rogzitett.png',
  },
  {
    id: 'Szabadon álló',
    label: 'Szabadon álló',
    subtitle: 'Különálló szerkezetként, 4–6 db lábon álló',
    image: '/images/beepites/szabadon_allo.png',
  },
];

export const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  piszkozat: {
    label: 'Generálva / Piszkozat',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dotClass: 'bg-slate-400',
  },
  kikuldve: {
    label: 'Emailben kiküldve',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-400',
  },
  megnyitva: {
    label: 'Ügyfél megnyitotta',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400 animate-pulse',
  },
  elfogadva: {
    label: 'Elfogadva / Megrendelve',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  elutasitva: {
    label: 'Elutasítva / Lejárt',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-400',
  },
};

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  general: {
    listaArSzorzo: 1.25,
    discountBadgePct: 20,
    defaultEurHufRate: 400,
    defaultSzallitasiDij: 40000,
    zipSzerelesBioklimatikusPct: 8,
    zipSzerelesPergolaPct: 10,
    zipSzerelesOnalloPct: 12,
    uvegfalSzerelesPct: 12,
    uvegfalSpanyolSzerelesPct: 11,
    spotVilagitasDarabArEur: 50,
    companyName: 'OpenSky Pergola',
    companyEmail: 'ajanlat@openskypergola.hu',
    companyPhone: '+36 30 555 8899',
  },
  models: {
    SB400: {
      id: 'SB400',
      name: 'SOLARE 400 (Selt SB400)',
      category: 'bioklimatikus',
      description: 'Lengyel prémium forgatható lamellás pergola (150 kg/m² hóterhelés)',
      enabled: true,
      szorzo: 0.66,
      extraDiscountPct: 0,
      fixFelarEur: 2500,
      motorEur: 0,
      taviranyitoEur: 100,
      ledEur: 700,
      szerelesPctLow: 11,
      szerelesPctMid: 10,
      szerelesPctHigh: 10,
      szerelesThreshold1: 8500,
      szerelesThreshold2: 8500,
      giftInfraHeating: true,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.SB400,
    },
    SESKY_BIO: {
      id: 'SESKY_BIO',
      name: 'SEESKY BIO',
      category: 'bioklimatikus',
      description: 'Spanyol prémium hőszigetelt lamellás pergola, rejtett motorral (200 kg/m²)',
      enabled: true,
      szorzo: 1.0,
      extraDiscountPct: 0,
      fixFelarEur: 0,
      motorEur: 0,
      taviranyitoEur: 100,
      ledEur: 700,
      szerelesPctLow: 11,
      szerelesPctMid: 10,
      szerelesPctHigh: 10,
      szerelesThreshold1: 8500,
      szerelesThreshold2: 8500,
      giftInfraHeating: true,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.SESKY_BIO,
    },
    KEDRY_SKYLIFE: {
      id: 'KEDRY_SKYLIFE',
      name: 'KEDRY SKYLIFE (KE Olasz)',
      category: 'bioklimatikus',
      description: 'Olasz csúcskategóriás forgatva-elhúzható lamellás pergola (250 kg/m²)',
      enabled: true,
      szorzo: 0.65,
      extraDiscountPct: 10,
      fixFelarEur: 3500,
      motorEur: 523,
      taviranyitoEur: 100,
      ledEur: 900,
      szerelesPctLow: 10,
      szerelesPctMid: 8,
      szerelesPctHigh: 8,
      szerelesThreshold1: 8500,
      szerelesThreshold2: 8500,
      giftInfraHeating: true,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.KEDRY_SKYLIFE,
    },
    A100LUX: {
      id: 'A100LUX',
      name: 'GENNIUS A100 LUX',
      category: 'elhuzhato_ponyvas',
      description: 'Olasz elhúzható PVC ponyvás pergola előtetővel (1–3 modul)',
      enabled: true,
      szorzo: 0.65,
      extraDiscountPct: 10,
      fixFelarEur: 2470,
      motorEur: 800,
      taviranyitoEur: 100,
      ledEur: 400,
      szerelesPctLow: 13,
      szerelesPctMid: 12,
      szerelesPctHigh: 10,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.A100LUX,
    },
    KEPLAN: {
      id: 'KEPLAN',
      name: 'KEPLAN (Sík tetejű)',
      category: 'elhuzhato_ponyvas',
      description: 'Sík tetejű elhúzható ponyvás pergola rendszer',
      enabled: true,
      szorzo: 0.65,
      extraDiscountPct: 0,
      fixFelarEur: 2470,
      motorEur: 800,
      taviranyitoEur: 100,
      ledEur: 300,
      szerelesPctLow: 12,
      szerelesPctMid: 12,
      szerelesPctHigh: 12,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.KEPLAN,
    },
    ISOLA_2A: {
      id: 'ISOLA_2A',
      name: 'ISOLA 2A (KE Prémium)',
      category: 'elhuzhato_ponyvas',
      description: 'Olasz prémium feszített sík tetejű elhúzható ponyvás pergola',
      enabled: true,
      szorzo: 0.65,
      extraDiscountPct: 10,
      fixFelarEur: 2870,
      motorEur: 1000,
      taviranyitoEur: 100,
      ledEur: 900,
      szerelesPctLow: 8,
      szerelesPctMid: 9,
      szerelesPctHigh: 9,
      szerelesThreshold1: 700,
      szerelesThreshold2: 700,
      giftInfraHeating: true,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.ISOLA_2A,
    },
    PERGOLA_V_ZIIP: {
      id: 'PERGOLA_V_ZIIP',
      name: 'PERGOLA V ZIIP',
      category: 'feszitett_vasznas',
      description: 'Lengyel elhúzható feszített vásznas pergola (ZIP megvezetéssel)',
      enabled: true,
      szorzo: 0.66,
      extraDiscountPct: 0,
      fixFelarEur: 2100,
      motorEur: 0,
      taviranyitoEur: 100,
      ledEur: 0,
      szerelesPctLow: 13,
      szerelesPctMid: 12,
      szerelesPctHigh: 10,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.PERGOLA_V_ZIIP,
    },
    HYDRA: {
      id: 'HYDRA',
      name: 'HYDRA (Olasz feszített)',
      category: 'feszitett_vasznas',
      description: 'Olasz elhúzható feszített vásznas pergola víztaszító szövettel',
      enabled: true,
      szorzo: 0.65,
      extraDiscountPct: 10,
      fixFelarEur: 2345,
      motorEur: 600,
      taviranyitoEur: 100,
      ledEur: 400,
      szerelesPctLow: 13,
      szerelesPctMid: 12,
      szerelesPctHigh: 10,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.HYDRA,
    },
    VERANDA_TENS_TETORE: {
      id: 'VERANDA_TENS_TETORE',
      name: 'VERANDA TENS (Tetőre)',
      category: 'feszitett_vasznas_tetore',
      description: 'Meglévő szerkezetre építhető bowden huzalos feszített árnyékoló',
      enabled: true,
      szorzo: 1.0,
      extraDiscountPct: 0,
      fixFelarEur: 125,
      motorEur: 350,
      taviranyitoEur: 100,
      ledEur: 0,
      szerelesPctLow: 15,
      szerelesPctMid: 13,
      szerelesPctHigh: 13,
      szerelesThreshold1: 1,
      szerelesThreshold2: 1,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.VERANDA_TENS_TETORE,
    },
    VERANDA_V_ZIP: {
      id: 'VERANDA_V_ZIP',
      name: 'VERANDA V ZIIP (Tetőre)',
      category: 'feszitett_vasznas_tetore',
      description: 'Meglévő szerkezetre építhető ZIP-rendszerű feszített árnyékoló',
      enabled: true,
      szorzo: 0.66,
      extraDiscountPct: 0,
      fixFelarEur: 1125,
      motorEur: 0,
      taviranyitoEur: 100,
      ledEur: 0,
      szerelesPctLow: 12,
      szerelesPctMid: 12,
      szerelesPctHigh: 12,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.VERANDA_V_ZIP,
    },
    POLIFIX: {
      id: 'POLIFIX',
      name: 'POLIFIX Polikarbonátos',
      category: 'polikarbonatos',
      description: '16 mm opál üregkamrás polikarbonát tetejű alumínium pergola',
      enabled: true,
      szorzo: 1.0,
      extraDiscountPct: 0,
      fixFelarEur: 0,
      motorEur: 0,
      taviranyitoEur: 0,
      ledEur: 300,
      szerelesPctLow: 10,
      szerelesPctMid: 10,
      szerelesPctHigh: 10,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: false,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.POLIFIX,
    },
    GLASSFIX: {
      id: 'GLASSFIX',
      name: 'GLASSFIX Üvegtetős',
      category: 'uvegtetos',
      description: '10 mm edzett, laminált biztonsági üvegtetős prémium pergola',
      enabled: true,
      szorzo: 1.0,
      extraDiscountPct: 0,
      fixFelarEur: 0,
      motorEur: 0,
      taviranyitoEur: 0,
      ledEur: 300,
      szerelesPctLow: 10,
      szerelesPctMid: 10,
      szerelesPctHigh: 10,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: true,
      giftRainWindSensor: false,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.GLASSFIX,
    },
    VERANDA_TENS_UVEGTETOS: {
      id: 'VERANDA_TENS_UVEGTETOS',
      name: 'VERANDA TENS Tetőárnyékoló (Üvegtetőhöz)',
      category: 'uvegtetos',
      description: 'Üvegtető fölé/alá szerelhető motoros feszített vásznas tetőárnyékoló',
      enabled: true,
      szorzo: 0.66,
      extraDiscountPct: 0,
      fixFelarEur: 100,
      motorEur: 250,
      taviranyitoEur: 200,
      ledEur: 0,
      szerelesPctLow: 10,
      szerelesPctMid: 10,
      szerelesPctHigh: 10,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.VERANDA_TENS_UVEGTETOS,
    },
    REFLEKSOL_120_ZIP: {
      id: 'REFLEKSOL_120_ZIP',
      name: 'REFLEKSOL / VERTICA 120 ZIP',
      category: 'ZIPes',
      description: 'Külön szerelt motoros oldalsó ZIP árnyékoló (Serge 600 + Somfy IO)',
      enabled: true,
      szorzo: 1.0,
      extraDiscountPct: 0,
      fixFelarEur: 370,
      motorEur: 250,
      taviranyitoEur: 120,
      ledEur: 0,
      szerelesPctLow: 8,
      szerelesPctMid: 10,
      szerelesPctHigh: 12,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: true,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.REFLEKSOL_120_ZIP,
    },
    VERTICA_PRIME_ZIP: {
      id: 'VERTICA_PRIME_ZIP',
      name: 'VERTICA PRIME ZIP (Integrált)',
      category: 'ZIPes',
      description: 'Kedry Skylife gerendába integrált oldalsó ZIP árnyékoló (Soltis 92)',
      enabled: true,
      szorzo: 0.65,
      extraDiscountPct: 10,
      fixFelarEur: 1000,
      motorEur: 0,
      taviranyitoEur: 0,
      ledEur: 0,
      szerelesPctLow: 8,
      szerelesPctMid: 8,
      szerelesPctHigh: 8,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: false,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.VERTICA_PRIME_ZIP,
    },
    UVEGFAL_RENDSZER: {
      id: 'UVEGFAL_RENDSZER',
      name: 'ÜVEGFAL RENDSZER (Line Glass / Sliding Doors)',
      category: 'uvegfalas',
      description: 'Keret nélküli elcsúsztatható 10 mm edzett biztonsági üvegfal',
      enabled: true,
      szorzo: 1.0,
      extraDiscountPct: 0,
      fixFelarEur: 0,
      motorEur: 0,
      taviranyitoEur: 0,
      ledEur: 0,
      szerelesPctLow: 11,
      szerelesPctMid: 12,
      szerelesPctHigh: 12,
      szerelesThreshold1: 5000,
      szerelesThreshold2: 7500,
      giftInfraHeating: false,
      giftRainWindSensor: false,
      pdfPhotos: LEGACY_MODEL_DEFAULT_PHOTOS.UVEGFAL_RENDSZER,
    },
  },
  m2Tiers: {
    seeskyBioFree: [
      { maxM2: 13, eurPerM2: 800 },
      { maxM2: 16, eurPerM2: 695 },
      { maxM2: 999, eurPerM2: 631 },
    ],
    seeskyBioWall: [
      { maxM2: 13, eurPerM2: 761 },
      { maxM2: 16, eurPerM2: 659 },
      { maxM2: 999, eurPerM2: 610 },
    ],
    uvegfalLengyel: [
      { maxM2: 8.5, eurPerM2: 257 },
      { maxM2: 13.5, eurPerM2: 210 },
      { maxM2: 999, eurPerM2: 200 },
    ],
    uvegfalSpanyol: [
      { maxM2: 8.5, eurPerM2: 324 },
      { maxM2: 13.5, eurPerM2: 278 },
      { maxM2: 999, eurPerM2: 268 },
    ],
    polifix2Lab: [
      { maxM2: 12, eurPerM2: 238 },
      { maxM2: 18, eurPerM2: 196 },
      { maxM2: 24, eurPerM2: 176 },
      { maxM2: 999, eurPerM2: 156 },
    ],
    polifix3Lab: [
      { maxM2: 24, eurPerM2: 238 },
      { maxM2: 36, eurPerM2: 205 },
      { maxM2: 48, eurPerM2: 186 },
      { maxM2: 999, eurPerM2: 166 },
    ],
    polifix4Lab: [
      { maxM2: 36, eurPerM2: 238 },
      { maxM2: 54, eurPerM2: 205 },
      { maxM2: 72, eurPerM2: 186 },
      { maxM2: 999, eurPerM2: 166 },
    ],
    polifixSzereles: [
      { maxM2: 24, fixEur: 700 },
      { maxM2: 36, fixEur: 900 },
      { maxM2: 48, fixEur: 1100 },
      { maxM2: 72, fixEur: 1300 },
      { maxM2: 999, fixEur: 1500 },
    ],
    glassfix2Lab: [
      { maxM2: 12, eurPerM2: 312.5 },
      { maxM2: 18, eurPerM2: 273.5 },
      { maxM2: 999, eurPerM2: 252.5 },
    ],
    glassfix3Lab: [
      { maxM2: 24, eurPerM2: 312.5 },
      { maxM2: 36, eurPerM2: 260.5 },
      { maxM2: 999, eurPerM2: 231.0 },
    ],
    glassfix4Lab: [
      { maxM2: 36, eurPerM2: 312.5 },
      { maxM2: 54, eurPerM2: 260.5 },
      { maxM2: 999, eurPerM2: 231.0 },
    ],
    glassfixSzereles: [
      { maxM2: 24, fixEur: 800 },
      { maxM2: 36, fixEur: 1200 },
      { maxM2: 48, fixEur: 1500 },
      { maxM2: 999, fixEur: 2000 },
    ],
  },
  emailSettings: {
    senderName: 'OpenSky Pergola – Árajánlatok',
    senderEmail: 'ajanlat@openskypergola.hu',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    subjectTemplate: 'OpenSky Pergola árajánlat – {{termek_nev}} ({{meret}} cm) – {{ugyfel_nev}}',
    bodyTemplate: `Kedves {{ugyfel_nev}}!

Örömmel fogadtuk megkeresését! Csatoltan, illetve az alábbi összefoglalóban küldjük személyre szabott, tájékoztató jellegű árajánlatunkat az Ön által megadott {{meret}} cm-es ({{beepites}}) {{termek_nev}} kialakításra.

{{opciok_osszefoglalo}}

Szállítási díj ({{telepules}}): {{szallitasi_dij}} Ft
Kalkulált EUR/HUF árfolyam: {{arfolyam}} Ft/EUR

Amennyiben bármilyen kérdése merülne fel, vagy helyszíni felmérést szeretne egyeztetni, keressen minket bizalommal!

Üdvözlettel,
OpenSky Pergola Csapat`,
    enableTrackingPixel: true,
    publicBaseUrl: 'http://localhost:3000',
  },
};
