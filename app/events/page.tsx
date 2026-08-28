'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Search, Filter, RefreshCw, Terminal, Copy, Check, Hash, Layers } from 'lucide-react';
import { ProtocolEvent, EventTopic } from '@/lib/types';

export default function EventLogPage() {
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<ProtocolEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  const topics: (EventTopic | 'ALL')[] = [
    'ALL',
    'IntentCreated',
    'BidsReceived',
    'GatesEvaluated',
    'SolverSelected',
    'CapacityReserved',
    'DestinationFilled',
    'VerificationPassed',
    'VerificationFailed',
    'SettlementReleased',
    'PenaltyApplied',
    'FallbackTriggered',
    'CapacityOvercommitRejected',
  ];

  const filteredEvents = selectedTopic === 'ALL'
    ? events
    : events.filter((e) => e.topic === selectedTopic);

  const handleCopyJson = (json: string, id: string) => {
    navigator.clipboard.writeText(json);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-mono text-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-accent-cyan" />
          Reading On-Chain Event Logs Stream...
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
            <Activity className="w-6 h-6 text-accent-cyan" />
            Protocol Event Feed & Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chronological visible evidence of every protocol state transition: wallet signatures, bid payloads, scores, capacity mutations, and contract events.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-xs font-semibold text-slate-200 border border-border transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Log Stream
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all ${
              selectedTopic === t
                ? 'bg-accent-cyan text-slate-950 font-bold shadow-glow-cyan/30'
                : 'bg-surface-50 hover:bg-surface-100 text-slate-400 border border-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Events Stream Table */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-4 text-xs text-slate-400 font-mono">
          <span>Showing {filteredEvents.length} Protocol Events</span>
          <span>Block Height: #{events[0]?.blockNumber || 18450120}</span>
        </div>

        <div className="space-y-3">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => setSelectedEvent(evt)}
              className="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 border border-border hover:border-accent-cyan/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      evt.topic.includes('Failed') || evt.topic.includes('Penalty') || evt.topic.includes('Rejected')
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : evt.topic.includes('Passed') || evt.topic.includes('Selected')
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    }`}
                  >
                    {evt.topic}
                  </span>
                  <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {evt.txHash.substring(0, 16)}...
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>Block #{evt.blockNumber}</span>
                  <span>{new Date(evt.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="font-mono text-xs text-slate-200 bg-[#090d16]/70 p-2.5 rounded-lg border border-border/50 truncate">
                {JSON.stringify(evt.details)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#090d16] border border-accent-cyan/40 rounded-2xl p-6 space-y-4 shadow-glow-cyan">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Terminal className="w-4 h-4 text-accent-cyan" />
                Raw Event Payload: <span className="font-mono text-accent-cyan">{selectedEvent.topic}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Transaction Hash: {selectedEvent.txHash}</span>
                <span>Block #{selectedEvent.blockNumber}</span>
              </div>

              <pre className="p-4 rounded-xl bg-surface-50 border border-border text-slate-200 overflow-x-auto text-xs font-mono max-h-80">
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handleCopyJson(JSON.stringify(selectedEvent, null, 2), selectedEvent.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-xs font-mono text-slate-200 border border-border transition-all"
              >
                {copiedId === selectedEvent.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === selectedEvent.id ? 'Copied!' : 'Copy JSON'}
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-accent-cyan text-slate-950 font-bold text-xs hover:opacity-90 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
