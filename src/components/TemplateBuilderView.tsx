'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Edit3,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Package,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DIMENSION_SOURCE_OPTIONS,
  formatDotNumber,
  MOUNT_TYPES,
  PRICING_MODE_OPTIONS,
  QUICK_CATEGORY_SUGGESTIONS,
  replaceTemplateVariables,
  TEMPLATE_VARIABLES_HELP,
} from '@/lib/constants';
import {
  calculateTemplateRows,
  createDefaultMaterialAlgorithm,
} from '@/lib/pricing-engine';
import {
  CustomMatrixTable,
  CustomTextBlock,
  DimensionSource,
  M2PriceTier,
  PhotoCaptionBlock,
  ProductCategory,
  ProductPricingMode,
  QuoteTemplate,
  SystemConfig,
  TemplateMaterialItem,
  UploadedMediaItem,
} from '@/lib/types';

interface TemplateBuilderViewProps {
  config: SystemConfig;
  categories: ProductCategory[];
  templates: QuoteTemplate[];
  mediaLibrary: UploadedMediaItem[];
  onSaveCategory: (category: ProductCategory) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSaveTemplate: (template: QuoteTemplate) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
  onStartGuidedPricing?: () => void;
}

function createDefaultMaterial(): TemplateMaterialItem {
  return createDefaultMaterialAlgorithm();
}

