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
      <div class="page-container">
        <div class="page-title-group">
          <h1 class="page-title">Batch Commit-Reveal Auctions</h1>
          <p class="page-subtitle">Sealed-bid commit-reveal auctions ensuring MEV protection and deterministic winner selection.</p>
        </div>

        <div class="card-section">
          ${
            auctions.length === 0
              ? `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No batch auctions currently open. Launch a scenario in the <strong>Demo Center</strong> to create an auction.</div>`
              : `
            <table class="data-table">
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
                    <td><code style="color: var(--accent-cyan); font-weight: 600;">${a.auctionId}</code></td>
                    <td><code>${a.intentHash.substring(0, 10)}...</code></td>
                    <td>${new Date(a.commitDeadline * 1000).toLocaleTimeString()}</td>
                    <td>${new Date(a.revealDeadline * 1000).toLocaleTimeString()}</td>
                    <td>${a.bidsCount} / ${a.maxBidsAllowed}</td>
                    <td><span class="badge badge-info">${a.state}</span></td>
                    <td>
                      <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.navigateTo('auctions', '${a.auctionId}')">Inspect Auction</button>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>
      </div>
    `;
  } catch (err: any) {
    return `<div class="page-container"><div class="card-section" style="border-color: var(--status-danger);">Error loading auctions: ${err.message}</div></div>`;
  }
}

function renderAuctionDetail(auction: AuctionRecord): string {
  return `
    <div class="page-container">
      <div class="page-title-group">
        <button class="btn btn-secondary" style="margin-bottom: 12px;" onclick="window.navigateTo('auctions')">← Back To Auctions Directory</button>
        <h1 class="page-title">Auction Details: <code style="color: var(--accent-cyan);">${auction.auctionId}</code></h1>
        <p class="page-subtitle">Batch Auction bound to Intent <code>${auction.intentHash}</code></p>
      </div>

      <!-- Commit-Reveal Lifecycle Stage Visualizer -->
      <div class="card-section">
        <div class="section-header">Commit-Reveal Stage Tracker</div>
        <div style="display: flex; gap: 16px; margin-top: 16px;">
          <div style="flex: 1; background: #0d1322; border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-weight: 700; color: var(--accent-primary);">1. COMMIT STAGE</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Sealed hash commitments submitted by solvers.</div>
          </div>
          <div style="flex: 1; background: #0d1322; border: 1px solid var(--accent-purple); border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-weight: 700; color: var(--accent-purple);">2. REVEAL STAGE</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Unsealed bids verified against salt hashes.</div>
          </div>
          <div style="flex: 1; background: #0d1322; border: 1px solid var(--accent-cyan); border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-weight: 700; color: var(--accent-cyan);">3. DETERMINISTIC RANKING</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Max expected output with atomic capacity check.</div>
          </div>
          <div style="flex: 1; background: #0d1322; border: 1px solid var(--status-success); border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-weight: 700; color: var(--status-success);">4. WINNER FINALIZED</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Capacity reserved atomically on-chain.</div>
          </div>
        </div>
      </div>

      <div class="card-section">
        <div class="section-header">Revealed Candidate Bids</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Solver Address</th>
              <th>Expected Output</th>
              <th>Est. Execution Time</th>
              <th>Capacity Required</th>
              <th>Structural Eligibility</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>0xsolver_a_reliable</code></td>
              <td>980 USDC</td>
              <td>60 sec</td>
              <td>1000 USDC</td>
              <td><span class="badge badge-success">PASSED</span></td>
              <td><span class="badge badge-info">ELIGIBLE</span></td>
            </tr>
            <tr>
              <td><code>0xsolver_b_fast</code></td>
              <td>970 USDC</td>
              <td>15 sec</td>
              <td>1000 USDC</td>
              <td><span class="badge badge-success">PASSED</span></td>
              <td><span class="badge badge-warning">FALLBACK</span></td>
            </tr>
            <tr>
              <td><code>0xsolver_c_risky</code></td>
              <td>997 USDC</td>
              <td>45 sec</td>
              <td>1000 USDC</td>
              <td><span class="badge badge-success">PASSED</span></td>
              <td><span class="badge badge-success">WINNER</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
