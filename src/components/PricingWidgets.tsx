'use client';

import React from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { formatDotNumber } from '@/lib/constants';
import { createPriceAdjustment, roundHuf } from '@/lib/pricing-engine';
import { PriceAdjustment } from '@/lib/types';

/**
 * Egyedi árkorrekciók indoklással (pl. +300 EUR szükséges átalakítás miatt).
 * Ha rejtett, a PDF-ben külön sor nélkül az első alaptétel árába olvad.
 */
export function AdjustmentsEditor({
  adjustments,
  onChange,
}: {
  adjustments: PriceAdjustment[];
  onChange: (next: PriceAdjustment[]) => void;
}) {
  const update = (idx: number, patch: Partial<PriceAdjustment>) =>
    onChange(adjustments.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  return (
    <div className="space-y-1.5">
      {adjustments.map((adj, idx) => (
        <div key={adj.id} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={adj.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            placeholder="Korrekció"
            className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[13px]"
          />
          <input
            type="number"
            value={adj.amountEur}
            onChange={(e) => update(idx, { amountEur: Number(e.target.value) || 0 })}
            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[13px] text-right tabular-nums"
            title="EUR, lehet negatív is"
          />
          <input
            type="text"
            value={adj.reason}
            onChange={(e) => update(idx, { reason: e.target.value })}
            placeholder="Indoklás (opcionális)"
            className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[13px]"
          />
          <button
            type="button"
            onClick={() => update(idx, { visibleToCustomer: !adj.visibleToCustomer })}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
            title="Külön sorként megjelenjen-e a vevő PDF-jében"
          >
            {adj.visibleToCustomer ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {adj.visibleToCustomer ? 'Vevő látja' : 'Rejtett'}
          </button>
          <button
            type="button"
            onClick={() => onChange(adjustments.filter((_, i) => i !== idx))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            title="Törlés"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...adjustments, createPriceAdjustment()])}
        className="inline-flex items-center gap-1 text-[13px] text-slate-600 hover:text-slate-950"
      >
        <Plus className="w-3.5 h-3.5" />
        Árkorrekció
      </button>
    </div>
  );
}

/**
 * Belső árbontás egy sorban (nem kerül a PDF-be): katalógusár · haszon · szerelés · korrekció → végösszeg.
 */
export function PriceSummaryLine({
  breakdown,
  eurHufRate,
  manualTotal,
}: {
  breakdown: {
    catalogEur: number;
    profitEur: number;
    assemblyEur: number;
    manualRowsEur: number;
    adjustmentsEur: number;
    totalEur: number;
  };
  eurHufRate: number;
  manualTotal?: boolean;
}) {
  const parts: [string, number][] = [['Katalógus', breakdown.catalogEur]];
  if (breakdown.profitEur) parts.push(['Haszon', breakdown.profitEur]);
  if (breakdown.assemblyEur) parts.push(['Szerelés', breakdown.assemblyEur]);
  if (breakdown.manualRowsEur) parts.push(['Kézi tételek', breakdown.manualRowsEur]);
  if (breakdown.adjustmentsEur) parts.push(['Korrekció', breakdown.adjustmentsEur]);

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
      {parts.map(([label, value]) => (
        <span key={label} className="text-slate-500">
          {label}{' '}
          <span className="text-slate-800 tabular-nums">{formatDotNumber(value)} EUR</span>
        </span>
      ))}
      <span className="ml-auto text-right">
        <span className="text-slate-500">Összesen{manualTotal ? ' (kézi)' : ''} </span>
        <span className="text-base font-semibold text-slate-950 tabular-nums">
          {formatDotNumber(breakdown.totalEur)} EUR
        </span>
        <span className="text-slate-500 tabular-nums">
          {' '}
          · {formatDotNumber(roundHuf(breakdown.totalEur, eurHufRate))} Ft
        </span>
      </span>
    </div>
  );
}
