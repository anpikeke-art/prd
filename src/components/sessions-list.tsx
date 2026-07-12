'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { ContinueButton } from '@/components/continue-project';

type ProjectSummary = {
  id: string;
  title: string;
  overview: string | null;
  architecture_text: string | null;
  created_at: string;
  updated_at: string;
};

function HistorySkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card border border-border bg-surface/82 p-4 shadow-card backdrop-blur-xl" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="skeleton h-4 w-2/5 rounded-full" />
              <div className="skeleton h-3 w-4/5 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
            </div>
            <div className="skeleton h-9 w-24 rounded-input" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SessionsList() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadProjects = useCallback(async (cursor?: string | null) => {
    setError('');
    const params = new URLSearchParams({ take: '6' });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/projects?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Load failed');
    startTransition(() => {
      setProjects((prev) => (cursor ? [...prev, ...json.data.projects] : json.data.projects));
      setNextCursor(json.data.nextCursor ?? null);
    });
  }, []);

  useEffect(() => {
    loadProjects()
      .catch((err) => setError(err instanceof Error ? err.message : 'Load failed'))
      .finally(() => setInitialLoading(false));
  }, [loadProjects]);

  async function deleteProject(projectId: string) {
    const snapshot = projects;
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Delete failed');
    } catch (err) {
      setProjects(snapshot);
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (initialLoading) return <HistorySkeleton />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-card border border-pastel-red bg-pastel-red p-4 text-sm text-pastel-red-text">
          {error}
        </div>
      )}

      {projects.length === 0 && !error && (
        <div className="rounded-card border border-border bg-surface/88 p-10 text-center shadow-card backdrop-blur-xl">
          <div className="mx-auto mb-4 size-12 rounded-card color-band" />
          <h2 className="text-base font-semibold text-primary">Belum ada PRD tersimpan</h2>
          <p className="mt-2 text-sm text-secondary">Mulai dari halaman ide, lalu hasil PRD akan muncul di sini.</p>
          <a href="/ide" className="mt-5 inline-flex rounded-input bg-accent px-4 py-2 text-sm font-semibold text-accent-text transition hover:bg-accent-hover active:scale-[0.98]">
            Buat PRD
          </a>
        </div>
      )}

      <div className="grid gap-3">
        {projects.map((project, idx) => (
          <article
            key={project.id}
            className="stagger-item rounded-card border border-border bg-surface/88 p-4 shadow-card backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-card-hover"
            style={{ '--i': `${idx}` } as CSSProperties}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`size-2 rounded-full ${project.architecture_text ? 'bg-accent' : 'bg-[var(--color-warm)]'}`} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    {project.architecture_text ? 'PRD siap' : 'Draft'}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-primary">{project.title}</h2>
                {project.overview && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{project.overview}</p>}
                <p className="mt-3 font-mono text-[11px] text-muted">
                  {new Date(project.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ContinueButton projectId={project.id} title={project.title} overview={project.overview} />
                <button
                  type="button"
                  onClick={() => deleteProject(project.id)}
                  className="rounded-input border border-pastel-red px-3 py-2 text-xs font-medium text-pastel-red-text transition hover:bg-pastel-red active:scale-[0.98]"
                >
                  Hapus
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => loadProjects(nextCursor).catch((err) => setError(err instanceof Error ? err.message : 'Load failed'))}
            className="rounded-input border border-border bg-surface/90 px-4 py-2 text-sm font-semibold text-primary shadow-card transition hover:border-accent/40 active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? 'Memuat...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
