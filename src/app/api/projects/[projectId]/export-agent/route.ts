import { prisma } from '@/lib/prisma';
import { getProjectGraph } from '@/lib/project-service';

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectGraph(projectId);
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

  const features = project.features.map((f) => ({
    title: f.title,
    description: f.description,
    priority: f.priority,
    acceptance_criteria: f.acceptance_criteria,
    status: f.status,
    order: f.order,
    sub_features: f.sub_features.map((sf) => ({
      title: sf.title,
      description: sf.description,
      status: sf.status,
      tasks: sf.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        assigned_to: t.assigned_to,
        version: t.version,
        sub_feature_id: t.sub_feature_id,
      })),
    })),
  }));

  const mcpConn = project.mcp_connections?.[0] ?? null;

  return Response.json({
    success: true,
    data: {
      agent: {
        version: '1.0',
        generated_at: new Date().toISOString(),
      },
      project: {
        id: project.id,
        title: project.title,
        overview: project.overview,
        tech_stack: project.tech_stack,
        architecture_text: project.architecture_text,
        clarification_log: project.clarification_log,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      features,
      mcp: mcpConn
        ? {
            endpoint: `${process.env.MCP_BASE_URL ?? 'http://127.0.0.1:3333'}/mcp/${projectId}`,
            available: true,
          }
        : { available: false },
    },
  });
}
