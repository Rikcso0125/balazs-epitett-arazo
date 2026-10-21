'use client';

import React, { useState } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { suggestEmailTemplate } from '@/lib/constants';
import { fillEmailTemplate } from '@/lib/email';
import { QuoteRecord, SystemConfig } from '@/lib/types';
import { btn, inputCls, labelCls } from '@/components/ui';

/**
 * Ajánlat kiküldése: címzett, tárgy, üzenet (a Beállítások sablonjaiból előtöltve), PDF melléklettel.
 */
export function SendEmailModal({
  quote,
  config,
  onClose,
  onSent,
}: {
  quote: QuoteRecord;
  config: SystemConfig;
  onClose: () => void;
  onSent: (updated: QuoteRecord, actuallySent: boolean) => void;
}) {
  const settings = config.emailSettings;
  const initialTemplate = suggestEmailTemplate(settings, quote.status);
  const [templateId, setTemplateId] = useState(initialTemplate?.id || '');
  const [to, setTo] = useState(quote.email || '');
  const [subject, setSubject] = useState(
    fillEmailTemplate(initialTemplate?.subject || '', quote, config)
  );
  const [message, setMessage] = useState(
    fillEmailTemplate(initialTemplate?.body || '', quote, config)
  );

  const chooseTemplate = (id: string) => {
    const tpl = settings.templates.find((t) => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    setSubject(fillEmailTemplate(tpl.subject, quote, config));
    setMessage(fillEmailTemplate(tpl.body, quote, config));
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [smtpMissing, setSmtpMissing] = useState(
    !(settings.smtpHost && settings.smtpUser && settings.smtpPass)
  );

  const submit = async (markOnly: boolean) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, message, markOnly, templateId }),
      });
      const data = await res.json();
      if (data?.ok) {
        onSent(data.quote, !markOnly);
      } else {
        setError(data?.error || 'Nem sikerült elküldeni.');
        if (data?.smtpMissing) setSmtpMissing(true);
      }
    } catch {
      setError('A szerver nem érhető el.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-950">
            Ajánlat küldése · {quote.quoteNumber}
          </h3>
          <button type="button" onClick={onClose} className={`${btn.ghost} ml-auto`} title="Bezárás">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {settings.templates.length > 1 && (
            <div>
              <label className={labelCls}>Sablon</label>
              <div className="flex flex-wrap gap-1.5">
                {settings.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseTemplate(t.id)}
                    className={`px-2.5 py-1 rounded-full border text-[13px] transition ${
                      t.id === templateId
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Címzett</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="ugyfel@email.hu"
              className={inputCls}
              autoFocus={!to}
            />
          </div>
          <div>
            <label className={labelCls}>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Üzenet</label>
            <textarea
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <Paperclip className="w-3.5 h-3.5" />
            {quote.quoteNumber}_árajánlat.pdf (a szerkesztett változat)
          </div>
          {smtpMissing && (
            <div className="text-[13px] text-amber-800">
              Nincs beállítva SMTP, ezért a rendszer nem tud levelet küldeni. Állítsd be a
              Beállítások → E-mail küldés részben, vagy küldd el a PDF-et a saját
              leveleződből, és jelöld kiküldöttnek.
            </div>
          )}
          {error && !smtpMissing && <div className="text-[13px] text-rose-700">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button type="button" disabled={busy} onClick={() => submit(true)} className={btn.ghost}>
            Kiküldöttnek jelölöm
          </button>
          <button
            type="button"
            disabled={busy || smtpMissing}
            onClick={() => submit(false)}
            className={btn.primary}
          >
            <Send className="w-4 h-4" />
            {busy ? 'Küldés…' : 'Küldés'}
          </button>
        </div>
      </div>
    </div>
  );
}
