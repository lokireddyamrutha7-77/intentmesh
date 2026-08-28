export function renderSidebar(currentRoute: string): string {
  const links = [
    { route: "dashboard", label: "📊 Overview", path: "/dashboard" },
    { route: "intents", label: "📜 Intents List", path: "/intents" },
    { route: "create-intent", label: "⚡ Create Intent", path: "/create-intent" },
    { route: "auctions", label: "🏷️ Batch Auctions", path: "/auctions" },
    { route: "solvers", label: "🤖 Solvers Registry", path: "/solvers" },
    { route: "risk", label: "🛡️ Risk Engine", path: "/risk" },
    { route: "executions", label: "🔎 Executions & Proofs", path: "/executions" },
    { route: "events", label: "📡 Live Event Feed", path: "/events" },
    { route: "demo-center", label: "🚀 Demo Control Center", path: "/demo-center" },
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-badge">IM</span>
        <span class="logo-title">IntentMesh</span>
      </div>
      <ul class="nav-links">
        ${links
          .map(
            (link) => `
          <li class="nav-item">
            <button 
              class="${currentRoute === link.route ? "active" : ""}"
              onclick="window.navigateTo('${link.route}')">
              ${link.label}
            </button>
          </li>
        `
          )
          .join("")}
      </ul>
    </aside>
  `;
}
