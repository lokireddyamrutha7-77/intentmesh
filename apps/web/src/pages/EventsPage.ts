import { apiClient } from "../services/apiClient";
import { ProtocolEventLog } from "../types";

export async function renderEventsPage(): Promise<string> {
  let events: ProtocolEventLog[] = [];
  try {
    const res = await apiClient.getEvents();
    events = res.events;
  } catch (err: any) {
    // Fallback
  }

  return `
    <div class="page-container">
      <div class="page-title-group">
        <h1 class="page-title">Live Protocol Event Ticker</h1>
        <p class="page-subtitle">Real-time indexed events streamed directly from ProtocolEventIndexer and Anvil EVM nodes.</p>
      </div>

      <div class="card-section">
        <div class="section-header">
          <span>Indexed Event Stream (${events.length} Events)</span>
          <button class="btn btn-secondary" onclick="window.navigateTo('events')">🔄 Refresh Stream</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
          ${
            events.length === 0
              ? `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No events logged yet. Execute a scenario in the Demo Control Center to generate live events.</div>`
              : events
                  .slice()
                  .reverse()
                  .map(
                    (ev) => `
                <div style="background-color: #0d1322; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 18px; display: flex; align-items: flex-start; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                      <span class="badge badge-info">${ev.type}</span>
                      <code style="color: var(--accent-cyan); font-size: 12px;">ID: ${ev.id}</code>
                      ${ev.intentHash ? `<code style="font-size: 12px;">Intent: ${ev.intentHash.substring(0, 10)}...</code>` : ""}
                    </div>
                    <div style="font-size: 14px; font-weight: 500; color: white;">${ev.message}</div>
                    ${ev.data ? `<pre class="code-block" style="margin-top: 8px; padding: 8px 12px; font-size: 11px;">${JSON.stringify(ev.data, null, 2)}</pre>` : ""}
                  </div>
                  <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; margin-left: 16px;">
                    ${new Date(ev.timestamp * 1000).toLocaleTimeString()}
                  </div>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      </div>
    </div>
  `;
}
