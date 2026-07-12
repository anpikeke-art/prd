import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const port = Number(process.env.MCP_PORT ?? 3333);
const prisma = new PrismaClient();
const server = new McpServer({ name: 'prd-studio-mcp', version: '0.1.0' });

type TaskStatus = 'todo' | 'in_progress' | 'done';
type ActorType = 'human' | 'agent';


type ProjectGraph = Awaited<ReturnType<typeof getProject>>;

function jsonContent(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
}

function hashToken(token: string) {
  const secret = process.env.MCP_TOKEN_SECRET ?? 'dev-secret';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

async function getProject(projectId: string) {
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
                include: { events: { orderBy: { timestamp: 'desc' } } },
              },
            },
          },
        },
      },
      mcp_connections: { orderBy: { created_at: 'desc' }, take: 1 },
    },
  });
}


async function verifyProjectToken(projectId: string, authHeader?: string | null) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) return false;
  const hashed = hashToken(token);
  const conn = await prisma.mCPConnection.findFirst({ where: { project_id: projectId, token_hash: hashed } });
  return Boolean(conn);
}

server.registerTool(
  'get_prd',
  {
    title: 'Get PRD',
    description: 'Return full PRD tree for project',
    inputSchema: { project_id: z.string() },
  },
  async ({ project_id }) => {
    const project = await getProject(project_id);
    if (!project) return jsonContent({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return jsonContent({ success: true, data: { project } });
  },
);

server.registerTool(
  'list_tasks',
  {
    title: 'List Tasks',
    description: 'List tasks for project',
    inputSchema: {
      project_id: z.string(),
      filter: z.object({
        status: z.enum(['todo', 'in_progress', 'done']).optional(),
        assigned_to: z.enum(['human', 'agent']).optional(),
      }).optional(),
    },
  },
  async ({ project_id, filter }) => {
    const project = await getProject(project_id);
    if (!project) return jsonContent({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    const tasks = project.features.flatMap((feature: NonNullable<ProjectGraph>['features'][number]) =>
      feature.sub_features.flatMap((sub: NonNullable<ProjectGraph>['features'][number]['sub_features'][number]) =>
        sub.tasks.filter((task: NonNullable<ProjectGraph>['features'][number]['sub_features'][number]['tasks'][number]) => {
          if (filter?.status && task.status !== filter.status) return false;
          if (filter?.assigned_to && task.assigned_to !== filter.assigned_to) return false;
          return true;
        }).map((task: NonNullable<ProjectGraph>['features'][number]['sub_features'][number]['tasks'][number]) => ({
          id: task.id,
          sub_feature_id: sub.id,
          title: task.title,
          description: task.description ?? '',
          status: task.status as TaskStatus,
          assigned_to: (task.assigned_to ?? 'human') as ActorType,
          version: task.version,
        })),
      ),
    );
    return jsonContent({ success: true, data: { tasks } });
  },
);

server.registerTool(
  'get_next_task',
  {
    title: 'Get Next Task',
    description: 'Return next todo task',
    inputSchema: { project_id: z.string() },
  },
  async ({ project_id }) => {
    const project = await getProject(project_id);
    if (!project) return jsonContent({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    const task = project.features.flatMap((feature: NonNullable<ProjectGraph>['features'][number]) => feature.sub_features.flatMap((sub: NonNullable<ProjectGraph>['features'][number]['sub_features'][number]) => sub.tasks)).find((item: NonNullable<ProjectGraph>['features'][number]['sub_features'][number]['tasks'][number]) => item.status !== 'done') ?? null;
    return jsonContent({ success: true, data: { task: task ? { id: task.id, title: task.title, description: task.description ?? '', sub_feature_id: task.sub_feature_id, version: task.version } : null } });
  },
);

server.registerTool(
  'update_task_status',
  {
    title: 'Update Task Status',
    description: 'Update task status with optimistic locking',
    inputSchema: {
      task_id: z.string(),
      status: z.enum(['todo', 'in_progress', 'done']),
      note: z.string().optional(),
      expected_version: z.number(),
    },
  },
  async ({ task_id, status, note, expected_version }) => {
    const task = await prisma.task.findUnique({ where: { id: task_id } });
    if (!task) return jsonContent({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    if (task.version !== expected_version) return jsonContent({ success: false, error: { code: 'VERSION_CONFLICT', message: 'Task version conflict' } });
    const updated = await prisma.task.update({ where: { id: task_id }, data: { status: status as TaskStatus, version: { increment: 1 } } });
    await prisma.taskEventLog.create({ data: { task_id, event_type: 'status_changed', actor: 'agent' as ActorType, detail: { note, from: task.status, to: status } } });
    return jsonContent({ success: true, data: { task_id, new_status: updated.status, new_version: updated.version } });
  },
);

server.registerTool(
  'add_task',
  {
    title: 'Add Task',
    description: 'Add new task',
    inputSchema: {
      sub_feature_id: z.string(),
      title: z.string(),
      description: z.string().optional(),
    },
  },
  async ({ sub_feature_id, title, description }) => {
    const task = await prisma.task.create({ data: { sub_feature_id, title, description, status: 'todo' as TaskStatus, assigned_to: 'human' as ActorType } });
    return jsonContent({ success: true, data: { task_id: task.id, status: task.status } });
  },
);

server.registerTool(
  'propose_new_scope',
  {
    title: 'Propose New Scope',
    description: 'Propose new feature or subfeature',
    inputSchema: {
      project_id: z.string(),
      type: z.enum(['feature', 'sub_feature']),
      parent_id: z.string().optional(),
      title: z.string(),
      description: z.string(),
    },
  },
  async () => jsonContent({ success: true, data: { proposal_id: randomUUID(), status: 'proposed' } }),
);

const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
await server.connect(transport);

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const [, route, projectId] = url.pathname.split('/');
  if (route !== 'mcp' || !projectId) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const authorized = await verifyProjectToken(projectId, req.headers.authorization);
  if (!authorized) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid MCP token' }, id: null }));
    return;
  }

  const ua = (req.headers['user-agent'] ?? '').slice(0, 500);
  prisma.mCPConnection.updateMany({
    where: { project_id: projectId },
    data: { last_sync_at: new Date(), last_agent: ua || null },
  }).catch(() => {});

  await transport.handleRequest(req, res);
});

httpServer.listen(port, () => {
  console.log(`MCP server ready on port ${port}`);
});
