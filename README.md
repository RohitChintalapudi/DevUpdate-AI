# DevUpdate AI

**AI-Powered GitHub Dependency Intelligence Platform**

Phase 1 is complete: a premium responsive marketing site, full authentication flow, and a
production-style dark dashboard backed by Express, MongoDB and JWT sessions.

---

## Completed features

### Frontend

- Premium landing page with animated hero, illustrative dashboard preview, six feature cards,
  four-step workflow, traditional vs DevUpdate comparison, technology chips, final CTA and footer.
- Glass sticky navigation with animated mobile hamburger menu.
- Split-screen login, signup and forgot-password pages with validation, password strength meter,
  password visibility toggles, loading/error/success states.
- Protected dashboard with collapsible desktop sidebar, mobile drawer, topbar, breadcrumb, search,
  notifications and profile dropdown.
- Eight dashboard sections: Overview, My Repositories, Dependencies, Update Intelligence,
  AI Recommendations, Memento Memory, Reports and Settings.
- Recharts visualisations, activity timeline, AI insight card, skeleton-friendly empty states and
  accessible modals/dropdowns.
- Reusable component library: Button, Card, Badge, Input, Modal, Dropdown, Sidebar, Navbar,
  StatCard, EmptyState, LoadingSpinner, PageHeader and more.
- Framer Motion page transitions, scroll reveals and hover interactions; CSS-driven gradients,
  grid patterns and glow effects. `prefers-reduced-motion` is respected.
- Responsive layouts for desktop, laptop, tablet and mobile; no page-level horizontal overflow.

### Backend

- Express 5 API with Helmet, CORS, cookie-parser and express-rate-limit.
- MongoDB/Mongoose user model with bcryptjs password hashing (12 salt rounds).
- JWT authentication in an HTTP-only, SameSite cookie; signup, login, logout, current user,
  session bootstrap and profile update endpoints.
- Double-submit cookie CSRF protection on all state-changing requests.
- Centralised validation, async error handling, duplicate-email handling and safe error responses.
- No secrets are exposed to the frontend; `.env` files are git-ignored.

### Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | API health check |
| GET | `/api/auth/csrf` | Issue CSRF cookie |
| GET | `/api/auth/session` | Public bootstrap session check (always 200) |
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Protected current-user endpoint |
| PATCH | `/api/auth/me` | Protected profile update |

---

## Final folder structure

```
DevUpdate-AI/
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── landing/
│       │   └── dashboard/
│       ├── layouts/
│       ├── pages/
│       │   └── dashboard/
│       ├── context/
│       ├── hooks/
│       ├── services/
│       ├── data/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
└── server/
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── services/
    ├── utils/
    └── server.js
```

---

## Installation

### Backend

```bash
cd server
npm install
Copy-Item .env.example .env    # edit MONGO_URI, JWT_SECRET, CLIENT_URL
npm run dev
```

MongoDB Atlas connection strings are supported. Use a long random `JWT_SECRET` in production, and
set `COOKIE_SECURE=true` when serving over HTTPS.

### Frontend

```bash
cd client
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://localhost:5173>. The API defaults to <http://localhost:5000/api>.

### Production build / lint

```bash
cd client
npm run build
npm run lint
```

---

## Verification performed

- Production build and ESLint pass with no errors.
- Landing page renders with no console errors and no horizontal overflow.
- Signup saves a bcrypt-hashed password to MongoDB and redirects to the dashboard.
- Duplicate registration and invalid login return clear errors.
- Authentication persists after refresh; logout clears the session.
- Protected dashboard routes redirect unauthenticated users to login.
- All eight dashboard sections render with no console errors.
- Forgot-password page clearly states that recovery is coming soon (no fake email sent).

---

## Not in Phase 1 (by design)

GitHub authorisation and repository scanning, Firecrawl release-note collection, package registry
monitoring, RAG/LangChain/LangGraph pipelines, Gemini-powered analysis, Memento memory persistence
and PDF exports are intentionally represented as realistic, clearly labelled placeholders only.
