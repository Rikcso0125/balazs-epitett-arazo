'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Mail,
  Percent,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  getAllProductTypes,
  getDefaultPhotosForModel,
} from '@/lib/constants';
import { AdminConfig, ModelPricingRule, TermekTipusId } from '@/lib/types';
import { formatCurrency } from './DashboardAnalyticsView';

export type AdminSubTab = 'models' | 'm2tiers' | 'general' | 'email';

interface AdminPanelViewProps {
  config: AdminConfig;
  initialSubTab?: AdminSubTab;
  onSaveConfig: (
    newConfig: AdminConfig,
    recalculateAll: boolean
  ) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onOpenTemplateWizard?: (
    modelToEdit?: ModelPricingRule | null,
    initialStep?: number
  ) => void;
}

export function AdminPanelView({
  config,
  initialSubTab = 'models',
  onSaveConfig,
  onResetDefaults,
  onOpenTemplateWizard,
}: AdminPanelViewProps) {
  const [draft, setDraft] = useState<AdminConfig>(() =>
    JSON.parse(JSON.stringify(config))
  );
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialSubTab);
  const [categoryFilter, setCategoryFilter] = useState<TermekTipusId | 'all'>(
    'all'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(config)));
  }, [config]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const allProductTypes = getAllProductTypes(draft);

  const updateGeneral = (field: keyof AdminConfig['general'], value: any) => {
    setDraft((prev) => ({
      ...prev,
      general: { ...prev.general, [field]: value },
    }));
  };

  const updateEmail = (
    field: keyof AdminConfig['emailSettings'],
    value: any
  ) => {
    setDraft((prev) => ({
      ...prev,
      emailSettings: { ...prev.emailSettings, [field]: value },
    }));
  };

  const updateModel = (
    modelId: string,
    field: keyof ModelPricingRule,
    value: any
  ) => {
    setDraft((prev) => ({
      ...prev,
      models: {
        ...prev.models,
        [modelId]: {
          ...prev.models[modelId],
          [field]: value,
        },
      },
    }));
  };

  const handleDeleteCustomModel = async (modelId: string) => {
    const nextModels = { ...draft.models };
    delete nextModels[modelId];
    const nextConfig: AdminConfig = { ...draft, models: nextModels };
    setDraft(nextConfig);
    await onSaveConfig(nextConfig, false);
  };

  const handleSwapModelPhotosOrder = async (modelId: string) => {
    const m = draft.models[modelId];
    if (!m) return;
    const currentPhotos =
      m.pdfPhotos && m.pdfPhotos.length >= 2
        ? m.pdfPhotos
        : getDefaultPhotosForModel(m.id, m.category);
    const swapped = [
      { ...currentPhotos[1] },
      { ...currentPhotos[0] },
    ];
    const nextConfig: AdminConfig = {
      ...draft,
      models: {
        ...draft.models,
        [modelId]: {
          ...m,
          pdfPhotos: swapped,
        },
      },
    };
    setDraft(nextConfig);
    await onSaveConfig(nextConfig, false);
  };

  const updateM2Tier = (
    groupKey: keyof AdminConfig['m2Tiers'],
    index: number,
    field: 'maxM2' | 'eurPerM2' | 'fixEur',
    value: number
  ) => {
    setDraft((prev) => {
      const list = [...(prev.m2Tiers[groupKey] as any[])];
      list[index] = { ...list[index], [field]: value };
      return {
        ...prev,
        m2Tiers: {
          ...prev.m2Tiers,
          [groupKey]: list,
        },
      };
    });
  };

  const handleSave = async (recalculateAll: boolean) => {
    setSaving(true);
    try {
      await onSaveConfig(draft, recalculateAll);
    } finally {
      setSaving(false);
    }
  };

  const modelEntries = Object.values(draft.models).filter(
    (m) => categoryFilter === 'all' || m.category === categoryFilter
  );

  return (
    <div className="space-y-5">
      {/* HelloTeam ERP Module Top Header Card */}
      <div className="ht-module-header p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#0a0a0a]">
            Adminisztráció · Sablonok, Százalékok & Árazási Szabályok
          </h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1 max-w-3xl">
            Programozói tudás nélkül, egyszerűen módosítható minden sablon szorzója, kedvezmény százaléka,
            szerelési díja, vagy kattintással felvihető teljesen új pergola/árnyékoló sablon a lépésről lépésre kérdező varázslóval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenTemplateWizard && (
            <button
              type="button"
              onClick={() => onOpenTemplateWizard(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Új Sablon Felvitele (Varázsló)
            </button>
          )}

          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-[#d6d6d6] text-[#4a4a4a] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Gyári alapértékek
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#f3f3f3] border border-[#d6d6d6] text-[#0a0a0a] hover:bg-[#e5e5e5] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            Mentés & ajánlatok újraszámolása
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold bg-[#0a0a0a] text-white hover:bg-[#262626] transition shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            Beállítások mentése
          </button>
        </div>
      </div>

      {/* Underline Sub-Tabs (HelloTeam style) */}
      <div className="border-b border-[#e8e8e8] flex items-center gap-6 overflow-x-auto">
        {[
          {
            id: 'models' as const,
            label: `1. Sablonok & Modellenkénti szorzók (${Object.keys(draft.models).length} sablon)`,
            icon: Percent,
          },
          {
            id: 'm2tiers' as const,
            label: '2. M² sávos ártáblák',
            icon: Layers,
          },
          {
            id: 'general' as const,
            label: '3. Globális paraméterek & Árfolyam',
            icon: Sliders,
          },
          {
            id: 'email' as const,
            label: '4. Email sablon & Tracking Pixel',
            icon: Mail,
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`pb-2.5 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                active
                  ? 'border-[#0a0a0a] text-[#0a0a0a]'
                  : 'border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MODELS */}
      {activeSubTab === 'models' && (
        <div className="space-y-4">
          {/* Category Filter Pills + New Template CTA */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  categoryFilter === 'all'
                    ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                    : 'bg-white text-[#4a4a4a] border-[#e0e0e0] hover:border-[#0a0a0a]'
                }`}
              >
                Összes sablon ({Object.keys(draft.models).length})
              </button>
              {allProductTypes.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => setCategoryFilter(pt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    categoryFilter === pt.id
                      ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                      : 'bg-white text-[#4a4a4a] border-[#e0e0e0] hover:border-[#0a0a0a]'
                  }`}
                >
                  {pt.shortName}
                </button>
              ))}
            </div>

            {onOpenTemplateWizard && (
              <button
                type="button"
                onClick={() => onOpenTemplateWizard(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0a0a0a] text-white hover:bg-[#27272a] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Új sablon felvitele kérdés-felelet varázslóval
              </button>
            )}
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {modelEntries.map((m) => {
              const discountFromMultiplier = Math.round((1 - m.szorzo) * 100);
              const modelPhotos =
                m.pdfPhotos && m.pdfPhotos.length >= 2
                  ? m.pdfPhotos
                  : getDefaultPhotosForModel(m.id, m.category);
              return (
                <div
                  key={m.id}
                  className={`ht-kpi-card p-5 pl-6 ${
                    !m.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#efefef]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-extrabold text-[#0a0a0a]">
                          {m.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#f3f3f3] border border-[#e5e5e5] text-[10.5px] font-semibold text-[#4a4a4a]">
                          {
                            allProductTypes.find((p) => p.id === m.category)
                              ?.shortName || m.category
                          }
                        </span>
                        {m.isCustomTemplate ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                            Új Egyedi Sablon
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#fafafa] border border-[#e4e4e7] text-[10px] font-bold text-[#71717a]">
                            Régi / Gyári Sablon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6b6b6b] mt-0.5">
                        {m.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenTemplateWizard && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenTemplateWizard(m, 7)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#d6d6d6] bg-[#fafafa] px-2.5 py-1 text-[11px] font-bold text-[#0a0a0a] hover:bg-[#f4f4f5] transition"
                            title="2 PDF látványfotó, sorrend és képleírások beállítása ehhez a sablonhoz"
                          >
                            <ImageIcon className="w-3 h-3" />
                            2 Fotó & Sorrend
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenTemplateWizard(m, 1)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#d6d6d6] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0a0a0a] hover:bg-[#f4f4f5] transition"
                            title="Sablon megnyitása a lépésről lépésre kérdező varázslóban"
                          >
                            <Sparkles className="w-3 h-3" />
                            Varázsló
                          </button>
                        </>
                      )}
                      {m.isCustomTemplate && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomModel(m.id)}
                          className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 transition"
                          title="Egyedi sablon törlése"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={(e) =>
                            updateModel(m.id, 'enabled', e.target.checked)
                          }
                          className="w-4 h-4 accent-[#0a0a0a] rounded"
                        />
                        Aktív
                      </label>
                    </div>
                  </div>

                  {/* PDF FOTÓK SORRENDJE ÉS LEÍRÁSA (RÉGI ÉS ÚJ SABLONOKNÁL EGYARÁNT) */}
                  <div className="mt-3 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0a0a0a]">
                        PDF Látványfotók Sorrendje (1. oldal → 2. oldal)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSwapModelPhotosOrder(m.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#0a0a0a] bg-white px-2.5 py-1 text-[10.5px] font-extrabold text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition"
                          title="1. és 2. PDF fotó (és leírásuk) sorrendjének megcserélése"
                        >
                          <ArrowLeftRight className="h-3 w-3" />
                          Sorrend csere (1. ↔ 2.)
                        </button>
                        {onOpenTemplateWizard && (
                          <button
                            type="button"
                            onClick={() => onOpenTemplateWizard(m, 7)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#0a0a0a] px-2.5 py-1 text-[10.5px] font-extrabold text-white hover:bg-[#27272a] transition"
                          >
                            <ImageIcon className="h-3 w-3" />
                            Fotók & Leírás módosítása
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div className="flex items-center gap-2.5 rounded-lg border border-[#e4e4e7] bg-white p-2">
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e4e4e7] bg-[#f4f4f5]">
                          <img
                            src={modelPhotos[0]?.url}
                            alt="1. PDF Fotó"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="inline-block rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[9.5px] font-extrabold text-white">
                            1. FOTÓ (1. oldal)
                          </span>
                          <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-[#52525b]">
                            {modelPhotos[0]?.description || 'Nincs leírás'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-lg border border-[#e4e4e7] bg-white p-2">
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e4e4e7] bg-[#f4f4f5]">
                          <img
                            src={modelPhotos[1]?.url}
                            alt="2. PDF Fotó"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="inline-block rounded bg-[#27272a] px-1.5 py-0.5 text-[9.5px] font-extrabold text-white">
                            2. FOTÓ (2. oldal)
                          </span>
                          <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-[#52525b]">
                            {modelPhotos[1]?.description || 'Nincs leírás'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3.5 text-xs">
                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Árszorzó ({discountFromMultiplier}% gyári kedv.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={m.szorzo}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'szorzo',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-extrabold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Extra kedvezmény (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={m.extraDiscountPct}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'extraDiscountPct',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-extrabold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Fix felár (EUR)
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={m.fixFelarEur}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'fixFelarEur',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-extrabold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Motor ár (EUR)
                      </label>
                      <input
                        type="number"
                        value={m.motorEur}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'motorEur',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Távirányító (EUR)
                      </label>
                      <input
                        type="number"
                        value={m.taviranyitoEur}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'taviranyitoEur',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        LED világítás (EUR)
                      </label>
                      <input
                        type="number"
                        value={m.ledEur}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'ledEur',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Szerelés % (Kis érték)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={m.szerelesPctLow}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'szerelesPctLow',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Szerelés % (Közép)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={m.szerelesPctMid}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'szerelesPctMid',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#3d3d3d] mb-1">
                        Szerelés % (Nagy érték)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={m.szerelesPctHigh}
                        onChange={(e) =>
                          updateModel(
                            m.id,
                            'szerelesPctHigh',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: M2 TIERS */}
      {activeSubTab === 'm2tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              {
                key: 'seeskyBioFree',
                title: 'SeeSky Bio — Szabadon álló (EUR / m²)',
                field: 'eurPerM2',
              },
              {
                key: 'seeskyBioWall',
                title: 'SeeSky Bio — Épülethez rögzített (EUR / m²)',
                field: 'eurPerM2',
              },
              {
                key: 'uvegfalLengyel',
                title: 'Eltolható üvegfal — Lengyel (EUR / m²)',
                field: 'eurPerM2',
              },
              {
                key: 'uvegfalSpanyol',
                title: 'Eltolható üvegfal — Spanyol SeeGlass (EUR / m²)',
                field: 'eurPerM2',
              },
              {
                key: 'polifix2Lab',
                title: 'Polifix polikarbonátos — 2 lábas (EUR / m²)',
                field: 'eurPerM2',
              },
              {
                key: 'glassfix2Lab',
                title: 'Glassfix üvegtetős — 2 lábas (EUR / m²)',
                field: 'eurPerM2',
              },
            ] as const
          ).map((group) => (
            <div key={group.key} className="ht-card p-5">
              <h3 className="text-[14.5px] font-extrabold text-[#0a0a0a] pb-3 border-b border-[#efefef]">
                {group.title}
              </h3>
              <div className="space-y-2 mt-3">
                {(draft.m2Tiers[group.key] as any[]).map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 bg-[#f6f6f6] px-3.5 py-2 rounded-lg border border-[#eaeaea] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#6b6b6b] font-medium">
                        Max m² határ:
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        value={tier.maxM2}
                        onChange={(e) =>
                          updateM2Tier(
                            group.key,
                            idx,
                            'maxM2',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-20 px-2 py-1 rounded bg-white border border-[#d6d6d6] font-bold text-[#0a0a0a] tabular-nums"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={tier[group.field]}
                        onChange={(e) =>
                          updateM2Tier(
                            group.key,
                            idx,
                            group.field,
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-24 px-2 py-1 rounded bg-white border border-[#d6d6d6] font-extrabold text-[#0a0a0a] text-right tabular-nums"
                      />
                      <span className="font-bold text-[#4a4a4a]">EUR/m²</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: GENERAL SETTINGS */}
      {activeSubTab === 'general' && (
        <div className="ht-card p-6 max-w-4xl">
          <h2 className="text-[16px] font-extrabold text-[#0a0a0a] pb-3 border-b border-[#efefef] mb-4">
            Globális árazási szorzók és szerelési százalékok
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Listaár megjelenítési szorzó (pl. 1.25)
              </label>
              <input
                type="number"
                step="0.01"
                value={draft.general.listaArSzorzo}
                onChange={(e) =>
                  updateGeneral('listaArSzorzo', Number(e.target.value) || 1.25)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                PDF fejléc kedvezmény címke (%)
              </label>
              <input
                type="number"
                value={draft.general.discountBadgePct}
                onChange={(e) =>
                  updateGeneral('discountBadgePct', Number(e.target.value) || 20)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Alapértelmezett EUR / HUF árfolyam
              </label>
              <input
                type="number"
                step="0.5"
                value={draft.general.defaultEurHufRate}
                onChange={(e) =>
                  updateGeneral(
                    'defaultEurHufRate',
                    Number(e.target.value) || 400
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Alapértelmezett szállítási díj (Ft)
              </label>
              <input
                type="number"
                value={draft.general.defaultSzallitasiDij}
                onChange={(e) =>
                  updateGeneral(
                    'defaultSzallitasiDij',
                    Number(e.target.value) || 0
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                ZIP szerelés % (Bioklimatikushoz)
              </label>
              <input
                type="number"
                value={draft.general.zipSzerelesBioklimatikusPct}
                onChange={(e) =>
                  updateGeneral(
                    'zipSzerelesBioklimatikusPct',
                    Number(e.target.value) || 8
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Üvegfal szerelési díj (%)
              </label>
              <input
                type="number"
                value={draft.general.uvegfalSzerelesPct}
                onChange={(e) =>
                  updateGeneral(
                    'uvegfalSzerelesPct',
                    Number(e.target.value) || 12
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-bold text-[#0a0a0a]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMAIL & TRACKING PIXEL */}
      {activeSubTab === 'email' && (
        <div className="ht-card p-6 max-w-4xl space-y-4 text-xs">
          <h2 className="text-[16px] font-extrabold text-[#0a0a0a] pb-3 border-b border-[#efefef]">
            Email Kiküldés (Valós SMTP) & Automatikus 1×1 Tracking Pixel Sablon
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Feladó megjelenített neve
              </label>
              <input
                type="text"
                value={draft.emailSettings.senderName}
                onChange={(e) => updateEmail('senderName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Feladó email címe
              </label>
              <input
                type="email"
                value={draft.emailSettings.senderEmail}
                onChange={(e) => updateEmail('senderEmail', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                SMTP Szerver (pl. smtp.gmail.com)
              </label>
              <input
                type="text"
                value={draft.emailSettings.smtpHost}
                onChange={(e) => updateEmail('smtpHost', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                SMTP Port (pl. 587 vagy 465)
              </label>
              <input
                type="number"
                value={draft.emailSettings.smtpPort}
                onChange={(e) =>
                  updateEmail('smtpPort', Number(e.target.value) || 587)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                SMTP Felhasználónév / Email
              </label>
              <input
                type="text"
                value={draft.emailSettings.smtpUser}
                onChange={(e) => updateEmail('smtpUser', e.target.value)}
                placeholder="info@openskypergola.hu"
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                SMTP Jelszó / Alkalmazásjelszó
              </label>
              <input
                type="password"
                value={draft.emailSettings.smtpPass}
                onChange={(e) => updateEmail('smtpPass', e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3d3d3d] mb-1">
                Tracking Pixel Publikus URL (Base URL)
              </label>
              <input
                type="text"
                value={draft.emailSettings.publicBaseUrl}
                onChange={(e) => updateEmail('publicBaseUrl', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-mono text-[#0a0a0a]"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 font-bold text-[#0a0a0a] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.emailSettings.enableTrackingPixel}
                  onChange={(e) =>
                    updateEmail('enableTrackingPixel', e.target.checked)
                  }
                  className="w-4 h-4 accent-[#0a0a0a]"
                />
                1×1 GIF Megnyitáskövető Pixel automatikus beágyazása csak a valóban kiküldött emailekbe
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#3d3d3d] mb-1">
              Alapértelmezett Email Tárgy Sablon
            </label>
            <input
              type="text"
              value={draft.emailSettings.subjectTemplate}
              onChange={(e) => updateEmail('subjectTemplate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#3d3d3d] mb-1">
              Alapértelmezett Email Szöveg Sablon
            </label>
            <textarea
              rows={5}
              value={draft.emailSettings.bodyTemplate}
              onChange={(e) => updateEmail('bodyTemplate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#d6d6d6] font-medium text-[#0a0a0a]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
