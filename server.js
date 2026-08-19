const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const allowedOrigin = process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`;

app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "1mb" }));

const knowledgeBasePath = path.join(__dirname, "knowledge-base.json");
const ticketsPath = path.join(__dirname, "tickets.json");

let knowledgeBase = [];
try {
  knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, "utf8"));
  console.log(`Knowledge base loaded successfully: ${knowledgeBase.length} articles.`);
} catch (error) {
  console.error("Could not load knowledge-base.json:", error.message);
}

function loadTickets() {
  try {
    return JSON.parse(fs.readFileSync(ticketsPath, "utf8"));
  } catch (error) {
    console.error("Could not load tickets.json:", error.message);
    return [];
  }
}

function saveTickets(tickets) {
  const tempPath = `${ticketsPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(tickets, null, 2));
  fs.renameSync(tempPath, ticketsPath);
}

// --------------------------------------------------
// SIMPLE ADMIN SESSION AUTH
// --------------------------------------------------
// Credentials are supplied through .env. Sessions are
// intentionally memory-only for this portfolio project.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env");
}
const sessions = new Map();

const loginAttempts = new Map();

const LOGIN_WINDOW = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.set(ip, {
      firstAttempt: now,
      count: 1
    });
    return true;
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: "Authentication required." });
  }
  session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  next();
}

app.post("/api/auth/login", (req, res) => {
  const ip = req.ip;
  const { username, password } = req.body || {};

  // Only rate-limit attempts that are actually invalid.
  if (
    !safeEqual(username || "", ADMIN_USERNAME) ||
    !safeEqual(password || "", ADMIN_PASSWORD)
  ) {
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({
        error: "Too many login attempts. Try again later."
      });
    }

    return res.status(401).json({
      error: "Invalid username or password."
    });
  }

  // Successful login clears the failed-attempt counter.
  loginAttempts.delete(ip);

  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 8 * 60 * 60 * 1000
  });

  res.json({
    token,
    username: ADMIN_USERNAME,
    expiresIn: 8 * 60 * 60
  });
});

const knowledgeBasePath = path.join(__dirname, "knowledge-base.json");
const ticketsPath = path.join(__dirname, "tickets.json");

// ==================================================
// KNOWLEDGE BASE
// ==================================================

let knowledgeBase = [];

try {
  knowledgeBase = JSON.parse(
    fs.readFileSync(knowledgeBasePath, "utf8")
  );

  // Give older articles an ID if they don't already have one.
  let changed = false;

  knowledgeBase = knowledgeBase.map(article => {
    if (!article.id) {
      changed = true;

      return {
        ...article,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    return article;
  });

  if (changed) {
    fs.writeFileSync(
      knowledgeBasePath,
      JSON.stringify(knowledgeBase, null, 2)
    );
  }

  console.log(
    `Knowledge base loaded successfully: ${knowledgeBase.length} articles.`
  );
} catch (error) {
  console.error(
    "Could not load knowledge-base.json:",
    error.message
  );
}

// ==================================================
// TICKETS
// ==================================================

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
  const tempPath = `${ticketsPath}.tmp`;

  fs.writeFileSync(
    tempPath,
    JSON.stringify(tickets, null, 2)
  );

  fs.renameSync(tempPath, ticketsPath);
}

// ==================================================
// SIMPLE ADMIN SESSION AUTH
// ==================================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env"
  );
}

const sessions = new Map();
const loginAttempts = new Map();

const LOGIN_WINDOW = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.set(ip, {
      firstAttempt: now,
      count: 1
    });

    return true;
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  record.count += 1;

  return true;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  );
}

function getToken(req) {
  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt < Date.now()) {
    if (token) {
      sessions.delete(token);
    }

    return res.status(401).json({
      error: "Authentication required."
    });
  }

  session.expiresAt =
    Date.now() + 8 * 60 * 60 * 1000;

  next();
}

// ==================================================
// LOGIN
// ==================================================

