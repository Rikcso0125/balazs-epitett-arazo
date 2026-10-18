'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Layers,
  Maximize2,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  DIMENSION_SOURCE_OPTIONS,
  formatDotNumber,
  MOUNT_TYPES,
  PRICING_MODE_OPTIONS,
} from '@/lib/constants';
import {
  buildEditableBlockFromTemplate,
  CalculationContext,
  createDefaultMaterialAlgorithm,
  recalculateBlockWithAlgorithms,
  roundHuf,
} from '@/lib/pricing-engine';
import {
  DimensionSource,
  MountType,
  PhotoCaptionBlock,
  ProductCategory,
  ProductPricingMode,
  QuoteDocumentBlock,
  QuoteRecord,
  QuoteTableRow,
  QuoteTemplate,
  SystemConfig,
  TemplateMaterialItem,
  UploadedMediaItem,
} from '@/lib/types';

interface PdfBlockEditorViewProps {
  config: SystemConfig;
  categories: ProductCategory[];
  templates: QuoteTemplate[];
  mediaLibrary: UploadedMediaItem[];
  initialQuote: Partial<QuoteRecord>;
  onUploadImage: (file: File) => Promise<string | null>;
  onSaveQuoteAndGeneratePdf: (
    quotePayload: Partial<QuoteRecord>,
    downloadAfterSave: boolean
  ) => Promise<QuoteRecord | null>;
  onBackToWizard?: () => void;
}

