const ticketInput = document.getElementById("ticketInput");
const analyzeBtn = document.getElementById("analyzeBtn");

const emptyState = document.getElementById("emptyState");
const result = document.getElementById("result");

const category = document.getElementById("category");
const confidence = document.getElementById("confidence");
const risk = document.getElementById("risk");
const answer = document.getElementById("answer");
const escalation = document.getElementById("escalation");

const responseTime = document.getElementById("responseTime");
const knowledgeUsed = document.getElementById("knowledgeUsed");
const ticketId = document.getElementById("ticketId");

const ticketsProcessed =
  document.getElementById("ticketsProcessed");

const automated =
  document.getElementById("automated");

const escalated =
  document.getElementById("escalated");

const automationRate =
  document.getElementById("automationRate");

const reviewQueue =
  document.getElementById("reviewQueue");

const queueCount =
  document.getElementById("queueCount");

const ticketHistory =
  document.getElementById("ticketHistory");

const refreshTicketsBtn =
  document.getElementById("refreshTicketsBtn");

const systemAutomation =
  document.getElementById("systemAutomation");

const averageResponseTime =
  document.getElementById("averageResponseTime");


let stats = {
  processed: 0,
  automated: 0,
  escalated: 0
};


// ======================================
// INITIAL LOAD
// ======================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadDashboard();
  }
);


// ======================================
// EVENT LISTENERS
// ======================================

analyzeBtn.addEventListener(
  "click",
  analyzeTicket
);

if (refreshTicketsBtn) {
  refreshTicketsBtn.addEventListener(
    "click",
    loadDashboard
  );
}


// ======================================
// ANALYZE TICKET
// ======================================

async function analyzeTicket() {

  const ticket =
    ticketInput.value.trim();

  if (!ticket) {
    alert("Please enter a customer ticket.");
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  try {

    const response =
      await fetch("/api/analyze", {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          ticket: ticket
        })
      });


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Something went wrong."
      );

    }


    // ==================================
    // DISPLAY RESULT
    // ==================================

    category.textContent =
      data.category || "Unknown";

    confidence.textContent =
      data.confidence !== undefined
        ? `${data.confidence}%`
        : "—";

    risk.textContent =
      data.risk || "Unknown";

    answer.textContent =
      data.answer || "No response available.";


    // Response time

    if (
      responseTime &&
      data.responseTime !== undefined
    ) {

      responseTime.textContent =
        `${data.responseTime} ms`;

    }


    // Knowledge used

    if (knowledgeUsed) {

      if (
        data.retrievedKnowledge &&
        data.retrievedKnowledge.length
      ) {

        knowledgeUsed.textContent =
          data.retrievedKnowledge.join(", ");

      } else {

        knowledgeUsed.textContent =
          "None";

      }

    }


    // Ticket ID

    if (ticketId) {

      ticketId.textContent =
        data.ticketId || "—";

    }


    // Show result

    emptyState.classList.add("hidden");
    result.classList.remove("hidden");


    // Escalation

    if (data.escalate) {

      escalation.classList.remove(
        "hidden"
      );

    } else {

      escalation.classList.add(
        "hidden"
      );

    }


    // Refresh dashboard

    await loadDashboard();


    // Clear input

    ticketInput.value = "";


  } catch (error) {

    console.error(error);

    alert(
      "The AI could not analyze this ticket.\n\n" +
      error.message
    );

  } finally {

    analyzeBtn.disabled = false;
    analyzeBtn.textContent =
      "Analyze Ticket";

  }
}


// ======================================
// LOAD DASHBOARD
// ======================================

async function loadDashboard() {

  try {

    const response =
      await fetch("/api/tickets");


    if (!response.ok) {

      throw new Error(
        "Could not load tickets."
      );

    }


    const tickets =
      await response.json();


    updateStats(tickets);

    renderHistory(tickets);

    renderReviewQueue(tickets);


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

  }
}


// ======================================
// UPDATE METRICS
// ======================================

