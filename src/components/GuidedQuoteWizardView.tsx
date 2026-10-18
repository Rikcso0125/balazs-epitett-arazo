'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Ruler,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { formatDotNumber, MOUNT_TYPES } from '@/lib/constants';
import {
  buildFullQuoteDocumentBlocks,
  calculateTemplateRows,
} from '@/lib/pricing-engine';
import {
  MountType,
  ProductCategory,
  QuoteDocumentBlock,
  QuoteRecord,
  QuoteTemplate,
  SystemConfig,
} from '@/lib/types';

interface GuidedQuoteWizardViewProps {
  config: SystemConfig;
  categories: ProductCategory[];
  templates: QuoteTemplate[];
  onOpenTemplateBuilder: () => void;
  onFinishWizardToEditor: (draftQuote: Partial<QuoteRecord>) => void;
}

export function GuidedQuoteWizardView({
  config,
  categories,
  templates,
  onOpenTemplateBuilder,
  onFinishWizardToEditor,
}: GuidedQuoteWizardViewProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Customer & Inquiry details + Name automation
  const [customerName, setCustomerName] = useState('');
  const [greetingName, setGreetingName] = useState('');
  const [greetingManuallyEdited, setGreetingManuallyEdited] = useState(false);
  const [city, setCity] = useState('Budapest');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');

  // Step 2: Dimensions (cm & m) + Mount type + Rate
  const [widthCm, setWidthCm] = useState<number>(600);
  const [projectionCm, setProjectionCm] = useState<number>(400);
  const [heightCm, setHeightCm] = useState<number>(250);
  const [mountType, setMountType] = useState<MountType>('Épülethez rögzített');
  const [eurHufRate, setEurHufRate] = useState<number>(
    config.defaultEurHufRate || 400
  );
  const [deliveryFeeHuf, setDeliveryFeeHuf] = useState<number>(
    config.defaultDeliveryFeeHuf ?? 40000
  );
  const [fetchingRate, setFetchingRate] = useState(false);

  // Step 3: Guided "Mit kér az ügyfél?" selections
  // categoryDecisions[catId] = true ("Kér") | false ("Nem kér")
  const [categoryDecisions, setCategoryDecisions] = useState<
    Record<string, boolean>
  >(() => {
    const init: Record<string, boolean> = {};
    categories.forEach((c, idx) => {
      init[c.id] = idx === 0;
    });
    return init;
  });

  // selectedTemplateIds: which templates are checked to be placed into the PDF
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    () => {
      if (categories[0]) {
        const firstCatTemplates = templates.filter(
          (t) => t.categoryId === categories[0].id
        );
        return firstCatTemplates.map((t) => t.id);
      }
      return [];
    }
  );

  // selectedMaterialsByTemplate[templateId] = array of materialIds enabled
  const [selectedMaterialsByTemplate, setSelectedMaterialsByTemplate] =
    useState<Record<string, string[]>>({});

  const getSelectedMaterialsForTemplate = (tpl: QuoteTemplate): string[] => {
    if (selectedMaterialsByTemplate[tpl.id]) {
      return selectedMaterialsByTemplate[tpl.id];
    }
    return (tpl.materials || [])
      .filter((m) => m.defaultSelected !== false)
      .map((m) => m.id);
  };

  const toggleMaterialForTemplate = (tpl: QuoteTemplate, matId: string) => {
    const current = getSelectedMaterialsForTemplate(tpl);
    const next = current.includes(matId)
      ? current.filter((id) => id !== matId)
      : [...current, matId];
    setSelectedMaterialsByTemplate((prev) => ({
      ...prev,
      [tpl.id]: next,
    }));
  };

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (!greetingManuallyEdited) {
      setGreetingName(val);
    }
  };

  const handleFetchLiveRate = async () => {
    setFetchingRate(true);
    try {
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (data?.rate) {
        setEurHufRate(Math.round(Number(data.rate)));
      }
    } catch {
      // ignore
    } finally {
      setFetchingRate(false);
    }
  };

  const handleToggleCategoryDecision = (catId: string, wantsIt: boolean) => {
    setCategoryDecisions((prev) => ({ ...prev, [catId]: wantsIt }));
    const catTemplates = templates
      .filter((t) => t.categoryId === catId)
      .map((t) => t.id);

    if (wantsIt) {
      // Automatically select templates in this category if none selected yet
      setSelectedTemplateIds((prev) => {
        const hasAny = prev.some((id) => catTemplates.includes(id));
        if (hasAny) return prev;
        return [...prev, ...catTemplates];
      });
    } else {
      // Remove templates of this category from selection
      setSelectedTemplateIds((prev) =>
        prev.filter((id) => !catTemplates.includes(id))
      );
    }
  };

  const handleToggleTemplate = (tplId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(tplId)
        ? prev.filter((id) => id !== tplId)
        : [...prev, tplId]
    );
  };

  const activeTemplatesToInclude = useMemo(() => {
    return templates.filter(
      (t) =>
        categoryDecisions[t.categoryId] && selectedTemplateIds.includes(t.id)
    );
  }, [templates, categoryDecisions, selectedTemplateIds]);

  const handleProceedToPdfEditor = () => {
    const resolvedCustomer = customerName.trim() || 'Minta Ügyfél';
    const resolvedGreeting =
      (greetingName || customerName).trim() || resolvedCustomer;

    const { blocks, primaryTotalEur, primaryTotalHuf } =
      buildFullQuoteDocumentBlocks({
        customerName: resolvedCustomer,
        greetingName: resolvedGreeting,
        city: city.trim() || 'Budapest',
        inquiryNotes,
        widthCm,
        projectionCm,
        heightCm,
        mountType,
        eurHufRate,
        deliveryFeeHuf,
        selectedTemplates: activeTemplatesToInclude,
        selectedMaterialsByTemplate,
        config,
      });

    onFinishWizardToEditor({
      customerName: resolvedCustomer,
      greetingName: resolvedGreeting,
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim() || 'Budapest',
      inquiryNotes,
      widthCm,
      projectionCm,
      heightCm,
      mountType,
      eurHufRate,
      deliveryFeeHuf,
      selectedCategoryIds: Object.keys(categoryDecisions).filter(
        (k) => categoryDecisions[k]
      ),
      selectedTemplateIds: activeTemplatesToInclude.map((t) => t.id),
      blocks: blocks as QuoteDocumentBlock[],
      primaryTotalEur,
      primaryTotalHuf,
    });
  };

  if (categories.length === 0 || templates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Először vegyél fel legalább 1 kategóriát és 1 sablont!
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          A végigvezetett árazó a Sablon & Termék Varázslóban létrehozott
          kategóriákon (pl. Pergola, Napellenző, Üvegfal, LED) és sablonokon
          vezet végig.
        </p>
        <button
          type="button"
          onClick={onOpenTemplateBuilder}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ugrás a Sablon & Termék Varázslóhoz
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              2. LÉPÉS: VÉGIGVEZETETT ÁRAZÓ VARÁZSLÓ
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Ügyfél Megkeresés Végigvezetett Árazása
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                num: 1 as const,
                title: '1. Ügyfél Neve & Megkeresés',
                icon: UserCheck,
              },
              {
                num: 2 as const,
                title: '2. Méretek (pl. 6×4 m)',
                icon: Ruler,
              },
              {
                num: 3 as const,
                title: '3. Mit kér az ügyfél? (Sablonok)',
                icon: CheckCircle2,
              },
            ].map((s) => {
              const Icon = s.icon;
              const active = step === s.num;
              const done = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : done
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 1: CUSTOMER & NAME AUTOMATION */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              1. Lépés: Kinek a nevére szóljon az árajánlat? (Név-automatizáció)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Add meg az ügyfél nevét – a rendszer automatikusan behelyettesíti
              a megszólítást és az adatokat a PDF összes szövegdobozába.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Ügyfél neve (milyen névre írjuk ki az árajánlatot?) *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                placeholder="pl. Kovács János"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Automatikus Megszólítás a PDF elején
              </label>
              <input
                type="text"
                value={greetingName}
                onChange={(e) => {
                  setGreetingManuallyEdited(true);
                  setGreetingName(e.target.value);
                }}
                placeholder="pl. Kovács János vagy János"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <div className="text-xs text-emerald-700 font-semibold mt-1.5">
                Előnézet a PDF-ben: „Kedves{' '}
                {(greetingName || customerName || 'Érdeklődő').trim()}!”
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Település / Helyszín
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="pl. Budapest"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  E-mail cím (opcionális)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ugyfel@email.hu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Telefonszám (opcionális)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+36 30 ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Weboldalról bejött megkeresés / Ügyfél üzenete (emlékeztető az árazáshoz)
            </label>
            <textarea
              rows={3}
              value={inquiryNotes}
              onChange={(e) => setInquiryNotes(e.target.value)}
              placeholder="Ide bemásolhatod, mit írt az ügyfél a weboldalon (pl. 6x4 m-es pergola kell, napellenző kell, üvegfal kell, LED világítás nem kell)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm"
            >
              Tovább a Méretek megadásához
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DIMENSIONS & EXCHANGE RATE */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              2. Lépés: Milyen méretű szerkezetet kér az ügyfél?
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Add meg a szélességet, kinyúlást és magasságot (pl. 6 × 4 m = 600 ×
              400 cm).
            </p>
          </div>

          {inquiryNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
              <span className="font-bold">Ügyfél megkeresése:</span>{' '}
              {inquiryNotes}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Szélesség / Hosszúság (cm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={widthCm}
                  onChange={(e) => setWidthCm(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-bold"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  = {(widthCm / 100).toFixed(2)} m
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[300, 400, 500, 600, 700, 800].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidthCm(w)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                      widthCm === w
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {w / 100} m ({w} cm)
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Kinyúlás / Mélység (cm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={projectionCm}
                  onChange={(e) => setProjectionCm(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-bold"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  = {(projectionCm / 100).toFixed(2)} m
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[250, 300, 350, 400, 450, 500].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProjectionCm(p)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                      projectionCm === p
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p / 100} m ({p} cm)
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Átlagos Magasság (cm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-bold"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  = {(heightCm / 100).toFixed(2)} m
                </span>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                Számított alapterület:{' '}
                {((widthCm / 100) * (projectionCm / 100)).toFixed(1)} m²
              </div>
            </div>
          </div>

          {/* Mount Type & Currency Rate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Beépítés módja
              </label>
              <select
                value={mountType}
                onChange={(e) => setMountType(e.target.value as MountType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
              >
                {MOUNT_TYPES.map((mt) => (
                  <option key={mt.id} value={mt.id}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                EUR / HUF Árfolyam
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={eurHufRate}
                  onChange={(e) => setEurHufRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={handleFetchLiveRate}
                  disabled={fetchingRate}
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      fetchingRate ? 'animate-spin' : ''
                    }`}
                  />
                  MNB
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Szállítási díj (Ft)
              </label>
              <input
                type="number"
                step={5000}
                value={deliveryFeeHuf}
                onChange={(e) => setDeliveryFeeHuf(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Vissza az Ügyfél adatokhoz
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm"
            >
              Tovább: Mit kér az ügyfél? (Sablonok kiválasztása)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: GUIDED "MIT KÉR AZ ÜGYFÉL?" CHECKLIST & TEMPLATE PICKER */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  3. Lépés: Végigvezetett választó — Mit kér az ügyfél?
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Kattints végig a kategóriákon (Kér / Nem kér). Amelyiknél az
                  „IGEN, KÉR” van bekapcsolva, ott kiválaszthatod a sablonokat
                  és a termékeket, amelyeket berakunk a PDF-be!
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                Ügyfél: {customerName || 'Minta Ügyfél'} • Méret: {widthCm}×
                {projectionCm}×{heightCm} cm (
                {((widthCm / 100) * (projectionCm / 100)).toFixed(1)} m²)
              </div>
            </div>

            {inquiryNotes && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                <span className="font-bold">Ügyfél megkeresése:</span>{' '}
                {inquiryNotes}
              </div>
            )}

            <div className="mt-5 space-y-5">
              {categories.map((cat, cIdx) => {
                const catTemplates = templates.filter(
                  (t) => t.categoryId === cat.id
                );
                const wantsCategory = Boolean(categoryDecisions[cat.id]);

                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl border-2 transition overflow-hidden ${
                      wantsCategory
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    {/* Category Yes/No Bar */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            {cIdx + 1}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">
                            {cat.questionPrompt ||
                              `Kér az ügyfél ${cat.name.toLowerCase()}t?`}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {cat.name} ({catTemplates.length} sablon)
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-slate-500 mt-1 ml-8">
                            {cat.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCategoryDecision(cat.id, true)
                          }
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                            wantsCategory
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          IGEN, KÉR
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCategoryDecision(cat.id, false)
                          }
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                            !wantsCategory
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          NEM KÉR
                        </button>
                      </div>
                    </div>

                    {/* If YES, show available templates & products inside this category */}
                    {wantsCategory && (
                      <div className="p-4 sm:p-5 space-y-4">
                        {catTemplates.length === 0 ? (
                          <div className="text-xs text-slate-500 italic">
                            Ebben a kategóriában még nincs felvéve sablon.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {catTemplates.map((tpl) => {
                              const isSelected = selectedTemplateIds.includes(
                                tpl.id
                              );
                              const activeMatIds =
                                getSelectedMaterialsForTemplate(tpl);
                              const calc = calculateTemplateRows(
                                tpl,
                                {
                                  widthCm,
                                  projectionCm,
                                  heightCm,
                                  mountType,
                                  eurHufRate,
                                },
                                activeMatIds
                              );

                              return (
                                <div
                                  key={tpl.id}
                                  className={`rounded-xl border-2 p-4 transition bg-white ${
                                    isSelected
                                      ? 'border-emerald-600 shadow-sm'
                                      : 'border-slate-200 opacity-75 hover:opacity-100'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                          handleToggleTemplate(tpl.id)
                                        }
                                        className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                      />
                                      <div>
                                        <div className="text-sm font-bold text-slate-900">
                                          {tpl.name}
                                        </div>
                                        {tpl.subtitle && (
                                          <div className="text-xs text-slate-500 mt-0.5">
                                            {tpl.subtitle}
                                          </div>
                                        )}
                                        <div className="text-[11px] text-slate-500 mt-1">
                                          📷 {tpl.photos?.length || 0} fotó • 📦{' '}
                                          {tpl.materials?.length || 0} anyag/tétel
                                        </div>
                                      </div>
                                    </label>

                                    <div className="text-right shrink-0">
                                      <div className="text-sm font-extrabold text-emerald-700">
                                        {formatDotNumber(calc.totalBaseEur)} EUR
                                      </div>
                                      <div className="text-[11px] font-semibold text-slate-500">
                                        {formatDotNumber(calc.totalBaseHuf)} Ft
                                      </div>
                                    </div>
                                  </div>

                                  {/* Material checkboxes inside selected template */}
                                  {isSelected &&
                                    tpl.materials &&
                                    tpl.materials.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                        <div className="text-[11px] font-bold uppercase text-slate-500">
                                          Sablon termékei és anyagai (pipáld ki/be):
                                        </div>
                                        {calc.rows.map((r) => {
                                          const matChecked =
                                            activeMatIds.includes(
                                              r.materialId || ''
                                            );
                                          return (
                                            <label
                                              key={r.id}
                                              className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="checkbox"
                                                  checked={matChecked}
                                                  onChange={() =>
                                                    r.materialId &&
                                                    toggleMaterialForTemplate(
                                                      tpl,
                                                      r.materialId
                                                    )
                                                  }
                                                  className="rounded text-emerald-600"
                                                />
                                                <span className="font-medium text-slate-800">
                                                  {r.name}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                  ({r.quantityLabel})
                                                </span>
                                              </div>
                                              <span className="font-bold text-slate-700">
                                                {r.itemRole === 'gift'
                                                  ? 'Ajándék (0 EUR)'
                                                  : `${formatDotNumber(
                                                      r.discountPriceEur
                                                    )} EUR`}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Vissza a Méretekhez
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Kiválasztva: {activeTemplatesToInclude.length} db sablon a
                  PDF-be
                </span>
                <button
                  type="button"
                  onClick={handleProceedToPdfEditor}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md transition"
                >
                  <FileText className="w-4 h-4" />
                  Tovább a Blokkos PDF Szerkesztőbe & Generáláshoz
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
