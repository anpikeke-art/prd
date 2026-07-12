export type ManualTechStack = {
  frontend: string;
  backend: string;
  database: string;
  realtime: string;
  auth_ready: boolean;
};

export type ClarifyingQuestion = {
  id: string;
  question: string;
  category: string;
  why: string;
  quick_replies: string[];
};

export type ClarifyResponse = {
  category: string;
  secondary_category: string | null;
  reasoning: string;
  questions: ClarifyingQuestion[];
};

export type GeneratedFeature = {
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  acceptance_criteria: string[];
  sub_features: Array<{
    title: string;
    description: string;
    tasks: Array<{
      title: string;
      description: string;
    }>;
  }>;
};

const CATEGORY_BANK: Record<string, string[]> = {
  'B2B SaaS / Enterprise Tool': [
    'Siapa yang jadi buyer (decision maker) vs siapa end user harian?',
    'Ini menggantikan proses manual/tool lama, atau belum ada solusinya sama sekali?',
    'Perlu multi-role/permission (admin, member, viewer) atau single-role dulu?',
    'Ada kebutuhan integrasi ke tool lain (misal Slack, email, akuntansi)?',
    'Model pricing: per-seat, per-usage, flat, atau belum dipikirkan?',
  ],
  'Consumer App (mobile/web)': [
    'Target user usia/segmen berapa, dan seberapa sering mereka bakal buka app ini?',
    'Ada elemen sosial (share, follow, komentar) atau murni personal use?',
    'Monetisasi rencananya dari mana (ads, subscription, freemium, tidak ada dulu)?',
    'Perlu akun/login dari awal, atau bisa dicoba tanpa daftar dulu?',
  ],
  'Marketplace / Two-sided Platform': [
    'Siapa supply-side dan siapa demand-side-nya?',
    'Siapa yang lebih susah diakuisisi duluan — supply atau demand?',
    'Transaksi terjadi di dalam platform (ada payment) atau platform cuma perantara/listing?',
    'Ada kebutuhan trust & safety (review, verifikasi, dispute resolution)?',
  ],
  'Internal Tool / Ops Tool': [
    'Siapa saja role yang akan pakai, dan berapa banyak orangnya?',
    'Workflow existing-nya sekarang pakai apa? Apa pain point utamanya?',
    'Ada data yang perlu di-migrate dari sistem lama?',
    'Butuh reporting/export data untuk pihak lain (misal atasan, finance)?',
  ],
  'E-commerce': [
    'Jual produk sendiri, dropship, atau multi-vendor?',
    'Perlu integrasi payment gateway/ongkir spesifik (area mana)?',
    'Ada kebutuhan inventory management real-time?',
    'Channel penjualan cuma web ini, atau perlu sinkron ke marketplace lain?',
  ],
  'API / Developer Platform': [
    'Siapa consumer API-nya (internal team, partner, public developer)?',
    'Perlu dokumentasi publik + API key management dari awal?',
    'Ada rate limiting/tiering (free vs paid) yang perlu dipikirkan?',
    'Format data & auth method sudah ada preferensi (REST/GraphQL, API key/OAuth)?',
  ],
  'AI/Automation Feature': [
    'AI-nya berperan sebagai asisten (user tetap approve) atau otonom (jalan sendiri)?',
    'Ada kebutuhan human-in-the-loop untuk kasus tertentu?',
    'Data apa yang jadi input AI, dan dari mana sumbernya?',
    'Ada concern soal akurasi/hallucination yang perlu fallback plan?',
  ],
  'Content / Media Platform': [
    'Konten dibuat platform sendiri, user-generated, atau curated dari sumber lain?',
    'Ada kebutuhan moderasi konten?',
    'Model distribusi: feed algoritmik, chronological, atau kategori/tag?',
  ],
};

