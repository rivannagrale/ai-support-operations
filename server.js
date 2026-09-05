const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const PORT = 3000;

// ================================
// GEMINI
// ================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ================================
// EXPRESS SETUP
// ================================

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ================================
// FILE PATHS
// ================================

const knowledgeBasePath = path.join(
  __dirname,
  "knowledge-base.json"
);

const ticketsPath = path.join(
  __dirname,
  "tickets.json"
);

// ================================
// LOAD KNOWLEDGE BASE
// ================================

let knowledgeBase = [];

try {
  knowledgeBase = JSON.parse(
    fs.readFileSync(knowledgeBasePath, "utf8")
  );

  console.log("Knowledge base loaded successfully.");
} catch (error) {
  console.error(
    "Could not load knowledge-base.json:",
    error.message
  );
}

// ================================
// TICKET STORAGE
// ================================

function loadTickets() {
  try {
    return JSON.parse(
      fs.readFileSync(ticketsPath, "utf8")
    );
  } catch (error) {
    console.error(
      "Could not load tickets.json:",
      error.message
    );

    return [];
  }
}

function saveTickets(tickets) {
  fs.writeFileSync(
    ticketsPath,
    JSON.stringify(tickets, null, 2)
  );
}

// ================================
// KNOWLEDGE RETRIEVAL
// ================================

function findRelevantKnowledge(ticket, limit = 3) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "you",
    "your",
    "with",
    "this",
    "that",
    "what",
    "when",
    "where",
    "how",
    "why",
    "can",
    "could",
    "would",
    "should",
    "please",
    "from",
    "have",
    "has",
    "was",
    "were",
    "are",
    "is",
    "my",
    "our",
    "they",
    "them",
    "about",
    "into",
    "just",
    "not",
    "but",
    "too",
    "very"
  ]);

  const words = ticket
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(
      word =>
        word.length > 2 &&
        !stopWords.has(word)
    );

  const keywordMap = {
    Authentication: [
      "login",
      "log",
      "signin",
      "sign",
      "password",
      "authentication",
      "authenticate",
      "account",
      "access"
    ],

    Billing: [
      "billing",
      "bill",
      "payment",
      "paid",
      "charge",
      "charged",
      "refund",
      "subscription",
      "money"
    ],

    Technical: [
      "api",
      "server",
      "error",
      "integration",
      "technical",
      "bug",
      "broken",
      "connection",
      "configuration",
      "system"
    ],

    "How-to": [
      "how",
      "setup",
      "install",
      "configure",
      "instructions",
      "steps"
    ]
  };

  const scored = knowledgeBase.map(item => {
    const text = `
      ${item.category}
      ${item.topic}
      ${item.answer}
    `.toLowerCase();

    let score = 0;

    // General word matching
    for (const word of words) {
      if (text.includes(word)) {
        score += 1;
      }
    }

    // Category keyword matching
    const categoryKeywords =
      keywordMap[item.category] || [];

    for (const keyword of categoryKeywords) {
      if (words.includes(keyword)) {
        score += 4;
      }
    }

    // Topic matching
    const topicWords = item.topic
      .toLowerCase()
      .split(/\s+/);

    for (const word of topicWords) {
      if (words.includes(word)) {
        score += 3;
      }
    }

    return {
      ...item,
      score
    };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ================================
// GEMINI RESPONSE SCHEMA
// ================================

const responseSchema = {
  type: "object",

  properties: {
    category: {
      type: "string",
      enum: [
        "Authentication",
        "Billing",
        "Technical",
        "How-to",
        "Unknown"
      ]
    },

    confidence: {
      type: "number",
      description:
        "Confidence as a decimal between 0 and 1. Example: 0.95 means 95 percent."
    },

    risk: {
      type: "string",
      enum: [
        "Low",
        "Medium",
        "High"
      ]
    },

    answer: {
      type: "string",
      description:
        "Short, friendly customer-facing response based only on the supplied knowledge."
    },

    escalate: {
      type: "boolean"
    }
  },

  required: [
    "category",
    "confidence",
    "risk",
    "answer",
    "escalate"
  ]
};

// ================================
// ANALYZE TICKET
// ================================

app.post("/api/analyze", async (req, res) => {
  try {
    const { ticket } = req.body;

    if (
      !ticket ||
      typeof ticket !== "string"
    ) {
      return res.status(400).json({
        error: "A valid ticket is required."
      });
    }

    // ----------------------------
    // RETRIEVE KNOWLEDGE
    // ----------------------------

    const relevantKnowledge =
      findRelevantKnowledge(ticket);

    const knowledge = JSON.stringify(
      relevantKnowledge,
      null,
      2
    );

    console.log(
      "Relevant knowledge:",
      relevantKnowledge.map(
        item => item.topic
      )
    );

    // ----------------------------
    // AI PROMPT
    // ----------------------------

    const prompt = `
You are an AI support operations assistant.

Analyze this customer support ticket.

STRICT RULES:

1. Use ONLY information supported by the supplied knowledge base.

2. Never invent company policies.

3. Never promise a refund, credit, account change,
   security outcome, or technical fix unless the
   knowledge base explicitly supports that claim.

4. If the supplied knowledge base is insufficient,
   use category "Unknown" and escalate to a human.

5. Use simple, friendly language.

6. Billing, refunds, account security, data deletion,
   and other sensitive requests should be escalated.

7. Confidence must be a decimal between 0 and 1.

8. Keep the customer response concise.

9. Do not expose internal reasoning.

10. For billing or refund requests, explain that a
    support specialist needs to review the request.
    Never promise that a refund will be approved.

RELEVANT KNOWLEDGE BASE:

${knowledge}

CUSTOMER TICKET:

${ticket}
`;

    // ----------------------------
    // CALL GEMINI
    // ----------------------------

    const startTime = Date.now();

    const response =
      await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          responseMimeType:
            "application/json",

          responseSchema:
            responseSchema
        }
      });

    const responseTime =
      Date.now() - startTime;

    console.log(
      `AI response time: ${responseTime}ms`
    );

    // ----------------------------
    // PARSE AI RESPONSE
    // ----------------------------

    const analysis =
      JSON.parse(response.text);

    // ----------------------------
    // NORMALIZE CONFIDENCE
    // ----------------------------

    let confidence =
      Number(analysis.confidence);

    if (confidence <= 1) {
      confidence =
        confidence * 100;
    }

    confidence =
      Math.round(confidence);

    confidence = Math.max(
      0,
      Math.min(100, confidence)
    );

    analysis.confidence =
      confidence;

    // ----------------------------
    // BILLING SAFETY GUARD
    // ----------------------------

    const lowerTicket =
      ticket.toLowerCase();

    const isBillingRequest =
      lowerTicket.includes("refund") ||
      lowerTicket.includes("charged") ||
      lowerTicket.includes("payment") ||
      lowerTicket.includes("billing");

    if (isBillingRequest) {
      analysis.escalate = true;

      analysis.answer =
        "I'm sorry you're dealing with this billing issue. " +
        "I've flagged your request for a support specialist " +
        "to review. They can check your account and advise " +
        "you on the appropriate next step.";
    }

    // ----------------------------
    // SAVE TICKET
    // ----------------------------

    const tickets =
      loadTickets();

    const ticketRecord = {
      id: `T-${Date.now()}`,

      ticket: ticket,

      category:
        analysis.category,

      confidence:
        analysis.confidence,

      risk:
        analysis.risk,

      answer:
        analysis.answer,

      escalate:
        analysis.escalate,

      status:
        analysis.escalate
          ? "Pending"
          : "Resolved",

      responseTime:
        responseTime,

      retrievedKnowledge:
        relevantKnowledge.map(
          item => item.topic
        ),

      createdAt:
        new Date().toISOString()
    };

    tickets.unshift(
      ticketRecord
    );

    saveTickets(
      tickets
    );

    console.log(
      `Ticket ${ticketRecord.id} saved.`
    );

    // ----------------------------
    // SEND RESULT TO FRONTEND
    // ----------------------------

    res.json({
      ...analysis,

      responseTime,

      ticketId:
        ticketRecord.id,

      retrievedKnowledge:
        ticketRecord.retrievedKnowledge
    });

  } catch (error) {

    console.error(
      "Gemini request failed:",
      error
    );

    res.status(500).json({
      error:
        "Something went wrong while analyzing the ticket."
    });
  }
});

