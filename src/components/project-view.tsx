"use client";

import { useMemo, useState } from 'react';
import { ProjectDiagram } from '@/components/project-diagram';
import type { Node, Edge } from 'reactflow';
import type { calcFeatureProgress, flattenTaskEvents } from '@/lib/project-service';

type Project = Awaited<ReturnType<typeof import('@/lib/project-service').getProjectGraph>>;

type Props = {
  project: NonNullable<Project>;
  nodes: Node[];
  edges: Edge[];
  events: ReturnType<typeof flattenTaskEvents>;
};

export function ProjectView({ project, nodes, edges, events }: Props) {
  const [tab, setTab] = useState<'diagram' | 'document'>('diagram');
  const projectProgress = useMemo(() => {
    const tasks = project.features.flatMap((feature) => feature.sub_features.flatMap((sub) => sub.tasks));
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100);
  }, [project]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div>
          <h2 className="text-xl font-semibold">{project.title}</h2>
          <p className="text-sm text-slate-400">Progress {projectProgress}%</p>
        </div>
        <div className="flex gap-2 md:hidden">
          <button type="button" className={`rounded-lg px-3 py-2 text-sm ${tab === 'diagram' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={() => setTab('diagram')}>Diagram</button>
          <button type="button" className={`rounded-lg px-3 py-2 text-sm ${tab === 'document' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={() => setTab('document')}>Dokumen</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className={`${tab === 'document' ? 'hidden md:block' : 'block'}`}>
          <ProjectDiagram nodes={nodes} edges={edges} />
        </section>
        <section className={`${tab === 'diagram' ? 'hidden md:block' : 'block'} space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4`}>
          <div>
            <h3 className="font-semibold">Overview</h3>
            <p className="text-sm text-slate-300">{project.overview ?? '-'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Tech stack</h3>
            <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-300">{JSON.stringify(project.tech_stack ?? {}, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Clarification log</h3>
            <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-300">{JSON.stringify(project.clarification_log ?? {}, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Task events</h3>
            <div className="space-y-2 text-xs text-slate-300">
              {events.slice(0, 20).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-800 p-2">
                  <div className="font-medium text-slate-100">{event.task_title}</div>
                  <div>{event.event_type} · {event.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
