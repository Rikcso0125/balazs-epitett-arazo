'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Ruler,
  Save,
  Trash2,
} from 'lucide-react';
import { TEMPLATE_STATUS_OPTIONS } from '@/lib/constants';
import {
  CatalogReference,
  ProductCategory,
  ProductMenu,
  QuoteTemplate,
  TemplateSizeLimits,
  TemplateStatus,
  PhotoCaptionBlock,
} from '@/lib/types';
import { btn, PageHeader } from '@/components/ui';

interface CatalogManagerViewProps {
  menus: ProductMenu[];
  categories: ProductCategory[];
  templates: QuoteTemplate[];
  onSave: (payload: {
    menus: ProductMenu[];
    categories: ProductCategory[];
    templates: QuoteTemplate[];
  }) => Promise<void>;
  onEditTemplate: (templateId: string) => void;
  onNewTemplate: (categoryId: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}

const byOrder = <T extends { order?: number }>(a: T, b: T) =>
  (a.order ?? 0) - (b.order ?? 0);

/**
 * Egy listán belül feljebb/lejjebb mozgat egy elemet, és 1..n sorszámot ad.
 * Csak a `scope`-ba tartozó elemek sorrendje változik.
 */
function moveInScope<T extends { id: string; order?: number }>(
  all: T[],
  inScope: (item: T) => boolean,
  id: string,
  direction: -1 | 1
): T[] {
  const scoped = all.filter(inScope).sort(byOrder);
  const idx = scoped.findIndex((x) => x.id === id);
  const target = idx + direction;
  if (idx < 0 || target < 0 || target >= scoped.length) return all;
  const reordered = [...scoped];
  [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
  const newOrder = new Map(reordered.map((x, i) => [x.id, i + 1]));
  return all.map((x) =>
    newOrder.has(x.id) ? { ...x, order: newOrder.get(x.id) } : x
  );
}

const SIZE_ROWS: [string, keyof TemplateSizeLimits, keyof TemplateSizeLimits][] = [
  ['Szélesség', 'minWidthCm', 'maxWidthCm'],
  ['Kinyúlás', 'minProjectionCm', 'maxProjectionCm'],
  ['Magasság', 'minHeightCm', 'maxHeightCm'],
];

function hasSizeLimits(tpl: QuoteTemplate): boolean {
  return Object.values(tpl.sizeLimits || {}).some((v) => Number(v) > 0);
}

function hasCatalogRef(tpl: QuoteTemplate): boolean {
  return Boolean(tpl.catalogRef?.pdfFile || tpl.catalogRef?.pages);
}

// Ár nélküli tétel: 1 EUR (gyors extra még kitöltetlen ára), üres mérettábla vagy sávos ár
function hasMissingPrice(tpl: QuoteTemplate): boolean {
  return (tpl.materials || []).some((m) => {
    if (m.itemRole === 'gift' || m.pricingMode === 'percentage') return false;
    if (m.pricingMode === 'fixed') return !(Number(m.basePrice) > 1);
    if (m.pricingMode === 'matrix_cm')
      return !m.matrixTable?.rows?.length || !m.matrixTable?.cols?.length;
    if (m.pricingMode === 'tiered_m2') return !m.m2Tiers?.length;
    return !(Number(m.unitPrice) > 1);
  });
}

type MissingKey = 'size' | 'catalog' | 'photo' | 'price';

const MISSING_LABELS: Record<MissingKey, string> = {
  size: 'méretkorlát',
  catalog: 'katalógus',
  photo: 'fotó',
  price: 'ár',
};

/** Mi hiányzik még egy sablonból (teszt és inaktív sablonnál nem számít) */
function getMissing(tpl: QuoteTemplate): MissingKey[] {
  if (tpl.status === 'inactive' || tpl.status === 'test') return [];
  const out: MissingKey[] = [];
  if (!hasSizeLimits(tpl)) out.push('size');
  if (!hasCatalogRef(tpl)) out.push('catalog');
  if (!(tpl.photos || []).some((p) => p.imageUrl)) out.push('photo');
  if (hasMissingPrice(tpl)) out.push('price');
  return out;
}

async function uploadPhotos(
  files: FileList | null,
  onUploadImage: (file: File) => Promise<string | null>
): Promise<PhotoCaptionBlock[]> {
  const added: PhotoCaptionBlock[] = [];
  for (const file of Array.from(files || [])) {
    const url = await onUploadImage(file);
    if (url) {
      added.push({
        id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: url,
        captionBelow: '',
        widthPct: 75,
        align: 'center',
      });
    }
  }
  return added;
}

/**
 * Kis képek sora (részletképek, extrák képei): feliratozható, törölhető, bővíthető.
 */
function MiniPhotos({
  photos,
  onChange,
  onUploadImage,
  addLabel,
}: {
  photos: PhotoCaptionBlock[];
  onChange: (next: PhotoCaptionBlock[]) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  addLabel: string;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="flex flex-wrap items-start gap-2">
      {photos.map((ph, idx) => (
        <div key={ph.id || idx} className="w-28">
          <div className="relative w-28 h-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
            <img src={ph.imageUrl} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, i) => i !== idx))}
              className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-white/90 text-slate-600 hover:text-rose-600 text-xs"
              title="Törlés"
            >
              ×
            </button>
          </div>
          <input
            value={ph.captionBelow || ''}
            onChange={(e) =>
              onChange(photos.map((p, i) => (i === idx ? { ...p, captionBelow: e.target.value } : p)))
            }
            placeholder="Felirat"
            className="mt-1 w-full px-1.5 py-0.5 rounded border border-slate-200 text-xs"
          />
        </div>
      ))}
      <label className="w-28 h-20 rounded-md border border-dashed border-slate-300 grid place-items-center text-center text-xs text-slate-500 hover:bg-slate-50 cursor-pointer px-1">
        {uploading ? 'Feltöltés…' : addLabel}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            setUploading(true);
            const added = await uploadPhotos(e.target.files, onUploadImage);
            e.target.value = '';
            setUploading(false);
            if (added.length) onChange([...photos, ...added]);
          }}
        />
      </label>
    </div>
  );
}

