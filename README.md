# AI Support Operations

A knowledge-assisted AI customer support operations dashboard built with Node.js, Express, vanilla JavaScript, and Gemini.

## Features

- AI ticket classification and customer response generation
- Knowledge-base retrieval with relevance scoring
- Automatic resolution vs human escalation
- Human review queue and resolution workflow
- Persistent JSON ticket storage
- Live operational analytics
- Ticket search and status/category filters
- CSV export
- Admin authentication and protected APIs
- Responsive SaaS-style dashboard
- Health endpoint for deployment checks

## Local setup

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Add your Gemini API key and choose an admin username/password.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

Do not commit `.env` or API keys.

## Production notes

This project uses an in-memory session store and JSON files for persistence. For a real production deployment, replace those with a managed database and persistent session/auth infrastructure, add rate limiting, HTTPS, audit logs, and a proper secrets manager.
