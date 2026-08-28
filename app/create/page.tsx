'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ShieldCheck, ArrowRightLeft, Clock, Zap, Check, Lock } from 'lucide-react';

export default function CreateIntentPage() {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(true);
  const [walletAddress, setWalletAddress] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

  const [sourceChain, setSourceChain] = useState('Ethereum');
  const [destChain, setDestChain] = useState('Arbitrum');
  const [sourceAsset, setSourceAsset] = useState('ETH');
  const [destAsset, setDestAsset] = useState('USDC');
  const [sourceAmount, setSourceAmount] = useState('1.0');
  const [minDestAmount, setMinDestAmount] = useState('1000');
  const [deadlineMinutes, setDeadlineMinutes] = useState('60');

  const [verifierClass, setVerifierClass] = useState<'routine' | 'elevated' | 'strict'>('elevated');
  const [confirmations, setConfirmations] = useState('12');
  const [challengeRule, setChallengeRule] = useState('Standard 7-day challenge period with optimistic RPC reconciliation');

  const [isSigning, setIsSigning] = useState(false);
  const [signedPayload, setSignedPayload] = useState<string | null>(null);

  const handleConnectWallet = () => {
    setWalletConnected(true);
    setWalletAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  };

  const handleSignAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);

    try {
      const res = await fetch('/api/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: walletAddress,
          sourceChain,
          destChain,
          sourceAsset,
          destAsset,
          sourceAmount: parseFloat(sourceAmount),
          minDestAmount: parseFloat(minDestAmount),
          deadlineOffset: parseInt(deadlineMinutes) * 60,
          recipient: walletAddress,
          verifierClass,
          requiredConfirmations: parseInt(confirmations),
          challengeRule,
          maxSettlementDelay: 60,
        }),
      });

      const data = await res.json();
      if (data.success && data.intent) {
        setSignedPayload(data.intent.signature);
        setTimeout(() => {
          router.push(`/auction/${data.intent.id}`);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to create intent', err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border-accent-cyan/20">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-accent-cyan" />
            Express Your Swap Intent
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Specify your desired cross-chain outcome. Solvers will compete live to fulfill it under your signed security policy.
          </p>
        </div>

        {/* Mock Wallet Connector */}
        <div className="flex items-center gap-3">
          {walletConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 border border-accent-cyan/40 text-xs font-mono text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-blue text-slate-950 font-semibold text-xs hover:opacity-90 transition-all shadow-glow-cyan"
            >
              <Wallet className="w-4 h-4" />
              Connect Mock Wallet
            </button>
          )}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSignAndSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Swap Panel */}
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-cyan flex items-center gap-2">
              <Lock className="w-4 h-4" /> Source Escrow Lock
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Source Chain</label>
                <select
                  value={sourceChain}
                  onChange={(e) => setSourceChain(e.target.value)}
                  className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none"
                >
                  <option value="Ethereum">Ethereum Mainnet</option>
                  <option value="Arbitrum">Arbitrum One</option>
                  <option value="Optimism">Optimism Mainnet</option>
                  <option value="Polygon">Polygon POS</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Source Asset</label>
                  <select
                    value={sourceAsset}
                    onChange={(e) => setSourceAsset(e.target.value)}
                    className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none"
                  >
                    <option value="ETH">ETH</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="WBTC">WBTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Source Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sourceAmount}
                    onChange={(e) => setSourceAmount(e.target.value)}
                    className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Destination Swap Panel */}
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-blue flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Destination Fulfilment Policy
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Destination Chain</label>
                <select
                  value={destChain}
                  onChange={(e) => setDestChain(e.target.value)}
                  className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none"
                >
                  <option value="Arbitrum">Arbitrum One</option>
                  <option value="Optimism">Optimism Mainnet</option>
                  <option value="Ethereum">Ethereum Mainnet</option>
                  <option value="Base">Base Mainnet</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Destination Asset</label>
                  <select
                    value={destAsset}
                    onChange={(e) => setDestAsset(e.target.value)}
                    className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Minimum Output Required</label>
                  <input
                    type="number"
                    step="1"
                    value={minDestAmount}
                    onChange={(e) => setMinDestAmount(e.target.value)}
                    className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none font-mono text-emerald-400 font-semibold"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verifier & Security Policy */}
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-purple" /> Signed Verifier Policy (Adaptive Security)
            </h2>
            <span className="text-xs text-slate-400">Proof controls payment, never solver claims</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setVerifierClass('routine')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                verifierClass === 'routine'
                  ? 'bg-surface-100 border-accent-cyan text-white shadow-glow-cyan/20'
                  : 'bg-surface-50/50 border-border text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-sm mb-1">
                <span>Routine</span>
                {verifierClass === 'routine' && <Check className="w-4 h-4 text-accent-cyan" />}
              </div>
              <p className="text-xs text-slate-400">Fastest settlement. Standard on-chain destination event log receipt.</p>
            </div>

            <div
              onClick={() => setVerifierClass('elevated')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                verifierClass === 'elevated'
                  ? 'bg-surface-100 border-accent-cyan text-white shadow-glow-cyan/20'
                  : 'bg-surface-50/50 border-border text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-sm mb-1">
                <span>Elevated (Recommended)</span>
                {verifierClass === 'elevated' && <Check className="w-4 h-4 text-accent-cyan" />}
              </div>
              <p className="text-xs text-slate-400">Dual RPC state reconciliation + 12 block confirmations.</p>
            </div>

            <div
              onClick={() => setVerifierClass('strict')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                verifierClass === 'strict'
                  ? 'bg-surface-100 border-accent-cyan text-white shadow-glow-cyan/20'
                  : 'bg-surface-50/50 border-border text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-sm mb-1">
                <span>Strict</span>
                {verifierClass === 'strict' && <Check className="w-4 h-4 text-accent-cyan" />}
              </div>
              <p className="text-xs text-slate-400">Institutional proof validation + automatic circuit breaker on reorg.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Deadline Window (Minutes)
              </label>
              <input
                type="number"
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(e.target.value)}
                className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Challenge & Settlement Rule</label>
              <input
                type="text"
                value={challengeRule}
                onChange={(e) => setChallengeRule(e.target.value)}
                className="w-full bg-surface-50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-slate-400 font-mono">
            {signedPayload ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Intent Payload Signed: {signedPayload.substring(0, 18)}...
              </span>
            ) : (
              <span>Signing with Mock Wallet EIP-712 Typed Data</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSigning || !walletConnected}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-glow-cyan disabled:opacity-50"
          >
            {isSigning ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                Signing Intent...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Sign & Broadcast Intent
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
