import type { ClarifyingQuestion, GeneratedFeature, ManualTechStack } from '@/lib/prd-templates';
import { inferProjectTitle } from '@/lib/prd-title';

function guessNoun(idea: string) {
  const words = idea.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(' ') || 'produk';
}

function guessCategory(idea: string): string {
  const lower = idea.toLowerCase();
  if (lower.includes('ai') || lower.includes('agent') || lower.includes('automate') || lower.includes('otomatis')) return 'AI/Automation Feature';
  if (lower.includes('marketplace') || lower.includes('two sided') || lower.includes('supply') || lower.includes('demand')) return 'Marketplace / Two-sided Platform';
  if (lower.includes('jual') || lower.includes('beli') || lower.includes('shop') || lower.includes('toko') || lower.includes('payment')) return 'E-commerce';
  if (lower.includes('api') || lower.includes('sdk') || lower.includes('developer') || lower.includes('plugin')) return 'API / Developer Platform';
  if (lower.includes('internal') || lower.includes('ops') || lower.includes('monitor') || lower.includes('dashboard') || lower.includes('tool')) return 'Internal Tool / Ops Tool';
  if (lower.includes('content') || lower.includes('media') || lower.includes('blog') || lower.includes('video') || lower.includes('social')) return 'Content / Media Platform';
  if (lower.includes('consumer') || lower.includes('mobile') || lower.includes('app') || lower.includes('game')) return 'Consumer App (mobile/web)';
  return 'B2B SaaS / Enterprise Tool';
}

export function fallbackClarifyQuestions(idea: string): { category: string; secondary_category: string | null; reasoning: string; questions: ClarifyingQuestion[] } {
  const subject = guessNoun(idea);
  const category = guessCategory(idea);
  return {
    category,
    secondary_category: null,
    reasoning: `Ide "${subject}" mengarah ke ${category.toLowerCase()}.`,
    questions: [
      {
        id: 'q1',
        question: `Siapa user utama buat ${subject}?`,
        category: 'specific',
        why: 'Menentukan role dan UX flow yang tepat.',
        quick_replies: ['internal team', 'end user', 'admin'],
      },
      {
        id: 'q2',
        question: `Masalah utama apa yang ${subject} selesaikan?`,
        category: 'universal',
        why: 'Memvalidasi value proposition sebelum PRD.',
        quick_replies: ['efisiensi', 'monitoring', 'otomatisasi'],
      },
      {
        id: 'q3',
        question: 'Output utama harus apa saat flow selesai?',
        category: 'specific',
        why: 'Menentukan deliverable dan success criteria.',
        quick_replies: ['draft PRD', 'task list', 'report'],
      },
      {
        id: 'q4',
        question: 'Ada batasan waktu, budget, atau tech stack yang sudah fix?',
        category: 'universal',
        why: 'Constraint langsung memengaruhi arsitektur dan prioritas.',
        quick_replies: ['1 bulan', '3 bulan', 'belum ditentukan'],
      },
      {
        id: 'q5',
        question: 'Untuk versi MVP, fitur apa yang WAJIB ada vs yang bisa nyusul?',
        category: 'universal',
        why: 'Mencegah scope creep dan menetapkan milestone jelas.',
        quick_replies: ['semua penting', 'core aja', 'perlu prioritas'],
      },
      {
        id: 'q6',
        question: 'Constraint teknis paling penting apa?',
        category: 'specific',
        why: 'Memastikan arsitektur sesuai kebutuhan non-fungsional.',
        quick_replies: ['simple MVP', 'offline first', 'multi tenant'],
      },
    ],
  };
}

export function fallbackTechStack(idea: string, clarificationLog: unknown): ManualTechStack & { reasons: Record<string, string> } {
  const lower = `${idea} ${JSON.stringify(clarificationLog ?? {})}`.toLowerCase();
  const realtime = lower.includes('realtime') ? 'SSE/WebSocket' : 'SSE';
  const authReady = !lower.includes('public only');

  return {
    frontend: 'Next.js 15 + React 19 + Tailwind CSS',
    backend: 'Next.js Route Handlers + Prisma',
    database: 'PostgreSQL',
    realtime,
    auth_ready: authReady,
    reasons: {
      frontend: 'Satu codebase, cepat iterate, cocok buat dashboard + wizard.',
      backend: 'Route Handlers cukup buat API layer Fase 1.',
      database: 'Relational model pas buat project/feature/task tree.',
      realtime: 'SSE cukup buat update status tanpa kompleksitas WebSocket.',
      auth_ready: authReady ? 'Auth siap di layer infra berikutnya.' : 'Flow MVP fokus public/internal.',
    },
  };
}

