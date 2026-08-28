import { apiClient } from "../services/apiClient";
import { AuctionRecord } from "../types";

export async function renderAuctionsPage(auctionIdParam?: string): Promise<string> {
  try {
    const res = await apiClient.getAuctions();
    const auctions = res.auctions;

    if (auctionIdParam) {
      const selectedAuction = auctions.find((a) => a.auctionId.toLowerCase() === auctionIdParam.toLowerCase()) || auctions[0];
      if (selectedAuction) {
        return renderAuctionDetail(selectedAuction);
      }
    }

    return `
      <div class="page-wrapper">
        <div class="page-header">
          <h1 class="page-title">Solver Market Batch Auctions</h1>
          <p class="page-subtitle">Sealed-bid commit-reveal auctions preventing frontrunning, MEV exploitation, and off-chain collusion.</p>
        </div>

        <!-- COMMIT-REVEAL STAGE TRACKER CARD -->
        <div class="glass-card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Sealed-Bid Commit-Reveal Architecture</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
              <div style="font-weight: 700; color: var(--accent-indigo);">1. COMMIT STAGE</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Solvers submit hashed bids <code>hash(bid, salt)</code> privately.</div>
            </div>
            <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
              <div style="font-weight: 700; color: var(--accent-violet);">2. REVEAL STAGE</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Bids opened and cryptographically matched against salts.</div>
            </div>
            <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
              <div style="font-weight: 700; color: var(--accent-cyan);">3. RISK & RANKING</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Deterministic ranking by output, risk, and capacity.</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
              <div style="font-weight: 700; color: var(--accent-emerald);">4. WINNER FINALIZED</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Capacity locked atomically on-chain.</div>
            </div>
          </div>
        </div>

        <div class="glass-card">
          ${
            auctions.length === 0
              ? `<div style="padding: 40px; text-align: center; color: var(--text-muted);">No open batch auctions. Launch a scenario in the <strong>Simulator</strong> or create an intent.</div>`
              : `
            <div class="table-responsive">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Auction ID</th>
                    <th>Intent Hash</th>
                    <th>Commit Deadline</th>
                    <th>Reveal Deadline</th>
                    <th>Bids Count</th>
                    <th>State</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${auctions
                    .map(
                      (a) => `
                    <tr>
                      <td><code style="color: var(--accent-cyan); font-weight: 700;">${a.auctionId}</code></td>
                      <td><code>${a.intentHash.substring(0, 12)}...</code></td>
                      <td>${new Date(a.commitDeadline * 1000).toLocaleTimeString()}</td>
                      <td>${new Date(a.revealDeadline * 1000).toLocaleTimeString()}</td>
                      <td>${a.bidsCount} / ${a.maxBidsAllowed}</td>
                      <td><span class="badge-pill badge-cyan">${a.state}</span></td>
                      <td>
                        <button class="nav-link" style="padding: 6px 12px; font-size: 12px;" onclick="window.navigateTo('auctions', '${a.auctionId}')">Inspect Market</button>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  } catch (err: any) {
    return `
      <div class="page-wrapper">
        <div class="glass-card" style="border-color: var(--accent-rose);">
          Error loading auctions: ${err.message}
        </div>
      </div>
    `;
  }
}

function renderAuctionDetail(auction: AuctionRecord): string {
  return `
    <div class="page-wrapper">
      <div class="page-header">
        <button class="nav-link" style="margin-bottom: 12px;" onclick="window.navigateTo('auctions')">← Back to Auctions Directory</button>
        <h1 class="page-title">Auction Details: <code style="color: var(--accent-cyan);">${auction.auctionId}</code></h1>
        <p class="page-subtitle">Batch Auction for Intent <code>${auction.intentHash}</code></p>
      </div>

      <!-- SEALED VS REVEALED BIDS DISPLAY -->
      <div class="glass-card" style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Sealed & Revealed Solver Bids</h3>
        
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Solver Address</th>
                <th>Sealed Commitment Hash</th>
                <th>Revealed Output</th>
                <th>Est. Latency</th>
                <th>Risk Score</th>
                <th>Auction Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code style="color: var(--accent-cyan);">0xsolver_a_reliable</code></td>
                <td><code style="color: var(--text-muted);">0x9a8f3b...e21a (SEALED)</code></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">980 USDC</span></td>
                <td>60 sec</td>
                <td><span class="badge-pill badge-low">LOW (24)</span></td>
                <td><span class="badge-pill badge-low">✓ WINNER</span></td>
              </tr>
              <tr>
                <td><code style="color: var(--accent-cyan);">0xsolver_b_fast</code></td>
                <td><code style="color: var(--text-muted);">0x1c4e7d...b90f (SEALED)</code></td>
                <td><span>970 USDC</span></td>
                <td><span style="color: var(--accent-cyan); font-weight: 700;">15 sec</span></td>
                <td><span class="badge-pill badge-medium">MED (42)</span></td>
                <td><span class="badge-pill badge-medium">FALLBACK</span></td>
              </tr>
              <tr>
                <td><code style="color: var(--accent-cyan);">0xsolver_c_risky</code></td>
                <td><code style="color: var(--text-muted);">0x7d8e2a...f44c (SEALED)</code></td>
                <td><span style="color: var(--accent-indigo); font-weight: 700;">997 USDC</span></td>
                <td>45 sec</td>
                <td><span class="badge-pill badge-high">HIGH (78)</span></td>
                <td><span class="badge-pill badge-high">DISQUALIFIED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- COMPACT EXPANDABLE EXPLANATION PANEL -->
      <details class="glass-card" style="cursor: pointer;">
        <summary style="font-weight: 700; color: white;">
          🛡️ Why Commit-Reveal Batch Auctions Prevent MEV & Frontrunning
        </summary>
        <div style="margin-top: 14px; font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
          In traditional open order books, solver bids are visible on-chain before execution, creating severe exposure to frontrunning and Sandwich attacks. IntentMesh enforces a two-phase sealed-bid auction:
          <br/><br/>
          1. <strong>Commitment:</strong> Solvers submit <code>keccak256(abi.encodePacked(outputAmount, solverAddress, salt))</code>. No value is exposed.
          <br/>
          2. <strong>Reveal:</strong> Upon deadline expiry, solvers submit raw parameters. The BatchAuction contract verifies salt hashes before evaluating deterministic ranking based on output, latency, and risk score.
        </div>
      </details>
    </div>
  `;
}
