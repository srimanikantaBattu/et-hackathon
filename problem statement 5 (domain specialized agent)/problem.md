# Problem Statement: Multi-Company Month-End Close Orchestration System

## Overview
Building an autonomous agentic AI platform that orchestrates month-end close processes across multiple portfolio companies in a Private Equity fund. The system should work continuously without user prompts, coordinating 10+ specialized agents to handle variance analysis, accrual verification, intercompany eliminations, and consolidated reporting.

## Business Context
Building for a PE firm managing 8 portfolio companies across manufacturing, SaaS, and retail sectors. Monthly close takes 12-15 days manually. The platform should reduce this to 1-2 days with 95%+ automation and real-time stakeholder updates.

## Tech Stack 

### Core Framework
- **Agno Framework** (latest version) - Multi-agent orchestration
- **LLM** - Claude/Gemini/OpenAI
- **Python** - Latest stable version

### Frontend
- **React** with TypeScript
- **Next.js** (App Router)
- **Tailwind CSS** + **shadcn/ui** components
- **Recharts** or **Tremor** for financial visualizations
- **React Query** for state management
- **WebSocket** (Socket.io) for real-time agent updates

### Backend
- **PostgreSQL** (financial data storage)
- **Redis** (agent state management, task queues)
- **Celery** (job scheduling for continuous operations)
- **SQLAlchemy** (database access)
- **FastAPI** or **REST API** with Zod validation

### Email & Notifications
- **SendGrid** or **Resend** (production email delivery)
- **Jinja2** (email templates)

### Infrastructure
- **Docker** & **Docker Compose**
- **Environment variable** management (.env with validation)

## Required Agents (10 Total)

### 1. **Orchestrator Agent** (Master Controller)
- Coordinates all agents, manages workflow state
- Monitors progress across all 8 portfolio companies
- Escalates issues requiring human intervention
- Sends daily executive summary emails

### 2. **Trial Balance Validator Agent**
- Ingests trial balance data from each portfolio company
- Validates debits = credits for each entity
- Flags accounts with unexpected balances
- Runs account reconciliation checks

### 3. **Variance Analysis Agent**
- Compares actual vs. budget, actual vs. prior month
- Identifies variances >10% or >$50K
- Generates variance commentary using Claude
- Prioritizes variances requiring management explanation

### 4. **Accrual Verification Agent**
- Reviews accrued expenses, deferred revenue
- Verifies supporting documentation exists
- Calculates amortization schedules
- Flags missing or incorrect accruals

### 5. **Intercompany Elimination Agent**
- Identifies intercompany transactions across portfolio companies
- Validates elimination entries
- Ensures intercompany balances net to zero at consolidation
- Generates elimination journal entries

### 6. **Revenue Recognition Agent**
- Validates revenue recognition per ASC 606
- Checks contract terms, performance obligations
- Identifies revenue timing issues
- Suggests adjusting entries

### 7. **Expense Categorization Agent**
- Reviews expense GL accounts
- Reclassifies miscategorized expenses
- Validates department/cost center allocations
- Suggests chart of accounts improvements

### 8. **Cash Flow Reconciliation Agent**
- Reconciles cash accounts to bank statements
- Identifies outstanding items
- Validates cash flow statement indirect method calculations
- Flags unusual cash movements

### 9. **Consolidation Agent**
- Aggregates data from all 8 portfolio companies
- Applies GAAP consolidation rules
- Generates consolidated P&L, Balance Sheet, Cash Flow
- Produces investor-ready financial packages

### 10. **Reporting & Communication Agent**
- Generates executive dashboards
- Creates variance reports, KPI scorecards
- Sends automated email updates to stakeholders
- Prepares board-ready presentation materials

## Multi-Agent Collaboration Requirements

### Orchestration Pattern
```
Orchestrator Agent (Master)
├── Parallel Execution Group 1 (Per Company)
│   ├── Trial Balance Validator
│   ├── Variance Analysis
│   └── Cash Flow Reconciliation
├── Sequential Execution Group 2
│   ├── Accrual Verification
│   ├── Revenue Recognition
│   └── Expense Categorization
├── Cross-Company Group 3
│   └── Intercompany Elimination
└── Final Consolidation Group 4
    ├── Consolidation Agent
    └── Reporting & Communication Agent
```