app.post("/api/auth/login", (req, res) => {
  const ip = req.ip;

  const {
    username,
    password
  } = req.body || {};

  if (
    !safeEqual(username || "", ADMIN_USERNAME) ||
    !safeEqual(password || "", ADMIN_PASSWORD)
  ) {
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({
        error:
          "Too many login attempts. Try again later."
      });
    }

    return res.status(401).json({
      error: "Invalid username or password."
    });
  }

  loginAttempts.delete(ip);

  const token = crypto
    .randomBytes(32)
    .toString("hex");

  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt:
      Date.now() + 8 * 60 * 60 * 1000
  });

  res.json({
    token,
    username: ADMIN_USERNAME,
    expiresIn: 8 * 60 * 60
  });
});

// ==================================================
// LOGOUT
// ==================================================

app.post(
  "/api/auth/logout",
  requireAuth,
  (req, res) => {
    const token = getToken(req);

    if (token) {
      sessions.delete(token);
    }

    res.json({
      ok: true
    });
  }
);

// ==================================================
// CURRENT USER
// ==================================================

app.get(
  "/api/auth/me",
  requireAuth,
  (req, res) => {
    res.json({
      authenticated: true,
      username: ADMIN_USERNAME
    });
  }
);

// ==================================================
// KNOWLEDGE RETRIEVAL
// ==================================================

const STOP_WORDS = new Set([
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
  "very",
  "i",
  "a",
  "an",
  "to",
  "of",
  "in"
]);

const KEYWORD_MAP = {
  Authentication: [
    "login",
    "log",
    "signin",
    "sign",
    "password",
    "authentication",
    "authenticate",
    "account",
    "access",
    "locked"
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
    "money",
    "invoice",
    "duplicate"
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
    "system",
    "timeout"
  ],

  "How-to": [
    "how",
    "setup",
    "install",
    "configure",
    "instructions",
    "steps",
    "guide",
    "enable",
    "change"
  ]
};

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(
      word =>
        word.length > 2 &&
        !STOP_WORDS.has(word)
    );
}

