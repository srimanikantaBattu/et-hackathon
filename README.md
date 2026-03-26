# Portfolio Month-End Close AI Orchestrator

An **autonomous agentic AI platform** that orchestrates **month-end close processes** across 8 portfolio companies in a Private Equity fund. The system coordinates 10 specialized AI agents to handle variance analysis, accrual verification, intercompany eliminations, and consolidated reporting — all without manual prompts.

**Business Goal:** Reduce monthly close from 12-15 days to 1-2 days with 95%+ automation.

---
## Repository Structure
```
et-hackathon/
├── client/                          # Next.js 16 frontend (React 19, TypeScript)
│   ├── src/
│   │   ├── app/                     # App Router pages
│   │   │   ├── page.tsx             # Dashboard (main view)
│   │   │   ├── layout.tsx           # Root layout with sidebar
│   │   │   ├── agents/page.tsx      # Agent audit trail page
│   │   │   ├── close-output/page.tsx # Group 3/4 finalization outputs
│   │   │   ├── companies/
│   │   │   │   ├── page.tsx         # Portfolio grid page
│   │   │   │   └── [id]/page.tsx    # Company detail (variances, TB, statements, handoffs)
│   │   │   ├── reports/page.tsx     # Financial reports page
│   │   │   └── settings/page.tsx    # Settings workspace
│   │   ├── components/
│   │   │   ├── agent-activity-feed.tsx  # Real-time WebSocket activity feed
│   │   │   ├── providers.tsx            # React Query provider
│   │   │   ├── sidebar.tsx              # Collapsible navigation sidebar
│   │   │   └── ui/                      # Radix-based UI primitives (badge, card, tabs)
│   │   └── lib/
│   │       ├── api.ts               # REST + WebSocket client functions
│   │       └── utils.ts             # Tailwind merge utility
│   ├── package.json
│   ├── tsconfig.json
│   └── eslint.config.mjs
│
├── server/                          # FastAPI + Python backend
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point + Socket.io ASGI wrap
│   │   ├── config.py                # Pydantic settings (DB, Redis, Groq, Resend)
│   │   ├── database.py              # SQLAlchemy engine, session, init_db
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── company.py           # Company model
│   │   │   ├── trial_balance.py     # TrialBalance, Budget, PriorYear models
│   │   │   ├── agent_log.py         # AgentLog, AgentState models
│   │   │   ├── alert.py             # Alert, IntercompanyTransaction models
│   │   │   ├── workflow_run.py      # WorkflowRun model
│   │   │   └── workflow_handoff.py  # WorkflowHandoff model
│   │   ├── routers/                 # FastAPI API routes
│   │   │   ├── companies.py         # /api/companies endpoints
│   │   │   ├── agents.py            # /api/agents/status, /api/agents/logs
│   │   │   ├── financials.py        # /api/alerts, /api/intercompany, /api/consolidation, /api/variances
│   │   │   ├── workflow.py          # /api/workflow/trigger, status, runs, group34, handoffs
│   │   │   └── reports.py           # /api/reports summary, email, downloads
│   │   ├── agents/                  # 10 Agno-based AI agents
│   │   │   ├── base.py              # Shared: log_agent_action, call_llm, get_groq_model
│   │   │   ├── tools.py             # Agent tool functions (DB queries, alerts, etc.)
│   │   │   ├── orchestrator.py      # Master orchestrator (teams + workflow builder)
│   │   │   ├── trial_balance_validator.py
│   │   │   ├── variance_analysis.py
│   │   │   ├── cash_flow_reconciliation.py
│   │   │   ├── accrual_verification.py
│   │   │   ├── revenue_recognition.py
│   │   │   ├── expense_categorization.py
│   │   │   ├── intercompany_elimination.py
│   │   │   ├── consolidation.py
│   │   │   └── reporting_communication.py
│   │   ├── workflows/               # Workflow orchestration engine
│   │   │   ├── engine.py            # MonthEndWorkflowExecutor (groups 1-4)
│   │   │   ├── state.py             # RedisWorkflowState (handoff persistence)
│   │   │   └── event_bus.py         # WorkflowEventBus (retry-enabled event system)
│   │   ├── sockets/
│   │   │   └── events.py            # Socket.io server for real-time agent updates
│   │   ├── email/
│   │   │   └── sender.py            # Resend API email with inline HTML template
│   │   └── tasks/
│   │       └── celery_app.py        # Celery beat: scheduled workflows, health checks
│   ├── seed/
│   │   └── load_data.py             # Database seeder (CSV → PostgreSQL)
│   ├── data/                        # Financial datasets (CSV/JSON)
│   │   ├── trial_balances/          # 24 trial balance CSVs (8 companies × 3 months)
│   │   ├── budgets/                 # budgets_2026.csv (1548 records)
│   │   ├── prior_year/              # Prior year comparatives
│   │   ├── intercompany/            # 3000 intercompany transactions
│   │   ├── contracts/               # Revenue contracts for rev rec checks
│   │   ├── bank_statements/         # Mock bank statement CSVs
│   │   ├── accrual_schedules/       # 1008 accrual schedule entries
│   │   └── company_metadata.json    # 8 company profiles
│   ├── requirements.txt
│   └── .env.example
│
└── problem statement 5 (domain specialized agent)/
    ├── problem.md                   # Full hackathon problem statement
    ├── dataset_specifications.md    # Dataset schema & generation specs
    └── generate_assignment_data.py  # Data generation script
```
---
## Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 16.2.1 |
| | React | 19.2.4 |
| | TypeScript | 5.9.3 |
| | Tailwind CSS | 4.x |
| | Radix UI (Dialog, Tabs, Progress, ScrollArea) | latest |
| | TanStack React Query | 5.95.2 |
| | Recharts | 3.8.0 |
| | Socket.io Client | 4.8.3 |
| | react-markdown + remark-gfm | latest |
| **Backend** | FastAPI | 0.115.0 |
| | Uvicorn | 0.30.0 |
| | SQLAlchemy | 2.0.35 |
| | Pydantic Settings | 2.5.2 |
| | python-socketio | 5.11.4 |
| | Celery | 5.4.0 |
| | Pandas / NumPy | 2.2.3 / 1.26.4 |
| **AI/LLM** | Agno Framework | 1.3.4 |
| | Groq API (Llama 3.3 70B) | 0.11.0 |
| **Database** | PostgreSQL | (via psycopg2-binary) |
| **Cache/Queue** | Redis (Upstash) | 5.1.1 |
| **Email** | Resend | 2.3.0 |
| | Jinja2 | 3.1.4 |
---
## Architecture & Data Flow
### Backend Architecture
```
FastAPI App (main.py)
  ├── CORSMiddleware (localhost:3000/3001)
  ├── Routers
  │   ├── /api/companies       → Company CRUD + financials
  │   ├── /api/agents          → Agent status + logs
  │   ├── /api/alerts          → Alert CRUD
  │   ├── /api/consolidation   → Portfolio-wide P&L
  │   ├── /api/variances       → Cross-company variance report
  │   ├── /api/intercompany    → IC transaction tracking
  │   ├── /api/workflow        → Trigger, status, runs, group 3/4 outputs, handoffs
  │   └── /api/reports         → Reporting summary, partner email, export downloads
  └── Socket.io ASGI Wrapper   → Real-time agent_update events
```
### Workflow Execution Groups
The `MonthEndWorkflowExecutor` runs agents in 4 sequential groups:
```
GROUP 1 (Parallel per company):         → 45% progress
  ├── Trial Balance Validator
  ├── Variance Analysis Agent
  └── Cash Flow Reconciliation Agent
GROUP 2 (Sequential per company):       → 70% progress
  ├── Accrual Verification Agent
  ├── Revenue Recognition Agent
  └── Expense Categorization Agent
GROUP 3 (Cross-company):                → 85% progress
  └── Intercompany Elimination Agent
GROUP 4 (Final):                        → 100% progress
  ├── Consolidation Agent
  └── Reporting & Communication Agent
```
- **Concurrency controls**: `WORKFLOW_LLM_CONCURRENCY=1`, `WORKFLOW_COMPANY_CONCURRENCY=2`, `WORKFLOW_GROUP_AGENT_CONCURRENCY=2`
- **Retry logic**: Each agent retries up to 3 times with exponential backoff
- **Rate limit detection**: Auto-detects 429/rate-limit responses and retries
- **Handoff persistence**: Agent outputs stored in both Redis (7-day TTL) and PostgreSQL (`workflow_handoffs` table)
### Event-Driven Architecture
- **WorkflowEventBus**: In-process event system with retry logic
  - Events: `group1_completed` → `group2_completed` → `group3_completed`
  - Each handler triggers the next group of agents