// ================================
// GET ALL TICKETS
// ================================

app.get("/api/tickets", (req, res) => {
  try {
    const tickets =
      loadTickets();

    res.json(
      tickets
    );

  } catch (error) {

    console.error(
      "Could not retrieve tickets:",
      error
    );

    res.status(500).json({
      error:
        "Could not retrieve tickets."
    });
  }
});

// ================================
// GET ESCALATED TICKETS
// ================================

app.get(
  "/api/escalations",
  (req, res) => {
    try {

      const tickets =
        loadTickets();

      const escalations =
        tickets.filter(
          ticket =>
            ticket.escalate === true &&
            ticket.status !== "Resolved"
        );

      res.json(
        escalations
      );

    } catch (error) {

      console.error(
        "Could not retrieve escalations:",
        error
      );

      res.status(500).json({
        error:
          "Could not retrieve escalations."
      });
    }
  }
);

// ================================
// UPDATE TICKET STATUS
// ================================

app.patch(
  "/api/tickets/:id",
  (req, res) => {

    try {

      const { status } =
        req.body;

      const allowedStatuses = [
        "Pending",
        "In Review",
        "Resolved"
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid ticket status."
        });
      }

      const tickets =
        loadTickets();

      const ticket =
        tickets.find(
          item =>
            item.id ===
            req.params.id
        );

      if (!ticket) {
        return res.status(404).json({
          error:
            "Ticket not found."
        });
      }

      ticket.status =
        status;

      saveTickets(
        tickets
      );

      console.log(
        `Ticket ${ticket.id} updated to ${status}.`
      );

      res.json(
        ticket
      );

    } catch (error) {

      console.error(
        "Could not update ticket:",
        error
      );

      res.status(500).json({
        error:
          "Could not update ticket."
      });
    }
  }
);

// ================================
// HEALTH CHECK
// ================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "online",
      knowledgeBase:
        knowledgeBase.length,
      tickets:
        loadTickets().length
    });
  }
);

// ================================
// START SERVER
// ================================

app.listen(
  PORT,
  () => {
    console.log(
      `AI Support Agent running at http://localhost:${PORT}`
    );
  }
);