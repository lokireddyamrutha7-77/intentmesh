'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, ShieldAlert, CheckCircle2, AlertOctagon, RefreshCw, Zap, Layers, ArrowUpRight } from 'lucide-react';
import { Solver, ProtocolEvent } from '@/lib/types';

export default function CapacityDashboardPage() {
  const [solvers, setSolvers] = useState<Solver[]>([]);
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingOvercommit, setTestingOvercommit] = useState(false);
  const [overcommitResult, setOvercommitResult] = useState<any>(null);

  const fetchCapacityData = async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.success) {
        setSolvers(data.solvers || []);
      }

      const evtRes = await fetch('/api/events');
      const evtData = await evtRes.json();
      if (evtData.success) {
        setEvents(evtData.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacityData();
    const interval = setInterval(fetchCapacityData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTestOvercommit = async (solverId: string, chainAsset: string) => {
    setTestingOvercommit(true);
    setOvercommitResult(null);
    try {
      const res = await fetch('/api/capacity/overcommit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solverId, chainAsset, amount: 9999999 }),
      });
      const data = await res.json();
      setOvercommitResult(data);
      fetchCapacityData();
    } catch (e) {
      console.error(e);
    } finally {
      setTestingOvercommit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-mono text-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-accent-cyan" />
          Loading Capital & Capacity Accounting Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border-accent-cyan/30">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-accent-cyan" />
            Solver Capacity & Liquidity Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Exact capacity accounting: <span className="font-mono text-slate-200">available = declaredLiquidity − activeReservations − pendingSettlementExposure</span>
          </p>
        </div>

        <button
          onClick={() => handleTestOvercommit('solver_a', 'arbitrum-usdc')}
          disabled={testingOvercommit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-extrabold text-xs hover:opacity-90 transition-all shadow-glow-rose disabled:opacity-50"
        >
          <AlertOctagon className="w-4 h-4 fill-slate-950" />
          {testingOvercommit ? 'Testing...' : 'Test Overcommit Rejection'}
        </button>
      </div>

      {/* Overcommit Rejection Demo Result Toast */}
      {overcommitResult && (
        <div className="p-6 rounded-2xl glass-panel border-rose-500/50 bg-rose-950/20 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              {overcommitResult.success ? 'Reservation Succeeded' : 'OVERCOMMIT REJECTED BY SERVER ENGINE'}
            </div>
            <span className="text-xs font-mono bg-rose-900/40 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              CapacityOvercommitRejected Event Emitted
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            {overcommitResult.reason || 'Attempted to reserve 9,999,999 USDC exceeding solver available liquidity!'}
          </p>
        </div>
      )}

      {/* Solver Liquidity Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {solvers.map((solver) => (
          <div key={solver.id} className="p-6 rounded-2xl glass-panel space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">{solver.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-surface-100 border border-border font-mono text-xs text-slate-300">
                    Bond: ${solver.bondAmount.toLocaleString()} USD
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Address: {solver.address} • Reliability Score: <span className="text-accent-cyan font-bold">{solver.reliabilityScore}%</span>
                </div>
              </div>

              <button
                onClick={() => handleTestOvercommit(solver.id, 'arbitrum-usdc')}
                className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-rose-950/30 border border-border hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-mono transition-all self-start sm:self-auto"
              >
                Overcommit Test ({solver.name})
              </button>
            </div>

            {/* Chain-Asset Capacity Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(solver.capacityByChainAsset).map(([key, cap]) => {
                const availablePct = Math.round((cap.available / (cap.declared || 1)) * 100);
                const reservedPct = Math.round((cap.reserved / (cap.declared || 1)) * 100);
                const pendingPct = Math.round((cap.pending / (cap.declared || 1)) * 100);

                return (
                  <div key={key} className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase font-bold text-accent-cyan">{key}</span>
                      <span className="text-[11px] font-mono text-slate-400">{availablePct}% Available</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-200 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-400 h-full"
                        style={{ width: `${availablePct}%` }}
                        title={`Available: ${cap.available}`}
                      ></div>
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${reservedPct}%` }}
                        title={`Reserved: ${cap.reserved}`}
                      ></div>
                      <div
                        className="bg-purple-400 h-full"
                        style={{ width: `${pendingPct}%` }}
                        title={`Pending: ${cap.pending}`}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Declared</span>
                        <span className="text-slate-200 font-semibold">{cap.declared.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Available</span>
                        <span className="text-emerald-400 font-bold">{cap.available.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Active Reserved</span>
                        <span className="text-amber-400">{cap.reserved.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Pending Settlement</span>
                        <span className="text-purple-400">{cap.pending.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Protocol Capacity Event Stream */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-cyan" /> Capacity & Reservation Event Audit Feed
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
          {events
            .filter((e) => e.topic === 'CapacityReserved' || e.topic === 'CapacityOvercommitRejected')
            .map((evt) => (
              <div
                key={evt.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  evt.topic === 'CapacityOvercommitRejected'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-surface-50 border-border/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      evt.topic === 'CapacityOvercommitRejected'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {evt.topic}
                  </span>
                  <span className="text-slate-400 text-[11px]">{evt.txHash.substring(0, 14)}...</span>
                </div>
                <div className="text-xs truncate max-w-md">{JSON.stringify(evt.details)}</div>
                <span className="text-slate-500 text-[10px]">Block #{evt.blockNumber}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
