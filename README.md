# DevUpdate AI

**AI-Powered GitHub Dependency Intelligence Platform**

Phases 1–5 are complete: a premium responsive marketing site, full authentication flow, a
production-style dark dashboard backed by Express/MongoDB/JWT, a real GitHub OAuth App repository
scanner with dependency extraction, official-registry update intelligence with OSV advisories,
evidence-backed AI analysis with Groq, Firecrawl, LangChain/LangGraph and Pinecone, and persistent
per-repository memory with historical change tracking, developer feedback, reports and real in-app
notifications.

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
- Dashboard sections: Overview, My Repositories, Dependencies, Update Intelligence, Dependency
  Updates, Vulnerabilities, AI Overview, AI Recommendations, Research Library, Repository Chat,
  Repository Memory, Change History, Decision Feedback, Notifications, Reports and Settings.
- Dashboard icons use `react-icons/lu` with a consistent rounded stroke; `lucide-react` was removed.
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

---

# Phase 2 — GitHub integration, repository access and dependency extraction

Phase 2 keeps the Phase 1 design, routing and authentication intact and replaces the placeholder
repository/dependency data with a real GitHub OAuth integration.

## Implemented features

- GitHub OAuth App sign-in flow with signed, short-lived state and a one-time state cookie.
- OAuth access tokens are exchanged on the backend, encrypted at rest with AES-256-GCM and never
  exposed to React or stored in localStorage.
- GitHub status, connect, callback and disconnect endpoints.
- Repository sync from the signed-in user's accessible repository list into MongoDB.
- Repository list with search, language/visibility/status filters, sorting, pagination and
  "Analyze Repository" action. Explicit selection is required; scans are never automatic.
- Repository details page with metadata, branch selection, manifest files, ecosystem breakdown,
  scan progress, scan history and rescan.
- Background MongoDB-backed scan jobs with `NOT_SCANNED`, `QUEUED`, `SCANNING`, `COMPLETED` and
  `FAILED` states. Scans continue after the browser closes.
- Git Trees API scanning with recursive retrieval, ignored generated directories, file size limits,
  bounded concurrency, and a subtree walk for truncated responses.
- Dependency parsing for npm, PyPI, Maven/Gradle, Cargo, Composer, RubyGems, Go and NuGet.
- Declared requirements and resolved lockfile versions are stored in separate fields.
- Secure per-user ownership checks on repository and dependency routes to prevent IDOR.
- Real dependency table with search, ecosystem/repository/scope filters, sorting and pagination.
- Loading skeletons, connection states, progress panels, error states and toast notifications.

## Updated folder structure

```text
server/
├── constants/manifests.js
├── controllers/
│   ├── githubController.js
│   ├── repositoriesController.js
│   └── dependenciesController.js
├── models/
│   ├── GitHubConnection.js
│   ├── Repository.js
│   ├── Dependency.js
│   └── ScanJob.js
├── services/
│   ├── githubService.js
│   ├── repositoryService.js
│   ├── dependencyParserService.js
│   └── scanService.js
├── routes/
│   ├── githubRoutes.js
│   ├── repositoryRoutes.js
│   └── dependencyRoutes.js
├── tests/
│   ├── api.test.js
│   └── dependencyParserService.test.js
├── utils/{sanitize,tokenCrypto}.js
├── app.js
└── server.js

client/src/
├── components/
│   ├── common/{Skeleton,Toast}.jsx
│   └── dashboard/{GitHubConnect,RepositoryCard,DependencyTable}.jsx
└── pages/dashboard/
    ├── Repositories.jsx
    ├── RepositoryDetails.jsx
    └── Dependencies.jsx
```

## GitHub OAuth App setup

1. Create an OAuth App at <https://github.com/settings/developers>.
2. Fill the form with:
   - **Application name:** `DevUpdate-AI`
   - **Homepage URL:** `http://localhost:5173`
   - **Application description:** `Dependency intelligence for GitHub repositories`
   - **Authorization callback URL:** `http://localhost:5000/api/github/callback`
3. Do not enable wildcard matching, device flow or token expiry for this Phase 2 implementation.
4. Copy the Client ID and generate a Client Secret, then put them in `server/.env`.
5. Generate a 32-byte encryption key with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set it as
   `TOKEN_ENCRYPTION_KEY`.
6. In the dashboard, open **My Repositories** and click **Connect GitHub**.

GitHub callback redirects use `CLIENT_URL`, so keep it aligned with the Vite origin.

## Environment variables

