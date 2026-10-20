'use client';

import React from 'react';
import { Check } from 'lucide-react';

/**
 * Egységes, egyszerű oldalfejléc (MiniCRM page-head): cím, egy soros leírás, jobbra gombok.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        {children}
      </div>
      {actions && (
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * Halk lépésjelző: 1 Ügyfél · 2 Termék · ... - kattintható.
 */
export function Stepper<T extends number>({
  steps,
  current,
  onSelect,
}: {
  steps: { num: T; label: string }[];
  current: T;
  onSelect: (num: T) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 mt-4 text-sm">
      {steps.map((s, idx) => {
        const done = s.num < current;
        const active = s.num === current;
        return (
          <li key={s.num} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(s.num)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition ${
                active
                  ? 'text-slate-950 font-semibold'
                  : done
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full grid place-items-center text-xs font-semibold ${
                  active
                    ? 'bg-slate-900 text-white'
                    : done
                    ? 'bg-slate-200 text-slate-800'
                    : 'border border-slate-300 text-slate-400'
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : s.num}
              </span>
              {s.label}
            </button>
            {idx < steps.length - 1 && (
              <span className="w-6 h-px bg-slate-300" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-medium disabled:opacity-40',
  ghost:
    'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-950 text-sm font-medium',
};

export const card = 'bg-white rounded-2xl border border-slate-200';
export const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm';
export const labelCls = 'block text-[13px] font-medium text-slate-700 mb-1.5';

/**
 * Beszúrható változók gombként: kattintásra a legutóbb kijelölt mezőbe kerül, a kurzor helyére.
 * (onMouseDown preventDefault: a mező fókusza és kijelölése megmarad.)
 */
export function VariableChips({
  variables,
  onInsert,
  hint = 'Kattints egy mezőbe, majd a beszúrandó adatra.',
}: {
  variables: { token: string; name: string; label: string }[];
  onInsert: (token: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v.token}
            type="button"
            title={`${v.label} - ${v.token}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(v.token)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-[13px] text-slate-700"
          >
            <span className="text-slate-400">+</span>
            {v.name}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * Beszúrás egy szövegmező kurzor-pozíciójára; visszaadja az új szöveget és a kurzor helyét.
 */
export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string
): { value: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  return { value: value.slice(0, start) + token + value.slice(end), caret: start + token.length };
}
