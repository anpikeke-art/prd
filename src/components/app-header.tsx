'use client';

import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LlmSettings } from '@/components/llm-settings';

export function AppHeader() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-card color-band text-sm font-black text-primary shadow-card">P</span>
            <span className="text-lg font-black leading-none tracking-tight text-primary">PRD Studio</span>
            <span className="rounded-full border border-border bg-surface/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-secondary">v0.1</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex size-9 items-center justify-center rounded-input border border-border bg-surface/80 text-secondary shadow-card transition hover:-translate-y-0.5 hover:border-accent/35 hover:text-primary active:scale-[0.98]"
              aria-label="LLM settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {showSettings && <LlmSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
