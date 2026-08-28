import { HealthStatus } from "../types";

export function renderHeader(health: HealthStatus | null): string {
  const isSourceOk = health?.anvilNodes?.sourceConnected ?? false;
  const isDestOk = health?.anvilNodes?.destinationConnected ?? false;

  return `
    <header class="header">
      <div style="font-weight: 600; font-size: 15px; color: var(--text-muted);">
        Off-Chain Protocol Orchestrator
      </div>
      <div class="header-status">
        <div class="status-pill">
          <span class="indicator-dot" style="background-color: ${isSourceOk ? "var(--status-success)" : "var(--status-danger)"}"></span>
          <span>Source Chain: <strong>31337</strong></span>
        </div>
        <div class="status-pill">
          <span class="indicator-dot" style="background-color: ${isDestOk ? "var(--status-success)" : "var(--status-danger)"}"></span>
          <span>Destination Chain: <strong>31338</strong></span>
        </div>
        <div class="status-pill" style="border-color: var(--accent-primary);">
          <span style="color: var(--accent-cyan); font-weight: 600;">Status: ONLINE</span>
        </div>
      </div>
    </header>
  `;
}
