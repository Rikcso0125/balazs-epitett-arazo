'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Mail,
  MapPin,
  Plus,
  Search,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';
import { PRODUCT_TYPES } from '@/lib/constants';
import { QuoteRecord, QuoteStatus, TermekTipusId } from '@/lib/types';
import { formatCurrency } from './DashboardAnalyticsView';

interface QuotesListViewProps {
  quotes: QuoteRecord[];
  onEditQuote: (quote: QuoteRecord) => void;
  onOpenSendModal: (quote: QuoteRecord) => void;
  onQuickOneClickSend: (quote: QuoteRecord) => Promise<void>;
  onStatusChange: (quote: QuoteRecord, newStatus: QuoteStatus) => Promise<void>;
  onPreviewPdf: (quote: QuoteRecord) => void;
  onSimulatePixelOpen?: (quote: QuoteRecord) => Promise<void>;
  onDeleteQuote: (quote: QuoteRecord) => Promise<void>;
  onNewQuoteClick: () => void;
}

export function QuotesListView({
  quotes,
  onEditQuote,
  onOpenSendModal,
  onQuickOneClickSend,
  onStatusChange,
  onPreviewPdf,
  onSimulatePixelOpen,
  onDeleteQuote,
  onNewQuoteClick,
}: QuotesListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all' | 'opened'>('all');
  const [productFilter, setProductFilter] = useState<TermekTipusId | 'all'>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = quotes.length;
    const sent = quotes.filter((q) => q.sentCount > 0 || q.status !== 'piszkozat').length;
    const opened = quotes.filter((q) => q.openCount > 0 || q.status === 'megnyitva').length;
    const accepted = quotes.filter((q) => q.status === 'elfogadva').length;
    const draft = quotes.filter((q) => q.status === 'piszkozat').length;
    const openRatePct = sent > 0 ? Math.round((opened / sent) * 100) : 0;
    return { total, sent, opened, accepted, draft, openRatePct };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter === 'opened') {
        if (q.openCount === 0 && q.status !== 'megnyitva') return false;
      } else if (statusFilter !== 'all' && q.status !== statusFilter) {
        return false;
      }
      if (productFilter !== 'all' && q.termekTipus !== productFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchName = q.customerName.toLowerCase().includes(s);
        const matchCity = q.city.toLowerCase().includes(s);
        const matchEmail = (q.email || '').toLowerCase().includes(s);
        const matchNum = q.quoteNumber.toLowerCase().includes(s);
        if (!matchName && !matchCity && !matchEmail && !matchNum) return false;
      }
      return true;
    });
  }, [quotes, statusFilter, productFilter, search]);

  return (
    <div className="space-y-5">
      {/* HelloTeam ERP Module Top Header Card (like "Banki integráció" in video) */}
      <div className="ht-module-header p-6">
        <h1 className="text-[22px] font-extrabold tracking-tight text-[#0a0a0a] pb-3.5 border-b border-[#efefef]">
          Kiadott árajánlatok & Email Pixel követés
        </h1>
        <p className="text-[13px] text-[#4a4a4a] mt-3 leading-relaxed max-w-4xl">
          Az összes kiadott egyedi pergola árajánlat kezelése, szerkesztése és 1-kattintásos email kiküldése.
          A kiküldött emailekbe automatikusan bekerül a láthatatlan 1×1 nyitáskövető pixel, amely valós időben
          jelzi, ha az ügyfél megnyitotta az ajánlatot.
        </p>
      </div>

      {/* 4 Summary Cards Row (Exact replica of the 4 cards in HelloTeam video frame 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="ht-card p-4">
          <div className="text-[11.5px] font-medium text-[#6b6b6b] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Összes árajánlat
          </div>
          <div className="text-[26px] font-extrabold text-[#0a0a0a] tabular-nums mt-1">
            {summary.total}
          </div>
        </div>

        <div className="ht-kpi-card ht-kpi-card--amber p-4 pl-5">
          <div className="text-[11.5px] font-medium text-[#6b6b6b] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#d97706]" /> Megnyitott (Pixel)
          </div>
          <div className="text-[26px] font-extrabold text-[#d97706] tabular-nums mt-0.5">
            {summary.opened}
          </div>
          <button
            onClick={() =>
              setStatusFilter(statusFilter === 'opened' ? 'all' : 'opened')
            }
            className="mt-1.5 inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#f6f6f6] hover:bg-[#eaeaea] border border-[#e0e0e0] text-[#0a0a0a] transition"
          >
            {statusFilter === 'opened' ? 'Összes mutatása' : 'Megtekintés'}
          </button>
        </div>

        <div className="ht-card p-4">
          <div className="text-[11.5px] font-medium text-[#6b6b6b] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" /> Elfogadva / Kiküldve
          </div>
          <div className="mt-1 flex items-baseline gap-1 tabular-nums">
            <span className="text-[26px] font-extrabold text-[#16a34a]">
              {summary.accepted}
            </span>
            <span className="text-[14px] font-semibold text-[#6b6b6b]">
              / {summary.sent}
            </span>
          </div>
        </div>

        <div className="ht-card p-4">
          <div className="text-[11.5px] font-medium text-[#6b6b6b]">
            Email megnyitási arány
          </div>
          <div className="text-[26px] font-extrabold text-[#0a0a0a] tabular-nums mt-1">
            {summary.openRatePct}%
          </div>
          <div className="w-full h-1.5 bg-[#ebebeb] rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#0a0a0a] rounded-full transition-all"
              style={{ width: `${Math.min(100, summary.openRatePct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Underline Sub-Tabs (Exact HelloTeam "Kivonatok | Bankszámlák" style) */}
      <div className="border-b border-[#e8e8e8] flex items-center gap-6 overflow-x-auto">
        <button
          onClick={() => setStatusFilter('all')}
          className={`pb-2.5 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
            statusFilter === 'all'
              ? 'border-[#0a0a0a] text-[#0a0a0a]'
              : 'border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Összes árajánlat ({summary.total})
        </button>

        <button
          onClick={() => setStatusFilter('opened')}
          className={`pb-2.5 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
            statusFilter === 'opened'
              ? 'border-[#0a0a0a] text-[#0a0a0a]'
              : 'border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Megnyitva · Pixel ({summary.opened})
        </button>

        <button
          onClick={() => setStatusFilter('elfogadva')}
          className={`pb-2.5 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
            statusFilter === 'elfogadva'
              ? 'border-[#0a0a0a] text-[#0a0a0a]'
              : 'border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Elfogadott megrendelések ({summary.accepted})
        </button>

        <button
          onClick={() => setStatusFilter('piszkozat')}
          className={`pb-2.5 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
            statusFilter === 'piszkozat'
              ? 'border-[#0a0a0a] text-[#0a0a0a]'
              : 'border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]'
          }`}
        >
          Kiküldendő piszkozatok ({summary.draft})
        </button>
      </div>

      {/* Main Data Table Card (Exact HelloTeam "Utolsó kivonatok" table card) */}
      <div className="ht-card overflow-hidden">
        {/* Card Header Bar */}
        <div className="px-5 py-4 border-b border-[#efefef] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0a0a0a]" />
            <h2 className="text-[15.5px] font-extrabold text-[#0a0a0a]">
              Kiadott árajánlatok
            </h2>
            <span className="text-xs font-medium text-[#6b6b6b] ml-1">
              {filteredQuotes.length} db
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6b6b6b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ügyfél, település, kód..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#fafafa] border border-[#e0e0e0] text-xs text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#0a0a0a] w-52"
              />
            </div>

            {/* Product Type Filter */}
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-[#fafafa] border border-[#e0e0e0] text-xs font-medium text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
            >
              <option value="all">Minden terméktípus</option>
              {PRODUCT_TYPES.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>

            {/* Primary Black Button like "+ CSV import" in HelloTeam video */}
            <button
              onClick={onNewQuoteClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0a0a0a] text-white hover:bg-[#262626] transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Új árajánlat
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#efefef] text-[10.5px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                <th className="py-3 px-4">KELTE / KÓD</th>
                <th className="py-3 px-4">ÜGYFÉL & TELEPÜLÉS</th>
                <th className="py-3 px-4">TERMÉKTÍPUS & MÉRET</th>
                <th className="py-3 px-4">PIXEL NYITÁS</th>
                <th className="py-3 px-4">STÁTUSZ</th>
                <th className="py-3 px-4 text-right">ÁRAJÁNLAT ÉRTÉKE</th>
                <th className="py-3 px-4 text-right">MŰVELETEK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efefef] text-[13px]">
              {filteredQuotes.map((quote) => {
                const prod = PRODUCT_TYPES.find((p) => p.id === quote.termekTipus);
                return (
                  <tr
                    key={quote.id}
                    className="hover:bg-[#fafafa] transition-colors group"
                  >
                    {/* Date & Code */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#0a0a0a] tabular-nums">
                        {quote.createdAt.replace(/-/g, '. ')}.
                      </div>
                      <div className="text-[11px] text-[#6b6b6b] font-mono">
                        #{quote.quoteNumber}
                      </div>
                    </td>

                    {/* Customer & City */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0a0a0a]">
                        {quote.customerName}
                      </div>
                      <div className="text-[11.5px] text-[#6b6b6b] flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#a3a3a3]" />
                        <span>{quote.city}</span>
                        {quote.email && (
                          <span className="text-[#a3a3a3] truncate max-w-[170px]">
                            · {quote.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Product Type & Dimensions (HelloTeam soft pill tag) */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#f3f3f3] border border-[#e5e5e5] text-[11.5px] font-semibold text-[#3d3d3d]">
                        {prod?.shortName || quote.termekTipus}
                      </div>
                      <div className="text-[11.5px] text-[#6b6b6b] mt-1 tabular-nums">
                        {quote.projection} × {quote.width} × {quote.height} cm ·{' '}
                        {quote.beepitesTipus}
                      </div>
                    </td>

                    {/* Pixel Counter Pill (Only active when actually sent to a real email) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {quote.sentCount > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold tabular-nums border ${
                                quote.openCount > 0
                                  ? 'bg-[#fef6e7] text-[#b45309] border-[#fde68a]'
                                  : 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              {quote.openCount > 0
                                ? `${quote.openCount}× megnyitva`
                                : 'Kiküldve (Pixel aktív)'}
                            </span>
                          </div>
                          {quote.lastOpenedAt && (
                            <div className="text-[10.5px] text-[#16a34a] font-medium mt-0.5 tabular-nums">
                              Nyitva:{' '}
                              {new Date(quote.lastOpenedAt).toLocaleString(
                                'hu-HU',
                                {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f3f3f3] text-[#6b6b6b] border border-[#e5e5e5]">
                          Még nincs kiküldve
                        </span>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={quote.status}
                        onChange={(e) =>
                          onStatusChange(quote, e.target.value as QuoteStatus)
                        }
                        className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold border cursor-pointer focus:outline-none ${
                          quote.status === 'elfogadva'
                            ? 'bg-[#e9f9ef] text-[#16a34a] border-[#bbf7d0]'
                            : quote.status === 'megnyitva'
                            ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                            : quote.status === 'kikuldve'
                            ? 'bg-[#fef6e7] text-[#d97706] border-[#fde68a]'
                            : quote.status === 'elutasitva'
                            ? 'bg-[#fdeaea] text-[#dc2626] border-[#fecaca]'
                            : 'bg-[#f3f3f3] text-[#4a4a4a] border-[#e0e0e0]'
                        }`}
                      >
                        <option value="piszkozat">Piszkozat</option>
                        <option value="kikuldve">Kiküldve</option>
                        <option value="megnyitva">Megnyitva (Pixel)</option>
                        <option value="elfogadva">Elfogadva</option>
                        <option value="elutasitva">Elutasítva</option>
                      </select>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                      <div className="font-extrabold text-[#0a0a0a]">
                        {formatCurrency(quote.primaryHuf)} HUF
                      </div>
                      <div className="text-[11px] text-[#6b6b6b] font-medium">
                        {formatCurrency(quote.primaryEur)} EUR
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* 1-Click Send Email Button */}
                        <button
                          type="button"
                          onClick={async () => {
                            setSendingId(quote.id);
                            await onQuickOneClickSend(quote);
                            setSendingId(null);
                          }}
                          disabled={sendingId === quote.id}
                          title="1-kattintásos azonnali email kiküldés (Tracking Pixellel)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold bg-[#0a0a0a] text-white hover:bg-[#262626] transition disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          {sendingId === quote.id ? 'Küldés...' : '1-Katt Email'}
                        </button>

                        {/* Email Preview Modal */}
                        <button
                          type="button"
                          onClick={() => onOpenSendModal(quote)}
                          title="Email szerkesztése kiküldés előtt"
                          className="p-1.5 rounded-lg border border-[#e0e0e0] bg-white text-[#4a4a4a] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Quote */}
                        <button
                          type="button"
                          onClick={() => onEditQuote(quote)}
                          title="Árajánlat szerkesztése & újraszámolása"
                          className="p-1.5 rounded-lg border border-[#e0e0e0] bg-white text-[#4a4a4a] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Preview PDF */}
                        <button
                          type="button"
                          onClick={() => onPreviewPdf(quote)}
                          title="Hivatalos PDF megtekintése"
                          className="p-1.5 rounded-lg border border-[#e0e0e0] bg-white text-[#4a4a4a] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onDeleteQuote(quote)}
                          title="Törlés"
                          className="p-1.5 rounded-lg border border-transparent text-[#a3a3a3] hover:text-[#dc2626] hover:bg-[#fdeaea] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
