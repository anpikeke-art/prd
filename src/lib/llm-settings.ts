const STORAGE_KEY = 'prd-studio-llm-settings';

export type LlmProviderSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const DEFAULTS: LlmProviderSettings = {
  baseUrl: 'http://100.106.72.4:20128/v1',
  apiKey: 'sk-2aff3e352fd9b602-6lrx2q-33e5e880',
  model: 'cx/gpt-5.5',
};

export function getLlmSettings(): LlmProviderSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveLlmSettings(s: LlmProviderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
