const STORAGE_KEY = 'prd-studio-llm-settings';

export type LlmProviderSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const DEFAULTS: LlmProviderSettings = {
  baseUrl: 'https://rsx8val.abc-tunnel.us/v1',
  apiKey: 'sk-2aff3e352fd9b602-6lrx2q-33e5e880',
  model: 'chat-cepat',
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
