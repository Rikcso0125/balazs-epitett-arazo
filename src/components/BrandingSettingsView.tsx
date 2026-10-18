'use client';

import React, { useState } from 'react';
import { Save, Trash2, Upload } from 'lucide-react';
import { TEMPLATE_VARIABLES_HELP } from '@/lib/constants';
import { SystemConfig } from '@/lib/types';

interface BrandingSettingsViewProps {
  config: SystemConfig;
  onSaveConfig: (nextConfig: SystemConfig) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function BrandingSettingsView({
  config,
  onSaveConfig,
  onUploadImage,
}: BrandingSettingsViewProps) {
  const [form, setForm] = useState<SystemConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveConfig(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Cégadatok, PDF Fejléc/Lábléc és Alapértelmezett Szövegek
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Itt töltheted fel a saját PDF fejléc/lábléc háttérképedet,
              logódat, névjegyedet, és itt állíthatod be az automatikus
              üdvözlő szövegeket.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Mentés...' : 'Beállítások Mentése'}
          </button>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Cégnév / Fejléc cím a PDF-ben
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Fejléc Alcím / Tevékenységek
            </label>
            <input
              type="text"
              value={form.companySubtitle}
              onChange={(e) =>
                setForm({ ...form, companySubtitle: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              E-mail cím (láblécben)
            </label>
            <input
              type="text"
              value={form.companyEmail}
              onChange={(e) =>
                setForm({ ...form, companyEmail: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Telefonszám (láblécben)
            </label>
            <input
              type="text"
              value={form.companyPhone}
              onChange={(e) =>
                setForm({ ...form, companyPhone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        {/* Default Rates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Alapértelmezett EUR/HUF árfolyam
            </label>
            <input
              type="number"
              value={form.defaultEurHufRate}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultEurHufRate: Number(e.target.value),
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Alapértelmezett Szállítási díj (Ft)
            </label>
            <input
              type="number"
              value={form.defaultDeliveryFeeHuf}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultDeliveryFeeHuf: Number(e.target.value),
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Kedvezmény címke a táblázatban
            </label>
            <input
              type="text"
              value={form.defaultDiscountLabel}
              onChange={(e) =>
                setForm({ ...form, defaultDiscountLabel: e.target.value })
              }
              placeholder="-20%"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        {/* Custom PDF Background / Logo / Signature Card Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-900">
              Saját A4 Fejléc/Lábléc Háttérkép
            </div>
            <p className="text-[11px] text-slate-500">
              Ha feltöltesz egy egész oldalas A4-es háttérképet, minden PDF oldalra
              az kerül. Ha üres, modern fejlécet rajzol a rendszer.
            </p>
            {form.pdfPageBackgroundUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={form.pdfPageBackgroundUrl}
                  alt=""
                  className="w-16 h-20 object-cover rounded border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, pdfPageBackgroundUrl: '' })
                  }
                  className="text-xs text-rose-600 font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Törlés
                </button>
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Feltöltés...' : 'Háttérkép feltöltése'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const url = await onUploadImage(f);
                    if (url) setForm({ ...form, pdfPageBackgroundUrl: url });
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-900">
              Céges Logó a Fejlécbe
            </div>
            <p className="text-[11px] text-slate-500">
              Megjelenik a PDF felső fejlécében a cégnév mellett.
            </p>
            {form.pdfLogoUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={form.pdfLogoUrl}
                  alt=""
                  className="w-20 h-12 object-contain rounded border border-slate-300 bg-white p-1"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pdfLogoUrl: '' })}
                  className="text-xs text-rose-600 font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Törlés
                </button>
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Logó feltöltése
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const url = await onUploadImage(f);
                    if (url) setForm({ ...form, pdfLogoUrl: url });
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-900">
              Névjegykártya / Aláírás kép a PDF végére
            </div>
            <p className="text-[11px] text-slate-500">
              Az árajánlat utolsó oldalának alján jelenik meg.
            </p>
            {form.pdfSignatureCardUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={form.pdfSignatureCardUrl}
                  alt=""
                  className="w-24 h-14 object-cover rounded border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pdfSignatureCardUrl: '' })}
                  className="text-xs text-rose-600 font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Törlés
                </button>
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Névjegy feltöltése
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const url = await onUploadImage(f);
                    if (url) setForm({ ...form, pdfSignatureCardUrl: url });
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Default Text Automation Templates */}
        <div className="space-y-4 pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700">
            Alapértelmezett Automatikus Szövegsablonok (Név- és méret-helyettesítéssel):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES_HELP.map((v) => (
              <span
                key={v.token}
                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono"
              >
                {v.token}
              </span>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alapértelmezett Megszólítás
            </label>
            <input
              type="text"
              value={form.defaultGreetingTemplate}
              onChange={(e) =>
                setForm({ ...form, defaultGreetingTemplate: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alapértelmezett Bevezető Szövegdoboz (a PDF elején)
            </label>
            <textarea
              rows={3}
              value={form.defaultIntroTemplate}
              onChange={(e) =>
                setForm({ ...form, defaultIntroTemplate: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alapértelmezett Záró Információs Szövegdoboz (a PDF végén)
            </label>
            <textarea
              rows={4}
              value={form.defaultClosingInfoTemplate}
              onChange={(e) =>
                setForm({ ...form, defaultClosingInfoTemplate: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
