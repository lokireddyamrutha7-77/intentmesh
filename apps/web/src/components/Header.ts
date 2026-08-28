import { HealthStatus } from "../types";
import { connectWallet, disconnectWallet, getWalletState, switchNetwork } from "../services/walletService";

export function renderHeader(currentRoute: string, health: HealthStatus | null): string {
  const isSourceOk = health?.anvilNodes?.sourceConnected ?? true;
  const isDestOk = health?.anvilNodes?.destinationConnected ?? true;
  const wallet = getWalletState();

  const navItems = [
    { route: "execute", label: "Execute", icon: "⚡" },
    { route: "activity", label: "Activity", icon: "📜" },
    { route: "auctions", label: "Auctions", icon: "🏷️" },
    { route: "solvers", label: "Solvers", icon: "🤖" },
    { route: "risk", label: "Risk", icon: "🛡️" },
    { route: "executions", label: "Verification", icon: "🔎" },
    { route: "simulator", label: "Simulate", icon: "🚀" },
  ];

  const truncatedAddr = wallet.account
    ? `${wallet.account.substring(0, 6)}...${wallet.account.substring(wallet.account.length - 4)}`
    : "";

  return `
    <header class="glass-header">
      <div class="brand-logo" onclick="window.navigateTo('execute')">
        <div class="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-name">IntentMesh</span>
          <span class="brand-tagline">Cross-Chain Intent Terminal</span>
        </div>
      </div>

      <nav class="nav-menu">
        ${navItems
          .map(
            (item) => `
          <button 
            class="nav-link ${currentRoute === item.route ? "active" : ""}" 
            onclick="window.navigateTo('${item.route}')">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `
          )
          .join("")}
      </nav>

      <div class="header-right">
        <div class="network-pill" title="Source Chain Anvil Status">
          <span class="status-dot ${isSourceOk ? "pulse" : ""}" style="background: ${isSourceOk ? "var(--accent-emerald)" : "var(--accent-rose)"}"></span>
          <span>Source: <strong>31337</strong></span>
        </div>

        <div class="network-pill" title="Destination Chain Anvil Status">
          <span class="status-dot ${isDestOk ? "pulse" : ""}" style="background: ${isDestOk ? "var(--accent-emerald)" : "var(--accent-rose)"}"></span>
          <span>Dest: <strong>31338</strong></span>
        </div>

        ${
          wallet.isConnected
            ? `
          <div style="display: flex; align-items: center; gap: 6px;">
            ${
              wallet.isWrongNetwork
                ? `<button class="wallet-btn" style="border-color: var(--accent-rose); color: var(--accent-rose);" onclick="window.handleSwitchNetwork(31337)" title="Click to switch to Source Chain 31337">⚠️ Switch to 31337</button>`
                : ""
            }
            <button class="wallet-btn" onclick="window.handleDisconnectWallet()" title="Click to disconnect wallet">
              <span class="status-dot" style="background: var(--accent-emerald);"></span>
              <span>${truncatedAddr}</span>
            </button>
          </div>
        `
            : `
          <button class="wallet-btn" style="border-color: var(--accent-indigo); background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));" onclick="window.handleConnectWallet()">
            <span>👛 Connect Wallet</span>
          </button>
        `
        }

        <button class="drawer-toggle-btn" onclick="window.toggleEventDrawer()" title="Open Live Protocol Event Feed">
          <span>📡</span>
          <span>Events</span>
        </button>
      </div>
    </header>
  `;
}