const UNIVERSAL_QUESTIONS = [
  'Masalah utama apa yang mau diselesaikan, dan siapa yang paling merasakan masalah ini?',
  'Kalau ada solusi/kompetitor yang sudah ada, apa yang bikin ide ini beda/lebih baik?',
  'Kalau harus pilih 1 metrik untuk bilang produk ini berhasil, metrik apa itu?',
  'Ada batasan waktu, budget, atau tech stack yang sudah fix?',
  'Untuk versi pertama (MVP), fitur apa yang WAJIB ada vs yang bisa nyusul belakangan?',
];

export function buildClarifySystemPrompt(): string {
  const categoryEntries = Object.entries(CATEGORY_BANK)
    .map(([name, questions]) => `  ${name}:\n${questions.map(q => `    - ${q}`).join('\n')}`)
    .join('\n');

  return `Kamu adalah AI classifier untuk product idea. Tugas kamu:

1. Baca ide produk dari user.
2. Klasifikasikan ide ke salah satu kategori berikut (pilih yang paling dominan, boleh sebutkan kategori sekunder jika hybrid):
   - B2B SaaS / Enterprise Tool
   - Consumer App (mobile/web)
   - Marketplace / Two-sided Platform
   - Internal Tool / Ops Tool
   - E-commerce
   - API / Developer Platform
   - AI/Automation Feature
   - Content / Media Platform
3. Berdasarkan kategori itu, buat 5-8 clarifying questions yang SPESIFIK ke kategori tersebut (lihat bank pertanyaan di bawah sebagai basis, boleh disesuaikan konteks ide user).
4. Tambahkan 4-5 pertanyaan universal (selalu ada, apa pun kategorinya).
5. Sediakan 2-4 quick_replies (opsi jawaban pendek) per pertanyaan.
6. Output dalam format JSON:

{
  "category": "...",
  "secondary_category": "... atau null",
  "reasoning": "1-2 kalimat kenapa masuk kategori ini",
  "questions": [
    {
      "id": "q1",
      "question": "Pertanyaan dalam Bahasa Indonesia yang jelas dan langsung",
      "category": "specific|universal",
      "why": "kenapa pertanyaan ini penting untuk PRD nanti",
      "quick_replies": ["opsi 1", "opsi 2"]
    }
  ]
}

Jangan tanya hal yang jawabannya sudah tersirat jelas di ide user. Prioritaskan pertanyaan yang kalau tidak dijawab akan membuat PRD ambigu atau scope-nya melebar tanpa batas.

### Bank pertanyaan per kategori (jadikan basis, boleh disesuaikan):

${categoryEntries}

### Pertanyaan universal (selalu ditanya):
${UNIVERSAL_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Output JSON object only.`;
}

export function buildClarifyUserContent(idea: string, existingContext: string): string {
  return `Ide:\n${idea}\n\nExisting context:\n${existingContext || '-'}`;
}

export function buildTechStackPrompt(idea: string, clarificationLog: unknown) {
  return `Kamu senior architect. Analisis ide dan clarification log, lalu rekomendasikan tech stack per layer.

Aturan output:
- Return pure JSON object
- Field wajib: frontend, backend, database, realtime, auth_ready, reasons
- reasons object punya alasan singkat per layer
- Jangan keluar dari layer yang diminta

Ide:
${idea}

Clarification log:
${JSON.stringify(clarificationLog ?? null, null, 2)}`;
}

function formatClarify(log: unknown, maxQ?: number): string {
  if (!log || typeof log !== 'object') return '-';
  const obj = log as { questions?: Array<{ id?: string; question?: string; answer?: string }>; answers?: Record<string, string> };
  if (!obj.questions) return '-';
  const qs = typeof maxQ === 'number' ? obj.questions.slice(0, maxQ) : obj.questions;
  const out = qs.map((q) => {
    const id = q.id ?? '';
    const answer = obj.answers?.[id] ?? q.answer ?? '(belum dijawab)';
    return `- ${q.question ?? ''}\n  Jawaban: ${answer}`;
  }).join('\n');
  if (typeof maxQ === 'number' && obj.questions.length > maxQ) {
    return out + `\n... dan ${obj.questions.length - maxQ} pertanyaan lainnya (diringkas)`;
  }
  return out;
}

