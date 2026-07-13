'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';

import ReactMarkdown from 'react-markdown';
import { ThemeToggle } from '@/components/theme-toggle';
import { LlmSettings } from '@/components/llm-settings';
import { SignOutButton } from '@/components/sign-out-button';
import { getLlmSettings } from '@/lib/llm-settings';
import { inferProjectTitle } from '@/lib/prd-title';

const STEPS = [
  { id: 'ide', label: 'Idea' },
  { id: 'clarify', label: 'Clarify' },
  { id: 'generate', label: 'Generate' },
] as const;

type StepId = (typeof STEPS)[number]['id'];
type GenerateLogEntry = { message: string; detail?: string; time: string };
type ClarifyAnswerValue = { text: string; selected: string[] };
type GeneratePrdData = {
  prd_text?: string;
  llm_error?: string;
  mcp?: { endpoint: string; token?: string; project_id: string; last_agent?: string; last_sync_at?: string };
};

const MIN_CHARS = 20;
const MAX_CHARS = 2000;
const GENERATE_TIMEOUT_MS = 900_000;

function toSafeFilename(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase() || 'prd_document';
}

function fallbackReasonLabel(error: string) {
  return /timeout|aborted/i.test(error) ? 'LLM proxy terlalu lama merespons' : 'koneksi ke LLM proxy gagal';
}

function buildAgentInstruction(title: string, stack: unknown, prdText: string, mcpEndpoint?: string | null, mcpToken?: string | null) {
  const techStackText = (() => {
    try {
      return JSON.stringify(stack ?? {}, null, 2);
    } catch {
      return 'Lihat PRD';
    }
  })();

  return `Kamu adalah AI engineer. Implementasikan aplikasi ini 100% sesuai PRD di bawah. Jangan menebak, jangan menyederhanakan scope secara sepihak, dan jangan menambahkan fitur di luar PRD.

PROJECT: ${title}
TECH STACK: ${techStackText}

SKILL WAJIB SAAT KERJA FRONTEND/UX:
1. Jika mengerjakan UI, layout, visual language, empty state, dashboard, atau halaman user-facing, wajib pakai prinsip dari skill \`taste-design\` dan \`frontend-design\`.
2. Jika sedang memodernisasi halaman yang sudah ada, perlakukan ini sebagai redesign yang harus lebih intentional, tidak generik, dan tidak pakai layout template standar.
3. Jangan membuat UI yang aman tapi generik. Pilih tipografi, spacing, hierarchy, dan CTA yang jelas dan konsisten dengan PRD.
4. Untuk pekerjaan existing app, gunakan pola dari \`redesign-existing-projects\` agar hasilnya tetap nyambung dengan sistem yang sudah ada.

ATURAN KERAS:
1. Ikuti PRD sebagai source of truth. Jika ada konflik antara narasi umum dan keputusan final, ikuti keputusan final di section 12, 14, dan 15.
2. Jangan meminta klarifikasi untuk hal yang sudah dikunci di PRD.
3. Jangan menambah, menghapus, atau mengubah scope di luar PRD.
4. Kalau ada detail teknis yang tidak disebut PRD, pilih solusi paling sederhana yang tetap konsisten dengan PRD.
5. Pertahankan fitur yang sudah ada kalau sesuai PRD. Kalau ada mismatch, ubah supaya match PRD.
6. Semua perubahan penting harus punya audit trail, validasi, dan permission check sesuai PRD.
7. Gunakan model data hybrid sesuai PRD: aset \`unik\` per unit dan aset \`stok\` dengan jumlah stok.
8. Satu transaksi peminjaman hanya untuk satu aset.
9. Notifikasi MVP hanya in-app. Jangan implement WhatsApp/Telegram, QR/barcode, mobile app native, atau ERP/accounting di MVP.

KEWAJIBAN UPDATE MCP:
1. Setiap kali mulai mengerjakan task, ubah status task ke \`in_progress\`.
2. Setiap kali selesai mengerjakan satu task atau subtask, ubah status task ke \`done\` dan sinkronkan lagi ke MCP sebelum lanjut ke task berikutnya.
3. Kalau ada perubahan penting pada task, ringkasan hasil kerja, atau catatan implementasi, tulis ke log/metadata MCP yang tersedia supaya state task manager dan state agent tetap sama.
4. Jangan menunggu semua pekerjaan selesai untuk sync. Sync dilakukan bertahap per task agar progress realtime terlihat.

URUTAN KERJA WAJIB:
1. Baca PRD dari atas ke bawah, lalu prioritaskan section 12, 14, dan 15.
2. Kerjakan scope P0 dulu: auth/role access, aset, lokasi, pinjam, approval, pengambilan, pengembalian, stok, notifikasi in-app, audit log, dashboard dasar.
3. Setelah P0 beres, baru kerjakan P1 yang memang ada di PRD.
4. Jangan mulai P2 sebelum P0 dan P1 yang relevan benar-benar selesai.
5. Kalau ada task yang sudah ada di codebase, adaptasi supaya sesuai PRD, bukan dibuang sembarang.

CEK KELUARAN:
- Admin bisa mengelola aset dan lokasi.
- Staff bisa ajukan pinjam dan pengembalian.
- Approval, pengambilan, dan pengembalian sesuai status transaksi di PRD.
- Status aset berubah otomatis sesuai transaksi.
- Audit log tercatat untuk perubahan penting.
- Notifikasi stok menipis muncul in-app.
- Laporan dan export sesuai format PRD.

PRD MARKDOWN (source of truth):
${prdText.slice(0, 8000)}${prdText.length > 8000 ? '\n... (truncated, lihat file untuk lengkap)' : ''}

${mcpEndpoint ? `MCP ENDPOINT: ${mcpEndpoint}
MCP TOKEN: ${mcpToken ?? '(lihat di web)'}
Jika tersedia, gunakan MCP untuk membaca task terbaru dan update status kerja.` : ''}`;
}

