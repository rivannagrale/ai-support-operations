const $ = id => document.getElementById(id);
const tokenKey = "ai_support_admin_token";

const loginScreen = $("loginScreen");
const app = $("app");
const loginForm = $("loginForm");
const loginBtn = $("loginBtn");
const loginError = $("loginError");
const ticketInput = $("ticketInput");
const analyzeBtn = $("analyzeBtn");
const emptyState = $("emptyState");
const result = $("result");
const category = $("category");
const confidence = $("confidence");
const risk = $("risk");
const answer = $("answer");
const escalation = $("escalation");
const responseTime = $("responseTime");
const knowledgeUsed = $("knowledgeUsed");
const ticketId = $("ticketId");
const ticketsProcessed = $("ticketsProcessed");
const automated = $("automated");
const escalated = $("escalated");
const automationRate = $("automationRate");
const reviewQueue = $("reviewQueue");
const queueCount = $("queueCount");
const ticketHistory = $("ticketHistory");
const refreshTicketsBtn = $("refreshTicketsBtn");
const systemAutomation = $("systemAutomation");
const averageResponseTime = $("averageResponseTime");
const historySearch = $("historySearch");
const statusFilter = $("statusFilter");
const categoryFilter = $("categoryFilter");
const exportBtn = $("exportBtn");
const charCount = $("charCount");

let allTickets = [];
let stats = { processed: 0, automated: 0, escalated: 0 };

function getToken() { return localStorage.getItem(tokenKey); }
function setToken(value) { localStorage.setItem(tokenKey, value); }
function clearToken() { localStorage.removeItem(tokenKey); }

async function api(url, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearToken();
    showLogin();
    throw new Error("Session expired. Please sign in again.");
  }
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  app.classList.add("hidden");
}
function showApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";
  loginError.classList.add("hidden");
  try {
    const data = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: $("usernameInput").value.trim(), password: $("passwordInput").value })
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Login failed.");
      return d;
    });
    setToken(data.token);
    $("passwordInput").value = "";
    showApp();
    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch (_) {}
  clearToken();
  showLogin();
});

async function bootstrap() {
  if (!getToken()) return showLogin();
  try {
    await api("/api/auth/me");
    showApp();
    await loadDashboard();
  } catch (_) { showLogin(); }
}

ticketInput.addEventListener("input", () => { charCount.textContent = `${ticketInput.value.length} / 5000`; });
analyzeBtn.addEventListener("click", analyzeTicket);
refreshTicketsBtn.addEventListener("click", loadDashboard);
historySearch.addEventListener("input", renderHistoryFiltered);
statusFilter.addEventListener("change", renderHistoryFiltered);
categoryFilter.addEventListener("change", renderHistoryFiltered);
exportBtn.addEventListener("click", exportTickets);

