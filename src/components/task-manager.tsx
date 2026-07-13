'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: 'human' | 'agent' | null;
  version: number;
  sub_feature_id: string;
};

type Props = {
  projectId: string;
  tasks: Task[];
  mcpConnected?: boolean;
  onChanged?: () => void;
};

const STATUS_LABEL: Record<string, string> = { todo: 'Todo', in_progress: 'In progress', done: 'Done' };

const STATUS_STYLES: Record<string, string> = {
  todo: 'border-pastel-blue-bg bg-pastel-blue-bg/70 text-pastel-blue-text',
  in_progress: 'border-pastel-yellow-bg bg-pastel-yellow-bg/70 text-pastel-yellow-text',
  done: 'border-pastel-green-bg bg-pastel-green-bg/70 text-pastel-green-text',
};

function StatusTag({ status }: { status: string }) {
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[status] || ''}`}>{STATUS_LABEL[status] || status}</span>;
}

export function TaskManager({ projectId, tasks, mcpConnected = false, onChanged }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousStatusRef = useRef<Record<string, Task['status']>>({});

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  const visibleTasks = tasks.slice(0, visibleCount);
  const hiddenCount = Math.max(tasks.length - visibleTasks.length, 0);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const newlyDoneTask = tasks.find((task) => task.status === 'done' && previousStatus[task.id] !== 'done');
    previousStatusRef.current = Object.fromEntries(tasks.map((task) => [task.id, task.status]));

    if (!newlyDoneTask) return;

    const taskIndex = tasks.findIndex((task) => task.id === newlyDoneTask.id);
    if (taskIndex >= 0) {
      setVisibleCount((count) => Math.max(count, taskIndex + 1, 12));
      requestAnimationFrame(() => {
        taskRefs.current[newlyDoneTask.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [tasks]);

  async function createTask() {
    if (!title.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title, description }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Create task failed');
      setTitle('');
      setDescription('');
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create task failed');
    } finally {
      setBusy(false);
    }
  }

  async function updateTask(task: Task, nextStatus: Task['status']) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, expected_version: task.version }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Update failed');
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask(taskId: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Delete failed');
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black tracking-tight text-primary">Task manager</h3>
          <p className="mt-0.5 font-mono text-xs text-secondary">{stats.done}/{stats.total} done</p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-accent transition-all" style={{ width: `${stats.percent}%` }} />
        </div>
      </div>

      {/* Create form */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="min-h-11 min-w-0 flex-1 rounded-input border border-border bg-surface-alt px-3 py-2 text-sm text-primary placeholder:text-muted transition focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createTask()}
          placeholder="Task title"
        />
        <input
          className="min-h-11 min-w-0 flex-[2] rounded-input border border-border bg-surface-alt px-3 py-2 text-sm text-primary placeholder:text-muted transition focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (opsional)"
        />
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={createTask}
          className="rounded-input bg-accent px-4 py-2 text-sm font-semibold text-accent-text shadow-card transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-pastel-red-text">{error}</p>}

      {/* Task list */}
      <div className="mt-4 space-y-2">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            ref={(node) => {
              taskRefs.current[task.id] = node;
            }}
            className={`rounded-input border p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${STATUS_STYLES[task.status] || 'border-border bg-surface-alt text-primary'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-primary">{task.title}</p>
                  <span className="font-mono text-[10px] text-muted">v{task.version}</span>
                </div>
                {task.description && <p className="mt-0.5 text-xs text-secondary">{task.description}</p>}
              </div>
              <StatusTag status={task.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['todo', 'in_progress', 'done'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy || mcpConnected || task.status === s}
                  onClick={() => updateTask(task, s)}
                  className={`rounded-input px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-30
                    ${task.status === s
                      ? 'bg-accent/10 text-accent'
                      : 'border border-border text-secondary hover:bg-surface hover:text-primary'}`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
              {mcpConnected && <span className="self-center rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-medium text-muted">Locked by MCP</span>}
              <button
                type="button"
                disabled={busy}
                onClick={() => deleteTask(task.id)}
                className="ml-auto rounded-input border border-pastel-red-bg px-2.5 py-1 text-[11px] text-pastel-red-text transition-colors hover:bg-pastel-red-bg disabled:opacity-30"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 12)}
            className="w-full rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent/35 hover:text-primary"
          >
            Tampilkan {Math.min(hiddenCount, 12)} task lagi
          </button>
        )}
        {tasks.length === 0 && <p className="py-4 text-center text-xs text-muted">No tasks yet.</p>}
      </div>
    </div>
  );
}
