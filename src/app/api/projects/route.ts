import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthSession } from '@/auth';
import { inferProjectTitle } from '@/lib/prd-title';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(12).default(6),
});

const bodySchema = z.object({
  title: z.string().min(1),
  idea: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }, { status: 401 });

  const url = new URL(request.url);
  const query = listQuerySchema.parse({
    cursor: url.searchParams.get('cursor') ?? undefined,
    take: url.searchParams.get('take') ?? undefined,
  });

  const projects = await prisma.project.findMany({
    where: { owner_id: session.user.id },
    orderBy: { updated_at: 'desc' },
    take: query.take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: { id: true, title: true, overview: true, architecture_text: true, created_at: true, updated_at: true },
  });

  const hasMore = projects.length > query.take;
  const items = hasMore ? projects.slice(0, query.take) : projects;

  return Response.json({
    success: true,
    data: {
      projects: items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    },
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }, { status: 401 });

  const body = bodySchema.parse(await request.json());
  const normalizedTitle = body.title.length > 40 || /\b(?:merupakan|adalah|ialah|yakni)\b/i.test(body.title)
    ? inferProjectTitle(body.title, body.title)
    : body.title;

  const project = await prisma.project.create({
    data: {
      title: normalizedTitle,
      overview: body.idea,
      owner_id: session.user.id,
      clarification_log: {
        idea: body.idea,
        questions: [],
        answers: [],
      },
    },
  });

  return Response.json({ success: true, data: { project } });
}
