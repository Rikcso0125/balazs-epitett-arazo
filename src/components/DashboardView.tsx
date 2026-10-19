'use client';

import React, { useMemo } from 'react';
import { Download, Plus } from 'lucide-react';
import { formatDotNumber, STATUS_CONFIG } from '@/lib/constants';
import { QuoteRecord, TrackingEvent } from '@/lib/types';
import { btn, card, PageHeader } from '@/components/ui';

const DAY_MS = 24 * 60 * 60 * 1000;

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('hu-HU') : '';

/**
 * Ajánlatok CSV-be (Excel-barát: pontosvessző, UTF-8 BOM)
 */
function exportQuotesCsv(quotes: QuoteRecord[]) {
  const header = [
    'Sorszám', 'Dátum', 'Ügyfél', 'Település', 'E-mail', 'Telefon', 'Méret (cm)',
    'Beépítés', 'Összeg (EUR)', 'Összeg (Ft)', 'Státusz', 'Kiküldve', 'Megnyitások', 'Elfogadva',
  ];
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = quotes.map((q) =>
    [
      q.quoteNumber,
      fmtDate(q.createdAt),
      q.customerName,
      q.city,
      q.email,
      q.phone,
      `${q.widthCm}×${q.projectionCm}×${q.heightCm}`,
      q.mountType,
      Math.round(q.primaryTotalEur || 0),
      Math.round(q.primaryTotalHuf || 0),
      STATUS_CONFIG[q.status]?.label || q.status,
      fmtDate(q.sentAt),
      q.openCount || 0,
      fmtDate(q.acceptedAt),
    ]
      .map(cell)
      .join(';')
  );
  const csv = '﻿' + [header.map(cell).join(';'), ...lines].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ajanlatok_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DashboardView({
  quotes,
  trackingEvents,
  onOpenQuote,
  onSendQuote,
  onNewQuote,
}: {
  quotes: QuoteRecord[];
  trackingEvents: TrackingEvent[];
  onOpenQuote: (quote: QuoteRecord) => void;
  onSendQuote: (quote: QuoteRecord) => void;
  onNewQuote: () => void;
}) {
  const stats = useMemo(() => {
    const open = quotes.filter((q) => ['piszkozat', 'kikuldve', 'megnyitva'].includes(q.status));
    const accepted = quotes.filter((q) => q.status === 'elfogadva');
    const sent = quotes.filter((q) => (q.sentCount || 0) > 0);
    const opened = sent.filter((q) => (q.openCount || 0) > 0);
    return {
      total: quotes.length,
      openEur: open.reduce((s, q) => s + (q.primaryTotalEur || 0), 0),
      openCount: open.length,
      acceptedEur: accepted.reduce((s, q) => s + (q.primaryTotalEur || 0), 0),
      acceptedCount: accepted.length,
      openRate: sent.length ? Math.round((opened.length / sent.length) * 100) : null,
      sentCount: sent.length,
    };
  }, [quotes]);

  // Teendők: ki nem küldött piszkozatok, és 7 napja döntésre váró kiküldött ajánlatok
  const todo = useMemo(() => {
    const now = Date.now();
    const toSend = quotes.filter((q) => q.status === 'piszkozat');
    const waiting = quotes.filter(
      (q) =>
        (q.status === 'kikuldve' || q.status === 'megnyitva') &&
        q.sentAt &&
        now - new Date(q.sentAt).getTime() > 7 * DAY_MS
    );
    return { toSend, waiting };
  }, [quotes]);

  const quoteById = (id: string) => quotes.find((q) => q.id === id);

  const kpis: [string, string, string][] = [
    ['Ajánlatok', String(stats.total), `${stats.openCount} folyamatban`],
    ['Nyitott érték', `${formatDotNumber(stats.openEur)} EUR`, 'piszkozat, kiküldve, megnyitva'],
    ['Elfogadva', `${formatDotNumber(stats.acceptedEur)} EUR`, `${stats.acceptedCount} megrendelés`],
    [
      'Megnyitási arány',
      stats.openRate === null ? '–' : `${stats.openRate}%`,
      `${stats.sentCount} kiküldött ajánlatból`,
    ],
  ];

  const row = (q: QuoteRecord, action: React.ReactNode, sub: string) => (
    <div
      key={q.id}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
      onClick={() => onOpenQuote(q)}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-950 break-words">
          {q.customerName} <span className="text-slate-400 font-normal">· {q.quoteNumber}</span>
        </div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      <div className="text-sm font-semibold tabular-nums text-slate-950">
        {formatDotNumber(q.primaryTotalEur)} EUR
      </div>
      <div onClick={(e) => e.stopPropagation()}>{action}</div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Áttekintés"
        subtitle="Ajánlatok állapota és teendők."
        actions={
          <>
            <button
              type="button"
              onClick={() => exportQuotesCsv(quotes)}
              disabled={quotes.length === 0}
              className={btn.secondary}
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button type="button" onClick={onNewQuote} className={btn.primary}>
              <Plus className="w-4 h-4" />
              Új ajánlat
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className={`${card} px-4 py-3.5`}>
            <div className="text-[13px] text-slate-500">{label}</div>
            <div className="text-xl font-semibold tracking-tight text-slate-950 mt-1 tabular-nums">
              {value}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className={card}>
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-950">
            Teendők
          </div>
          {todo.toSend.length === 0 && todo.waiting.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Nincs teendő.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {todo.toSend.map((q) =>
                row(
                  q,
                  <button type="button" onClick={() => onSendQuote(q)} className={btn.ghost}>
                    Küldés
                  </button>,
                  `Még nincs kiküldve · ${fmtDate(q.createdAt)}`
                )
              )}
              {todo.waiting.map((q) =>
                row(
                  q,
                  <span className="text-xs text-slate-500 px-2">
                    {STATUS_CONFIG[q.status]?.label}
                  </span>,
                  `Döntésre vár · kiküldve ${fmtDate(q.sentAt)}`
                )
              )}
            </div>
          )}
        </div>

        <div className={card}>
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-950">
            Legutóbbi megnyitások
          </div>
          {trackingEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Még nem nyitott meg senki kiküldött ajánlatot.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {trackingEvents.slice(0, 8).map((ev) => {
                const q = quoteById(ev.quoteId);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                    onClick={() => q && onOpenQuote(q)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-950 break-words">
                        {ev.customerName}
                        {q && <span className="text-slate-400 font-normal"> · {q.quoteNumber}</span>}
                      </div>
                      <div className="text-xs text-slate-500 break-all">{ev.email}</div>
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(ev.openedAt).toLocaleString('hu-HU', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