async function analyzeTicket() {
  const ticket = ticketInput.value.trim();
  if (!ticket) return alert("Please enter a customer ticket.");
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";
  try {
    const data = await api("/api/analyze", { method: "POST", body: JSON.stringify({ ticket }) });
    category.textContent = data.category || "Unknown";
    confidence.textContent = data.confidence !== undefined ? `${data.confidence}%` : "—";
    risk.textContent = data.risk || "Unknown";
    answer.textContent = data.answer || "No response available.";
    responseTime.textContent = data.responseTime !== undefined ? `${data.responseTime} ms` : "—";
    knowledgeUsed.textContent = data.retrievedKnowledge?.length ? data.retrievedKnowledge.join(", ") : "None";
    ticketId.textContent = data.ticketId || "—";
    emptyState.classList.add("hidden");
    result.classList.remove("hidden");
    escalation.classList.toggle("hidden", !data.escalate);
    ticketInput.value = "";
    charCount.textContent = "0 / 5000";
    await loadDashboard();
  } catch (error) {
    console.error(error);
    alert(`The AI could not analyze this ticket.\n\n${error.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Ticket";
  }
}

async function loadDashboard() {
  try {
    const [tickets, analytics, knowledge] = await Promise.all([api("/api/tickets"), api("/api/analytics"), api("/api/knowledge")]);
    allTickets = tickets;
    updateStats(analytics);
    renderAnalytics(analytics);
    populateCategoryFilter(tickets);
    renderHistoryFiltered();
    renderReviewQueue(tickets);
    $("knowledgeCount").textContent = knowledge.length;
    $("analyticsUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) { console.error("Dashboard error:", error); }
}

function updateStats(a) {
  stats.processed = a.processed; stats.automated = a.automated; stats.escalated = a.escalated;
  ticketsProcessed.textContent = a.processed;
  automated.textContent = a.automated;
  escalated.textContent = a.escalated;
  automationRate.textContent = `${a.automationRate}%`;
  systemAutomation.textContent = `${a.automationRate}%`;
  averageResponseTime.textContent = a.averageResponseTime ? `${a.averageResponseTime} ms` : "—";
}

function renderAnalytics(a) {
  $("resolutionRate").textContent = `${a.resolutionRate}%`;
  $("escalationRate").textContent = `${a.escalationRate}%`;
  $("analyticsAvgTime").textContent = a.averageResponseTime ? `${a.averageResponseTime} ms` : "—";
  $("pendingCount").textContent = a.pending;
  const total = Object.values(a.categories).reduce((x, y) => x + y, 0) || 1;
  $("categoryChart").innerHTML = Object.entries(a.categories).map(([name, count]) => `
    <div class="chart-row"><span>${escapeHTML(name)}</span><div class="chart-track"><i style="width:${Math.max(4, Math.round(count / total * 100))}%"></i></div><strong>${count}</strong></div>
  `).join("") || `<div class="section-empty"><p>No category data yet.</p></div>`;
}

function populateCategoryFilter(tickets) {
  const current = categoryFilter.value;
  const cats = [...new Set(tickets.map(t => t.category).filter(Boolean))].sort();
  categoryFilter.innerHTML = `<option value="all">All categories</option>` + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  categoryFilter.value = cats.includes(current) ? current : "all";
}

function renderHistoryFiltered() {
  const query = historySearch.value.trim().toLowerCase();
  const status = statusFilter.value;
  const cat = categoryFilter.value;
  const filtered = allTickets.filter(t => {
    const matchesText = !query || [t.id, t.ticket, t.category, t.answer].some(v => String(v || "").toLowerCase().includes(query));
    const matchesStatus = status === "all" || (t.status || "Pending") === status;
    const matchesCategory = cat === "all" || t.category === cat;
    return matchesText && matchesStatus && matchesCategory;
  });
  renderHistory(filtered);
}

function renderHistory(tickets) {
  if (!tickets.length) {
    ticketHistory.innerHTML = `<div class="section-empty"><p>No tickets match the current filters.</p></div>`;
    return;
  }
  ticketHistory.innerHTML = `<div class="history-table">
    <div class="history-header"><span>TICKET</span><span>CATEGORY</span><span>STATUS</span><span>RESPONSE</span><span>TIME</span></div>
    ${tickets.slice().reverse().map(ticket => {
      const status = ticket.status || "Pending";
      return `<div class="history-row">
        <div><strong>${escapeHTML(ticket.id)}</strong><small>${escapeHTML(ticket.ticket)}</small></div>
        <div>${escapeHTML(ticket.category || "Unknown")}</div>
        <div><span class="status-badge ${status === "Resolved" ? "resolved" : "pending"}">${escapeHTML(status)}</span></div>
        <div>${ticket.escalate ? "Human" : "AI"}</div>
        <div>${Number(ticket.responseTime || 0)} ms</div>
      </div>`;
    }).join("")}
  </div>`;
}

function renderReviewQueue(tickets) {
  const pending = tickets.filter(t => t.escalate === true && t.status !== "Resolved");
  queueCount.textContent = `${pending.length} pending`;
  if (!pending.length) {
    reviewQueue.innerHTML = `<div class="section-empty"><div class="empty-icon">✓</div><p>No tickets waiting for human review.</p></div>`;
    return;
  }
  reviewQueue.innerHTML = pending.map(createReviewTicket).join("");
}

function createReviewTicket(ticket) {
  return `<div class="review-ticket">
    <div class="review-ticket-main">
      <div class="review-ticket-top"><strong>${escapeHTML(ticket.id)}</strong><span class="risk-badge">${escapeHTML(ticket.risk || "Unknown")}</span></div>
      <h3>${escapeHTML(ticket.category || "Unknown")}</h3>
      <p>${escapeHTML(ticket.ticket)}</p>
      <div class="review-meta"><span>Confidence: ${Number(ticket.confidence || 0)}%</span><span>${Number(ticket.responseTime || 0)} ms</span></div>
    </div>
    <div class="review-actions">
      <button class="review-button" onclick="reviewTicket('${escapeJS(ticket.id)}')">Review</button>
      <button class="resolve-button" onclick="updateTicketStatus('${escapeJS(ticket.id)}','Resolved')">Resolve</button>
    </div>
  </div>`;
}

async function reviewTicket(id) {
  try {
    const tickets = await api("/api/tickets");
    const ticket = tickets.find(item => item.id === id);
    if (!ticket) throw new Error("Ticket not found.");
    showReviewModal(ticket);
  } catch (error) { alert(`Could not open the ticket.\n\n${error.message}`); }
}

function showReviewModal(ticket) {
  closeReviewModal();
  const knowledge = ticket.retrievedKnowledge?.length ? ticket.retrievedKnowledge.join(", ") : "None";
  const modal = document.createElement("div");
  modal.id = "ticketReviewModal";
  modal.innerHTML = `<div class="review-modal-overlay"><div class="review-modal">
    <div class="review-modal-header"><div><p class="label">HUMAN REVIEW</p><h2>Ticket Details</h2></div><button class="modal-close" onclick="closeReviewModal()">×</button></div>
    <div class="modal-ticket-id">${escapeHTML(ticket.id)}</div>
    <div class="modal-section"><p class="label">CUSTOMER TICKET</p><div class="modal-ticket-text">${escapeHTML(ticket.ticket)}</div></div>
    <div class="modal-grid">
      <div class="modal-info"><span>Category</span><strong>${escapeHTML(ticket.category || "Unknown")}</strong></div>
      <div class="modal-info"><span>Confidence</span><strong>${Number(ticket.confidence || 0)}%</strong></div>
      <div class="modal-info"><span>Risk</span><strong>${escapeHTML(ticket.risk || "Unknown")}</strong></div>
      <div class="modal-info"><span>Response time</span><strong>${Number(ticket.responseTime || 0)} ms</strong></div>
    </div>
    <div class="modal-section"><p class="label">AI RESPONSE</p><div class="modal-answer">${escapeHTML(ticket.answer || "No response available.")}</div></div>
    <div class="modal-section"><p class="label">KNOWLEDGE USED</p><div class="modal-knowledge">${escapeHTML(knowledge)}</div></div>
    <div class="modal-section"><p class="label">CURRENT STATUS</p><div class="modal-status">${escapeHTML(ticket.status || "Pending")}</div></div>
    <div class="modal-actions"><button class="modal-secondary" onclick="closeReviewModal()">Close</button><button class="resolve-button" onclick="resolveFromReview('${escapeJS(ticket.id)}')">Resolve Ticket</button></div>
  </div></div>`;
  document.body.appendChild(modal);
  modal.querySelector(".review-modal-overlay").addEventListener("click", event => { if (event.target.classList.contains("review-modal-overlay")) closeReviewModal(); });
}

async function resolveFromReview(id) { closeReviewModal(); await updateTicketStatus(id, "Resolved"); }
function closeReviewModal() { document.getElementById("ticketReviewModal")?.remove(); }

async function updateTicketStatus(id, status) {
  try { await api(`/api/tickets/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }); await loadDashboard(); }
  catch (error) { alert(`Could not update the ticket.\n\n${error.message}`); }
}

