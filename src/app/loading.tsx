export default function Loading() {
  return (
    <main className="app-shell min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-xl rounded-card border border-border bg-surface/88 p-6 shadow-card backdrop-blur-xl surface-glow">
          <div className="mb-6 flex items-center gap-3">
            <div className="size-11 rounded-card color-band soft-float" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3 w-36 rounded-full" />
              <div className="skeleton h-2.5 w-56 rounded-full" />
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="page-loader-bar h-full w-2/3 rounded-full bg-accent" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="skeleton h-24 rounded-card" />
            <div className="skeleton h-24 rounded-card sm:translate-y-4" />
            <div className="skeleton h-24 rounded-card" />
          </div>
        </div>
      </div>
    </main>
  );
}
