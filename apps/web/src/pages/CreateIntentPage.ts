import { apiClient } from "../services/apiClient";

export async function renderCreateIntentPage(): Promise<string> {
  return `
    <div class="page-container">
      <div class="page-title-group">
        <h1 class="page-title">Create Canonical Cross-Chain Intent</h1>
        <p class="page-subtitle">Submit a non-custodial cross-chain intent bound by the 11-field canonical hash representation.</p>
      </div>

      <div class="card-section" style="max-width: 800px;">
        <form id="create-intent-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label>User Address</label>
              <input type="text" id="user-address" class="form-control" value="0xuser_alice" required />
            </div>
            <div class="form-group">
              <label>Recipient Address</label>
              <input type="text" id="recipient-address" class="form-control" value="0xrecipient_bob" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label>Source Chain ID</label>
              <input type="number" id="source-chain-id" class="form-control" value="31337" required readonly />
            </div>
            <div class="form-group">
              <label>Destination Chain ID</label>
              <input type="number" id="dest-chain-id" class="form-control" value="31338" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label>Source Token Amount (USDC Base Units)</label>
              <input type="number" id="source-amount" class="form-control" value="1000000000" placeholder="1000000000 (1000 USDC)" required />
            </div>
            <div class="form-group">
              <label>Minimum Output Amount (USDC Base Units)</label>
              <input type="number" id="min-output-amount" class="form-control" value="950000000" placeholder="950000000 (950 USDC)" required />
            </div>
          </div>

          <div class="form-group">
            <label>Verification Policy</label>
            <input type="text" id="verification-policy" class="form-control" value="0xpolicy_standard" required />
          </div>

          <div style="background-color: #0d1322; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 600; color: var(--accent-cyan); margin-bottom: 4px;">🔒 Non-Custodial Token Custody Architecture</div>
            <div style="font-size: 12px; color: var(--text-muted);">
              User tokens are transferred directly into <strong>InputEscrow</strong> via <code>ERC20.transferFrom()</code> upon intent creation. The backend API generates unsigned transaction parameters; funds are never custoided by the backend or solver agents.
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">Create & Register Intent</button>
        </form>

        <div id="intent-result" style="margin-top: 24px; display: none;"></div>
      </div>
    </div>
  `;
}

export function setupCreateIntentHandlers() {
  const form = document.getElementById("create-intent-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const resultDiv = document.getElementById("intent-result");
    if (!resultDiv) return;

    resultDiv.style.display = "block";
    resultDiv.innerHTML = `<div style="color: var(--accent-cyan);">Submitting intent to IntentRegistry via API...</div>`;

    const user = (document.getElementById("user-address") as HTMLInputElement).value;
    const recipient = (document.getElementById("recipient-address") as HTMLInputElement).value;
    const sourceChainId = (document.getElementById("source-chain-id") as HTMLInputElement).value;
    const destinationChainId = (document.getElementById("dest-chain-id") as HTMLInputElement).value;
    const sourceAmount = (document.getElementById("source-amount") as HTMLInputElement).value;
    const minOutputAmount = (document.getElementById("min-output-amount") as HTMLInputElement).value;
    const verificationPolicy = (document.getElementById("verification-policy") as HTMLInputElement).value;

    try {
      const res = await apiClient.createIntent({
        user,
        recipient,
        sourceChainId,
        destinationChainId,
        sourceAmount,
        minOutputAmount,
        verificationPolicy,
      });

      resultDiv.innerHTML = `
        <div class="card-section" style="border-color: var(--status-success);">
          <div style="color: var(--status-success); font-weight: 700; font-size: 16px; margin-bottom: 12px;">✓ Intent Registered Successfully!</div>
          <div style="margin-bottom: 8px;"><strong>Canonical Intent Hash:</strong> <code style="color: var(--accent-cyan);">${res.intentHash}</code></div>
          <div style="margin-bottom: 8px;"><strong>State:</strong> <span class="badge badge-success">AUCTION_READY (State ${res.state})</span></div>
          <div style="margin-bottom: 12px;"><strong>Unsigned InputEscrow Target:</strong> <code>${res.unsignedTx.target}</code></div>
          <button class="btn btn-secondary" onclick="window.navigateTo('intents')">View In Intents List</button>
        </div>
      `;
    } catch (err: any) {
      resultDiv.innerHTML = `
        <div class="card-section" style="border-color: var(--status-danger);">
          <div style="color: var(--status-danger); font-weight: 700;">❌ Creation Failed</div>
          <div style="color: var(--text-muted); margin-top: 4px;">${err.message}</div>
        </div>
      `;
    }
  });
}