function findRelevantKnowledge(
  ticket,
  limit = 3
) {
  const words = tokenize(ticket);
  const uniqueWords = new Set(words);

  return knowledgeBase
    .map(item => {
      const itemText =
        `${item.category} ${item.topic} ${item.answer}`
          .toLowerCase();

      const topicWords = tokenize(
        item.topic
      );

      let score = 0;
      let matched = [];

      for (const word of uniqueWords) {
        if (itemText.includes(word)) {
          score += 1;
          matched.push(word);
        }
      }

      for (const keyword of
        KEYWORD_MAP[item.category] || []) {
        if (uniqueWords.has(keyword)) {
          score += 4;
          matched.push(keyword);
        }
      }

      for (const word of topicWords) {
        if (uniqueWords.has(word)) {
          score += 3;
        }
      }

      return {
        ...item,
        score,
        matchedKeywords: [
          ...new Set(matched)
        ]
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ==================================================
// AI RESPONSE SCHEMA
// ==================================================

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
        "Confidence as a decimal between 0 and 1."
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
        "Short customer-facing response based only on supplied knowledge."
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

// ==================================================
// ANALYZE TICKET
// ==================================================

app.post(
  "/api/analyze",
  requireAuth,
  async (req, res) => {
    try {
      const ticket =
        typeof req.body?.ticket === "string"
          ? req.body.ticket.trim()
          : "";

      if (!ticket) {
        return res.status(400).json({
          error:
            "A valid ticket is required."
        });
      }

      if (ticket.length > 5000) {
        return res.status(400).json({
          error:
            "Ticket is too long. Keep it under 5,000 characters."
        });
      }

      const relevantKnowledge =
        findRelevantKnowledge(ticket);

      const knowledge = JSON.stringify(
        relevantKnowledge,
        null,
        2
      );

      const startTime = Date.now();

      const prompt = `
You are an AI support operations assistant.

Analyze this customer support ticket.

STRICT RULES:

1. Use ONLY information supported by the supplied knowledge base.
2. Never invent company policies.
3. Never promise a refund, credit, account change, security outcome, or technical fix unless explicitly supported.
4. If the knowledge base is insufficient, use category "Unknown" and escalate to a human.
5. Use simple, friendly language.
6. Billing, refunds, account security, data deletion, and other sensitive requests should be escalated.
7. Confidence must be a decimal between 0 and 1.
8. Keep the customer response concise.
9. Do not expose internal reasoning.
10. Billing/refund requests must say a support specialist needs to review them.

RELEVANT KNOWLEDGE BASE:

${knowledge}

CUSTOMER TICKET:

${ticket}
`;

      const response =
        await ai.models.generateContent({
          model:
            "gemini-3.5-flash-lite",

          contents: prompt,

          config: {
            responseMimeType:
              "application/json",

            responseSchema
          }
        });

      const responseTime =
        Date.now() - startTime;

      const analysis =
        JSON.parse(response.text);

      let confidence =
        Number(analysis.confidence);

      if (confidence <= 1) {
        confidence *= 100;
      }

      confidence = Math.max(
        0,
        Math.min(
          100,
          Math.round(confidence)
        )
      );

      analysis.confidence =
        confidence;

      const lowerTicket =
        ticket.toLowerCase();

      const isBillingRequest =
        /refund|charged|payment|billing|invoice|subscription/
          .test(lowerTicket);

      const isSensitive =
        /delete my data|delete account|security|hack|stolen|identity|password reset/
          .test(lowerTicket);

      if (isBillingRequest) {
        analysis.escalate = true;

        analysis.risk =
          analysis.risk === "Low"
            ? "Medium"
            : analysis.risk;

        analysis.answer =
          "I'm sorry you're dealing with this billing issue. I've flagged your request for a support specialist to review. They can check your account and advise you on the appropriate next step.";
      }

      if (isSensitive) {
        analysis.escalate = true;
      }

      if (
        !relevantKnowledge.length ||
        analysis.category === "Unknown"
      ) {
        analysis.escalate = true;
      }

      if (confidence < 70) {
        analysis.escalate = true;
      }

      const tickets =
        loadTickets();

      const ticketRecord = {
        id: `T-${Date.now()}`,

        ticket,

        category:
          analysis.category,

        confidence,

        risk:
          analysis.risk,

        answer:
          analysis.answer,

        escalate:
          Boolean(
            analysis.escalate
          ),

        status:
          analysis.escalate
            ? "Pending"
            : "Resolved",

        responseTime,

        retrievedKnowledge:
          relevantKnowledge.map(
            item => item.topic
          ),

        knowledgeScores:
          relevantKnowledge.map(
            item => ({
              topic: item.topic,
              category: item.category,
              score: item.score
            })
          ),

        createdAt:
          new Date().toISOString(),

        resolvedAt:
          analysis.escalate
            ? null
            : new Date().toISOString(),

        resolvedBy:
          analysis.escalate
            ? null
            : "AI"
      };

      tickets.unshift(
        ticketRecord
      );

      saveTickets(tickets);

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
        "AI request failed:",
        error
      );

      res.status(500).json({
        error:
          "Something went wrong while analyzing the ticket."
      });
    }
  }
);

// ==================================================
// TICKETS
// ==================================================

app.get(
  "/api/tickets",
  requireAuth,
  (req, res) =>
    res.json(loadTickets())
);

app.get(
  "/api/escalations",
  requireAuth,
  (req, res) => {
    const tickets =
      loadTickets();

    res.json(
      tickets.filter(
        ticket =>
          ticket.escalate === true &&
          ticket.status !== "Resolved"
      )
    );
  }
);

// ==================================================
// UPDATE TICKET STATUS
// ==================================================

app.patch(
  "/api/tickets/:id",
  requireAuth,
  (req, res) => {
    try {
      const allowedStatuses = [
        "Pending",
        "In Review",
        "Resolved"
      ];

      const status =
        req.body?.status;

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

      if (
        status === "Resolved"
      ) {
        ticket.resolvedAt =
          new Date().toISOString();

        ticket.resolvedBy =
          ticket.escalate
            ? "Human"
            : "AI";
      } else {
        ticket.resolvedAt =
          null;

        ticket.resolvedBy =
          null;
      }

      saveTickets(tickets);

      res.json(ticket);
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

// ==================================================
// ANALYTICS
// ==================================================

app.get(
  "/api/analytics",
  requireAuth,
  (req, res) => {
    const tickets =
      loadTickets();

    const processed =
      tickets.length;

    const automated =
      tickets.filter(
        t =>
          t.escalate === false
      ).length;

    const escalated =
      tickets.filter(
        t =>
          t.escalate === true
      ).length;

    const resolved =
      tickets.filter(
        t =>
          t.status === "Resolved"
      ).length;

    const pending =
      tickets.filter(
        t =>
          t.status !== "Resolved"
      ).length;

    const totalResponse =
      tickets.reduce(
        (sum, t) =>
          sum +
          Number(
            t.responseTime || 0
          ),
        0
      );

    const avgResponse =
      processed
        ? Math.round(
            totalResponse /
              processed
          )
        : 0;

    const categories =
      tickets.reduce(
        (acc, t) => {
          const category =
            t.category ||
            "Unknown";

          acc[category] =
            (acc[category] || 0) +
            1;

          return acc;
        },
        {}
      );

    res.json({
      processed,

      automated,

      escalated,

      resolved,

      pending,

      automationRate:
        processed
          ? Math.round(
              (automated /
                processed) *
                100
            )
          : 0,

      resolutionRate:
        processed
          ? Math.round(
              (resolved /
                processed) *
                100
            )
          : 0,

      escalationRate:
        processed
          ? Math.round(
              (escalated /
                processed) *
                100
            )
          : 0,

      averageResponseTime:
        avgResponse,

      categories
    });
  }
);

// ==================================================
// KNOWLEDGE BASE - GET
// ==================================================

app.get(
  "/api/knowledge",
  requireAuth,
  (req, res) => {
    res.json(
      knowledgeBase
    );
  }
);

// ==================================================
// KNOWLEDGE BASE - CREATE
// ==================================================

app.post(
  "/api/knowledge",
  requireAuth,
  (req, res) => {
    try {
      const {
        category,
        topic,
        answer
      } = req.body || {};

      if (
        !category ||
        !topic ||
        !answer
      ) {
        return res.status(400).json({
          error:
            "Category, topic and answer are required."
        });
      }

      const article = {
        id: crypto.randomUUID(),

        category:
          String(category).trim(),

        topic:
          String(topic).trim(),

        answer:
          String(answer).trim(),

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString()
      };

      knowledgeBase.push(
        article
      );

      fs.writeFileSync(
        knowledgeBasePath,
        JSON.stringify(
          knowledgeBase,
          null,
          2
        )
      );

      res.status(201).json(
        article
      );
    } catch (error) {
      console.error(
        "Could not create knowledge article:",
        error
      );

      res.status(500).json({
        error:
          "Could not create knowledge article."
      });
    }
  }
);

// ==================================================
// KNOWLEDGE BASE - UPDATE
// ==================================================

app.patch(
  "/api/knowledge/:id",
  requireAuth,
  (req, res) => {
    try {
      const article =
        knowledgeBase.find(
          item =>
            item.id ===
            req.params.id
        );

      if (!article) {
        return res.status(404).json({
          error:
            "Knowledge article not found."
        });
      }

      const {
        category,
        topic,
        answer
      } = req.body || {};

      if (
        category !== undefined
      ) {
        article.category =
          String(
            category
          ).trim();
      }

      if (
        topic !== undefined
      ) {
        article.topic =
          String(
            topic
          ).trim();
      }

      if (
        answer !== undefined
      ) {
        article.answer =
          String(
            answer
          ).trim();
      }

      article.updatedAt =
        new Date().toISOString();

      fs.writeFileSync(
        knowledgeBasePath,
        JSON.stringify(
          knowledgeBase,
          null,
          2
        )
      );

      res.json(
        article
      );
    } catch (error) {
      console.error(
        "Could not update knowledge article:",
        error
      );

      res.status(500).json({
        error:
          "Could not update knowledge article."
      });
    }
  }
);

// ==================================================
// KNOWLEDGE BASE - DELETE
// ==================================================

app.delete(
  "/api/knowledge/:id",
  requireAuth,
  (req, res) => {
    try {
      const index =
        knowledgeBase.findIndex(
          item =>
            item.id ===
            req.params.id
        );

      if (index === -1) {
        return res.status(404).json({
          error:
            "Knowledge article not found."
        });
      }

      const deleted =
        knowledgeBase.splice(
          index,
          1
        )[0];

      fs.writeFileSync(
        knowledgeBasePath,
        JSON.stringify(
          knowledgeBase,
          null,
          2
        )
      );

      res.json({
        success: true,
        deleted
      });
    } catch (error) {
      console.error(
        "Could not delete knowledge article:",
        error
      );

      res.status(500).json({
        error:
          "Could not delete knowledge article."
      });
    }
  }
);

// ==================================================
// EXPORT TICKETS CSV
// ==================================================

app.get(
  "/api/export/tickets.csv",
  requireAuth,
  (req, res) => {
    const tickets =
      loadTickets();

    const headers = [
      "id",
      "ticket",
      "category",
      "confidence",
      "risk",
      "status",
      "responseType",
      "responseTime",
      "knowledge",
      "createdAt",
      "resolvedAt"
    ];

    const csvCell =
      value =>
        `"${String(
          value ?? ""
        ).replace(
          /"/g,
          '""'
        )}"`;

    const rows =
      tickets.map(
        ticket =>
          [
            ticket.id,
            ticket.ticket,
            ticket.category,
            ticket.confidence,
            ticket.risk,
            ticket.status,

            ticket.escalate
              ? "Human"
              : "AI",

            ticket.responseTime,

            (
              ticket.retrievedKnowledge ||
              []
            ).join(" | "),

            ticket.createdAt,

            ticket.resolvedAt ||
              ""
          ]
            .map(csvCell)
            .join(",")
      );

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="support-tickets.csv"'
    );

    res.send(
      [
        headers.join(","),
        ...rows
      ].join("\n")
    );
  }
);

// ==================================================
// HEALTH
// ==================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "online",
      knowledgeBase:
        knowledgeBase.length,
      tickets:
        loadTickets().length,
      auth: true
    });
  }
);

// ==================================================
// STATIC FRONTEND
// ==================================================

app.use(
  express.static(__dirname)
);

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  HOST,
  () => {
    console.log(
      `AI Support Agent running at http://localhost:${PORT}`
    );

    console.log(
      `Admin username: ${ADMIN_USERNAME}`
    );

    if (
      ADMIN_PASSWORD ===
      "change-me"
    ) {
      console.warn(
        "WARNING: Set ADMIN_PASSWORD in .env before deployment."
      );
    }
  }
);
app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = getToken(req);
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ authenticated: true, username: ADMIN_USERNAME });
});

