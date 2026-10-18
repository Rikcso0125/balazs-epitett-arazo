'use client';

import React, { useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { formatDotNumber, STATUS_CONFIG } from '@/lib/constants';
import { QuoteRecord, QuoteStatus } from '@/lib/types';

interface SavedQuotesListViewProps {
  quotes: QuoteRecord[];
  onEditQuoteInPdfEditor: (quote: QuoteRecord) => void;
  onDuplicateQuote: (quote: QuoteRecord) => Promise<void>;
  onDeleteQuote: (quoteId: string) => Promise<void>;
  onUpdateStatus: (quoteId: string, status: QuoteStatus) => Promise<void>;
  onStartNewQuote: () => void;
}

export function SavedQuotesListView({
  quotes,
  onEditQuoteInPdfEditor,
  onDuplicateQuote,
  onDeleteQuote,
  onUpdateStatus,
  onStartNewQuote,
}: SavedQuotesListViewProps) {
  const [search, setSearch] = useState('');

  const filtered = quotes.filter((q) => {
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Elmentett és Legenerált PDF Árajánlatok ({quotes.length} db)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Minden legenerált PDF árajánlat utólag is bármikor megnyitható,
            minden szövegdoboza, fotója és ára átírható, majd újra letölthető!
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNewQuote}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          + Új Árajánlat Készítése
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            Még nincs elmentett árajánlat
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Amint legenerálsz egy árajánlatot a Végigvezetett Árazóban vagy a
            PDF Szerkesztőben, itt fog megjelenni, és utólag is bármikor
            szerkesztheted.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés ügyfélnév, település vagy sorszám alapján..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[11px]">
                  <th className="py-3 px-4">Ajánlat / Dátum</th>
                  <th className="py-3 px-4">Ügyfél & Település</th>
                  <th className="py-3 px-4">Méret & Kivitel</th>
                  <th className="py-3 px-4 text-right">Fő Összeg</th>
                  <th className="py-3 px-4">Státusz</th>
                  <th className="py-3 px-4 text-right">
                    Utólagos PDF Szerkesztés & Letöltés
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {q.quoteNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(q.updatedAt || q.createdAt).toLocaleString(
                          'hu-HU'
                        )}
                      </div>
                      {q.isEditedAfterGeneration && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Utólag szerkesztve
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {q.customerName}
                      </div>
                      <div className="text-slate-500">{q.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {q.widthCm} × {q.projectionCm} × {q.heightCm} cm
                      </div>
                      <div className="text-slate-500">{q.mountType}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-extrabold text-emerald-700 text-sm">
                        {formatDotNumber(q.primaryTotalEur)} EUR
                      </div>
                      <div className="text-slate-500 font-semibold">
                        {formatDotNumber(q.primaryTotalHuf)} Ft
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={q.status}
                        onChange={(e) =>
                          onUpdateStatus(q.id, e.target.value as QuoteStatus)
                        }
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                          STATUS_CONFIG[q.status]?.badgeClass || ''
                        }`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditQuoteInPdfEditor(q)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Utólagos Szerkesztés
                        </button>
                        <a
                          href={`/api/quotes/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="PDF megnyitása új lapon"
                          className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={`/api/quotes/${q.id}/pdf?download=1`}
                          title="PDF letöltése"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF Letöltés
                        </a>
                        <button
                          type="button"
                          onClick={() => onDuplicateQuote(q)}
                          title="Árajánlat duplikálása"
                          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
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
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
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
