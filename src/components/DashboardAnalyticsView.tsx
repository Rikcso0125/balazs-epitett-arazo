'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Landmark,
  Mail,
  MapPin,
  Send,
  Sliders,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import { PRODUCT_TYPES } from '@/lib/constants';
import { QuoteRecord, TrackingEvent } from '@/lib/types';

interface DashboardAnalyticsViewProps {
  quotes: QuoteRecord[];
  trackingEvents: TrackingEvent[];
  onSelectQuoteForEdit: (quote: QuoteRecord) => void;
  onSimulatePixelOpen?: (quote: QuoteRecord) => Promise<void>;
  onNavigateTab: (tab: 'quotes' | 'new' | 'admin') => void;
}

export function formatCurrency(num: number): string {
  return Math.round(num || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCompactMillions(huf: number): string {
  if (huf >= 1_000_000) {
    return `${(huf / 1_000_000).toFixed(1)}M Ft`;
  }
  return `${formatCurrency(huf)} Ft`;
}

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function HelloTeamDonutChart({
  title,
  totalLabel,
  totalCount,
  slices,
}: {
  title: string;
  totalLabel?: string;
  totalCount: number;
  slices: DonutSlice[];
}) {
  const size = 180;
  const strokeWidth = 28;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  const nonZeroSlices = slices.filter((s) => s.value > 0);
  const sum = nonZeroSlices.reduce((acc, s) => acc + s.value, 0) || 1;

  let accumulatedAngle = 0;

  return (
    <div className="ht-card p-5">
      <div className="text-[13px] font-bold text-[#0a0a0a] mb-3">{title}</div>
      <div className="flex flex-col items-center justify-center py-1">
        <div className="relative w-[176px] h-[176px] flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            {nonZeroSlices.map((slice, idx) => {
              const pct = slice.value / sum;
              const dashLength = Math.max(0, pct * circumference - 3);
              const dashOffset = -accumulatedAngle * circumference;
              accumulatedAngle += pct;
              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
          </svg>
          {/* HelloTeam ERP signature solid black inner circle */}
          <div className="absolute w-[88px] h-[88px] rounded-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center shadow-inner">
            <span className="text-[22px] font-extrabold leading-none tabular-nums">
              {totalCount}
            </span>
            <span className="text-[11px] text-[#a3a3a3] font-medium mt-0.5">
              {totalLabel || 'össz.'}
            </span>
          </div>
        </div>

        {/* Legend with dots */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 text-[11.5px] font-medium text-[#4a4a4a]">
          {slices.map((s, idx) => (
            <div key={idx} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span>
                {s.label} ({s.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardAnalyticsView({
  quotes,
  trackingEvents,
  onSelectQuoteForEdit,
  onSimulatePixelOpen,
  onNavigateTab,
}: DashboardAnalyticsViewProps) {
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '2026' | '2025'>('all');

  const filteredQuotes = useMemo(() => {
    if (timeFilter === 'all') return quotes;
    return quotes.filter((q) => q.createdAt.startsWith(timeFilter));
  }, [quotes, timeFilter]);

  const stats = useMemo(() => {
    const totalCount = filteredQuotes.length;
    const totalPipelineHuf = filteredQuotes.reduce(
      (sum, q) => sum + (q.primaryHuf || 0),
      0
    );
    const totalPipelineEur = filteredQuotes.reduce(
      (sum, q) => sum + (q.primaryEur || 0),
      0
    );

    const draftQuotes = filteredQuotes.filter((q) => q.status === 'piszkozat');
    const sentQuotes = filteredQuotes.filter(
      (q) =>
        q.status === 'kikuldve' ||
        q.status === 'megnyitva' ||
        q.status === 'elfogadva' ||
        q.sentCount > 0
    );
    const openedQuotes = filteredQuotes.filter(
      (q) => q.openCount > 0 || q.status === 'megnyitva'
    );
    const acceptedQuotes = filteredQuotes.filter(
      (q) => q.status === 'elfogadva'
    );
    const rejectedQuotes = filteredQuotes.filter(
      (q) => q.status === 'elutasitva'
    );
    const waitingDecisionQuotes = filteredQuotes.filter(
      (q) => q.status === 'kikuldve' || q.status === 'megnyitva'
    );

    const acceptedHuf = acceptedQuotes.reduce(
      (sum, q) => sum + (q.primaryHuf || 0),
      0
    );
    const acceptedEur = acceptedQuotes.reduce(
      (sum, q) => sum + (q.primaryEur || 0),
      0
    );

    const openRatePct =
      sentQuotes.length > 0
        ? Math.round((openedQuotes.length / sentQuotes.length) * 100)
        : 0;
    const conversionRatePct =
      totalCount > 0
        ? Math.round((acceptedQuotes.length / totalCount) * 100)
        : 0;

    const totalPixelOpens = filteredQuotes.reduce(
      (sum, q) => sum + (q.openCount || 0),
      0
    );

    const uniqueCities = new Set(
      filteredQuotes.map((q) => q.city).filter(Boolean)
    ).size;

    return {
      totalCount,
      totalPipelineHuf,
      totalPipelineEur,
      draftCount: draftQuotes.length,
      sentCount: sentQuotes.length,
      openedCount: openedQuotes.length,
      acceptedCount: acceptedQuotes.length,
      rejectedCount: rejectedQuotes.length,
      waitingDecisionCount: waitingDecisionQuotes.length,
      acceptedHuf,
      acceptedEur,
      openRatePct,
      conversionRatePct,
      totalPixelOpens,
      uniqueCities,
    };
  }, [filteredQuotes]);

  const productSlices = useMemo<DonutSlice[]>(() => {
    const colors = [
      '#0d6efd', // Blue
      '#15803d', // Green
      '#d97706', // Amber
      '#dc2626', // Red
      '#4f46e5', // Indigo
      '#525252', // Neutral
    ];
    const counts: Record<string, number> = {};
    for (const q of filteredQuotes) {
      counts[q.termekTipus] = (counts[q.termekTipus] || 0) + 1;
    }
    return PRODUCT_TYPES.map((pt, idx) => ({
      label: pt.shortName,
      value: counts[pt.id] || 0,
      color: colors[idx % colors.length],
    })).filter((s) => s.value > 0);
  }, [filteredQuotes]);

  const handleExportCsv = () => {
    const headers = [
      'Ajánlatszám',
      'Dátum',
      'Ügyfél neve',
      'Email',
      'Település',
      'Terméktípus',
      'Beépítés',
      'Méret (cm)',
      'Státusz',
      'EUR Ár',
      'HUF Ár',
      'Kiküldve (db)',
      'Pixel Megnyitások (db)',
      'Utolsó Megnyitás',
    ];
    const rows = filteredQuotes.map((q) => [
      q.quoteNumber,
      q.createdAt,
      `"${q.customerName.replace(/"/g, '""')}"`,
      q.email,
      `"${q.city}"`,
      q.termekTipus,
      `"${q.beepitesTipus}"`,
      `${q.projection}x${q.width}x${q.height}`,
      q.status,
      q.primaryEur,
      q.primaryHuf,
      q.sentCount,
      q.openCount,
      q.lastOpenedAt || '',
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `opensky_arajanlatok_kimutatas_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* HelloTeam ERP Welcome Header Card */}
      <div className="ht-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#0a0a0a]">
            Üdvözöljük, Balázs!
          </h1>
          <span className="text-[13px] text-[#6b6b6b] font-medium">
            · Szerepkör: admin · Osztály: OpenSky Pergola Értékesítés
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented year filter like HelloTeam top-right pill */}
          <div className="inline-flex items-center bg-[#f3f3f3] p-1 rounded-full border border-[#e8e8e8] text-xs font-semibold">
            {(['all', '2026', '2025'] as const).map((yr) => (
              <button
                key={yr}
                onClick={() => setTimeFilter(yr)}
                className={`px-3 py-1 rounded-full transition ${
                  timeFilter === yr
                    ? 'bg-[#0a0a0a] text-white shadow-sm'
                    : 'text-[#4a4a4a] hover:text-[#0a0a0a]'
                }`}
              >
                {yr === 'all' ? 'Összes' : `${yr}. év`}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-[#0a0a0a] border border-[#d6d6d6] hover:border-[#0a0a0a] transition"
          >
            <Download className="w-3.5 h-3.5" />
            CSV export
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Grid (Exact HelloTeam ERP Video Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): Beavatkozást igényel + Aktív árajánlatok + Pixel napló + Gyors hivatkozások */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Beavatkozást igényel */}
          <div className="ht-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-extrabold tracking-tight text-[#0a0a0a]">
                Beavatkozást igényel
              </h2>
              <span className="text-xs font-medium text-[#6b6b6b]">3 elem</span>
            </div>

            <div className="space-y-2.5">
              {/* Row 1: Blue left border - Opened emails via pixel */}
              <div
                onClick={() => onNavigateTab('quotes')}
                className="ht-action-row ht-action-row--blue px-4 py-3.5 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3.5 pl-1">
                  <Bell className="w-4 h-4 text-[#2563eb] shrink-0" />
                  <div>
                    <div className="text-[13.5px] font-bold text-[#0a0a0a]">
                      Megnyitott árajánlatok (Pixel visszajelzés)
                    </div>
                    <div className="text-[12px] text-[#6b6b6b]">
                      {stats.totalPixelOpens} összesített email megnyitás rögzítve a követő pixellel
                    </div>
                  </div>
                </div>
                <span className="text-[17px] font-extrabold text-[#2563eb] tabular-nums">
                  {stats.openedCount}
                </span>
              </div>

              {/* Row 2: Red left border - Drafts waiting to be sent */}
              <div
                onClick={() => onNavigateTab('quotes')}
                className="ht-action-row ht-action-row--red px-4 py-3.5 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3.5 pl-1">
                  <Wrench className="w-4 h-4 text-[#dc2626] shrink-0" />
                  <div>
                    <div className="text-[13.5px] font-bold text-[#0a0a0a]">
                      Kiküldésre váró árajánlatok
                    </div>
                    <div className="text-[12px] text-[#6b6b6b]">
                      Elkészült PDF kalkulációk, még nem ment ki email
                    </div>
                  </div>
                </div>
                <span className="text-[17px] font-extrabold text-[#dc2626] tabular-nums">
                  {stats.draftCount}
                </span>
              </div>

              {/* Row 3: Amber left border - Sent & waiting decision */}
              <div
                onClick={() => onNavigateTab('quotes')}
                className="ht-action-row ht-action-row--amber px-4 py-3.5 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3.5 pl-1">
                  <Landmark className="w-4 h-4 text-[#d97706] shrink-0" />
                  <div>
                    <div className="text-[13.5px] font-bold text-[#0a0a0a]">
                      Döntésre váró kiküldött tételek
                    </div>
                    <div className="text-[12px] text-[#6b6b6b]">
                      Ügyfél visszajelzésre és elfogadásra vár.
                    </div>
                  </div>
                </div>
                <span className="text-[17px] font-extrabold text-[#d97706] tabular-nums">
                  {stats.waitingDecisionCount}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Aktív árajánlatok / projektek (HelloTeam "Aktív projektek" list style) */}
          <div className="ht-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-extrabold tracking-tight text-[#0a0a0a]">
                Aktív pergola árajánlatok
              </h2>
              <button
                onClick={() => onNavigateTab('quotes')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6b6b] hover:text-[#0a0a0a] transition"
              >
                Összes ({filteredQuotes.length}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {filteredQuotes.slice(0, 7).map((q) => {
                const prod = PRODUCT_TYPES.find((p) => p.id === q.termekTipus);
                return (
                  <div
                    key={q.id}
                    className="bg-[#f6f6f6] hover:bg-[#efefef] border border-[#ebebeb] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition cursor-pointer"
                    onClick={() => onSelectQuoteForEdit(q)}
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-bold text-[#0a0a0a] truncate">
                        {q.customerName} — {prod?.shortName || q.termekTipus} (
                        {q.projection}×{q.width} cm)
                      </div>
                      <div className="text-[11.5px] text-[#6b6b6b] font-mono mt-0.5 truncate">
                        {q.quoteNumber} · {q.city} ·{' '}
                        <strong className="font-sans text-[#0a0a0a]">
                          {formatCurrency(q.primaryHuf)} Ft
                        </strong>{' '}
                        ({formatCurrency(q.primaryEur)} €)
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`text-[11.5px] font-semibold tabular-nums ${
                          q.status === 'elfogadva'
                            ? 'text-[#16a34a]'
                            : q.openCount > 0 || q.status === 'megnyitva'
                            ? 'text-[#2563eb]'
                            : q.status === 'kikuldve'
                            ? 'text-[#d97706]'
                            : 'text-[#6b6b6b]'
                        }`}
                      >
                        {q.createdAt} ·{' '}
                        {q.status === 'elfogadva'
                          ? 'Elfogadva'
                          : q.openCount > 0
                          ? `${q.openCount}× megnyitva`
                          : q.status === 'kikuldve'
                          ? 'Kiküldve'
                          : 'Helyi PDF (Kiküldendő)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Élő Pixel Megnyitási Napló (Real-Time Tracking Feed) */}
          <div className="ht-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
                <h2 className="text-[15.5px] font-extrabold tracking-tight text-[#0a0a0a]">
                  Valós Email Pixel Megnyitási Napló (1×1 GIF)
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#6b6b6b]">
                {trackingEvents.length} valós megnyitás
              </span>
            </div>

            {trackingEvents.length === 0 ? (
              <p className="text-xs text-[#6b6b6b] py-3 leading-relaxed">
                Még nincs rögzített email megnyitás. A követő pixel csak a valóban kiküldött árajánlatokba kerül bele, és itt jelenik meg, amint az ügyfél megnyitja a levelet.
              </p>
            ) : (
              <div className="divide-y divide-[#efefef]">
                {trackingEvents.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#e9f9ef] text-[#16a34a] flex items-center justify-center shrink-0 font-bold">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-[#0a0a0a] truncate">
                          {ev.customerName}{' '}
                          <span className="font-normal text-[#6b6b6b]">
                            ({ev.email})
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6b6b6b] truncate">
                          Tracking ID: {ev.trackingId} · IP: {ev.ipAddress}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#4a4a4a] tabular-nums shrink-0 bg-[#f3f3f3] px-2.5 py-1 rounded-md border border-[#e8e8e8]">
                      {new Date(ev.openedAt).toLocaleString('hu-HU', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Gyors hivatkozások (Exact HelloTeam "Gyors hivatkozások" card from video) */}
          <div className="ht-card p-5">
            <h2 className="text-[15.5px] font-extrabold tracking-tight text-[#0a0a0a] mb-3.5">
              Gyors hivatkozások
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateTab('quotes')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] hover:border-[#0a0a0a] text-[#0a0a0a] transition shadow-2xs"
              >
                CRM · Kiadott árajánlatok ({quotes.length})
              </button>
              <button
                onClick={() => onNavigateTab('new')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] hover:border-[#0a0a0a] text-[#0a0a0a] transition shadow-2xs"
              >
                + Új pergola kalkuláció
              </button>
              <button
                onClick={() => onNavigateTab('admin')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] hover:border-[#0a0a0a] text-[#0a0a0a] transition shadow-2xs"
              >
                Modellenkénti szorzók & %
              </button>
              <button
                onClick={() => onNavigateTab('admin')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] hover:border-[#0a0a0a] text-[#0a0a0a] transition shadow-2xs"
              >
                M² sávos ártáblák
              </button>
              <button
                onClick={() => onNavigateTab('admin')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] hover:border-[#0a0a0a] text-[#0a0a0a] transition shadow-2xs"
              >
                Email sablon & Tracking Pixel
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] hover:border-[#0a0a0a] text-[#0a0a0a] transition shadow-2xs"
              >
                CSV / Excel kimutatás letöltése
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Top CRM Pipeline Card + 2x2 KPI Cards + Donut Charts */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top Full-Width KPI Card: CRM PIPELINE */}
          <div className="ht-kpi-card p-5 pl-6">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b]">
              <TrendingUp className="w-3.5 h-3.5 text-[#0a0a0a]" />
              CRM PIPELINE · ÖSSZES KIADOTT AJÁNLAT
            </div>
            <div className="text-[28px] font-extrabold tracking-tight text-[#0a0a0a] tabular-nums mt-1 leading-tight">
              {formatCompactMillions(stats.totalPipelineHuf)}
            </div>
            <div className="text-[12px] text-[#6b6b6b] mt-1 font-medium">
              {stats.totalCount} aktív ajánlat · {stats.uniqueCities} település ·{' '}
              {formatCurrency(stats.totalPipelineEur)} EUR
            </div>
          </div>

          {/* 2x2 Grid of Left-Bordered KPI Cards (Exact HelloTeam ERP video layout) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="ht-kpi-card p-4 pl-5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                <FolderKanban className="w-3.5 h-3.5" />
                AJÁNLATOK
              </div>
              <div className="text-[24px] font-extrabold text-[#0a0a0a] tabular-nums mt-1 leading-tight">
                {stats.sentCount}
              </div>
              <div className="text-[11.5px] mt-1 font-medium">
                <span className="text-[#dc2626] font-semibold">
                  {stats.draftCount} piszkozat
                </span>{' '}
                <span className="text-[#6b6b6b]">· {stats.totalCount} össz.</span>
              </div>
            </div>

            <div className="ht-kpi-card p-4 pl-5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                <TrendingUp className="w-3.5 h-3.5" />
                ELFOGADOTT NETTÓ
              </div>
              <div className="text-[24px] font-extrabold text-[#0a0a0a] tabular-nums mt-1 leading-tight">
                {formatCompactMillions(stats.acceptedHuf)}
              </div>
              <div className="text-[11.5px] text-[#6b6b6b] mt-1 font-medium">
                {formatCurrency(stats.acceptedEur)} EUR szerződött
              </div>
            </div>

            <div className="ht-kpi-card p-4 pl-5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                <FileText className="w-3.5 h-3.5" />
                SZERZŐDÉSEK
              </div>
              <div className="text-[24px] font-extrabold text-[#0a0a0a] tabular-nums mt-1 leading-tight">
                {stats.acceptedCount}
              </div>
              <div className="text-[11.5px] text-[#6b6b6b] mt-1 font-medium">
                elfogadva · {stats.conversionRatePct}% konverzió
              </div>
            </div>

            <div className="ht-kpi-card p-4 pl-5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                <Eye className="w-3.5 h-3.5" />
                PIXEL MEGNYITÁS
              </div>
              <div className="text-[24px] font-extrabold text-[#0a0a0a] tabular-nums mt-1 leading-tight">
                {stats.openRatePct}%
              </div>
              <div className="text-[11.5px] text-[#6b6b6b] mt-1 font-medium">
                {stats.openedCount} ügyfél · {stats.totalPixelOpens} nyitás
              </div>
            </div>
          </div>

          {/* Donut Chart 1: CRM Deals / Quote Status */}
          <HelloTeamDonutChart
            title="CRM Árajánlatok"
            totalCount={stats.totalCount}
            totalLabel="össz."
            slices={[
              {
                label: 'Megnyitva (Pixel)',
                value: stats.openedCount,
                color: '#0d6efd',
              },
              {
                label: 'Nyert / Elfogadva',
                value: stats.acceptedCount,
                color: '#15803d',
              },
              {
                label: 'Kiküldendő / Várakozó',
                value: Math.max(
                  0,
                  stats.totalCount -
                    stats.openedCount -
                    stats.acceptedCount -
                    stats.rejectedCount
                ),
                color: '#d97706',
              },
              {
                label: 'Vesztett',
                value: stats.rejectedCount,
                color: '#dc2626',
              },
            ]}
          />

          {/* Donut Chart 2: Product Category Breakdown */}
          <HelloTeamDonutChart
            title="Pergola Típus Megoszlás"
            totalCount={stats.totalCount}
            totalLabel="projekt"
            slices={productSlices}
          />
        </div>
      </div>
    </div>
  );
}
