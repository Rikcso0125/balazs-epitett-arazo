'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  FolderPlus,
  Gift,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  getAllProductTypes,
  getDefaultPhotosForModel,
  LEGACY_MODEL_DEFAULT_PHOTOS,
} from '@/lib/constants';
import { calculateSingleCustomTemplate, roundHuf } from '@/lib/pricing-engine';
import {
  AdminConfig,
  CustomCategoryConfig,
  M2PriceTier,
  ModelPricingRule,
  TemplatePhotoItem,
  TemplatePricingMethod,
  TermekTipusId,
} from '@/lib/types';
import { formatCurrency } from './DashboardAnalyticsView';

interface GalleryImageItem {
  id: string;
  category: string;
  categoryLabel: string;
  filename: string;
  url: string;
}

interface TemplateWizardModalProps {
  open: boolean;
  config: AdminConfig;
  initialModelToEdit?: ModelPricingRule | null;
  initialStep?: number;
  onClose: () => void;
  onSaveTemplate: (
    rule: ModelPricingRule,
    newCategory: CustomCategoryConfig | null,
    openInConfiguratorAfterSave: boolean
  ) => Promise<void>;
}

const WIZARD_STEPS = [
  { num: 1, title: 'Típus & Név', question: 'Milyen sablont szeretnél létrehozni, és mi legyen a neve?' },
  { num: 2, title: 'Beépítés & Méret', question: 'Hogyan telepíthető ez a szerkezet, és mik a méretkorlátai?' },
  { num: 3, title: 'Alapár Logika', question: 'Hogyan számolja a rendszer a szerkezet alapárát?' },
  { num: 4, title: 'Motor & LED', question: 'Tartozik a szerkezethez motor, távirányító vagy LED világítás?' },
  { num: 5, title: 'Szerelési Díj', question: 'Hogyan számoljuk a helyszíni szerelés és beüzemelés munkadíját?' },
  { num: 6, title: 'Oldalzárás & Ajándék', question: 'Kérhető-e oldalzárás (ZIP / Üvegfal), és jár-e hozzá ajándék?' },
  { num: 7, title: '2 Fotó & Leírás', question: 'Melyik 2 látványfotó és milyen képleírás kerüljön be a PDF árajánlatba?' },
  { num: 8, title: 'Teszt & Mentés', question: 'Minden készen áll! Ellenőrizd az élő próbajánlatot mentés előtt.' },
];

const PHOTO_DESC_PRESETS_1 = [
  'Alumínium vázával, 0–120° között elforgatható lamellával, oszlopaiban rejtett esővíz elvezetésével jó választás az időjárás elemeivel szemben.',
  'Prémium porszórt alumínium szerkezet integrált vízelvezetéssel és Somfy IO távirányítós motorizációval.',
  '10 mm-es edzett, laminált biztonsági üvegtetős pergola antracit (RAL 7016) alumínium tartószerkezettel.',
];

const PHOTO_DESC_PRESETS_2 = [
  'A szerkezet körbeépíthető elcsúsztatható 10 mm-es edzett üvegfalrendszerrel és szélálló motoros ZIP oldalsó árnyékolókkal, télen-nyáron használható télikertet kialakítva.',
  'Rejtett motorizációval, felső gerendába integrált szabályozható fényerejű meleg fehér LED világítással és időjárás-szenzorokkal.',
  'Homlokzathoz rögzített vagy szabadon álló kivitelben, 25 féle gyári RAL alapszínben, 10 év szerkezeti garanciával.',
];

const MATRIX_SOURCES = [
  { id: 'SB400', label: 'Solare SB400 (Bioklimatikus mérettábla)' },
  { id: 'Kedry_Skylife', label: 'Kedry Skylife (Bioklimatikus mérettábla)' },
  { id: 'Pergola_V_ZIIP', label: 'Pergola V-ZIIP (Feszített vásznas mérettábla)' },
  { id: 'Hydra', label: 'Hydra (Feszített PVC vásznas mérettábla)' },
  { id: 'A100LUX', label: 'Gennius A100 LUX (Elhúzható ponyvás mérettábla)' },
  { id: 'Keplan', label: 'Keplan (Elhúzható ponyvás mérettábla)' },
  { id: 'Isola_2A', label: 'Isola 2A (Íves ponyvás mérettábla)' },
  { id: 'Veranda_Tens', label: 'Veranda Tens (Tetőárnyékoló mérettábla)' },
];

const SUBTITLE_PRESETS = [
  'Prémium extrudált alumínium szerkezet integrált vízelvezetéssel, Somfy IO motorral',
  'Motorosan forgatható lamellás tetőszerkezet rejtett csapadékcsatornával',
  '16 mm-es opál üregkamrás polikarbonát fedés erősített alumínium vázszerkezettel',
  '10 mm-es edzett biztonsági üvegtető antracit (RAL 7016) porszórt alumínium vázzal',
  'Szélálló motoros feszített ponyvás szerkezet rozsdamentes acél kötőelemekkel',
];

