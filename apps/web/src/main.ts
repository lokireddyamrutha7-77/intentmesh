import { pushDrawerEvent, renderEventStreamDrawer, setDrawerEvents } from "./components/EventStreamDrawer";
import { renderHeader } from "./components/Header";
import { renderAuctionsPage } from "./pages/AuctionsPage";
import { renderDashboardPage } from "./pages/DashboardPage";
import { renderDemoCenterPage, setupDemoCenterHandlers } from "./pages/DemoCenterPage";
import { renderEventsPage } from "./pages/EventsPage";
import { renderExecutionsPage } from "./pages/ExecutionsPage";
import { renderExecutePage, setupExecutePageHandlers } from "./pages/ExecutePage";
import { renderIntentsPage } from "./pages/IntentsPage";
import { renderRiskPage } from "./pages/RiskPage";
import { renderSolversPage } from "./pages/SolversPage";
import { apiClient } from "./services/apiClient";
import { connectWallet, disconnectWallet, subscribeWalletState, switchNetwork } from "./services/walletService";
import "./styles/main.css";
import { HealthStatus } from "./types";

let currentRoute = "execute";
let currentParam = "";
let healthState: HealthStatus | null = null;
let drawerOpen = false;

async function initApp() {
  // Subscribe to wallet changes so UI re-renders on connect/disconnect/network change
  subscribeWalletState(() => {
    renderApp();
  });

  try {
    healthState = await apiClient.getHealth();
  } catch {
    // API disconnected state
  }

  // Pre-fetch recent events for the drawer
  try {
    const eventsRes = await apiClient.getEvents();
    if (eventsRes?.events) {
      setDrawerEvents(eventsRes.events.slice().reverse());
    }
  } catch {
    // Fallback
  }

  // Subscribe to real-time SSE events
  apiClient.subscribeToEvents((event) => {
    console.log("[SSE Event Stream Received]", event);
    pushDrawerEvent(event);
  });

  renderApp();
}

async function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;

  let pageHtml = "";

  switch (currentRoute) {
    case "execute":
      pageHtml = await renderExecutePage(currentParam);
      break;
    case "dashboard":
      pageHtml = await renderDashboardPage();
      break;
    case "activity":
    case "intents":
      pageHtml = await renderIntentsPage(currentParam);
      break;
    case "auctions":
      pageHtml = await renderAuctionsPage(currentParam);
      break;
    case "solvers":
      pageHtml = await renderSolversPage(currentParam);
      break;
    case "risk":
      pageHtml = await renderRiskPage(currentParam);
      break;
    case "executions":
      pageHtml = await renderExecutionsPage();
      break;
    case "events":
      pageHtml = await renderEventsPage();
      break;
    case "simulator":
    case "demo-center":
      pageHtml = await renderDemoCenterPage();
      break;
    default:
      pageHtml = await renderExecutePage(currentParam);
      break;
  }

  app.innerHTML = `
    <div class="app-container">
      ${renderHeader(currentRoute, healthState)}
      <main id="page-content">${pageHtml}</main>
      ${renderEventStreamDrawer()}
    </div>
  `;

  // Attach route-specific event handlers
  if (currentRoute === "execute" || currentRoute === "default") {
    setupExecutePageHandlers();
  } else if (currentRoute === "simulator" || currentRoute === "demo-center") {
    setupDemoCenterHandlers();
  }

  // Preserve drawer open state if active
  if (drawerOpen) {
    const panel = document.getElementById("event-drawer-panel");
    if (panel) panel.classList.add("open");
  }
}

// Global navigation helper
(window as any).navigateTo = (route: string, param: string = "") => {
  currentRoute = route;
  currentParam = param;
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Global wallet action handlers
(window as any).handleConnectWallet = async () => {
  await connectWallet();
};

(window as any).handleDisconnectWallet = () => {
  disconnectWallet();
};

(window as any).handleSwitchNetwork = async (chainId: number) => {
  await switchNetwork(chainId);
};

// Global event drawer toggle helper
(window as any).toggleEventDrawer = () => {
  drawerOpen = !drawerOpen;
  const panel = document.getElementById("event-drawer-panel");
  if (panel) {
    if (drawerOpen) {
      panel.classList.add("open");
    } else {
      panel.classList.remove("open");
    }
  }
};

document.addEventListener("DOMContentLoaded", initApp);
