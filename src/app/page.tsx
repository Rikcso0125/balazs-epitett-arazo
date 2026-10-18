'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  FileText,
  FolderKanban,
  Layers,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { BrandingSettingsView } from '@/components/BrandingSettingsView';
import { GuidedQuoteWizardView } from '@/components/GuidedQuoteWizardView';
import { PdfBlockEditorView } from '@/components/PdfBlockEditorView';
import { SavedQuotesListView } from '@/components/SavedQuotesListView';
import { TemplateBuilderView } from '@/components/TemplateBuilderView';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/constants';
import {
  ProductCategory,
  QuoteRecord,
  QuoteStatus,
  QuoteTemplate,
  SystemConfig,
  UploadedMediaItem,
} from '@/lib/types';

type ActiveModule =
  | 'template_builder'
  | 'guided_wizard'
  | 'pdf_editor'
  | 'saved_quotes'
  | 'settings';

interface ToastNotice {
  id: string;
  title: string;
  message: string;
}

export default function CustomPricerAppPage() {
  const [activeModule, setActiveModule] =
    useState<ActiveModule>('template_builder');

  const [config, setConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<UploadedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Current quote being edited inside PdfBlockEditorView (either fresh from wizard or reopened saved quote)
  const [activeDraftOrSavedQuote, setActiveDraftOrSavedQuote] =
    useState<Partial<QuoteRecord> | null>(null);

  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const showToast = useCallback((title: string, message: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ id, title, message }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.templates)) setTemplates(data.templates);
      if (Array.isArray(data.quotes)) setQuotes(data.quotes);
      if (Array.isArray(data.mediaLibrary)) setMediaLibrary(data.mediaLibrary);
    } catch (e) {
      console.error('Failed to load state:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Image Upload helper
  const handleUploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/template-images', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data?.ok && data.url) {
        await fetchState(true);
        showToast('Kép feltöltve', file.name);
        return data.url as string;
      }
    } catch (e) {
      console.error('Upload error:', e);
    }
    return null;
  };

  // Category CRUD
  const handleSaveCategory = async (category: ProductCategory) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upsertCategory: category }),
    });
    const data = await res.json();
    if (data?.ok) {
      setCategories(data.categories || []);
      showToast(
        'Kategória elmentve',
        `„${category.name}” kategória frissítve.`
      );
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteCategoryId: categoryId }),
    });
    const data = await res.json();
    if (data?.ok) {
      setCategories(data.categories || []);
      setTemplates(data.templates || []);
      showToast('Kategória törölve', 'A kategória eltávolítva.');
    }
  };

  // Template CRUD
  const handleSaveTemplate = async (template: QuoteTemplate) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upsertTemplate: template }),
    });
    const data = await res.json();
    if (data?.ok) {
      setTemplates(data.templates || []);
      showToast(
        'Sablon elmentve!',
        `„${template.name}” (${template.materials?.length || 0} termék/anyag, ${
          template.photos?.length || 0
        } fotó) készen áll az árazásra.`
      );
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteTemplateId: templateId }),
    });
    const data = await res.json();
    if (data?.ok) {
      setTemplates(data.templates || []);
      showToast('Sablon törölve', 'A sablon eltávolítva.');
    }
  };

  // Save System Config
  const handleSaveSystemConfig = async (nextConfig: SystemConfig) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: nextConfig }),
    });
    const data = await res.json();
    if (data?.ok) {
      setConfig(data.config);
      showToast(
        'Beállítások elmentve',
        'A PDF fejléc/lábléc és alapbeállítások frissültek.'
      );
    }
  };

  // Create or Update Quote & Generate PDF
  const handleSaveQuoteAndGeneratePdf = async (
    payload: Partial<QuoteRecord>,
    downloadAfterSave: boolean
  ): Promise<QuoteRecord | null> => {
    const isUpdate = Boolean(payload.id);
    const url = isUpdate ? `/api/quotes/${payload.id}` : '/api/quotes';
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.ok && data.quote) {
      const savedQuote = data.quote as QuoteRecord;
      setActiveDraftOrSavedQuote(savedQuote);
      await fetchState(true);
      showToast(
        isUpdate
          ? 'Szerkesztett PDF frissítve és elmentve!'
          : 'Új PDF Árajánlat legenerálva és elmentve!',
        `${savedQuote.customerName} (${savedQuote.quoteNumber}) — bármikor újra szerkeszthető.`
      );
      if (!downloadAfterSave) {
        setActiveModule('saved_quotes');
      }
      return savedQuote;
    }
    return null;
  };

  const handleDuplicateQuote = async (quote: QuoteRecord) => {
    const copyPayload: Partial<QuoteRecord> = {
      ...JSON.parse(JSON.stringify(quote)),
      id: undefined,
      quoteNumber: undefined,
      customerName: `${quote.customerName} (Másolat)`,
      isEditedAfterGeneration: false,
    };
    await handleSaveQuoteAndGeneratePdf(copyPayload, false);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
    await fetchState(true);
    showToast('Árajánlat törölve', 'Az árajánlat eltávolítva a listából.');
  };

  const handleUpdateQuoteStatus = async (
    quoteId: string,
    status: QuoteStatus
  ) => {
    await fetch(`/api/quotes/${quoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchState(true);
    showToast('Státusz frissítve', `Új státusz: ${status}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700 flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold">{t.title}</div>
              <div className="text-xs text-slate-300 mt-0.5">{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg shadow">
              Á
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                {config.companyName || 'Egyedi Pergola & Árnyékoló Árazó'}
              </div>
              <div className="text-[11px] text-slate-400">
                Sablon Varázsló • Végigvezetett Árazó • Utólag is Szerkeszthető
                PDF Építő
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveModule('template_builder')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeModule === 'template_builder'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              1. Sablon & Termék Varázsló ({templates.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('guided_wizard')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeModule === 'guided_wizard'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              2. Végigvezetett Árazó (Mit kér az ügyfél?)
            </button>

            <button
              type="button"
              onClick={() => {
                if (!activeDraftOrSavedQuote) {
                  setActiveDraftOrSavedQuote({
                    customerName: 'Minta Ügyfél',
                    greetingName: 'Minta Ügyfél',
                    city: 'Budapest',
                    widthCm: 600,
                    projectionCm: 400,
                    heightCm: 250,
                    mountType: 'Épülethez rögzített',
                    eurHufRate: config.defaultEurHufRate || 400,
                    deliveryFeeHuf: config.defaultDeliveryFeeHuf ?? 40000,
                    blocks: [
                      {
                        id: `blk_intro_${Date.now()}`,
                        type: 'text_box',
                        title: 'Kedves Minta Ügyfél!',
                        content:
                          'Örömmel fogadtuk megkeresését! Kérésének megfelelően küldjük személyre szabott árajánlatunkat.',
                        textStyle: 'greeting',
                      },
                    ],
                  });
                }
                setActiveModule('pdf_editor');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeModule === 'pdf_editor'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              3. Blokkos PDF Szerkesztő
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('saved_quotes')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeModule === 'saved_quotes'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              Elmentett PDF-ek ({quotes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('settings')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeModule === 'settings'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Beállítások
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            Rendszer betöltése...
          </div>
        ) : (
          <>
            {activeModule === 'template_builder' && (
              <TemplateBuilderView
                config={config}
                categories={categories}
                templates={templates}
                mediaLibrary={mediaLibrary}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onSaveTemplate={handleSaveTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                onUploadImage={handleUploadImage}
                onStartGuidedPricing={() => setActiveModule('guided_wizard')}
              />
            )}

            {activeModule === 'guided_wizard' && (
              <GuidedQuoteWizardView
                config={config}
                categories={categories}
                templates={templates}
                onOpenTemplateBuilder={() =>
                  setActiveModule('template_builder')
                }
                onFinishWizardToEditor={(draftQuote) => {
                  setActiveDraftOrSavedQuote(draftQuote);
                  setActiveModule('pdf_editor');
                }}
              />
            )}

            {activeModule === 'pdf_editor' && activeDraftOrSavedQuote && (
              <PdfBlockEditorView
                key={activeDraftOrSavedQuote.id || 'draft_editor'}
                config={config}
                categories={categories}
                templates={templates}
                mediaLibrary={mediaLibrary}
                initialQuote={activeDraftOrSavedQuote}
                onUploadImage={handleUploadImage}
                onSaveQuoteAndGeneratePdf={handleSaveQuoteAndGeneratePdf}
                onBackToWizard={() => setActiveModule('guided_wizard')}
              />
            )}

            {activeModule === 'saved_quotes' && (
              <SavedQuotesListView
                quotes={quotes}
                onEditQuoteInPdfEditor={(quoteToEdit) => {
                  setActiveDraftOrSavedQuote(quoteToEdit);
                  setActiveModule('pdf_editor');
                }}
                onDuplicateQuote={handleDuplicateQuote}
                onDeleteQuote={handleDeleteQuote}
                onUpdateStatus={handleUpdateQuoteStatus}
                onStartNewQuote={() => setActiveModule('guided_wizard')}
              />
            )}

            {activeModule === 'settings' && (
              <BrandingSettingsView
                config={config}
                onSaveConfig={handleSaveSystemConfig}
                onUploadImage={handleUploadImage}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
