@'
# AI Support Operations

A production-style AI-powered customer support operations console built with Node.js, Express, vanilla JavaScript, and Google Gemini.

## Live Demo

https://ai-support-operations-k0hp.onrender.com/

## Features

- AI-powered customer support ticket analysis
- Authentication / protected dashboard
- Ticket classification:
  - Authentication
  - Billing
  - Technical
  - How-to
  - Unknown
- Knowledge-base-assisted responses
- Confidence and risk scoring
- Human escalation workflow
- Billing and sensitive-request safety guards
- Ticket history
- Search and filtering
- CSV export
- Operations analytics
- Resolution and escalation metrics
- Human review queue
- Review and resolve workflow
- Light / dark mode
- Keyboard shortcuts
- Responsive mobile layout
- Persistent JSON ticket and knowledge-base storage
- Playwright end-to-end testing
- GitHub Actions CI
- Render deployment

## Architecture

```text
Browser
   |
   v
HTML / CSS / JavaScript
   |
   v
Express API
   |
   +---- Authentication
   |
   +---- Knowledge Retrieval
   |
   +---- Ticket Storage
   |
   +---- Analytics
   |
   v
Google Gemini