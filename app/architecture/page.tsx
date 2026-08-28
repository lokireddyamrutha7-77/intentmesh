'use client';

import React from 'react';
import { Cpu, ShieldCheck, Lock, Layers, Zap, ArrowRight, Server, Database, Activity } from 'lucide-react';

export default function ArchitecturePage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl glass-panel border-accent-cyan/30 space-y-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-accent-cyan" />
          Protocol Architecture & On-Chain / Off-Chain Topology
        </h1>
        <p className="text-sm text-slate-400">
          How IntentMesh decouples intent discovery and competition from deterministic on-chain verification and escrow settlement.
        </p>
      </div>

      {/* Interactive Topology Diagram Component */}
      <div className="p-8 rounded-2xl glass-panel space-y-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 text-center border-b border-border/80 pb-4">
          System Component Topology Diagram
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
          {/* OFF-CHAIN EXECUTION MESH */}
          <div className="p-6 rounded-2xl bg-surface-50 border border-accent-cyan/40 space-y-4 shadow-glow-cyan/10">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <span className="font-bold text-sm text-accent-cyan flex items-center gap-2">
                <Server className="w-4 h-4" /> Off-Chain Solver & Indexer Mesh
              </span>
              <span className="text-[10px] font-mono bg-accent-cyan/10 text-accent-cyan px-2.5 py-0.5 rounded-full border border-accent-cyan/30">
                P2P / API Layer
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
                <span>Solver Bots (AlphaRelay, BoltSpeed, Citadel)</span>
                <Zap className="w-3.5 h-3.5 text-accent-cyan" />
              </div>

              <div className="p-3 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
                <span>Deterministic Quality Scorer ($Q_s$)</span>
                <Activity className="w-3.5 h-3.5 text-accent-blue" />
              </div>

              <div className="p-3 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
                <span>Real-Time WebSocket / SSE Broadcast Feed</span>
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
          </div>

          {/* ON-CHAIN CONTROL CONTRACTS */}
          <div className="p-6 rounded-2xl bg-surface-50 border border-accent-purple/40 space-y-4 shadow-glow-purple/10">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <span className="font-bold text-sm text-accent-purple flex items-center gap-2">
                <Lock className="w-4 h-4" /> On-Chain Control Contracts (Simulated EVM)
              </span>
              <span className="text-[10px] font-mono bg-accent-purple/10 text-accent-purple px-2.5 py-0.5 rounded-full border border-accent-purple/30">
                Trustless Settlement
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-surface-100 border border-border space-y-1">
                <div className="font-bold text-slate-200">IntentManager</div>
                <div className="text-[10px] text-slate-400">Order lifecycle state machine</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-100 border border-border space-y-1">
                <div className="font-bold text-slate-200">EscrowManager</div>
                <div className="text-[10px] text-slate-400">Source fund locking & release</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-100 border border-border space-y-1">
                <div className="font-bold text-slate-200">CapacityRegistry</div>
                <div className="text-[10px] text-slate-400">Atomic overcommit protection</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-100 border border-border space-y-1">
                <div className="font-bold text-slate-200">SettlementVerifier</div>
                <div className="text-[10px] text-slate-400">6-point proof verification</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-100 border border-border space-y-1 col-span-2">
                <div className="font-bold text-slate-200">BondManager & SolverRegistry</div>
                <div className="text-[10px] text-slate-400">Bond staking, reliability history, and slashing penalties</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Dive Pillar Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Open Solver Competition</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instead of routing through static bridges or centralized relayers, user signed intents are broadcast to a decentralized solver mesh. Independent bots compete live to offer maximum output and fastest fulfillment.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Deterministic Scoring ($Q_s$)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Selecting a solver is not just about price. IntentMesh evaluates Value, Speed, Historical Reliability, Headroom Capacity, and Staked Security to pick the solver most likely to fulfill safely right now.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-accent-purple">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Objective Fallback Loop</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            If a winning solver fails to fulfill before deadline, the protocol slashes their bond, releases reserved capacity, and automatically re-routes the order to the runner-up solver without user intervention.
          </p>
        </div>
      </div>
    </div>
  );
}