function slugifyId(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function TemplateWizardModal({
  open,
  config,
  initialModelToEdit,
  initialStep,
  onClose,
  onSaveTemplate,
}: TemplateWizardModalProps) {
  const isEditing = Boolean(initialModelToEdit);
  const allCategories = useMemo(() => getAllProductTypes(config), [config]);

  const [step, setStep] = useState<number>(initialStep || 1);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing');
  const [selectedCategory, setSelectedCategory] = useState<TermekTipusId>(
    initialModelToEdit?.category || 'bioklimatikus'
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySubtitle, setNewCategorySubtitle] = useState(
    'Egyedi méretre gyártott alumínium szerkezet'
  );
  const [templateName, setTemplateName] = useState(
    initialModelToEdit?.name || ''
  );
  const [templateDescription, setTemplateDescription] = useState(
    initialModelToEdit?.description || SUBTITLE_PRESETS[0]
  );

  // Step 2 state
  const [supportedMountTypes, setSupportedMountTypes] = useState<
    'both' | 'wall_only' | 'free_only'
  >(initialModelToEdit?.supportedMountTypes || 'both');
  const [minProjectionCm, setMinProjectionCm] = useState<number>(
    initialModelToEdit?.minProjectionCm || 200
  );
  const [maxProjectionCm, setMaxProjectionCm] = useState<number>(
    initialModelToEdit?.maxProjectionCm || 700
  );
  const [minWidthCm, setMinWidthCm] = useState<number>(
    initialModelToEdit?.minWidthCm || 150
  );
  const [maxWidthCm, setMaxWidthCm] = useState<number>(
    initialModelToEdit?.maxWidthCm || 500
  );

  // Step 3 state
  const [pricingMethod, setPricingMethod] = useState<TemplatePricingMethod>(
    initialModelToEdit?.pricingMethod || 'm2_tiers'
  );
  const [useTieredM2, setUseTieredM2] = useState<boolean>(
    Boolean(
      initialModelToEdit?.customM2Tiers &&
        initialModelToEdit.customM2Tiers.length > 0
    )
  );
  const [eurPerM2Wall, setEurPerM2Wall] = useState<number>(
    initialModelToEdit?.eurPerM2Wall || 360
  );
  const [eurPerM2Free, setEurPerM2Free] = useState<number>(
    initialModelToEdit?.eurPerM2Free || 395
  );
  const [customM2Tiers, setCustomM2Tiers] = useState<M2PriceTier[]>(
    initialModelToEdit?.customM2Tiers || [
      { maxM2: 12, eurPerM2: 410 },
      { maxM2: 20, eurPerM2: 375 },
      { maxM2: 99, eurPerM2: 345 },
    ]
  );
  const [baseStartEur, setBaseStartEur] = useState<number>(
    initialModelToEdit?.baseStartEur || 1200
  );
  const [matrixSourceId, setMatrixSourceId] = useState<string>(
    initialModelToEdit?.matrixSourceId || 'SB400'
  );
  const [szorzo, setSzorzo] = useState<number>(
    initialModelToEdit?.szorzo ?? 1.0
  );
  const [extraDiscountPct, setExtraDiscountPct] = useState<number>(
    initialModelToEdit?.extraDiscountPct ?? 0
  );
  const [fixFelarEur, setFixFelarEur] = useState<number>(
    initialModelToEdit?.fixFelarEur ?? 0
  );

  // Step 4 state
  const [motorEur, setMotorEur] = useState<number>(
    initialModelToEdit?.motorEur ?? 0
  );
  const [taviranyitoEur, setTaviranyitoEur] = useState<number>(
    initialModelToEdit?.taviranyitoEur ?? 100
  );
  const [ledEur, setLedEur] = useState<number>(
    initialModelToEdit?.ledEur ?? 700
  );

  // Step 5 state
  const [szerelesMode, setSzerelesMode] = useState<'percentage' | 'fixed'>(
    initialModelToEdit?.szerelesMode || 'percentage'
  );
  const [szerelesPctLow, setSzerelesPctLow] = useState<number>(
    initialModelToEdit?.szerelesPctLow ?? 11
  );
  const [szerelesPctMid, setSzerelesPctMid] = useState<number>(
    initialModelToEdit?.szerelesPctMid ?? 10
  );
  const [szerelesThreshold1, setSzerelesThreshold1] = useState<number>(
    initialModelToEdit?.szerelesThreshold1 ?? 5000
  );
  const [szerelesMinEur, setSzerelesMinEur] = useState<number>(
    initialModelToEdit?.szerelesMinEur ?? 400
  );
  const [szerelesFixEur, setSzerelesFixEur] = useState<number>(
    initialModelToEdit?.szerelesFixEur ?? 600
  );

  // Step 6 state
  const [allowZipSide, setAllowZipSide] = useState<boolean>(
    initialModelToEdit?.allowZipSide ?? true
  );
  const [allowUvegfalSide, setAllowUvegfalSide] = useState<boolean>(
    initialModelToEdit?.allowUvegfalSide ?? true
  );
  const [giftInfraHeating, setGiftInfraHeating] = useState<boolean>(
    initialModelToEdit?.giftInfraHeating ?? true
  );
  const [giftRainWindSensor, setGiftRainWindSensor] = useState<boolean>(
    initialModelToEdit?.giftRainWindSensor ?? true
  );
  const [customGiftLabel, setCustomGiftLabel] = useState<string>(
    initialModelToEdit?.customGiftLabel || ''
  );

  // Step 7 state: 2 PDF Photos & Descriptions (with automatic legacy model / category defaults)
  const initialDefaultPhotos = useMemo(
    () =>
      getDefaultPhotosForModel(
        initialModelToEdit?.id,
        initialModelToEdit?.category || 'bioklimatikus'
      ),
    [initialModelToEdit]
  );

  const [photo1Url, setPhoto1Url] = useState<string>(
    initialModelToEdit?.pdfPhotos?.[0]?.url || initialDefaultPhotos[0].url
  );
  const [photo1Desc, setPhoto1Desc] = useState<string>(
    initialModelToEdit?.pdfPhotos?.[0]?.description ??
      initialDefaultPhotos[0].description
  );
  const [photo2Url, setPhoto2Url] = useState<string>(
    initialModelToEdit?.pdfPhotos?.[1]?.url || initialDefaultPhotos[1].url
  );
  const [photo2Desc, setPhoto2Desc] = useState<string>(
    initialModelToEdit?.pdfPhotos?.[1]?.description ??
      initialDefaultPhotos[1].description
  );
  const [hasCustomizedPhotos, setHasCustomizedPhotos] = useState<boolean>(
    Boolean(
      initialModelToEdit?.pdfPhotos && initialModelToEdit.pdfPhotos.length >= 2
    )
  );
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>([]);
  const [pickerSlot, setPickerSlot] = useState<1 | 2 | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const [uploadingSlot, setUploadingSlot] = useState<1 | 2 | null>(null);

  // When creating a new template and switching category in Step 1, automatically load that category's default photos unless customized
  useEffect(() => {
    if (!isEditing && !hasCustomizedPhotos) {
      const catPhotos = getDefaultPhotosForModel(undefined, selectedCategory);
      setPhoto1Url(catPhotos[0].url);
      setPhoto1Desc(catPhotos[0].description);
      setPhoto2Url(catPhotos[1].url);
      setPhoto2Desc(catPhotos[1].description);
    }
  }, [selectedCategory, isEditing, hasCustomizedPhotos]);

  const handleSwapPhotosOrder = () => {
    const tmpUrl = photo1Url;
    const tmpDesc = photo1Desc;
    setPhoto1Url(photo2Url);
    setPhoto1Desc(photo2Desc);
    setPhoto2Url(tmpUrl);
    setPhoto2Desc(tmpDesc);
    setHasCustomizedPhotos(true);
  };

  const handleResetToDefaultPhotos = () => {
    const def = getDefaultPhotosForModel(
      initialModelToEdit?.id,
      selectedCategory
    );
    setPhoto1Url(def[0].url);
    setPhoto1Desc(def[0].description);
    setPhoto2Url(def[1].url);
    setPhoto2Desc(def[1].description);
    setHasCustomizedPhotos(false);
  };

  const handleLoadPhotosFromModel = (sourceModelId: string) => {
    if (!sourceModelId) return;
    const srcModel = config.models?.[sourceModelId];
    const photos =
      srcModel?.pdfPhotos && srcModel.pdfPhotos.length >= 2
        ? srcModel.pdfPhotos
        : getDefaultPhotosForModel(sourceModelId, srcModel?.category);
    setPhoto1Url(photos[0].url);
    setPhoto1Desc(photos[0].description);
    setPhoto2Url(photos[1].url);
    setPhoto2Desc(photos[1].description);
    setHasCustomizedPhotos(true);
  };

  // Step 8 test dimensions
  const [testProj, setTestProj] = useState<number>(500);
  const [testWidth, setTestWidth] = useState<number>(350);
  const [testHeight, setTestHeight] = useState<number>(250);
  const [testMount, setTestMount] = useState<'Épülethez rögzített' | 'Szabadon álló'>(
    'Épülethez rögzített'
  );

  useEffect(() => {
    if (!open) return;
    fetch('/api/template-images')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.images)) {
          setGalleryImages(data.images);
        }
      })
      .catch(() => {});
  }, [open]);

  const handleUploadPhoto = async (slot: 1 | 2, file: File) => {
    setUploadingSlot(slot);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Fájl olvasási hiba'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/template-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        if (slot === 1) setPhoto1Url(data.url);
        else setPhoto2Url(data.url);
        setHasCustomizedPhotos(true);
        setGalleryImages((prev) => [data, ...prev]);
        setPickerSlot(null);
      }
    } finally {
      setUploadingSlot(null);
    }
  };

  if (!open) return null;

  const effectiveCategoryId: TermekTipusId =
    categoryMode === 'new' && newCategoryName.trim()
      ? `custom_${slugifyId(newCategoryName).toLowerCase()}`
      : selectedCategory;

  const pdfPhotos: TemplatePhotoItem[] = [
    { url: photo1Url, description: photo1Desc.trim() },
    { url: photo2Url, description: photo2Desc.trim() },
  ];

  const draftRule: ModelPricingRule = {
    id:
      initialModelToEdit?.id ||
      `TPL_${slugifyId(templateName || 'UJ_SABLON')}_${Date.now().toString().slice(-4)}`,
    name: templateName.trim() || 'Új Pergola Sablon',
    category: effectiveCategoryId,
    description: templateDescription.trim() || SUBTITLE_PRESETS[0],
    enabled: true,
    szorzo: Number(szorzo) || 1.0,
    extraDiscountPct: Number(extraDiscountPct) || 0,
    fixFelarEur: Number(fixFelarEur) || 0,
    motorEur: Number(motorEur) || 0,
    taviranyitoEur: Number(taviranyitoEur) || 0,
    ledEur: Number(ledEur) || 0,
    szerelesPctLow: Number(szerelesPctLow) || 11,
    szerelesPctMid: Number(szerelesPctMid) || 10,
    szerelesPctHigh: Number(szerelesPctMid) || 10,
    szerelesThreshold1: Number(szerelesThreshold1) || 5000,
    szerelesThreshold2: 7500,
    giftInfraHeating,
    giftRainWindSensor,
    isCustomTemplate: initialModelToEdit ? initialModelToEdit.isCustomTemplate ?? true : true,
    pricingMethod,
    baseStartEur: Number(baseStartEur) || 0,
    eurPerM2Wall: Number(eurPerM2Wall) || 360,
    eurPerM2Free: Number(eurPerM2Free) || 395,
    customM2Tiers: pricingMethod === 'm2_tiers' && useTieredM2 ? customM2Tiers : undefined,
    matrixSourceId: pricingMethod === 'matrix_clone' ? matrixSourceId : undefined,
    supportedMountTypes,
    minProjectionCm: Number(minProjectionCm) || 150,
    maxProjectionCm: Number(maxProjectionCm) || 700,
    minWidthCm: Number(minWidthCm) || 150,
    maxWidthCm: Number(maxWidthCm) || 500,
    szerelesMode,
    szerelesFixEur: Number(szerelesFixEur) || 600,
    szerelesMinEur: Number(szerelesMinEur) || 0,
    allowZipSide,
    allowUvegfalSide,
    customGiftLabel: customGiftLabel.trim() || undefined,
    pdfPhotos,
  };

  const livePreview = calculateSingleCustomTemplate(
    draftRule,
    {
      termekTipus: effectiveCategoryId,
      beepitesTipus: testMount,
      projection: testProj,
      width: testWidth,
      height: testHeight,
      eurHufRate: config.general.defaultEurHufRate || 400,
    },
    config
  );

  const canContinueStep1 =
    templateName.trim().length >= 2 &&
    (categoryMode === 'existing' || newCategoryName.trim().length >= 2);

  const handleFinish = async (openInConfigurator: boolean) => {
    setSaving(true);
    try {
      const newCat: CustomCategoryConfig | null =
        categoryMode === 'new' && newCategoryName.trim()
          ? {
              id: effectiveCategoryId,
              name: newCategoryName.trim(),
              shortName: newCategoryName.trim(),
              subtitle: newCategorySubtitle.trim() || 'Egyedi árajánlat sablon kategória',
            }
          : null;
      await onSaveTemplate(draftRule, newCat, openInConfigurator);
    } finally {
      setSaving(false);
    }
  };

  const activeStepMeta = WIZARD_STEPS[step - 1] || WIZARD_STEPS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl border border-[#e4e4e7] bg-white shadow-2xl overflow-hidden my-auto">
        {/* Top Black Accent Bar */}
        <div className="h-1.5 w-full bg-[#0a0a0a]" />

        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] px-6 py-4 bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a0a0a] text-white font-extrabold text-xs">
              {step}/8
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                  INTERAKTÍV SABLON VARÁZSLÓ • {activeStepMeta.title}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-[#0a0a0a]">
                {activeStepMeta.question}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#e4e4e7] bg-white p-2 text-[#71717a] hover:text-[#0a0a0a] transition"
            title="Bezárás"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-8 border-b border-[#e4e4e7] bg-white px-4 py-2.5 gap-1">
          {WIZARD_STEPS.map((s) => {
            const isCurrent = s.num === step;
            const isDone = s.num < step;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (canContinueStep1 || s.num === 1) setStep(s.num);
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left transition ${
                  isCurrent
                    ? 'bg-[#0a0a0a] text-white font-bold'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold hover:bg-emerald-100'
                    : 'bg-[#f4f4f5] text-[#71717a] font-medium hover:bg-[#e4e4e7]/60'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-white text-[#0a0a0a]'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#e4e4e7] text-[#52525b]'
                  }`}
                >
                  {isDone ? <Check className="h-2.5 w-2.5" /> : s.num}
                </span>
                <span className="truncate text-[11px]">{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: TÍPUS & NÉV                                               */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  1. Hová kerüljön az új sablon? (Kattints a megfelelő kártyára)
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCategoryMode('existing')}
                    className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition ${
                      categoryMode === 'existing'
                        ? 'border-[#0a0a0a] bg-[#0a0a0a]/5 ring-2 ring-[#0a0a0a]/10'
                        : 'border-[#e4e4e7] bg-white hover:border-[#a1a1aa]'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        categoryMode === 'existing'
                          ? 'bg-[#0a0a0a] text-white'
                          : 'bg-[#f4f4f5] text-[#52525b]'
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-[#0a0a0a]">
                        Meglévő kategóriába új modell sablon
                      </div>
                      <p className="mt-1 text-xs text-[#71717a]">
                        Pl. egy új Bioklimatikus, Polikarbonátos, Üvegtetős vagy Ponyvás pergola modell felvitele.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategoryMode('new')}
                    className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition ${
                      categoryMode === 'new'
                        ? 'border-[#0a0a0a] bg-[#0a0a0a]/5 ring-2 ring-[#0a0a0a]/10'
                        : 'border-[#e4e4e7] bg-white hover:border-[#a1a1aa]'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        categoryMode === 'new'
                          ? 'bg-[#0a0a0a] text-white'
                          : 'bg-[#f4f4f5] text-[#52525b]'
                      }`}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-[#0a0a0a]">
                        Teljesen új termékkategória indítása
                      </div>
                      <p className="mt-1 text-xs text-[#71717a]">
                        Pl. Carport autóbeálló, Télikert, Lamellás előtető, Napvitorla – saját gombként jelenik meg!
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {categoryMode === 'existing' ? (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                    2. Válaszd ki, melyik kategóriába tartozzon:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {allCategories.map((pt) => {
                      const active = selectedCategory === pt.id;
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => setSelectedCategory(pt.id)}
                          className={`rounded-lg border p-3 text-left transition ${
                            active
                              ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                              : 'border-[#e4e4e7] bg-[#fafafa] text-[#0a0a0a] hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{pt.shortName}</div>
                          <div
                            className={`mt-0.5 line-clamp-1 text-[10px] ${
                              active ? 'text-zinc-300' : 'text-[#71717a]'
                            }`}
                          >
                            {pt.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#0a0a0a]">
                      Új termékkategória neve *
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Pl. Carport autóbeálló / Télikert"
                      className="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#0a0a0a]">
                      Kategória rövid leírása
                    </label>
                    <input
                      type="text"
                      value={newCategorySubtitle}
                      onChange={(e) => setNewCategorySubtitle(e.target.value)}
                      placeholder="Pl. Prémium alumínium autóbeálló rendszerek"
                      className="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 pt-1">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0a0a0a]">
                    3. Mi legyen az új sablon / modell neve az árajánlaton? *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Pl. SOLARIS PRO Bioklimatikus Pergola / ALUX Carport Prémium"
                    className="glass-input w-full rounded-lg px-4 py-3 text-base font-bold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0a0a0a]">
                    4. Műszaki leírás / alcím az árajánlatban (kattinthatsz kész sablonra is):
                  </label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Rövid műszaki tartalom, ami megjelenik az árajánlaton a modell neve alatt..."
                    className="glass-input w-full rounded-lg px-3.5 py-2.5 text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SUBTITLE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTemplateDescription(preset)}
                        className="rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2.5 py-1 text-[11px] font-medium text-[#52525b] hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition"
                      >
                        + {preset.slice(0, 52)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. GYORS FOTÓ SORREND ÉS ELŐNÉZET MÁR AZ 1. LÉPÉSBEN */}
                <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-[#0a0a0a]">
                        5. Sablonhoz tartozó 2 PDF Fotó & Sorrend (Előnézet és Gyorsbeállítás)
                      </span>
                      <span className="text-[11px] text-[#71717a]">
                         mind a régi (gyári), mind az új sablonokhoz automatikusan betöltjük a hozzá tartozó 2 látványfotót. Itt látod a sorrendjüket, megcserélheted őket, vagy ugorhatsz a részletes fotószerkesztőhöz.
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSwapPhotosOrder}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0a0a0a] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        1. és 2. Fotó Sorrendjének Megcserélése
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(7)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#27272a] transition"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Fotók & Leírások szerkesztése (7. lépés) →
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-lg border border-[#e4e4e7] bg-white p-2.5">
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e4e4e7] bg-[#f4f4f5]">
                        <img
                          src={photo1Url}
                          alt="1. Fotó"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-block rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            1. FOTÓ (1. oldal)
                          </span>
                          <button
                            type="button"
                            onClick={handleSwapPhotosOrder}
                            className="text-[10px] font-bold text-[#52525b] hover:text-[#0a0a0a] underline"
                          >
                            Hátrébb (2. helyre) →
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-[#52525b]">
                          {photo1Desc || 'Nincs leírás megadva'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-[#e4e4e7] bg-white p-2.5">
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e4e4e7] bg-[#f4f4f5]">
                        <img
                          src={photo2Url}
                          alt="2. Fotó"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-block rounded bg-[#27272a] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            2. FOTÓ (2. oldal)
                          </span>
                          <button
                            type="button"
                            onClick={handleSwapPhotosOrder}
                            className="text-[10px] font-bold text-[#52525b] hover:text-[#0a0a0a] underline"
                          >
                            ← Előrébb (1. helyre)
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-[#52525b]">
                          {photo2Desc || 'Nincs leírás megadva'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#52525b]">
                        Másik sablon (régi/új) fotóinak betöltése:
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleLoadPhotosFromModel(e.target.value);
                          }
                        }}
                        className="rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-semibold text-[#0a0a0a]"
                      >
                        <option value="">-- Válassz sablont a fotók átvételéhez --</option>
                        {Object.values(config.models || {}).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.id})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToDefaultPhotos}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#71717a] hover:text-[#0a0a0a]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Alapértelmezett gyári fotók visszaállítása
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: BEÉPÍTÉS & MÉRETKORLÁTOK                                  */}
          {/* ================================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  1. Milyen beépítési módban rendelhető ez a sablon?
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: 'both',
                      title: 'Mindkét kivitelben',
                      desc: 'Épülethez rögzített és Szabadon állóként is',
                    },
                    {
                      id: 'wall_only',
                      title: 'Csak épülethez rögzített',
                      desc: 'Homlokzathoz csatlakozó kivitel (elöl lábakkal)',
                    },
                    {
                      id: 'free_only',
                      title: 'Csak szabadon álló',
                      desc: 'Önállóan, 4 vagy 6 lábon álló kivitel',
                    },
                  ].map((opt) => {
                    const active = supportedMountTypes === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSupportedMountTypes(opt.id as any)}
                        className={`rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                            : 'border-[#e4e4e7] bg-white text-[#0a0a0a] hover:border-[#a1a1aa]'
                        }`}
                      >
                        <div className="text-sm font-extrabold">{opt.title}</div>
                        <div
                          className={`mt-1 text-xs ${
                            active ? 'text-zinc-300' : 'text-[#71717a]'
                          }`}
                        >
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#52525b]">
                    2. Gyártási méretkorlátok (cm) – Válassz gyorsprofilt vagy írd be:
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Standard (600×400)', maxP: 600, maxW: 400 },
                      { label: 'Nagy (700×500)', maxP: 700, maxW: 500 },
                      { label: 'Extra / Sorolt (900×600)', maxP: 900, maxW: 600 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setMaxProjectionCm(preset.maxP);
                          setMaxWidthCm(preset.maxW);
                        }}
                        className="rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2.5 py-1 text-[11px] font-bold text-[#0a0a0a] hover:bg-[#e4e4e7]/60"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Min. Szélesség (cm)
                    </label>
                    <input
                      type="number"
                      value={minProjectionCm}
                      onChange={(e) => setMinProjectionCm(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Max. Szélesség (cm)
                    </label>
                    <input
                      type="number"
                      value={maxProjectionCm}
                      onChange={(e) => setMaxProjectionCm(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Min. Kinyúlás (cm)
                    </label>
                    <input
                      type="number"
                      value={minWidthCm}
                      onChange={(e) => setMinWidthCm(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Max. Kinyúlás (cm)
                    </label>
                    <input
                      type="number"
                      value={maxWidthCm}
                      onChange={(e) => setMaxWidthCm(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#71717a]">
                  Ha az ügyfél ennél nagyobb vagy kisebb méretet kér, a program automatikusan a legközelebbi gyártható mérettel kalkulál és figyelmeztetést tesz az ajánlatra.
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: ALAPÁR LOGIKA & SZORZÓK                                   */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  1. Milyen módszerrel számoljuk ki a szerkezet alapárát?
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: 'm2_tiers',
                      title: 'Négyzetméter (m²) alapú ár',
                      desc: 'Megadhatod az EUR/m² árat vagy sávos m² táblázatot (pl. 15 m²-ig / felette).',
                    },
                    {
                      id: 'base_plus_m2',
                      title: 'Fix induló alapár + m² ár',
                      desc: 'Van egy fix alapdíj (pl. 1200 EUR) + minden m² után X EUR.',
                    },
                    {
                      id: 'matrix_clone',
                      title: 'Gyári mérettáblázat (Mátrix)',
                      desc: 'Meglévő gyári mérettáblázat (pl. SB400, Hydra, A100LUX) használata saját szorzóval.',
                    },
                  ].map((m) => {
                    const active = pricingMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPricingMethod(m.id as TemplatePricingMethod)}
                        className={`rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                            : 'border-[#e4e4e7] bg-white text-[#0a0a0a] hover:border-[#a1a1aa]'
                        }`}
                      >
                        <div className="text-sm font-extrabold">{m.title}</div>
                        <div
                          className={`mt-1 text-xs ${
                            active ? 'text-zinc-300' : 'text-[#71717a]'
                          }`}
                        >
                          {m.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method-specific settings */}
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-4">
                {pricingMethod === 'm2_tiers' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#0a0a0a]">
                        Négyzetméter (EUR / m²) beállítása
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUseTieredM2(false)}
                          className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                            !useTieredM2
                              ? 'bg-[#0a0a0a] text-white'
                              : 'bg-white border border-[#e4e4e7] text-[#52525b]'
                          }`}
                        >
                          Egyszerű EUR/m² ár
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseTieredM2(true)}
                          className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                            useTieredM2
                              ? 'bg-[#0a0a0a] text-white'
                              : 'bg-white border border-[#e4e4e7] text-[#52525b]'
                          }`}
                        >
                          Sávos m² táblázat
                        </button>
                      </div>
                    </div>

                    {!useTieredM2 ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                            Épülethez rögzített ár (EUR / m²)
                          </label>
                          <input
                            type="number"
                            value={eurPerM2Wall}
                            onChange={(e) => setEurPerM2Wall(Number(e.target.value))}
                            className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                            Szabadon álló ár (EUR / m²)
                          </label>
                          <input
                            type="number"
                            value={eurPerM2Free}
                            onChange={(e) => setEurPerM2Free(Number(e.target.value))}
                            className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customM2Tiers.map((tier, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-[11px] font-semibold text-[#71717a]">
                                {idx + 1}. sáv felső határa (m²-ig)
                              </label>
                              <input
                                type="number"
                                value={tier.maxM2}
                                onChange={(e) => {
                                  const next = [...customM2Tiers];
                                  next[idx] = { ...next[idx], maxM2: Number(e.target.value) };
                                  setCustomM2Tiers(next);
                                }}
                                className="glass-input w-full rounded-lg px-3 py-1.5 text-sm font-bold"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[11px] font-semibold text-[#71717a]">
                                Ár ebben a sávban (EUR / m²)
                              </label>
                              <input
                                type="number"
                                value={tier.eurPerM2}
                                onChange={(e) => {
                                  const next = [...customM2Tiers];
                                  next[idx] = { ...next[idx], eurPerM2: Number(e.target.value) };
                                  setCustomM2Tiers(next);
                                }}
                                className="glass-input w-full rounded-lg px-3 py-1.5 text-sm font-bold"
                              />
                            </div>
                            {customM2Tiers.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomM2Tiers(customM2Tiers.filter((_, i) => i !== idx))
                                }
                                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setCustomM2Tiers([
                              ...customM2Tiers,
                              { maxM2: 50, eurPerM2: 320 },
                            ])
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-bold text-[#0a0a0a] hover:bg-[#f4f4f5]"
                        >
                          <Plus className="h-3.5 w-3.5" /> Új m² sáv hozzáadása
                        </button>
                      </div>
                    )}
                  </>
                )}

                {pricingMethod === 'base_plus_m2' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                        Fix induló alapár (EUR)
                      </label>
                      <input
                        type="number"
                        value={baseStartEur}
                        onChange={(e) => setBaseStartEur(Number(e.target.value))}
                        className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                        + Épülethez rögzített (EUR / m²)
                      </label>
                      <input
                        type="number"
                        value={eurPerM2Wall}
                        onChange={(e) => setEurPerM2Wall(Number(e.target.value))}
                        className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                        + Szabadon álló (EUR / m²)
                      </label>
                      <input
                        type="number"
                        value={eurPerM2Free}
                        onChange={(e) => setEurPerM2Free(Number(e.target.value))}
                        className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                      />
                    </div>
                  </div>
                )}

                {pricingMethod === 'matrix_clone' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#52525b]">
                      Melyik gyári mérettáblázatot használja alapnak?
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {MATRIX_SOURCES.map((ms) => (
                        <button
                          key={ms.id}
                          type="button"
                          onClick={() => setMatrixSourceId(ms.id)}
                          className={`rounded-lg border px-3.5 py-2.5 text-left text-xs font-bold transition ${
                            matrixSourceId === ms.id
                              ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                              : 'border-[#e4e4e7] bg-white text-[#0a0a0a] hover:border-[#a1a1aa]'
                          }`}
                        >
                          {ms.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multipliers */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#52525b]">
                    2. Árképző szorzó, kedvezmény és fix felár:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '0.60 (-40%)', val: 0.6 },
                      { label: '0.65 (-35%)', val: 0.65 },
                      { label: '0.66 (-34%)', val: 0.66 },
                      { label: '1.00 (100%)', val: 1.0 },
                      { label: '1.15 (+15%)', val: 1.15 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setSzorzo(p.val)}
                        className={`rounded px-2 py-0.5 text-[11px] font-bold transition ${
                          szorzo === p.val
                            ? 'bg-[#0a0a0a] text-white'
                            : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Árképző szorzó (pl. 1.00 vagy 0.66)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={szorzo}
                      onChange={(e) => setSzorzo(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Extra kedvezmény (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={extraDiscountPct}
                      onChange={(e) => setExtraDiscountPct(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Fix alapfelár (+/- EUR)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={fixFelarEur}
                      onChange={(e) => setFixFelarEur(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3.5 py-2 text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Instant preview bar */}
              <div className="flex items-center justify-between rounded-xl border border-[#e4e4e7] bg-[#0a0a0a] px-4 py-3 text-white">
                <div className="text-xs">
                  <span className="text-zinc-400">Élő példa (500×350 cm = 17.5 m² szerkezet alapára):</span>
                </div>
                <div className="text-sm font-extrabold">
                  {livePreview.kedvezmenyesAlaparEur.toLocaleString('hu-HU')} EUR{' '}
                  <span className="text-xs font-normal text-zinc-400">
                    ({formatCurrency(roundHuf(livePreview.kedvezmenyesAlaparEur, config.general.defaultEurHufRate))})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: MOTOR, TÁVIRÁNYÍTÓ & LED VILÁGÍTÁS                        */}
          {/* ================================================================= */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Motor */}
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-[#0a0a0a]">
                      1. Motorizáció díja (EUR)
                    </div>
                    <p className="text-xs text-[#71717a]">
                      Ha a szerkezet alapára már tartalmazza a motort (vagy fix tetős), válaszd a 0 EUR-t.
                    </p>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={motorEur}
                      onChange={(e) => setMotorEur(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-right text-sm font-extrabold"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '0 EUR (Alapárban benne van / Fix)', val: 0 },
                    { label: '523 EUR (Bioklimatikus motor)', val: 523 },
                    { label: '600 EUR (Somfy IO motor)', val: 600 },
                    { label: '800 EUR (Erősített Somfy motor)', val: 800 },
                    { label: '1000 EUR (Dupla motor)', val: 1000 },
                  ].map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setMotorEur(m.val)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        motorEur === m.val
                          ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                          : 'border-[#e4e4e7] bg-white text-[#52525b] hover:border-[#0a0a0a]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Távirányító */}
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-[#0a0a0a]">
                      2. Távirányító / vezérlő díja (EUR)
                    </div>
                    <p className="text-xs text-[#71717a]">
                      Hány EUR-ért szerepeljen a távirányító az alapszerkezet kalkulációban?
                    </p>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={taviranyitoEur}
                      onChange={(e) => setTaviranyitoEur(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-right text-sm font-extrabold"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '0 EUR (Nincs külön távirányító díj)', val: 0 },
                    { label: '100 EUR (1 csatornás Somfy távirányító)', val: 100 },
                    { label: '150 EUR (5 csatornás Somfy távirányító)', val: 150 },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setTaviranyitoEur(t.val)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        taviranyitoEur === t.val
                          ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                          : 'border-[#e4e4e7] bg-white text-[#52525b] hover:border-[#0a0a0a]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* LED */}
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-[#0a0a0a]">
                      3. Opcionális LED világítás díja (EUR)
                    </div>
                    <p className="text-xs text-[#71717a]">
                      Opcionális tételként jelenik meg az árajánlatban (integrált LED szalag vagy Spot).
                    </p>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={ledEur}
                      onChange={(e) => setLedEur(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-right text-sm font-extrabold"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '0 EUR (Nem kérhető LED)', val: 0 },
                    { label: '400 EUR (Alap LED világítás)', val: 400 },
                    { label: '700 EUR (Integrált perimetrikus LED)', val: 700 },
                    { label: '900 EUR (Prémium RGBW / Dimmeres LED)', val: 900 },
                  ].map((l) => (
                    <button
                      key={l.label}
                      type="button"
                      onClick={() => setLedEur(l.val)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        ledEur === l.val
                          ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                          : 'border-[#e4e4e7] bg-white text-[#52525b] hover:border-[#0a0a0a]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 5: SZERELÉSI MUNKADÍJ                                        */}
          {/* ================================================================= */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  1. Hogyan számoljuk a helyszíni szerelés munkadíját?
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSzerelesMode('percentage')}
                    className={`rounded-xl border p-4 text-left transition ${
                      szerelesMode === 'percentage'
                        ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                        : 'border-[#e4e4e7] bg-white text-[#0a0a0a] hover:border-[#a1a1aa]'
                    }`}
                  >
                    <div className="text-sm font-extrabold">
                      Százalékos (%) szerelési díj az alapár után
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        szerelesMode === 'percentage' ? 'text-zinc-300' : 'text-[#71717a]'
                      }`}
                    >
                      Pl. 5 000 EUR alatt 11%, felette 10% (opcionális minimum szerelési díjjal).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSzerelesMode('fixed')}
                    className={`rounded-xl border p-4 text-left transition ${
                      szerelesMode === 'fixed'
                        ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                        : 'border-[#e4e4e7] bg-white text-[#0a0a0a] hover:border-[#a1a1aa]'
                    }`}
                  >
                    <div className="text-sm font-extrabold">
                      Fix összegű szerelési díj (EUR)
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        szerelesMode === 'fixed' ? 'text-zinc-300' : 'text-[#71717a]'
                      }`}
                    >
                      Fix EUR munkadíj (pl. 600 EUR) a pergola méretétől függetlenül.
                    </p>
                  </button>
                </div>
              </div>

              {szerelesMode === 'percentage' ? (
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Küszöbérték alatt (%)
                    </label>
                    <input
                      type="number"
                      value={szerelesPctLow}
                      onChange={(e) => setSzerelesPctLow(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Küszöbérték felett (%)
                    </label>
                    <input
                      type="number"
                      value={szerelesPctMid}
                      onChange={(e) => setSzerelesPctMid(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Küszöbérték (EUR)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={szerelesThreshold1}
                      onChange={(e) => setSzerelesThreshold1(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                      Minimum szerelés (EUR)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={szerelesMinEur}
                      onChange={(e) => setSzerelesMinEur(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-3">
                  <label className="block text-xs font-bold text-[#0a0a0a]">
                    Fix helyszíni szerelési díj összege (EUR):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="50"
                      value={szerelesFixEur}
                      onChange={(e) => setSzerelesFixEur(Number(e.target.value))}
                      className="glass-input w-44 rounded-lg px-3.5 py-2 text-base font-extrabold"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[450, 550, 650, 800, 1000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSzerelesFixEur(v)}
                          className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-bold text-[#0a0a0a] hover:bg-[#f4f4f5]"
                        >
                          {v} EUR
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 6: OLDALZÁRÁS & AJÁNDÉK EXTRÁK                               */}
          {/* ================================================================= */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  1. Kérhető-e a sablonhoz oldalzárás (automatikus méretre számolással)?
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAllowZipSide(!allowZipSide)}
                    className={`flex items-start justify-between rounded-xl border p-4 text-left transition ${
                      allowZipSide
                        ? 'border-[#0a0a0a] bg-[#0a0a0a]/5 ring-2 ring-[#0a0a0a]/10'
                        : 'border-[#e4e4e7] bg-white opacity-70'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-extrabold text-[#0a0a0a]">
                        Motoros ZIP oldalsó árnyékoló opció
                      </div>
                      <p className="mt-1 text-xs text-[#71717a]">
                        Automatikusan kiszámolja a nettó nyílásméretre a Somfy motoros ZIP árnyékolót és szerelését.
                      </p>
                    </div>
                    <span
                      className={`ml-3 rounded-md px-2.5 py-1 text-[11px] font-extrabold ${
                        allowZipSide
                          ? 'bg-[#0a0a0a] text-white'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                      }`}
                    >
                      {allowZipSide ? 'IGEN' : 'NEM'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowUvegfalSide(!allowUvegfalSide)}
                    className={`flex items-start justify-between rounded-xl border p-4 text-left transition ${
                      allowUvegfalSide
                        ? 'border-[#0a0a0a] bg-[#0a0a0a]/5 ring-2 ring-[#0a0a0a]/10'
                        : 'border-[#e4e4e7] bg-white opacity-70'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-extrabold text-[#0a0a0a]">
                        10 mm-es edzett Üvegfal rendszer opció
                      </div>
                      <p className="mt-1 text-xs text-[#71717a]">
                        Automatikusan kiszámolja az elcsúsztatható üvegfal táblaszámát, m² árát és szerelését.
                      </p>
                    </div>
                    <span
                      className={`ml-3 rounded-md px-2.5 py-1 text-[11px] font-extrabold ${
                        allowUvegfalSide
                          ? 'bg-[#0a0a0a] text-white'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                      }`}
                    >
                      {allowUvegfalSide ? 'IGEN' : 'NEM'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  2. Milyen ajándék csomag (0 EUR) szerepeljen az árajánlatban?
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setGiftInfraHeating(!giftInfraHeating)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                      giftInfraHeating
                        ? 'border-emerald-600 bg-emerald-50/60'
                        : 'border-[#e4e4e7] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="text-sm font-bold text-[#0a0a0a]">
                          Ajándék 2 db Infravörös teraszfűtő
                        </div>
                        <div className="text-xs text-[#71717a]">
                          0 EUR díjmentes ajándékként feltüntetve
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold ${
                        giftInfraHeating
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                      }`}
                    >
                      {giftInfraHeating ? 'BENNE VAN' : 'NINCS'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGiftRainWindSensor(!giftRainWindSensor)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                      giftRainWindSensor
                        ? 'border-emerald-600 bg-emerald-50/60'
                        : 'border-[#e4e4e7] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="text-sm font-bold text-[#0a0a0a]">
                          Ajándék Eső- és szélérzékelő szenzor
                        </div>
                        <div className="text-xs text-[#71717a]">
                          0 EUR díjmentes ajándékként feltüntetve
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold ${
                        giftRainWindSensor
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                      }`}
                    >
                      {giftRainWindSensor ? 'BENNE VAN' : 'NINCS'}
                    </span>
                  </button>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-[#52525b]">
                    Egyedi extra ajándék megnevezése (opcionális):
                  </label>
                  <input
                    type="text"
                    value={customGiftLabel}
                    onChange={(e) => setCustomGiftLabel(e.target.value)}
                    placeholder="Pl. Ajándék Somfy Tahoma Switch okosotthon vezérlő (0 EUR)"
                    className="glass-input w-full rounded-lg px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 7: 2 DB PDF LÁTVÁNYFOTÓ ÉS KÉPLEÍRÁS                         */}
          {/* ================================================================= */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#52525b]">
                    Válaszd ki vagy töltsd fel a <b>2 PDF látványfotót</b>, állítsd be a <b>sorrendjüket (1. oldal vs. 2. oldal)</b>, és írd meg a hozzájuk tartozó <b>egyedi képleírást</b>!
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSwapPhotosOrder}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#27272a] transition"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      1. és 2. Fotó Sorrendjének Megcserélése
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefaultPhotos}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-bold text-[#52525b] hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Eredeti gyári fotók visszaállítása
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[#e4e4e7] pt-3">
                  <span className="text-xs font-bold text-[#0a0a0a]">
                    Másik sablon (régi vagy új) fotóinak és leírásainak betöltése:
                  </span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLoadPhotosFromModel(e.target.value);
                      }
                    }}
                    className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-semibold text-[#0a0a0a]"
                  >
                    <option value="">-- Válassz sablont a fotók átmásolásához --</option>
                    {Object.values(config.models || {}).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 1. FOTÓ ÉS LEÍRÁS */}
                <div className="rounded-xl border border-[#e4e4e7] bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0a0a0a] px-2.5 py-1 text-[11px] font-extrabold text-white">
                      <ImageIcon className="h-3.5 w-3.5" />
                      1. PDF Fotó (1. oldal – Fő bemutató kép)
                    </span>
                    <button
                      type="button"
                      onClick={handleSwapPhotosOrder}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2.5 py-1 text-[11px] font-extrabold text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition"
                    >
                      Hátrébb tesz (2. helyre) →
                    </button>
                  </div>

                  <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#f4f4f5]">
                    {photo1Url ? (
                      <img
                        src={photo1Url}
                        alt="1. PDF fotó"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-[#71717a]">Nincs kép kiválasztva</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPickerSlot(pickerSlot === 1 ? null : 1)
                      }
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        pickerSlot === 1
                          ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                          : 'border-[#e4e4e7] bg-[#fafafa] text-[#0a0a0a] hover:bg-[#f4f4f5]'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Választás galériából
                    </button>

                    <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-bold text-[#0a0a0a] hover:bg-[#f4f4f5] transition">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingSlot === 1 ? 'Feltöltés...' : 'Saját fotó gépről'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadPhoto(1, f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-extrabold text-[#0a0a0a]">
                      1. Fotó leírása / bemutató szövege a PDF-ben:
                    </label>
                    <textarea
                      rows={3}
                      value={photo1Desc}
                      onChange={(e) => {
                        setPhoto1Desc(e.target.value);
                        setHasCustomizedPhotos(true);
                      }}
                      placeholder="Írd ide, mi jelenjen meg az 1. fotó felett/alatt a PDF árajánlatban..."
                      className="glass-input w-full rounded-lg p-2.5 text-xs leading-relaxed"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {PHOTO_DESC_PRESETS_1.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPhoto1Desc(preset);
                            setHasCustomizedPhotos(true);
                          }}
                          className="rounded border border-[#e4e4e7] bg-[#fafafa] px-2 py-0.5 text-[10px] font-semibold text-[#52525b] hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition"
                        >
                          Mintaszöveg #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. FOTÓ ÉS LEÍRÁS */}
                <div className="rounded-xl border border-[#e4e4e7] bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0a0a0a] px-2.5 py-1 text-[11px] font-extrabold text-white">
                      <ImageIcon className="h-3.5 w-3.5" />
                      2. PDF Fotó (2. oldal – Ártáblázat felett)
                    </span>
                    <button
                      type="button"
                      onClick={handleSwapPhotosOrder}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2.5 py-1 text-[11px] font-extrabold text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition"
                    >
                      ← Előrébb hoz (1. helyre)
                    </button>
                  </div>

                  <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#f4f4f5]">
                    {photo2Url ? (
                      <img
                        src={photo2Url}
                        alt="2. PDF fotó"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-[#71717a]">Nincs kép kiválasztva</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPickerSlot(pickerSlot === 2 ? null : 2)
                      }
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        pickerSlot === 2
                          ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
                          : 'border-[#e4e4e7] bg-[#fafafa] text-[#0a0a0a] hover:bg-[#f4f4f5]'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Választás galériából
                    </button>

                    <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-bold text-[#0a0a0a] hover:bg-[#f4f4f5] transition">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingSlot === 2 ? 'Feltöltés...' : 'Saját fotó gépről'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadPhoto(2, f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-extrabold text-[#0a0a0a]">
                      2. Fotó leírása / bemutató szövege a PDF-ben:
                    </label>
                    <textarea
                      rows={3}
                      value={photo2Desc}
                      onChange={(e) => {
                        setPhoto2Desc(e.target.value);
                        setHasCustomizedPhotos(true);
                      }}
                      placeholder="Írd ide, mi jelenjen meg a 2. fotó mellett/alatt a PDF árajánlatban..."
                      className="glass-input w-full rounded-lg p-2.5 text-xs leading-relaxed"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {PHOTO_DESC_PRESETS_2.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPhoto2Desc(preset);
                            setHasCustomizedPhotos(true);
                          }}
                          className="rounded border border-[#e4e4e7] bg-[#fafafa] px-2 py-0.5 text-[10px] font-semibold text-[#52525b] hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition"
                        >
                          Mintaszöveg #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* INLINE VISUAL GALLERY PICKER */}
              {pickerSlot !== null && (
                <div className="rounded-xl border-2 border-[#0a0a0a] bg-[#fafafa] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-[#0a0a0a]">
                      Kattints egy képre a(z) {pickerSlot}. PDF fotó kiválasztásához:
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'all', label: 'Összes' },
                        { id: 'uploaded', label: 'Saját feltöltött' },
                        { id: 'bioklimatikus', label: 'Bioklimatikus' },
                        { id: 'elhuzhato_ponyvas', label: 'Elhúzható ponyvás' },
                        { id: 'feszitett_vasznas', label: 'Feszített vásznas' },
                        { id: 'uvegtetos', label: 'Üvegtetős' },
                        { id: 'polikarbonatos', label: 'Polikarbonátos' },
                        { id: 'uvegfalas', label: 'Üvegfal' },
                        { id: 'ZIPes', label: 'ZIP' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setGalleryFilter(cat.id)}
                          className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                            galleryFilter === cat.id
                              ? 'bg-[#0a0a0a] text-white'
                              : 'bg-white border border-[#e4e4e7] text-[#52525b] hover:text-[#0a0a0a]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPickerSlot(null)}
                        className="ml-2 rounded-md border border-[#e4e4e7] bg-white px-2 py-1 text-[10px] font-bold text-[#71717a] hover:text-[#0a0a0a]"
                      >
                        Bezárás ✕
                      </button>
                    </div>
                  </div>

                  <div className="grid max-h-60 grid-cols-3 gap-2.5 overflow-y-auto sm:grid-cols-4 md:grid-cols-5 p-1">
                    {galleryImages
                      .filter(
                        (img) =>
                          galleryFilter === 'all' || img.category === galleryFilter
                      )
                      .map((img) => {
                        const isSelected =
                          (pickerSlot === 1 && photo1Url === img.url) ||
                          (pickerSlot === 2 && photo2Url === img.url);
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => {
                              if (pickerSlot === 1) setPhoto1Url(img.url);
                              else setPhoto2Url(img.url);
                              setHasCustomizedPhotos(true);
                              setPickerSlot(null);
                            }}
                            className={`group relative flex flex-col overflow-hidden rounded-lg border-2 bg-white transition ${
                              isSelected
                                ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                                : 'border-[#e4e4e7] hover:border-[#0a0a0a]'
                            }`}
                          >
                            <div className="flex h-24 w-full items-center justify-center bg-[#f4f4f5] p-1">
                              <img
                                src={img.url}
                                alt={img.filename}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="truncate px-1.5 py-1 text-[10px] font-semibold text-[#52525b]">
                              {img.categoryLabel}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 8: ÉLŐ PRÓBA-KALKULÁCIÓ & MENTÉS                             */}
          {/* ================================================================= */}
          {step === 8 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      ÉLŐ SABLON TESZTELŐ
                    </span>
                    <h3 className="text-base font-extrabold text-[#0a0a0a]">
                      {draftRule.name}
                    </h3>
                    <p className="text-xs text-[#71717a]">{draftRule.description}</p>
                  </div>
                  <span className="rounded-lg bg-[#0a0a0a] px-3 py-1 text-xs font-bold text-white">
                    Kategória:{' '}
                    {categoryMode === 'new'
                      ? newCategoryName
                      : allCategories.find((c) => c.id === selectedCategory)?.name}
                  </span>
                </div>

                {/* Interactive test dimensions */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-[#e4e4e7] pt-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#52525b]">
                      Teszt Szélesség (cm)
                    </label>
                    <input
                      type="number"
                      value={testProj}
                      onChange={(e) => setTestProj(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#52525b]">
                      Teszt Kinyúlás (cm)
                    </label>
                    <input
                      type="number"
                      value={testWidth}
                      onChange={(e) => setTestWidth(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#52525b]">
                      Teszt Magasság (cm)
                    </label>
                    <input
                      type="number"
                      value={testHeight}
                      onChange={(e) => setTestHeight(Number(e.target.value))}
                      className="glass-input w-full rounded-lg px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#52525b]">
                      Beépítés módja
                    </label>
                    <select
                      value={testMount}
                      onChange={(e) => setTestMount(e.target.value as any)}
                      className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    >
                      <option value="Épülethez rögzített">Épülethez rögzített</option>
                      <option value="Szabadon álló">Szabadon álló</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Calculated breakdown card */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e4e4e7] bg-white p-4 space-y-2.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#71717a]">
                    Alapszerkezet tételes bontása ({testProj}×{testWidth} cm)
                  </div>
                  <div className="flex justify-between text-xs text-[#71717a]">
                    <span>Listaár (kedvezmény nélkül):</span>
                    <span className="line-through">
                      {livePreview.listaArEur.toLocaleString('hu-HU')} EUR
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-[#0a0a0a]">
                    <span>Kedvezményes szerkezet alapár:</span>
                    <span>{livePreview.kedvezmenyesAlaparEur.toLocaleString('hu-HU')} EUR</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#52525b]">
                    <span>Motorizáció:</span>
                    <span>{livePreview.motorEur.toLocaleString('hu-HU')} EUR</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#52525b]">
                    <span>Távirányító / vezérlés:</span>
                    <span>{livePreview.taviranyitoEur.toLocaleString('hu-HU')} EUR</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#52525b]">
                    <span>Helyszíni szerelés ({livePreview.szerelesPct}%):</span>
                    <span>{livePreview.szerelesEur.toLocaleString('hu-HU')} EUR</span>
                  </div>
                  <div className="border-t border-[#e4e4e7] pt-2 flex items-baseline justify-between">
                    <span className="text-xs font-extrabold uppercase text-[#0a0a0a]">
                      Alapszerkezet összesen:
                    </span>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-[#0a0a0a]">
                        {livePreview.alapszerkezetOsszesenEur.toLocaleString('hu-HU')} EUR
                      </div>
                      <div className="text-xs font-bold text-emerald-700">
                        {formatCurrency(livePreview.alapszerkezetOsszesenHuf)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e4e4e7] bg-white p-4 space-y-2.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#71717a]">
                    Opcionális kiegészítők & Ajándékok
                  </div>
                  <div className="flex justify-between text-xs text-[#52525b]">
                    <span>LED világítás opció:</span>
                    <span className="font-bold text-[#0a0a0a]">
                      {livePreview.ledEur > 0
                        ? `+${livePreview.ledEur.toLocaleString('hu-HU')} EUR (${formatCurrency(livePreview.ledHuf)})`
                        : 'Nincs'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[#52525b]">
                    <span>Oldalsó ZIP árnyékoló (2 oldal + szerelés):</span>
                    <span className="font-bold text-[#0a0a0a]">
                      {allowZipSide
                        ? `+${livePreview.zipOsszesenEur.toLocaleString('hu-HU')} EUR`
                        : 'Kikapcsolva'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[#52525b]">
                    <span>10 mm edzett Üvegfal (2 oldal + szerelés):</span>
                    <span className="font-bold text-[#0a0a0a]">
                      {allowUvegfalSide
                        ? `+${livePreview.uvegfalOsszesenEur.toLocaleString('hu-HU')} EUR`
                        : 'Kikapcsolva'}
                    </span>
                  </div>
                  <div className="border-t border-[#e4e4e7] pt-2 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-700">
                      Kiválasztott 2 PDF fotó és képleírás:
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {pdfPhotos.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-1.5"
                        >
                          <img
                            src={p.url}
                            alt={`Fotó ${idx + 1}`}
                            className="h-10 w-14 rounded object-contain bg-white border border-[#e4e4e7] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] font-extrabold text-[#0a0a0a]">
                              {idx + 1}. Fotó
                            </div>
                            <div className="truncate text-[10px] text-[#71717a]">
                              {p.description || 'Nincs leírás'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between border-t border-[#e4e4e7] bg-[#fafafa] px-6 py-4">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-4 py-2.5 text-xs font-bold text-[#0a0a0a] hover:bg-[#f4f4f5] transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Előző kérdés
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-4 py-2.5 text-xs font-semibold text-[#71717a] hover:text-[#0a0a0a] transition"
              >
                Mégse
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step < 8 ? (
              <button
                type="button"
                disabled={step === 1 && !canContinueStep1}
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#27272a] disabled:opacity-40 transition"
              >
                Következő kérdés ({step + 1}/8)
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFinish(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#0a0a0a] bg-white px-4 py-2.5 text-xs font-bold text-[#0a0a0a] hover:bg-[#f4f4f5] transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isEditing ? 'Sablon Módosítások Mentése' : 'Sablon Mentése'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFinish(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#27272a] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Mentés & Új Árajánlat Indítása Ezzel →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
