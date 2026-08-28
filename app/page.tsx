'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Gavel,
  CheckCircle2,
  PieChart,
  Activity,
  Lock,
  Cpu,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-16 py-4">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 glass-panel border-accent-cyan/30 text-center space-y-6">
        {/* Ambient background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan font-mono text-xs tracking-wide">
          <Sparkles className="w-3.5 h-3.5" /> CSI ORIGIN 2026 • Problem Statement 10
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight text-white">
          Choose the solver most likely to fulfil safely —{' '}
          <span className="bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple bg-clip-text text-transparent">
            right now.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          IntentMesh is a decentralized cross-chain intent infrastructure. Signed user outcomes are matched against competing solvers through multi-factor deterministic scoring, capital-aware capacity accounting, adaptive verifiers, and automated fallback auction loops.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/create"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-glow-cyan flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" /> Express Swap Intent <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/auction"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-100 font-semibold text-sm border border-border transition-all flex items-center justify-center gap-2"
          >
            <Gavel className="w-4 h-4 text-accent-cyan" /> View Live Solver Auction
          </Link>
        </div>
      </div>

      {/* THREE CORE PILLARS / PROBLEM FRAMING */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel glass-panel-hover space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
            <Gavel className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Open Solver Competition</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Eliminates single-provider lock-in. Solvers broadcast quotes in real time with competitive outputs, ETA guarantees, and verifiable staked bonds.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel glass-panel-hover space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Deterministic Scoring ($Q_s$)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-200 font-semibold font-mono">"Deterministic scoring turns risk into an auditable decision."</span> Evaluates Value, Speed, Reliability, Headroom, and Security.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel glass-panel-hover space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-accent-purple">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Proof Controls Payment</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-200 font-semibold font-mono">"Payment depends on proof, never on a solver's claim."</span> Escrow funds release only upon destination verification checklist completion.
          </p>
        </div>
      </div>

      {/* FEATURE DEMO BENCHMARK HIGHLIGHT */}
      <div className="p-8 rounded-3xl glass-panel space-y-8 border-border/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Interactive Live Protocol Capabilities</h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore working end-to-end logic backed by our in-process EVM contract simulation engine.
            </p>
          </div>
          <Link
            href="/create"
            className="text-xs font-mono text-accent-cyan hover:underline flex items-center gap-1"
          >
            Test Live App <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/auction" className="p-5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-border transition-all space-y-2 group">
            <div className="flex items-center justify-between font-bold text-sm text-white group-hover:text-accent-cyan">
              <span>1. Live Auction</span>
              <Gavel className="w-4 h-4 text-accent-cyan" />
            </div>
            <p className="text-xs text-slate-400">
              Solvers A, B, and C submit live quotes evaluated against 6 pass/fail eligibility gates.
            </p>
          </Link>

          <Link href="/settlement" className="p-5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-border transition-all space-y-2 group">
            <div className="flex items-center justify-between font-bold text-sm text-white group-hover:text-emerald-400">
              <span>2. Forced Failure Controls</span>
              <RefreshCcw className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">
              Inject timeout, partial fill, or replay proof to test automated slashing & fallback re-routing.
            </p>
          </Link>

          <Link href="/capacity" className="p-5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-border transition-all space-y-2 group">
            <div className="flex items-center justify-between font-bold text-sm text-white group-hover:text-amber-400">
              <span>3. Capacity Accounting</span>
              <PieChart className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400">
              Per-solver declared, reserved, and pending exposure with atomic overcommit rejection.
            </p>
          </Link>

          <Link href="/admin" className="p-5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-border transition-all space-y-2 group">
            <div className="flex items-center justify-between font-bold text-sm text-white group-hover:text-accent-purple">
              <span>4. Admin Parameter Tuning</span>
              <Cpu className="w-4 h-4 text-accent-purple" />
            </div>
            <p className="text-xs text-slate-400">
              Tune $Q_s$ scoring weights live and watch scores recompute immediately across all active intents.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