### Agent Communication
- Agents must use **shared memory** (Redis) for handoffs
- Each agent updates a central **workflow state machine**
- Agents emit events that trigger downstream agents
- Implement **retry logic** with exponential backoff

### Autonomous Operation
- System runs on **scheduled triggers** (daily at 9 AM, hourly during close week)
- Agents detect data changes and self-initiate work
- No manual "run" button - fully autonomous
- Continuous monitoring with agent health checks

## Real-World Dataset Provided

### Dataset Structure
You'll receive realistic financial data for 8 portfolio companies:

1. **TechForge SaaS** - $45M ARR SaaS company
2. **PrecisionMfg Inc** - $120M manufacturing
3. **RetailCo** - $200M multi-location retail
4. **HealthServices Plus** - $35M healthcare services
5. **LogisticsPro** - $80M transportation/logistics
6. **IndustrialSupply Co** - $150M distribution
7. **DataAnalytics Corp** - $25M professional services
8. **EcoPackaging Ltd** - $60M sustainable packaging

### Data Files (CSV/JSON format)
- `trial_balances/` - Monthly trial balances for each company
- `budgets/` - Annual budget by month, GL account, entity
- `prior_year/` - Prior year comparatives
- `intercompany/` - Intercompany transaction details
- `contracts/` - Revenue contracts (for Rev Rec agent)
- `bank_statements/` - Mock bank statement data
- `accrual_schedules/` - Standard accrual templates

### Sample Data Characteristics
- **Realistic GL account structure** (4-digit account codes, standard GAAP categories)
- **Common accounting issues** intentionally planted (miscategorized expenses, missing accruals, timing differences)
- **Intercompany transactions** between entities requiring elimination
- **Variances** requiring investigation (material budget overruns, unexpected spikes)
- **3 months of data** (current month + 2 prior for trend analysis)

## UI Requirements

### Dashboard (Main View)
- **Executive Overview**: Consolidated metrics across all 8 companies
  - Total revenue, EBITDA, cash position
  - Close completion status (% complete)
  - Agent activity real-time feed
- **Company Cards**: 8-tile grid showing per-company status
  - Traffic light indicators (green/yellow/red)
  - Click to drill into company details
- **Agent Status Panel**: Live agent execution status
  - Currently running agents
  - Completed tasks count
  - Pending tasks queue
  - Error/warning flags

### Company Detail View
- **Financial Statements**: P&L, Balance Sheet, Cash Flow (current vs budget vs prior year)
- **Variance Analysis Table**: Top 10 variances with AI-generated commentary
- **Issue Tracker**: Open items requiring attention (missing accruals, unreconciled items)
- **Audit Trail**: Agent actions taken on this company

### Agent Activity Log
- **Real-time stream** of agent actions (WebSocket updates)
- Filterable by agent type, company, severity
- Click any log entry to see full details/reasoning
- Export to CSV

### Reports & Exports
- **Consolidated Financial Package** (PDF export)
- **Variance Report** by company
- **Intercompany Reconciliation Report**
- **Executive Summary Email Preview**

### Settings & Configuration
- **Email notification** preferences
- **Variance thresholds** (% and $ materiality)
- **Agent scheduling** configuration
- **Company master data** management

## Real-Time & Autonomous Features

### Continuous Operation
```typescript
// Example: Scheduled orchestration
scheduler.schedule('0 9 * * *', async () => {
  await orchestrator.initiateMonthEndClose();
});

// Event-driven agent triggering
eventBus.on('trial_balance_validated', async (companyId) => {
  await varianceAgent.analyze(companyId);
  await accrualAgent.verify(companyId);
});
```

### Email Updates
- **Daily Summary**: Sent every morning with progress update
- **Issue Alerts**: Immediate email when critical issue found
- **Completion Notice**: When close process finishes
- **Stakeholder Reports**: Weekly consolidated results to PE partners

Email recipients by role:
- CFOs of each portfolio company
- Investment management team
- External auditors (read-only summary)

### WebSocket Real-Time Updates
```typescript
// Frontend receives live agent updates
socket.on('agent_update', (update) => {
  // Update UI with agent action
  // Show progress indicators
  // Display new findings
});
```
