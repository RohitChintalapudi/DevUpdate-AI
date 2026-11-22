# DevUpdate AI — Phase 1

AI-Powered GitHub Dependency Intelligence Platform (foundation and authentication phase).

## What is included

- Premium responsive landing page
- Login, signup and forgot-password screens
- Full dark dashboard with 8 sections and illustrative data
- Express + MongoDB authentication with JWT, HTTP-only cookies, CSRF protection and rate limiting
- Reusable component library and design system

## Quick start

### 1. Backend

```bash
cd server
cp .env.example .env   # Windows: Copy-Item .env.example .env
npm install
npm run dev
```

Requires a running MongoDB instance or a MongoDB Atlas connection string in `server/.env`.

### 2. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173.

## Phase 2+ (not included)

GitHub authorisation, dependency extraction, Firecrawl, package registry monitoring, RAG,
LangChain, LangGraph, Memento memory and PDF report exports are intentionally not implemented.