function updateStats(tickets) {

  stats.processed =
    tickets.length;


  stats.escalated =
    tickets.filter(
      ticket =>
        ticket.escalate === true
    ).length;


  stats.automated =
    tickets.filter(
      ticket =>
        ticket.escalate === false
    ).length;


  const rate =
    stats.processed === 0
      ? 0
      : Math.round(
          (
            stats.automated /
            stats.processed
          ) * 100
        );


  ticketsProcessed.textContent =
    stats.processed;

  automated.textContent =
    stats.automated;

  escalated.textContent =
    stats.escalated;

  automationRate.textContent =
    `${rate}%`;


  if (systemAutomation) {

    systemAutomation.textContent =
      `${rate}%`;

  }


  // ==================================
  // AVERAGE RESPONSE TIME
  // ==================================

  if (
    !averageResponseTime
  ) {
    return;
  }


  if (tickets.length === 0) {

    averageResponseTime.textContent =
      "—";

    return;
  }


  const totalTime =
    tickets.reduce(
      (total, ticket) =>
        total +
        Number(
          ticket.responseTime || 0
        ),
      0
    );


  const average =
    Math.round(
      totalTime /
      tickets.length
    );


  averageResponseTime.textContent =
    `${average} ms`;
}

// ======================================
// TICKET HISTORY
// ======================================

function renderHistory(tickets) {

  if (!ticketHistory) {
    return;
  }

  if (!tickets || tickets.length === 0) {
    ticketHistory.innerHTML = `
      <div class="section-empty">
        <p>No ticket history yet.</p>
      </div>
    `;

    return;
  }

  ticketHistory.innerHTML = `
    <div class="history-table">

      <div class="history-header">
        <span>TICKET</span>
        <span>CATEGORY</span>
        <span>STATUS</span>
        <span>RESPONSE</span>
        <span>TIME</span>
      </div>

      ${tickets
        .slice()
        .reverse()
        .map(ticket => {

          const status =
            ticket.status || "Pending";

          const responseType =
            ticket.escalate === true
              ? "Human"
              : "AI";

          return `
            <div class="history-row">

              <div>
                <strong>
                  ${escapeHTML(ticket.id)}
                </strong>

                <small>
                  ${escapeHTML(ticket.ticket)}
                </small>
              </div>

              <div>
                ${escapeHTML(
                  ticket.category || "Unknown"
                )}
              </div>

              <div>
                <span class="status-badge ${
                  status === "Resolved"
                    ? "resolved"
                    : "pending"
                }">
                  ${escapeHTML(status)}
                </span>
              </div>

              <div>
                ${responseType}
              </div>

              <div>
                ${Number(ticket.responseTime || 0)} ms
              </div>

            </div>
          `;
        })
        .join("")}

    </div>
  `;
}

// ======================================
// HUMAN REVIEW QUEUE
// ======================================

function renderReviewQueue(
  tickets
) {

  if (!reviewQueue) {
    return;
  }


  const pending =
    tickets.filter(
      ticket =>
        ticket.escalate === true &&
        ticket.status !== "Resolved"
    );


  if (queueCount) {

    queueCount.textContent =
      `${pending.length} pending`;

  }


  if (pending.length === 0) {

    reviewQueue.innerHTML = `
      <div class="section-empty">
        <div class="empty-icon">✓</div>

        <p>
          No tickets waiting for human review.
        </p>
      </div>
    `;

    return;
  }


  reviewQueue.innerHTML =
    pending
      .map(
        ticket =>
          createReviewTicket(ticket)
      )
      .join("");
}


// ======================================
// CREATE REVIEW TICKET
// ======================================

function createReviewTicket(
  ticket
) {

  return `
    <div class="review-ticket">

      <div class="review-ticket-main">

        <div class="review-ticket-top">

          <strong>
            ${escapeHTML(ticket.id)}
          </strong>

          <span class="risk-badge">
            ${escapeHTML(ticket.risk || "Unknown")}
          </span>

        </div>


        <h3>
          ${escapeHTML(ticket.category || "Unknown")}
        </h3>


        <p>
          ${escapeHTML(ticket.ticket)}
        </p>


        <div class="review-meta">

          <span>
            Confidence:
            ${Number(ticket.confidence || 0)}%
          </span>

          <span>
            ${Number(ticket.responseTime || 0)} ms
          </span>

        </div>

      </div>


      <div class="review-actions">

        <button
          class="review-button"
          onclick="reviewTicket('${escapeJS(ticket.id)}')"
        >
          Review
        </button>


        <button
          class="resolve-button"
          onclick="updateTicketStatus(
            '${escapeJS(ticket.id)}',
            'Resolved'
          )"
        >
          Resolve
        </button>

      </div>

    </div>
  `;
}


// ======================================
// REVIEW TICKET
// ======================================