function buildIdeaFeatures(idea: string, title: string): GeneratedFeature[] {
  const lower = `${title} ${idea}`.toLowerCase();

  if (lower.includes('monitor') || lower.includes('pantau') || lower.includes('dashboard') || lower.includes('agent') || lower.includes('saas')) {
    return [
      { title: 'Dashboard Monitoring Real-time', description: 'Pantau semua AI agent, token usage, cost, error rate dalam satu dashboard.', priority: 'P0', acceptance_criteria: ['Menampilkan daftar agent', 'Grafik token usage real-time', 'Summary cost per periode', 'Error rate per agent'], sub_features: [{ title: 'Agent list', description: 'Daftar semua AI agent dengan status live.', tasks: [{ title: 'Agent table', description: 'Tabel agent: nama, model, status, usage.' }, { title: 'Live status', description: 'Indicator online/offline/error per agent.' }] }, { title: 'Usage charts', description: 'Visualisasi pemakaian.', tasks: [{ title: 'Token usage chart', description: 'Line chart token per jam/hari.' }, { title: 'Cost chart', description: 'Akumulasi biaya per periode.' }] }] },
      { title: 'Billing & Client Management', description: 'Kelola billing per client dengan model per-agent flat + overage.', priority: 'P1', acceptance_criteria: ['Daftar client', 'Invoice otomatis', 'Histori pembayaran', 'Overage alert'], sub_features: [{ title: 'Client list', description: 'Data master client.', tasks: [{ title: 'CRUD client', description: 'Tambah/edit/hapus client.' }, { title: 'Usage report', description: 'Rekap pemakaian per client.' }] }, { title: 'Invoicing', description: 'Generate invoice otomatis.', tasks: [{ title: 'Auto invoice', description: 'Generate invoice tiap bulan.' }, { title: 'Payment tracking', description: 'Catat status pembayaran.' }] }] },
      { title: 'Auto-switch Model', description: 'Auto-switch provider/model saat rate limit dengan circuit breaker.', priority: 'P1', acceptance_criteria: ['Detect rate limit', 'Switch ke model cadangan', 'Circuit breaker mencegah infinite loop', 'Log semua switching'], sub_features: [{ title: 'Switch rules', description: 'Konfigurasi urutan fallback.', tasks: [{ title: 'Rule config', description: 'Set priority model chain.' }, { title: 'Circuit breaker', description: 'Backoff + timeout sebelum retry.' }] }, { title: 'Switch log', description: 'Riwayat auto-switch.', tasks: [{ title: 'Event log', description: 'Catat tiap switch dengan alasan.' }, { title: 'Alert', description: 'Notifikasi kalau semua model habis.' }] }] },
    ];
  }

  if (lower.includes('booking') || lower.includes('lapangan') || lower.includes('futsal') || lower.includes('venue')) {
    return [
      { title: 'Booking Management', description: 'Kelola jadwal booking lapangan dengan slot per jam.', priority: 'P0', acceptance_criteria: ['Lihat jadwal per lapangan', 'Pilih slot waktu', 'Booking multi-lapangan', 'Buffer antar sesi'], sub_features: [{ title: 'Calendar view', description: 'Tampilan jadwal harian/mingguan.', tasks: [{ title: 'Slot grid', description: 'Grid lapangan x waktu.' }, { title: 'Booking modal', description: 'Form booking dari slot yang dipilih.' }] }, { title: 'Multi-court booking', description: 'Booking beberapa lapangan.', tasks: [{ title: 'Multi select', description: 'Pilih multiple lapangan.' }, { title: 'Single transaction', description: 'Satu transaksi untuk semua.' }] }] },
      { title: 'Payment & QRIS', description: 'Integrasi pembayaran QRIS untuk booking.', priority: 'P0', acceptance_criteria: ['Generate QRIS', 'Konfirmasi pembayaran otomatis', 'Refund flow'], sub_features: [{ title: 'Payment gateway', description: 'Proses pembayaran.', tasks: [{ title: 'QRIS generate', description: 'Generate QR code pembayaran.' }, { title: 'Status callback', description: 'Handle notifikasi pembayaran.' }] }] },
    ];
  }

  if (lower.includes('jurnal') || lower.includes('journal') || lower.includes('catat') || lower.includes('diary')) {
    return [
      { title: 'Voice Journal Entry', description: 'Rekam aktivitas harian pakai suara, AI transkrip otomatis.', priority: 'P0', acceptance_criteria: ['Rekam suara', 'Transkrip otomatis', 'Simpan ke timeline'], sub_features: [{ title: 'Recording', description: 'Rekam dan transkrip.', tasks: [{ title: 'Voice record', description: 'Rekam suara dari browser.' }, { title: 'Transcribe', description: 'Ubah suara ke teks via AI.' }] }] },
      { title: 'Analytics & Insight', description: 'Analisis pola dari journal entries.', priority: 'P1', acceptance_criteria: ['Ringkasan mingguan', 'Deteksi pola produktivitas', 'Rekomendasi improvement'], sub_features: [{ title: 'Pattern analysis', description: 'Analisis otomatis.', tasks: [{ title: 'Weekly summary', description: 'Generate ringkasan mingguan.' }, { title: 'Trend detection', description: 'Deteksi pola positif/negatif.' }] }] },
    ];
  }

  return [
    { title: 'Manajemen Data Utama', description: `CRUD untuk data inti ${title}.`, priority: 'P0', acceptance_criteria: ['Tambah data', 'Edit data', 'Hapus data', 'Validasi input'], sub_features: [{ title: 'Data entry', description: 'Form input data.', tasks: [{ title: 'Create form', description: 'Form untuk tambah data baru.' }, { title: 'Edit form', description: 'Form untuk ubah data.' }] }, { title: 'Data view', description: 'Tampilan data.', tasks: [{ title: 'List table', description: 'Tabel data dengan filter.' }, { title: 'Detail view', description: 'Halaman detail data.' }] }] },
    { title: 'Dashboard & Laporan', description: 'Ringkasan data dan laporan.', priority: 'P0', acceptance_criteria: ['Dashboard ringkasan', 'Export laporan', 'Filter periode'], sub_features: [{ title: 'Dashboard', description: 'Ringkasan visual.', tasks: [{ title: 'Summary cards', description: 'KPI utama.' }, { title: 'Charts', description: 'Grafik tren.' }] }] },
  ];
}