```dotenv
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/github/callback
GITHUB_OAUTH_SCOPES=repo read:user user:email read:org
TOKEN_ENCRYPTION_KEY=
COOKIE_SAME_SITE=lax
```

`COOKIE_SAME_SITE` is `lax` so the Phase 1 session cookie is sent on the top-level redirect from
GitHub back to the callback. Keep `COOKIE_SECURE=true` in production over HTTPS.

> Note: GitHub OAuth Apps do not support read-only repository scopes. The `repo` scope grants full
> private repository access, which is broader than the GitHub App read-only design. If you want
> least-privilege installation tokens later, the backend can be migrated back to a GitHub App.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/github/connect` | Create signed state and return the GitHub OAuth URL |
| GET | `/api/github/callback` | Validate state, exchange code, persist encrypted token and sync repositories |
| GET | `/api/github/status` | Connection state, profile summary and repository count |
| DELETE | `/api/github/disconnect` | Remove the connection and all local scan data |
| GET | `/api/repositories` | List synced repositories with filters and pagination |
| GET | `/api/repositories/:id` | Repository overview, latest job, history and ecosystems |
| POST | `/api/repositories/sync` | Refresh repositories from GitHub |
| POST | `/api/repositories/:id/analyze` | Queue a background scan for a selected branch |
| GET | `/api/repositories/:id/scan-status` | Poll scan status and progress |
| GET | `/api/dependencies` | List extracted dependencies with filters and pagination |
| GET | `/api/dependencies/:repositoryId` | Dependencies for one owned repository |

All private endpoints require the Phase 1 JWT cookie. State-changing endpoints also require the
existing CSRF header. GitHub and scan endpoints have dedicated rate limits.

## Testing results

```bash
cd server && npm test     # 12/12 tests pass
cd client && npm run lint # clean
cd client && npm run build# succeeds
```

The automated suite covers critical parsers (including declared vs resolved versions), malformed
manifests, public API behavior, CSRF, auth boundaries and invalid GitHub callback state.

## Phase 2 limitations

- Real connect/sync/scan acceptance requires configured GitHub OAuth App credentials; without them
  the UI reports that integration is not configured instead of showing a fake connection.
- OAuth tokens do not expire automatically unless revoked; they are encrypted at rest and removed
  when the user disconnects. Permission revocation is discovered on the next GitHub API call.
- Package registry lookup, latest versions, release notes, security advisories, Firecrawl,
  LangChain/LangGraph/RAG and AI recommendations are intentionally deferred to later phases.
- Very large repositories are bounded by manifest count, file size, tree depth and concurrency
  limits; unsupported or generated manifest paths are skipped by design.

---

# Phase 3 — Dependency Update Intelligence

Phase 3 turns the dependencies extracted in Phase 2 into repository-specific update, version and
security intelligence using official package registries and OSV. No AI, Firecrawl or generated
advice is used in this phase.

## Architecture

```text
GitHub repository → Phase 2 Dependency records
        ↓
UpdateJob (MongoDB, durable) → in-process dispatcher → repositoryAnalyzer
        ↓
dependencyAnalyzer
        ├─ normalize ecosystem → registry client → latest/stable versions + metadata
        ├─ versionComparator → MAJOR / MINOR / PATCH / PRERELEASE / NONE / UNKNOWN
        ├─ declared range check → WITHIN_RANGE / OUTSIDE_RANGE / NO_DECLARED_RANGE / UNKNOWN
        └─ OSV /v1/query → normalized advisories + security status
        ↓
DependencyUpdate (upsert per dependency) + UpdateHistory (change snapshots)
        ↓