async function reviewTicket(id) {

  try {

    const response = await fetch("/api/tickets");

    if (!response.ok) {
      throw new Error("Could not load tickets.");
    }

    const tickets = await response.json();

    const ticket = tickets.find(
      item => String(item.id) === String(id)
    );

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    showReviewModal(ticket);

  } catch (error) {

    console.error("Review error:", error);

    alert(
      "Could not open the ticket.\n\n" +
      error.message
    );

  }
}


// ======================================
// REVIEW MODAL
// ======================================

function showReviewModal(ticket) {

  // Remove existing modal

  const existing =
    document.getElementById(
      "ticketReviewModal"
    );

  if (existing) {
    existing.remove();
  }


  const knowledge =
    ticket.retrievedKnowledge &&
    ticket.retrievedKnowledge.length
      ? ticket.retrievedKnowledge.join(", ")
      : "None";


  const modal =
    document.createElement("div");

  modal.id =
    "ticketReviewModal";


  modal.innerHTML = `

    <div class="review-modal-overlay">

      <div class="review-modal">

        <div class="review-modal-header">

          <div>

            <p class="label">
              HUMAN REVIEW
            </p>

            <h2>
              Ticket Details
            </h2>

          </div>


          <button
            class="modal-close"
            onclick="closeReviewModal()"
          >
            ×
          </button>

        </div>


        <div class="modal-ticket-id">

          ${escapeHTML(ticket.id)}

        </div>


        <div class="modal-section">

          <p class="label">
            CUSTOMER TICKET
          </p>

          <div class="modal-ticket-text">
            ${escapeHTML(ticket.ticket)}
          </div>

        </div>


        <div class="modal-grid">

          <div class="modal-info">

            <span>
              Category
            </span>

            <strong>
              ${escapeHTML(ticket.category || "Unknown")}
            </strong>

          </div>


          <div class="modal-info">

            <span>
              Confidence
            </span>

            <strong>
              ${Number(ticket.confidence || 0)}%
            </strong>

          </div>


          <div class="modal-info">

            <span>
              Risk
            </span>

            <strong>
              ${escapeHTML(ticket.risk || "Unknown")}
            </strong>

          </div>


          <div class="modal-info">

            <span>
              Response time
            </span>

            <strong>
              ${Number(ticket.responseTime || 0)} ms
            </strong>

          </div>

        </div>


        <div class="modal-section">

          <p class="label">
            AI RESPONSE
          </p>

          <div class="modal-answer">
            ${escapeHTML(ticket.answer || "No response available.")}
          </div>

        </div>


        <div class="modal-section">

          <p class="label">
            KNOWLEDGE USED
          </p>

          <div class="modal-knowledge">
            ${escapeHTML(knowledge)}
          </div>

        </div>


        <div class="modal-section">

          <p class="label">
            CURRENT STATUS
          </p>

          <div class="modal-status">
            ${escapeHTML(ticket.status || "Pending")}
          </div>

        </div>


        <div class="modal-actions">

          <button
            class="modal-secondary"
            onclick="closeReviewModal()"
          >
            Close
          </button>


          <button
            class="resolve-button"
            onclick="resolveFromReview('${escapeJS(ticket.id)}')"
          >
            Resolve Ticket
          </button>

        </div>

      </div>

    </div>
  `;


  document.body.appendChild(modal);


  // Close when clicking outside

  const overlay =
    modal.querySelector(
      ".review-modal-overlay"
    );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target === overlay
      ) {

        closeReviewModal();

      }

    }
  );
}


// ======================================
// RESOLVE FROM REVIEW
// ======================================

async function resolveFromReview(
  id
) {

  closeReviewModal();

  await updateTicketStatus(
    id,
    "Resolved"
  );
}


// ======================================
// CLOSE REVIEW MODAL
// ======================================

function closeReviewModal() {

  const modal =
    document.getElementById(
      "ticketReviewModal"
    );


  if (modal) {
    modal.remove();
  }
}


// ======================================
// UPDATE TICKET STATUS
// ======================================

async function updateTicketStatus(
  id,
  status
) {

  try {

    const response =
      await fetch(
        `/api/tickets/${encodeURIComponent(id)}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            status: status
          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Could not update ticket."
      );

    }


    await loadDashboard();


  } catch (error) {

    console.error(error);

    alert(
      "Could not update the ticket.\n\n" +
      error.message
    );

  }
}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}


// ======================================
// ESCAPE JAVASCRIPT STRING
// ======================================

function escapeJS(
  value
) {

  return String(value)
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /\r/g,
      "\\r"
    )
    .replace(
      /\n/g,
      "\\n"
    );
}