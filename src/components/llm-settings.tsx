'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LlmProviderSettings } from '@/lib/llm-settings';
import { getLlmSettings, saveLlmSettings } from '@/lib/llm-settings';

export function LlmSettings({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<LlmProviderSettings>({ baseUrl: '', apiKey: '', model: '' });
  const [testResult, setTestResult] = useState<{ ok: boolean; status?: number; latency: number; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSettings(getLlmSettings());
  }, []);

  const update = useCallback((field: keyof LlmProviderSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const save = useCallback(() => {
    saveLlmSettings(settings);
    onClose();
  }, [settings, onClose]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      setTestResult(json.data);
    } catch {
      setTestResult({ ok: false, latency: 0, error: 'Request failed' });
    } finally {
      setTesting(false);
    }
  }, [settings]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-primary/20 px-4 pt-16 backdrop-blur-md sm:pt-20">
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-card border border-border bg-surface/94 shadow-card backdrop-blur-xl surface-glow">
        <div className="color-band h-1.5" />
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-primary">Setting URL LLM</h2>
            <p className="mt-1 text-sm leading-relaxed text-secondary">Atur proxy OpenAI-compatible, API key opsional, dan model yang dipakai generator.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-input border border-border bg-surface text-secondary transition hover:border-accent/35 hover:text-primary active:scale-[0.98]"
            aria-label="Tutup setting"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-secondary">Base URL</span>
            <input
              className="min-h-11 w-full rounded-input border border-border bg-surface-alt px-3 py-2 text-sm text-primary placeholder:text-muted transition focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
              value={settings.baseUrl}
              onChange={(e) => update('baseUrl', e.target.value)}
              placeholder="http://100.106.72.4:20128/v1"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-secondary">API Key <span className="font-normal text-muted">(opsional)</span></span>
            <input
              className="min-h-11 w-full rounded-input border border-border bg-surface-alt px-3 py-2 text-sm text-primary placeholder:text-muted transition focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
              value={settings.apiKey}
              onChange={(e) => update('apiKey', e.target.value)}
              placeholder="sk-..."
              type="password"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-secondary">Model</span>
            <input
              className="min-h-11 w-full rounded-input border border-border bg-surface-alt px-3 py-2 text-sm text-primary placeholder:text-muted transition focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
              value={settings.model}
              onChange={(e) => update('model', e.target.value)}
               placeholder="ollama/minimax-m2.5"
            />
          </label>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              disabled={testing}
              onClick={testConnection}
              className="rounded-input border border-border bg-surface-alt px-4 py-2 text-xs font-semibold text-primary transition hover:-translate-y-0.5 hover:border-accent/35 disabled:cursor-wait disabled:opacity-40"
            >
              {testing ? 'Testing...' : 'Test connection'}
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-input bg-accent px-4 py-2 text-xs font-semibold text-accent-text shadow-card transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-[0.98]"
            >
              Save
            </button>
          </div>

          {testResult && (
            <div className={`rounded-input border p-3 text-xs font-medium ${testResult.ok ? 'border-pastel-green bg-pastel-green text-pastel-green-text' : 'border-pastel-red bg-pastel-red text-pastel-red-text'}`}>
              {testResult.ok
                ? `Connected - ${testResult.latency}ms`
                : `Failed - ${testResult.error || (testResult.status ? `HTTP ${testResult.status}` : 'Connection error')} (${testResult.latency}ms)`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
