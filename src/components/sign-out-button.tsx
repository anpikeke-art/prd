'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        localStorage.removeItem('prd_project_id');
        localStorage.removeItem('prd_title');
        localStorage.removeItem('prd_idea');
        void signOut({ callbackUrl: '/login' });
      }}
      className="rounded-input border border-pastel-red bg-surface/80 px-3 py-2 text-xs font-semibold text-pastel-red-text shadow-card transition hover:-translate-y-0.5 hover:bg-pastel-red active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      aria-label="Logout dari akun"
    >
      {loading ? 'Keluar...' : compact ? 'Logout' : 'Logout akun'}
    </button>
  );
}
