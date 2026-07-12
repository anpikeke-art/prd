import { getAuthSession } from '@/auth';
import { redirect } from 'next/navigation';
import { SessionsList } from '@/components/sessions-list';
import { SignOutButton } from '@/components/sign-out-button';

export default async function SessionsPage() {
  const session = await getAuthSession();
  if (!session) redirect('/login');

  return (
    <main className="app-shell min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-card border border-border bg-surface/86 p-5 shadow-card backdrop-blur-xl sm:p-6 surface-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">History</p>
              <h1 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">PRD yang pernah kamu bentuk</h1>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Dibuka bertahap supaya daftar tetap ringan walau project sudah ramai.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/ide"
                className="inline-flex rounded-input bg-accent px-4 py-2 text-sm font-semibold text-accent-text transition hover:bg-accent-hover active:scale-[0.98]"
              >
                Buat baru
              </a>
              <SignOutButton />
            </div>
          </div>
        </header>

        <SessionsList />
      </div>
    </main>
  );
}
