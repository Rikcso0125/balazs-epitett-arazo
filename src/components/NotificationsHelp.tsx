'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';

export interface NoticeItem {
  id: string;
  tone: 'warn' | 'info';
  title: string;
  detail?: string;
  onClick?: () => void;
}

/**
 * Értesítés (csengő) ikon a fejlécben: egérrel fölé víve (asztali gép) vagy koppintva (mobil)
 * megmutatja a teendőket és értesítéseket. A pötty a teendők számát jelzi.
 */
export function NotificationsHelp({
  items,
  footer,
}: {
  items: NoticeItem[];
  footer?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnCount = items.filter((i) => i.tone === 'warn').length;

  // Kattintás a panelen kívül: bezár
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Egérrel: rámutatásra nyílik (érintőképernyőn csak koppintásra)
  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => {
        if (!canHover()) return;
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (!canHover()) return;
        closeTimer.current = setTimeout(() => setOpen(false), 200);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 grid place-items-center rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100"
        aria-label="Értesítések"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {warnCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold grid place-items-center leading-none">
            {warnCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white border border-slate-200 rounded-xl shadow-lg z-[130] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-950">Teendők és értesítések</div>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">Minden rendben, nincs teendő.</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      it.onClick?.();
                      setOpen(false);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        it.tone === 'warn' ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-950">{it.title}</span>
                      {it.detail && <span className="block text-xs text-slate-500 mt-0.5">{it.detail}</span>}
                    </span>
                    {it.onClick && <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {footer && (
            <div className="px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500">{footer}</div>
          )}
        </div>
      )}
    </div>
  );
}
