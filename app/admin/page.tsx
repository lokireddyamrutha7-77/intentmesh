'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Sliders, RotateCcw, Save, Check, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { ScoringWeights, Solver } from '@/lib/types';

export default function AdminPage() {
  const [weights, setWeights] = useState<ScoringWeights>({
    value: 0.30,
    speed: 0.15,
    reliability: 0.15,
    headroom: 0.20,
    security: 0.20,
    riskPenalty: 0.10,
  });

  const [solvers, setSolvers] = useState<Solver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchAdminConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.success) {
        if (data.config?.weights) setWeights(data.config.weights);
        if (data.solvers) setSolvers(data.solvers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights, solvers }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
      await fetchAdminConfig();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-mono text-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-accent-cyan" />
          Loading Admin Config Panel...
        </div>
      </div>
    );
  }

  const weightTotal = (
    weights.value +
    weights.speed +
    weights.reliability +
    weights.headroom +
    weights.security
  ).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border-accent-cyan/30">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-accent-cyan" />
            Admin Protocol Controls & Weight Tuning
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tune scoring formula sub-score weights and solver fixtures in real time. Changes take effect immediately on active auctions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-xs font-semibold text-slate-200 border border-border transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Fixtures
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-blue text-slate-950 font-bold text-xs hover:opacity-90 transition-all shadow-glow-cyan disabled:opacity-50"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-950" /> : <Save className="w-4 h-4" />}
            {savedSuccess ? 'Saved Live!' : saving ? 'Saving...' : 'Save & Recompute Scores'}
          </button>
        </div>
      </div>

      {/* Scoring Formula Weight Tuning */}
      <div className="p-6 rounded-2xl glass-panel space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-accent-cyan" /> Multi-Factor Quality Score ($Q_s$) Weight Controls
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Qs = (w1 · Value) + (w2 · Speed) + (w3 · Reliability) + (w4 · Headroom) + (w5 · Security) − (w6 · RiskPenalty)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-surface-50 px-3 py-1 rounded-full border border-border">
            Total Positive Weights: <span className="text-accent-cyan font-bold">{weightTotal}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Value Weight */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">Value Weight (w1)</span>
              <span className="font-mono text-accent-cyan">{(weights.value * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.6"
              step="0.05"
              value={weights.value}
              onChange={(e) => setWeights({ ...weights, value: parseFloat(e.target.value) })}
              className="w-full accent-accent-cyan cursor-pointer"
            />
          </div>

          {/* Speed Weight */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">Speed Weight (w2)</span>
              <span className="font-mono text-accent-blue">{(weights.speed * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={weights.speed}
              onChange={(e) => setWeights({ ...weights, speed: parseFloat(e.target.value) })}
              className="w-full accent-accent-blue cursor-pointer"
            />
          </div>

          {/* Reliability Weight */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">Reliability Weight (w3)</span>
              <span className="font-mono text-amber-400">{(weights.reliability * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={weights.reliability}
              onChange={(e) => setWeights({ ...weights, reliability: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Headroom Weight */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">Headroom Weight (w4)</span>
              <span className="font-mono text-accent-purple">{(weights.headroom * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={weights.headroom}
              onChange={(e) => setWeights({ ...weights, headroom: parseFloat(e.target.value) })}
              className="w-full accent-accent-purple cursor-pointer"
            />
          </div>

          {/* Security Weight */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">Security Weight (w5)</span>
              <span className="font-mono text-emerald-400">{(weights.security * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={weights.security}
              onChange={(e) => setWeights({ ...weights, security: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Risk Penalty Weight */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">Risk Penalty Deduct (w6)</span>
              <span className="font-mono text-rose-400">-{(weights.riskPenalty * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.3"
              step="0.05"
              value={weights.riskPenalty}
              onChange={(e) => setWeights({ ...weights, riskPenalty: parseFloat(e.target.value) })}
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Solver Reliability & Bond Fixture Controls */}
      <div className="p-6 rounded-2xl glass-panel space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-border/80 pb-4">
          <ShieldCheck className="w-5 h-5 text-accent-purple" /> Solver Reliability & Bond Fixture Editor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {solvers.map((solver, idx) => (
            <div key={solver.id} className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
              <div className="font-bold text-sm text-white">{solver.name}</div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Reliability Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={solver.reliabilityScore}
                    onChange={(e) => {
                      const updated = [...solvers];
                      updated[idx].reliabilityScore = parseInt(e.target.value) || 0;
                      setSolvers(updated);
                    }}
                    className="w-full bg-surface-100 border border-border rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Bond Amount ($ USD)</label>
                  <input
                    type="number"
                    step="1000"
                    value={solver.bondAmount}
                    onChange={(e) => {
                      const updated = [...solvers];
                      updated[idx].bondAmount = parseInt(e.target.value) || 0;
                      setSolvers(updated);
                    }}
                    className="w-full bg-surface-100 border border-border rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
