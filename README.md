# AI Support Operations

A production-style AI-powered customer support operations console for classifying, analyzing, resolving, and routing support tickets.

## 🚀 Live Demo

**Live Application:** https://ai-support-operations-k0hp.onrender.com

## Overview

AI Support Operations is a full-stack support agent dashboard designed to demonstrate how AI-assisted customer support workflows can be organized into a practical operations console.

The application allows support agents to:

- Authenticate securely
- Submit customer support tickets
- Classify tickets automatically
- Generate customer-facing responses
- Identify ticket risk
- Recommend human escalation
- Track operational metrics
- Review ticket history
- Search and filter tickets
- Export ticket data
- Review escalated tickets
- Switch between light and dark themes
- Use keyboard shortcuts
- Use the dashboard on mobile devices

## Features

### Authentication

- Environment-based admin credentials
- Session-based authentication
- Protected API routes
- Login rate limiting
- Secure logout
- Session expiration

### AI Ticket Analysis

Tickets are analyzed and classified into categories such as:

- Authentication
- Billing
- Technical
- How-to

The analysis provides:

- Category
- Confidence
- Risk level
- Response time
- Knowledge usage
- Customer response
- Escalation recommendation
- Ticket ID

### Operations Dashboard

The dashboard provides operational information including:

- Tickets processed
- Automated tickets
- Escalated tickets
- Automation rate
- Resolution rate
- Escalation rate
- Average response time
- Pending work
- Category distribution

### Human Review

Tickets requiring human attention are placed into a review queue.

Agents can open ticket details and review customer requests before taking action.

### Ticket History

The application provides:

- Ticket history
- Search
- Status filtering
- Category filtering
- Refresh
- CSV export

### UI

- Responsive design
- Mobile support
- Light mode
- Dark mode
- Keyboard shortcuts
- Accessible interface elements
- Clean operations-console layout

## Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### AI

- Google Gemini API

### Testing

- Playwright
- Chromium
- Automated regression testing
- GitHub Actions CI

### Development

- Git
- GitHub
- VS Code
- Render

## Automated Testing

The project includes a Playwright regression suite covering:

- Authentication
- Dashboard loading
- Ticket analysis
- AI results
- Metrics
- Analytics
- Ticket history
- Search and filters
- Dark/light mode
- Keyboard shortcuts
- CSV export
- Review modal
- Logout
- Mobile responsiveness

Tests automatically run through GitHub Actions on pushes to the `main` branch.

## Project Structure

```text
ai-support-operations/
│
├── index.html
├── style.css
├── script.js
│
├── server.js
├── knowledge-base.json
├── tickets.json
│
├── tests/
│   └── support-agent.spec.js
│
├── .github/
│   └── workflows/
│       └── tests.yml
│
├── package.json
├── package-lock.json
├── playwright.config.js
├── README.md
└── .gitignore