export function PdfBlockEditorView({
  config,
  templates,
  mediaLibrary,
  initialQuote,
  onUploadImage,
  onSaveQuoteAndGeneratePdf,
  onBackToWizard,
}: PdfBlockEditorViewProps) {
  const isExistingSavedQuote = Boolean(initialQuote.id);

  const [customerName, setCustomerName] = useState(
    initialQuote.customerName || 'Minta Ügyfél'
  );
  const [greetingName, setGreetingName] = useState(
    initialQuote.greetingName || initialQuote.customerName || 'Érdeklődő'
  );
  const [city, setCity] = useState(initialQuote.city || 'Budapest');
  const [email, setEmail] = useState(initialQuote.email || '');
  const [phone, setPhone] = useState(initialQuote.phone || '');
  const [widthCm, setWidthCm] = useState<number>(
    Number(initialQuote.widthCm || 600)
  );
  const [projectionCm, setProjectionCm] = useState<number>(
    Number(initialQuote.projectionCm || 400)
  );
  const [heightCm, setHeightCm] = useState<number>(
    Number(initialQuote.heightCm || 250)
  );
  const [mountType, setMountType] = useState<MountType>(
    initialQuote.mountType || 'Épülethez rögzített'
  );
  const [eurHufRate, setEurHufRate] = useState<number>(
    Number(initialQuote.eurHufRate || config.defaultEurHufRate || 400)
  );
  const [deliveryFeeHuf, setDeliveryFeeHuf] = useState<number>(
    Number(initialQuote.deliveryFeeHuf ?? config.defaultDeliveryFeeHuf ?? 40000)
  );

  const calcCtx: CalculationContext = {
    widthCm,
    projectionCm,
    heightCm,
    mountType,
    eurHufRate,
  };

  const [blocks, setBlocks] = useState<QuoteDocumentBlock[]>(() => {
    const initCtx: CalculationContext = {
      widthCm: Number(initialQuote.widthCm || 600),
      projectionCm: Number(initialQuote.projectionCm || 400),
      heightCm: Number(initialQuote.heightCm || 250),
      mountType: initialQuote.mountType || 'Épülethez rögzített',
      eurHufRate: Number(
        initialQuote.eurHufRate || config.defaultEurHufRate || 400
      ),
    };
    if (Array.isArray(initialQuote.blocks) && initialQuote.blocks.length > 0) {
      const cloned: QuoteDocumentBlock[] = JSON.parse(
        JSON.stringify(initialQuote.blocks)
      );
      return cloned.map((b) =>
        b.type === 'template_section'
          ? recalculateBlockWithAlgorithms(b, initCtx, templates)
          : b
      );
    }
    return [
      {
        id: `blk_intro_${Date.now()}`,
        type: 'text_box',
        title: `Kedves ${
          initialQuote.greetingName ||
          initialQuote.customerName ||
          'Érdeklődő'
        }!`,
        content:
          'Örömmel fogadtuk megkeresését! Kérésének megfelelően küldjük személyre szabott árajánlatunkat.',
        textStyle: 'greeting',
      },
    ];
  });

  const [templateToInsertId, setTemplateToInsertId] = useState<string>(
    templates[0]?.id || ''
  );

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [needsPreviewRefresh, setNeedsPreviewRefresh] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

  const updateBlock = (
    blockId: string,
    updater: (blk: QuoteDocumentBlock) => QuoteDocumentBlock
  ) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? updater(b) : b))
    );
    setNeedsPreviewRefresh(true);
  };

  const moveBlock = (idx: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
    setNeedsPreviewRefresh(true);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setNeedsPreviewRefresh(true);
  };

  // Update greeting name inside first greeting block automatically when user edits customer/greeting name
  const handleUpdateCustomerGreetingInBlocks = (
    newCustName: string,
    newGreetName: string
  ) => {
    setCustomerName(newCustName);
    setGreetingName(newGreetName);
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i === 0 && b.type === 'text_box' && b.textStyle === 'greeting') {
          return {
            ...b,
            title: `Kedves ${(newGreetName || newCustName || 'Érdeklődő').trim()}!`,
          };
        }
        return b;
      })
    );
    setNeedsPreviewRefresh(true);
  };

  // Add standalone text box block
  const handleAddStandaloneTextBox = (afterIndex?: number) => {
    const newBlock: QuoteDocumentBlock = {
      id: `blk_txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'text_box',
      title: 'Külön szövegrész / Megjegyzés',
      content: 'Írd ide a kívánt szöveget...',
      textStyle: 'normal',
      align: 'left',
    };
    setBlocks((prev) => {
      if (afterIndex === undefined) return [...prev, newBlock];
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, newBlock);
      return copy;
    });
    setNeedsPreviewRefresh(true);
  };

  // Add standalone photo + caption box block
  const handleAddStandalonePhotoBox = (afterIndex?: number) => {
    const newBlock: QuoteDocumentBlock = {
      id: `blk_photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'photo_box',
      photo: {
        id: `ph_${Date.now()}`,
        imageUrl: mediaLibrary[0]?.url || '',
        titleAbove: 'Látványterv / Műszaki fotó',
        captionBelow: 'Írd ide a fotó alatti szövegdoboz tartalmát...',
        widthPct: 75,
        align: 'center',
      },
    };
    setBlocks((prev) => {
      if (afterIndex === undefined) return [...prev, newBlock];
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, newBlock);
      return copy;
    });
    setNeedsPreviewRefresh(true);
  };

  // Insert existing saved template as a new block
  const handleInsertSavedTemplateBlock = () => {
    const tpl = templates.find((t) => t.id === templateToInsertId);
    if (!tpl) return;
    const sectionCount =
      blocks.filter((b) => b.type === 'template_section').length + 1;
    const newBlock = buildEditableBlockFromTemplate(
      tpl,
      sectionCount,
      {
        widthCm,
        projectionCm,
        heightCm,
        mountType,
        eurHufRate,
        customerName,
        greetingName,
        city,
        deliveryFeeHuf,
      },
      config
    );
    setBlocks((prev) => [...prev, newBlock]);
    setNeedsPreviewRefresh(true);
  };

  // Insert a brand-new blank custom template/product section directly in the editor
  const handleAddCustomBlankTemplateSection = () => {
    const sectionCount =
      blocks.filter((b) => b.type === 'template_section').length + 1;
    const defaultAlg = createDefaultMaterialAlgorithm({
      name: '1. Termék / Anyag megnevezése',
      description: 'Egyedi méretre gyártott kivitel',
      pricingMode: 'per_m2',
      unitPrice: 350,
    });
    const draftBlock: QuoteDocumentBlock = {
      id: `blk_custom_sec_${Date.now()}`,
      type: 'template_section',
      sectionTitle: `${sectionCount}. Egyedi Sablon / Termék Szekció (${widthCm}×${projectionCm} cm)`,
      sectionSubtitle: 'Egyedi műszaki tartalom és árkalkuláció',
      sectionIntroText: 'Írd ide a sablon bevezető szövegét...',
      sectionPhotos: [],
      tableTitle: 'Részletes Árkalkuláció',
      tableHeaders: [
        'Megnevezés / Anyag',
        'Mennyiség / Méret',
        'Listaár (EUR)',
        'Kedvezményes ár (EUR)',
      ],
      rows: [
        {
          id: `row_${Date.now()}`,
          materialId: defaultAlg.id,
          name: defaultAlg.name,
          description: defaultAlg.description,
          quantityLabel: '',
          listPriceEur: 0,
          discountPriceEur: 0,
          currency: 'EUR',
          itemRole: 'base',
          included: true,
          note: '',
          photos: [],
          algorithm: defaultAlg,
        },
      ],
      autoCalculateTotals: true,
      customTotalBaseEur: 0,
      customTotalBaseHuf: 0,
      sectionClosingText: '',
    };
    const calculatedBlock = recalculateBlockWithAlgorithms(
      draftBlock,
      calcCtx,
      templates
    );
    setBlocks((prev) => [...prev, calculatedBlock]);
    setNeedsPreviewRefresh(true);
  };

  // Add page break
  const handleAddPageBreak = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: `blk_brk_${Date.now()}`,
        type: 'page_break',
      },
    ]);
    setNeedsPreviewRefresh(true);
  };

  const refreshLivePdfPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/quotes/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteNumber: initialQuote.quoteNumber || 'ELŐNÉZET',
          customerName,
          greetingName,
          city,
          email,
          phone,
          widthCm,
          projectionCm,
          heightCm,
          mountType,
          eurHufRate,
          deliveryFeeHuf,
          blocks,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.pdfBase64) {
        const binStr = window.atob(data.pdfBase64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        setNeedsPreviewRefresh(false);
      }
    } catch (e) {
      console.error('Failed to generate PDF preview:', e);
    } finally {
      setPreviewLoading(false);
    }
  }, [
    initialQuote.quoteNumber,
    customerName,
    greetingName,
    city,
    email,
    phone,
    widthCm,
    projectionCm,
    heightCm,
    mountType,
    eurHufRate,
    deliveryFeeHuf,
    blocks,
  ]);

  useEffect(() => {
    refreshLivePdfPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAndDownload = async (downloadImmediately: boolean) => {
    setSavingPdf(true);
    try {
      const firstTpl = blocks.find((b) => b.type === 'template_section');
      const primaryTotalEur = Number(firstTpl?.customTotalBaseEur || 0);
      const primaryTotalHuf = Number(
        firstTpl?.customTotalBaseHuf || roundHuf(primaryTotalEur, eurHufRate)
      );

      const saved = await onSaveQuoteAndGeneratePdf(
        {
          ...initialQuote,
          customerName,
          greetingName,
          city,
          email,
          phone,
          widthCm,
          projectionCm,
          heightCm,
          mountType,
          eurHufRate,
          deliveryFeeHuf,
          blocks,
          primaryTotalEur,
          primaryTotalHuf,
          isEditedAfterGeneration: isExistingSavedQuote,
        },
        downloadImmediately
      );

      if (saved && downloadImmediately) {
        window.open(`/api/quotes/${saved.id}/pdf?download=1`, '_blank');
      }
      await refreshLivePdfPreview();
    } finally {
      setSavingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              3. LÉPÉS: BLOKKOS PDF ÉPÍTŐ & UTÓLAGOS SZERKESZTŐ
            </span>
            {isExistingSavedQuote && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                ✏️ Már legenerált PDF utólagos szerkesztése (
                {initialQuote.quoteNumber})
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold">
            Minden elemében szabadon átírható PDF Árajánlat Szerkesztő
          </h1>
          <p className="text-xs text-slate-300">
            Itt minden szövegdobozba belenyúlhatsz, bármelyik sablonhoz adhatsz
            új terméket, a termékhez csatolhatsz fotót, a fotó alá írhatsz
            szöveget, vagy beszúrhatsz külön szövegrészt — mentés előtt és
            utólag is!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onBackToWizard && (
            <button
              type="button"
              onClick={onBackToWizard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Vissza
            </button>
          )}

          <button
            type="button"
            onClick={refreshLivePdfPreview}
            disabled={previewLoading}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              needsPreviewRefresh
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`}
            />
            {previewLoading ? 'PDF Frissítése...' : 'PDF Előnézet Frissítése'}
          </button>

          <button
            type="button"
            disabled={savingPdf}
            onClick={() => handleSaveAndDownload(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            Mentés a listába
          </button>

          <button
            type="button"
            disabled={savingPdf}
            onClick={() => handleSaveAndDownload(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md"
          >
            <Download className="w-4 h-4" />
            {savingPdf
              ? 'Generálás...'
              : isExistingSavedQuote
              ? 'Szerkesztett PDF Mentése & Letöltése'
              : 'PDF Legenerálása & Letöltése'}
          </button>
        </div>
      </div>

      {/* Customer Name Automation & Dimensions Quick Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Ügyfél neve (Automatizáció)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) =>
                handleUpdateCustomerGreetingInBlocks(
                  e.target.value,
                  e.target.value
                )
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Megszólítás („Kedves ...!”)
            </label>
            <input
              type="text"
              value={greetingName}
              onChange={(e) =>
                handleUpdateCustomerGreetingInBlocks(
                  customerName,
                  e.target.value
                )
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Település
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setNeedsPreviewRefresh(true);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Szélesség × Kinyúlás (cm)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={50}
                value={widthCm}
                onChange={(e) => {
                  const nextW = Math.max(50, Number(e.target.value) || 100);
                  setWidthCm(nextW);
                  const nextCtx: CalculationContext = {
                    ...calcCtx,
                    widthCm: nextW,
                  };
                  setBlocks((prev) =>
                    prev.map((b) =>
                      b.type === 'template_section'
                        ? recalculateBlockWithAlgorithms(b, nextCtx, templates)
                        : b
                    )
                  );
                  setNeedsPreviewRefresh(true);
                }}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
              <span className="text-slate-400">×</span>
              <input
                type="number"
                min={50}
                value={projectionCm}
                onChange={(e) => {
                  const nextP = Math.max(50, Number(e.target.value) || 100);
                  setProjectionCm(nextP);
                  const nextCtx: CalculationContext = {
                    ...calcCtx,
                    projectionCm: nextP,
                  };
                  setBlocks((prev) =>
                    prev.map((b) =>
                      b.type === 'template_section'
                        ? recalculateBlockWithAlgorithms(b, nextCtx, templates)
                        : b
                    )
                  );
                  setNeedsPreviewRefresh(true);
                }}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Beépítés módja
            </label>
            <select
              value={mountType}
              onChange={(e) => {
                const nextMount = e.target.value as MountType;
                setMountType(nextMount);
                setNeedsPreviewRefresh(true);
              }}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs"
            >
              {MOUNT_TYPES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              EUR / HUF Árfolyam
            </label>
            <input
              type="number"
              min={1}
              value={eurHufRate}
              onChange={(e) => {
                const newRate = Math.max(1, Number(e.target.value) || 400);
                setEurHufRate(newRate);
                const nextCtx: CalculationContext = {
                  ...calcCtx,
                  eurHufRate: newRate,
                };
                setBlocks((prev) =>
                  prev.map((b) =>
                    b.type === 'template_section'
                      ? recalculateBlockWithAlgorithms(b, nextCtx, templates)
                      : b
                  )
                );
                setNeedsPreviewRefresh(true);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* Add Block Toolbar */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase text-emerald-950 mr-1">
            + Új elem beszúrása a PDF-be:
          </span>

          <button
            type="button"
            onClick={() => handleAddStandaloneTextBox()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-slate-800 border border-emerald-300 text-xs font-bold shadow-sm transition"
          >
            <Type className="w-3.5 h-3.5 text-emerald-600" />
            + Külön Szövegdoboz
          </button>

          <button
            type="button"
            onClick={() => handleAddStandalonePhotoBox()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-slate-800 border border-emerald-300 text-xs font-bold shadow-sm transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            + Fotó + Fotó alatti szövegdoboz
          </button>

          <button
            type="button"
            onClick={handleAddCustomBlankTemplateSection}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-slate-800 border border-emerald-300 text-xs font-bold shadow-sm transition"
          >
            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
            + Egyedi Sablon / Termék Szekció
          </button>

          <button
            type="button"
            onClick={handleAddPageBreak}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition"
          >
            <Scissors className="w-3.5 h-3.5 text-slate-500" />
            + Új A4 Oldaltörés
          </button>
        </div>

        {templates.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={templateToInsertId}
              onChange={(e) => setTemplateToInsertId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-semibold"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleInsertSavedTemplateBlock}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Mentett Sablon Felrakása
            </button>
          </div>
        )}
      </div>

      {/* Main Split Layout: Left = Editable Blocks, Right = Live PDF Viewer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Editable Document Blocks */}
        <div className="xl:col-span-7 space-y-4">
          {blocks.map((blk, bIdx) => (
            <div
              key={blk.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Block Top Bar */}
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[11px] font-bold">
                    #{bIdx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-700">
                    {blk.type === 'text_box'
                      ? '📝 Különálló Szövegdoboz Blokk'
                      : blk.type === 'photo_box'
                      ? '🖼️ Fotó + Fotó alatti Szövegdoboz Blokk'
                      : blk.type === 'template_section'
                      ? '📦 Sablon, Termékek, Fotók & Ártáblázat Blokk'
                      : '📄 Új A4 Oldaltörés'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveBlock(bIdx, -1)}
                    disabled={bIdx === 0}
                    title="Mozgatás fel"
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(bIdx, 1)}
                    disabled={bIdx === blocks.length - 1}
                    title="Mozgatás le"
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(blk.id)}
                    title="Blokk törlése a PDF-ből"
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* BLOCK TYPE 1: STANDALONE TEXT BOX */}
              {blk.type === 'text_box' && (
                <div className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Szövegdoboz címe / Megszólítás (ha üres, nem jelenik meg cím)
                      </label>
                      <input
                        type="text"
                        value={blk.title || ''}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            title: e.target.value,
                          }))
                        }
                        placeholder="pl. Kedves Kovács János! vagy Fontos információk"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Stílus a PDF-ben
                      </label>
                      <select
                        value={blk.textStyle || 'normal'}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            textStyle: e.target.value as any,
                          }))
                        }
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      >
                        <option value="greeting">Megszólítás / Bevezető</option>
                        <option value="normal">Normál szövegrész</option>
                        <option value="highlight">Kiemelt keretes szövegdoboz</option>
                        <option value="footer_info">Záró információs doboz</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Szövegdoboz tartalma (szabadon átírható, többsoros)
                    </label>
                    <textarea
                      rows={4}
                      value={blk.content || ''}
                      onChange={(e) =>
                        updateBlock(blk.id, (b) => ({
                          ...b,
                          content: e.target.value,
                        }))
                      }
                      placeholder="Írj ide bármilyen szöveget..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* BLOCK TYPE 2: STANDALONE PHOTO + CAPTION BOX */}
              {blk.type === 'photo_box' && blk.photo && (
                <div className="p-4 flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-52 shrink-0 space-y-2">
                    {blk.photo.imageUrl ? (
                      <img
                        src={blk.photo.imageUrl}
                        alt=""
                        className="w-full h-36 object-cover rounded-xl border border-slate-200"
                      />
                    ) : (
                      <div className="w-full h-36 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                        Nincs kép kiválasztva
                      </div>
                    )}
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImg ? 'Feltöltés...' : 'Fotó feltöltése / cseréje'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImg(true);
                          try {
                            const url = await onUploadImage(file);
                            if (url) {
                              updateBlock(blk.id, (b) => ({
                                ...b,
                                photo: { ...b.photo!, imageUrl: url },
                              }));
                            }
                          } finally {
                            setUploadingImg(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Fotó feletti szövegdoboz / Cím
                      </label>
                      <input
                        type="text"
                        value={blk.photo.titleAbove || ''}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            photo: { ...b.photo!, titleAbove: e.target.value },
                          }))
                        }
                        placeholder="Fotó feletti cím (opcionális)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Fotó alatti szövegdoboz (Képaláírás / Leírás a fotó alatt)
                      </label>
                      <textarea
                        rows={3}
                        value={blk.photo.captionBelow || ''}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            photo: {
                              ...b.photo!,
                              captionBelow: e.target.value,
                            },
                          }))
                        }
                        placeholder="Írd ide a fotó alatt megjelenő szöveget..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCK TYPE 3: TEMPLATE & PRODUCT SECTION */}
              {blk.type === 'template_section' && (
                <div className="p-4 sm:p-5 space-y-5">
                  {/* Section Title & Subtitle text boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Sablon Szekció Főcíme (Szövegdoboz)
                      </label>
                      <input
                        type="text"
                        value={blk.sectionTitle || ''}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            sectionTitle: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Sablon Alcíme (Szövegdoboz)
                      </label>
                      <input
                        type="text"
                        value={blk.sectionSubtitle || ''}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            sectionSubtitle: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>

                  {/* Intro Text Box */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Sablon Bevezető Szövegdoboza (szabadon szerkeszthető)
                    </label>
                    <textarea
                      rows={3}
                      value={blk.sectionIntroText || ''}
                      onChange={(e) =>
                        updateBlock(blk.id, (b) => ({
                          ...b,
                          sectionIntroText: e.target.value,
                        }))
                      }
                      placeholder="Írd ide a sablonhoz tartozó leíró szöveget..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed"
                    />
                  </div>

                  {/* Section Photos + Text Boxes under each photo */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        📷 Sablon Fotók & Fotó alatti szövegdobozok (
                        {blk.sectionPhotos?.length || 0} db)
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        + Fotó felcsatolása a sablonhoz
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImg(true);
                            try {
                              const url = await onUploadImage(file);
                              if (url) {
                                updateBlock(blk.id, (b) => ({
                                  ...b,
                                  sectionPhotos: [
                                    ...(b.sectionPhotos || []),
                                    {
                                      id: `sp_${Date.now()}`,
                                      imageUrl: url,
                                      titleAbove: '',
                                      captionBelow: '',
                                      widthPct: 75,
                                      align: 'center',
                                    },
                                  ],
                                }));
                              }
                            } finally {
                              setUploadingImg(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>

                    {(blk.sectionPhotos || []).map((ph, pIdx) => (
                      <div
                        key={ph.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3"
                      >
                        <div className="w-full sm:w-36 shrink-0 space-y-1.5">
                          {ph.imageUrl && (
                            <img
                              src={ph.imageUrl}
                              alt=""
                              className="w-full h-24 object-cover rounded-lg border border-slate-200"
                            />
                          )}
                          <label className="block text-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer">
                            Kép cseréje
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = await onUploadImage(file);
                                if (url) {
                                  updateBlock(blk.id, (b) => {
                                    const next = [...(b.sectionPhotos || [])];
                                    next[pIdx] = {
                                      ...next[pIdx],
                                      imageUrl: url,
                                    };
                                    return { ...b, sectionPhotos: next };
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={ph.titleAbove || ''}
                            onChange={(e) =>
                              updateBlock(blk.id, (b) => {
                                const next = [...(b.sectionPhotos || [])];
                                next[pIdx] = {
                                  ...next[pIdx],
                                  titleAbove: e.target.value,
                                };
                                return { ...b, sectionPhotos: next };
                              })
                            }
                            placeholder="Fotó feletti szövegdoboz / Cím (opcionális)"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                          />
                          <textarea
                            rows={2}
                            value={ph.captionBelow || ''}
                            onChange={(e) =>
                              updateBlock(blk.id, (b) => {
                                const next = [...(b.sectionPhotos || [])];
                                next[pIdx] = {
                                  ...next[pIdx],
                                  captionBelow: e.target.value,
                                };
                                return { ...b, sectionPhotos: next };
                              })
                            }
                            placeholder="Szövegdoboz a fotó alatt: írd ide a képaláírást vagy műszaki leírást..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateBlock(blk.id, (b) => ({
                              ...b,
                              sectionPhotos: (b.sectionPhotos || []).filter(
                                (_, i) => i !== pIdx
                              ),
                            }))
                          }
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg self-start"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Products / Materials Table & Product Photo Attachments */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <input
                        type="text"
                        value={blk.tableTitle || ''}
                        onChange={(e) =>
                          updateBlock(blk.id, (b) => ({
                            ...b,
                            tableTitle: e.target.value,
                          }))
                        }
                        placeholder="Táblázat címe..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateBlock(blk.id, (b) => {
                            const newAlg = createDefaultMaterialAlgorithm({
                              name: 'Új Termék / Anyag tétel',
                              description: 'Egyedi méretre gyártott kivitel',
                              pricingMode: 'per_m2',
                              unitPrice: 350,
                            });
                            const newRow: QuoteTableRow = {
                              id: `row_${Date.now()}_${Math.random()
                                .toString(36)
                                .slice(2, 5)}`,
                              materialId: newAlg.id,
                              name: newAlg.name,
                              description: newAlg.description,
                              quantityLabel: '',
                              listPriceEur: 0,
                              discountPriceEur: 0,
                              currency: 'EUR',
                              itemRole: 'base',
                              included: true,
                              note: '',
                              photos: [],
                              algorithm: newAlg,
                            };
                            const updated = {
                              ...b,
                              rows: [...(b.rows || []), newRow],
                            };
                            return recalculateBlockWithAlgorithms(
                              updated,
                              calcCtx,
                              templates
                            );
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Új Termék / Anyag felrakása a sablonhoz
                      </button>
                    </div>

                    {/* Editable Product Rows (Strictly Algorithm-Calculated Prices) */}
                    <div className="space-y-2.5">
                      {(blk.rows || []).map((row, rIdx) => {
                        const rowAlg: TemplateMaterialItem =
                          row.algorithm ||
                          createDefaultMaterialAlgorithm({
                            id: row.materialId || row.id,
                            name: row.name,
                            description: row.description || '',
                            pricingMode: 'per_m2',
                            unitPrice: 350,
                          });
                        const hasOtherNonPctBase = (blk.rows || []).some(
                          (other, oIdx) =>
                            oIdx !== rIdx &&
                            other.included &&
                            other.itemRole === 'base' &&
                            (other.algorithm?.pricingMode || 'per_m2') !==
                              'percentage'
                        );

                        const updateRowAlgorithm = (
                          algPatch: Partial<TemplateMaterialItem>
                        ) => {
                          updateBlock(blk.id, (b) => {
                            const nextRows = [...(b.rows || [])];
                            const currentAlg =
                              nextRows[rIdx].algorithm || rowAlg;
                            nextRows[rIdx] = {
                              ...nextRows[rIdx],
                              algorithm: {
                                ...currentAlg,
                                ...algPatch,
                              },
                            };
                            return recalculateBlockWithAlgorithms(
                              { ...b, rows: nextRows },
                              calcCtx,
                              templates
                            );
                          });
                        };

                        return (
                          <div
                            key={row.id}
                            className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                              row.included
                                ? 'bg-white border-slate-200 shadow-xs'
                                : 'bg-slate-50 border-slate-200 opacity-60'
                            }`}
                          >
                            {/* Top Row: Checkbox + Name + Read-Only Algorithm Calculated Badges */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              <div className="sm:col-span-5 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={row.included}
                                  onChange={(e) =>
                                    updateBlock(blk.id, (b) => {
                                      const nextRows = [...(b.rows || [])];
                                      nextRows[rIdx] = {
                                        ...nextRows[rIdx],
                                        included: e.target.checked,
                                      };
                                      return recalculateBlockWithAlgorithms(
                                        { ...b, rows: nextRows },
                                        calcCtx,
                                        templates
                                      );
                                    })
                                  }
                                  className="rounded text-emerald-600"
                                />
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) =>
                                    updateBlock(blk.id, (b) => {
                                      const nextRows = [...(b.rows || [])];
                                      nextRows[rIdx] = {
                                        ...nextRows[rIdx],
                                        name: e.target.value,
                                      };
                                      return { ...b, rows: nextRows };
                                    })
                                  }
                                  placeholder="Termék / Anyag megnevezése"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                                />
                              </div>

                              {/* Read-only Quantity/Size computed by algorithm */}
                              <div
                                className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 text-center select-none"
                                title="Algoritmus által számított méret / mennyiség"
                              >
                                {row.quantityLabel}
                              </div>

                              {/* Read-only List Price computed by algorithm */}
                              <div
                                className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 text-right line-through select-none"
                                title="Algoritmus által számított Listaár (EUR)"
                              >
                                {formatDotNumber(row.listPriceEur)} EUR
                              </div>

                              {/* Read-only Discount Price computed by algorithm */}
                              <div
                                className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-extrabold text-right select-none"
                                title="Algoritmus által számított Kedvezményes ár (EUR)"
                              >
                                {row.itemRole === 'gift'
                                  ? '0 EUR (Ajándék)'
                                  : `${formatDotNumber(row.discountPriceEur)} EUR`}
                              </div>

                              <div className="sm:col-span-1 flex justify-end">
                                {(blk.rows || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateBlock(blk.id, (b) => {
                                        const nextRows = (b.rows || []).filter(
                                          (_, i) => i !== rIdx
                                        );
                                        return recalculateBlockWithAlgorithms(
                                          { ...b, rows: nextRows },
                                          calcCtx,
                                          templates
                                        );
                                      })
                                    }
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Algorithm Configuration Bar for this Product Row */}
                            <div className="ml-6 p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-emerald-800">
                                  🧮 {row.formulaSummary || 'Algoritmus alapú árképzés'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  Az ár kizárólag az alábbi algoritmusból számolódik:
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                    Árazási Algoritmus
                                  </label>
                                  <select
                                    value={rowAlg.pricingMode}
                                    onChange={(e) => {
                                      const nextMode = e.target
                                        .value as ProductPricingMode;
                                      if (
                                        nextMode === 'percentage' &&
                                        !hasOtherNonPctBase
                                      ) {
                                        return;
                                      }
                                      updateRowAlgorithm({
                                        pricingMode: nextMode,
                                        basePrice: Math.max(
                                          1,
                                          Number(rowAlg.basePrice) || 1500
                                        ),
                                        unitPrice: Math.max(
                                          1,
                                          Number(rowAlg.unitPrice) || 350
                                        ),
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold"
                                  >
                                    {PRICING_MODE_OPTIONS.map((pm) => {
                                      const disabled =
                                        pm.id === 'percentage' &&
                                        !hasOtherNonPctBase;
                                      return (
                                        <option
                                          key={pm.id}
                                          value={pm.id}
                                          disabled={disabled}
                                        >
                                          {pm.shortLabel}
                                          {disabled
                                            ? ' (csak 2. tételként)'
                                            : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {[
                                  'per_m2',
                                  'tiered_m2',
                                  'base_plus_m2',
                                  'per_lm',
                                  'base_plus_lm',
                                ].includes(rowAlg.pricingMode) && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                      Méretforrás
                                    </label>
                                    <select
                                      value={rowAlg.dimensionSource || 'roof'}
                                      onChange={(e) =>
                                        updateRowAlgorithm({
                                          dimensionSource: e.target
                                            .value as DimensionSource,
                                        })
                                      }
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                                    >
                                      {DIMENSION_SOURCE_OPTIONS.map((ds) => (
                                        <option key={ds.id} value={ds.id}>
                                          {ds.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {(rowAlg.pricingMode === 'per_m2' ||
                                  rowAlg.pricingMode === 'per_lm') && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                      {rowAlg.pricingMode === 'per_m2'
                                        ? 'Egységár (EUR / m²)'
                                        : 'Egységár (EUR / fm)'}
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={rowAlg.unitPrice}
                                      onChange={(e) =>
                                        updateRowAlgorithm({
                                          unitPrice: Math.max(
                                            1,
                                            Number(e.target.value) || 1
                                          ),
                                        })
                                      }
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold"
                                    />
                                  </div>
                                )}

                                {rowAlg.pricingMode === 'fixed' && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                      Fix Egységár (EUR / db)
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={rowAlg.basePrice}
                                      onChange={(e) =>
                                        updateRowAlgorithm({
                                          basePrice: Math.max(
                                            1,
                                            Number(e.target.value) || 1
                                          ),
                                        })
                                      }
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold"
                                    />
                                  </div>
                                )}

                                {(rowAlg.pricingMode === 'base_plus_m2' ||
                                  rowAlg.pricingMode === 'base_plus_lm') && (
                                  <>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                        Alapár (EUR)
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={rowAlg.basePrice}
                                        onChange={(e) =>
                                          updateRowAlgorithm({
                                            basePrice: Math.max(
                                              1,
                                              Number(e.target.value) || 1
                                            ),
                                          })
                                        }
                                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                        + Egységár (EUR/{rowAlg.pricingMode === 'base_plus_m2' ? 'm²' : 'fm'})
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={rowAlg.unitPrice}
                                        onChange={(e) =>
                                          updateRowAlgorithm({
                                            unitPrice: Math.max(
                                              1,
                                              Number(e.target.value) || 1
                                            ),
                                          })
                                        }
                                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold"
                                      />
                                    </div>
                                  </>
                                )}

                                {rowAlg.pricingMode === 'percentage' && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                      Százalékos kulcs (%)
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={rowAlg.percentageRate}
                                      onChange={(e) =>
                                        updateRowAlgorithm({
                                          percentageRate: Math.max(
                                            1,
                                            Number(e.target.value) || 1
                                          ),
                                        })
                                      }
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold"
                                    />
                                  </div>
                                )}

                                {rowAlg.pricingMode !== 'percentage' &&
                                  rowAlg.pricingMode !== 'base_plus_m2' &&
                                  rowAlg.pricingMode !== 'base_plus_lm' && (
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                                        Darabszám szorzó (db)
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={rowAlg.defaultQuantity || 1}
                                        onChange={(e) =>
                                          updateRowAlgorithm({
                                            defaultQuantity: Math.max(
                                              1,
                                              Number(e.target.value) || 1
                                            ),
                                          })
                                        }
                                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                                      />
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Row extra controls: Description, Role, Note, and Attach Photo to Product */}
                            <div className="flex flex-wrap items-center gap-2 pl-6">
                              <input
                                type="text"
                                value={row.description || ''}
                                onChange={(e) =>
                                  updateBlock(blk.id, (b) => {
                                    const nextRows = [...(b.rows || [])];
                                    nextRows[rIdx] = {
                                      ...nextRows[rIdx],
                                      description: e.target.value,
                                    };
                                    return { ...b, rows: nextRows };
                                  })
                                }
                                placeholder="Kiegészítő termék-szövegdoboz / műszaki leírás..."
                                className="flex-1 min-w-[180px] px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]"
                              />

                              <select
                                value={row.itemRole}
                                onChange={(e) =>
                                  updateBlock(blk.id, (b) => {
                                    const nextRows = [...(b.rows || [])];
                                    nextRows[rIdx] = {
                                      ...nextRows[rIdx],
                                      itemRole: e.target.value as any,
                                    };
                                    return recalculateBlockWithAlgorithms(
                                      { ...b, rows: nextRows },
                                      calcCtx,
                                      templates
                                    );
                                  })
                                }
                                className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold"
                              >
                                <option value="base">Alaptétel</option>
                                <option value="optional">Opció</option>
                                <option value="gift">Ajándék</option>
                              </select>

                              <input
                                type="text"
                                value={row.note}
                                onChange={(e) =>
                                  updateBlock(blk.id, (b) => {
                                    const nextRows = [...(b.rows || [])];
                                    nextRows[rIdx] = {
                                      ...nextRows[rIdx],
                                      note: e.target.value,
                                    };
                                    return { ...b, rows: nextRows };
                                  })
                                }
                                placeholder="Opcionális felirat (pl. Ajándék)"
                                className="w-40 px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
                              />

                              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer">
                                <ImageIcon className="w-3 h-3 text-emerald-600" />
                                + Fotó csatolása a termékhez
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const url = await onUploadImage(file);
                                    if (url) {
                                      updateBlock(blk.id, (b) => {
                                        const nextRows = [...(b.rows || [])];
                                        const existingPhotos =
                                          nextRows[rIdx].photos || [];
                                        nextRows[rIdx] = {
                                          ...nextRows[rIdx],
                                          photos: [
                                            ...existingPhotos,
                                            {
                                              id: `rp_${Date.now()}`,
                                              imageUrl: url,
                                              titleAbove: nextRows[rIdx].name,
                                              captionBelow: '',
                                              widthPct: 68,
                                              align: 'center',
                                            },
                                          ],
                                        };
                                        return { ...b, rows: nextRows };
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            {/* Product-level attached photos + caption text boxes */}
                            {row.photos && row.photos.length > 0 && (
                              <div className="pl-6 pt-1 space-y-2">
                                {row.photos.map((rp, rpIdx) => (
                                  <div
                                    key={rp.id}
                                    className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3"
                                  >
                                    <img
                                      src={rp.imageUrl}
                                      alt=""
                                      className="w-20 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                                    />
                                    <div className="flex-1 space-y-1">
                                      <div className="text-[11px] font-bold text-emerald-950">
                                        Termékfotó alatti szövegdoboz ({row.name}):
                                      </div>
                                      <textarea
                                        rows={2}
                                        value={rp.captionBelow}
                                        onChange={(e) =>
                                          updateBlock(blk.id, (b) => {
                                            const nextRows = [
                                              ...(b.rows || []),
                                            ];
                                            const nextPhotos = [
                                              ...(nextRows[rIdx].photos || []),
                                            ];
                                            nextPhotos[rpIdx] = {
                                              ...nextPhotos[rpIdx],
                                              captionBelow: e.target.value,
                                            };
                                            nextRows[rIdx] = {
                                              ...nextRows[rIdx],
                                              photos: nextPhotos,
                                            };
                                            return { ...b, rows: nextRows };
                                          })
                                        }
                                        placeholder="Írj szöveget a termékhez csatolt fotó alá..."
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateBlock(blk.id, (b) => {
                                          const nextRows = [...(b.rows || [])];
                                          nextRows[rIdx] = {
                                            ...nextRows[rIdx],
                                            photos: (
                                              nextRows[rIdx].photos || []
                                            ).filter((_, i) => i !== rpIdx),
                                          };
                                          return { ...b, rows: nextRows };
                                        })
                                      }
                                      className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Locked Algorithm-Computed Section Total Box (No manual override) */}
                    <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-emerald-400">
                          🔒 Algoritmus alapján számított alaptételek összesítése
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Az árak automatikusan számolódnak a megadott méretekből ({widthCm}×{projectionCm}×{heightCm} cm) és a termékek algoritmusából.
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-right">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Összesen (EUR)
                          </div>
                          <div className="text-sm font-extrabold text-emerald-400">
                            {formatDotNumber(blk.customTotalBaseEur ?? 0)} EUR
                          </div>
                        </div>
                        <div className="px-3.5 py-2 rounded-xl bg-emerald-600 text-right">
                          <div className="text-[10px] font-bold uppercase text-emerald-100">
                            Összesen (Ft)
                          </div>
                          <div className="text-sm font-extrabold text-white">
                            {formatDotNumber(blk.customTotalBaseHuf ?? 0)} Ft
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Closing Text Box */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Sablon Záró Szövegdoboza (a táblázat alatt)
                    </label>
                    <textarea
                      rows={2}
                      value={blk.sectionClosingText || ''}
                      onChange={(e) =>
                        updateBlock(blk.id, (b) => ({
                          ...b,
                          sectionClosingText: e.target.value,
                        }))
                      }
                      placeholder="Írj ide bármilyen megjegyzést vagy kiegészítő szöveget a táblázat alá..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* BLOCK TYPE 4: PAGE BREAK */}
              {blk.type === 'page_break' && (
                <div className="px-4 py-3 text-center text-xs font-semibold text-slate-500 bg-slate-50">
                  --- Itt új A4-es oldal kezdődik a PDF-ben ---
                </div>
              )}
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Sticky Live A4 PDF Preview */}
        <div className="xl:col-span-5 xl:sticky xl:top-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Valódi A4 PDF Előnézet
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshLivePdfPreview}
                  disabled={previewLoading}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    needsPreviewRefresh
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  {previewLoading ? 'Frissítés...' : '🔄 Előnézet frissítése'}
                </button>
                {pdfPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => setFullscreenPreview(true)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                    title="Teljes képernyős PDF"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {needsPreviewRefresh && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
                <span>
                  A szövegdobozok módosultak. Kattints a frissítésre a PDF
                  újrarajzolásához!
                </span>
                <button
                  type="button"
                  onClick={refreshLivePdfPreview}
                  className="font-bold underline"
                >
                  Frissítés most
                </button>
              </div>
            )}

            <div className="h-[720px] bg-slate-100 flex items-center justify-center">
              {pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  title="PDF Előnézet"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="text-xs text-slate-500">
                  PDF előnézet készítése...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen PDF Modal */}
      {fullscreenPreview && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col p-4">
          <div className="flex items-center justify-between text-white pb-3">
            <h3 className="text-sm font-bold">
              Teljes képernyős A4 PDF előnézet — {customerName}
            </h3>
            <button
              type="button"
              onClick={() => setFullscreenPreview(false)}
              className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold"
            >
              Bezárás
            </button>
          </div>
          <iframe
            src={pdfPreviewUrl}
            title="Teljes PDF"
            className="w-full flex-1 rounded-xl bg-white border-0"
          />
        </div>
      )}
    </div>
  );
}