export function TemplateBuilderView({
  config,
  categories,
  templates,
  mediaLibrary,
  onSaveCategory,
  onDeleteCategory,
  onSaveTemplate,
  onDeleteTemplate,
  onUploadImage,
  onStartGuidedPricing,
}: TemplateBuilderViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || 'ALL'
  );

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catQuestion, setCatQuestion] = useState('');
  const [catType, setCatType] = useState<'main_structure' | 'accessory'>(
    'main_structure'
  );
  const [catAllowMultiple, setCatAllowMultiple] = useState(true);

  // Template Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null
  );
  const [tplCategoryId, setTplCategoryId] = useState<string>('');
  const [tplName, setTplName] = useState('');
  const [tplSubtitle, setTplSubtitle] = useState('');
  const [tplIntroText, setTplIntroText] = useState('');
  const [tplClosingText, setTplClosingText] = useState('');
  const [tplTextBlocks, setTplTextBlocks] = useState<CustomTextBlock[]>([]);
  const [tplPhotos, setTplPhotos] = useState<PhotoCaptionBlock[]>([]);
  const [tplMaterials, setTplMaterials] = useState<TemplateMaterialItem[]>([]);

  // Active material being edited inside Step 2
  const [activeMaterialIdx, setActiveMaterialIdx] = useState<number>(0);
  const [newMatrixRowInput, setNewMatrixRowInput] = useState('');
  const [newMatrixColInput, setNewMatrixColInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Step 5 live test preview parameters
  const [testCustomerName, setTestCustomerName] = useState('Kovács János');
  const [testWidthCm, setTestWidthCm] = useState(600);
  const [testProjCm, setTestProjCm] = useState(400);
  const [testHeightCm, setTestHeightCm] = useState(250);

  // Open Category Modal
  const openNewCategoryModal = (preset?: {
    name: string;
    questionPrompt: string;
    categoryType: 'main_structure' | 'accessory';
    description: string;
  }) => {
    setEditingCategory(null);
    setCatName(preset?.name || '');
    setCatDescription(preset?.description || '');
    setCatQuestion(
      preset?.questionPrompt ||
        (preset?.name
          ? `Kér az ügyfél ${preset.name.toLowerCase()}t?`
          : 'Kér ilyet az ügyfél?')
    );
    setCatType(preset?.categoryType || 'main_structure');
    setCatAllowMultiple(true);
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description);
    setCatQuestion(cat.questionPrompt);
    setCatType(cat.categoryType);
    setCatAllowMultiple(cat.allowMultipleTemplates);
    setCategoryModalOpen(true);
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const id =
      editingCategory?.id ||
      `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCat: ProductCategory = {
      id,
      name: catName.trim(),
      shortName: catName.trim(),
      description: catDescription.trim(),
      questionPrompt:
        catQuestion.trim() || `Kér az ügyfél ${catName.trim().toLowerCase()}t?`,
      categoryType: catType,
      allowMultipleTemplates: catAllowMultiple,
      order: editingCategory?.order ?? categories.length + 1,
    };
    await onSaveCategory(newCat);
    setSelectedCategoryId(newCat.id);
    setCategoryModalOpen(false);
  };

  // Open Template Wizard
  const openNewTemplateWizard = (defaultCatId?: string) => {
    const targetCatId =
      defaultCatId && defaultCatId !== 'ALL'
        ? defaultCatId
        : categories[0]?.id || '';
    setEditingTemplateId(null);
    setTplCategoryId(targetCatId);
    setTplName('');
    setTplSubtitle('');
    setTplIntroText(
      'A kiválasztott {{meret_m}} ({{meret}}) méretű konstrukció prémium alapanyagokból, egyedi méretre gyártva készül.'
    );
    setTplClosingText(
      'A fenti összegek tartalmazzák a gyártást és a választott műszaki tartalmat.'
    );
    setTplTextBlocks([]);
    setTplPhotos([]);
    setTplMaterials([
      {
        ...createDefaultMaterial(),
        name: 'Alapszerkezet / Fő termék',
        description: 'Egyedi méretre gyártott kivitel',
      },
    ]);
    setActiveMaterialIdx(0);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const openEditTemplateWizard = (tpl: QuoteTemplate) => {
    setEditingTemplateId(tpl.id);
    setTplCategoryId(tpl.categoryId);
    setTplName(tpl.name);
    setTplSubtitle(tpl.subtitle || '');
    setTplIntroText(tpl.introText || '');
    setTplClosingText(tpl.closingText || '');
    setTplTextBlocks(
      (tpl.textBlocks || []).map((tb) => ({ ...tb }))
    );
    setTplPhotos((tpl.photos || []).map((p) => ({ ...p })));

    const rawMats =
      tpl.materials && tpl.materials.length > 0
        ? tpl.materials
        : [createDefaultMaterial()];
    const hasNonPctBase = rawMats.some(
      (m) => m.pricingMode !== 'percentage' && m.itemRole === 'base'
    );

    setTplMaterials(
      rawMats.map((m, idx) => ({
        ...m,
        pricingMode:
          !hasNonPctBase && idx === 0 && m.pricingMode === 'percentage'
            ? 'per_m2'
            : m.pricingMode,
        basePrice: Math.max(1, Number(m.basePrice) || 1500),
        unitPrice: Math.max(1, Number(m.unitPrice) || 350),
        minPrice: Math.max(1, Number(m.minPrice) || 300),
        m2Tiers: (m.m2Tiers || []).map((t) => ({
          ...t,
          pricePerM2: Math.max(1, Number(t.pricePerM2) || 350),
        })),
        photos: (m.photos || []).map((p) => ({ ...p })),
      }))
    );
    setActiveMaterialIdx(0);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleDuplicateTemplate = async (tpl: QuoteTemplate) => {
    const now = new Date().toISOString();
    const copy: QuoteTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${tpl.name} (Másolat)`,
      createdAt: now,
      updatedAt: now,
    };
    await onSaveTemplate(copy);
  };

  const updateMaterial = (
    idx: number,
    patch: Partial<TemplateMaterialItem>
  ) => {
    setTplMaterials((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    );
  };

  const handleAddMaterial = () => {
    const nextMat = createDefaultMaterial();
    setTplMaterials((prev) => {
      const updated = [...prev, nextMat];
      setActiveMaterialIdx(updated.length - 1);
      return updated;
    });
  };

  const handleRemoveMaterial = (idx: number) => {
    setTplMaterials((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeMaterialIdx >= next.length) {
        setActiveMaterialIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleSaveTemplateFinal = async () => {
    if (!tplName.trim() || !tplCategoryId) return;
    setSavingTemplate(true);
    try {
      const now = new Date().toISOString();
      const hasNonPctBase = tplMaterials.some(
        (m) => m.pricingMode !== 'percentage' && m.itemRole === 'base'
      );
      const tpl: QuoteTemplate = {
        id:
          editingTemplateId ||
          `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        categoryId: tplCategoryId,
        name: tplName.trim(),
        subtitle: tplSubtitle.trim(),
        enabled: true,
        introText: tplIntroText,
        closingText: tplClosingText,
        textBlocks: tplTextBlocks,
        photos: tplPhotos,
        materials: tplMaterials.map((m, i) => ({
          ...m,
          pricingMode:
            !hasNonPctBase && i === 0 && m.pricingMode === 'percentage'
              ? 'per_m2'
              : m.pricingMode,
          basePrice: Math.max(1, Number(m.basePrice) || 1500),
          unitPrice: Math.max(1, Number(m.unitPrice) || 350),
          minPrice: Math.max(1, Number(m.minPrice) || 300),
          name: m.name.trim() || `${i + 1}. Termék / Anyag tétel`,
        })),
        createdAt: now,
        updatedAt: now,
      };
      await onSaveTemplate(tpl);
      setWizardOpen(false);
    } finally {
      setSavingTemplate(false);
    }
  };

  const currentMaterial = tplMaterials[activeMaterialIdx] || null;

  const filteredTemplates =
    selectedCategoryId === 'ALL'
      ? templates
      : templates.filter((t) => t.categoryId === selectedCategoryId);

  // Live preview calculation for Step 5
  const previewDraftTemplate: QuoteTemplate = {
    id: editingTemplateId || 'preview_tpl',
    categoryId: tplCategoryId,
    name: tplName || 'Új Sablon',
    subtitle: tplSubtitle,
    enabled: true,
    introText: tplIntroText,
    closingText: tplClosingText,
    textBlocks: tplTextBlocks,
    photos: tplPhotos,
    materials: tplMaterials,
    createdAt: '',
    updatedAt: '',
  };

  const previewCalc = calculateTemplateRows(previewDraftTemplate, {
    widthCm: testWidthCm,
    projectionCm: testProjCm,
    heightCm: testHeightCm,
    mountType: 'Épülethez rögzített',
    eurHufRate: config.defaultEurHufRate || 400,
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            1. LÉPÉS: EGYEDI SABLON & TERMÉK VARÁZSLÓ
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sablonok, Termékek, Anyagok és Fotók Építője
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Itt veheted fel a fő kategóriákat (pl. Pergola, Előtető, Napellenző,
            Üvegtető, Üvegfal, LED), azokba a sablonokat (akár 3–4 sablont
            kategóriánként), minden sablonhoz saját termékekkel, anyagokkal,
            fotókkal és szövegdobozokkal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openNewCategoryModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition"
          >
            <FolderPlus className="w-4 h-4" />
            + Új Kategória (pl. Napellenző, Pergola)
          </button>
          <button
            type="button"
            onClick={() => openNewTemplateWizard(selectedCategoryId)}
            disabled={categories.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            + Új Sablon & Termék Varázsló
          </button>
        </div>
      </div>

      {/* Quick Start Empty State if 0 categories */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Tiszta lappal indulunk! Hozd létre az első termék-kategóriádat
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2">
            Kattints az alábbi gyorsgombok valamelyikére (vagy hozz létre saját
            nevű kategóriát), majd azon belül máris építheted a sablonokat,
            termékeket, árazási szabályokat és fotókat!
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-6">
            {QUICK_CATEGORY_SUGGESTIONS.map((sug) => (
              <button
                key={sug.name}
                type="button"
                onClick={() => openNewCategoryModal(sug)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-800 text-sm font-medium transition"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                {sug.name}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => openNewCategoryModal()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow"
            >
              <FolderPlus className="w-4 h-4" />
              Teljesen egyedi kategória létrehozása
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Category Filter Bar + Quick Add Chips */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Felvett Kategóriák ({categories.length} db)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">
                  Gyors kategória felvétel:
                </span>
                {QUICK_CATEGORY_SUGGESTIONS.filter(
                  (s) =>
                    !categories.some(
                      (c) => c.name.toLowerCase() === s.name.toLowerCase()
                    )
                ).map((sug) => (
                  <button
                    key={sug.name}
                    type="button"
                    onClick={() => openNewCategoryModal(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-medium border border-slate-200 transition"
                  >
                    + {sug.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('ALL')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Összes sablon ({templates.length})
              </button>

              {categories.map((cat) => {
                const count = templates.filter(
                  (t) => t.categoryId === cat.id
                ).length;
                const isActive = selectedCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`inline-flex items-center rounded-xl border transition ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="px-3.5 py-2 text-sm font-semibold flex items-center gap-2"
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count} sablon
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditCategoryModal(cat)}
                      title="Kategória szerkesztése"
                      className={`p-2 border-l ${
                        isActive
                          ? 'border-emerald-500 text-emerald-100 hover:text-white'
                          : 'border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">
                Ebben a kategóriában még nincs sablon
              </h3>
              <p className="text-sm text-slate-600 mt-1 mb-5">
                Hozz létre 1, 2, 3 vagy akárhány sablont ebben a kategóriában
                saját termékekkel, anyagokkal, fotókkal és szövegdobozokkal!
              </p>
              <button
                type="button"
                onClick={() => openNewTemplateWizard(selectedCategoryId)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                + Sablon létrehozása a Varázslóval
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTemplates.map((tpl) => {
                const cat = categories.find((c) => c.id === tpl.categoryId);
                const coverPhoto =
                  tpl.photos?.[0]?.imageUrl ||
                  tpl.materials?.find((m) => m.photos?.length > 0)?.photos?.[0]
                    ?.imageUrl;
                const sampleCalc = calculateTemplateRows(tpl, {
                  widthCm: 600,
                  projectionCm: 400,
                  heightCm: 250,
                  mountType: 'Épülethez rögzített',
                  eurHufRate: config.defaultEurHufRate || 400,
                });

                return (
                  <div
                    key={tpl.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-emerald-400 transition"
                  >
                    <div>
                      {coverPhoto ? (
                        <div className="h-44 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                          <img
                            src={coverPhoto}
                            alt={tpl.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-semibold backdrop-blur-sm">
                            {cat?.name || 'Kategória'}
                          </span>
                        </div>
                      ) : (
                        <div className="h-28 bg-gradient-to-br from-slate-800 to-slate-900 p-4 flex flex-col justify-between">
                          <span className="inline-block self-start px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-semibold">
                            {cat?.name || 'Kategória'}
                          </span>
                          <span className="text-xs text-slate-300">
                            {tpl.photos?.length || 0} sablonfotó •{' '}
                            {tpl.materials?.length || 0} termék/anyag tétel
                          </span>
                        </div>
                      )}

                      <div className="p-5">
                        <h3 className="text-lg font-bold text-slate-900">
                          {tpl.name}
                        </h3>
                        {tpl.subtitle && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {tpl.subtitle}
                          </p>
                        )}

                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-900">
                            🧮 Algoritmus ár (6×4 m példa):
                          </span>
                          <span className="text-xs font-extrabold text-emerald-950">
                            {formatDotNumber(sampleCalc.totalBaseEur)} EUR (
                            {formatDotNumber(sampleCalc.totalBaseHuf)} Ft)
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="text-xs font-semibold text-slate-700">
                            Termékek és algoritmusok ({tpl.materials?.length || 0} db):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(tpl.materials || []).slice(0, 5).map((m) => {
                              const modeLabel =
                                PRICING_MODE_OPTIONS.find(
                                  (pm) => pm.id === m.pricingMode
                                )?.shortLabel || m.pricingMode;
                              return (
                                <span
                                  key={m.id}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-200"
                                >
                                  {m.name} ({modeLabel})
                                </span>
                              );
                            })}
                            {(tpl.materials?.length || 0) > 5 && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs">
                                +{(tpl.materials?.length || 0) - 5} további
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openEditTemplateWizard(tpl)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Sablon & Termékek szerkesztése
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateTemplate(tpl)}
                          title="Sablon duplikálása"
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 transition"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Biztosan törlöd a(z) "${tpl.name}" sablont?`
                              )
                            ) {
                              onDeleteTemplate(tpl.id);
                            }
                          }}
                          title="Sablon törlése"
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {templates.length > 0 && onStartGuidedPricing && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-emerald-950">
                  Készen állnak a sablonok? Indítsd el a Végigvezetett Árazót!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  A végigvezetett árazóban megadhatod az ügyfél nevét, a
                  méreteket, és bekattinthatod, milyen sablonokat és termékeket
                  kér az ügyfél.
                </p>
              </div>
              <button
                type="button"
                onClick={onStartGuidedPricing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm shrink-0"
              >
                Tovább a Végigvezetett Árazóba
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* CATEGORY MODAL                                                        */}
      {/* ===================================================================== */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCategory
                  ? 'Kategória szerkesztése'
                  : 'Új Termék-kategória létrehozása'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Kategória megnevezése *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!editingCategory) {
                      setCatQuestion(
                        `Kér az ügyfél ${e.target.value.toLowerCase()}t?`
                      );
                    }
                  }}
                  placeholder="pl. Pergola, Előtető, Napellenző, Üvegfal, LED világítás..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Kérdés a végigvezetett árazóban
                </label>
                <input
                  type="text"
                  value={catQuestion}
                  onChange={(e) => setCatQuestion(e.target.value)}
                  placeholder="pl. Kér az ügyfél napellenzőt?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Amikor bejön egy megkeresés, ezzel a kérdéssel vezeti végig az
                  árazót a rendszer (Igen / Nem bekattintással).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Kategória típusa
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCatType('main_structure')}
                    className={`p-3 rounded-xl border text-left transition ${
                      catType === 'main_structure'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">Fő szerkezet</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      pl. Pergola, Előtető, Üvegtető
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('accessory')}
                    className={`p-3 rounded-xl border text-left transition ${
                      catType === 'accessory'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      Kiegészítő / Árnyékoló / Extra
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      pl. Napellenző, Üvegfal, LED, ZIP
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Rövid leírás (opcionális)
                </label>
                <input
                  type="text"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="pl. 3-4 választható napellenző sablon képekkel és anyagokkal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Biztosan törlöd a(z) "${editingCategory.name}" kategóriát és a benne lévő sablonokat?`
                        )
                      ) {
                        await onDeleteCategory(editingCategory.id);
                        setCategoryModalOpen(false);
                        setSelectedCategoryId('ALL');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Kategória törlése
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm"
                  >
                    Mentés
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5-STEP TEMPLATE & PRODUCT BUILDER WIZARD MODAL                        */}
      {/* ===================================================================== */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Wizard Top Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  SABLON & TERMÉK ÉPÍTŐ VARÁZSLÓ
                </div>
                <h2 className="text-lg font-bold">
                  {editingTemplateId
                    ? `Sablon szerkesztése: ${tplName || 'Sablon'}`
                    : 'Új Egyedi Sablon és Termékek Felvétele'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap gap-2">
              {[
                { s: 1 as const, label: '1. Kategória & Sablon Neve' },
                { s: 2 as const, label: '2. Termékek, Anyagok & Árazás' },
                { s: 3 as const, label: '3. Sablon Fotók & Képaláírások' },
                { s: 4 as const, label: '4. Szövegdobozok & Automatizáció' },
                { s: 5 as const, label: '5. Élő Teszt & Mentés' },
              ].map((tab) => (
                <button
                  key={tab.s}
                  type="button"
                  onClick={() => setWizardStep(tab.s)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    wizardStep === tab.s
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Wizard Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* STEP 1: KATEGÓRIA & NÉV */}
              {wizardStep === 1 && (
                <div className="max-w-2xl mx-auto space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                      Melyik kategóriába tartozik ez a sablon? *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setTplCategoryId(cat.id)}
                          className={`p-3 rounded-xl border text-left transition ${
                            tplCategoryId === cat.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="text-sm font-bold">{cat.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {cat.categoryType === 'main_structure'
                              ? 'Fő szerkezet'
                              : 'Kiegészítő / Extra'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                      Sablon megnevezése *
                    </label>
                    <input
                      type="text"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="pl. 1. Sablon - Prémium Bioklimatikus Pergola / Kazettás Napellenző..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                      Rövid alcím / Műszaki összefoglaló (Szövegdoboz a cím alatt)
                    </label>
                    <input
                      type="text"
                      value={tplSubtitle}
                      onChange={(e) => setTplSubtitle(e.target.value)}
                      placeholder="pl. Extrudált alumínium vázszerkezet, motoros vezérléssel, 10 év garanciával"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: TERMÉKEK, ANYAGOK ÉS ÁRAZÁSI MÓDOK */}
              {wizardStep === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left list of materials/products in this template */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">
                        Sablon Termékei & Anyagai ({tplMaterials.length} db)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddMaterial}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Új Termék / Anyag
                      </button>
                    </div>

                    <div className="space-y-2">
                      {tplMaterials.map((mat, idx) => {
                        const isSel = idx === activeMaterialIdx;
                        const modeInfo = PRICING_MODE_OPTIONS.find(
                          (pm) => pm.id === mat.pricingMode
                        );
                        const calcRow = previewCalc.rows[idx];
                        return (
                          <div
                            key={mat.id}
                            onClick={() => setActiveMaterialIdx(idx)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                              isSel
                                ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {idx + 1}. {mat.name || 'Névtelen termék / anyag'}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[11px] font-semibold">
                                  {modeInfo?.shortLabel || mat.pricingMode}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    mat.itemRole === 'base'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : mat.itemRole === 'optional'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {mat.itemRole === 'base'
                                    ? 'Alaptétel'
                                    : mat.itemRole === 'optional'
                                    ? 'Opcionális'
                                    : 'Ajándék'}
                                </span>
                                {calcRow && (
                                  <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 text-[11px] font-extrabold">
                                    {mat.itemRole === 'gift'
                                      ? `0 EUR (Lista: ${formatDotNumber(
                                          calcRow.listPriceEur
                                        )} EUR)`
                                      : `${formatDotNumber(
                                          calcRow.discountPriceEur
                                        )} EUR`}
                                  </span>
                                )}
                                {mat.photos?.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[11px] font-semibold">
                                    📷 {mat.photos.length} fotó
                                  </span>
                                )}
                              </div>
                            </div>
                            {tplMaterials.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMaterial(idx);
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Template Total Summary Box in Step 2 */}
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
                      <div className="text-[11px] font-bold uppercase text-emerald-400">
                        🧮 Sablon Összesített Algoritmus Ár ({testWidthCm}×{testProjCm} cm):
                      </div>
                      <div className="text-base font-extrabold">
                        {formatDotNumber(previewCalc.totalBaseEur)} EUR{' '}
                        <span className="text-xs font-semibold text-slate-300">
                          ({formatDotNumber(previewCalc.totalBaseHuf)} Ft)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right detail editor for selected product/material */}
                  <div className="lg:col-span-8">
                    {currentMaterial ? (
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-5">
                        {/* LIVE ALGORITHM CALCULATION BANNER FOR CURRENT PRODUCT */}
                        {previewCalc.rows[activeMaterialIdx] && (
                          <div className="bg-emerald-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div>
                              <div className="text-[11px] font-bold uppercase text-emerald-300">
                                🔒 Kötelező Algoritmus Árkalkuláció ({testWidthCm}×{testProjCm}×{testHeightCm} cm példa méretnél)
                              </div>
                              <div className="text-xs text-emerald-100 mt-0.5 font-medium">
                                {previewCalc.rows[activeMaterialIdx].formulaSummary}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[11px] text-emerald-200">
                                Listaár:{' '}
                                <span className="font-bold line-through">
                                  {formatDotNumber(
                                    previewCalc.rows[activeMaterialIdx].listPriceEur
                                  )}{' '}
                                  EUR
                                </span>
                              </div>
                              <div className="text-base font-extrabold text-emerald-300">
                                Kedvezményes ár:{' '}
                                {formatDotNumber(
                                  previewCalc.rows[activeMaterialIdx].discountPriceEur
                                )}{' '}
                                EUR
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                              Termék / Anyag / Tétel neve *
                            </label>
                            <input
                              type="text"
                              value={currentMaterial.name}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="pl. Alapszerkezet, Somfy motor, Napellenző ponyva, Szerelés..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                              Műszaki leírás / Anyag megjegyzés
                            </label>
                            <input
                              type="text"
                              value={currentMaterial.description}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="pl. RAL 7016 antracit, UV-álló akril szövet..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                            />
                          </div>
                        </div>

                        {/* Item Role & Currency */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                              Tétel szerepe a PDF-ben
                            </label>
                            <select
                              value={currentMaterial.itemRole}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  itemRole: e.target.value as any,
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                            >
                              <option value="base">
                                Alaptétel (fő összesítésben)
                              </option>
                              <option value="optional">
                                Opcionális tétel (+ Opcióként)
                              </option>
                              <option value="gift">
                                Ajándék tétel (0 EUR kedvezményes ár)
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                              Pénznem
                            </label>
                            <select
                              value={currentMaterial.currency}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  currency: e.target.value as any,
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                            >
                              <option value="EUR">EUR (€)</option>
                              <option value="HUF">HUF (Ft)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                              Opcionális felirat az ár mellett (ha üres, nincs)
                            </label>
                            <input
                              type="text"
                              value={currentMaterial.defaultNote}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  defaultNote: e.target.value,
                                })
                              }
                              placeholder="pl. üresen hagyható, vagy Ajándék / -20%"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                            />
                          </div>
                        </div>

                        {/* Pricing Mode Selector */}
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                            Kötelező Árazási Algoritmus kiválasztása (az ár mindig ebből számolódik)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PRICING_MODE_OPTIONS.map((pm) => {
                              const hasOtherNonPctBase = tplMaterials.some(
                                (m, i) =>
                                  i !== activeMaterialIdx &&
                                  m.pricingMode !== 'percentage' &&
                                  m.itemRole === 'base'
                              );
                              const isPctBlocked =
                                pm.id === 'percentage' && !hasOtherNonPctBase;

                              return (
                                <button
                                  key={pm.id}
                                  type="button"
                                  disabled={isPctBlocked}
                                  onClick={() => {
                                    if (isPctBlocked) return;
                                    updateMaterial(activeMaterialIdx, {
                                      pricingMode: pm.id as ProductPricingMode,
                                      basePrice:
                                        Math.max(
                                          1,
                                          Number(currentMaterial.basePrice) ||
                                            1500
                                        ),
                                      unitPrice:
                                        Math.max(
                                          1,
                                          Number(currentMaterial.unitPrice) ||
                                            350
                                        ),
                                    });
                                  }}
                                  className={`p-3 rounded-xl border text-left transition ${
                                    currentMaterial.pricingMode === pm.id
                                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                                      : isPctBlocked
                                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="text-xs font-bold">
                                    {pm.label}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {isPctBlocked
                                      ? 'Csak 2. tételként választható (pl. szerelés), ha már van fő alaptétel!'
                                      : pm.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dimension Source selector for m² and fm modes */}
                        {['per_m2', 'tiered_m2', 'base_plus_m2', 'per_lm', 'base_plus_lm'].includes(
                          currentMaterial.pricingMode
                        ) && (
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                              Melyik méretből számolja az algoritmus?
                            </label>
                            <select
                              value={currentMaterial.dimensionSource}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  dimensionSource: e.target
                                    .value as DimensionSource,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                            >
                              {DIMENSION_SOURCE_OPTIONS.map((ds) => (
                                <option key={ds.id} value={ds.id}>
                                  {ds.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Mode-specific inputs */}
                        {currentMaterial.pricingMode === 'fixed' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Fix Egységár ({currentMaterial.currency}) *
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.basePrice}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    basePrice: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Alapértelmezett mennyiség
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.defaultQuantity}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    defaultQuantity: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Mennyiségi egység
                              </label>
                              <input
                                type="text"
                                value={currentMaterial.unitLabel}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    unitLabel: e.target.value,
                                  })
                                }
                                placeholder="db / szett"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {(currentMaterial.pricingMode === 'per_m2' ||
                          currentMaterial.pricingMode === 'per_lm') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                {currentMaterial.pricingMode === 'per_m2'
                                  ? `Négyzetméter ár (${currentMaterial.currency} / m²) *`
                                  : `Folyóméter ár (${currentMaterial.currency} / fm) *`}
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.unitPrice}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    unitPrice: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Darabszám szorzó (pl. 1 db)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.defaultQuantity}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    defaultQuantity: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {(currentMaterial.pricingMode === 'base_plus_m2' ||
                          currentMaterial.pricingMode === 'base_plus_lm') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Fix Induló Alapár ({currentMaterial.currency}) *
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.basePrice}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    basePrice: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                {currentMaterial.pricingMode === 'base_plus_m2'
                                  ? `+ Négyzetméter díj (${currentMaterial.currency} / m²) *`
                                  : `+ Folyóméter díj (${currentMaterial.currency} / fm) *`}
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.unitPrice}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    unitPrice: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                              />
                            </div>
                          </div>
                        )}

                        {currentMaterial.pricingMode === 'tiered_m2' && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                Sávos m² ártábla ({currentMaterial.currency} / m²)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const tiers: M2PriceTier[] = [
                                    ...(currentMaterial.m2Tiers || []),
                                    { maxM2: 50, pricePerM2: 300 },
                                  ];
                                  updateMaterial(activeMaterialIdx, {
                                    m2Tiers: tiers,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200"
                              >
                                + Új m² sáv
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(currentMaterial.m2Tiers || []).map(
                                (tier, tIdx) => (
                                  <div
                                    key={tIdx}
                                    className="flex items-center gap-3"
                                  >
                                    <div className="flex-1">
                                      <label className="block text-[11px] text-slate-500">
                                        Max felület (m²-ig)
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        step="0.5"
                                        value={tier.maxM2}
                                        onChange={(e) => {
                                          const next = [
                                            ...(currentMaterial.m2Tiers || []),
                                          ];
                                          next[tIdx] = {
                                            ...next[tIdx],
                                            maxM2: Math.max(
                                              1,
                                              Number(e.target.value) || 1
                                            ),
                                          };
                                          updateMaterial(activeMaterialIdx, {
                                            m2Tiers: next,
                                          });
                                        }}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[11px] text-slate-500">
                                        Egységár ({currentMaterial.currency}/m²) *
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        step="0.5"
                                        value={tier.pricePerM2}
                                        onChange={(e) => {
                                          const next = [
                                            ...(currentMaterial.m2Tiers || []),
                                          ];
                                          next[tIdx] = {
                                            ...next[tIdx],
                                            pricePerM2: Math.max(
                                              1,
                                              Number(e.target.value) || 1
                                            ),
                                          };
                                          updateMaterial(activeMaterialIdx, {
                                            m2Tiers: next,
                                          });
                                        }}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold"
                                      />
                                    </div>
                                    {(currentMaterial.m2Tiers || []).length >
                                      1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = (
                                            currentMaterial.m2Tiers || []
                                          ).filter((_, i) => i !== tIdx);
                                          updateMaterial(activeMaterialIdx, {
                                            m2Tiers: next,
                                          });
                                        }}
                                        className="mt-4 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {currentMaterial.pricingMode === 'matrix_cm' && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="text-xs font-bold text-slate-800">
                              Egyedi Mérettábla / Mátrix (Szélesség cm × Kinyúlás/Magasság cm)
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                value={newMatrixRowInput}
                                onChange={(e) =>
                                  setNewMatrixRowInput(e.target.value)
                                }
                                placeholder="Új sor (Kinyúlás cm, pl. 450)"
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Number(newMatrixRowInput);
                                  if (!val || val <= 0) return;
                                  const mt: CustomMatrixTable =
                                    currentMaterial.matrixTable || {
                                      rowLabel: 'Kinyúlás (cm)',
                                      colLabel: 'Szélesség (cm)',
                                      rows: [300],
                                      cols: [400],
                                      values: {},
                                    };
                                  if (!mt.rows.includes(val)) {
                                    const nextRows = [...mt.rows, val].sort(
                                      (a, b) => a - b
                                    );
                                    updateMaterial(activeMaterialIdx, {
                                      matrixTable: { ...mt, rows: nextRows },
                                    });
                                  }
                                  setNewMatrixRowInput('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                              >
                                + Sor (Kinyúlás cm)
                              </button>

                              <input
                                type="number"
                                value={newMatrixColInput}
                                onChange={(e) =>
                                  setNewMatrixColInput(e.target.value)
                                }
                                placeholder="Új oszlop (Szélesség cm, pl. 700)"
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Number(newMatrixColInput);
                                  if (!val || val <= 0) return;
                                  const mt: CustomMatrixTable =
                                    currentMaterial.matrixTable || {
                                      rowLabel: 'Kinyúlás (cm)',
                                      colLabel: 'Szélesség (cm)',
                                      rows: [300],
                                      cols: [400],
                                      values: {},
                                    };
                                  if (!mt.cols.includes(val)) {
                                    const nextCols = [...mt.cols, val].sort(
                                      (a, b) => a - b
                                    );
                                    updateMaterial(activeMaterialIdx, {
                                      matrixTable: { ...mt, cols: nextCols },
                                    });
                                  }
                                  setNewMatrixColInput('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                              >
                                + Oszlop (Szélesség cm)
                              </button>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100">
                                    <th className="border border-slate-300 p-2 text-left">
                                      Kinyúlás \ Szélesség
                                    </th>
                                    {(
                                      currentMaterial.matrixTable?.cols || []
                                    ).map((c) => (
                                      <th
                                        key={c}
                                        className="border border-slate-300 p-2 text-center"
                                      >
                                        <div className="flex items-center justify-center gap-1">
                                          <span>{c} cm</span>
                                          {(currentMaterial.matrixTable?.cols
                                            .length || 0) > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const mt =
                                                  currentMaterial.matrixTable!;
                                                updateMaterial(
                                                  activeMaterialIdx,
                                                  {
                                                    matrixTable: {
                                                      ...mt,
                                                      cols: mt.cols.filter(
                                                        (x) => x !== c
                                                      ),
                                                    },
                                                  }
                                                );
                                              }}
                                              className="text-rose-500 hover:text-rose-700"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(
                                    currentMaterial.matrixTable?.rows || []
                                  ).map((r) => (
                                    <tr key={r}>
                                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">
                                        <div className="flex items-center justify-between">
                                          <span>{r} cm</span>
                                          {(currentMaterial.matrixTable?.rows
                                            .length || 0) > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const mt =
                                                  currentMaterial.matrixTable!;
                                                updateMaterial(
                                                  activeMaterialIdx,
                                                  {
                                                    matrixTable: {
                                                      ...mt,
                                                      rows: mt.rows.filter(
                                                        (x) => x !== r
                                                      ),
                                                    },
                                                  }
                                                );
                                              }}
                                              className="text-rose-500 hover:text-rose-700"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      {(
                                        currentMaterial.matrixTable?.cols || []
                                      ).map((c) => {
                                        const cellVal =
                                          currentMaterial.matrixTable?.values?.[
                                            String(r)
                                          ]?.[String(c)] ?? 2500;
                                        return (
                                          <td
                                            key={c}
                                            className="border border-slate-300 p-1"
                                          >
                                            <input
                                              type="number"
                                              min={1}
                                              value={cellVal}
                                              onChange={(e) => {
                                                const mt =
                                                  currentMaterial.matrixTable!;
                                                const nextValues = {
                                                  ...(mt.values || {}),
                                                  [String(r)]: {
                                                    ...(mt.values?.[
                                                      String(r)
                                                    ] || {}),
                                                    [String(c)]: Math.max(
                                                      1,
                                                      Number(e.target.value) ||
                                                        1
                                                    ),
                                                  },
                                                };
                                                updateMaterial(
                                                  activeMaterialIdx,
                                                  {
                                                    matrixTable: {
                                                      ...mt,
                                                      values: nextValues,
                                                    },
                                                  }
                                                );
                                              }}
                                              className="w-20 px-1.5 py-1 rounded border border-slate-200 text-right font-semibold"
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {currentMaterial.pricingMode === 'percentage' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Százalékos kulcs (% az alaptételek összegéből) *
                              </label>
                              <input
                                type="number"
                                min={1}
                                step="0.5"
                                value={currentMaterial.percentageRate}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    percentageRate: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Minimum díj ({currentMaterial.currency}) *
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={currentMaterial.minPrice}
                                onChange={(e) =>
                                  updateMaterial(activeMaterialIdx, {
                                    minPrice: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {/* Multipliers & Surcharges */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Árszorzó (pl. 1.0 vagy 0.66)
                            </label>
                            <input
                              type="number"
                              min={0.05}
                              step="0.01"
                              value={currentMaterial.multiplier}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  multiplier: Math.max(
                                    0.05,
                                    Number(e.target.value) || 1
                                  ),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Extra kedvezmény (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={90}
                              value={currentMaterial.extraDiscountPct}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  extraDiscountPct: Math.min(
                                    90,
                                    Math.max(0, Number(e.target.value) || 0)
                                  ),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Fix felár (+ {currentMaterial.currency})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={currentMaterial.fixedSurcharge}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  fixedSurcharge: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Listaár szorzó (pl. 1.25)
                            </label>
                            <input
                              type="number"
                              min={1}
                              step="0.05"
                              value={currentMaterial.listPriceMultiplier}
                              onChange={(e) =>
                                updateMaterial(activeMaterialIdx, {
                                  listPriceMultiplier: Math.max(
                                    1,
                                    Number(e.target.value) || 1.25
                                  ),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm"
                            />
                          </div>
                        </div>

                        {/* Product-Specific Photos & Captions below Photo */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                Ehhez a termékhez csatolt fotók és fotó alatti szövegdobozok
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Felcsatolhatsz fotót közvetlenül ehhez a termékhez, és a fotó alá külön szöveget írhatsz!
                              </div>
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              {uploadingPhoto
                                ? 'Feltöltés...'
                                : '+ Fotó feltöltése a termékhez'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setUploadingPhoto(true);
                                  try {
                                    const url = await onUploadImage(file);
                                    if (url) {
                                      const nextPhotos: PhotoCaptionBlock[] = [
                                        ...(currentMaterial.photos || []),
                                        {
                                          id: `mphoto_${Date.now()}`,
                                          imageUrl: url,
                                          titleAbove: currentMaterial.name,
                                          captionBelow: '',
                                          widthPct: 70,
                                          align: 'center',
                                        },
                                      ];
                                      updateMaterial(activeMaterialIdx, {
                                        photos: nextPhotos,
                                      });
                                    }
                                  } finally {
                                    setUploadingPhoto(false);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {(currentMaterial.photos || []).map((ph, pIdx) => (
                            <div
                              key={ph.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-3"
                            >
                              {ph.imageUrl && (
                                <img
                                  src={ph.imageUrl}
                                  alt=""
                                  className="w-28 h-24 object-cover rounded-lg border border-slate-200 shrink-0"
                                />
                              )}
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={ph.titleAbove || ''}
                                  onChange={(e) => {
                                    const next = [
                                      ...(currentMaterial.photos || []),
                                    ];
                                    next[pIdx] = {
                                      ...next[pIdx],
                                      titleAbove: e.target.value,
                                    };
                                    updateMaterial(activeMaterialIdx, {
                                      photos: next,
                                    });
                                  }}
                                  placeholder="Fotó feletti cím (opcionális)"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                                />
                                <textarea
                                  rows={2}
                                  value={ph.captionBelow}
                                  onChange={(e) => {
                                    const next = [
                                      ...(currentMaterial.photos || []),
                                    ];
                                    next[pIdx] = {
                                      ...next[pIdx],
                                      captionBelow: e.target.value,
                                    };
                                    updateMaterial(activeMaterialIdx, {
                                      photos: next,
                                    });
                                  }}
                                  placeholder="Szövegdoboz a fotó alá: írd ide a termék/anyag részletes leírását..."
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (
                                    currentMaterial.photos || []
                                  ).filter((_, i) => i !== pIdx);
                                  updateMaterial(activeMaterialIdx, {
                                    photos: next,
                                  });
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg self-start"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* STEP 3: SABLON FOTÓK ÉS KÉPALÁÍRÁS SZÖVEGDOBOZOK */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Sablon Fotók és Fotó alatti Szövegdobozok ({tplPhotos.length} db)
                      </h3>
                      <p className="text-xs text-slate-600">
                        Tölts fel tetszőleges számú referenciafotót vagy műszaki
                        képet a sablonhoz, és írj szöveget közvetlenül a fotók
                        alatti szövegdobozba!
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-sm">
                        <Upload className="w-4 h-4" />
                        {uploadingPhoto
                          ? 'Feltöltés...'
                          : '+ Új Fotó Feltöltése a gépről'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingPhoto(true);
                            try {
                              const url = await onUploadImage(file);
                              if (url) {
                                setTplPhotos((prev) => [
                                  ...prev,
                                  {
                                    id: `sphoto_${Date.now()}`,
                                    imageUrl: url,
                                    titleAbove: '',
                                    captionBelow: '',
                                    widthPct: 75,
                                    align: 'center',
                                  },
                                ]);
                              }
                            } finally {
                              setUploadingPhoto(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Media Library quick picker if user already uploaded images */}
                  {mediaLibrary.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-700 mb-2">
                        Korábban feltöltött képek (kattints a hozzáadáshoz):
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {mediaLibrary.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setTplPhotos((prev) => [
                                ...prev,
                                {
                                  id: `sphoto_${Date.now()}_${Math.random()
                                    .toString(36)
                                    .slice(2, 5)}`,
                                  imageUrl: m.url,
                                  titleAbove: '',
                                  captionBelow: '',
                                  widthPct: 75,
                                  align: 'center',
                                },
                              ])
                            }
                            className="group relative w-20 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 shrink-0"
                          >
                            <img
                              src={m.url}
                              alt={m.originalName}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tplPhotos.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
                      Még nincs fotó csatolva ehhez a sablonhoz. Kattints a „+
                      Új Fotó Feltöltése” gombra!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tplPhotos.map((ph, idx) => (
                        <div
                          key={ph.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row gap-4 shadow-sm"
                        >
                          <div className="w-full md:w-56 shrink-0">
                            <img
                              src={ph.imageUrl}
                              alt=""
                              className="w-full h-36 object-cover rounded-xl border border-slate-200"
                            />
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                              <span>Méret a PDF-ben: {ph.widthPct || 75}%</span>
                              <input
                                type="range"
                                min={35}
                                max={100}
                                value={ph.widthPct || 75}
                                onChange={(e) => {
                                  const next = [...tplPhotos];
                                  next[idx] = {
                                    ...next[idx],
                                    widthPct: Number(e.target.value),
                                  };
                                  setTplPhotos(next);
                                }}
                                className="w-24"
                              />
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                {idx + 1}. Fotó feletti cím / kiemelés (opcionális szövegdoboz)
                              </label>
                              <input
                                type="text"
                                value={ph.titleAbove || ''}
                                onChange={(e) => {
                                  const next = [...tplPhotos];
                                  next[idx] = {
                                    ...next[idx],
                                    titleAbove: e.target.value,
                                  };
                                  setTplPhotos(next);
                                }}
                                placeholder="pl. Prémium kivitel és rejtett vízelvezetés"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                {idx + 1}. Fotó alatti szövegdoboz (Képaláírás / Műszaki leírás)
                              </label>
                              <textarea
                                rows={3}
                                value={ph.captionBelow}
                                onChange={(e) => {
                                  const next = [...tplPhotos];
                                  next[idx] = {
                                    ...next[idx],
                                    captionBelow: e.target.value,
                                  };
                                  setTplPhotos(next);
                                }}
                                placeholder="Írd ide a fotó alatt megjelenő szöveget..."
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setTplPhotos((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 self-start"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: SZÖVEGDOBOZOK ÉS NÉV-AUTOMATIZÁCIÓ */}
              {wizardStep === 4 && (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="text-xs font-bold text-emerald-950 mb-1.5">
                      Automatikus Név- és Méret-behelyettesítő Változók:
                    </div>
                    <p className="text-xs text-emerald-800 mb-2">
                      Bármelyik szövegdobozba beírhatod az alábbi címkéket, és az
                      árajánlat készítésekor a rendszer automatikusan
                      behelyettesíti az ügyfél nevét, a méreteket és a
                      települést:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_VARIABLES_HELP.map((v) => (
                        <span
                          key={v.token}
                          className="px-2 py-1 rounded-lg bg-white text-emerald-900 border border-emerald-300 text-xs font-mono font-semibold"
                          title={v.label}
                        >
                          {v.token} – {v.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Sablon Bevezető Szövegdoboza (a fotók és a táblázat előtt)
                    </label>
                    <textarea
                      rows={3}
                      value={tplIntroText}
                      onChange={(e) => setTplIntroText(e.target.value)}
                      placeholder="pl. A(z) {{meret_m}} ({{meret}}) méretű szerkezetet {{beepites}} kivitelben ajánljuk..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  {/* Standalone Custom Text Blocks */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Különálló Szövegrészek / Szövegdobozok ({tplTextBlocks.length} db)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Ide bármennyi külön szövegdobozt felvehetsz, ahová csak
                          szöveget írsz (pl. műszaki leírás, garancia, színek).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTplTextBlocks((prev) => [
                            ...prev,
                            {
                              id: `tb_${Date.now()}`,
                              title: '',
                              content: '',
                              position: 'after_table',
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Új Külön Szövegdoboz
                      </button>
                    </div>

                    {tplTextBlocks.map((tb, idx) => (
                      <div
                        key={tb.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={tb.title || ''}
                            onChange={(e) => {
                              const next = [...tplTextBlocks];
                              next[idx] = {
                                ...next[idx],
                                title: e.target.value,
                              };
                              setTplTextBlocks(next);
                            }}
                            placeholder="Szövegdoboz címe (opcionális)"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                          />
                          <select
                            value={tb.position}
                            onChange={(e) => {
                              const next = [...tplTextBlocks];
                              next[idx] = {
                                ...next[idx],
                                position: e.target.value as any,
                              };
                              setTplTextBlocks(next);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                          >
                            <option value="before_photos">Fotók előtt</option>
                            <option value="before_table">Táblázat előtt</option>
                            <option value="after_table">Táblázat után</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setTplTextBlocks((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={tb.content}
                          onChange={(e) => {
                            const next = [...tplTextBlocks];
                            next[idx] = {
                              ...next[idx],
                              content: e.target.value,
                            };
                            setTplTextBlocks(next);
                          }}
                          placeholder="Írd ide a szabad szöveget..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Sablon Záró Szövegdoboza (az ártáblázat alatt)
                    </label>
                    <textarea
                      rows={3}
                      value={tplClosingText}
                      onChange={(e) => setTplClosingText(e.target.value)}
                      placeholder="pl. A tartószerkezetek RAL alapszínei felár nélkül választhatóak..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: ÉLŐ TESZT & MENTÉS */}
              {wizardStep === 5 && (
                <div className="space-y-5">
                  <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-emerald-400 uppercase">
                        ÉLŐ SABLON KALKULÁCIÓS PRÓBA
                      </div>
                      <h3 className="text-base font-bold mt-0.5">
                        Nézd meg, hogyan számol a sablon különböző méretekkel és ügyfélnévvel!
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300">
                          Teszt Ügyfélnév
                        </label>
                        <input
                          type="text"
                          value={testCustomerName}
                          onChange={(e) => setTestCustomerName(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold w-36"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300">
                          Szélesség (cm)
                        </label>
                        <input
                          type="number"
                          value={testWidthCm}
                          onChange={(e) =>
                            setTestWidthCm(Number(e.target.value))
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold w-24"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300">
                          Kinyúlás (cm)
                        </label>
                        <input
                          type="number"
                          value={testProjCm}
                          onChange={(e) =>
                            setTestProjCm(Number(e.target.value))
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold w-24"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300">
                          Magasság (cm)
                        </label>
                        <input
                          type="number"
                          value={testHeightCm}
                          onChange={(e) =>
                            setTestHeightCm(Number(e.target.value))
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold w-24"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
                    <div className="text-sm font-bold text-slate-900">
                      {replaceTemplateVariables(
                        `Kedves {{megszolitas}}! — ${
                          tplName || 'Új Sablon'
                        } ({{meret_m}} / {{meret}})`,
                        {
                          customerName: testCustomerName,
                          greetingName: testCustomerName,
                          widthCm: testWidthCm,
                          projectionCm: testProjCm,
                          heightCm: testHeightCm,
                        }
                      )}
                    </div>
                    {tplIntroText && (
                      <p className="text-xs text-slate-600 whitespace-pre-line">
                        {replaceTemplateVariables(tplIntroText, {
                          customerName: testCustomerName,
                          greetingName: testCustomerName,
                          widthCm: testWidthCm,
                          projectionCm: testProjCm,
                          heightCm: testHeightCm,
                        })}
                      </p>
                    )}

                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="border border-slate-300 p-2 text-left">
                            Megnevezés / Anyag
                          </th>
                          <th className="border border-slate-300 p-2 text-left">
                            Mennyiség / Méret
                          </th>
                          <th className="border border-slate-300 p-2 text-right">
                            Listaár (EUR)
                          </th>
                          <th className="border border-slate-300 p-2 text-right">
                            Kedvezményes (EUR)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewCalc.rows.map((r) => (
                          <tr key={r.id}>
                            <td className="border border-slate-200 p-2 font-medium">
                              {r.name}
                            </td>
                            <td className="border border-slate-200 p-2 text-slate-600">
                              {r.quantityLabel}
                            </td>
                            <td className="border border-slate-200 p-2 text-right text-slate-500">
                              {formatDotNumber(r.listPriceEur)} EUR
                            </td>
                            <td className="border border-slate-200 p-2 text-right font-bold text-slate-900">
                              {r.itemRole === 'gift'
                                ? '0 EUR (Ajándék)'
                                : r.itemRole === 'optional'
                                ? `+ ${formatDotNumber(r.discountPriceEur)} EUR (Opció)`
                                : `${formatDotNumber(r.discountPriceEur)} EUR`}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-50 font-bold">
                          <td
                            colSpan={2}
                            className="border border-slate-300 p-2.5 text-emerald-950"
                          >
                            Alaptételek ÖSSZESEN:
                          </td>
                          <td className="border border-slate-300 p-2.5 text-right text-emerald-900">
                            {formatDotNumber(previewCalc.totalBaseEur)} EUR
                          </td>
                          <td className="border border-slate-300 p-2.5 text-right text-emerald-950">
                            {formatDotNumber(previewCalc.totalBaseHuf)} Ft
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  wizardStep > 1
                    ? setWizardStep((s) => (s - 1) as any)
                    : setWizardOpen(false)
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                {wizardStep > 1 ? 'Előző lépés' : 'Bezárás'}
              </button>

              <div className="flex items-center gap-3">
                {wizardStep < 5 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => (s + 1) as any)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                  >
                    Következő lépés
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={!tplName.trim() || !tplCategoryId || savingTemplate}
                  onClick={handleSaveTemplateFinal}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-sm font-bold shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {savingTemplate ? 'Mentés...' : 'Sablon Mentése'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
