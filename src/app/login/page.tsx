import { getAuthSession } from '@/auth';
import { redirect } from 'next/navigation';
import { SignInButton } from '@/components/sign-in-button';

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) redirect('/');

  return (
    <main className="app-shell grid min-h-dvh place-items-center px-4 py-8 sm:px-6">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-card border border-border bg-surface/88 shadow-card backdrop-blur-xl md:grid-cols-[1.05fr_0.95fr] surface-glow">
        <div className="color-band relative min-h-[320px] overflow-hidden p-6 text-center sm:p-8">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute bottom-8 right-8 h-28 w-40 rotate-6 rounded-card border border-white/35 bg-white/28 backdrop-blur-md soft-float" />
          <div className="relative flex h-full flex-col items-center justify-center gap-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/35 bg-white/30 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
              <span className="size-2 rounded-full bg-accent" />
              PRD Studio
            </div>
            <div className="mx-auto max-w-md text-left">
              <h1 className="text-4xl font-black tracking-tight text-primary sm:text-5xl">
                Dari ide mentah ke PRD yang bisa dieksekusi.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-secondary">
                Rancang fitur, pecah task, lalu sinkronkan progres dengan agent lewat MCP.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mx-auto flex h-full max-w-sm flex-col justify-center">
            <div className="mb-8">
              <div className="mb-4 flex size-12 items-center justify-center rounded-card bg-surface-alt text-accent shadow-card">
                <span className="font-mono text-lg font-black">P</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-primary">Masuk dulu</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Sesi aman, project tersimpan, dan kamu bisa lanjut dari history kapan saja.
              </p>
            </div>

            <div className="mb-5 flex items-center gap-3 text-muted">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Google OAuth</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <SignInButton />

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {['Ide', 'PRD', 'MCP'].map((label) => (
                <div key={label} className="rounded-input border border-border bg-surface-alt px-2 py-3">
                  <p className="text-xs font-semibold text-primary">{label}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
              Maksimal 10 sesi per akun. Sesi terlama otomatis dihapus saat login baru.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
