import { prisma } from '@/lib/prisma';
import { ActorType, TaskStatus } from '@prisma/client';

export async function getProjectGraph(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      features: {
        orderBy: { order: 'asc' },
        include: {
          sub_features: {
            orderBy: { order: 'asc' },
            include: {
              tasks: {
                orderBy: { created_at: 'asc' },
                include: { events: { orderBy: { timestamp: 'desc' }, take: 20 } },
              },
            },
          },
        },
      },
      mcp_connections: { orderBy: { created_at: 'desc' }, take: 1 },
    },
  });
}

export function calcFeatureProgress(feature: { sub_features: Array<{ tasks: Array<{ status: TaskStatus }> }> }) {
  const tasks = feature.sub_features.flatMap((sub) => sub.tasks);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((task) => task.status === TaskStatus.done).length / tasks.length) * 100);
}

export function calcProjectProgress(project: { features: Array<{ sub_features: Array<{ tasks: Array<{ status: TaskStatus }> }> }> }) {
  const tasks = (project.features ?? []).flatMap((feature) => feature.sub_features.flatMap((sub) => sub.tasks));
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((task) => task.status === TaskStatus.done).length / tasks.length) * 100);
}

export function flattenTaskEvents(project: Awaited<ReturnType<typeof getProjectGraph>>) {
  if (!project) return [];
  return (project.features ?? []).flatMap((feature) =>
    feature.sub_features.flatMap((sub) =>
      sub.tasks.flatMap((task) =>
        task.events.map((event) => ({
          id: event.id,
          task_id: task.id,
          task_title: task.title,
          event_type: event.event_type,
          actor: event.actor,
          timestamp: event.timestamp,
          detail: event.detail,
        })),
      ),
    ),
  );
}

export function buildProjectGraph(project: Awaited<ReturnType<typeof getProjectGraph>>) {
  if (!project) return { nodes: [], edges: [] };

  const nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }> = [];
  const edges: Array<{ id: string; source: string; target: string; animated?: boolean }> = [];

  nodes.push({
    id: `project-${project.id}`,
    type: 'input',
    position: { x: 0, y: 0 },
    data: { label: project.title, kind: 'project' },
  });

  (project.features ?? []).forEach((feature, featureIndex) => {
    const featureId = `feature-${feature.id}`;
    nodes.push({
      id: featureId,
      position: { x: featureIndex * 300, y: 140 },
      data: { label: feature.title, kind: 'feature', progress: calcFeatureProgress(feature) },
    });
    edges.push({ id: `${project.id}-${feature.id}`, source: `project-${project.id}`, target: featureId });

    feature.sub_features.forEach((sub, subIndex) => {
      const subId = `sub-${sub.id}`;
      nodes.push({
        id: subId,
        position: { x: featureIndex * 300, y: 280 + subIndex * 110 },
        data: { label: sub.title, kind: 'sub_feature' },
      });
      edges.push({ id: `${feature.id}-${sub.id}`, source: featureId, target: subId });

      sub.tasks.forEach((task, taskIndex) => {
        const taskId = `task-${task.id}`;
        nodes.push({
          id: taskId,
          position: { x: featureIndex * 300 + taskIndex * 220, y: 420 + subIndex * 110 },
          data: { label: task.title, kind: 'task', status: task.status, assigned_to: task.assigned_to ?? ActorType.human },
        });
        edges.push({ id: `${sub.id}-${task.id}`, source: subId, target: taskId });
      });
    });
  });

  return { nodes, edges };
}