Authenticated /api/updates/* endpoints → React dashboard pages
```

### Official data sources

| Ecosystem | Registry client | OSV ecosystem |
| --- | --- | --- |
| npm | `https://registry.npmjs.org` | `npm` |
| PyPI | `https://pypi.org/pypi` | `PyPI` |
| Maven / Gradle | Maven Central search API | `Maven` |
| Cargo / crates.io | `https://crates.io/api/v1/crates` | `crates.io` |
| Composer / Packagist | `https://repo.packagist.org/p2` | `Packagist` |
| RubyGems | `https://rubygems.org/api/v1` | `RubyGems` |
| Go modules | `https://proxy.golang.org` | `Go` |
| NuGet | `https://api.nuget.org/v3-flatcontainer` | `NuGet` |

Advisories are queried from OSV at `/v1/query`. A successful empty OSV result becomes
`NO_KNOWN_VULNERABILITY`; a timeout, outage or malformed response becomes
`SECURITY_DATA_UNAVAILABLE` and is never reported as safe.

### Version handling

- npm, Cargo, Composer and RubyGems use semver rules; PyPI uses PEP 440 ordering where available;
  Maven and other formats use a conservative generic comparator.
- Declared requirements, resolved lockfile versions and latest registry versions are kept separate.
- Non-semver requirements such as Git URLs, `latest`, `workspace:` and `file:` return `UNKNOWN`
  rather than being guessed.
- A prerelease → stable transition with the same release triple is `PRERELEASE`, not `MAJOR`.

## New files and modules

```text
server/
├── constants/updateEcosystems.js
├── controllers/updateController.js
├── models/{DependencyUpdate,UpdateHistory,UpdateJob}.js
├── routes/updateRoutes.js
├── utils/updateHttp.js
└── services/updateIntelligence/
    ├── cache/{registryCache,registryRateLimiter}.js
    ├── registries/{npm,pypi,maven,crates,packagist,rubygems,go,nuget}Registry.js
    ├── security/{osvService,advisoryNormalizer}.js
    ├── version/{versionComparator,ecosystemVersionRules}.js
    └── updateEngine/{dependencyAnalyzer,repositoryAnalyzer,historyService,updateScheduler}.js

client/src/
├── components/common/{Pagination,Skeleton,Toast}.jsx
├── components/dashboard/UpdateTable.jsx
├── components/dashboard/UpdateCharts.jsx
├── pages/dashboard/{UpdateOverview,DependencyUpdates,RepositoryUpdateDetails,
│                    DependencyUpdateDetail,Vulnerabilities}.jsx
└── utils/{updateHelpers,updateHelpers.test}.js
```

## Environment variables

Add these to `server/.env` (all have safe local defaults unless noted):

```dotenv
OSV_API_BASE_URL=https://api.osv.dev
UPDATE_REGISTRY_CACHE_TTL_MS=600000
UPDATE_CHECK_INTERVAL_MS=21600000
UPDATE_HTTP_TIMEOUT_MS=12000
UPDATE_HTTP_RETRIES=2
UPDATE_HTTP_BACKOFF_MS=350
UPDATE_MAX_CONCURRENCY=5
UPDATE_MAX_CONCURRENT_JOBS=2

# Keep only the top popular dependencies per repository after scanning.
# Clamped to 20-30. Public download APIs score every discovered package, then
# the AI layer selects the popular set; deterministic scoring fills any gap.
DEPENDENCY_POPULARITY_LIMIT=25
DEPENDENCY_POPULARITY_BUDGET_MS=10000
DEPENDENCY_POPULARITY_REQUEST_TIMEOUT_MS=2500
DEPENDENCY_POPULARITY_CONCURRENCY=12
DEPENDENCY_POPULARITY_CACHE_TTL_MS=21600000
AI_DEPENDENCY_SELECTION_ENABLED=true
AI_DEPENDENCY_SELECTION_TIMEOUT_MS=8000
AI_DEPENDENCY_SELECTION_CACHE_TTL_MS=21600000
AI_DEPENDENCY_SELECTION_MAX_PROMPT_CHARS=15000
AI_DEPENDENCY_SELECTION_FAILURE_TTL_MS=5000

# PDF export AI guidance and the Universal Release Radar catalog.
AI_PDF_SUMMARY_TIMEOUT_MS=6000
UNIVERSAL_CATALOG_BUDGET_MS=8000
UNIVERSAL_CATALOG_TIMEOUT_MS=2500
UNIVERSAL_CATALOG_CONCURRENCY=12
UNIVERSAL_CATALOG_CACHE_TTL_MS=3600000
```

The registry cache is process-local, keyed by request body/URL, deduplicates in-flight requests and
uses ETag/Last-Modified revalidation. It is intentionally lost on restart; durable job state and
update records live in MongoDB.

## Background jobs

There is no Redis dependency. Phase 3 uses MongoDB `UpdateJob` documents plus a controlled
in-process dispatcher:

- Duplicate active jobs per user/repository are rejected with `409`.
- Jobs persist `QUEUED`, `SCANNING`, `COMPLETED` and `FAILED` states with processed/successful/failed
  progress.
- Dependency work uses bounded concurrency (`UPDATE_MAX_CONCURRENCY`) and the dispatcher limits
  simultaneous jobs (`UPDATE_MAX_CONCURRENT_JOBS`).
- Jobs older than 20 minutes in an active state are marked `FAILED` during server startup, so a
  restart cannot leave them queued forever.
- A single dependency can be rechecked synchronously with `POST /api/updates/dependency/:id/check`.

## API endpoints

All endpoints require the Phase 1 JWT cookie. State-changing endpoints also require the CSRF
header. Responses use `{ success, ... }` and paginated endpoints include
`{ page, limit, total, pages }`.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/updates/overview` | Aggregate counts, distributions, recent updates and active job progress |
| GET | `/api/updates/repositories` | Per-repository update summaries with search/sort/pagination |
| GET | `/api/updates/list` | Filterable/sortable dependency update records |
| GET | `/api/updates/vulnerabilities` | OSV advisories matched against installed versions |
| GET | `/api/updates/status/:repositoryId` | Latest update job and repository check status |
| GET | `/api/updates/repository/:repositoryId` | Repository update details and stats |
| POST | `/api/updates/repository/:repositoryId/check` | Queue an update check for one repository |
| POST | `/api/updates/check-all` | Queue checks for all owned repositories |
| POST | `/api/updates/dependency/:dependencyId/check` | Recheck one dependency immediately |
| GET | `/api/updates/dependency/:dependencyId` | Update record, repository and recent history |
| GET | `/api/updates/history/:dependencyId` | Paginated update history snapshots |

## Frontend screens

- **Update Intelligence** — live overview; no longer a static placeholder.
- **Dependency Updates** — search, ecosystem/repository/type/status/security filters, sorting,
  pagination and refresh actions.
- **Repository Update Details** — repository stats, job progress and dependency update table.
- **Dependency Update Detail** — declared/resolved/latest versions, range status, advisories,
  history and `Check Again`.
- **Vulnerabilities** — severity/package/repository filters and OSV reference links.

All tables use hidden-but-functional slim scrollbars and explicit loading/empty/error states.

## Testing results

```bash
cd server && npm test       # 34/34 tests pass
cd client && npm test       # 4/4 tests pass
cd client && npm run lint   # clean
cd client && npm run build  # succeeds (chunk-size warning only)
```

Coverage includes registry success/404/malformed/timeout/rate-limit/outage behavior, OSV
vulnerable/safe/fixed/missing/outage behavior, version/range classification across ecosystems,
authorization and user ownership, duplicate job prevention, history snapshots, and frontend
filters/sort/pagination.

## Known limitations

- Live GitHub OAuth authorization, repository sync/scan and a full repository → registry → OSV →
  MongoDB → dashboard trace still require a configured GitHub OAuth App and a real user session.
- Registry caching is per Node process; multiple server instances would need a shared cache or
  tolerable duplicate requests.
- The in-process job dispatcher is suitable for a single server process. Horizontal scaling should
  replace it with a durable external queue.
- Advisories reflect OSV data at check time; `NO_KNOWN_VULNERABILITY` is not a lifetime guarantee.
- Release notes, migration guides, compatibility analysis and AI recommendations are covered by Phase 4 below.

---

# Phase 4 — Evidence-backed AI dependency intelligence

Phase 4 adds repository-aware upgrade analysis without weakening Phases 1–3. It uses only real data
from GitHub repository context, Phase 3 registry/OSV records, Firecrawl-retrieved official sources,
Groq inference and Pinecone vectors. There are no mocked AI results, placeholder statistics,
hardcoded versions or fake actions.

## Architecture

```text
Phase 2 repository + dependencies
Phase 3 DependencyUpdate (registry metadata, versions, OSV advisories)
        ↓
AIJob (MongoDB, durable, cancellable)
        ↓ LangGraph workflow
repositoryContextNode     → bounded GitHub tree/file reads, secret redaction
dependencyDataNode        → Phase 3 security/update data, never "safe" on OSV failure
documentationResearchNode → Firecrawl official-domain scrape + prompt-injection guard
documentRetrievalNode     → normalize → chunk → embed → Pinecone query (user/repo scoped)
breakingChangesNode
codeImpactNode
compatibilityNode
riskAssessmentNode
migrationPlanNode
evidenceValidationNode    → drop unsupported claims, calculate evidence status
        ├─ insufficient evidence → INSUFFICIENT_EVIDENCE result (no final generation needed)
        └─ validated evidence    → finalRecommendationNode → strict JSON Schema via Groq
        ↓
AIAnalysis (evidence, findings, risk, migration plan, limitations, token metadata)
        ↓
Authenticated /api/ai/* endpoints → React AI pages
```

LangChain provides the single prompt/message contract, LangGraph owns the workflow, and Groq native
strict JSON Schema mode plus Zod validation constrain every structured output. The selected model is
`openai/gpt-oss-20b` because it supports that strict schema mode.

## Trust and evidence rules

- All repository files, dependency metadata and scraped pages are treated as untrusted data. Prompt
  instructions found inside them are never followed.
- Research URLs are checked before any request: HTTP/HTTPS only, no credentials, no private/local
  ranges, DNS rebinding check, and an official-domain allowlist derived from registry metadata.
- Firecrawl prompt-injection detection rejects suspicious pages before storage. Retrieved text is
  normalized, deduplicated by content hash and stored as a real `ResearchDocument`.
- Document chunks are embedded into a per-user Pinecone namespace. Query filters always include
  `userId` and `repositoryId`; a broader retry only relaxes version, never owner or repository.
- Evidence/claim verification values are `VERIFIED`, `PARTIALLY_VERIFIED` and `UNVERIFIED`.
- A claim with an unknown evidence ID, no evidence ID, or an unapproved URL is downgraded or removed.
- If no claim can be linked to retrieved evidence, the final status and recommendation become
  `INSUFFICIENT_EVIDENCE` with explicit limitations. Groq is not asked to invent a conclusion.
- OSV failures remain `SECURITY_DATA_UNAVAILABLE`. Phase 4 never converts them into
  `NO_KNOWN_VULNERABILITY` or a safe upgrade recommendation.
- Job lifecycle values (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`) are separate from
  verification values and describe background execution only.

## What Phase 4 deliberately does not do

- No Memento memory system, automatic upgrades, package installs, file edits, commits or PRs.
- No generation of stats or recommendations without retrieved evidence.
- No browser-side secrets. All provider keys stay on the server in git-ignored `server/.env`.
- No GitHub App installation flow; GitHub remains an OAuth App integration.

## New modules

```text
server/
├── constants/aiConstants.js
├── controllers/aiController.js
├── models/{AIAnalysis,AIJob,AIConversation,ResearchDocument,DocumentChunk}.js
├── routes/aiRoutes.js
├── scripts/aiConnectivity.js
└── services/ai/
    ├── cache/{aiCache,aiRateLimiter}.js
    ├── chat/repositoryChatService.js
    ├── context/projectContextAnalyzer.js
    ├── evidence/sourceCollector.js
    ├── ingestion/documentIngestionService.js
    ├── jobs/aiScheduler.js
    ├── langchain/langchainService.js
    ├── prompts/aiPrompts.js
    ├── providers/groqProvider.js
    ├── rag/ragService.js
    ├── research/firecrawlResearchService.js
    ├── schemas/aiSchemas.js
    ├── security/urlSafety.js
    ├── tokenUsage.js
    ├── validation/evidenceValidator.js
    ├── vector/pineconeStore.js
    └── workflow/analysisWorkflow.js

client/src/
├── components/ai/{AiActionsPanel,AiStatusBadge,EvidenceList,JobProgress,RecommendationCard}.jsx
├── hooks/useAiJobPolling.js
└── pages/dashboard/{AiOverview,AnalysisDetail,Recommendations,ResearchLibrary,RepositoryChat}.jsx
```

## Environment variables

Add these to `server/.env`; never commit real values:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
GROQ_TIMEOUT_MS=60000

FIRECRAWL_API_KEY=
AI_MAX_RESEARCH_SOURCES=3
AI_FIRECRAWL_LIMIT_PER_MINUTE=20
AI_FIRECRAWL_PACKAGE_TIMEOUT_MS=9000
AI_FIRECRAWL_TIMEOUT_MS=5000
AI_RESEARCH_SEARCH_TIMEOUT_MS=3000
AI_RESEARCH_URL_CHECK_TIMEOUT_MS=1500
AI_SOURCE_SUGGESTION_TIMEOUT_MS=3500
AI_RESEARCH_FALLBACK_TIMEOUT_MS=4000
AI_DEPENDENCY_RESEARCH_TIMEOUT_MS=15000
AI_RESEARCH_CACHE_TTL_MS=1800000

VECTOR_STORE_TYPE=pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=devupdate-ai
PINECONE_NAMESPACE_PREFIX=devupdate
EMBEDDING_MODEL=multilingual-e5-large
EMBEDDING_DIMENSIONS=1024

AI_MAX_CONCURRENT_JOBS=2
AI_MAX_JOBS_PER_USER=5
AI_MAX_JOBS_PER_REPOSITORY=2
AI_REPOSITORY_MAX_DEPENDENCIES=10
AI_API_RATE_LIMIT=300
```

The disconnected Pinecone index used during development is `devupdate-ai` with dense 1024-dimensional
`multilingual-e5-large` embeddings. Provider connectivity can be checked without exposing keys with:

```bash
cd server && node scripts/aiConnectivity.js
```

## API endpoints

All `/api/ai/*` endpoints require the JWT cookie; state-changing endpoints also require the CSRF
header. Responses use `{ success, ... }`, and lists are paginated where applicable.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/ai/overview` | Analysis totals, distributions, token usage, recent analyses and active jobs |
| GET | `/api/ai/status` | Server-side provider configuration/index status (never key values) |
| GET | `/api/ai/recommendations` | Paginated evidence-backed recommendations with repository/status filters |
| POST | `/api/ai/analyze/repository/:repositoryId` | Queue a bounded repository-wide analysis job |
| POST | `/api/ai/analyze/dependency/:repositoryId/:dependencyId` | Queue one dependency analysis |
| POST | `/api/ai/research/dependency/:repositoryId/:dependencyId` | Queue documentation retrieval only |
| GET | `/api/ai/research/documents` | List retrieved official documents |
| GET | `/api/ai/jobs/repository/:repositoryId` | Latest AI job for one owned repository |
| GET | `/api/ai/jobs/:jobId` | Poll job state and progress |
| POST | `/api/ai/jobs/:jobId/cancel` | Request cancellation of a queued or running job |
| GET | `/api/ai/analysis/:analysisId` | Full evidence package and analysis detail |
| GET | `/api/ai/chat/:repositoryId/conversations` | List saved repository conversations |
| GET | `/api/ai/chat/:repositoryId/conversations/:conversationId` | One saved conversation |
| DELETE | `/api/ai/chat/conversations/:conversationId` | Delete an owned conversation |
| POST | `/api/ai/chat/:repositoryId` | Ask an evidence-only repository question |

## Background jobs and limits

- No Redis: durable `AIJob` documents plus a controlled in-process dispatcher.
- Duplicate active jobs are rejected with `409`; queued jobs can be cancelled before they start.
- Per-user and per-repository active-job limits, bounded dependency fan-out and a token ledger
  prevent runaway cost and provider saturation.
- Firecrawl and API calls have timeouts, bounded retries, process-local caches and a rate limiter.
- Stale active jobs are failed on server startup. The dispatcher is intended for one server process;
  horizontal scaling would require an external queue.

## Frontend screens

- **AI Overview** — real totals, provider status, job progress, repository/dependency launch panel,
  and recent analyses. Polling continues across page navigation while a job is active.
- **AI Recommendations** — replaced the old mock page with filterable real analyses, evidence-backed
  cards, job progress and detail links.
- **Analysis Detail** — release intelligence, breaking changes, repository impact, migration
  checklist, limitations, model metadata and every retrieved evidence item.
- **Research Library** — official retrieved documents with source domain, type, retrieval time and
  original URL.
- **Repository Chat** — saved conversations, repository-scoped retrieval, cited answers and explicit
  insufficient-evidence responses.

Hidden-but-functional slim scrollbars are used on long lists and chat panels. Loading, empty and
error states are explicit; there are no disabled-or-decorative action buttons.

## Testing results

```bash
cd server && npm test       # 47/47 tests pass
cd client && npm test       # 4/4 tests pass
cd client && npm run lint   # clean
cd client && npm run build  # succeeds (chunk-size warning only)
cd server && node scripts/aiConnectivity.js
```

The Phase 4 suite covers URL/SSRF guards, metadata trust expansion, secret redaction, deterministic
normalization/chunking, strict Groq schema conversion, `parseAiJson`, evidence validation, Pinecone
metadata filters/namespaces, insufficient-evidence workflow branching, cancellation, chat query
scopes, and unauthenticated `/api/ai/*` access. Live connectivity checks confirmed Groq, Firecrawl
and Pinecone with the configured index.

## Known limitations

- A full authenticated browser trace still requires a real GitHub OAuth session with synced and
  scanned repositories; it cannot be completed from server-side credentials alone.
- Development/test provider credentials should be rotated before production use.
- Caches and the job dispatcher are process-local. Multiple Node instances need a shared cache and
  external queue.
- Research is limited to official/registry/GitHub domains and a small number of pages per package.
  Missing or conflicting documentation intentionally produces insufficient evidence rather than a
  guessed recommendation.
- Answers are review-only. They do not change code, install dependencies or open pull requests.

---

# Phase 5 — Persistent memory, historical intelligence, feedback, reports and notifications

Phase 5 adds long-lived project context and management workflows on top of Phases 1–4 without
changing their APIs or weakening their evidence rules. MongoDB remains the authoritative store;
Memento (mementoagi.com) is a best-effort mirror whose status is always visible to the user.

## Architecture

```text
Phase 2 repository/dependencies + Phase 3 update/OSV records + Phase 4 AI analyses
        ↓
ProjectMemory (MongoDB) ── best-effort mirror ──▶ Memento MCP (tools/list discovered at runtime)
        │                                            ▲
        ├── Decision feedback (DependencyDecision)  │ explicit "remember" chat storage
        ├── HistoricalComparison (AIAnalysis diff)   │
        ├── Report (JSON/CSV/PDF snapshots)          │
        └── Notification + NotificationPreference    │
        ↓                                            │
Workflow nodes + repository chat prompt context ─────┘ (bounded, scoped, non-authoritative)
        ↓
Authenticated /api/{memory,feedback,history,reports,notifications}/* → React dashboard pages
```

Remote MCP uses a server-side Bearer key. The adapter discovers tools through `tools/list` and never
invents tool names or schemas. If Memento is unconfigured, unsupported or unreachable, the operation
continues against MongoDB and the UI reports `MONGODB_FALLBACK` with the last error.

## Trust and isolation rules

- Memory, history, Firecrawl content and chat text are treated as untrusted data, never instructions.
  Sanitization redacts credentials and filters instruction-like text before storage.
- Every memory, decision, comparison, report, notification and preference query is scoped by the
  signed-in `userId`; repository-scoped reads additionally verify repository ownership (no IDOR).
- Memory, decisions and history are **prompt context only**. They cannot create evidence, change a
  vulnerability status, hide a vulnerability, or force a recommendation.
- Phase 3 advisory failures remain `SECURITY_DATA_UNAVAILABLE`, never `NO_KNOWN_VULNERABILITY`.
- Phase 4 evidence values remain `VERIFIED`, `PARTIALLY_VERIFIED` and `UNVERIFIED`; final
  recommendations can be `INSUFFICIENT_EVIDENCE`.
- Old memory cannot override current repository, registry or OSV evidence. Comparison records state
  explicitly when no earlier analysis existed (baseline, not a trend).
- All five Phase 5 routers sit behind the existing JWT cookie, CSRF protection and a dedicated
  `phase5Limiter`.

## Memory lifecycle

- Categories: `PROJECT`, `DEPENDENCY`, `DECISION`, `ANALYSIS`, `CONVERSATION`.
- Statuses: `ACTIVE`, `SUPERSEDED`, `EXPIRED`, `DELETED`. Verification uses the Phase 4 evidence
  statuses; at most 12 memories enter an analysis prompt.
- Origins: repository scans, AI analyses, developer feedback, chat, manual entry and comparisons.
- Memories are capped per repository, expire on a retention schedule at startup and on a scheduled
  sweep, and are removed with their repository on GitHub disconnect.
- A `remember` request in repository chat stores memory explicitly; ordinary chat messages are not
  persisted as memory. The chat response reports `rememberedMemoryId` and any degradation metadata.
- Syncing, rebuilding, mirroring and expiry operations write a `MemoryAudit` trail.

## New modules

```text
server/
├── constants/phase5Constants.js
├── controllers/phase5Controller.js
├── routes/phase5Routes.js
├── models/{ProjectMemory,MemoryAudit,DependencyDecision,HistoricalComparison,
│            Report,Notification,NotificationPreference}.js
└── services/
    ├── memory/{memoryService,mementoAdapter}.js
    ├── feedback/feedbackService.js
    ├── history/historicalComparisonService.js
    ├── reports/reportService.js
    └── notifications/notificationService.js

client/src/
├── services/api.js                        (memoryApi, feedbackApi, historyApi, reportsApi,
│                                            notificationsApi + blob download helper)
└── pages/dashboard/{Memory,History,Feedback,Notifications,Reports}.jsx
```

## Environment variables

Add these to `server/.env`; never commit real values:

```dotenv
MEMENTO_API_KEY=
MEMENTO_MCP_URL=https://api.mementoagi.com/mcp
MEMENTO_TIMEOUT_MS=12000
MEMORY_MAX_PER_REPOSITORY=2000
PHASE5_API_RATE_LIMIT=300
```

Leave `MEMENTO_API_KEY` blank to run in explicit `MONGODB_FALLBACK` mode. `MEMENTO_MCP_URL` must be
HTTPS outside local development. The adapter retries twice with a bounded timeout and records every
failure; it never claims Memento storage that did not happen.

## API endpoints

All endpoints require the JWT cookie; state-changing endpoints also require the CSRF header.
Lists are paginated with `{ page, limit, total, pages }`.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/memory/status` | Authoritative store, Memento connection/capabilities and limitations |
| GET | `/api/memory/repositories/:repositoryId` | List scoped memories by category/status |
| POST | `/api/memory/repositories/:repositoryId` | Create or consolidate a memory |
| GET | `/api/memory/repositories/:repositoryId/context` | Retrieve bounded prompt context explicitly |
| POST | `/api/memory/repositories/:repositoryId/rebuild` | Rebuild project context from current metadata |
| POST | `/api/memory/expire` | Sweep stale memories |
| GET/PATCH/DELETE | `/api/memory/items/:memoryId` | Read, update or delete one owned memory |
| GET | `/api/feedback/options` | Allowed decision types |
| GET | `/api/feedback/repositories/:repositoryId` | Recorded decisions for a repository |
| POST | `/api/feedback/analyses/:analysisId` | Record a decision for a completed analysis |
| GET | `/api/history/repositories/:repositoryId` | Stored comparisons for a repository |
| GET | `/api/history/dependencies/:dependencyId` | Update/analysis/decision timeline |
| GET | `/api/history/dependencies/:dependencyId/comparison` | Detailed comparison snapshot |
| POST | `/api/history/analyses/:analysisId/compare` | Compare against the previous completed analysis |
| GET | `/api/reports/options` | Allowed types/formats and row limits |
| POST/GET | `/api/reports` | Generate or list owned reports |
| GET/DELETE | `/api/reports/:reportId` | Detail or delete one report |
| GET | `/api/reports/:reportId/export?format=JSON\|CSV\|PDF` | Download a real export |
| GET | `/api/notifications` | Paginated notifications with unread/repository filters |
| GET | `/api/notifications/recent` | Recent events for the topbar |
| GET | `/api/notifications/unread-count` | Real unread count |
| GET/PATCH | `/api/notifications/preferences` | In-app/email/type/mute preferences |
| PATCH | `/api/notifications/read`, `/read-all`, `/:id/read` | Mark notifications read |
| DELETE | `/api/notifications/:notificationId` | Delete one notification |

## Event wiring

Real events create deduplicated notifications: GitHub disconnect cleanup, scan failures, Phase 3
meaningful update changes (major update, deprecated package, security vulnerability/fix), AI job
completion/failure and recommendation changes. The Topbar reads `unreadCount()` and `recent()` from
the API instead of showing a static dot or sample alerts.

## Frontend screens

- **Repository Memory** — service status, Memento mirror state/error, repository selector, manual
  memory entry, rebuild, filters and delete; every item shows origin, verification and mirror state.
- **Change History** — stored comparisons plus on-demand comparison from an analysis ID; shows
  version/risk/recommendation changes, advisory evidence limits, findings and developer decisions.
- **Decision Feedback** — records ACCEPTED/REJECTED/POSTPONED/COMPLETED/INCORRECT decisions with
  explanation and notes on real completed analyses; decisions become memory context.
- **Notifications** — real unread/repository filters, mark-read/mark-all/delete and editable
  preferences, including per-type toggles and per-repository mute.
- **Reports** — generate JSON/CSV/PDF snapshots from MongoDB; CSV/JSON retain all capped rows, PDF
  is explicitly limited to the first 500 rows and 10 columns with truncation labelling.

## Testing results

```bash
cd server && npm test       # 56/56 tests pass
cd client && npm test       # 4/4 tests pass
cd client && npm run lint   # clean
cd client && npm run build  # succeeds (chunk-size warning only)
```

The Phase 5 suite covers memory sanitization, explicit-memory detection, comparison logic and
advisory evidence limits, CSV/filename helpers, notification mapping, workflow memory/history
context and degradation, and authentication on all Phase 5 routes.

## Known limitations

- Memento connectivity cannot be verified without a configured `MEMENTO_API_KEY`; the application
  runs correctly in explicit `MONGODB_FALLBACK` mode and reports mirror failures in the UI.
- A full live authenticated trace (GitHub OAuth → sync/scan → registry/OSV → Phase 3 → Phase 4 AI →
  Phase 5 feedback/memory/history/reports/notifications) still requires a real user session.
- Email delivery is not configured; the email preference is recorded but no mail is sent.
- Reports are snapshots at generation time. They never mutate source records or trigger upgrades.
- Developer/test provider credentials should be rotated before production use.
