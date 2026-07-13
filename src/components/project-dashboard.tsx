'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TaskManager } from '@/components/task-manager';
import { flattenTaskEvents } from '@/lib/project-service';

type ProjectData = NonNullable<Awaited<ReturnType<typeof import('@/lib/project-service').getProjectGraph>>> & {
  architecture_text: string | null;
};

type Props = {
  projectId: string;
};

type MonitorEvent = {
  id: string;
  task_title: string;
  event_type: string;
  actor: string;
  timestamp: string;
  detail?: unknown;
};

type TaskEventSource = {
  id: string;
  task_title: string;
  event_type: string;
  actor: string;
  timestamp: Date | string;
  detail?: unknown;
};

export function ProjectDashboard({ projectId }: Props) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorState, setMonitorState] = useState<'idle' | 'connecting' | 'waiting' | 'live' | 'error'>('idle');
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [mcp, setMcp] = useState<{ endpoint: string; token: string; last_agent?: string | null; last_sync_at?: string | null } | null>(null);
  const [mcpError, setMcpError] = useState('');
  const [monitorError, setMonitorError] = useState('');
  const [error, setError] = useState('');
  const [liveEvents, setLiveEvents] = useState<MonitorEvent[]>([]);

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

  const refreshMcp = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/mcp`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Refresh failed');
      if (json.data) {
        setMcp((prev) => prev ? { ...prev, ...json.data } : { endpoint: json.data.endpoint, token: '', last_agent: json.data.last_agent ?? null, last_sync_at: json.data.last_sync_at ?? null });
      }
    } catch (err) {
      setMonitorError(err instanceof Error ? err.message : 'Refresh failed');
    }
  }, [projectId]);

  async function connectMcp() {
    setMcpError('');
    setMonitorError('');
    setMonitorState('connecting');
    try {
      const res = await fetch(`/api/projects/${projectId}/connect`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Connect failed');
      setMcp({ endpoint: json.data.endpoint, token: json.data.token, last_agent: null, last_sync_at: null });
      setMonitoring(true);
      setMonitorState('waiting');
      setShowWaitingModal(true);
      await navigator.clipboard.writeText(JSON.stringify(json.data, null, 2)).catch(() => {});
      await refreshMcp();
    } catch (err) {
      setMonitorState('error');
      setMcpError(err instanceof Error ? err.message : 'Connect failed');
    }
  }

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!monitoring) return;

    const source = new EventSource(`/api/projects/${projectId}/events`);
    source.addEventListener('project_event', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as { latest?: MonitorEvent };
        if (data.latest) {
          setLiveEvents((prev) => {
            const next = [data.latest!, ...prev.filter((item) => item.id !== data.latest!.id)];
            return next.slice(0, 20);
          });
        }
      } catch {
        // Ignore malformed payloads and fall back to refetch.
      }
      void loadProject();
      void refreshMcp();
    });
    source.onerror = () => {
      setMonitorState('error');
      setMonitorError('Realtime connection dropped');
    };

    return () => source.close();
  }, [loadProject, monitoring, projectId, refreshMcp]);

  useEffect(() => {
    if (!monitoring) return;
    const interval = setInterval(() => {
      void refreshMcp();
    }, 5000);
    return () => clearInterval(interval);
  }, [monitoring, refreshMcp]);

  useEffect(() => {
    if (monitorState !== 'waiting') return;
    if (mcp?.last_sync_at) {
      setMonitorState('live');
      setShowWaitingModal(false);
    }
  }, [monitorState, mcp?.last_sync_at]);

  const tasks = useMemo(() => (project?.features ?? []).flatMap((feature) => feature.sub_features.flatMap((sub) => sub.tasks)), [project]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const agentAssigned = tasks.filter((task) => task.assigned_to === 'agent').length;
    return {
      total,
      inProgress,
      done,
      agentAssigned,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  const events = useMemo(() => {
    const source = flattenTaskEvents(project as any) as TaskEventSource[];
    const normalized: MonitorEvent[] = source
      .map((event) => ({
        ...event,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
      }))
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return liveEvents.length > 0
      ? [...liveEvents, ...normalized.filter((event) => !liveEvents.some((live) => live.id === event.id))].slice(0, 20)
      : normalized.slice(0, 20);
  }, [liveEvents, project]);

  if (loading) {
    return (
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
  }

  if (!project) {
    return <div className="rounded-card border border-pastel-red bg-pastel-red p-6 text-sm text-pastel-red-text">{error || 'No project yet'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl surface-glow">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Realtime MCP</p>
          <h2 className="truncate text-xl font-black tracking-tight text-primary">{project.title}</h2>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-accent transition-all" style={{ width: `${stats.percent}%` }} />
              </div>
              <span className="font-mono text-xs text-secondary">{stats.percent}%</span>
            </div>
            <span className="text-xs text-muted">
              {stats.total} task · {stats.inProgress} in progress · {stats.agentAssigned} assigned to agent
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={connectMcp}
            disabled={monitorState === 'connecting' || monitorState === 'waiting'}
            className="rounded-input bg-accent px-3 py-2 text-xs font-semibold text-accent-text shadow-card transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
          >
            {monitorState === 'connecting' ? 'Connecting…' : monitorState === 'waiting' ? 'Waiting…' : monitoring ? 'Reconnect MCP' : 'Connect MCP'}
          </button>
          <button type="button" onClick={loadProject} className="rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent/35 hover:bg-surface-alt">
            Refresh
          </button>
        </div>
      </div>

      {(mcpError || monitorError) && (
        <div className="rounded-card border border-pastel-red bg-pastel-red p-4 text-xs text-pastel-red-text">
          {mcpError || monitorError}
        </div>
      )}

      {showWaitingModal && monitorState === 'waiting' && mcp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-primary">MCP Belum Terkoneksi</h3>
              <button type="button" onClick={() => setShowWaitingModal(false)} className="rounded-full p-1 text-muted transition hover:bg-surface-alt hover:text-primary">&times;</button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-secondary">
              Session MCP sudah dibuat, tapi belum ada AI agent yang terhubung. Salin
              endpoint dan token di bawah, lalu atur AI coding agent-mu (Claude Code, Cursor, dll)
              untuk menggunakan MCP ini.
            </p>
            <div className="mb-3 space-y-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Endpoint</p>
                <div className="flex items-center gap-2 rounded-input border border-border bg-surface-alt p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-secondary">{mcp.endpoint}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(mcp.endpoint)} className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-medium text-muted transition hover:bg-surface-alt hover:text-primary">Copy</button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Token</p>
                <div className="flex items-center gap-2 rounded-input border border-border bg-surface-alt p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-secondary">{mcp.token}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(mcp.token)} className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-medium text-muted transition hover:bg-surface-alt hover:text-primary">Copy</button>
                </div>
              </div>
            </div>
            <div className="mb-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Config — pilih platform:</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => {
                  const json = JSON.stringify({ mcpServers: { 'prd-studio': { transport: 'streamable-http', url: mcp.endpoint, headers: { Authorization: `Bearer ${mcp.token}` } } } }, null, 2);
                  navigator.clipboard.writeText(json);
                }} className="rounded-input border border-border bg-surface-alt px-3 py-2 text-[11px] font-medium text-secondary transition hover:border-accent/35 hover:bg-surface">
                  Claude Code
                </button>
                <button type="button" onClick={() => {
                  const json = JSON.stringify({ mcpServers: { 'prd-studio': { type: 'url', url: mcp.endpoint, headers: { Authorization: `Bearer ${mcp.token}` } } } }, null, 2);
                  navigator.clipboard.writeText(json);
                }} className="rounded-input border border-border bg-surface-alt px-3 py-2 text-[11px] font-medium text-secondary transition hover:border-accent/35 hover:bg-surface">
                  Cursor
                </button>
                <button type="button" onClick={() => {
                  const json = JSON.stringify({ mcp: { 'prd-studio': { type: 'remote', url: mcp.endpoint, headers: { Authorization: `Bearer ${mcp.token}` } } } }, null, 2);
                  navigator.clipboard.writeText(json);
                }} className="rounded-input border border-border bg-surface-alt px-3 py-2 text-[11px] font-medium text-secondary transition hover:border-accent/35 hover:bg-surface">
                  OpenCode
                </button>
                <button type="button" onClick={() => {
                  const json = JSON.stringify({ mcpServers: { 'prd-studio': { url: mcp.endpoint, auth: 'bearer', bearerToken: mcp.token } } }, null, 2);
                  navigator.clipboard.writeText(json);
                }} className="rounded-input border border-border bg-surface-alt px-3 py-2 text-[11px] font-medium text-secondary transition hover:border-accent/35 hover:bg-surface">
                  Pi (pi9)
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { void refreshMcp(); }} className="flex-1 rounded-input bg-accent px-3 py-2 text-xs font-semibold text-accent-text shadow-card transition hover:bg-accent-hover active:scale-[0.98]">
                Cek Koneksi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface/88 p-4 shadow-card backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                monitorState === 'live'
                  ? 'border border-pastel-green bg-pastel-green/60 text-pastel-green-text'
                  : monitorState === 'waiting' || monitorState === 'connecting'
                    ? 'border border-pastel-yellow bg-pastel-yellow/60 text-pastel-yellow-text'
                    : 'border border-border bg-surface-alt text-muted'
              }`}
            >
              {monitorState === 'live' ? 'Live' : monitorState === 'waiting' ? 'Waiting' : monitorState === 'connecting' ? 'Connecting' : 'Idle'}
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <span>{stats.total} task</span>
              <span>{stats.inProgress} in progress</span>
            </div>
          </div>

          {monitorState === 'live' && mcp && (
            <div className="flex items-center gap-3 text-[11px] text-pastel-green-text">
              {mcp.last_agent && <span>Agent: {mcp.last_agent}</span>}
              {mcp.last_sync_at && <span>Sync: {new Date(mcp.last_sync_at).toLocaleString('id-ID')}</span>}
            </div>
          )}
        </div>

        <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-primary">Task queue</h3>
            <span className="rounded-full border border-border bg-surface-alt px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              MCP focus
            </span>
          </div>
          <TaskManager projectId={projectId} tasks={tasks as any} mcpConnected={Boolean(mcp)} onChanged={loadProject} />
        </div>
      </div>
    </div>
  );
}