async function exportTickets() {
  try {
    const response = await fetch("/api/export/tickets.csv", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!response.ok) throw new Error("Could not export tickets.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "support-tickets.csv"; link.click(); URL.revokeObjectURL(url);
  } catch (error) { alert(error.message); }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function escapeJS(value) { return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r/g, "\\r").replace(/\n/g, "\\n"); }

bootstrap();

// ======================================
// KEYBOARD SHORTCUTS
// ======================================

const shortcutOverlay =
  $("shortcutOverlay");

const closeShortcuts =
  $("closeShortcuts");


// ======================================
// OPEN SHORTCUT PANEL
// ======================================

function openShortcutPanel() {

  if (!shortcutOverlay) {
    return;
  }

  shortcutOverlay.classList.remove("hidden");

}


// ======================================
// CLOSE SHORTCUT PANEL
// ======================================

function closeShortcutPanel() {

  if (!shortcutOverlay) {
    return;
  }

  shortcutOverlay.classList.add("hidden");

}


// ======================================
// CLOSE BUTTON
// ======================================

if (closeShortcuts) {

  closeShortcuts.addEventListener(
    "click",
    closeShortcutPanel
  );

}


// ======================================
// CLICK OUTSIDE
// ======================================

if (shortcutOverlay) {

  shortcutOverlay.addEventListener(
    "click",
    event => {

      if (
        event.target === shortcutOverlay
      ) {

        closeShortcutPanel();

      }

    }
  );

}


// ======================================
// KEYBOARD EVENTS
// ======================================

document.addEventListener(
  "keydown",
  event => {

    const activeElement =
      document.activeElement;

    const isTyping =
      activeElement &&
      (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable
      );


    // ==================================
    // ESC
    // ==================================

    if (event.key === "Escape") {

      closeShortcutPanel();

      if (
        typeof closeReviewModal ===
        "function"
      ) {

        closeReviewModal();

      }

      return;

    }


    // ==================================
    // Don't run dashboard shortcuts
    // before login
    // ==================================

    if (
      !app ||
      app.classList.contains("hidden")
    ) {

      return;

    }


    // ==================================
    // ?
    // Show shortcuts
    // ==================================

    if (
      event.key === "?" &&
      !isTyping
    ) {

      event.preventDefault();

      openShortcutPanel();

      return;

    }


    // ==================================
    // N
    // Focus ticket input
    // ==================================

    if (
      event.key.toLowerCase() === "n" &&
      !isTyping &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {

      event.preventDefault();

      ticketInput.focus();

      ticketInput.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      return;

    }


    // ==================================
    // CTRL + ENTER
    // Analyze ticket
    // ==================================

    if (
      event.key === "Enter" &&
      event.ctrlKey
    ) {

      event.preventDefault();

      if (
        !analyzeBtn.disabled
      ) {

        analyzeBtn.click();

      }

      return;

    }


    // ==================================
    // CTRL + R
    // Refresh dashboard
    // ==================================

    if (
      event.key.toLowerCase() === "r" &&
      event.ctrlKey
    ) {

      event.preventDefault();

      refreshTicketsBtn.click();

      return;

    }

  }
);

// ======================================
// 🌙 DARK / LIGHT MODE
// ======================================

document.addEventListener("DOMContentLoaded", () => {

  const themeToggle =
    document.getElementById("themeToggle");

  if (!themeToggle) {
    console.error("Theme button not found");
    return;
  }

  // Load saved theme
  const savedTheme =
    localStorage.getItem("supportAgentTheme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }


  // Toggle theme
  themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    const darkMode =
      document.body.classList.contains("dark-mode");

    localStorage.setItem(
      "supportAgentTheme",
      darkMode ? "dark" : "light"
    );

    console.log(
      darkMode
        ? "🌙 Dark mode ON"
        : "☀️ Light mode ON"
    );

  });

});

