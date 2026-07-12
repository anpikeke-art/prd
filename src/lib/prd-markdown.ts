import type { GeneratedFeature } from '@/lib/prd-templates';

type PrdData = {
  title: string;
  overview: string;
  problem_statement: string;
  non_functional_requirements: string[];
  architecture_text: string;
  features: GeneratedFeature[];
};

function buildUserFlow(features: GeneratedFeature[]): string {
  const steps = features.flatMap((f, i) => {
    const subs = f.sub_features.map((s) => `   - ${s.title}: ${s.description}`);
    return [`${i + 1}. **${f.title}** — ${f.description}`, ...subs];
  });
  return steps.join('\n');
}

export function buildPrdMarkdown(data: PrdData): string {
  const featuresMd = data.features.map((f, i) => {
    const subs = f.sub_features.map((s) => {
      const tasks = s.tasks.map((t) => `    - ${t.title}: ${t.description}`).join('\n');
      return `  - ${s.title}: ${s.description}\n${tasks}`;
    }).join('\n');
    return `${i + 1}.  **${f.title}** — ${f.description}\n${subs}`;
  }).join('\n\n');

  const reqsMd = data.non_functional_requirements.map((r) => `- ${r}`).join('\n');
  const userFlowMd = buildUserFlow(data.features);

  return `# PRD — ${data.title}

## 1. Overview
${data.overview}

${data.problem_statement}

## 2. Requirements
${reqsMd}

## 3. Core Features
${featuresMd}

## 4. User Flow
${userFlowMd}

## 5. Architecture
${data.architecture_text}

## 6. Design & Technical Constraints
- Responsive design untuk semua ukuran layar
- REST API dengan validasi input ketat
- Database relational dengan constraint integrity
- Real-time event-driven untuk notifikasi
- Keamanan: input sanitization, rate limiting, CORS
`;
}
