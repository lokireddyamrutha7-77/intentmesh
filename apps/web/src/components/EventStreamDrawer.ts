import { ProtocolEventLog } from "../types";

let drawerEvents: ProtocolEventLog[] = [];

export function setDrawerEvents(events: ProtocolEventLog[]) {
  drawerEvents = events;
}

export function pushDrawerEvent(event: ProtocolEventLog) {
  drawerEvents.unshift(event);
  if (drawerEvents.length > 50) {
    drawerEvents.pop();
  }
  updateDrawerDOM();
}

export function renderEventStreamDrawer(): string {
  return `
    <div id="event-drawer-panel" class="event-drawer">
      <div class="drawer-header">
        <div class="drawer-title">
          <span class="status-dot pulse" style="background: var(--accent-cyan);"></span>
          <span>Protocol Event Telemetry</span>
        </div>
        <button class="close-drawer-btn" onclick="window.toggleEventDrawer()">✕</button>
      </div>

      <div class="drawer-content" id="drawer-events-list">
        ${renderEventItems(drawerEvents)}
      </div>
    </div>
  `;
}

function renderEventItems(events: ProtocolEventLog[]): string {
  if (!events || events.length === 0) {
    return `<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">No real-time events streamed yet. Run a scenario or create an intent.</div>`;
  }

  return events
    .map(
      (ev) => `
    <div class="event-item">
      <div class="event-top">
        <span class="event-type-badge">${ev.type}</span>
        <span class="event-time">${new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
      </div>
      <div class="event-msg">${ev.message}</div>
      ${ev.intentHash ? `<div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">Hash: ${ev.intentHash.substring(0, 14)}...</div>` : ""}
    </div>
  `
    )
    .join("");
}

export function updateDrawerDOM() {
  const listEl = document.getElementById("drawer-events-list");
  if (listEl) {
    listEl.innerHTML = renderEventItems(drawerEvents);
  }
}
