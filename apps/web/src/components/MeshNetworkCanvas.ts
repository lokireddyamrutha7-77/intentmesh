export function renderMeshNetworkCanvas(activeState: string = "IDLE", activeWinner: string = ""): string {
  const isSourceActive = activeState !== "IDLE";
  const isAuctionActive = activeState === "AUCTION" || activeState === "BID_COMMITTED" || activeState === "BID_REVEALED" || activeState === "WINNER_SELECTED" || activeState === "EXECUTING" || activeState === "VERIFICATION" || activeState === "SETTLEMENT";
  const isBiddingActive = activeState === "BID_COMMITTED" || activeState === "BID_REVEALED";
  const isWinnerSelected = activeState === "WINNER_SELECTED" || activeState === "EXECUTING" || activeState === "VERIFICATION" || activeState === "SETTLEMENT";
  const isExecuting = activeState === "EXECUTING" || activeState === "VERIFICATION" || activeState === "SETTLEMENT";
  const isVerified = activeState === "VERIFICATION" || activeState === "SETTLEMENT";
  const isSettled = activeState === "SETTLEMENT";
  const isRefund = activeState === "REFUND";

  // Winner highlights
  const isWinnerA = isWinnerSelected && (activeWinner.includes("solver_a") || activeWinner === "");
  const isWinnerB = isWinnerSelected && activeWinner.includes("solver_b");
  const isWinnerC = isWinnerSelected && activeWinner.includes("solver_c");

  return `
    <div class="mesh-network-wrapper" style="width: 100%; max-width: 1100px; margin: 32px 0 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--accent-indigo); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
          <span class="status-dot pulse" style="background: ${isSettled ? "var(--accent-emerald)" : isRefund ? "var(--accent-rose)" : "var(--accent-indigo)"};"></span>
          <span>Live Protocol State Visualizer: <strong style="color: white; font-family: var(--font-mono);">${activeState}</strong></span>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">Real-Time Event Topology</span>
      </div>

      <div class="glass-card" style="padding: 20px; position: relative; overflow: hidden; height: 190px; display: flex; align-items: center; justify-content: space-between;">
        
        <!-- SOURCE ASSET NODE (31337) -->
        <div class="mesh-node source-node" style="display: flex; flex-direction: column; align-items: center; z-index: 2; transform: ${isSourceActive ? "scale(1.05)" : "scale(1)"}; transition: transform 0.3s ease;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: ${isRefund ? "linear-gradient(135deg, #f43f5e, #be123c)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)"}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; box-shadow: ${isSourceActive ? "0 0 25px rgba(59, 130, 246, 0.8)" : "0 0 15px rgba(59, 130, 246, 0.3)"};">
            31337
          </div>
          <span style="font-size: 12px; font-weight: 700; color: white; margin-top: 8px;">Source Escrow</span>
          <span style="font-size: 10px; color: var(--text-muted);">${isSourceActive ? "FUNDS LOCKED" : "Chain 31337 (USDC)"}</span>
        </div>

        <!-- SVG CONNECTING MESH LINES WITH DYNAMIC PULSE -->
        <svg class="mesh-svg-lines" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
          <defs>
            <linearGradient id="meshGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.9"/>
              <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#10b981" stop-opacity="0.9"/>
            </linearGradient>
          </defs>
          <!-- Path A: Source -> Solver A -> Dest -->
          <path d="M 90 95 Q 300 45 550 95" stroke="${isBiddingActive || isAuctionActive ? "#6366f1" : "#1e293b"}" stroke-width="${isWinnerA ? "4" : "2"}" fill="none" stroke-dasharray="${isBiddingActive ? "8,8" : "none"}"/>
          
          <!-- Path B: Source -> Orchestrator -> Dest -->
          <path d="M 90 95 Q 300 95 550 95" stroke="${isExecuting ? "#10b981" : "#334155"}" stroke-width="${isExecuting ? "4" : "2"}" fill="none"/>
          
          <!-- Path C: Source -> Solver C -> Dest -->
          <path d="M 90 95 Q 300 145 550 95" stroke="${isBiddingActive || isAuctionActive ? "#8b5cf6" : "#1e293b"}" stroke-width="${isWinnerC ? "4" : "2"}" fill="none" stroke-dasharray="${isBiddingActive ? "8,8" : "none"}"/>

          <path d="M 550 95 Q 800 45 1010 95" stroke="${isWinnerSelected ? "#10b981" : "#1e293b"}" stroke-width="${isWinnerSelected ? "3" : "2"}" fill="none"/>
          <path d="M 550 95 Q 800 145 1010 95" stroke="${isWinnerSelected ? "#10b981" : "#1e293b"}" stroke-width="${isWinnerSelected ? "3" : "2"}" fill="none"/>
        </svg>

        <!-- SOLVER NODES CLUSTER -->
        <div style="display: flex; gap: 24px; align-items: center; z-index: 2;">
          
          <!-- SOLVER A -->
          <div class="mesh-node solver-node-a" style="display: flex; flex-direction: column; align-items: center; opacity: ${isAuctionActive || isBiddingActive ? "1" : "0.5"}; transform: ${isWinnerA ? "scale(1.15)" : "scale(1)"}; transition: all 0.3s ease;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: ${isWinnerA ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)"}; border: 2px solid ${isWinnerA ? "var(--accent-emerald)" : "var(--accent-indigo)"}; display: flex; align-items: center; justify-content: center; color: ${isWinnerA ? "var(--accent-emerald)" : "var(--accent-indigo)"}; font-weight: 800; font-size: 13px;">
              SA
            </div>
            <span style="font-size: 11px; font-weight: 700; color: white; margin-top: 4px;">Solver A</span>
            <span style="font-size: 9px; color: var(--accent-cyan);">${isWinnerA ? "WINNER" : "Reliable"}</span>
          </div>

          <!-- INTENTMESH ORCHESTRATOR -->
          <div class="mesh-node orchestrator-node" style="display: flex; flex-direction: column; align-items: center; transform: scale(1.15);">
            <div style="width: 58px; height: 58px; border-radius: 18px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 22px; box-shadow: ${isExecuting ? "0 0 30px rgba(16, 185, 129, 0.8)" : "0 0 25px rgba(139, 92, 246, 0.6)"};">
              IM
            </div>
            <span style="font-size: 12px; font-weight: 800; color: white; margin-top: 4px;">IntentMesh</span>
            <span style="font-size: 9px; color: var(--accent-cyan);">${isVerified ? "7/7 PROOF VERIFIED" : "Auction Engine"}</span>
          </div>

          <!-- SOLVER B / SOLVER C -->
          <div class="mesh-node solver-node-b" style="display: flex; flex-direction: column; align-items: center; opacity: ${isAuctionActive || isBiddingActive ? "1" : "0.5"}; transform: ${isWinnerB || isWinnerC ? "scale(1.15)" : "scale(1)"}; transition: all 0.3s ease;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: ${isWinnerB ? "rgba(16, 185, 129, 0.2)" : "rgba(139, 92, 246, 0.2)"}; border: 2px solid ${isWinnerB ? "var(--accent-emerald)" : "var(--accent-violet)"}; display: flex; align-items: center; justify-content: center; color: ${isWinnerB ? "var(--accent-emerald)" : "var(--accent-violet)"}; font-weight: 800; font-size: 13px;">
              ${isWinnerC ? "SC" : "SB"}
            </div>
            <span style="font-size: 11px; font-weight: 700; color: white; margin-top: 4px;">${isWinnerC ? "Solver C" : "Solver B"}</span>
            <span style="font-size: 9px; color: var(--accent-amber);">${isWinnerB ? "WINNER" : isWinnerC ? "WINNER" : "Fast Route"}</span>
          </div>

        </div>

        <!-- DESTINATION ASSET NODE (31338) -->
        <div class="mesh-node dest-node" style="display: flex; flex-direction: column; align-items: center; z-index: 2; transform: ${isSettled ? "scale(1.1)" : "scale(1)"}; transition: transform 0.3s ease;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: ${isSettled ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #059669, #047857)"}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; box-shadow: ${isSettled ? "0 0 30px rgba(16, 185, 129, 0.9)" : "0 0 15px rgba(16, 185, 129, 0.3)"};">
            31338
          </div>
          <span style="font-size: 12px; font-weight: 700; color: white; margin-top: 8px;">Destination Vault</span>
          <span style="font-size: 10px; color: ${isSettled ? "var(--accent-emerald)" : "var(--text-muted)"};">${isSettled ? "SETTLED & RELEASED" : "Chain 31338 (USDC)"}</span>
        </div>

      </div>
    </div>
  `;
}