const ProjectDashboard = dynamic(
  () => import('@/components/project-dashboard').then((mod) => mod.ProjectDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-card border border-border bg-surface/86 p-5 shadow-card backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton h-3 w-64 rounded-full" />
          </div>
          <div className="skeleton h-9 w-28 rounded-input" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="skeleton h-28 rounded-card" />
          <div className="skeleton h-28 rounded-card" />
          <div className="skeleton h-28 rounded-card" />
        </div>
        <div className="skeleton mt-4 h-[360px] rounded-card" />
      </div>
    ),
  },
);

function JourneySteps({ stepIndex }: { active: StepId; stepIndex: number }) {
  return (
    <ol className="flex items-center rounded-full border border-border bg-surface/80 p-1 shadow-card backdrop-blur-xl">
      {STEPS.map((s, i) => {
        const status = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'upcoming';
        return (
          <li key={s.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${status === 'active' ? 'bg-accent text-accent-text' : 'text-secondary'}`}>
              {status === 'done' ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <span className={`size-1.5 shrink-0 rounded-full transition-colors ${status === 'active' ? 'bg-accent-text' : 'bg-muted/40'}`} />
              )}
              <span className={`text-sm transition-colors ${status === 'active' ? 'font-semibold' : status === 'done' ? 'font-medium text-primary' : 'text-muted/80'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`mx-1 h-0.5 w-7 shrink-0 rounded-full transition-colors sm:w-12 ${i < stepIndex ? 'bg-accent' : 'bg-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function LoadingSkeleton({ text }: { text: string }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-card border border-accent/20 bg-surface/88 px-5 py-3 text-sm font-semibold text-accent shadow-card backdrop-blur-xl">
        <span className="size-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        <span>{text}{dots}</span>
      </div>
      <div className="w-full max-w-md space-y-4">
        <div className="skeleton h-3 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 rounded-card border border-border bg-surface/78 p-4 shadow-card">
              <div className="skeleton h-3 w-full rounded-full" style={{ animationDelay: `${i * 150}ms` }} />
              <div className="skeleton h-3 w-2/3 rounded-full" style={{ animationDelay: `${i * 150}ms` }} />
              <div className="skeleton h-8 w-full rounded-input" style={{ animationDelay: `${i * 150}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PrdWizard({ session }: { session: import('next-auth').Session }) {
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [projectId, setProjectId] = useState('');
  const [step, setStep] = useState<StepId>('ide');
  const [questions, setQuestions] = useState<Array<{ id: string; question: string; category: string; quick_replies: string[] }>>([]);
  const [clarifyMode, setClarifyMode] = useState<'ai' | 'fallback' | ''>('');
  const [clarifyReasoning, setClarifyReasoning] = useState('');
  const [answers, setAnswers] = useState<Record<string, ClarifyAnswerValue>>({});
  const [manualStack] = useState({ frontend: 'Next.js', backend: 'Next.js Route Handlers', database: 'PostgreSQL', realtime: 'SSE', auth_ready: 'yes' });
  const [stack, setStack] = useState<unknown>(null);
  const [prdDone, setPrdDone] = useState(false);
  const [prdText, setPrdText] = useState('');
  const [progress, setProgress] = useState(0);
  const [viewTab, setViewTab] = useState<'prd' | 'diagram'>('prd');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [mcpInfo, setMcpInfo] = useState<{ endpoint: string; token?: string; project_id: string; last_agent?: string; last_sync_at?: string } | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [status, setStatus] = useState('');
  const [llmError, setLlmError] = useState('');
  const [generateLogs, setGenerateLogs] = useState<GenerateLogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const workspaceActionClass = 'inline-flex items-center justify-center rounded-input border border-border bg-surface/80 px-3 py-2 text-xs font-semibold text-secondary shadow-card transition hover:-translate-y-0.5 hover:border-accent/35 hover:text-primary active:scale-[0.98]';
  const workspaceActions = (
    <>
      {projectId && (
        <button type="button" onClick={resetProject} className={workspaceActionClass}>
          New
        </button>
      )}
      <a href="/sessions" className={workspaceActionClass}>
        History
      </a>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className={workspaceActionClass}
        aria-label="LLM settings"
      >
        Setting
      </button>
      <div className="flex items-center justify-between gap-3 rounded-input border border-border bg-surface/80 px-3 py-2 shadow-card">
        <span className="text-xs font-semibold text-secondary">Darkmode</span>
        <ThemeToggle />
      </div>
    </>
  );

  useEffect(() => {
    const pathStep = window.location.pathname.replace(/^\//, '') as StepId;
    if (!STEPS.some(s => s.id === pathStep)) return;
    setStep(pathStep);
    const urlProjectId = new URLSearchParams(window.location.search).get('projectId');
    if (pathStep === 'ide') {
      localStorage.removeItem('prd_project_id');
      localStorage.removeItem('prd_title');
      localStorage.removeItem('prd_idea');
    } else {
      const pid = urlProjectId || localStorage.getItem('prd_project_id');
      if (pid) {
        setProjectId(pid);
        setTitle(localStorage.getItem('prd_title') ?? '');
        setIdea(localStorage.getItem('prd_idea') ?? '');
      }
    }
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname.replace(/^\//, '');
    if (step !== currentPath && STEPS.some(s => s.id === step)) {
      const search = window.location.search;
      window.history.replaceState(null, '', `/${step}${search}`);
    }
  }, [step]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem('prd_project_id', projectId);
      localStorage.setItem('prd_title', title);
      localStorage.setItem('prd_idea', idea);
    }
  }, [projectId, title, idea]);

  useEffect(() => {
    if (!projectId || prdDone || prdText) return;
    fetch(`/api/projects/${projectId}`).then(r => r.json()).then(j => {
      if (j.success && j.data?.project?.architecture_text) {
        setPrdText(j.data.project.architecture_text);
        setPrdDone(true);
        setStep('generate');
      }
    }).catch(() => {});
  }, [projectId]);

  function resetProject() {
    localStorage.removeItem('prd_project_id');
    localStorage.removeItem('prd_title');
    localStorage.removeItem('prd_idea');
    setProjectId('');
    setTitle('');
    setIdea('');
    setPrdDone(false);
    setPrdText('');
    setMcpInfo(null);
    setQuestions([]);
    setClarifyMode('');
    setClarifyReasoning('');
    setAnswers({});
    setStack(null);
    setStep('ide');
    setError('');
    setLlmError('');
    window.history.replaceState(null, '', '/ide');
  }

  const clarifiedContext = useMemo(
    () =>
      questions
        .map((q) => {
          const answer = answers[q.id];
          const selected = answer?.selected?.length ? `Pilihan: ${answer.selected.join(', ')}` : '';
          const text = answer?.text.trim() ? `Jawaban: ${answer.text.trim()}` : '';
          const combined = [selected, text].filter(Boolean).join(' | ');
          return `${q.question}: ${combined || '(belum dijawab)'}`;
        })
        .join('\n'),
    [answers, questions],
  );
  const ideaLen = idea.length;
  const canSubmit = ideaLen >= MIN_CHARS && !busy;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function submitIdea() {
    if (!canSubmit) return;
    const ideaBody = idea.trim();
    if (!ideaBody) return;
    const finalTitle = title.trim() || inferProjectTitle(ideaBody);
    setBusy(true);
    setStatus('Creating project…');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalTitle, idea: ideaBody }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Create failed');
      setProjectId(json.data.project.id);
      setTitle(finalTitle);
      setIdea(ideaBody);
      setStatus('Menyiapkan pertanyaan…');
      setStep('clarify');
      autoLoadQuestions(json.data.project.id, ideaBody);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Create failed');
      setBusy(false);
    }
  }

  async function autoLoadQuestions(pid: string, ideaText: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${pid}/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaText, existingContext: '' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setQuestions(json.data.questions);
        setClarifyMode(json.data.mode ?? '');
        setClarifyReasoning(json.data.reasoning ?? '');
      }
    } catch { /* silent */ }
    setBusy(false);
  }

  function handleIdeaChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value.slice(0, MAX_CHARS);
    setIdea(v);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  }

  function handleIdeaKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitIdea();
    }
  }

  async function proceedToGenerate() {
    if (!projectId) return;
    setBusy(true);
    setStatus('Menyimpan jawaban…');
    try {
      await fetch(`/api/projects/${projectId}/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, existingContext: clarifiedContext }),
      });
      setStatus('Mengatur tech stack…');
      await fetch(`/api/projects/${projectId}/tech-stack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'manual',
          idea,
          manual_stack: { ...manualStack, auth_ready: manualStack.auth_ready === 'yes' },
        }),
      });
    } catch {}
    setBusy(false);
    setStep('generate');
  }

  async function stepFetch(mode: string, extraBody: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const settings = getLlmSettings();
    const res = await fetch(`/api/projects/${projectId}/generate-prd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
      body: JSON.stringify({
        mode,
        stream: false,
        clarification_log: { questions, answers },
        tech_stack: stack,
        model: settings.model,
        api_key: settings.apiKey,
        base_url: settings.baseUrl,
        ...extraBody,
      }),
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json?.error?.message ?? 'Generate failed');
    return json.data;
  }

  async function generatePrd(options: { forceFresh?: boolean } = {}) {
    if (!projectId) return;
    setBusy(true);
    setError('');
    setLlmError('');
    setGenerateLogs([]);
    setProgress(options.forceFresh ? 2 : 5);
    setStatus(options.forceFresh ? 'Fresh regenerate dimulai…' : 'Menghubungi LLM proxy…');
    if (options.forceFresh) {
      setPrdDone(false);
      setPrdText('');
      setViewTab('prd');
    }

    try {
      const settings = getLlmSettings();
      const res = await fetch(`/api/projects/${projectId}/generate-prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
        body: JSON.stringify({
          mode: 'full',
          stream: true,
          force_fresh: options.forceFresh ?? false,
          clarification_log: { questions, answers },
          tech_stack: stack,
          model: settings.model,
          api_key: settings.apiKey,
          base_url: settings.baseUrl,
        }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream empty body');
      const decoder = new TextDecoder();

      let data: GeneratePrdData | null = null;
      let buffer = '';
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          if (finished) continue;

          let event: { type?: string; progress?: number; message?: string; detail?: string; data?: GeneratePrdData };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (typeof event.progress === 'number') {
            setProgress(Math.min(event.progress, 99));
          }
          if (event.message) {
            setStatus(event.detail ? `${event.message}${event.detail ? ` · ${event.detail}` : ''}` : event.message);
            setGenerateLogs((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              const entry = { message: event.message ?? '', detail: event.detail, time: new Date().toLocaleTimeString() };
              if (last && last.message === entry.message && last.detail === entry.detail) return prev;
              next.push(entry);
              return next;
            });
          }

          if (event.type === 'error') {
            throw new Error(event.message || 'Generate failed');
          }
          if (event.type === 'done' && event.data) {
            data = event.data as GeneratePrdData;
            finished = true;
            setProgress(100);
            setStatus('PRD selesai, file sudah diunduh');
          }
        }
      }

      if (!data) throw new Error('Generate selesai tanpa hasil PRD');
      if (data.llm_error) setLlmError(prev => prev || (data.llm_error as string));
      setPrdText(data.prd_text ?? '');
      setMcpInfo(data.mcp ?? null);
      const blob = new Blob([data.prd_text ?? ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${toSafeFilename(title)}_prd.md`;
      a.click();
      URL.revokeObjectURL(url);
      await navigator.clipboard.writeText(JSON.stringify(data.mcp, null, 2)).catch(() => {});
      setPrdDone(true);
      setStatus('PRD selesai, file sudah diunduh');
      setStep('generate');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Generate failed';
      setStatus(msg);
      setError(msg);
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/76 backdrop-blur-xl">
        <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-card color-band text-sm font-black text-primary shadow-card">P</span>
            <span className="hidden text-base font-black tracking-tight text-primary sm:block">RakitPRD</span>
          </div>
          <div className="min-w-0 justify-self-center hidden sm:block">
            <JourneySteps active={step} stepIndex={stepIndex} />
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <SignOutButton compact />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 xl:hidden">
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-card border border-border bg-surface/80 p-3 shadow-card backdrop-blur-xl">
          {workspaceActions}
        </div>
      </div>

      {/* Main */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto grid w-full max-w-7xl gap-6 py-8 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="sticky top-24 hidden h-fit xl:block">
            <div className="space-y-3 rounded-card border border-border bg-surface/88 p-4 shadow-card backdrop-blur-xl">
              <div>
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Workspace</p>
                <h2 className="text-sm font-black tracking-tight text-primary">Project actions</h2>
                <p className="mt-1 text-xs leading-relaxed text-secondary">Aksi cepat untuk start ulang atau buka riwayat project.</p>
              </div>
              <div className="flex flex-col gap-2">
                {workspaceActions}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-8">

          {/* === STEP: IDEA === */}
          {step === 'ide' && (
            <div className="space-y-6">
              <div className="scroll-reveal mx-auto max-w-2xl space-y-3 text-center">
                <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-border bg-surface/78 px-3 py-1 text-xs font-semibold text-secondary shadow-card backdrop-blur-xl">
                  <span className="size-2 rounded-full bg-[var(--color-warm)]" />
                  Ide ke PRD, satu langkah lebih dekat
                </div>
                <h1 className="text-4xl font-black tracking-tight text-primary sm:text-6xl">
                  Mau bikin apa?
                </h1>
                <p className="mx-auto max-w-xl text-base leading-relaxed text-secondary">
                  Tulis ide mentahmu. RakitPRD akan bantu klasifikasi, tanya hal penting, lalu susun PRD yang siap dieksekusi.
                </p>
              </div>

              <div className={`scroll-reveal relative overflow-hidden rounded-card border bg-surface/88 shadow-card backdrop-blur-xl transition-all surface-glow ${focused ? 'border-accent/45 ring-4 ring-accent/10' : 'border-border'}`}>
                <div className="absolute left-0 top-0 h-1 w-full color-band" />
                <textarea
                  ref={textareaRef}
                  value={idea}
                  onChange={handleIdeaChange}
                  onKeyDown={handleIdeaKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  disabled={busy}
                  placeholder="Contoh: app untuk bantu solo builder bikin PRD, pecah task, dan sinkron ke coding agent..."
                  rows={1}
                  className="min-h-[190px] w-full resize-none bg-transparent px-5 pb-20 pt-5 text-base leading-relaxed text-primary placeholder:text-muted/70 focus:outline-none"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs tabular-nums ${ideaLen > 0 && ideaLen < MIN_CHARS ? 'text-red-500' : 'text-muted/50'}`}>
                      {ideaLen > 0 && ideaLen < MIN_CHARS && `Minimal ${MIN_CHARS} karakter`}
                      {ideaLen >= MAX_CHARS * 0.8 && `${ideaLen} / ${MAX_CHARS}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={submitIdea}
                    disabled={!canSubmit}
                    className="flex size-11 items-center justify-center rounded-input bg-accent text-accent-text shadow-card transition-all hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Kirim ide"
                  >
                    {busy ? (
                      <span className="size-5 animate-spin rounded-full border-2 border-accent-text/35 border-t-accent-text" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-5">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="stagger-container grid gap-3 sm:grid-cols-3">
                {[
                  ['Klasifikasi', 'Produk dibaca sesuai konteks.'],
                  ['Pertanyaan', 'Hanya hal yang berdampak ke scope.'],
                  ['PRD + Task', 'Output siap untuk agent.'],
                ].map(([name, desc], idx) => (
                  <div key={name} className="stagger-item rounded-card border border-border bg-surface/74 p-4 shadow-card backdrop-blur-xl" style={{ '--i': `${idx + 1}` } as CSSProperties}>
                    <div className="mb-3 size-2 rounded-full bg-accent" />
                    <p className="text-sm font-semibold text-primary">{name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === STEP: CLARIFY === */}
          {step === 'clarify' && (
            <div className="space-y-6">
              {busy && questions.length === 0 && <LoadingSkeleton text={status || 'Menganalisis ide'} />}

              {questions.length > 0 && (
                <div className="scroll-reveal relative overflow-hidden rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl sm:p-6 surface-glow">
                  <div className="absolute left-0 top-0 h-1 w-full color-band" />
                  {busy && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-white/65 backdrop-blur-[2px] dark:bg-black/50">
                      <div className="flex items-center gap-2.5 rounded-card border border-accent/20 bg-surface/90 px-5 py-3 text-sm font-semibold text-accent shadow-card">
                        <span className="size-4 animate-spin rounded-full border-2 border-border border-t-accent" />
                        <span>{status || 'Menyimpan jawaban…'}</span>
                      </div>
                    </div>
                  )}
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-primary">Pertanyaan klarifikasi</h3>
                      <p className="mt-1 text-sm text-secondary">Isi yang kamu tahu. Yang belum yakin boleh dijawab singkat.</p>
                    </div>
                    <div className="flex w-fit items-center gap-2">
                      <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
                        clarifyMode === 'ai'
                          ? 'border border-pastel-green bg-pastel-green/60 text-pastel-green-text'
                          : 'border border-pastel-red bg-pastel-red/70 text-pastel-red-text'
                      }`}>
                        {clarifyMode === 'ai' ? 'AI' : clarifyMode === 'fallback' ? 'Fallback' : 'Unknown'}
                      </span>
                      <span className="w-fit rounded-full border border-border bg-surface-alt px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                        {questions.length} item
                      </span>
                    </div>
                  </div>
                  {clarifyReasoning && (
                    <div className="mb-4 rounded-input border border-border bg-surface-alt/70 px-4 py-3 text-xs leading-relaxed text-secondary">
                      <span className="font-semibold text-primary">Sumber pertanyaan:</span> {clarifyReasoning}
                    </div>
                  )}
                  <div className="stagger-container grid gap-5 md:grid-cols-2">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="stagger-item space-y-3 rounded-card border border-border bg-surface-alt/80 p-4 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface" style={{ '--i': `${idx}` } as CSSProperties}>
                        <p className="text-sm font-medium leading-snug text-primary">{q.question}</p>
                        <input
                          className="min-h-11 w-full rounded-input border border-border bg-surface px-4 py-2.5 text-base text-primary placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent/25"
                          value={answers[q.id]?.text ?? ''}
                          onChange={(e) => setAnswers((a) => ({
                            ...a,
                            [q.id]: { text: e.target.value, selected: a[q.id]?.selected ?? [] },
                          }))}
                          placeholder="Ketik jawaban tambahan…"
                        />
                        <div className="flex flex-wrap gap-2">
                          {q.quick_replies.map((reply) => (
                            <button
                              type="button"
                              key={reply}
                              onClick={() => setAnswers((a) => {
                                const current = a[q.id] ?? { text: '', selected: [] };
                                const exists = current.selected.includes(reply);
                                return {
                                  ...a,
                                  [q.id]: {
                                    ...current,
                                    selected: exists
                                      ? current.selected.filter((item) => item !== reply)
                                      : [...current.selected, reply],
                                  },
                                };
                              })}
                              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all active:scale-[0.98]
                                ${(answers[q.id]?.selected ?? []).includes(reply)
                                  ? 'border-accent bg-accent text-accent-text'
                                  : 'border-border bg-surface text-secondary hover:border-accent/30 hover:text-accent'}`}
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted">Boleh pilih lebih dari satu pilihan cepat.</p>
                        <span className="block font-mono text-[9px] uppercase tracking-widest text-muted">{q.category}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={proceedToGenerate}
                      disabled={busy}
                      className="flex min-h-11 items-center gap-2 rounded-input bg-accent px-6 py-2.5 text-sm font-semibold text-accent-text shadow-card transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40"
                    >
                      {busy ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-accent-text/40 border-t-accent-text" />
                      ) : (
                        'Lanjut Generate'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === STEP: GENERATE === */}
          {step === 'generate' && !prdDone && (
            <div className="space-y-6 pt-8 text-center">
              {busy ? (
                <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 rounded-card border border-border bg-surface/88 p-6 shadow-card backdrop-blur-xl surface-glow">
                  <div className="flex size-14 items-center justify-center rounded-card color-band">
                    <span className="size-6 animate-spin rounded-full border-2 border-white/55 border-t-primary" />
                  </div>
                  <div className="w-full max-w-md space-y-4">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent transition-all page-loader-bar" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-sm font-semibold text-primary">{status}</p>
                    <p className="text-xs text-muted">Proses memanggil LLM — bisa butuh 1-2 menit per step. Jangan tinggalkan halaman.</p>
                  </div>
                  <div className="w-full rounded-card border border-border bg-surface-alt/70 p-4 text-left">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Generate log</p>
                      <span className="font-mono text-xs text-muted">{progress}%</span>
                    </div>
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {generateLogs.length > 0 ? generateLogs.slice(-8).map((log, idx) => (
                        <div key={`${log.time}-${idx}`} className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-input border border-border bg-surface px-3 py-2">
                          <span className="font-mono text-[10px] text-muted">{log.time}</span>
                          <span className="text-xs leading-relaxed text-secondary">
                            <span className="font-semibold text-primary">{log.message}</span>
                            {log.detail ? <span className="block text-muted">{log.detail}</span> : null}
                          </span>
                        </div>
                      )) : (
                        <div className="rounded-input border border-border bg-surface px-3 py-2 text-xs text-muted">
                          Menunggu log pertama dari server...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="scroll-reveal mx-auto max-w-lg space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Siap generate PRD</h1>
                    <p className="text-base leading-relaxed text-secondary">Jawaban klarifikasi dan tech stack sudah siap diproses menjadi dokumen, fitur, subfitur, dan task.</p>
                  </div>

                  {error && (
                    <div className="scroll-reveal rounded-card border border-pastel-red bg-pastel-red p-4 text-left">
                      <p className="text-sm font-semibold text-pastel-red-text">Gagal generate:</p>
                      <p className="mt-1 text-xs text-pastel-red-text">{error}</p>
                    </div>
                  )}

                  {!!stack && (
                    <div className="scroll-reveal rounded-card border border-border bg-surface/88 p-5 text-left shadow-card backdrop-blur-xl">
                      <h3 className="mb-3 text-sm font-semibold text-primary">Selected stack</h3>
                      <pre className="overflow-auto rounded-input bg-surface-alt p-4 font-mono text-xs leading-relaxed text-secondary">{JSON.stringify(stack, null, 2)}</pre>
                    </div>
                  )}

                  <div className="scroll-reveal">
                  <button
                    type="button"
                    onClick={() => generatePrd()}
                    className="rounded-input bg-accent px-10 py-3.5 text-base font-black text-accent-text shadow-card transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-card-hover active:scale-[0.97]"
                  >
                    Generate PRD
                  </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PRD result */}
          {prdDone && (
            <div className="space-y-6">
              <div className="scroll-reveal flex justify-end">
                <button
                  type="button"
                  onClick={() => generatePrd({ forceFresh: true })}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-input border border-accent/30 bg-surface/80 px-5 py-2 text-sm font-semibold text-accent shadow-card transition hover:bg-accent/5 active:scale-[0.98] disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-accent" />
                      <span>Fresh regenerate…</span>
                    </>
                  ) : (
                    'Generate ulang'
                  )}
                </button>
              </div>
              <div className="scroll-reveal flex gap-1 rounded-card border border-border bg-surface/88 p-1 shadow-card backdrop-blur-xl">
                {[
                  { id: 'prd' as const, label: 'PRD Document' },
                  { id: 'diagram' as const, label: 'Realtime MCP' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewTab(tab.id)}
                    className={`flex-1 rounded-input px-4 py-2 text-sm font-semibold transition-all ${
                      viewTab === tab.id ? 'bg-accent text-accent-text' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {viewTab === 'prd' && (
                <div className="rounded-card border border-border bg-surface/88 p-5 shadow-card backdrop-blur-xl sm:p-6 surface-glow">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-black text-primary">PRD Document</h2>
                  {prdText && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([prdText], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${toSafeFilename(title)}_prd.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="rounded-input border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent/35 hover:bg-surface-alt"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(prdText)}
                          className="rounded-input border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent/35 hover:bg-surface-alt"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/projects/${projectId}/export-agent`);
                            const json = await res.json();
                            if (!json.success) return;
                            const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${toSafeFilename(title)}_agent.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="rounded-input border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent/35 hover:bg-surface-alt"
                        >
                          JSON Agent
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAgentModal(true)}
                          className="rounded-input border border-accent/30 bg-surface px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/5"
                        >
                          Agent Instruction
                        </button>
                      </div>
                    )}
                  </div>
                  {llmError && (
                    <div className="mb-4 rounded-card border border-pastel-yellow bg-pastel-yellow p-4 text-sm text-pastel-yellow-text">
                      PRD ini dibuat memakai fallback karena {fallbackReasonLabel(llmError)}. Detail: {llmError}
                    </div>
                  )}
                  {prdText ? (
                    <div className="prose prose-sm prose-headings:font-sans prose-headings:font-black prose-a:text-accent max-h-[80vh] max-w-none overflow-auto rounded-input bg-surface-alt p-5 leading-relaxed text-primary">
                      <ReactMarkdown>{prdText}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">PRD text tidak tersedia.</p>
                  )}
                </div>
              )}

              {viewTab === 'diagram' && projectId && (
                <ProjectDashboard projectId={projectId} />
              )}
            </div>
          )}

          </div>
        </div>
      </div>
      {showSettings && <LlmSettings onClose={() => setShowSettings(false)} />}

      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAgentModal(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-primary">🤖 Agent Instruction</h3>
              <button type="button" onClick={() => setShowAgentModal(false)} className="rounded-input border border-border px-2.5 py-1 text-xs text-secondary hover:bg-surface-alt">
                Close
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-surface-alt p-4 text-xs leading-relaxed text-secondary">
              <p>Copy template di bawah ke AI coding agent (Claude Code, Cursor, dll). Template ini mengandung konteks project, cara akses task via MCP, dan aturan implementasi.</p>
            </div>

            <pre id="agent-instruction-source" className="overflow-auto rounded-xl border border-border bg-canvas p-5 font-mono text-xs leading-relaxed text-primary max-h-[50vh]">
{buildAgentInstruction(title, stack, prdText, mcpInfo?.endpoint, mcpInfo?.token)}
</pre>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector('#agent-instruction-source');
                  if (el) navigator.clipboard.writeText(el.textContent ?? '');
                }}
                className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                Copy Instruction
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([buildAgentInstruction(title, stack, prdText, mcpInfo?.endpoint, mcpInfo?.token)], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${toSafeFilename(title)}_agent.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-xl border border-border bg-surface px-5 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-alt"
              >
                Download MD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