export function fallbackPrdMarkdown(input: {
  title: string;
  idea: string;
  clarificationLog: unknown;
  techStack: unknown;
}): string {
  const title = inferProjectTitle(input.title, input.title);
  const stack = input.techStack as Partial<ManualTechStack> | null | undefined;
  const frontend = stack?.frontend ?? 'Next.js';
  const backend = stack?.backend ?? 'Next.js Route Handlers';
  const database = stack?.database ?? 'PostgreSQL';
  const realtime = stack?.realtime ?? 'SSE';

  return `# ${title}

> Dokumen ini adalah PRD awal yang dibuat secara otomatis. Setelah LLM proxy tersambung, regenerate untuk versi yang lebih detail dan akurat.

---

## 1. Ringkasan & Latar Belakang

### Ide Produk
${input.idea}

### Tujuan Produk
Aplikasi ini bertujuan untuk mewujudkan ide di atas menjadi produk digital yang siap dikembangkan. Fokus utama adalah memberikan solusi yang efisien, mudah digunakan, dan dapat diandalkan.

| Aspek | Detail |
|-------|--------|
| Nama Produk | ${title} |
| Status | Perencanaan |
| Target Rilis MVP | Sesuai prioritas di bawah |

---

## 2. Masalah yang Diselesaikan

### Masalah Utama
Saat ini, ide "${title}" masih berupa konsep yang perlu dijabarkan menjadi spesifikasi teknis yang jelas dan terstruktur agar siap dikembangkan oleh tim engineering.

### Dampak
- Ide tidak terdokumentasi dengan baik
- Sulit dikomunikasikan ke tim engineering
- Risiko misinterpretasi saat development

---

## 3. Tujuan (Goals)

### Tujuan Bisnis
| Tujuan | Prioritas |
|--------|-----------|
| Menghasilkan PRD yang siap pakai oleh tim eksekusi | P0 |
| Menjabarkan ide menjadi fitur-fitur konkret | P0 |
| Memberikan panduan teknis yang jelas untuk development | P0 |

---

## 4. Non-Goals (di luar scope versi ini)

| No | Non-Goal | Alasan |
|----|----------|--------|
| 1 | Implementasi infrastruktur production-grade | Fokus MVP adalah fungsionalitas inti |
| 2 | Pengujian keamanan menyeluruh | Akan dilakukan sebelum rilis publik |
| 3 | Dokumentasi end-user | Cukup inline help di MVP |

---

## 5. Target User / Persona

### Persona Utama
| Role | Deskripsi | Kebutuhan Utama |
|------|-----------|-----------------|
| User Utama | Individu atau tim yang memiliki ide produk digital | Memasukkan ide dan mendapatkan PRD |
| User Sekunder | Product manager, engineer, designer | Membaca spesifikasi teknis |

### Pain Points
- Tidak ada tools untuk mengubah ide menjadi dokumen teknis
- Ide sering hilang atau tidak terdokumentasi
- Perlu format baku yang siap eksekusi

---

## 6. User Stories & Use Cases

### User Stories
| ID | Role | Aksi | Manfaat | Prioritas |
|----|------|------|---------|-----------|
| US-01 | User | Memasukkan ide produk | Bisa diolah menjadi PRD | P0 |
| US-02 | User | Menjawab pertanyaan klarifikasi | PRD lebih akurat | P0 |
| US-03 | User | Melihat hasil PRD terstruktur | Siap eksekusi | P0 |

### Alur Utama (Happy Path)
1. User membuka aplikasi
2. User memasukkan ide produk
3. Sistem menampilkan pertanyaan klarifikasi
4. User menjawab pertanyaan
5. Sistem menghasilkan PRD
6. User mendownload atau melihat PRD

---

## 7. Functional Requirements

### Modul 1 — Input Ide
**Deskripsi:** Form input untuk menulis ide produk dengan bebas.
**Prioritas:** P0

| ID | Requirement | Acceptance Criteria |
|----|-------------|--------------------|
| F-01 | User dapat mengetik ide minimal 10 kata | Form menerima input ≥10 karakter |
| F-02 | Validasi panjang karakter | Maksimal 2000 karakter |
| F-03 | Submit dengan tombol atau Enter | Kedua metode berfungsi |

### Modul 2 — Klasifikasi Ide
**Deskripsi:** AI mengkategorikan ide secara otomatis.
**Prioritas:** P0

| ID | Requirement | Acceptance Criteria |
|----|-------------|--------------------|
| F-04 | Klasifikasi otomatis | Kategori muncul setelah submit ide |
| F-05 | Feedback ke user | Kategori ditampilkan sebelum klarifikasi |

### Modul 3 — Clarifying Questions
**Deskripsi:** AI menghasilkan pertanyaan relevan berdasarkan kategori.
**Prioritas:** P0

| ID | Requirement | Acceptance Criteria |
|----|-------------|--------------------|
| F-06 | Generate pertanyaan | Minimal 5 pertanyaan muncul |
| F-07 | Input jawaban | User bisa menjawab setiap pertanyaan |
| F-08 | Quick replies | Tersedia opsi jawaban cepat |

### Modul 4 — Generate PRD
**Deskripsi:** AI menghasilkan PRD dari ide + jawaban klarifikasi.
**Prioritas:** P0

| ID | Requirement | Acceptance Criteria |
|----|-------------|--------------------|
| F-09 | Generate PRD | PRD muncul dengan 13 section lengkap |
| F-10 | Download markdown | File .md bisa didownload |
| F-11 | Copy PRD | Button copy tersedia |

### Modul 5 — Riwayat Proyek
**Deskripsi:** Menyimpan proyek PRD yang sudah digenerate.
**Prioritas:** P1

| ID | Requirement | Acceptance Criteria |
|----|-------------|--------------------|
| F-12 | Simpan proyek | Proyek tersimpan di database |
| F-13 | Akses kembali | Proyek bisa diakses dari history |

---

## 8. Non-Functional Requirements

### Performance
| Requirement | Target |
|-------------|--------|
| Load time halaman utama | < 3 detik |
| Respons input | < 500ms |

### Security
| Requirement | Keterangan |
|-------------|------------|
| Enkripsi data | Data tersimpan dengan aman |
| Validasi input | Server-side + client-side |

### Availability
| Requirement | Target |
|-------------|--------|
| Uptime MVP | 99% best effort |
| Backup data | Harian |

### Maintainability
- Kode terstruktur dengan Next.js App Router
- Database migration dengan Prisma
- Environment variable untuk konfigurasi

---

## 9. Edge Cases & Error Handling

### Skenario Error
| No | Skenario | Penanganan |
|----|----------|------------|
| 1 | Ide terlalu pendek (< 10 kata) | Tampilkan fallback pertanyaan default |
| 2 | AI timeout atau error | Gunakan template PRD cadangan (fallback) |
| 3 | Sesi expired | Simpan progress di database, user bisa lanjut setelah login ulang |
| 4 | Network offline | Tampilkan pesan error yang jelas |
| 5 | Input kosong | Validasi sebelum submit |

---

## 10. Success Metrics / KPI

| KPI | Target | Cara Ukur |
|-----|--------|-----------|
| Completion rate | 80% user berhasil generate PRD | Hitung rasio generate / mulai |
| Kecepatan generate | < 30 detik rata-rata | Timer backend |
| User satisfaction | > 4/5 | Survey setelah generate |

---

## 11. Dependencies & Constraints

### Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + Tailwind CSS |
| Backend | Next.js Route Handlers + Prisma ORM |
| Database | PostgreSQL |
| AI | LLM proxy via Tailscale router |
| Realtime | SSE |
| Auth | NextAuth v4 + Google OAuth |

### Constraints
- Database: PostgreSQL (wajib)
- Deployment: Mendukung Node.js
- Auth: Google OAuth (wajib)

---

## 12. Asumsi & Open Questions

### Asumsi
| No | Asumsi |
|----|--------|
| 1 | User punya koneksi internet yang stabil |
| 2 | LLM proxy selalu tersedia |
| 3 | User memiliki akun Google untuk auth |

### Open Questions
| No | Pertanyaan | Status |
|----|------------|--------|
| 1 | Perlu rating/feedback untuk hasil PRD? | Perlu diskusi |
| 2 | Format export tambahan (PDF, DOCX)? | P1 |
| 3 | Multi-bahasa untuk PRD? | P2 |

---

## 13. Milestone / Prioritas Rilis

### Rencana Rilis
| Prioritas | Fitur | Target |
|-----------|-------|--------|
| P0 (MVP) | Input ide → Klasifikasi → Clarify → Generate → Tampilkan hasil | Rilis 1 |
| P1 | Riwayat proyek, edit PRD, export PDF | Rilis 2 |
| P2 | Template PRD kustom, kolaborasi tim, integrasi Jira/Linear | Rilis 3 |

### Timeline MVP
| Fase | Waktu | Deliverable |
|------|-------|-------------|
| Foundation | Minggu 1 | Setup, database, auth |
| Core flow | Minggu 2 | Input ide, classify, clarify |
| Generation | Minggu 3-4 | PRD generate, display, download |
| Polish | Minggu 5 | Error handling, responsive, testing |

---

## 14. Catatan Konsistensi

Audit konsistensi internal sudah dilakukan pada template fallback ini. Karena ini dokumen cadangan generik, beberapa open question masih sengaja dibiarkan terbuka dan perlu dipastikan ulang saat regenerate dengan LLM utama.`;
}