- **Socket.io**: Emits `agent_update` events to frontend in real-time
- **Celery Beat**: Autonomous scheduling
  - Daily 9AM: Full month-end close workflow
  - Hourly 8AM-6PM: Monitor for data changes & auto-trigger
  - Daily 7AM: Executive summary email
  - Every 15 min: Agent health check (detect stale runners)
---
## Database Schema (6 tables + 2 state tables)
### `companies`
| Column | Type | Description |
|--------|------|-------------|
| id | String (PK) | e.g., `techforge_saas` |
| name | String | Display name |
| industry | String | SaaS, Manufacturing, Retail, etc. |
| revenue_annual | Float | Annual revenue |
| employees | Integer | Headcount |
| has_inventory | Boolean | Inventory flag |
| gross_margin | Float | Gross margin % |
| growth_rate | Float | YoY growth rate |
| status | String | `pending` / `in_progress` / `complete` / `issues` |
| close_completion_pct | Float | 0-100 |
### `trial_balances`
| Column | Type | Description |
|--------|------|-------------|
| company_id | FK → companies | Company reference |
| period | String | e.g., `2026-01` |
| account_code | Integer | 4-digit GL account |
| account_name | String | Account description |
| account_type | String | Asset / Liability / Equity / Revenue / COGS / Operating Expense |
| debit / credit / balance | Float | Financial amounts |
### `budgets`
Budget amounts by company, year, month, and account code.
### `prior_year`
Same structure as trial_balances for YoY comparison.
### `alerts`
| Column | Type | Description |
|--------|------|-------------|
| alert_type | String | `variance` / `missing_accrual` / `ic_mismatch` / `revenue_timing` / `cash_discrepancy` / `balance_error` / `miscategorization` |
| severity | String | `info` / `warning` / `critical` |
| ai_commentary | String | LLM-generated analysis |
| is_resolved | Boolean | Resolution status |
| account_code | Integer | Related GL account |
| amount | Float | Dollar amount |
### `intercompany_transactions`
Tracks IC transactions between portfolio companies with elimination status.
### `agent_logs` / `agent_states`
Audit trail of all agent actions + current agent execution state.
### `workflow_runs` / `workflow_handoffs`
Workflow execution tracking with group-level progress and inter-agent data handoffs.
---
## The 10 AI Agents
All agents use the **Agno Framework** with **Groq Llama 3.3 70B**.
| # | Agent | File | Tools | Purpose |
|---|-------|------|-------|---------|
| 1 | **Orchestrator** | `orchestrator.py` | Teams/Workflow | Master controller coordinating all agents |
| 2 | **Trial Balance Validator** | `trial_balance_validator.py` | `check_trial_balance`, `flag_balance_issue` | Validates debit=credit, flags negative assets |
| 3 | **Variance Analysis** | `variance_analysis.py` | `get_actual_vs_budget`, `save_variance_alert` | Flags >10%/$50K variances with AI commentary |
| 4 | **Accrual Verification** | `accrual_verification.py` | `verify_accruals`, `flag_missing_accrual` | Checks expected vs. booked accruals |
| 5 | **Intercompany Elimination** | `intercompany_elimination.py` | `fetch_ic_transactions`, `eliminate_ic_pair`, `flag_ic_issue` | Eliminates IC transactions for consolidation |
| 6 | **Revenue Recognition** | `revenue_recognition.py` | `analyze_revenue`, `flag_rev_rec_issue` | ASC 606 compliance checks |
| 7 | **Expense Categorization** | `expense_categorization.py` | `review_expenses`, `flag_miscategorization` | Detects COGS/OpEx misclassifications |
| 8 | **Cash Flow Reconciliation** | `cash_flow_reconciliation.py` | `reconcile_cash`, `flag_cash_discrepancy` | GL vs bank statement reconciliation |
| 9 | **Consolidation** | `consolidation.py` | `get_consolidated_financials`, `update_close_status_all` | Aggregates all 8 companies' financials |
| 10 | **Reporting & Communication** | `reporting_communication.py` | `generate_executive_summary`, `send_email_summary` | Executive reports + email delivery |
### Shared Agent Tools (`tools.py`)
- `get_trial_balance()` — Fetch TB from DB
- `get_budget_for_period()` — Fetch budget data
- `get_accrual_schedule()` — Load accrual CSV
- `get_intercompany_transactions()` — Query IC transactions
- `save_alert()` — Persist findings/alerts
- `log_action()` — Log + emit socket event
- `update_company_status()` — Update close progress
- `get_consolidation_summary()` — Consolidated P&L
---
## Frontend Pages
### 1. Dashboard (`/`) — `page.tsx`
- **Executive overview**: Consolidated revenue, EBITDA margin, open issues, active agents
- **Company grid**: 4×2 tile layout with status indicators, click-to-drill
- **Gradient metric cards**: Stacked 3D card design
- **Trigger button**: Manual "Trigger AI Workflow" button
- **Right sidebar**: Real-time agent activity feed (WebSocket) + recent workflow runs
### 2. Portfolio (`/companies`) — `companies/page.tsx`
- Grid of 8 company cards with industry, status, and currency
- Links to individual company detail pages
### 3. Company Detail (`/companies/[id]`) — `companies/[id]/page.tsx`
- **Tabs**: Variance Analysis | Trial Balance | Statements
- **Variance table**: Account, Actual, Budget, Variance $, %, AI Insights
- **Statements tab**: P&L (actual/prior/budget), Balance Sheet snapshot, Cash Flow snapshot
- **Agent Handoffs panel**: Group 1 & Group 2 outputs rendered as markdown
- **Full-screen handoff drawer**: Expandable markdown viewer with table dialogs
- **Issue tracker sidebar**: Active alerts by type
### 4. Agent Audit Trail (`/agents`) — `agents/page.tsx`
- Full-width trace table: Timestamp, Agent, Severity, Company, Action + Details
- Filters for `agent_name`, `severity`, and `company_id`
- Live WebSocket indicator
- Polls every 5 seconds
### 5. Finalization (`/close-output`) — `close-output/page.tsx`
- Dedicated Group 3 and Group 4 output view per workflow run
- Markdown-rendered intercompany elimination and consolidation/reporting outputs
### 6. Financial Reports (`/reports`) — `reports/page.tsx`
- Run-aware reporting summary with AI-generated commentary
- Working actions: partner email trigger + PDF/CSV downloads
- Report exports: complete financials PDF, intercompany matrix CSV, agent audit CSV
### 7. Settings (`/settings`) — `settings/page.tsx`
- Email preferences, variance thresholds, scheduling, and company scope controls
### Key UI Components
- **`AgentActivityFeed`**: Real-time timeline with WebSocket + REST polling fallback
- **`Sidebar`**: Collapsible nav with optimistic routing
- **`Providers`**: React Query with 1-min stale time
---
## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all 8 companies |
| GET | `/api/companies/{id}` | Single company details |
| GET | `/api/companies/{id}/financials?period=` | Full financials + variances + alerts |
| GET | `/api/agents/status` | All agent states |
| GET | `/api/agents/logs?agent_name=&company_id=&severity=&limit=` | Filtered agent logs |
| GET | `/api/alerts?company_id=&severity=&resolved=` | Alert list |
| PUT | `/api/alerts/{id}/resolve` | Resolve an alert |
| GET | `/api/intercompany?period=` | IC transactions summary |
| GET | `/api/consolidation?period=` | Consolidated P&L |
| GET | `/api/variances?period=` | Cross-company variances |
| POST | `/api/workflow/trigger?period=&company_ids=&company_limit=` | Start workflow (background, optional scoped company run) |
| GET | `/api/workflow/status` | Current workflow state |
| GET | `/api/workflow/runs?limit=` | Workflow run history |
| GET | `/api/workflow/group34?run_id=` | Group 3/4 finalization outputs for a run |
| GET | `/api/workflow/handoffs/{company_id}?run_id=` | Agent handoff data |
| GET | `/api/reports/summary?period=&run_id=` | Reports summary + AI commentary |
| POST | `/api/reports/email?period=&run_id=` | Trigger partner email for selected run |
| GET | `/api/reports/download/complete-financials.pdf?period=&run_id=` | Download PDF report |
| GET | `/api/reports/download/intercompany-matrix.csv?period=` | Download intercompany CSV |
| GET | `/api/reports/download/agent-audit.csv?run_id=&limit=` | Download agent audit CSV |
| GET | `/health` | Health check |
| WS | Socket.io `agent_update` | Real-time agent events |
---
## Dataset: 8 Portfolio Companies
| Company | ID | Revenue | Industry |
|---------|---|---------|----------|
| TechForge SaaS | `techforge_saas` | $45M | SaaS |
| PrecisionMfg Inc | `precisionmfg_inc` | $120M | Manufacturing |
| RetailCo | `retailco` | $200M | Retail |
| HealthServices Plus | `healthservices_plus` | $35M | Healthcare |
| LogisticsPro | `logisticspro` | $80M | Transportation |
| IndustrialSupply Co | `industrialsupply_co` | $150M | Distribution |
| DataAnalytics Corp | `dataanalytics_corp` | $25M | Professional Services |
| EcoPackaging Ltd | `ecopackaging_ltd` | $60M | Manufacturing |
**Data period**: Nov 2025 – Jan 2026 (3 months)
### Intentional Data Issues (for agent testing)
1. Miscategorized expenses (marketing in COGS)
2. Missing December bonus accruals
3. Uneliminated intercompany transactions
4. Timing differences in prepaid expenses
---
## Environment Configuration
### Required Environment Variables (`.env`)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/db_name
REDIS_URL=redis://default:password@endpoint:6379
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@domain
EMAIL_TO_PARTNERS=partners@domain
DEBUG=true
FRONTEND_URL=http://localhost:3000
```
### Running the Application
```bash
# Backend
cd server
pip install -r requirements.txt
python -m seed.load_data          # Seed database
uvicorn app.main:app --port 8000  # Start server
# Frontend
cd client
npm install
npm run dev                       # Start at localhost:3000
# Background workers (optional)
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
```
---
## Key Design Patterns
1. **Agent-as-Tool**: Each agent exposes Python functions as Agno tools; the LLM decides when/how to call them
2. **Team Coordination**: `TeamMode.coordinate` delegates tasks to specialist agents within sub-teams
3. **Handoff Persistence**: Agent outputs stored in Redis (fast) + PostgreSQL (durable) for inter-group data transfer
4. **Event-Driven Groups**: `WorkflowEventBus` chains group completions to trigger downstream work
5. **Concurrency Control**: `BoundedSemaphore` limits concurrent LLM calls to avoid rate limits
6. **Dual Persistence**: All agent actions logged to DB and emitted via WebSocket for real-time UI updates
7. **Graceful Degradation**: Email sender logs instead of sending if API key is missing; agents return error strings instead of crashing