// --------------------------------------------------
// KNOWLEDGE RETRIEVAL
// --------------------------------------------------
const STOP_WORDS = new Set([
  "the","and","for","you","your","with","this","that","what","when","where","how","why",
  "can","could","would","should","please","from","have","has","was","were","are","is","my",
  "our","they","them","about","into","just","not","but","too","very","i","a","an","to","of","in"
]);

const KEYWORD_MAP = {
  Authentication: ["login","log","signin","sign","password","authentication","authenticate","account","access","locked"],
  Billing: ["billing","bill","payment","paid","charge","charged","refund","subscription","money","invoice","duplicate"],
  Technical: ["api","server","error","integration","technical","bug","broken","connection","configuration","system","timeout"],
  "How-to": ["how","setup","install","configure","instructions","steps","guide","enable","change"]
};

function tokenize(text) {
  return String(text).toLowerCase().replace(/[^\w\s-]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function findRelevantKnowledge(ticket, limit = 3) {
  const words = tokenize(ticket);
  const uniqueWords = new Set(words);

  return knowledgeBase
    .map(item => {
      const itemText = `${item.category} ${item.topic} ${item.answer}`.toLowerCase();
      const topicWords = tokenize(item.topic);
      let score = 0;
      let matched = [];

      for (const word of uniqueWords) {
        if (itemText.includes(word)) {
          score += 1;
          matched.push(word);
        }
      }

      for (const keyword of KEYWORD_MAP[item.category] || []) {
        if (uniqueWords.has(keyword)) {
          score += 4;
          matched.push(keyword);
        }
      }

      for (const word of topicWords) {
        if (uniqueWords.has(word)) score += 3;
      }

      return {
        ...item,
        score,
        matchedKeywords: [...new Set(matched)]
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const responseSchema = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["Authentication", "Billing", "Technical", "How-to", "Unknown"] },
    confidence: { type: "number", description: "Confidence as a decimal between 0 and 1." },
    risk: { type: "string", enum: ["Low", "Medium", "High"] },
    answer: { type: "string", description: "Short customer-facing response based only on supplied knowledge." },
    escalate: { type: "boolean" }
  },
  required: ["category", "confidence", "risk", "answer", "escalate"]
};

// --------------------------------------------------
// ANALYZE
// --------------------------------------------------
app.post("/api/analyze", requireAuth, async (req, res) => {
  try {
    const ticket = typeof req.body?.ticket === "string" ? req.body.ticket.trim() : "";
    if (!ticket) return res.status(400).json({ error: "A valid ticket is required." });
    if (ticket.length > 5000) return res.status(400).json({ error: "Ticket is too long. Keep it under 5,000 characters." });

    const relevantKnowledge = findRelevantKnowledge(ticket);
    const knowledge = JSON.stringify(relevantKnowledge, null, 2);
    const startTime = Date.now();

    const prompt = `
You are an AI support operations assistant.

Analyze this customer support ticket.

STRICT RULES:
1. Use ONLY information supported by the supplied knowledge base.
2. Never invent company policies.
3. Never promise a refund, credit, account change, security outcome, or technical fix unless explicitly supported.
4. If the knowledge base is insufficient, use category "Unknown" and escalate to a human.
5. Use simple, friendly language.
6. Billing, refunds, account security, data deletion, and other sensitive requests should be escalated.
7. Confidence must be a decimal between 0 and 1.
8. Keep the customer response concise.
9. Do not expose internal reasoning.
10. Billing/refund requests must say a support specialist needs to review them.

RELEVANT KNOWLEDGE BASE:
${knowledge}

CUSTOMER TICKET:
${ticket}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema }
    });

    const responseTime = Date.now() - startTime;
    const analysis = JSON.parse(response.text);

    let confidence = Number(analysis.confidence);
    if (confidence <= 1) confidence *= 100;
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));
    analysis.confidence = confidence;

    const lowerTicket = ticket.toLowerCase();
    const isBillingRequest = /refund|charged|payment|billing|invoice|subscription/.test(lowerTicket);
    const isSensitive = /delete my data|delete account|security|hack|stolen|identity|password reset/.test(lowerTicket);

    if (isBillingRequest) {
      analysis.escalate = true;
      analysis.risk = analysis.risk === "Low" ? "Medium" : analysis.risk;
      analysis.answer = "I'm sorry you're dealing with this billing issue. I've flagged your request for a support specialist to review. They can check your account and advise you on the appropriate next step.";
    }

    if (isSensitive) analysis.escalate = true;
    if (!relevantKnowledge.length || analysis.category === "Unknown") analysis.escalate = true;
    if (confidence < 70) analysis.escalate = true;

    const tickets = loadTickets();
    const ticketRecord = {
      id: `T-${Date.now()}`,
      ticket,
      category: analysis.category,
      confidence,
      risk: analysis.risk,
      answer: analysis.answer,
      escalate: Boolean(analysis.escalate),
      status: analysis.escalate ? "Pending" : "Resolved",
      responseTime,
      retrievedKnowledge: relevantKnowledge.map(item => item.topic),
      knowledgeScores: relevantKnowledge.map(item => ({ topic: item.topic, category: item.category, score: item.score })),
      createdAt: new Date().toISOString(),
      resolvedAt: analysis.escalate ? null : new Date().toISOString(),
      resolvedBy: analysis.escalate ? null : "AI"
    };

    tickets.unshift(ticketRecord);
    saveTickets(tickets);

    res.json({ ...analysis, responseTime, ticketId: ticketRecord.id, retrievedKnowledge: ticketRecord.retrievedKnowledge });
  } catch (error) {
    console.error("AI request failed:", error);
    res.status(500).json({ error: "Something went wrong while analyzing the ticket." });
  }
});

// --------------------------------------------------
// TICKETS / ANALYTICS
// --------------------------------------------------
app.get("/api/tickets", requireAuth, (req, res) => res.json(loadTickets()));

app.get("/api/escalations", requireAuth, (req, res) => {
  const tickets = loadTickets();
  res.json(tickets.filter(t => t.escalate === true && t.status !== "Resolved"));
});

app.patch("/api/tickets/:id", requireAuth, (req, res) => {
  try {
    const allowedStatuses = ["Pending", "In Review", "Resolved"];
    const status = req.body?.status;
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: "Invalid ticket status." });

    const tickets = loadTickets();
    const ticket = tickets.find(item => item.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    ticket.status = status;
    if (status === "Resolved") {
      ticket.resolvedAt = new Date().toISOString();
      ticket.resolvedBy = ticket.escalate ? "Human" : "AI";
    } else {
      ticket.resolvedAt = null;
      ticket.resolvedBy = null;
    }

    saveTickets(tickets);
    res.json(ticket);
  } catch (error) {
    console.error("Could not update ticket:", error);
    res.status(500).json({ error: "Could not update ticket." });
  }
});

app.get("/api/analytics", requireAuth, (req, res) => {
  const tickets = loadTickets();
  const processed = tickets.length;
  const automated = tickets.filter(t => t.escalate === false).length;
  const escalated = tickets.filter(t => t.escalate === true).length;
  const resolved = tickets.filter(t => t.status === "Resolved").length;
  const pending = tickets.filter(t => t.status !== "Resolved").length;
  const totalResponse = tickets.reduce((sum, t) => sum + Number(t.responseTime || 0), 0);
  const avgResponse = processed ? Math.round(totalResponse / processed) : 0;
  const categories = tickets.reduce((acc, t) => { acc[t.category || "Unknown"] = (acc[t.category || "Unknown"] || 0) + 1; return acc; }, {});

  res.json({
    processed,
    automated,
    escalated,
    resolved,
    pending,
    automationRate: processed ? Math.round((automated / processed) * 100) : 0,
    resolutionRate: processed ? Math.round((resolved / processed) * 100) : 0,
    escalationRate: processed ? Math.round((escalated / processed) * 100) : 0,
    averageResponseTime: avgResponse,
    categories
  });
});

app.get("/api/knowledge", requireAuth, (req, res) => {
  res.json(knowledgeBase);
});

app.get("/api/export/tickets.csv", requireAuth, (req, res) => {
  const tickets = loadTickets();
  const headers = ["id","ticket","category","confidence","risk","status","responseType","responseTime","knowledge","createdAt","resolvedAt"];
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = tickets.map(t => [
    t.id, t.ticket, t.category, t.confidence, t.risk, t.status,
    t.escalate ? "Human" : "AI", t.responseTime,
    (t.retrievedKnowledge || []).join(" | "), t.createdAt, t.resolvedAt || ""
  ].map(csvCell).join(","));

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="support-tickets.csv"');
  res.send([headers.join(","), ...rows].join("\n"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "online", knowledgeBase: knowledgeBase.length, tickets: loadTickets().length, auth: true });
});

app.use(express.static(__dirname));

app.listen(PORT, HOST, () => {
  console.log(`AI Support Agent running at http://localhost:${PORT}`);
  console.log(`Admin username: ${ADMIN_USERNAME}`);
  if (ADMIN_PASSWORD === "change-me") console.warn("WARNING: Set ADMIN_PASSWORD in .env before deployment.");
});
