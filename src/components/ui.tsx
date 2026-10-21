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
  className = 'mt-4',
}: {
  steps: { num: T; label: string; short?: string }[];
  current: T;
  onSelect: (num: T) => void;
  className?: string;
}) {
  // Telefonon egy sorban, egyenlő oszlopokban (szám fölött rövid címke), nagyobb kijelzőn sorban
  return (
    <ol
      className={`grid gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2 text-sm ${className}`}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((s, idx) => {
        const done = s.num < current;
        const active = s.num === current;
        return (
          <li key={s.num} className="min-w-0 sm:flex sm:items-center sm:gap-1">
            <button
              type="button"
              onClick={() => onSelect(s.num)}
              aria-current={active ? 'step' : undefined}
              aria-label={`${s.num}. ${s.label}`}
              className={`w-full sm:w-auto flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-1 rounded-md transition ${
                active
                  ? 'text-slate-950 font-semibold'
                  : done
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : done
                    ? 'bg-slate-200 text-slate-800'
                    : 'border border-slate-300 text-slate-400'
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : s.num}
              </span>
              <span className="sm:hidden text-[11px] leading-tight text-center break-words">{s.short || s.label}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <span className="hidden sm:block w-6 h-px bg-slate-300" aria-hidden />
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
  sample,
  hint = 'Kattints a szövegben oda, ahová az adatot szeretnéd, majd válaszd ki a listából.',
}: {
  variables: { token: string; name: string; label: string }[];
  onInsert: (token: string) => void;
  sample?: (token: string) => string;
  hint?: string;
}) {
  // Legördülő lista: az adat neve és egy példa arra, mi kerül a helyére
  return (
    <div className="space-y-1">
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onInsert(e.target.value);
        }}
        className="w-full sm:w-auto max-w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
        aria-label="Adat beszúrása"
      >
        <option value="">+ Adat beszúrása a szövegbe…</option>
        {variables.map((v) => {
          const ex = sample ? sample(v.token) : '';
          return (
            <option key={v.token} value={v.token}>
              {v.name}
              {ex && ex !== v.token ? `  →  ${ex}` : ''}
            </option>
          );
        })}
      </select>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * Szöveg előnézete mintaadatokkal: a {{...}} jelölők helyére a kitöltött érték kerül (kiemelve),
 * az ismeretlen jelölők pirosan látszanak.
 */
export function TemplatePreview({
  text,
  fill,
  className = '',
}: {
  text: string;
  fill: (token: string) => string;
  className?: string;
}) {
  const parts = (text || '').split(/(\{\{\s*[\w]+\s*\}\})/g);
  return (
    <div className={`rounded-xl bg-slate-50 border border-dashed border-slate-300 px-3.5 py-2.5 text-[13px] text-slate-700 whitespace-pre-wrap break-words ${className}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">Így jelenik meg (mintaadatokkal)</div>
      {parts.map((part, i) => {
        if (!/^\{\{/.test(part)) return <React.Fragment key={i}>{part}</React.Fragment>;
        const value = fill(part);
        const unknown = value === part;
        return (
          <mark
            key={i}
            className={`rounded px-0.5 ${unknown ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-slate-950'}`}
            title={unknown ? 'Ismeretlen adat: ellenőrizd a jelölőt' : part}
          >
            {unknown ? `${part} (ismeretlen)` : value}
          </mark>
        );
      })}
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

/**
 * Hosszabb szöveghez: egy sorral indul, és a tartalomhoz igazodva nő (nem vágja le a szöveget,
 * Enterre sem tör sort).
 */
export function AutoTextarea({
  value,
  onChange,
  className = '',
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & { value: string }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault();
      }}
      className={`resize-none overflow-hidden leading-snug ${className}`}
      {...rest}
    />
  );
}
