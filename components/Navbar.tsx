'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Layers,
  PlusCircle,
  Gavel,
  CheckCircle2,
  PieChart,
  Activity,
  Settings,
  Cpu,
  RotateCcw,
  Zap,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { label: 'Overview', href: '/', icon: Layers },
    { label: 'Create Intent', href: '/create', icon: PlusCircle },
    { label: 'Live Auction', href: '/auction', icon: Gavel },
    { label: 'Settlement Tracker', href: '/settlement', icon: CheckCircle2 },
    { label: 'Capacity & Capital', href: '/capacity', icon: PieChart },
    { label: 'Event Log', href: '/events', icon: Activity },
    { label: 'Architecture', href: '/architecture', icon: Cpu },
    { label: 'Admin', href: '/admin', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[#090d16]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-cyan via-accent-blue to-accent-purple p-0.5 shadow-glow-cyan">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent-cyan group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-accent-cyan bg-clip-text text-transparent">
                IntentMesh
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                CSI ORIGIN 2026 #10
              </span>
            </div>
          </Link>

          {/* Navigation items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-surface-100 text-accent-cyan border border-accent-cyan/30 shadow-glow-cyan/20'
                      : 'text-slate-400 hover:text-white hover:bg-surface-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Simulation Active
            </div>

            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 hover:text-white text-xs font-medium border border-border transition-all"
              title="Reset simulation fixtures"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Demo
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-border gap-2 bg-surface-50/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                isActive
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                  : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
