import { prisma } from '@/lib/prisma';
import { getProjectGraph } from '@/lib/project-service';
import { requireOwnedProject } from '@/lib/route-guards';

function buildAgentMarkdown(input: {
  title: string;
  techStack: unknown;
  prdText: string | null;
  mcpEndpoint?: string | null;
  mcpToken?: string | null;
}) {
  const techStackText = (() => {
    try {
      return JSON.stringify(input.techStack ?? {}, null, 2);
    } catch {
      return 'Lihat PRD';
    }
  })();

  return `Kamu adalah AI engineer. Implementasikan aplikasi ini 100% sesuai PRD di bawah. Jangan menebak, jangan menyederhanakan scope secara sepihak, dan jangan menambahkan fitur di luar PRD.

PROJECT: ${input.title}
TECH STACK: ${techStackText}

SKILL WAJIB SAAT KERJA FRONTEND/UX:
1. Jika mengerjakan UI, layout, visual language, empty state, dashboard, atau halaman user-facing, wajib pakai prinsip dari skill \`taste-design\` dan \`frontend-design\`.
2. Jika sedang memodernisasi halaman yang sudah ada, perlakukan ini sebagai redesign yang harus lebih intentional, tidak generik, dan tidak pakai layout template standar.
3. Untuk pekerjaan existing app, gunakan pola dari \`redesign-existing-projects\` agar hasilnya tetap nyambung dengan sistem yang sudah ada.

ATURAN KERAS:
1. Ikuti PRD sebagai source of truth. Jika ada konflik antara narasi umum dan keputusan final, ikuti keputusan final di section 12, 14, dan 15.
2. Jangan meminta klarifikasi untuk hal yang sudah dikunci di PRD.
3. Jangan menambah, menghapus, atau mengubah scope di luar PRD.
4. Kalau ada detail teknis yang tidak disebut PRD, pilih solusi paling sederhana yang tetap konsisten dengan PRD.
5. Pertahankan fitur yang sudah ada kalau sesuai PRD. Kalau ada mismatch, ubah supaya match PRD.
6. Gunakan model data hybrid sesuai PRD: aset \`unik\` per unit dan aset \`stok\` dengan jumlah stok.
7. Satu transaksi peminjaman hanya untuk satu aset.
8. Notifikasi MVP hanya in-app. Jangan implement WhatsApp/Telegram, QR/barcode, mobile app native, atau ERP/accounting di MVP.

KEWAJIBAN UPDATE MCP:
1. Setiap kali mulai mengerjakan task, ubah status task ke \`in_progress\`.
2. Setiap kali selesai mengerjakan satu task atau subtask, ubah status task ke \`done\` dan sinkronkan lagi ke MCP sebelum lanjut ke task berikutnya.
3. Kalau ada perubahan penting pada task, ringkasan hasil kerja, atau catatan implementasi, tulis ke log/metadata MCP yang tersedia supaya state task manager dan state agent tetap sama.
4. Jangan menunggu semua pekerjaan selesai untuk sync. Sync dilakukan bertahap per task agar progress realtime terlihat.

URUTAN KERJA WAJIB:
1. Baca PRD dari atas ke bawah, lalu prioritaskan section 12, 14, dan 15.
2. Kerjakan scope P0 dulu.
3. Setelah P0 beres, baru kerjakan P1 yang memang ada di PRD.
4. Jangan mulai P2 sebelum P0 dan P1 yang relevan benar-benar selesai.

PRD MARKDOWN (source of truth):
${input.prdText ?? ''}

${input.mcpEndpoint ? `MCP ENDPOINT: ${input.mcpEndpoint}
MCP TOKEN: ${input.mcpToken ?? '(lihat di web)'}
Jika tersedia, gunakan MCP untuk membaca task terbaru dan update status kerja.` : ''}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
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
      agent_markdown: buildAgentMarkdown({
        title: project.title,
        techStack: project.tech_stack,
        prdText: project.architecture_text,
        mcpEndpoint: mcpConn ? `${process.env.MCP_BASE_URL ?? 'http://127.0.0.1:3333'}/mcp/${projectId}` : null,
        mcpToken: mcpConn?.token_hash ? '(hashed on server)' : null,
      }),
    },
  });
}