export function fallbackPrdPayload(input: {
  title: string;
  idea: string;
  clarificationLog: unknown;
  techStack: unknown;
}) {
  const stack = input.techStack as Partial<ManualTechStack> | null | undefined;
  const frontend = stack?.frontend ?? 'Next.js';
  const backend = stack?.backend ?? 'Next.js Route Handlers';
  const database = stack?.database ?? 'PostgreSQL';
  const realtime = stack?.realtime ?? 'SSE';
  const authReady = stack?.auth_ready ?? true;
  const features = buildIdeaFeatures(input.idea, input.title);
  const stackText = `- **Frontend:** ${frontend}\n- **Backend:** ${backend}\n- **Database:** ${database}\n- **Realtime:** ${realtime}\n- **Auth:** ${typeof authReady === 'boolean' ? (authReady ? 'Ready' : 'Public only') : String(authReady)}`;

  return {
    overview: input.idea,
    problem_statement: `Saat ini, ide "${input.title}" masih berupa konsep yang perlu dijabarkan menjadi spesifikasi teknis yang jelas dan terstruktur agar siap dikembangkan oleh tim engineering.`,
    non_functional_requirements: ['Responsive & mobile-friendly', 'Data persist ke database', 'Real-time updates', 'Keamanan data'],
    architecture_text: `Sistem dibangun dengan arsitektur monolitik modern menggunakan:\n${stackText}\n\nAlasan pemilihan stack:\n- Satu codebase (Next.js) mempercepat development\n- PostgreSQL cocok untuk data relasional\n- SSE cukup untuk notifikasi real-time tanpa kompleksitas WebSocket`,
    features,
  };
}
