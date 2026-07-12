'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ProjectDiagram } from '@/components/project-diagram';
import { TaskManager } from '@/components/task-manager';
import { buildProjectGraph, calcProjectProgress, flattenTaskEvents } from '@/lib/project-service';
import type { Edge, Node } from 'reactflow';

type ProjectData = NonNullable<Awaited<ReturnType<typeof import('@/lib/project-service').getProjectGraph>>> & {
  architecture_text: string | null;
};

type Props = {
  projectId: string;
};

export function ProjectDashboard({ projectId }: Props) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'diagram' | 'details'>('diagram');
  const [mcp, setMcp] = useState<{ endpoint: string; token: string } | null>(null);
  const [showArch, setShowArch] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [showClarify, setShowClarify] = useState(false);
  const [mcpError, setMcpError] = useState('');
  const [error, setError] = useState('');

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Load failed');
      setProject(json.data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  async function connectMcp() {
    setMcpError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/connect`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Connect failed');
      setMcp({ endpoint: json.data.endpoint, token: json.data.token });
      await navigator.clipboard.writeText(JSON.stringify(json.data, null, 2)).catch(() => {});
    } catch (err) {
      setMcpError(err instanceof Error ? err.message : 'Connect failed');
    }
  }

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const graph = useMemo(() => buildProjectGraph(project as any), [project]);
  const events = useMemo(() => flattenTaskEvents(project as any), [project]);
  const progress = useMemo(() => (project ? calcProjectProgress(project as any) : 0), [project]);
  const tasks = useMemo(() => (project?.features ?? []).flatMap((feature) => feature.sub_features.flatMap((sub) => sub.tasks)), [project]);

  if (loading) return (
    <div className="rounded-card border border-border bg-surface/86 p-5 shadow-card backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-5 w-48 rounded-full" />
          <div className="skeleton h-3 w-64 rounded-full" />
        </div>
        <div className="skeleton h-10 w-32 rounded-input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="skeleton h-24 rounded-card" />
        <div className="skeleton h-24 rounded-card" />
        <div className="skeleton h-24 rounded-card" />
      </div>
      <div className="skeleton mt-4 h-[420px] rounded-card" />
    </div>
  );
  if (!project) return <div className="rounded-card border border-pastel-red bg-pastel-red p-6 text-sm text-pastel-red-text">{error || 'No project yet'}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl surface-glow">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black tracking-tight text-primary">{project.title}</h2>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-mono text-xs text-secondary">{progress}%</span>
            </div>
            <span className="text-xs text-muted">
              {(project.features ?? []).length} fitur · {tasks.length} task
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={connectMcp} className="rounded-input bg-accent px-3 py-2 text-xs font-semibold text-accent-text shadow-card transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-[0.98]">
            Connect MCP
          </button>
          <button type="button" onClick={loadProject} className="rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent/35 hover:bg-surface-alt">
            Refresh
          </button>
        </div>
      </div>

      {/* MCP info */}
      {mcp && (
        <div className="rounded-card border border-pastel-green bg-pastel-green p-4">
          <p className="mb-1 text-xs font-semibold text-pastel-green-text">MCP endpoint ready</p>
          <p className="break-all font-mono text-[11px] text-pastel-green-text/80">Endpoint: {mcp.endpoint}</p>
          <p className="break-all font-mono text-[11px] text-pastel-green-text/80">Token: {mcp.token}</p>
        </div>
      )}
      {mcpError && <p className="text-xs text-pastel-red-text">{mcpError}</p>}

      {/* Task manager — main content */}
      <TaskManager projectId={projectId} tasks={tasks as any} onChanged={loadProject} />

      {/* Split view */}
      <div className="grid min-h-0 gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Diagram panel */}
        <section className={`${tab === 'details' ? 'hidden md:block' : 'block'}`}>
          <ProjectDiagram nodes={graph.nodes as Node[]} edges={graph.edges as Edge[]} />
        </section>

        {/* Details panel */}
        <section className={`${tab === 'diagram' ? 'hidden md:block' : 'block'} space-y-4`}>
          {/* Mobile tab toggle */}
          <div className="flex gap-2 md:hidden">
            <button type="button" className={`rounded-input px-3 py-1.5 text-xs font-semibold ${tab === 'diagram' ? 'bg-accent text-accent-text' : 'border border-border bg-surface text-secondary'}`} onClick={() => setTab('diagram')}>Diagram</button>
            <button type="button" className={`rounded-input px-3 py-1.5 text-xs font-semibold ${tab === 'details' ? 'bg-accent text-accent-text' : 'border border-border bg-surface text-secondary'}`} onClick={() => setTab('details')}>Details</button>
          </div>

          <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
            <h3 className="mb-2 text-sm font-black text-primary">Overview</h3>
            <p className="text-sm leading-relaxed text-secondary">{project.overview ?? '-'}</p>
          </div>

          <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
            <button onClick={() => setShowArch(!showArch)} className="flex w-full items-center justify-between gap-2 text-left">
              <h3 className="text-sm font-black text-primary">Architecture</h3>
              <svg className={`size-4 shrink-0 text-muted transition-transform ${showArch ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showArch && project.architecture_text && (
              <div className="prose prose-sm prose-headings:font-sans prose-headings:font-black prose-a:text-accent mt-3 max-h-[60vh] max-w-none overflow-auto rounded-input bg-surface-alt p-4 leading-relaxed text-primary">
                <ReactMarkdown>{project.architecture_text}</ReactMarkdown>
              </div>
            )}
            {showArch && !project.architecture_text && <p className="mt-3 text-xs text-muted">-</p>}
          </div>

          <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
            <button onClick={() => setShowTech(!showTech)} className="flex w-full items-center justify-between gap-2 text-left">
              <h3 className="text-sm font-black text-primary">Tech stack</h3>
              <svg className={`size-4 shrink-0 text-muted transition-transform ${showTech ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showTech && (
              <pre className="mt-3 overflow-auto rounded-input bg-surface-alt p-4 font-mono text-xs leading-relaxed text-secondary">{JSON.stringify(project.tech_stack ?? {}, null, 2)}</pre>
            )}
          </div>

          <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
            <button onClick={() => setShowClarify(!showClarify)} className="flex w-full items-center justify-between gap-2 text-left">
              <h3 className="text-sm font-black text-primary">Clarification log</h3>
              <svg className={`size-4 shrink-0 text-muted transition-transform ${showClarify ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showClarify && (
              <pre className="mt-3 overflow-auto rounded-input bg-surface-alt p-4 font-mono text-xs leading-relaxed text-secondary">{JSON.stringify(project.clarification_log ?? {}, null, 2)}</pre>
            )}
          </div>

          <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
            <h3 className="mb-3 text-sm font-black text-primary">Task events</h3>
            <div className="space-y-2">
              {events.slice(0, 20).map((event) => (
                <div key={event.id} className="rounded-input border border-border bg-surface-alt p-3 transition hover:border-accent/35">
                  <div className="text-xs font-medium text-primary">{event.task_title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">{event.event_type} · {event.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
