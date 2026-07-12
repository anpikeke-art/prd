import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ScrollRevealObserver } from '@/components/scroll-reveal';
import './globals.css';

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PRD Studio',
  description: 'Dari ide ke PRD terstruktur + task tree sinkron real-time.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <ThemeProvider>
          <ScrollRevealObserver />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
