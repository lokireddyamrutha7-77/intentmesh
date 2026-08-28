import { renderHeader } from "./components/Header";
import { renderSidebar } from "./components/Sidebar";
import { renderAuctionsPage } from "./pages/AuctionsPage";
import { renderCreateIntentPage, setupCreateIntentHandlers } from "./pages/CreateIntentPage";
import { renderDashboardPage } from "./pages/DashboardPage";
import { renderDemoCenterPage, setupDemoCenterHandlers } from "./pages/DemoCenterPage";
import { renderEventsPage } from "./pages/EventsPage";
import { renderExecutionsPage } from "./pages/ExecutionsPage";
import { renderIntentsPage } from "./pages/IntentsPage";
import { renderRiskPage } from "./pages/RiskPage";
import { renderSolversPage } from "./pages/SolversPage";
import { apiClient } from "./services/apiClient";
import "./styles/main.css";
import { HealthStatus } from "./types";

let currentRoute = "dashboard";
let currentParam = "";
let healthState: HealthStatus | null = null;

async function initApp() {
  try {
    healthState = await apiClient.getHealth();
  } catch {
    // API disconnected state
  }

  // Subscribe to real-time SSE events
  apiClient.subscribeToEvents((event) => {
    console.log("[SSE Event Received]", event);
  });

  renderApp();
}

async function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;

  let pageHtml = "";

  switch (currentRoute) {
    case "dashboard":
      pageHtml = await renderDashboardPage();
      break;
    case "intents":
      pageHtml = await renderIntentsPage(currentParam);
      break;
    case "create-intent":
      pageHtml = await renderCreateIntentPage();
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
    case "demo-center":
      pageHtml = await renderDemoCenterPage();
      break;
    default:
      pageHtml = await renderDashboardPage();
      break;
  }

  app.innerHTML = `
    <div class="app-container">
      ${renderSidebar(currentRoute)}
      <div class="main-content">
        ${renderHeader(healthState)}
        <div id="page-content">${pageHtml}</div>
      </div>
    </div>
  `;

  // Attach event handlers
  if (currentRoute === "create-intent") {
    setupCreateIntentHandlers();
  } else if (currentRoute === "demo-center") {
    setupDemoCenterHandlers();
  }
}

// Global navigation helper
(window as any).navigateTo = (route: string, param: string = "") => {
  currentRoute = route;
  currentParam = param;
  renderApp();
};

document.addEventListener("DOMContentLoaded", initApp);
