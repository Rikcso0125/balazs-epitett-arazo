'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderKanban,
  Layers,
  LayoutGrid,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Percent,
  PlusCircle,
  RefreshCw,
  Send,
  Settings,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { AdminPanelView, AdminSubTab } from '@/components/AdminPanelView';
import {
  DashboardAnalyticsView,
  formatCurrency,
} from '@/components/DashboardAnalyticsView';
import { LoginView } from '@/components/LoginView';
import { ModalDialog } from '@/components/ModalDialog';
import { QuoteConfiguratorView } from '@/components/QuoteConfiguratorView';
import { QuotesListView } from '@/components/QuotesListView';
import { TemplateWizardModal } from '@/components/TemplateWizardModal';
import { DEFAULT_ADMIN_CONFIG, getAllProductTypes } from '@/lib/constants';
import {
  AdminConfig,
  CustomCategoryConfig,
  ModelPricingRule,
  QuoteRecord,
  QuoteStatus,
  TermekTipusId,
  TrackingEvent,
} from '@/lib/types';

type ActiveTab = 'dashboard' | 'quotes' | 'new' | 'admin';

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'info' | 'pixel';
}

export default function OpenSkyHelloTeamErpPage() {
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<string | null>(
    null
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('models');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sidebar collapsible groups state (matching HelloTeam ERP sidebar)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    attekintes: true,
    operativ: true,
    penzugy: true,
    admin: true,
  });

  const [config, setConfig] = useState<AdminConfig>(DEFAULT_ADMIN_CONFIG);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingRate, setRefreshingRate] = useState<boolean>(false);

  // Modals state
  const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);
  const [previewPdfQuote, setPreviewPdfQuote] = useState<QuoteRecord | null>(
    null
  );
  const [emailModalQuote, setEmailModalQuote] = useState<QuoteRecord | null>(
    null
  );
  const [templateWizardOpen, setTemplateWizardOpen] = useState<boolean>(false);
  const [wizardEditingModel, setWizardEditingModel] =
    useState<ModelPricingRule | null>(null);
  const [wizardInitialStep, setWizardInitialStep] = useState<number>(1);
  const [preselectedCategory, setPreselectedCategory] =
    useState<TermekTipusId | null>(null);

  // Email modal form state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (
      title: string,
      description: string,
      type: ToastMessage['type'] = 'success'
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [{ id, title, description, type }, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);
    },
    []
  );

  // Check authentication status on load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' });
        const data = await res.json();
        if (mounted) {
          if (data.authenticated) {
            setAuthenticatedUser(data.user || 'Balázs0125');
          } else {
            const saved = localStorage.getItem('opensky_auth_user');
            if (saved === 'Balázs0125') {
              setAuthenticatedUser('Balázs0125');
            }
          }
        }
      } catch {
        if (mounted) {
          const saved = localStorage.getItem('opensky_auth_user');
          if (saved === 'Balázs0125') {
            setAuthenticatedUser('Balázs0125');
          }
        }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem('opensky_auth_user');
    } catch {
      // ignore
    }
    setAuthenticatedUser(null);
  };

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      if (Array.isArray(data.quotes)) setQuotes(data.quotes);
      if (Array.isArray(data.trackingEvents))
        setTrackingEvents(data.trackingEvents);
    } catch (error) {
      console.error('Failed to load app state:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticatedUser) return;
    fetchState();
    const interval = setInterval(() => {
      fetchState(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchState, authenticatedUser]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Populate email form when opening Email Modal
  const handleOpenSendModal = (quote: QuoteRecord) => {
    const prodLabel =
      getAllProductTypes(config).find((p) => p.id === quote.termekTipus)?.name ||
      quote.termekTipus;
    const defaultSubj = (
      config.emailSettings.subjectTemplate ||
      'OpenSky Pergola Árajánlat - {{customerName}} ({{city}})'
    )
      .replace(/\{\{customerName\}\}|\{ugyfelNev\}/g, quote.customerName)
      .replace(/\{\{city\}\}|\{telepules\}/g, quote.city)
      .replace(/\{\{quoteNumber\}\}|\{datum\}/g, quote.quoteNumber)
      .replace(/\{\{productName\}\}|\{termekTipus\}/g, prodLabel);

    const defaultBody = (
      config.emailSettings.bodyTemplate ||
      'Tisztelt {{greetingName}}!\n\nMellékelten küldjük az Ön részére elkészített személyre szabott OpenSky Pergola árajánlatunkat.\n\nÜdvözlettel,\n{{senderName}}'
    )
      .replace(
        /\{\{greetingName\}\}|\{\s*megszólítás\s*\}/g,
        quote.greetingName || quote.customerName
      )
      .replace(/\{\{customerName\}\}|\{ugyfelNev\}/g, quote.customerName)
      .replace(/\{\{city\}\}|\{telepules\}/g, quote.city)
      .replace(/\{\{quoteNumber\}\}|\{datum\}/g, quote.quoteNumber)
      .replace(/\{\{productName\}\}|\{termekTipus\}/g, prodLabel)
      .replace(
        /\{\{senderName\}\}|\{senderName\}/g,
        config.emailSettings.senderName || 'OpenSky Pergola'
      );

    setEmailTo(quote.email || '');
    setEmailSubject(defaultSubj);
    setEmailBody(defaultBody);
    setEmailModalQuote(quote);
  };

  // One-click quick send
  const handleQuickOneClickSend = async (quote: QuoteRecord) => {
    if (!quote.email) {
      handleOpenSendModal(quote);
      return;
    }
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: quote.email }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchState(true);
        addToast(
          'Árajánlat 1-kattintással elküldve!',
          `Címzett: ${quote.email} · Tracking pixel aktív (${quote.trackingId})`,
          'success'
        );
      }
    } catch (e) {
      console.error('Quick send error:', e);
    }
  };

  // Send from modal
  const handleConfirmSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalQuote || !emailTo) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/quotes/${emailModalQuote.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTo,
          subject: emailSubject,
          customBody: emailBody,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchState(true);
        setEmailModalQuote(null);
        addToast(
          data.deliveryMode === 'smtp'
            ? 'Email sikeresen elküldve (SMTP)!'
            : 'Árajánlat kiküldve & Tracking Pixel aktiválva!',
          `${emailTo} részére a PDF csatolmánnyal és a követő pixellel rögzítve.`,
          'success'
        );
      }
    } catch (error) {
      console.error('Send email failed:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  // Simulate or trigger tracking pixel open
  const handleSimulatePixelOpen = async (quote: QuoteRecord) => {
    try {
      await fetch(
        `/api/track/open/${quote.trackingId}.gif?source=${encodeURIComponent(
          `Ügyfél megnyitás (${quote.customerName} - ${quote.email || 'Email kliens'})`
        )}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      await fetchState(true);
      addToast(
        '🔔 PIXEL ÉRTESÍTÉS: Email megnyitva!',
        `${quote.customerName} (${quote.city}) éppen megnyitotta a kiküldött árajánlatot!`,
        'pixel'
      );
    } catch (e) {
      console.error('Failed to trigger pixel:', e);
    }
  };

  // Change quote status
  const handleStatusChange = async (
    quote: QuoteRecord,
    newStatus: QuoteStatus
  ) => {
    try {
      await fetch(`/api/quotes/${quote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchState(true);
      addToast(
        'Státusz frissítve',
        `${quote.customerName} ajánlata: ${newStatus.toUpperCase()}`,
        'info'
      );
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  // Create new quote
  const handleCreateNewQuote = async (
    payload: Partial<QuoteRecord> & {
      generatePdf?: boolean;
      sendImmediately?: boolean;
    }
  ) => {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok && data.quote) {
      const created: QuoteRecord = data.quote;
      if (payload.sendImmediately && created.email) {
        await fetch(`/api/quotes/${created.id}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: created.email }),
        });
        addToast(
          'Új árajánlat legenerálva és kiküldve!',
          `${created.customerName} (${created.city}) PDF ajánlata elkészült és elküldve a követő pixellel.`,
          'success'
        );
      } else {
        addToast(
          'Új árajánlat és hivatalos PDF elkészült!',
          `${created.customerName} (${created.city}) árajánlata elmentve az ajanlatok/ mappába.`,
          'success'
        );
      }
      await fetchState(true);
      setActiveTab('quotes');
    }
  };

  // Update existing quote from modal
  const handleUpdateExistingQuote = async (
    payload: Partial<QuoteRecord> & {
      regeneratePdf?: boolean;
      sendImmediately?: boolean;
    }
  ) => {
    if (!editingQuote) return;
    const res = await fetch(`/api/quotes/${editingQuote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok && data.quote) {
      const updated: QuoteRecord = data.quote;
      if (payload.sendImmediately && updated.email) {
        await fetch(`/api/quotes/${updated.id}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: updated.email }),
        });
      }
      await fetchState(true);
      setEditingQuote(null);
      addToast(
        'Árajánlat sikeresen módosítva!',
        `${updated.customerName} ajánlata és PDF dokumentuma frissült.`,
        'success'
      );
    }
  };

  // Delete quote
  const handleDeleteQuote = async (quote: QuoteRecord) => {
    const res = await fetch(`/api/quotes/${quote.id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchState(true);
      addToast(
        'Árajánlat törölve',
        `${quote.customerName} ajánlata eltávolítva.`,
        'info'
      );
    }
  };

  // Save Admin Config
  const handleSaveAdminConfig = async (
    newConfig: AdminConfig,
    recalculateAll: boolean
  ) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig, recalculateAll }),
    });
    const data = await res.json();
    if (data.ok) {
      await fetchState(true);
      addToast(
        recalculateAll
          ? 'Admin szabályok elmentve & ajánlatok újraszámolva!'
          : 'Admin árazási szabályok elmentve!',
        'Minden százalék, szorzó és felár azonnal érvényesült programozás nélkül.',
        'success'
      );
    }
  };

  // Reset Admin Config defaults
  const handleResetAdminDefaults = async () => {
    const res = await fetch('/api/config', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      await fetchState(true);
      addToast(
        'Gyári alapértékek visszaállítva',
        'Minden szorzó és százalék visszaállt a gyári alapértékre.',
        'info'
      );
    }
  };

  // Fetch live MNB EUR/HUF rate
  const handleRefreshLiveEurRate = async () => {
    setRefreshingRate(true);
    try {
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (data.rate) {
        const nextConfig: AdminConfig = {
          ...config,
          general: {
            ...config.general,
            defaultEurHufRate: data.rate,
          },
        };
        await handleSaveAdminConfig(nextConfig, false);
        addToast(
          'Élő MNB árfolyam frissítve!',
          `Aktuális EUR/HUF középárfolyam: ${data.rate} Ft/€ (${data.source})`,
          'info'
        );
      }
    } catch (e) {
      console.error('Rate fetch error:', e);
    } finally {
      setRefreshingRate(false);
    }
  };

  const handleOpenTemplateWizard = (
    modelToEdit?: ModelPricingRule | null,
    initialStep?: number
  ) => {
    setWizardEditingModel(modelToEdit || null);
    setWizardInitialStep(initialStep || 1);
    setTemplateWizardOpen(true);
  };

  const handleSaveTemplateFromWizard = async (
    rule: ModelPricingRule,
    newCategory: CustomCategoryConfig | null,
    openInConfiguratorAfterSave: boolean
  ) => {
    const existingCustomCats = config.customCategories || [];
    const updatedCustomCats = newCategory
      ? [
          ...existingCustomCats.filter((c) => c.id !== newCategory.id),
          newCategory,
        ]
      : existingCustomCats;

    const nextConfig: AdminConfig = {
      ...config,
      customCategories: updatedCustomCats,
      models: {
        ...config.models,
        [rule.id]: rule,
      },
    };

    await handleSaveAdminConfig(nextConfig, false);
    setTemplateWizardOpen(false);
    setWizardEditingModel(null);

    addToast(
      'Új sablon sikeresen létrehozva és aktiválva!',
      `${rule.name} sablon elmentve — azonnal használható az árajánlat készítőben.`,
      'success'
    );

    if (openInConfiguratorAfterSave) {
      setPreselectedCategory(rule.category);
      setActiveTab('new');
    }
  };

  const openedCount = quotes.filter((q) => q.openCount > 0).length;
  const acceptedCount = quotes.filter((q) => q.status === 'elfogadva').length;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5] text-xs font-bold text-[#71717a]">
        Jogosultság ellenőrzése...
      </div>
    );
  }

  if (!authenticatedUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setAuthenticatedUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fafafa] text-[#0a0a0a]">
      {/* Floating Toast Notifications (HelloTeam ERP clean light/dark toast style) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-xl p-4 bg-white text-[#0a0a0a] border border-[#e0e0e0] border-l-4 border-l-[#0a0a0a] shadow-xl flex items-start gap-3"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                toast.type === 'pixel'
                  ? 'bg-[#eff6ff] text-[#2563eb]'
                  : 'bg-[#e9f9ef] text-[#16a34a]'
              }`}
            >
              {toast.type === 'pixel' ? (
                <Bell className="w-4 h-4 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold text-[#0a0a0a]">
                {toast.title}
              </div>
              <div className="text-[11.5px] mt-0.5 leading-relaxed text-[#4a4a4a]">
                {toast.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* LEFT SIDEBAR (Exact replica of HelloTeam ERP Sidebar in the video) */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-[68px]' : 'w-[244px]'
        } hidden md:flex flex-col bg-white border-r border-[#e8e8e8] shrink-0 sticky top-0 h-screen select-none transition-all duration-200 z-30`}
      >
        {/* Brand Top Bar */}
        <div className="h-[60px] px-4 flex items-center justify-between border-b border-[#f0f0f0]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            {/* Exact HelloTeam style black rounded-rect SVG monogram */}
            <span className="w-7 h-7 rounded-[7px] bg-[#0a0a0a] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-4 h-4">
                <path
                  d="M31.25 25V75M31.25 75V62.5a18.75 18.75 0 0 1 37.5 0V75"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="68.75" cy="21.875" r="10" fill="#fff" />
              </svg>
            </span>
            {!sidebarCollapsed && (
              <div className="truncate">
                <span className="text-[15px] font-extrabold tracking-tight text-[#0a0a0a] block leading-none">
                  OpenSky
                </span>
                <span className="text-[10px] font-medium text-[#6b6b6b] block mt-0.5">
                  Pergola ERP · v2.0
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-6 h-6 rounded-md border border-[#e5e5e5] flex items-center justify-center text-[#6b6b6b] hover:text-[#0a0a0a] hover:bg-[#f3f3f3] transition shrink-0"
            title={sidebarCollapsed ? 'Oldalsáv kinyitása' : 'Oldalsáv összecsukása'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* GROUP 1: ÁTTEKINTÉS */}
          <div>
            {!sidebarCollapsed && (
              <button
                onClick={() => toggleGroup('attekintes')}
                className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[#a3a3a3] hover:text-[#6b6b6b]"
              >
                <span>ÁTTEKINTÉS</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    openGroups.attekintes ? '' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(openGroups.attekintes || sidebarCollapsed) && (
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`ht-nav-item ${
                    activeTab === 'dashboard' ? 'ht-nav-item--active' : ''
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Irányítópult</span>}
                </button>
              </div>
            )}
          </div>

          {/* GROUP 2: OPERATÍV (CRM, Árajánlatok, Kalkulátor) */}
          <div className="pt-2 border-t border-[#f2f2f2]">
            {!sidebarCollapsed && (
              <button
                onClick={() => toggleGroup('operativ')}
                className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[#a3a3a3] hover:text-[#6b6b6b]"
              >
                <span>OPERATÍV</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    openGroups.operativ ? '' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(openGroups.operativ || sidebarCollapsed) && (
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`ht-nav-item ${
                    activeTab === 'quotes' ? 'ht-nav-item--active' : ''
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left">CRM · Árajánlatok</span>
                  )}
                  {!sidebarCollapsed && (
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-[#efefef] text-[#4a4a4a] tabular-nums">
                      {quotes.length}
                    </span>
                  )}
                </button>

                {/* Indented CRM Sub-menu like HelloTeam video frame 3 & mid2 */}
                {!sidebarCollapsed && (
                  <div className="ml-3.5 pl-2.5 border-l border-[#e8e8e8] space-y-0.5 py-0.5">
                    <button
                      onClick={() => setActiveTab('new')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition ${
                        activeTab === 'new'
                          ? 'bg-[#e4e4e4] text-[#0a0a0a] font-bold'
                          : 'text-[#4a4a4a] hover:bg-[#f3f3f3] hover:text-[#0a0a0a]'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Új árajánlat</span>
                    </button>

                    <button
                      onClick={() => handleOpenTemplateWizard(null)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ Új sablon (Varázsló)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('quotes')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#4a4a4a] hover:bg-[#f3f3f3] hover:text-[#0a0a0a] transition"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Összes ajánlat
                      </span>
                      <span className="text-[10.5px] text-[#6b6b6b] tabular-nums">
                        {quotes.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('quotes')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#4a4a4a] hover:bg-[#f3f3f3] hover:text-[#0a0a0a] transition"
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-[#2563eb]" />
                        Megnyitva (Pixel)
                      </span>
                      <span className="text-[10.5px] font-bold text-[#2563eb] tabular-nums">
                        {openedCount}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('quotes')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#4a4a4a] hover:bg-[#f3f3f3] hover:text-[#0a0a0a] transition"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                        Elfogadva
                      </span>
                      <span className="text-[10.5px] font-bold text-[#16a34a] tabular-nums">
                        {acceptedCount}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GROUP 3: PÉNZÜGY & ÁRFOLYAM */}
          <div className="pt-2 border-t border-[#f2f2f2]">
            {!sidebarCollapsed && (
              <button
                onClick={() => toggleGroup('penzugy')}
                className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[#a3a3a3] hover:text-[#6b6b6b]"
              >
                <span>PÉNZÜGY</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    openGroups.penzugy ? '' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(openGroups.penzugy || sidebarCollapsed) && (
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={handleRefreshLiveEurRate}
                  disabled={refreshingRate}
                  className="ht-nav-item"
                  title="Kattintson az élő MNB EUR/HUF árfolyam frissítéséhez"
                >
                  <RefreshCw
                    className={`w-4 h-4 shrink-0 ${
                      refreshingRate ? 'animate-spin' : ''
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left">Devizakezelő (MNB)</span>
                  )}
                  {!sidebarCollapsed && (
                    <span className="text-[11px] font-bold text-[#0a0a0a] tabular-nums">
                      {config.general.defaultEurHufRate} Ft
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* GROUP 4: ADMIN (Zero-code pricing & percentages) */}
          <div className="pt-2 border-t border-[#f2f2f2]">
            {!sidebarCollapsed && (
              <button
                onClick={() => toggleGroup('admin')}
                className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[#a3a3a3] hover:text-[#6b6b6b]"
              >
                <span>ADMIN</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    openGroups.admin ? '' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(openGroups.admin || sidebarCollapsed) && (
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => handleOpenTemplateWizard(null)}
                  className="ht-nav-item text-emerald-700 font-bold"
                  title="Új sablon felvitele lépésről lépésre kérdés-felelet varázslóval"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                  {!sidebarCollapsed && <span>+ Új Sablon Varázsló</span>}
                </button>

                <button
                  onClick={() => {
                    setAdminSubTab('models');
                    setActiveTab('admin');
                  }}
                  className={`ht-nav-item ${
                    activeTab === 'admin' && adminSubTab === 'models'
                      ? 'ht-nav-item--active'
                      : ''
                  }`}
                >
                  <Percent className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Százalékok & Szorzók</span>}
                </button>

                <button
                  onClick={() => {
                    setAdminSubTab('m2tiers');
                    setActiveTab('admin');
                  }}
                  className={`ht-nav-item ${
                    activeTab === 'admin' && adminSubTab === 'm2tiers'
                      ? 'ht-nav-item--active'
                      : ''
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>M² sávos ártáblák</span>}
                </button>

                <button
                  onClick={() => {
                    setAdminSubTab('general');
                    setActiveTab('admin');
                  }}
                  className={`ht-nav-item ${
                    activeTab === 'admin' && adminSubTab === 'general'
                      ? 'ht-nav-item--active'
                      : ''
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Globális & Szerelés %</span>}
                </button>

                <button
                  onClick={() => {
                    setAdminSubTab('email');
                    setActiveTab('admin');
                  }}
                  className={`ht-nav-item ${
                    activeTab === 'admin' && adminSubTab === 'email'
                      ? 'ht-nav-item--active'
                      : ''
                  }`}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Email & Pixel sablon</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Pinned Profile Section ("SAJÁT" in HelloTeam ERP video) */}
        <div className="p-3 border-t border-[#efefef] bg-white space-y-2">
          {!sidebarCollapsed && (
            <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[#a3a3a3]">
              <span>SAJÁT FIÓK</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          )}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#f6f6f6] border border-[#eaeaea]">
            <div className="w-7 h-7 rounded-full bg-[#0a0a0a] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
              B
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-bold text-[#0a0a0a] truncate">
                  {authenticatedUser}
                </div>
                <div className="text-[10px] text-[#6b6b6b] truncate">
                  Adminisztrátor
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              title="Kijelentkezés"
              className="p-1.5 rounded-lg text-[#71717a] hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Bar (Exact match to top-right segmented pills & notification bell in HelloTeam video) */}
        <header className="h-[60px] px-4 sm:px-6 lg:px-8 border-b border-[#ebebeb] bg-[#fafafa]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-[#e0e0e0] bg-white text-[#0a0a0a]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="text-xs font-medium text-[#6b6b6b] truncate">
              <strong className="font-extrabold text-[#0a0a0a]">
                OpenSky ERP
              </strong>{' '}
              ·{' '}
              {activeTab === 'dashboard'
                ? 'Irányítópult & Kimutatások'
                : activeTab === 'quotes'
                ? 'CRM · Kiadott árajánlatok'
                : activeTab === 'new'
                ? 'Új pergola árajánlat kalkulátor'
                : 'Adminisztráció · Százalékok & Árazás'}
            </div>
          </div>

          {/* Right Segmented Pill + Notification Bell with Red Badge + Megaphone */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenTemplateWizard(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Új Sablon Varázsló
            </button>

            {/* Segmented Pill Switcher like "Enyém | Velem megosztott | Összes" in HelloTeam video */}
            <div className="hidden sm:inline-flex items-center bg-white border border-[#e5e5e5] rounded-full p-1 shadow-2xs text-xs font-semibold">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1 rounded-full transition ${
                  activeTab === 'dashboard'
                    ? 'bg-[#0a0a0a] text-white font-bold'
                    : 'text-[#4a4a4a] hover:text-[#0a0a0a]'
                }`}
              >
                Irányítópult
              </button>
              <button
                onClick={() => setActiveTab('quotes')}
                className={`px-3.5 py-1 rounded-full transition ${
                  activeTab === 'quotes'
                    ? 'bg-[#0a0a0a] text-white font-bold'
                    : 'text-[#4a4a4a] hover:text-[#0a0a0a]'
                }`}
              >
                Árajánlatok ({quotes.length})
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-3.5 py-1 rounded-full transition ${
                  activeTab === 'new'
                    ? 'bg-[#0a0a0a] text-white font-bold'
                    : 'text-[#4a4a4a] hover:text-[#0a0a0a]'
                }`}
              >
                + Új ajánlat
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1 rounded-full transition ${
                  activeTab === 'admin'
                    ? 'bg-[#0a0a0a] text-white font-bold'
                    : 'text-[#4a4a4a] hover:text-[#0a0a0a]'
                }`}
              >
                Admin %
              </button>
            </div>

            {/* Notification Bell with Red Counter Badge (Exact HelloTeam ERP video icon) */}
            <button
              onClick={() => setActiveTab('dashboard')}
              title={`${openedCount} megnyitott árajánlat (Email Tracking Pixel)`}
              className="relative w-9 h-9 rounded-full bg-white border border-[#e5e5e5] hover:border-[#0a0a0a] flex items-center justify-center text-[#0a0a0a] shadow-2xs transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-[#dc2626] text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow-xs">
                {openedCount}
              </span>
            </button>

            {/* Megaphone Quick Action Button */}
            <button
              onClick={() => setActiveTab('quotes')}
              title="Kiadott árajánlatok megnyitása"
              className="w-9 h-9 rounded-full bg-white border border-[#e5e5e5] hover:border-[#0a0a0a] flex items-center justify-center text-[#0a0a0a] shadow-2xs transition"
            >
              <Megaphone className="w-4 h-4" />
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              title={`Kijelentkezés (${authenticatedUser})`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e5e5e5] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold text-[#4a4a4a] shadow-2xs transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Kilépés</span>
            </button>
          </div>
        </header>

        {/* Mobile Quick Nav Bar */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#e8e8e8] px-4 py-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f3f3f3] text-[#0a0a0a]"
            >
              Irányítópult
            </button>
            <button
              onClick={() => {
                setActiveTab('quotes');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f3f3f3] text-[#0a0a0a]"
            >
              Kiadott árajánlatok ({quotes.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('new');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0a0a0a] text-white"
            >
              + Új árajánlat
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenTemplateWizard(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white"
            >
              + Új Sablon Varázsló
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f3f3f3] text-[#0a0a0a]"
            >
              Admin & Százalékok
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="ht-card p-16 text-center">
              <RefreshCw className="w-7 h-7 text-[#0a0a0a] animate-spin mx-auto mb-3" />
              <h2 className="text-sm font-extrabold text-[#0a0a0a]">
                OpenSky ERP betöltése...
              </h2>
              <p className="text-xs text-[#6b6b6b] mt-1">
                Kiadott árajánlatok, gyári ármátrixok és email pixel napló szinkronizálása
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardAnalyticsView
                  quotes={quotes}
                  trackingEvents={trackingEvents}
                  onSelectQuoteForEdit={(quote) => setEditingQuote(quote)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'quotes' && (
                <QuotesListView
                  quotes={quotes}
                  onEditQuote={(quote) => setEditingQuote(quote)}
                  onOpenSendModal={handleOpenSendModal}
                  onQuickOneClickSend={handleQuickOneClickSend}
                  onStatusChange={handleStatusChange}
                  onPreviewPdf={(quote) => setPreviewPdfQuote(quote)}
                  onDeleteQuote={handleDeleteQuote}
                  onNewQuoteClick={() => setActiveTab('new')}
                />
              )}

              {activeTab === 'new' && (
                <QuoteConfiguratorView
                  config={config}
                  initialQuote={null}
                  preselectedCategory={preselectedCategory}
                  onSaveQuote={handleCreateNewQuote}
                  onOpenTemplateWizard={() => handleOpenTemplateWizard(null)}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPanelView
                  config={config}
                  initialSubTab={adminSubTab}
                  onSaveConfig={handleSaveAdminConfig}
                  onResetDefaults={handleResetAdminDefaults}
                  onOpenTemplateWizard={handleOpenTemplateWizard}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL 1: Edit Existing Quote */}
      <ModalDialog
        open={Boolean(editingQuote)}
        onClose={() => setEditingQuote(null)}
        title={
          editingQuote
            ? `Árajánlat szerkesztése: ${editingQuote.customerName} (${editingQuote.city})`
            : 'Árajánlat szerkesztése'
        }
        subtitle="Módosítsa a méreteket, extrákat, egyedi kedvezményeket vagy árakat — mentéskor a hivatalos PDF is újragenerálható."
        maxWidthClass="max-w-6xl"
      >
        {editingQuote && (
          <QuoteConfiguratorView
            config={config}
            initialQuote={editingQuote}
            onSaveQuote={handleUpdateExistingQuote}
            onCancel={() => setEditingQuote(null)}
          />
        )}
      </ModalDialog>

      {/* MODAL 2: Email Send & Tracking Pixel Preview */}
      <ModalDialog
        open={Boolean(emailModalQuote)}
        onClose={() => setEmailModalQuote(null)}
        title={
          emailModalQuote
            ? `Árajánlat kiküldése emailben — ${emailModalQuote.customerName}`
            : 'Árajánlat kiküldése'
        }
        subtitle="Az email automatikusan tartalmazza a PDF árajánlatot csatolmányként és a láthatatlan 1×1 követő pixelt (Tracking Pixel) a megnyitás értesítéshez."
        maxWidthClass="max-w-3xl"
      >
        {emailModalQuote && (
          <form onSubmit={handleConfirmSendEmail} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1">
                  Címzett Valós Email Címe *
                </label>
                <input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="ugyfel@valosemail.hu"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-[#0a0a0a] text-sm font-medium focus:border-[#0a0a0a] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3d3d3d] mb-1">
                  Csatolt PDF Dokumentum
                </label>
                <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#f6f6f6] border border-[#e5e5e5] text-xs text-[#3d3d3d]">
                  <span className="truncate font-medium">
                    {emailModalQuote.filename || 'Generált OpenSky PDF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPdfQuote(emailModalQuote)}
                    className="text-[#0a0a0a] font-extrabold hover:underline ml-2 shrink-0"
                  >
                    Előnézet
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3d3d3d] mb-1">
                Email Tárgya
              </label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-[#0a0a0a] text-sm font-medium focus:border-[#0a0a0a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3d3d3d] mb-1">
                Email Szövege
              </label>
              <textarea
                rows={5}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#d6d6d6] text-[#0a0a0a] text-sm focus:border-[#0a0a0a] outline-none"
              />
            </div>

            {/* Tracking Pixel Status Card */}
            <div className="rounded-xl bg-[#f6f6f6] border border-[#e5e5e5] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
                  <span className="text-xs font-extrabold text-[#0a0a0a]">
                    Automatikus Nyitáskövető Pixel (1×1 GIF) — Csak valós kiküldött levélhez
                  </span>
                </div>
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#e0e0e0] text-[#0a0a0a]">
                  ID: {emailModalQuote.trackingId}
                </span>
              </div>
              <p className="text-xs text-[#4a4a4a] leading-relaxed">
                A követő pixel kizárólag a megadott valós email címre kiküldött
                levélbe kerül bele. Amikor a címzett megnyitja a levelet, a
                rendszer rögzíti a megnyitás pontos idejét és átállítja a
                státuszt{' '}
                <strong className="font-bold text-[#0a0a0a]">
                  „Megnyitva (Pixel)”
                </strong>{' '}
                állapotra.
              </p>
              <div className="text-[11px] font-mono bg-[#0a0a0a] text-white px-3 py-2 rounded-lg overflow-x-auto">
                {`<img src="${config.emailSettings.publicBaseUrl}/api/track/open/${emailModalQuote.trackingId}.gif" width="1" height="1" alt="" />`}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#efefef]">
              <button
                type="button"
                onClick={() => setEmailModalQuote(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-[#4a4a4a] bg-[#f3f3f3] hover:bg-[#e5e5e5] transition"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={sendingEmail}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-extrabold text-white bg-[#0a0a0a] hover:bg-[#262626] transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingEmail
                  ? 'Kiküldés folyamatban...'
                  : 'Árajánlat Kiküldése Most'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL 3: Official OpenSky PDF Preview */}
      <ModalDialog
        open={Boolean(previewPdfQuote)}
        onClose={() => setPreviewPdfQuote(null)}
        title={
          previewPdfQuote
            ? `Hivatalos PDF Árajánlat: ${previewPdfQuote.customerName} (${previewPdfQuote.city})`
            : 'PDF Előnézet'
        }
        subtitle={
          previewPdfQuote
            ? `Fájl: ${previewPdfQuote.filename || 'Generált PDF'} · Ár: ${formatCurrency(
                previewPdfQuote.primaryHuf
              )} Ft (${formatCurrency(previewPdfQuote.primaryEur)} €)`
            : ''
        }
        maxWidthClass="max-w-5xl"
      >
        {previewPdfQuote && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f6f6f6] p-3 rounded-xl border border-[#e5e5e5]">
              <div className="text-xs text-[#4a4a4a]">
                Méret:{' '}
                <strong className="text-[#0a0a0a]">
                  {previewPdfQuote.projection} × {previewPdfQuote.width} ×{' '}
                  {previewPdfQuote.height} cm
                </strong>{' '}
                · Árfolyam:{' '}
                <strong className="text-[#0a0a0a]">
                  {previewPdfQuote.eurHufRate} Ft/€
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const q = previewPdfQuote;
                    setPreviewPdfQuote(null);
                    setEditingQuote(q);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#0a0a0a] border border-[#d6d6d6] hover:border-[#0a0a0a]"
                >
                  Árajánlat Szerkesztése
                </button>
                <button
                  onClick={() => {
                    const q = previewPdfQuote;
                    setPreviewPdfQuote(null);
                    handleOpenSendModal(q);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#0a0a0a] border border-[#d6d6d6] hover:border-[#0a0a0a]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Kiküldés Emailben
                </button>
                <a
                  href={`/api/quotes/${previewPdfQuote.id}/pdf?download=1`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0a0a0a] text-white hover:bg-[#262626]"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF Letöltése
                </a>
              </div>
            </div>

            <div className="w-full h-[72dvh] rounded-xl overflow-hidden border border-[#d6d6d6] bg-[#262626]">
              <iframe
                src={`/api/quotes/${previewPdfQuote.id}/pdf`}
                className="w-full h-full"
                title="OpenSky Pergola PDF Preview"
              />
            </div>
          </div>
        )}
      </ModalDialog>

      {/* MODAL 4: Interactive 8-Step Template Wizard */}
      {templateWizardOpen && (
        <TemplateWizardModal
          open={templateWizardOpen}
          config={config}
          initialModelToEdit={wizardEditingModel}
          initialStep={wizardInitialStep}
          onClose={() => {
            setTemplateWizardOpen(false);
            setWizardEditingModel(null);
            setWizardInitialStep(1);
          }}
          onSaveTemplate={handleSaveTemplateFromWizard}
        />
      )}
    </div>
  );
}
