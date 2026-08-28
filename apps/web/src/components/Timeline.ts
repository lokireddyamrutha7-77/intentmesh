export function renderIntentTimeline(currentStateNumber: number): string {
  const stages = [
    { num: 1, name: "CREATED" },
    { num: 2, name: "VALIDATED" },
    { num: 3, name: "AUCTION_READY" },
    { num: 4, name: "AUCTION_OPEN" },
    { num: 6, name: "WINNER_SELECTED" },
    { num: 8, name: "EXECUTING" },
    { num: 10, name: "VERIFICATION" },
    { num: 11, name: "SETTLEMENT" },
    { num: 12, name: "COMPLETED" },
  ];

  return `
    <div class="timeline">
      ${stages
        .map((st) => {
          const isActive = currentStateNumber >= st.num;
          const isCurrent = currentStateNumber === st.num;
          return `
            <div class="timeline-step ${isActive ? "active" : ""}" style="${isCurrent ? "border-color: var(--accent-cyan); box-shadow: 0 0 10px rgba(6,182,212,0.3);" : ""}">
              <div class="step-num">${st.num}</div>
              <div class="step-name" style="color: ${isActive ? "white" : "var(--text-muted)"}">${st.name}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}