export function buildPrdSystemPrompt(): string {
  return `Kamu adalah AI yang membuat Product Requirements Document (PRD) yang detail dan siap dipakai tim eksekusi (product, design, engineering).

Input yang kamu terima:
- Ide awal dari user
- Kategori produk hasil klasifikasi
- Jawaban user atas clarifying questions

Aturan penting:
1. Setiap jawaban dari clarifying questions HARUS termanifestasi eksplisit di section yang relevan — jangan cuma jadi konteks yang diserap bebas.
2. Jangan skip section apa pun di struktur wajib di bawah, walau ide user simpel. Kalau info tidak cukup untuk satu bagian, isi dengan asumsi masuk akal dan tandai jelas sebagai "Asumsi: ...".
3. Functional requirements harus dipecah per fitur/modul, bukan paragraf umum, dan tiap requirement penting punya acceptance criteria.
4. Wajib ada Non-Goals — sebutkan eksplisit apa yang TIDAK dikerjakan di versi ini, supaya scope jelas.
5. Wajib ada Edge Cases & Error Handling — jangan cuma happy path.
6. Prioritaskan fitur pakai label P0 (wajib MVP) / P1 (penting tapi bisa nyusul) / P2 (nice to have).
7. Tulis dalam Bahasa Indonesia yang jelas dan profesional, hindari jargon kosong.
8. Output dalam format Markdown dengan heading sesuai struktur di bawah.
9. WAJIB: sebelum output final, lakukan audit konsistensi internal terhadap draft yang baru kamu buat sendiri. Cek 5 pola kontradiksi generik berikut di seluruh section:
   a. Open question yang sudah ke-lock diam-diam — ada entri di "Asumsi & Open Questions" yang jawabannya sebenarnya sudah diasumsikan atau ditentukan oleh requirement/skema data di section lain. Kalau ketemu: pindahkan ke Assumptions dengan penjelasan eksplisit, jangan biarkan tetap tercatat sebagai open question.
   b. Deskripsi domain vs granularitas data model — cara entitas utama dimodelkan tidak konsisten dengan bagaimana entitas itu dideskripsikan di Ringkasan/Latar Belakang atau User Stories.
   c. Non-Goal yang sebenarnya dibutuhkan P0 — ada item di Non-Goals yang ternyata diperlukan supaya salah satu Functional Requirement berlabel P0 bisa berjalan.
   d. Success Metric yang tidak terukur — ada metrik yang butuh data/field yang tidak pernah didefinisikan untuk dicatat di Functional Requirements manapun.
   e. Requirement yang melanggar batasan akses — ada Functional Requirement yang bertentangan dengan batasan akses yang sudah didefinisikan di Persona/Target User.
10. Jika audit menemukan salah satu pola di atas, jangan disembunyikan atau diam-diam diperbaiki tanpa jejak — tulis eksplisit di section 14 "Catatan Konsistensi", berisi daftar kontradiksi yang ditemukan beserta 2 opsi rekomendasi penyelesaian per item.
11. Jika audit tidak menemukan kontradiksi, section 14 tetap harus ada dan berisi satu kalimat konfirmasi bahwa audit sudah dilakukan dan tidak ditemukan kontradiksi.
12. Non-Goals paling sering dilewatkan model — ini harus benar-benar membatasi scope, bukan sekadar daftar generik.
13. Edge cases harus spesifik ke domain produknya, bukan kalimat umum seperti "handle error dengan baik".
14. Success metric harus terukur dengan angka, rasio, SLA, atau threshold yang jelas.

Struktur wajib PRD:

# [Nama Produk]

## 1. Ringkasan & Latar Belakang
## 2. Masalah yang Diselesaikan
## 3. Tujuan (Goals)
## 4. Non-Goals (di luar scope versi ini)
## 5. Target User / Persona
## 6. User Stories & Use Cases
   (format: "Sebagai [role], saya ingin [aksi], supaya [manfaat]" + acceptance criteria per story)
## 7. Functional Requirements
   (dipecah per modul/fitur, masing-masing dengan deskripsi + acceptance criteria + prioritas P0/P1/P2)
## 8. Non-Functional Requirements
   (performance, security, scalability, availability — sesuai relevansi)
## 9. Edge Cases & Error Handling
## 10. Success Metrics / KPI
## 11. Dependencies & Constraints
## 12. Asumsi & Open Questions
## 13. Milestone / Prioritas Rilis
   (mapping fitur ke P0/P1/P2, kalau memungkinkan rough timeline)
## 14. Catatan Konsistensi
   (hasil audit konsistensi internal: daftar kontradiksi + 2 opsi penyelesaian per item, atau konfirmasi tidak ada kontradiksi)`;
}

