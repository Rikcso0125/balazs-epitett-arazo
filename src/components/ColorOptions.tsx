'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { COLOR_PALETTES } from '@/lib/constants';
import { ColorOption } from '@/lib/types';

const newId = () => `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/**
 * Színválaszték szerkesztése: mintaszín (színválasztó), kód (pl. RAL 7016), felület / név.
 * Gyártói paletta egy kattintással hozzáadható.
 */
export function ColorOptionsEditor({
  colors,
  onChange,
  title,
  onTitleChange,
}: {
  colors: ColorOption[];
  onChange: (next: ColorOption[]) => void;
  title?: string;
  onTitleChange?: (t: string) => void;
}) {
  const update = (idx: number, patch: Partial<ColorOption>) =>
    onChange(colors.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2">
      {onTitleChange && (
        <input
          value={title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Cím a PDF-ben (pl. Alapszínek, Választható RAL színek)"
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
        />
      )}
      {colors.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {colors.map((c, idx) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5"
            >
              <label
                className="relative w-9 h-9 rounded-md border border-slate-300 shrink-0 cursor-pointer overflow-hidden"
                style={{ background: c.hex }}
                title="Szín kiválasztása"
              >
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => update(idx, { hex: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <div className="min-w-0 flex-1">
                <input
                  value={c.code}
                  onChange={(e) => update(idx, { code: e.target.value })}
                  placeholder="RAL 7016"
                  className="w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-slate-300 text-[13px] font-semibold"
                />
                <input
                  value={c.name || ''}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder="név / felület"
                  className="w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-slate-300 text-xs text-slate-600"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(colors.filter((_, i) => i !== idx))}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 self-start"
                title="Törlés"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange([...colors, { id: newId(), code: '', name: '', hex: '#cccccc' }])}
          className="inline-flex items-center gap-1 text-[13px] text-slate-600 hover:text-slate-950"
        >
          <Plus className="w-3.5 h-3.5" />
          Szín
        </button>
        <select
          value=""
          onChange={(e) => {
            const pal = COLOR_PALETTES.find((p) => p.id === e.target.value);
            if (!pal) return;
            const existing = new Set(colors.map((c) => `${c.code}|${c.name}`));
            onChange([
              ...colors,
              ...pal.colors
                .filter((c) => !existing.has(`${c.code}|${c.name}`))
                .map((c) => ({ ...c, id: newId() })),
            ]);
          }}
          className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-[13px] text-slate-600"
        >
          <option value="">Gyártói paletta hozzáadása…</option>
          {COLOR_PALETTES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.colors.length})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Kis színpöttyök (pl. az árazóban a tétel mellett), a kódokkal súgóként */
export function ColorDots({ colors, max = 10 }: { colors: ColorOption[]; max?: number }) {
  if (!colors?.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5" title={colors.map((c) => c.code).join(', ')}>
      {colors.slice(0, max).map((c) => (
        <span
          key={c.id}
          className="w-3 h-3 rounded-full border border-slate-300"
          style={{ background: c.hex }}
        />
      ))}
      {colors.length > max && (
        <span className="text-xs text-slate-500 ml-0.5">+{colors.length - max}</span>
      )}
    </span>
  );
}
