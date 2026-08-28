'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Gavel,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RefreshCw,
  Info,
  Clock,
  Layers,
  Zap,
} from 'lucide-react';
import { Intent, Bid, Solver, ProtocolEvent } from '@/lib/types';

export default function LiveAuctionPage() {
  const params = useParams();
  const intentId = (params?.id as string) || 'intent_demo_1001';

  const [intent, setIntent] = useState<Intent | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [solvers, setSolvers] = useState<Solver[]>([]);
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSolverId, setExpandedSolverId] = useState<string | null>(null);

  const fetchAuctionData = async () => {
    try {
      const res = await fetch(`/api/intents/${intentId}`);
      const data = await res.json();
      if (data.success) {
        setIntent(data.intent);
        setBids(data.bids || []);
        setSolvers(data.solvers || []);
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to load auction', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctionData();
    const interval = setInterval(fetchAuctionData, 3000);
    return () => clearInterval(interval);
  }, [intentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-mono text-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-accent-cyan" />
          Connecting to Live Solver Auction Mesh...
        </div>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-slate-200">Intent Not Found</h2>
        <Link href="/create" className="text-accent-cyan underline text-sm">
          Create a new intent
        </Link>
      </div>
    );
  }

  // Find winning bid & fallback bid
  const sortedBids = [...bids].sort((a, b) => (b.score?.qs || 0) - (a.score?.qs || 0));
  const winningBid = sortedBids.find((b) => b.gates?.passed);
  const runnerUpBid = sortedBids.filter((b) => b.gates?.passed && b.solverId !== winningBid?.solverId)[0];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border-accent-cyan/30">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gavel className="w-6 h-6 text-accent-cyan" />
              Live Solver Auction & Competition
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan uppercase">
              {intent.status}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Intent ID: <span className="font-mono text-slate-200">{intent.id}</span> • Swapping{' '}
            <span className="text-white font-semibold">{intent.sourceAmount} {intent.sourceAsset}</span> on {intent.sourceChain} for min{' '}
            <span className="text-emerald-400 font-semibold">{intent.minDestAmount} {intent.destAsset}</span> on {intent.destChain}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAuctionData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-xs font-medium border border-border text-slate-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Bids
          </button>

          <Link
            href={`/settlement/${intent.id}`}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-blue text-slate-950 font-bold text-xs hover:opacity-90 transition-all shadow-glow-cyan"
          >
            Settlement Tracker <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Solver Competition Leaderboard Table */}
      <div className="p-6 rounded-2xl glass-panel space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Solver Bids & Quality Score Scoreboard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic Qs Formula: 0.30 Value + 0.15 Speed + 0.15 Reliability + 0.20 Headroom + 0.20 Security − 0.10 RiskPenalty
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-surface-50 px-3 py-1 rounded-full border border-border">
            {bids.length} Active Solvers Competing
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-surface-50 text-xs uppercase font-mono text-slate-400 border-b border-border">
              <tr>
                <th className="py-3 px-4">Status / Rank</th>
                <th className="py-3 px-4">Solver Bot</th>
                <th className="py-3 px-4">Output Amount</th>
                <th className="py-3 px-4">ETA (Speed)</th>
                <th className="py-3 px-4">Reliability</th>
                <th className="py-3 px-4">Gates Passed</th>
                <th className="py-3 px-4 text-right">Quality Score ($Q_s$)</th>
                <th className="py-3 px-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sortedBids.map((bid, index) => {
                const solver = solvers.find((s) => s.id === bid.solverId);
                const isWinner = bid.solverId === winningBid?.solverId;
                const isRunnerUp = bid.solverId === runnerUpBid?.solverId;
                const isExpanded = expandedSolverId === bid.solverId;

                const chainAssetKey = `${intent.destChain.toLowerCase()}-${intent.destAsset.toLowerCase()}`;
                const cap = solver?.capacityByChainAsset[chainAssetKey] || { available: 0 };

                return (
                  <React.Fragment key={bid.solverId}>
                    <tr
                      className={`hover:bg-surface-100/50 transition-colors ${
                        isWinner ? 'bg-accent-cyan/5' : ''
                      }`}
                    >
                      {/* Rank & Badge */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">#{index + 1}</span>
                          {isWinner && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold shadow-glow-emerald">
                              WIN
                            </span>
                          )}
                          {isRunnerUp && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[11px] font-bold">
                              NEXT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Solver Bot Name & Address */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-white">{bid.solverName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {solver?.address.substring(0, 6)}...{solver?.address.substring(38)}
                          </div>
                        </div>
                      </td>

                      {/* Output Amount */}
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-base">
                        {bid.outputAmount.toLocaleString()} {intent.destAsset}
                      </td>

                      {/* ETA */}
                      <td className="py-4 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                          {bid.etaSeconds}s
                        </div>
                      </td>

                      {/* Reliability */}
                      <td className="py-4 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-surface-50 rounded-full h-1.5 border border-border overflow-hidden">
                            <div
                              className="bg-accent-cyan h-full rounded-full"
                              style={{ width: `${solver?.reliabilityScore || 90}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-200">{solver?.reliabilityScore}%</span>
                        </div>
                      </td>

                      {/* Eligibility Gates */}
                      <td className="py-4 px-4">
                        {bid.gates?.passed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 6 / 6 Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> Gate Failed
                          </span>
                        )}
                      </td>

                      {/* Score Qs */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-mono text-lg font-extrabold text-white">
                          {bid.score?.qs.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Normalized 0-100</div>
                      </td>

                      {/* Expand Audit button */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setExpandedSolverId(isExpanded ? null : bid.solverId)}
                          className="p-1.5 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 transition-colors border border-border"
                          title="View detailed factor breakdown"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Audit Log & Factor Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="bg-surface-50/60 border-b border-border">
                        <td colSpan={8} className="p-6 space-y-6">
                          {/* Eligibility Gates Details */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-accent-cyan" /> 6-Gate Pass/Fail Eligibility Breakdown
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {Object.entries(bid.gates?.gates || {}).map(([key, gate]) => (
                                <div
                                  key={key}
                                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                                    gate.pass
                                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-mono font-bold">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    {gate.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-snug">{gate.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Raw Inputs vs Normalized Factor Breakdown Table */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-accent-blue" /> Multi-Factor $Q_s$ Sub-Score Factor Breakdown
                            </h4>

                            <div className="overflow-x-auto rounded-xl border border-border bg-[#090d16]/70">
                              <table className="w-full text-xs font-mono">
                                <thead className="bg-surface-100 text-slate-400 border-b border-border">
                                  <tr>
                                    <th className="py-2 px-3">Factor</th>
                                    <th className="py-2 px-3">Weight</th>
                                    <th className="py-2 px-3">Raw Input</th>
                                    <th className="py-2 px-3">Normalized (0-100)</th>
                                    <th className="py-2 px-3 text-right">Weighted Score</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-slate-200">
                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-accent-cyan">Value</td>
                                    <td className="py-2 px-3 text-slate-400">30%</td>
                                    <td className="py-2 px-3">{bid.score?.raw.value} {intent.destAsset}</td>
                                    <td className="py-2 px-3">{bid.score?.normalized.value} / 100</td>
                                    <td className="py-2 px-3 text-right font-bold text-white">
                                      {((bid.score?.normalized.value || 0) * 0.30).toFixed(2)}
                                    </td>
                                  </tr>

                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-accent-blue">Speed (ETA)</td>
                                    <td className="py-2 px-3 text-slate-400">15%</td>
                                    <td className="py-2 px-3">{bid.score?.raw.speed} seconds</td>
                                    <td className="py-2 px-3">{bid.score?.normalized.speed} / 100</td>
                                    <td className="py-2 px-3 text-right font-bold text-white">
                                      {((bid.score?.normalized.speed || 0) * 0.15).toFixed(2)}
                                    </td>
                                  </tr>

                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-amber-400">Reliability</td>
                                    <td className="py-2 px-3 text-slate-400">15%</td>
                                    <td className="py-2 px-3">{bid.score?.raw.reliability}% score</td>
                                    <td className="py-2 px-3">{bid.score?.normalized.reliability} / 100</td>
                                    <td className="py-2 px-3 text-right font-bold text-white">
                                      {((bid.score?.normalized.reliability || 0) * 0.15).toFixed(2)}
                                    </td>
                                  </tr>

                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-accent-purple">Headroom (Capacity)</td>
                                    <td className="py-2 px-3 text-slate-400">20%</td>
                                    <td className="py-2 px-3">{cap.available.toLocaleString()} {intent.destAsset} ({bid.score?.raw.headroom.toFixed(1)}x fill)</td>
                                    <td className="py-2 px-3">{bid.score?.normalized.headroom} / 100</td>
                                    <td className="py-2 px-3 text-right font-bold text-white">
                                      {((bid.score?.normalized.headroom || 0) * 0.20).toFixed(2)}
                                    </td>
                                  </tr>

                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-emerald-400">Security (Bond)</td>
                                    <td className="py-2 px-3 text-slate-400">20%</td>
                                    <td className="py-2 px-3">${bid.score?.raw.security.toLocaleString()} USD</td>
                                    <td className="py-2 px-3">{bid.score?.normalized.security} / 100</td>
                                    <td className="py-2 px-3 text-right font-bold text-white">
                                      {((bid.score?.normalized.security || 0) * 0.20).toFixed(2)}
                                    </td>
                                  </tr>

                                  <tr>
                                    <td className="py-2 px-3 font-semibold text-rose-400">Risk Penalty</td>
                                    <td className="py-2 px-3 text-slate-400">-10%</td>
                                    <td className="py-2 px-3">{bid.score?.raw.riskPenalty} active flags</td>
                                    <td className="py-2 px-3">-{bid.score?.normalized.riskPenalty} / 100</td>
                                    <td className="py-2 px-3 text-right font-bold text-rose-400">
                                      -{((bid.score?.normalized.riskPenalty || 0) * 0.10).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protocol Event Stream Log Snippet */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-cyan" /> On-Chain Simulation Event Feed for this Intent
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 font-mono text-xs">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-surface-50 border border-border/60 gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-bold">
                  {evt.topic}
                </span>
                <span className="text-slate-400 text-[11px]">{evt.txHash.substring(0, 14)}...</span>
              </div>
              <div className="text-slate-300 text-[11px] truncate max-w-md">
                {JSON.stringify(evt.details)}
              </div>
              <span className="text-slate-500 text-[10px]">Block #{evt.blockNumber}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