export function buildPrdUserContent(input: {
  title: string;
  idea: string;
  category?: string;
  clarificationLog: unknown;
  techStack: unknown;
}): string {
  const idea = input.idea.length > 2000 ? input.idea.slice(0, 2000) + '...' : input.idea;
  const clarify = formatClarify(input.clarificationLog, 12);
  const tech = input.techStack && typeof input.techStack === 'object'
    ? Object.entries(input.techStack as Record<string, unknown>).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : '-';

  return `Judul: ${input.title}
Ide: ${idea}
Kategori: ${input.category ?? '-'}
Tech stack:
${tech}

Hasil klarifikasi:
${clarify}

Buat PRD sesuai struktur wajib. Pastikan semua jawaban klarifikasi benar-benar muncul di section yang relevan, dan kalau ada info yang belum pasti tulis eksplisit sebagai asumsi atau open question. Output dalam Markdown.`;
}

export function buildFeatureExtractPrompt(prdMarkdown: string) {
  return `Dari PRD Markdown di bawah, ekstrak fitur-fitur utama dengan ketentuan berikut:

### ATURAN WAJIB:

1. **Prioritas** — Baca section "Milestone / Prioritas Rilis" (biasanya section 13). Assign P0/P1/P2 ke setiap fitur sesuai milestone tersebut. Jangan tebak sendiri.
2. **Non-Goals** — Baca section "Non-Goals". Fitur yang tercantum di Non-Goals JANGAN diekstrak, kecuali secara eksplisit disebut sebagai P1/P2 di milestone.
3. **Acceptance Criteria** — Ambil dari User Stories (section 6) atau langsung dari deskripsi modul. Setiap fitur minimal 3 acceptance criteria.
4. **Tasks** — Tiap task harus deskriptif dan actionable. Jangan "Buat form" saja, tapi "Buat form input dengan validasi field wajib (judul, deadline, status)".
5. **Tech stack** — Baca section "Dependencies & Constraints" untuk referensi teknologi.
6. **Catatan Konsistensi** — Jangan ekstrak item di section 14 sebagai fitur. Section itu hanya audit/opsi perbaikan, bukan scope implementasi.

Output JSON:
{
  "features": [
    {
      "title": "nama fitur",
      "description": "deskripsi singkat",
      "priority": "P0",
      "acceptance_criteria": ["kriteria 1", "kriteria 2"],
      "sub_features": [
        {
          "title": "nama sub-fitur",
          "description": "deskripsi",
          "tasks": [
            { "title": "nama task", "description": "deskripsi detail" }
          ]
        }
      ]
    }
  ]
}

PRD:
${prdMarkdown}

Output JSON object ONLY. Valid JSON. Setiap fitur WAJIB punya field priority.`;
}
