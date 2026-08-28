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
    <div class="page-wrapper">
      <div class="page-header">
        <h1 class="page-title">Real-Time Protocol Event Feed</h1>
        <p class="page-subtitle">Indexed events streamed directly from ProtocolEventIndexer and Anvil EVM nodes via Server-Sent Events (SSE).</p>
      </div>

      <div class="glass-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div style="font-size: 16px; font-weight: 700; color: white;">
            Indexed Protocol Log Stream (${events.length} Events)
          </div>
          <button class="nav-link" onclick="window.navigateTo('events')">🔄 Refresh Feed</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${
            events.length === 0
              ? `<div style="padding: 40px; text-align: center; color: var(--text-muted);">No events logged yet. Trigger a scenario in the <strong>Simulator</strong> to generate live events.</div>`
              : events
                  .slice()
                  .reverse()
                  .map(
                    (ev) => `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 18px; display: flex; align-items: flex-start; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                      <span class="badge-pill badge-cyan">${ev.type}</span>
                      <code style="color: var(--accent-cyan); font-size: 11px;">ID: ${ev.id}</code>
                      ${ev.intentHash ? `<code style="font-size: 11px;">Intent: ${ev.intentHash.substring(0, 12)}...</code>` : ""}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: white;">${ev.message}</div>
                    ${ev.data ? `<pre class="code-block" style="margin-top: 8px; padding: 8px 12px; font-size: 11px;">${JSON.stringify(ev.data, null, 2)}</pre>` : ""}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; margin-left: 16px;">
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
