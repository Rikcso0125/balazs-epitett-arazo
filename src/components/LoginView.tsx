'use client';

import React, { useState } from 'react';
import { btn, inputCls, labelCls } from '@/components/ui';

export function LoginView({
  companyName,
  onLoggedIn,
}: {
  companyName: string;
  onLoggedIn: (user: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data?.ok) onLoggedIn(data.user || username);
      else setError(data?.error || 'Hibás felhasználónév vagy jelszó.');
    } catch {
      setError('A szerver nem érhető el.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center px-4 bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-7 space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="sb-logo">{companyName.charAt(0)}</div>
          <div>
            <div className="text-base font-semibold text-slate-950">{companyName}</div>
            <div className="text-xs text-slate-500">Árazó rendszer</div>
          </div>
        </div>
        <div>
          <label className={labelCls}>Felhasználónév</label>
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Jelszó</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        {error && <div className="text-[13px] text-rose-700">{error}</div>}
        <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
          {busy ? 'Belépés…' : 'Belépés'}
        </button>
      </form>
    </div>
  );
}
