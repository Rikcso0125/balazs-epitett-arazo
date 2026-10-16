'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Check,
  Eye,
  FileText,
  Maximize2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { BEEPITES_TYPES, getAllProductTypes } from '@/lib/constants';
import { calculateQuoteOptions, roundHuf } from '@/lib/pricing-engine';
import {
  AdminConfig,
  BeepitesTipusId,
  CalculatedModelOption,
  QuoteRecord,
  TermekTipusId,
} from '@/lib/types';
import { formatCurrency } from './DashboardAnalyticsView';

interface QuoteConfiguratorViewProps {
  config: AdminConfig;
  initialQuote?: QuoteRecord | null;
  preselectedCategory?: TermekTipusId | null;
  onSaveQuote: (
    payload: Partial<QuoteRecord> & {
      generatePdf?: boolean;
      regeneratePdf?: boolean;
      sendImmediately?: boolean;
    }
  ) => Promise<void>;
  onCancel?: () => void;
  onOpenTemplateWizard?: () => void;
}

export function QuoteConfiguratorView({
  config,
  initialQuote,
  preselectedCategory,
  onSaveQuote,
  onCancel,
  onOpenTemplateWizard,
}: QuoteConfiguratorViewProps) {
  const isEditMode = Boolean(initialQuote);
  const allProductTypes = getAllProductTypes(config);

  const [customerName, setCustomerName] = useState(
    initialQuote?.customerName || ''
  );
  const [greetingName, setGreetingName] = useState(
    initialQuote?.greetingName || ''
  );
  const [email, setEmail] = useState(initialQuote?.email || '');
  const [phone, setPhone] = useState(initialQuote?.phone || '');
  const [city, setCity] = useState(initialQuote?.city || 'Budapest');
  const [szallitasiDijHuf, setSzallitasiDijHuf] = useState<number>(
    initialQuote?.szallitasiDijHuf ?? config.general.defaultSzallitasiDij
  );
  const [eurHufRate, setEurHufRate] = useState<number>(
    initialQuote?.eurHufRate ?? config.general.defaultEurHufRate
  );

  const [termekTipus, setTermekTipus] = useState<TermekTipusId>(
    initialQuote?.termekTipus || preselectedCategory || 'bioklimatikus'
  );

  useEffect(() => {
    if (preselectedCategory) {
      setManualOverrideMode(false);
      setTermekTipus(preselectedCategory);
    }
  }, [preselectedCategory]);
  const [beepitesTipus, setBeepitesTipus] = useState<BeepitesTipusId>(
    initialQuote?.beepitesTipus || 'Épülethez rögzített'
  );
  const [projection, setProjection] = useState<number>(
    initialQuote?.projection || 400
  );
  const [width, setWidth] = useState<number>(initialQuote?.width || 350);
  const [height, setHeight] = useState<number>(initialQuote?.height || 250);

  const [hasUvegfal, setHasUvegfal] = useState<boolean>(
    initialQuote?.hasUvegfal ?? true
  );
  const [hasZip, setHasZip] = useState<boolean>(initialQuote?.hasZip ?? true);
  const [hasNoSideWall, setHasNoSideWall] = useState<boolean>(
    initialQuote?.hasNoSideWall ?? false
  );
  const [hasLed, setHasLed] = useState<boolean>(initialQuote?.hasLed ?? true);
  const [hasSensors, setHasSensors] = useState<boolean>(
    initialQuote?.hasSensors ?? true
  );
  const [hasHeating, setHasHeating] = useState<boolean>(
    initialQuote?.hasHeating ?? true
  );
  const [hasSmartHome, setHasSmartHome] = useState<boolean>(
    initialQuote?.hasSmartHome ?? false
  );

  const [calculatedOptions, setCalculatedOptions] = useState<
    CalculatedModelOption[]
  >(initialQuote?.calculatedOptions || []);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(
    initialQuote?.selectedOptionIndex || 0
  );
  const [customNotes, setCustomNotes] = useState<string>(
    initialQuote?.customNotes || ''
  );

  const [fetchingRate, setFetchingRate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualOverrideMode, setManualOverrideMode] = useState(false);

  // Manual PDF preview state (does NOT auto-reload while typing/reading)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState<boolean>(false);
  const [pdfNeedsRefresh, setPdfNeedsRefresh] = useState<boolean>(false);
  const [rightPanelMode, setRightPanelMode] = useState<'both' | 'pdf_only'>(
    'both'
  );
  const [fullscreenPdfOpen, setFullscreenPdfOpen] = useState<boolean>(false);
  const hasGeneratedInitialPreviewRef = useRef<boolean>(false);

  // Recalculate automatically when inputs change unless manual override is locked
  useEffect(() => {
    if (manualOverrideMode) return;
    const options = calculateQuoteOptions(
      {
        termekTipus,
        beepitesTipus,
        projection,
        width,
        height,
        eurHufRate,
      },
      config
    );
    setCalculatedOptions(options);
    if (selectedOptionIndex >= options.length) {
      setSelectedOptionIndex(0);
    }
  }, [
    termekTipus,
    beepitesTipus,
    projection,
    width,
    height,
    eurHufRate,
    config,
    manualOverrideMode,
    selectedOptionIndex,
  ]);

  const refreshLivePdfPreview = useCallback(async () => {
    if (!calculatedOptions || calculatedOptions.length === 0) return;
    setPdfPreviewLoading(true);
    try {
      const res = await fetch('/api/quotes/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || 'Minta Ügyfél',
          greetingName: (greetingName || customerName).trim() || 'Érdeklődő',
          city: city.trim() || 'Budapest',
          szallitasiDijHuf,
          eurHufRate,
          termekTipus,
          beepitesTipus,
          projection,
          width,
          height,
          hasUvegfal,
          hasZip,
          hasNoSideWall,
          hasLed,
          hasSensors,
          hasHeating,
          hasSmartHome,
          calculatedOptions,
          selectedOptionIndex,
          customNotes,
        }),
      });
      const data = await res.json();
      if (data?.ok && data?.url) {
        setPdfPreviewUrl(data.url);
        setPdfNeedsRefresh(false);
      }
    } catch (e) {
      console.error('Live PDF preview error:', e);
    } finally {
      setPdfPreviewLoading(false);
    }
  }, [
    customerName,
    greetingName,
    city,
    szallitasiDijHuf,
    eurHufRate,
    termekTipus,
    beepitesTipus,
    projection,
    width,
    height,
    hasUvegfal,
    hasZip,
    hasNoSideWall,
    hasLed,
    hasSensors,
    hasHeating,
    hasSmartHome,
    calculatedOptions,
    selectedOptionIndex,
    customNotes,
  ]);

  // Generate initial preview ONCE on load; afterwards mark as needing manual refresh
  useEffect(() => {
    if (!calculatedOptions || calculatedOptions.length === 0) return;
    if (!hasGeneratedInitialPreviewRef.current) {
      hasGeneratedInitialPreviewRef.current = true;
      refreshLivePdfPreview();
    } else {
      setPdfNeedsRefresh(true);
    }
  }, [
    customerName,
    greetingName,
    city,
    szallitasiDijHuf,
    eurHufRate,
    termekTipus,
    beepitesTipus,
    projection,
    width,
    height,
    hasUvegfal,
    hasZip,
    hasNoSideWall,
    hasLed,
    hasSensors,
    hasHeating,
    hasSmartHome,
    calculatedOptions,
    selectedOptionIndex,
    customNotes,
  ]);

  const handleFetchLiveRate = async () => {
    setFetchingRate(true);
    try {
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (data.rate) {
        setEurHufRate(data.rate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingRate(false);
    }
  };

  const handleOptionCustomDiscountChange = (idx: number, pct: number) => {
    setManualOverrideMode(true);
    setCalculatedOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== idx) return opt;
        const factor = 1 - pct / 100;
        const baseRaw =
          opt.kedvezmenyesAlaparEur +
          opt.motorEur +
          opt.taviranyitoEur +
          opt.szerelesEur;
        const newTotalEur = Math.round(baseRaw * factor);
        const newTotalHuf = roundHuf(newTotalEur, eurHufRate);
        return {
          ...opt,
          customDiscountPct: pct,
          alapszerkezetOsszesenEur: newTotalEur,
          alapszerkezetOsszesenHuf: newTotalHuf,
        };
      })
    );
  };

  const handleOptionDirectPriceChange = (idx: number, newEur: number) => {
    setManualOverrideMode(true);
    setCalculatedOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== idx) return opt;
        return {
          ...opt,
          alapszerkezetOsszesenEur: newEur,
          alapszerkezetOsszesenHuf: roundHuf(newEur, eurHufRate),
        };
      })
    );
  };

  const handleToggleOptionEnabled = (idx: number) => {
    setManualOverrideMode(true);
    setCalculatedOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, enabled: !opt.enabled } : opt))
    );
  };

  const enabledOptions = calculatedOptions.filter((o) => o.enabled);
  const primaryOption =
    calculatedOptions[selectedOptionIndex] ||
    enabledOptions[0] ||
    calculatedOptions[0];

  const handleSubmit = async (sendImmediately: boolean) => {
    if (!customerName.trim()) {
      alert('Kérjük, adja meg az ügyfél nevét!');
      return;
    }
    setSaving(true);
    try {
      await onSaveQuote({
        customerName: customerName.trim(),
        greetingName: (greetingName || customerName).trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim() || 'Budapest',
        szallitasiDijHuf,
        eurHufRate,
        termekTipus,
        beepitesTipus,
        projection,
        width,
        height,
        hasUvegfal,
        hasZip,
        hasNoSideWall,
        hasLed,
        hasSensors,
        hasHeating,
        hasSmartHome,
        calculatedOptions,
        selectedOptionIndex,
        primaryEur: primaryOption?.alapszerkezetOsszesenEur || 0,
        primaryHuf: primaryOption?.alapszerkezetOsszesenHuf || 0,
        customNotes,
        generatePdf: true,
        regeneratePdf: true,
        sendImmediately,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* HelloTeam ERP Form Breadcrumb & Header Card (like "CRM > Partnerek > Új Partner" in video) */}
      {!isEditMode && (
        <div className="ht-module-header p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11.5px] font-medium text-[#6b6b6b] mb-1">
              CRM &nbsp;›&nbsp; Árajánlatok &nbsp;›&nbsp;{' '}
              <span className="text-[#0a0a0a] font-semibold">Új árajánlat</span>
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#0a0a0a]">
              Új Pergola Árajánlat & PDF Generátor
            </h1>
            <p className="text-[12.5px] text-[#6b6b6b] mt-0.5">
              Valós idejű gyári ármátrix kalkuláció, egyedi méretre szabás és 1-kattintásos kiküldés.
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-[#d6d6d6] text-[#0a0a0a] hover:border-[#0a0a0a]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Vissza
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): Form Inputs */}
        <div className="xl:col-span-7 space-y-5">
          {/* 1. Ügyfél adatok */}
          <div className="ht-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#efefef]">
              <h2 className="text-[15px] font-extrabold text-[#0a0a0a]">
                1. Ügyfél és szállítási adatok
              </h2>
              <button
                type="button"
                onClick={handleFetchLiveRate}
                disabled={fetchingRate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#f3f3f3] hover:bg-[#e8e8e8] text-[#0a0a0a] border border-[#e0e0e0] transition"
              >
                <RefreshCw
                  className={`w-3 h-3 ${fetchingRate ? 'animate-spin' : ''}`}
                />
                Élő MNB árfolyam ({eurHufRate} Ft/€)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  Ügyfél / Cégnév *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (!greetingName) setGreetingName(e.target.value);
                  }}
                  placeholder="pl. Kovács János"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-sm text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  Megszólítás a PDF-ben & Emailben
                </label>
                <input
                  type="text"
                  value={greetingName}
                  onChange={(e) => setGreetingName(e.target.value)}
                  placeholder="pl. János"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-sm text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  Email cím (1-kattintásos kiküldéshez)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ugyfel@pelda.hu"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-sm text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  Település *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="pl. Dunakeszi"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-sm text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  Szállítási díj (Ft)
                </label>
                <input
                  type="number"
                  value={szallitasiDijHuf}
                  onChange={(e) =>
                    setSzallitasiDijHuf(Number(e.target.value) || 0)
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-sm text-[#0a0a0a] tabular-nums focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  EUR / HUF Árfolyam
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={eurHufRate}
                  onChange={(e) =>
                    setEurHufRate(Number(e.target.value) || 400)
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-sm text-[#0a0a0a] tabular-nums focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>
            </div>
          </div>

          {/* 2. Terméktípus kiválasztása */}
          <div className="ht-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#efefef]">
              <h2 className="text-[15px] font-extrabold text-[#0a0a0a]">
                2. Pergola / Árnyékoló típusának kiválasztása
              </h2>
              {onOpenTemplateWizard && (
                <button
                  type="button"
                  onClick={onOpenTemplateWizard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#0a0a0a] text-white hover:bg-[#27272a] transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  + Új sablon felvitele (Varázsló)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allProductTypes.map((pt) => {
                const active = termekTipus === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => {
                      setManualOverrideMode(false);
                      setTermekTipus(pt.id);
                    }}
                    className={`text-left rounded-xl p-2.5 border transition relative overflow-hidden ${
                      active
                        ? 'border-2 border-[#0a0a0a] bg-[#fafafa] shadow-xs'
                        : 'border-[#e5e5e5] bg-white hover:border-[#a3a3a3]'
                    }`}
                  >
                    <div className="aspect-[16/10] rounded-lg overflow-hidden bg-[#f3f3f3] mb-2 border border-[#efefef]">
                      <img
                        src={pt.image}
                        alt={pt.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs font-extrabold text-[#0a0a0a] leading-snug">
                      {pt.shortName}
                    </div>
                    <div className="text-[10.5px] text-[#6b6b6b] line-clamp-1 mt-0.5">
                      {pt.modelsSummary}
                    </div>
                    {active && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}

              {onOpenTemplateWizard && (
                <button
                  type="button"
                  onClick={onOpenTemplateWizard}
                  className="flex flex-col items-center justify-center text-center rounded-xl p-3 border-2 border-dashed border-[#d4d4d8] bg-[#fafafa] hover:border-[#0a0a0a] hover:bg-white transition min-h-[120px]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center mb-1.5">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-extrabold text-[#0a0a0a]">
                    + Új sablon felvitele
                  </div>
                  <div className="text-[10px] text-[#71717a] mt-0.5">
                    Lépésről lépésre varázsló
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* 3. Beépítés és Méretek (cm) */}
          <div className="ht-card p-5 space-y-4">
            <h2 className="text-[15px] font-extrabold text-[#0a0a0a] pb-3 border-b border-[#efefef]">
              3. Beépítési mód & Egyedi méretek (cm)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BEEPITES_TYPES.map((bt) => {
                const active = beepitesTipus === bt.id;
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => {
                      setManualOverrideMode(false);
                      setBeepitesTipus(bt.id);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      active
                        ? 'border-2 border-[#0a0a0a] bg-[#fafafa]'
                        : 'border-[#e5e5e5] bg-white hover:border-[#a3a3a3]'
                    }`}
                  >
                    <img
                      src={bt.image}
                      alt={bt.label}
                      className="w-16 h-12 object-contain rounded-lg bg-[#f3f3f3] p-1 border border-[#eaeaea]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold text-[#0a0a0a]">
                        {bt.label}
                      </div>
                      <div className="text-[11px] text-[#6b6b6b]">
                        {bt.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  A | Szélesség / Hossz (cm)
                </label>
                <input
                  type="number"
                  value={projection}
                  onChange={(e) => {
                    setManualOverrideMode(false);
                    setProjection(Number(e.target.value) || 100);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#d6d6d6] text-base font-extrabold text-[#0a0a0a] tabular-nums focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  B | Kinyúlás / Mélység (cm)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    setManualOverrideMode(false);
                    setWidth(Number(e.target.value) || 100);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#d6d6d6] text-base font-extrabold text-[#0a0a0a] tabular-nums focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                  C | Magasság (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    setManualOverrideMode(false);
                    setHeight(Number(e.target.value) || 200);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#d6d6d6] text-base font-extrabold text-[#0a0a0a] tabular-nums focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>
            </div>

            {/* Kiegészítő opciók */}
            <div className="pt-3 border-t border-[#efefef]">
              <div className="text-xs font-bold text-[#3d3d3d] mb-2.5">
                Opcionális kiegészítők megjelenítése az ajánlatban:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: 'LED világítás',
                    val: hasLed,
                    set: setHasLed,
                  },
                  {
                    label: 'ZIP oldalsó árnyékoló',
                    val: hasZip,
                    set: setHasZip,
                  },
                  {
                    label: 'Eltolható üvegfal',
                    val: hasUvegfal,
                    set: setHasUvegfal,
                  },
                  {
                    label: 'Szél- és esőérzékelő',
                    val: hasSensors,
                    set: setHasSensors,
                  },
                  {
                    label: 'Infra hősugárzó',
                    val: hasHeating,
                    set: setHasHeating,
                  },
                  {
                    label: 'Okosotthon vezérlés',
                    val: hasSmartHome,
                    set: setHasSmartHome,
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setManualOverrideMode(false);
                      item.set(!item.val);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      item.val
                        ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                        : 'bg-[#f6f6f6] text-[#6b6b6b] border-[#e0e0e0] hover:text-[#0a0a0a]'
                    }`}
                  >
                    {item.val ? '✓ ' : '+ '}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Egyedi megjegyzés a PDF-be */}
            <div className="pt-3 border-t border-[#efefef]">
              <label className="block text-xs font-bold text-[#3d3d3d] mb-1.5">
                Egyedi megjegyzés a PDF árajánlatba (opcionális):
              </label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Pl. Egyedi RAL szín igény, helyszíni daruzás, speciális ütemezés..."
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Live Calculated Options + Live PDF Preview */}
        <div className="xl:col-span-5 space-y-4">
          {/* Quick View Mode Switcher Bar */}
          <div className="ht-card p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightPanelMode('both')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  rightPanelMode === 'both'
                    ? 'bg-[#0a0a0a] text-white'
                    : 'bg-[#f4f4f5] text-[#52525b] hover:text-[#0a0a0a]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Árkalkuláció + PDF Előnézet
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('pdf_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  rightPanelMode === 'pdf_only'
                    ? 'bg-[#0a0a0a] text-white'
                    : 'bg-[#f4f4f5] text-[#52525b] hover:text-[#0a0a0a]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Csak PDF Előnézet (Nagyban)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFullscreenPdfOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#d6d6d6] text-[#0a0a0a] hover:bg-[#f4f4f5] transition flex items-center gap-1.5"
              title="PDF előnézet megnyitása teljes képernyőn"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Teljes képernyő
            </button>
          </div>

          {rightPanelMode === 'both' && (
            <div className="ht-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#efefef]">
                <div>
                  <h2 className="text-[15.5px] font-extrabold text-[#0a0a0a]">
                    Kalkulált modell opciók ({enabledOptions.length} aktív)
                  </h2>
                  <p className="text-[11.5px] text-[#6b6b6b]">
                    Terület:{' '}
                    <strong className="text-[#0a0a0a]">
                      {((projection * width) / 10000).toFixed(2)} m²
                    </strong>{' '}
                    · Árfolyam: {eurHufRate} Ft/€
                  </p>
                </div>
                {manualOverrideMode && (
                  <button
                    type="button"
                    onClick={() => setManualOverrideMode(false)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#fef6e7] text-[#b45309] border border-[#fde68a]"
                  >
                    Gyári ár visszaállítása
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {calculatedOptions.map((opt, idx) => {
                  const isPrimary = idx === selectedOptionIndex;
                  return (
                    <div
                      key={opt.modelId}
                      className={`ht-kpi-card p-4 pl-5 transition ${
                        !opt.enabled ? 'opacity-50' : ''
                      } ${isPrimary ? 'ring-1 ring-[#0a0a0a]' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={opt.enabled}
                              onChange={() => handleToggleOptionEnabled(idx)}
                              className="w-4 h-4 accent-[#0a0a0a] rounded cursor-pointer"
                            />
                            <h3 className="text-[14px] font-extrabold text-[#0a0a0a]">
                              {opt.modelName}
                            </h3>
                            {isPrimary && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0a0a0a] text-white">
                                Fő opció
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6b6b6b] mt-0.5">
                            {opt.subtitle} · {opt.legsCount} láb ·{' '}
                            {opt.modulesCount} modul
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedOptionIndex(idx)}
                          className="text-[11px] font-bold text-[#6b6b6b] hover:text-[#0a0a0a] underline"
                        >
                          Legyen fő ár
                        </button>
                      </div>

                      {opt.sizeWarning && (
                        <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#fef6e7] border border-[#fde68a] text-[11px] text-[#b45309] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{opt.sizeWarning}</span>
                        </div>
                      )}

                      {/* Price Breakdown Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#efefef] text-[11.5px]">
                        <div className="text-[#6b6b6b]">
                          Kedvezményes alapár:{' '}
                          <strong className="text-[#0a0a0a] tabular-nums">
                            {formatCurrency(opt.kedvezmenyesAlaparEur)} €
                          </strong>
                        </div>
                        <div className="text-[#6b6b6b]">
                          Motor + Távirányító:{' '}
                          <strong className="text-[#0a0a0a] tabular-nums">
                            {formatCurrency(opt.motorEur + opt.taviranyitoEur)}{' '}
                            €
                          </strong>
                        </div>
                        <div className="text-[#6b6b6b]">
                          Szerelés ({opt.szerelesPct}%):{' '}
                          <strong className="text-[#0a0a0a] tabular-nums">
                            {formatCurrency(opt.szerelesEur)} €
                          </strong>
                        </div>
                        {hasLed && opt.ledEur > 0 && (
                          <div className="text-[#6b6b6b]">
                            + LED világítás:{' '}
                            <strong className="text-[#0a0a0a] tabular-nums">
                              {formatCurrency(opt.ledEur)} €
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Editable Extra Discount & Total Price */}
                      <div className="mt-3 pt-2.5 border-t border-[#efefef] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#4a4a4a]">
                            Egyedi kedv. %:
                          </span>
                          <input
                            type="number"
                            step="1"
                            min="-50"
                            max="50"
                            value={opt.customDiscountPct || 0}
                            onChange={(e) =>
                              handleOptionCustomDiscountChange(
                                idx,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1 rounded border border-[#d6d6d6] text-xs font-bold text-[#0a0a0a] tabular-nums"
                          />
                        </div>

                        <div className="text-right tabular-nums">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              value={opt.alapszerkezetOsszesenEur}
                              onChange={(e) =>
                                handleOptionDirectPriceChange(
                                  idx,
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-24 px-2 py-1 rounded border border-[#d6d6d6] text-right text-xs font-extrabold text-[#0a0a0a]"
                            />
                            <span className="text-xs font-bold text-[#6b6b6b]">
                              EUR
                            </span>
                          </div>
                          <div className="text-[15px] font-extrabold text-[#0a0a0a] mt-0.5">
                            {formatCurrency(opt.alapszerkezetOsszesenHuf)} HUF
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#efefef] space-y-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(false)}
                  className="w-full py-3 px-4 rounded-xl bg-[#0a0a0a] hover:bg-[#262626] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving
                    ? 'Hivatalos PDF generálása folyamatban...'
                    : isEditMode
                    ? 'Módosítások Mentése & PDF Újragenerálása'
                    : 'Árajánlat Mentése & Hivatalos PDF Generálása'}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#f6f6f6] text-[#0a0a0a] border border-[#0a0a0a] text-xs font-extrabold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Mentés + Azonnali Email Kiküldés (Tracking Pixellel)
                </button>
              </div>
            </div>
          )}

          {/* MANUAL PDF PREVIEW CARD (Never auto-reloads while reading; refreshes on click) */}
          <div className="ht-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#efefef]">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    pdfNeedsRefresh ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <div>
                  <h3 className="text-[14px] font-extrabold text-[#0a0a0a] flex items-center gap-1.5">
                    Hivatalos PDF Előnézet
                    {pdfNeedsRefresh && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Módosult – kattints a Frissítésre
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#6b6b6b]">
                    Nem ugrik el olvasás közben — csak akkor frissül, amikor rákattintasz a <b>PDF Frissítése</b> gombra.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={refreshLivePdfPreview}
                  disabled={pdfPreviewLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold border transition shadow-2xs ${
                    pdfNeedsRefresh
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                      : 'bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#0a0a0a] border-[#d6d6d6]'
                  }`}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      pdfPreviewLoading ? 'animate-spin' : ''
                    }`}
                  />
                  {pdfPreviewLoading
                    ? 'PDF Frissítése...'
                    : 'PDF Előnézet Frissítése'}
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenPdfOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#0a0a0a] text-white hover:bg-[#27272a] transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Nagyítás
                </button>
              </div>
            </div>

            <div
              className={`w-full rounded-xl overflow-hidden border border-[#d6d6d6] bg-[#262626] relative ${
                rightPanelMode === 'pdf_only' ? 'h-[78dvh]' : 'h-[620px]'
              }`}
            >
              {pdfPreviewLoading && (
                <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-[#0a0a0a]/85 text-white text-[11px] font-bold flex items-center gap-1.5 shadow">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  PDF frissítése...
                </div>
              )}
              {pdfPreviewUrl ? (
                <iframe
                  key={pdfPreviewUrl}
                  src={pdfPreviewUrl}
                  className="w-full h-full"
                  title="Élő PDF Árajánlat Előnézet"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/80 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Élő PDF előnézet generálása...</span>
                </div>
              )}
            </div>

            {rightPanelMode === 'pdf_only' && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0a0a0a] hover:bg-[#262626] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Árajánlat Mentése & PDF Generálása
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-[#f6f6f6] text-[#0a0a0a] border border-[#0a0a0a] text-xs font-extrabold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Mentés + Email Kiküldés
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIVE PDF PREVIEW MODAL */}
      {fullscreenPdfOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#d6d6d6] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[94dvh]">
            <div className="px-5 py-3.5 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#0a0a0a]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0a0a0a]">
                    Élő Hivatalos PDF Árajánlat Előnézet —{' '}
                    {customerName.trim() || 'Minta Ügyfél'} ({projection}×
                    {width}×{height} cm)
                  </h3>
                  <p className="text-[11px] text-[#6b6b6b]">
                    Pontosan ez a hivatalos OpenSky PDF dokumentum fog elmentődni és kimenni az ügyfélnek.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshLivePdfPreview}
                  disabled={pdfPreviewLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#d6d6d6] text-[#0a0a0a] hover:bg-[#f4f4f5]"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      pdfPreviewLoading ? 'animate-spin' : ''
                    }`}
                  />
                  Frissítés
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setFullscreenPdfOpen(false);
                    handleSubmit(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0a0a0a] text-white hover:bg-[#27272a]"
                >
                  <Save className="w-3.5 h-3.5" />
                  Árajánlat Mentése
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenPdfOpen(false)}
                  className="p-1.5 rounded-lg border border-[#d6d6d6] bg-white text-[#4a4a4a] hover:text-[#0a0a0a]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="w-full h-[82dvh] bg-[#262626]">
              {pdfPreviewUrl ? (
                <iframe
                  key={pdfPreviewUrl}
                  src={pdfPreviewUrl}
                  className="w-full h-full"
                  title="Teljes képernyős Élő PDF Előnézet"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                  PDF előnézet betöltése...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

