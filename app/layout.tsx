import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'IntentMesh | Decentralized Intent Solvers for Cross-Chain Swaps',
  description:
    'CSI ORIGIN 2026 Problem Statement 10: Multi-factor deterministic scoring, capital-aware capacity accounting, adaptive verifiers, and automated fallback auction loops.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 bg-grid-pattern selection:bg-accent-cyan/30 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-border py-4 bg-[#060910] text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-400">IntentMesh</span> — CSI ORIGIN 2026 Hackathon (Problem Statement 10)
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent-cyan"></span>
              <span className="text-slate-400">Live Protocol Simulation Engine</span> (No real funds or chains used)
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
