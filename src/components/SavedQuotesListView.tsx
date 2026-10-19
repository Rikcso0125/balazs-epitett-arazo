'use client';

import React, { useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { btn, PageHeader } from '@/components/ui';
import { formatDotNumber, STATUS_CONFIG } from '@/lib/constants';
import { QuoteRecord, QuoteStatus } from '@/lib/types';

interface SavedQuotesListViewProps {
  quotes: QuoteRecord[];
  onEditQuoteInPdfEditor: (quote: QuoteRecord) => void;
  onDuplicateQuote: (quote: QuoteRecord) => Promise<void>;
  onDeleteQuote: (quoteId: string) => Promise<void>;
  onUpdateStatus: (quoteId: string, status: QuoteStatus) => Promise<void>;
  onStartNewQuote: () => void;
  onSendQuote: (quote: QuoteRecord) => void;
}

export function SavedQuotesListView({
  quotes,
  onEditQuoteInPdfEditor,
  onDuplicateQuote,
  onDeleteQuote,
  onUpdateStatus,
  onStartNewQuote,
  onSendQuote,
}: SavedQuotesListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');

  const countBy = (st: QuoteStatus) => quotes.filter((q) => q.status === st).length;

  const filtered = quotes.filter((q) => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      q.customerName?.toLowerCase().includes(s) ||
      q.city?.toLowerCase().includes(s) ||
      q.quoteNumber?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ajánlatok"
        subtitle="Kattints egy ajánlatra a szerkesztéshez."
        actions={
          <button type="button" onClick={onStartNewQuote} className={btn.primary}>
            <Plus className="w-4 h-4" />
            Új ajánlat
          </button>
        }
      />

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm text-slate-500">
            Még nincs elmentett árajánlat
          </h3>

        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés név, település vagy sorszám alapján"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-[13px]"
              />
            </div>
            <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
              {(
                [
                  ['all', `Összes ${quotes.length}`],
                  ['piszkozat', `Piszkozat ${countBy('piszkozat')}`],
                  ['kikuldve', `Kiküldve ${countBy('kikuldve')}`],
                  ['megnyitva', `Megnyitva ${countBy('megnyitva')}`],
                  ['elfogadva', `Elfogadva ${countBy('elfogadva')}`],
                ] as [QuoteStatus | 'all', string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-2.5 py-1 rounded-lg text-[13px] transition ${
                    statusFilter === key
                      ? 'bg-white text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-100 text-slate-400 border-b border-slate-200 uppercase text-xs tracking-wide">
                  <th className="py-2 px-4 font-semibold">Ajánlat</th>
                  <th className="py-2 px-4 font-semibold">Ügyfél</th>
                  <th className="py-2 px-4 font-semibold">Méret</th>
                  <th className="py-2 px-4 font-semibold text-right">Összeg</th>
                  <th className="py-2 px-4 font-semibold">Státusz</th>
                  <th className="py-2 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => onEditQuoteInPdfEditor(q)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-950">
                        {q.quoteNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(q.updatedAt || q.createdAt).toLocaleDateString(
                          'hu-HU'
                        )}
                      </div>

                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-950">
                        {q.customerName}
                      </div>
                      <div className="text-slate-500">{q.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 whitespace-nowrap">
                        {q.widthCm} × {q.projectionCm} cm
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                        {formatDotNumber(q.primaryTotalEur)} EUR
                      </div>
                      <div className="text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDotNumber(q.primaryTotalHuf)} Ft
                      </div>
                    </td>
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={q.status}
                        onChange={(e) =>
                          onUpdateStatus(q.id, e.target.value as QuoteStatus)
                        }
                        className={`px-2 py-1 rounded-full border text-xs font-medium ${
                          STATUS_CONFIG[q.status]?.badgeClass || ''
                        }`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      {(q.openCount || 0) > 0 ? (
                        <div className="text-xs text-slate-500 mt-1">
                          Megnyitva {q.openCount}× · utoljára{' '}
                          {new Date(q.lastOpenedAt || '').toLocaleDateString('hu-HU')}
                        </div>
                      ) : q.sentAt ? (
                        <div className="text-xs text-slate-500 mt-1">
                          Kiküldve {new Date(q.sentAt).toLocaleDateString('hu-HU')}
                        </div>
                      ) : null}
                    </td>
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onSendQuote(q)}
                          title="Küldés e-mailben"
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/quotes/${q.id}/pdf?download=1`}
                          title="PDF letöltése"
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onDuplicateQuote(q)}
                          title="Árajánlat duplikálása"
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Biztosan törlöd ${q.customerName} árajánlatát?`
                              )
                            ) {
                              onDeleteQuote(q.id);
                            }
                          }}
                          title="Törlés"
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