/**
 * Sablon fotói: feltöltés (több is), főkép, sorrend, képaláírás, törlés.
 * Az első kép a főkép: ez látszik az árazóban és nagyban a PDF-ben.
 */
function PhotoStrip({
  photos,
  onChange,
  onUploadImage,
}: {
  photos: PhotoCaptionBlock[];
  onChange: (next: PhotoCaptionBlock[]) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const [uploading, setUploading] = useState(false);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added = await uploadPhotos(files, onUploadImage);
    onChange([...photos, ...added]);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-slate-700">
          Fotók ({photos.length}) – az első a főkép
        </div>
        <label className="text-[13px] text-slate-600 hover:text-slate-950 cursor-pointer inline-flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />
          {uploading ? 'Feltöltés…' : 'Fotó feltöltése'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {photos.length === 0 ? (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
          className="block rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 cursor-pointer hover:bg-slate-50"
        >
          Húzd ide a fotókat, vagy kattints a feltöltéshez
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      ) : (
        <div
          className="space-y-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {photos.map((ph, idx) => (
            <div
              key={ph.id || idx}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-2.5"
            >
              <a
                href={ph.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="relative w-36 sm:w-44 aspect-[4/3] shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-200"
                title="Megnyitás teljes méretben"
              >
                <img src={ph.imageUrl} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[11px] font-semibold">
                    Főkép
                  </span>
                )}
              </a>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <input
                  value={ph.titleAbove || ''}
                  onChange={(e) =>
                    onChange(photos.map((p, i) => (i === idx ? { ...p, titleAbove: e.target.value } : p)))
                  }
                  placeholder="Cím a kép fölött (opcionális)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium"
                />
                <textarea
                  rows={3}
                  value={ph.captionBelow || ''}
                  onChange={(e) =>
                    onChange(photos.map((p, i) => (i === idx ? { ...p, captionBelow: e.target.value } : p)))
                  }
                  placeholder="Képaláírás – ez jelenik meg a kép alatt a PDF-ben"
                  className="w-full flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm leading-snug resize-y"
                />
                <div className="flex items-center gap-1 text-slate-500">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => move(idx, idx - 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                    title="Előrébb"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === photos.length - 1}
                    onClick={() => move(idx, idx + 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                    title="Hátrébb"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => move(idx, 0)}
                      className="px-2 py-1 rounded-lg hover:bg-slate-100 text-[13px]"
                    >
                      Legyen a főkép
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Törlöd ezt a fotót?')) {
                        onChange(photos.filter((_, i) => i !== idx));
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[13px] hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Törlés
                  </button>
                </div>
                <div className="pt-1">
                  <div className="text-xs text-slate-500 mb-1">
                    Részletképek a nagy kép alatt (pl. motor, LED, profil)
                  </div>
                  <MiniPhotos
                    photos={ph.subPhotos || []}
                    onChange={(next) =>
                      onChange(photos.map((p, i) => (i === idx ? { ...p, subPhotos: next } : p)))
                    }
                    onUploadImage={onUploadImage}
                    addLabel="+ Részletkép"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="text-xs text-slate-500">
            Új fotót ide is húzhatsz. A cím és a képaláírás a PDF-ben jelenik meg.
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ tpl }: { tpl: QuoteTemplate }) {
  const url = tpl.photos?.find((p) => p.imageUrl)?.imageUrl;
  return (
    <div className="w-14 h-10 rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0 grid place-items-center">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[10px] text-slate-400">nincs</span>
      )}
    </div>
  );
}

function MissingNote({ missing }: { missing: MissingKey[] }) {
  if (missing.length === 0) return null;
  return (
    <div className="text-xs text-amber-700 mt-0.5">
      Hiányzik: {missing.map((k) => MISSING_LABELS[k]).join(' · ')}
    </div>
  );
}

export function CatalogManagerView({
  menus,
  categories,
  templates,
  onSave,
  onEditTemplate,
  onNewTemplate,
  onUploadImage,
}: CatalogManagerViewProps) {
  const [draftMenus, setDraftMenus] = useState<ProductMenu[]>(menus);
  const [draftCategories, setDraftCategories] =
    useState<ProductCategory[]>(categories);
  const [draftTemplates, setDraftTemplates] =
    useState<QuoteTemplate[]>(templates);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    [...menus].sort(byOrder)[0]?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(
    null
  );
  const [newMenuName, setNewMenuName] = useState('');
  // Lista: menü → kategória → sablon; Táblázat: minden sablon mérete és katalógus adata egyben
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Ha nincs mentetlen változás, a szerverről jövő adat az irányadó
  useEffect(() => {
    if (dirty) return;
    setDraftMenus(menus);
    setDraftCategories(categories);
    setDraftTemplates(templates);
  }, [menus, categories, templates, dirty]);

  const sortedMenus = useMemo(() => [...draftMenus].sort(byOrder), [draftMenus]);
  const menuCategories = useMemo(
    () =>
      draftCategories
        .filter((c) => c.menuId === selectedMenuId)
        .sort(byOrder),
    [draftCategories, selectedMenuId]
  );

  useEffect(() => {
    if (!menuCategories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(menuCategories[0]?.id || '');
    }
  }, [menuCategories, selectedCategoryId]);

  const expandedTpl = draftTemplates.find((t) => t.id === expandedTemplateId);
  // A részletek panel a három oszlop alatt nyílik: odagörgetünk
  const detailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expandedTemplateId) {
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [expandedTemplateId]);

  const categoryTemplates = useMemo(
    () =>
      draftTemplates
        .filter((t) => t.categoryId === selectedCategoryId)
        .sort(byOrder),
    [draftTemplates, selectedCategoryId]
  );

  // Táblázat nézet: menü, kategória és sablon sorrendjében
  const tableRows = useMemo(() => {
    const menuOrder = new Map(sortedMenus.map((m, i) => [m.id, i]));
    return draftTemplates
      .map((tpl) => {
        const cat = draftCategories.find((c) => c.id === tpl.categoryId);
        const menu = draftMenus.find((m) => m.id === cat?.menuId);
        return { tpl, cat, menu };
      })
      .sort(
        (a, b) =>
          (menuOrder.get(a.menu?.id || '') ?? 99) -
            (menuOrder.get(b.menu?.id || '') ?? 99) ||
          (a.cat?.order ?? 0) - (b.cat?.order ?? 0) ||
          (a.tpl.order ?? 0) - (b.tpl.order ?? 0)
      );
  }, [draftTemplates, draftCategories, draftMenus, sortedMenus]);

  const missingCounts = (Object.keys(MISSING_LABELS) as MissingKey[]).map((k) => [
    k,
    draftTemplates.filter((t) => getMissing(t).includes(k)).length,
  ]) as [MissingKey, number][];
  const incompleteCount = draftTemplates.filter((t) => getMissing(t).length > 0).length;
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const markDirty = () => setDirty(true);

  const updateMenu = (id: string, patch: Partial<ProductMenu>) => {
    setDraftMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    markDirty();
  };

  const updateCategory = (id: string, patch: Partial<ProductCategory>) => {
    setDraftCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    markDirty();
  };

  const updateTemplate = (id: string, patch: Partial<QuoteTemplate>) => {
    setDraftTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
    markDirty();
  };

  const handleAddMenu = () => {
    const name = newMenuName.trim();
    if (!name) return;
    const menu: ProductMenu = {
      id: `menu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: '',
      enabled: true,
      order: draftMenus.length + 1,
    };
    setDraftMenus((prev) => [...prev, menu]);
    setSelectedMenuId(menu.id);
    setNewMenuName('');
    markDirty();
  };

  const handleDeleteMenu = (menu: ProductMenu) => {
    if (draftCategories.some((c) => c.menuId === menu.id)) {
      window.alert(
        'Ebben a menüpontban még vannak kategóriák. Előbb helyezd át őket egy másik menübe.'
      );
      return;
    }
    if (!window.confirm(`Törlöd a(z) „${menu.name}” menüpontot?`)) return;
    setDraftMenus((prev) => prev.filter((m) => m.id !== menu.id));
    if (selectedMenuId === menu.id) setSelectedMenuId('');
    markDirty();
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name || !selectedMenuId) return;
    const cat: ProductCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      shortName: name,
      description: '',
      questionPrompt: `Kér az ügyfél ${name.toLowerCase()}t?`,
      categoryType: 'main_structure',
      allowMultipleTemplates: true,
      order: menuCategories.length + 1,
      menuId: selectedMenuId,
    };
    setDraftCategories((prev) => [...prev, cat]);
    setSelectedCategoryId(cat.id);
    setNewCategoryName('');
    markDirty();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        menus: draftMenus,
        categories: draftCategories,
        templates: draftTemplates.map((t) => ({
          ...t,
          enabled: t.status !== 'inactive',
          updatedAt: new Date().toISOString(),
        })),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraftMenus(menus);
    setDraftCategories(categories);
    setDraftTemplates(templates);
    setDirty(false);
  };

  const arrowBtn =
    'p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Termékek"
        subtitle="Menü → kategória → sablon. Sorrend, állapot, méretkorlát és katalógus hivatkozás."
        actions={
          <>
            {dirty && (
              <button type="button" onClick={handleDiscard} className={btn.ghost}>
                <RotateCcw className="w-4 h-4" />
                Elvetés
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const target = selectedCategoryId || draftCategories[0]?.id;
                if (!target) {
                  window.alert('Előbb vegyél fel egy kategóriát.');
                  return;
                }
                if (dirty && !window.confirm('Mentetlen változások vannak. Elveted őket?')) return;
                setDirty(false);
                onNewTemplate(target);
              }}
              className={btn.secondary}
              title="Új termék / sablon a kiválasztott kategóriában"
            >
              <Plus className="w-4 h-4" />
              Új termék
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className={btn.primary}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Mentés…' : 'Mentés'}
            </button>
          </>
        }
      />

      {incompleteCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {incompleteCount} sablon hiányos:{' '}
            {missingCounts
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${MISSING_LABELS[k]} ${n}`)
              .join(' · ')}
          </span>
          <button
            type="button"
            onClick={() => {
              setOnlyIncomplete((v) => !v);
              setViewMode('table');
            }}
            className="underline hover:text-amber-950"
          >
            {onlyIncomplete ? 'Összes mutatása' : 'Csak a hiányosak'}
          </button>
        </div>
      )}

      <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        {(
          [
            ['tree', 'Menü → kategória → sablon'],
            ['table', 'Méretek & katalógus táblázat'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              viewMode === mode
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                <th className="text-left font-semibold px-3 py-2">Sablon</th>
                <th className="text-left font-semibold px-3 py-2">Fotó</th>
                <th className="text-left font-semibold px-3 py-2">Állapot</th>
                <th className="text-left font-semibold px-3 py-2">Szélesség (cm)</th>
                <th className="text-left font-semibold px-3 py-2">Kinyúlás (cm)</th>
                <th className="text-left font-semibold px-3 py-2">Magasság (cm)</th>
                <th className="text-left font-semibold px-3 py-2">Ár PDF</th>
                <th className="text-left font-semibold px-3 py-2">Oldal</th>
                <th className="text-left font-semibold px-3 py-2">Gyártói név</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                    Még nincs sablon.
                  </td>
                </tr>
              )}
              {tableRows
                .filter(({ tpl }) => !onlyIncomplete || getMissing(tpl).length > 0)
                .map(({ tpl, menu, cat }) => {
                const limits = tpl.sizeLimits || {};
                const ref: CatalogReference = tpl.catalogRef || {};
                const missing = getMissing(tpl);
                const warn = (k: MissingKey) =>
                  missing.includes(k) ? 'border-amber-400 bg-amber-50/60' : 'border-slate-300';
                const numInput = (key: keyof TemplateSizeLimits, ph: string) => (
                  <input
                    type="number"
                    min={0}
                    value={limits[key] || ''}
                    onChange={(e) =>
                      updateTemplate(tpl.id, {
                        sizeLimits: {
                          ...limits,
                          [key]: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    placeholder={ph}
                    className={`w-16 px-2 py-1 rounded-lg border text-right tabular-nums ${warn('size')}`}
                  />
                );
                const textInput = (key: keyof CatalogReference, cls: string) => (
                  <input
                    type="text"
                    value={ref[key] || ''}
                    onChange={(e) =>
                      updateTemplate(tpl.id, {
                        catalogRef: { ...ref, [key]: e.target.value },
                      })
                    }
                    className={`${cls} px-2 py-1 rounded-lg border ${
                      key === 'pdfFile' || key === 'pages' ? warn('catalog') : 'border-slate-300'
                    }`}
                  />
                );
                return (
                  <tr key={tpl.id} className={tpl.status === 'inactive' ? 'opacity-60' : ''}>
                    <td className="px-3 py-2 min-w-[180px]">
                      <div className="font-medium text-slate-950">{tpl.name}</div>
                      <div className="text-xs text-slate-500">
                        {menu?.name || '–'} / {cat?.name || '–'}
                      </div>
                      <MissingNote missing={missing} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          // A fotók szerkesztése a fa nézetben, kinyitott sablonnál
                          setViewMode('tree');
                          const catMenu = draftCategories.find((c) => c.id === tpl.categoryId)?.menuId;
                          if (catMenu) setSelectedMenuId(catMenu);
                          setSelectedCategoryId(tpl.categoryId);
                          setExpandedTemplateId(tpl.id);
                        }}
                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-950 whitespace-nowrap"
                        title="Fotók szerkesztése"
                      >
                        <Thumb tpl={tpl} />
                        {(tpl.photos || []).length} db
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={tpl.status || 'active'}
                        onChange={(e) =>
                          updateTemplate(tpl.id, {
                            status: e.target.value as TemplateStatus,
                          })
                        }
                        className="px-2 py-1 rounded-lg border border-slate-300"
                      >
                        {TEMPLATE_STATUS_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {SIZE_ROWS.map(([label, minKey, maxKey]) => (
                      <td key={label} className="px-3 py-2 whitespace-nowrap">
                        {numInput(minKey, 'min')}
                        <span className="mx-1 text-slate-400">–</span>
                        {numInput(maxKey, 'max')}
                      </td>
                    ))}
                    <td className="px-3 py-2">{textInput('pdfFile', 'w-36')}</td>
                    <td className="px-3 py-2">{textInput('pages', 'w-16')}</td>
                    <td className="px-3 py-2">{textInput('productAlias', 'w-32')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'tree' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* MENUS */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="text-[13px] font-medium text-slate-600">
            Menü ({sortedMenus.length})
          </div>
          <div className="space-y-1.5">
            {sortedMenus.map((menu, idx) => {
              const isSelected = menu.id === selectedMenuId;
              const catCount = draftCategories.filter(
                (c) => c.menuId === menu.id
              ).length;
              return (
                <div
                  key={menu.id}
                  className={`rounded-xl border p-2 transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${menu.enabled ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          setDraftMenus((prev) =>
                            moveInScope(prev, () => true, menu.id, -1)
                          );
                          markDirty();
                        }}
                        className={arrowBtn}
                        title="Feljebb"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedMenus.length - 1}
                        onClick={() => {
                          setDraftMenus((prev) =>
                            moveInScope(prev, () => true, menu.id, 1)
                          );
                          markDirty();
                        }}
                        className={arrowBtn}
                        title="Lejjebb"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={menu.name}
                      onFocus={() => setSelectedMenuId(menu.id)}
                      onChange={(e) => updateMenu(menu.id, { name: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-slate-300 bg-transparent text-sm font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedMenuId(menu.id)}
                      className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold"
                      title="Kategóriák megnyitása"
                    >
                      {catCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMenu(menu.id, { enabled: !menu.enabled })}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                      title={menu.enabled ? 'Elrejtés az árazóból' : 'Megjelenítés az árazóban'}
                    >
                      {menu.enabled ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMenu(menu)}
                      className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50"
                      title="Menüpont törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={newMenuName}
              onChange={(e) => setNewMenuName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMenu()}
              placeholder="Új menüpont (pl. Kocsibeálló)"
              className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <button
              type="button"
              onClick={handleAddMenu}
              className="p-2 rounded-lg bg-slate-900 text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="text-[13px] font-medium text-slate-600">
            Kategória ({menuCategories.length})
          </div>
          {!selectedMenuId ? (
            <div className="text-xs text-slate-500 italic">
              Válassz egy menüpontot.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {menuCategories.length === 0 && (
                  <div className="text-xs text-slate-500 italic">
                    Ebben a menüpontban még nincs kategória.
                  </div>
                )}
                {menuCategories.map((cat, idx) => {
                  const isSelected = cat.id === selectedCategoryId;
                  const tplCount = draftTemplates.filter(
                    (t) => t.categoryId === cat.id
                  ).length;
                  return (
                    <div
                      key={cat.id}
                      className={`rounded-xl border p-2 space-y-1.5 transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              setDraftCategories((prev) =>
                                moveInScope(
                                  prev,
                                  (c) => c.menuId === selectedMenuId,
                                  cat.id,
                                  -1
                                )
                              );
                              markDirty();
                            }}
                            className={arrowBtn}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === menuCategories.length - 1}
                            onClick={() => {
                              setDraftCategories((prev) =>
                                moveInScope(
                                  prev,
                                  (c) => c.menuId === selectedMenuId,
                                  cat.id,
                                  1
                                )
                              );
                              markDirty();
                            }}
                            className={arrowBtn}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cat.name}
                          onFocus={() => setSelectedCategoryId(cat.id)}
                          onChange={(e) =>
                            updateCategory(cat.id, {
                              name: e.target.value,
                              shortName: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-slate-300 bg-transparent text-sm font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold"
                          title="Sablonok megnyitása"
                        >
                          {tplCount}
                        </button>
                      </div>
                      {isSelected && (
                        <div className="pl-6 flex items-center gap-2">
                          <div className="w-14 h-10 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden grid place-items-center shrink-0">
                            {cat.imageUrl ? (
                              <img src={cat.imageUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xs text-slate-400">kép</span>
                            )}
                          </div>
                          <label className="text-xs text-slate-600 hover:text-slate-950 underline cursor-pointer">
                            {cat.imageUrl ? 'Kép cseréje' : 'Kép feltöltése'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = await onUploadImage(file);
                                if (url) updateCategory(cat.id, { imageUrl: url });
                              }}
                            />
                          </label>
                        </div>
                      )}
                      {isSelected && (
                        <div className="pl-6">
                          <label className="block text-xs text-slate-500 mb-0.5">
                            Menü
                          </label>
                          <select
                            value={cat.menuId || ''}
                            onChange={(e) =>
                              updateCategory(cat.id, {
                                menuId: e.target.value,
                                order: 999,
                              })
                            }
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs"
                          >
                            {sortedMenus.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="Új kategória (pl. Bioklimatikus)"
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="p-2 rounded-lg bg-slate-900 text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* TEMPLATES */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-medium text-slate-600">
              Sablon ({categoryTemplates.length})
            </div>
            {selectedCategoryId && (
              <button
                type="button"
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm('Mentetlen változások vannak. Elveted őket?')
                  ) {
                    return;
                  }
                  setDirty(false);
                  onNewTemplate(selectedCategoryId);
                }}
                className={btn.ghost}
              >
                <Plus className="w-4 h-4" />
                Új sablon
              </button>
            )}
          </div>

          {!selectedCategoryId ? (
            <div className="text-xs text-slate-500 italic">
              Válassz egy kategóriát.
            </div>
          ) : categoryTemplates.length === 0 ? (
            <div className="text-xs text-slate-500 italic">
              Ebben a kategóriában még nincs sablon.
            </div>
          ) : (
            <div className="space-y-2">
              {categoryTemplates.map((tpl, idx) => {
                const status: TemplateStatus = tpl.status || 'active';
                const statusOpt = TEMPLATE_STATUS_OPTIONS.find(
                  (s) => s.id === status
                );
                const isExpanded = expandedTemplateId === tpl.id;
                const limits = tpl.sizeLimits || {};
                const ref: CatalogReference = tpl.catalogRef || {};
                return (
                  <div
                    key={tpl.id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      isExpanded
                        ? 'border-slate-900'
                        : status === 'inactive'
                        ? 'border-slate-200 bg-slate-50 opacity-70'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            setDraftTemplates((prev) =>
                              moveInScope(
                                prev,
                                (t) => t.categoryId === selectedCategoryId,
                                tpl.id,
                                -1
                              )
                            );
                            markDirty();
                          }}
                          className={arrowBtn}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categoryTemplates.length - 1}
                          onClick={() => {
                            setDraftTemplates((prev) =>
                              moveInScope(
                                prev,
                                (t) => t.categoryId === selectedCategoryId,
                                tpl.id,
                                1
                              )
                            );
                            markDirty();
                          }}
                          className={arrowBtn}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <Thumb tpl={tpl} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 leading-snug">
                          {tpl.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {hasSizeLimits(tpl) ? (
                            <span className="text-xs font-semibold text-slate-500">
                              <Ruler className="inline w-3 h-3 mr-0.5" />
                              {limits.minWidthCm || '–'}–{limits.maxWidthCm || '–'} ×{' '}
                              {limits.minProjectionCm || '–'}–
                              {limits.maxProjectionCm || '–'} cm
                            </span>
                          ) : null}
                          {hasCatalogRef(tpl) && (
                            <span className="text-xs font-semibold text-slate-500">
                              <BookOpen className="inline w-3 h-3 mr-0.5" />
                              {ref.pdfFile || 'PDF'}
                              {ref.pages ? `, ${ref.pages}. o.` : ''}
                            </span>
                          )}
                        </div>
                        <MissingNote missing={getMissing(tpl)} />
                      </div>

                      <select
                        value={status}
                        onChange={(e) =>
                          updateTemplate(tpl.id, {
                            status: e.target.value as TemplateStatus,
                          })
                        }
                        className={`px-2 py-1 rounded-lg border text-xs font-bold ${statusOpt?.badgeClass}`}
                      >
                        {TEMPLATE_STATUS_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTemplateId(isExpanded ? null : tpl.id)
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        {isExpanded ? 'Bezár' : 'Részletek'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            dirty &&
                            !window.confirm(
                              'Mentetlen változások vannak a sablonkezelőben. Elveted őket és megnyitod a sablont?'
                            )
                          ) {
                            return;
                          }
                          setDirty(false);
                          onEditTemplate(tpl.id);
                        }}
                        className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"
                        title="Sablon termékeinek és árainak szerkesztése"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Kinyitott sablon részletei teljes szélességben: fotók, méretek, katalógus */}
      {viewMode === 'tree' &&
        expandedTpl &&
        (() => {
          const tpl = expandedTpl;
          const limits = tpl.sizeLimits || {};
          const ref: CatalogReference = tpl.catalogRef || {};
          return (
            <div
              ref={detailsRef}
              className="bg-white rounded-2xl border border-slate-900 p-5 scroll-mt-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <Thumb tpl={tpl} />
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-950">{tpl.name}</div>
                  <MissingNote missing={getMissing(tpl)} />
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedTemplateId(null)}
                  className={`${btn.ghost} ml-auto`}
                >
                  Bezár
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                        <PhotoStrip
                          photos={tpl.photos || []}
                          onChange={(next) => updateTemplate(tpl.id, { photos: next })}
                          onUploadImage={onUploadImage}
                        />
                  {/* Extrák / tételek képei: a PDF-ben csak akkor, ha a tétel az ajánlatban van */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-[13px] font-medium text-slate-700">Képek az extrákhoz</div>
                      <p className="text-xs text-slate-500">
                        A PDF-ben csak akkor jelennek meg, ha az adott tétel bekerül az ajánlatba.
                      </p>
                    </div>
                    {(tpl.materials || [])
                      .filter((m) => m.itemRole !== 'gift' && m.pricingMode !== 'percentage')
                      .map((m) => (
                        <div key={m.id} className="rounded-xl border border-slate-200 p-2.5">
                          <div className="text-sm text-slate-950 mb-2">
                            {m.name}
                            <span className="ml-2 text-xs text-slate-500">
                              {m.itemRole === 'optional' ? 'extra' : 'alaptétel'}
                            </span>
                          </div>
                          <MiniPhotos
                            photos={m.photos || []}
                            onChange={(next) =>
                              updateTemplate(tpl.id, {
                                materials: tpl.materials.map((x) =>
                                  x.id === m.id ? { ...x, photos: next } : x
                                ),
                              })
                            }
                            onUploadImage={onUploadImage}
                            addLabel="+ Kép"
                          />
                        </div>
                      ))}
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-4">

                        <div className="space-y-2">
                          <div className="text-[13px] font-medium text-slate-700">
                            Egy modul mérete (cm)
                          </div>
                          {SIZE_ROWS.map(([label, minKey, maxKey]) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="w-24 text-sm text-slate-600">{label}</span>
                              {[minKey, maxKey].map((key, kIdx) => (
                                <React.Fragment key={key}>
                                  {kIdx === 1 && <span className="text-slate-400">–</span>}
                                  <input
                                    type="number"
                                    min={0}
                                    value={limits[key] || ''}
                                    onChange={(e) =>
                                      updateTemplate(tpl.id, {
                                        sizeLimits: {
                                          ...limits,
                                          [key]: Math.max(0, Number(e.target.value) || 0),
                                        },
                                      })
                                    }
                                    placeholder={kIdx === 0 ? 'min' : 'max'}
                                    className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-right tabular-nums"
                                  />
                                </React.Fragment>
                              ))}
                            </div>
                          ))}
                          <div className="text-xs text-slate-500">
                            Üresen hagyva nincs korlát. Ha a kért méret kívül esik, az
                            árazóban pirossal jelenik meg.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div className="sm:col-span-2 text-[13px] font-medium text-slate-700">
                            Katalógus hivatkozás
                          </div>
                          {(
                            [
                              ['pdfFile', 'Ár PDF fájl neve', 'pl. Pergola_arlista_2026.pdf'],
                              ['pages', 'Oldal(ak)', 'pl. 47-49'],
                              ['productAlias', 'Gyártói / fantázianév', 'pl. Algarve Classic'],
                              ['note', 'Megjegyzés', ''],
                            ] as [keyof CatalogReference, string, string][]
                          ).map(([key, label, placeholder]) => (
                            <label key={key} className="block">
                              <span className="block text-xs text-slate-500 mb-0.5">
                                {label}
                              </span>
                              <input
                                type="text"
                                value={ref[key] || ''}
                                onChange={(e) =>
                                  updateTemplate(tpl.id, {
                                    catalogRef: { ...ref, [key]: e.target.value },
                                  })
                                }
                                placeholder={placeholder}
                                className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                              />
                            </label>
                          ))}
                        </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
