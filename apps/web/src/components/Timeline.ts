export function renderIntentTimeline(currentStateNumber: number): string {
  const stages = [
    { num: 1, name: "CREATED", desc: "Escrow Secured" },
    { num: 2, name: "VALIDATED", desc: "Canonical Hash" },
    { num: 3, name: "AUCTION_READY", desc: "Batch Open" },
    { num: 4, name: "AUCTION_OPEN", desc: "Sealed Solvers" },
    { num: 6, name: "WINNER_SELECTED", desc: "Capacity Reserved" },
    { num: 8, name: "EXECUTING", desc: "Dest Chain Tx" },
    { num: 10, name: "VERIFICATION", desc: "7-Point Proof" },
    { num: 11, name: "SETTLEMENT", desc: "Payout Authorized" },
    { num: 12, name: "COMPLETED", desc: "Intent Settled" },
  ];

  return `
    <div class="lifecycle-timeline">
      ${stages
        .map((st) => {
          const isDone = currentStateNumber > st.num || currentStateNumber === 12;
          const isActive = currentStateNumber === st.num;
          const stateClass = isDone ? "done" : isActive ? "active" : "";

          return `
            <div class="lifecycle-step ${stateClass}">
              <div class="step-node">
                ${isDone ? "✓" : st.num}
              </div>
              <div class="step-title">${st.name}</div>
              <div style="font-size: 10px; color: var(--text-muted);">${st.desc}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}
