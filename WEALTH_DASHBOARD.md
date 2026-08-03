# Wealth Management Dashboard — Claude.md

## Build Progress Log

### 2026-07-29 — Tier 1 MVP built + Tier 2 Governance Designed

#### Tier 1 Completion
Built the full Tier 1 MVP as a Vite + React 18 + Tailwind v4 app. Runnable with `npm install && npm run dev` (see [README.md](./README.md) for setup, IBKR key guide, and known limitations).

**Delivered:**
- Passphrase login (`AuthContext`), session in localStorage, logout, full
  dashboard gating.
- IBKR "connection": since the browser can't call IBKR's Client Portal Web
  API directly (session-gateway auth, no public CORS endpoint), shipped with
  realistic seeded mock data (AAPL, GOOGL, AGG) plus a real `Sync Now`
  button and a service layer (`src/services/ibkrService.js`) written against
  IBKR's actual Client Portal API shape, ready to go live against a locally
  running gateway. Checked the live IBKR MCP connector available in this
  session — the connected account currently has zero balances/positions
  (unfunded), so mock data was used for the working demo.
- CPF / DBS / Endowus manual input forms (Settings panel), all persisted to
  localStorage, editable any time.
- Net Worth card, YTD Return card (with an editable start-of-year baseline
  in Settings), Asset Allocation donut chart (Recharts), Holdings table,
  Rebalancing alert box (5% drift threshold, configurable via
  `REBALANCE_THRESHOLD` in `src/utils/constants.js`).
- Settings drawer: target allocation sliders, IBKR key input (with a
  plaintext-storage warning), all manual input forms, sync status.
- Responsive layout verified at mobile (375px), tablet (768px), and desktop
  widths via in-browser testing.

**Bugs found and fixed during browser testing:**
- Recharts 3.10.1's default entrance animation (`react-smooth`) rendered
  the pie chart's `<path>` shapes as empty — sectors mounted with zero
  geometry and never filled in. Fixed with `isAnimationActive={false}` on
  `<Pie>`. Worth re-testing if recharts is upgraded later.
- Pie chart's outer percentage labels clipped against the card edge on
  narrow (mobile) widths. Removed label lines; percentages now shown in the
  legend instead (`Legend formatter`), which reads cleanly at any width.
- Rebalancing alert originally suggested "reduce CPF by $X" when CPF was
  overweight — misleading, since CPF is a locked Singapore retirement
  account with no discretionary withdrawal before statutory retirement age.
  Changed the CPF branch of the suggestion logic to explain the drift is
  informational and suggest directing new contributions elsewhere instead.
- Added a body-scroll lock while the Settings drawer is open (standard
  modal behavior; background was scrollable underneath the drawer before).

**Known limitations:** see README.md's "Known Limitations" table — hardcoded
FX rate, single-passphrase auth, plaintext-localStorage API key, mock IBKR
data by default. All flagged as intentional Tier 1 scope, not oversights.

**Not built (explicitly out of scope per brief):** backend API, auto-execute
trades, dividend calendar, geographic/industry drill-down, retirement
projector, historical price charting.

#### Tier 2: Multi-Agent Rebalancing Governance (Designed)

Designed institutional-grade 2-agent rebalancing system (see below):

**What's New in Tier 2**:
- ✅ **Research Agent** (Claude Cowork): Market analysis + ETF research → Research Brief
- ✅ **Advisor Review Agent** (You or Claude): Validation + constraints → Advisor Review
- ✅ **Governance Rules**: Approval authority, frequency limits, trade restrictions, risk limits
- ✅ **Audit Trail**: Every analysis, decision, execution logged for learning & compliance
- ✅ **ETF/Funds Only**: No individual stocks on rebalancing (simplicity, lower fees)
- ✅ **Confidence Scoring**: HIGH/MEDIUM/LOW on each recommendation with reasoning
- ✅ **Tax Optimization**: Loss harvesting opportunities identified automatically
- ✅ **Implementation Plans**: Day-by-day execution guidance with monitoring

**Key Advantage for Productization**:
Unlike most wealth tools (black-box recommendations), your system has:
- Transparent research (users can see market analysis, ETF comparisons)
- Formal review (advisor validates against personal constraints)
- Audit trail (every decision logged, auditable to regulators/advisors)
- Repeatable process (same rigor every quarter, improves over time)

**Status**: Architecture designed, prompts written (see "Tier 2: Intelligent Rebalancing Engine" below). Ready to implement in Cowork once Tier 1 is fully tested.

### 2026-07-30 — Real Data Loaded + Tier 1 Polish

Replaced all mock data with the user's real accounts: Standard Chartered
cash (SGD + USD, "awaiting deployment"), CPF split by OA/SA/Medisave, real
Endowus P&L, plus two newly ingested statements (iFAST DPMS, DBS Unit
Trust) — modeled via two new broker/provider-agnostic account types,
`type: 'Brokerage'` (any broker via a `broker` field) and
`type: 'ManagedPortfolio'` (any robo/DPMS provider via a `provider` field).

**New this round:**
- **Exclude CPF toggle** (`excludeCPF` in `PortfolioContext`) — a real
  exclusion from every calculation (net worth, allocation, holdings,
  rebalancing), not just a display mask. Distinct from the toggle below.
- **Hide Numbers toggle** (`hideNumbers` in `PortfolioContext`) — pure
  display masking (`••••••`) of every dollar figure app-wide, for
  screen-sharing. Percentages stay visible since they don't reveal net
  worth magnitude. Both toggles persist to localStorage and live as
  buttons in the header.
- **Geography & Industry breakdown**: new pie chart (Geography) + Treemap
  (Industry, via Recharts `Treemap`) under a new `GeographyIndustryBreakdown`
  component. Clicking an industry block cross-filters Holdings, Asset
  Allocation, and Geography below it (PowerBI-style: the clicked visual
  stays fully unfiltered/always-clickable, the others narrow) —
  `filterPortfolioByIndustry()` in `calculations.js`.
- **Overall Unrealized P&L card**: new `UnrealizedPnLCard`, 4th card in the
  top row (`computeOverallUnrealizedPnL()`, weighted by cost basis across
  all priced positions, alongside Net Worth/YTD/Dividends).
- **Rebalancing narrowed to Equities vs. Fixed Income only**: CPF and Cash
  were dropped from the target-allocation comparison entirely (rather than
  just excluded-with-caveats) — `computeInvestedAllocationBreakdown()`
  renormalizes the two remaining targets to sum to 100%. Removed the old
  "CPF cannot be rebalanced" caveat message since CPF is no longer part of
  the comparison at all.
- **Real IBKR connection tried**: this session has a live IBKR MCP
  connector (`get_account_summary`/`get_account_positions`/
  `get_account_balances`) — a genuine, zero-setup API link, distinct from
  the local gateway+proxy approach in the Tier 2 plan below. Confirmed
  working, but the connected account is currently unfunded (`net_liquidation:
  0`, no positions) — nothing to sync yet. Worth reconsidering as the
  primary IBKR path (instead of the local proxy) once the account is
  funded, since it needs no local server at all.
- **Mobile responsiveness** dropped as an ongoing concern per user
  direction — the app is designed as a desktop webpage going forward.

**Known gap, deliberately deferred:** Holdings table sort/search — user
confirmed "ok to not sort/search for now."

## Project Overview

**Vision**: Single source of truth for personal wealth tracking + intelligent rebalancing engine that will evolve into a scalable fintech product.

**Deployment**: 
- **Phase 1 (this week)**: Claude Code build → React/HTML app with admin auth
- **Phase 2+ (ongoing)**: Claude Cowork for data syncs, analysis updates, and feature iterations

**Target Users**: Initially personal + financial advisors; eventually 2-3 beta users, then productized.

---

## Tier 1: MVP (Week 1 — Hard Deadline)

### In Scope
1. **Data Aggregation**
   - IBKR API (primary): Real-time stock/bond prices, positions, cash
   - CPF: Manual input form (Singapore-specific; critical for full net worth view)
   - Placeholder data layers for DBS, Endowus (mock data to demo structure)

2. **Display & Analysis**
   - Single dashboard showing:
     - **Net worth breakdown** (Cash, Equities, CPF, Other)
     - **Active positions** (ticker, shares, cost basis, current value, unrealized P&L %)
     - **YTD return** (calculated from transactions + price changes)
     - **Asset allocation** (% by asset class)
   
3. **Prescriptive Insight**
   - **Rebalancing engine** (Tier 1 MVP):
     - User defines target allocation (e.g., 60% equity / 40% cash+CPF)
     - System flags positions that drift >5% from target
     - Suggests which positions to trim/add to rebalance
   
4. **Security**
   - Admin login (simple auth: email/password or passphrase)
   - Local storage of API keys (with warning about security trade-offs)
   - No public access

### Out of Scope for Tier 1
- DBS bank account sync (manual input only)
- Endowus integration (display only, manual input)
- Projection/forecasting
- Dividend tracking (future tier)
- Geographic/industry drill-down (future tier)
- Retirement planner (Tier 3)

---

## Tier 2: Intelligent Rebalancing Engine (Next Phase)

### Multi-Agent Rebalancing Governance

**Architecture**: 2-agent system with audit trail for institutional-grade governance

```
User clicks "Analyze Portfolio"
         ↓
    AGENT 1: Research (Claude Cowork)
    • Fetch current portfolio
    • Analyze market trends (web search)
    • Research ETF/Fund options
    • Calculate rebalancing trades
    • Assess risks & confidence
    • Output: Research Brief (markdown)
         ↓
    Dashboard displays Research Brief
    Forwarded to Advisor Review
         ↓
    AGENT 2: Advisor Review
    • Validate research quality
    • Apply personal constraints
    • Check tax efficiency
    • Recommend: Approve/Defer/Modify
    • Output: Advisor Review (markdown)
         ↓
    Dashboard displays both briefs
    Ready for your final decision
         ↓
    You approve or defer
    Decision logged to audit trail
```

### Agent 1: Research Agent (Tier 2.1)

**Purpose**: Data-driven market analysis & ETF/Fund research (no individual stocks)

**Input**: Current portfolio, target allocation, market data

**Process** (45-60 min):
1. Portfolio snapshot: Current vs. target drift analysis
2. Market research: Equity/fixed income/sector trends (web search)
3. Holdings assessment: Performance, valuation, concentration
4. Rebalancing targets: Which asset classes need adjustment
5. ETF research: 3-5 candidates per action (expense ratio, performance, AUM, yield)
6. Trade plan: Concrete buy/sell with prices and timing
7. Risk assessment: Market timing, currency, geopolitical, liquidity risks
8. Confidence scoring: HIGH/MEDIUM/LOW on each recommendation
9. Output: Research Brief (markdown, 8-10 pages)

**Key Output**: Research Brief includes
- Executive summary + market context
- Current portfolio assessment vs. target
- Recommended ETF/Fund picks (3-5 per action)
- Trade plan with expected execution prices
- Tax impact estimation
- Risks & caveats
- Confidence levels for each recommendation
- Next review date

### Agent 2: Advisor Review Agent (Tier 2.2)

**Purpose**: Apply personal judgment, constraints, and final recommendation

**Input**: Research brief, your profile (risk tolerance, constraints, life events)

**Validation** (15-30 min):
1. Research quality: Spot-check math, data sources, logic
2. Financial plan alignment: Does this move toward target? Fits quarterly cadence?
3. Personal constraints:
   - Emergency fund: Stays >SGD 50K?
   - Concentration: No position >10% post-rebalance?
   - Cash buffer: Maintains 12-20% range (target 15%)?
   - Tax: Harvesting opportunities? Long-term holding periods OK?
4. Execution practicality: ETF liquidity? Price impact? Phasing OK?
5. Final recommendation: **APPROVE** / **APPROVE WITH CONDITIONS** / **DEFER** / **REJECT**

**Key Output**: Advisor Review includes
- Validation checklist (all constraints checked)
- Personal context applied (goals, life events, tax situation)
- Modifications (if recommending changes to research plan)
- Implementation plan (Day 1-3 execution + monitoring)
- Risk triggers (what would cause you to pause)
- Approval status + reasoning

### Governance Rules (Built Into System)

**Approval Authority**:
- <SGD 50K: Self-approve (Lenix)
- SGD 50K–200K: Self-approve with optional advisor consultation
- >SGD 200K: Escalate to real financial advisor

**Frequency Limits**:
- Min rebalancing interval: 90 days (prevent over-trading)
- Max analysis requests: 2 per week (prevent analysis paralysis)
- Quarterly review: Recommended cadence

**Trade Restrictions**:
- ✅ ETF/Funds only (no individual stocks on rebalance)
- ❌ No margin or leverage
- ❌ No short selling or derivatives
- ❌ No currencies trading (stick to asset class rebalancing)
- Min ETF size: AUM >$500M (ensure liquidity)

**Risk Limits**:
- Max concentration per position: 10%
- Min emergency fund: SGD 50K (always maintain)
- Max cash drag: 20% of target allocation

**Audit Trail** (stored in localStorage):
```json
{
  "rebalancingHistory": [
    {
      "id": "rebal-2026-07-29-001",
      "date": "2026-07-29",
      "portfolio": "SGD 1.23M",
      "researchBrief": { "marketContext": "...", "recommendations": [...] },
      "advisorReview": { "approval": "APPROVE", "modifications": [...] },
      "userDecision": "APPROVE",
      "executedTrades": [
        { "ticker": "VTI", "action": "BUY", "shares": 70, "price": 227.50 }
      ],
      "results": { "actualAllocation": "60% equities", "nextReviewDate": "2026-10-29" }
    }
  ]
}
```

### Tier 2 Phase: Implementation

**When**: After Tier 1 is tested and working

**MVP Tier 2.1 (Research Agent)**:
- Manual trigger: "Analyze Portfolio" button
- Research agent researches using web search
- Outputs research brief (markdown) to dashboard
- Time: 45-60 min per analysis

**MVP Tier 2.2 (Advisor Review)**:
- You review research brief using checklist
- Self-review or escalate to Claude Cowork with advisor prompt
- Outputs advisor review (markdown)
- Time: 15-30 min per review

**Storage & Workflow**:
- Both briefs stored in localStorage (rebalancingHistory array)
- Displayable in dashboard with expand/collapse
- User clicks Approve/Defer with reasoning
- Audit trail grows with each rebalancing cycle

### Tier 2 Additional Features (Can Add Anytime)

- YTD/YTG dividend projections (based on historical trends)
- Geographic exposure breakdown (by country)
- Industry/sector weighting analysis
- Automated data sync from DBS + Endowus APIs (when available)
- Quarterly rebalancing reminders (email/dashboard)

---

## Tier 3: Long-Term Planning (Future Phase)

- Retirement projector
- Goal-based wealth planning
- Tax optimization suggestions
- Estate planning integration

---

## Architecture & Data Flow

### 1. Data Layer (Backend / API Integration)

```
┌─────────────────────────────────────────────────────┐
│           External Data Sources                      │
├─────────────────────────────────────────────────────┤
│  IBKR API       │  CPF (Manual)  │  DBS (Manual)    │
│  (Real-time)    │  (Form Input)  │  (Form Input)    │
└────────┬────────────┬──────────────┬─────────────────┘
         │            │              │
         └────────────┴──────────────┘
                      ↓
         ┌────────────────────────────┐
         │   Data Aggregation Layer   │
         │  (Fetch, normalize, cache) │
         └─────────────┬──────────────┘
                       ↓
         ┌────────────────────────────┐
         │   Unified Data Model       │
         │  (Holdings, Transactions)  │
         └─────────────┬──────────────┘
                       ↓
         ┌────────────────────────────┐
         │   Analysis Engine          │
         │  (Returns, rebalancing)    │
         └─────────────┬──────────────┘
                       ↓
         ┌────────────────────────────┐
         │   React Dashboard (UI)     │
         │  (Auth-gated, responsive)  │
         └────────────────────────────┘
```

### 2. Data Model (JSON Structure)

```json
{
  "portfolio": {
    "metadata": {
      "userId": "admin",
      "lastUpdated": "2024-07-29T10:30:00Z",
      "baseCurrency": "SGD"
    },
    "accounts": [
      {
        "id": "ibkr-001",
        "type": "IBKR",
        "holdings": [
          {
            "ticker": "AAPL",
            "isin": "US0378331005",
            "shares": 100,
            "costBasis": 150.00,
            "currentPrice": 225.50,
            "currency": "USD",
            "lastUpdated": "2024-07-29T10:30:00Z"
          }
        ],
        "cash": { "USD": 5000, "SGD": 2000 }
      },
      {
        "id": "cpf-001",
        "type": "CPF",
        "balances": {
          "ordinary": 150000,
          "special": 50000,
          "medisave": 75000,
          "lastUpdated": "2024-07-29"
        }
      },
      {
        "id": "dbs-001",
        "type": "Bank",
        "cash": { "SGD": 50000 },
        "lastUpdated": "2024-07-29"
      }
    ],
    "targetAllocation": {
      "equities": 0.60,
      "fixedIncome": 0.15,
      "cash": 0.15,
      "cpf": 0.10
    }
  },
  "transactions": [
    {
      "id": "txn-001",
      "type": "BUY",
      "ticker": "AAPL",
      "shares": 100,
      "price": 150.00,
      "date": "2024-01-15",
      "account": "ibkr-001"
    }
  ]
}
```

### 3. Key Calculations

**Net Worth** = Sum of all accounts (converted to base currency SGD)

**Unrealized P&L** = (Current Price × Shares) − Cost Basis

**Asset Allocation %** = Account Value / Net Worth

**Rebalancing Delta** = Current % − Target % (flag if |delta| > 5%)

**YTD Return** = (End Value − Start Value + Withdrawals − Contributions) / Start Value

---

## Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend | React + Tailwind CSS | Responsive, admin-gated |
| State Mgmt | React Context / useState | Simple for MVP |
| Data Storage | Browser localStorage + IndexedDB | Can migrate to backend later |
| API Clients | IBKR SDK, fetch/axios | Cowork will handle refresh cycles |
| Charts | Recharts or Chart.js | Simple net worth, allocation, P&L trends |
| Auth | Simple passphrase or email/password | LocalStorage session (upgrade for production) |

---

## Integration Points

### IBKR (Interactive Brokers) — Tier 1 Priority

**Status**: Claude connector available in Cowork

**Data to Fetch**:
- Account summary (cash, portfolio value)
- Open positions (ticker, shares, current price, cost basis)
- Recent trades (for transaction history)

**Refresh Frequency**: Nightly via Cowork automation (or on-demand click)

**Error Handling**: Cache last known values; alert if API fails

### CPF (Singapore) — Tier 1 Priority

**Status**: No API available; manual input form

**Form Fields**:
- Ordinary Account balance
- Special Account balance
- Medisave Account balance
- Last updated date
- Annual contribution (for projections in Tier 2)

**Data Storage**: localStorage (can migrate to backend)

### DBS Bank — Tier 1 Placeholder

**Status**: Manual input only for Tier 1

**Form Fields**:
- SGD cash balance
- USD cash balance (if multi-currency)
- Last updated date

**Future (Tier 2)**: Investigate DBS Open API for auto-sync

### Endowus (Investment Platform) — Tier 1 Placeholder

**Status**: Manual input only for Tier 1

**Form Fields**:
- Portfolio name
- Current value (SGD)
- Holdings (summary or detailed)
- Dividends received (YTD)

**Future (Tier 2)**: Check for Endowus API or CSV export

---

## UI/UX — Tier 1 MVP

### Layout

```
┌──────────────────────────────────┐
│  Admin Login (if not auth'd)     │
└──────────────────────────────────┘
       ↓ (after auth)
┌──────────────────────────────────────────────────┐
│  Header: "Wealth Dashboard" | Last Updated | Sync │
├────────────┬────────────┬────────────────────────┤
│ Nav:       │            │ Settings (Edit Target  │
│ Dashboard  │ Settings   │ Allocation, Refresh   │
│ Accounts   │ Help       │ API Keys)              │
│ Rebalance  │            │                        │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─ Net Worth Card ─┐  ┌─ YTD Return Card ─┐   │
│  │ SGD 1,234,567    │  │ +8.5% / SGD +98K  │   │
│  └──────────────────┘  └───────────────────┘   │
│                                                   │
│  ┌─ Asset Allocation ────────────────────────┐  │
│  │ [Pie Chart: Equities 60% | Cash 15% | CPF 10%] │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Holdings ────────────────────────────────┐  │
│  │ AAPL    100 sh  $22,550  +$7,550 (+50%)   │  │
│  │ GOOGL   50 sh   $8,900   −$1,100 (−11%)   │  │
│  │ CPF (Total)     $275,000  —               │  │
│  │ DBS Cash        $50,000   —               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Rebalance Alert ─────────────────────────┐  │
│  │ ⚠️  Equities at 65% (Target: 60%)         │  │
│  │    → Suggest: Sell $30K AAPL              │  │
│  │    → Suggest: Buy SGD Cash or CPF         │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Key Screens

1. **Dashboard** (default view)
   - Net worth summary
   - Asset allocation pie chart
   - Holdings table with P&L
   - Rebalancing alerts
   - Last sync timestamp

2. **Accounts** (detailed view)
   - Per-account breakdown (IBKR, CPF, DBS, Endowus)
   - Add/edit manual inputs
   - Sync status per integration

3. **Settings**
   - Admin login/logout
   - Target allocation sliders
   - API key management (IBKR)
   - Manual input forms (CPF, DBS, Endowus)
   - Data refresh settings

4. **Rebalance** (Tier 1 MVP — simple version)
   - Current allocation vs. target
   - Flagged positions (>5% drift)
   - Suggested actions (human-readable text)
   - ⚠️ No auto-execute in Tier 1 (manual confirmation required)

---

## Development Checklist — Tier 1 MVP

### Setup & Auth
- [ ] React boilerplate (Vite or CRA)
- [ ] Admin login (passphrase or email/password)
- [ ] localStorage for session + portfolio data
- [ ] Basic responsive CSS (Tailwind or custom)

### Data Layer
- [ ] IBKR API client (fetch positions, prices, cash)
- [ ] CPF manual input form
- [ ] DBS manual input form (placeholder)
- [ ] Endowus manual input form (placeholder)
- [ ] Unified data model (JSON structure above)
- [ ] Data persistence (localStorage/IndexedDB)

### Analysis Engine
- [ ] Net worth calculation (multi-currency, base to SGD)
- [ ] Unrealized P&L calculation
- [ ] Asset allocation % calculation
- [ ] Rebalancing delta logic (flag >5% drift)
- [ ] YTD return calculation (simple version)

### UI Components
- [ ] Dashboard view (cards, charts, tables)
- [ ] Asset allocation pie chart
- [ ] Holdings table (sortable, filterable)
- [ ] Rebalancing alert box
- [ ] Settings panel
- [ ] Manual input forms
- [ ] Sync status indicator

### Testing & Polish
- [ ] Test IBKR integration with real API
- [ ] Test manual input workflows
- [ ] Test multi-currency conversions (USD → SGD)
- [ ] Test rebalancing logic with edge cases
- [ ] Mobile responsiveness check
- [ ] Admin auth flow

---

## Handoff to Claude Cowork (Tier 1.5 → Tier 2 Transition)

Once Tier 1 is live, Cowork takes over for:

### Phase 1.5: Rebalancing Agents Setup
Once you're comfortable with the dashboard, set up Tier 2 rebalancing:

**Agent 1: Research Agent (Cowork)**
- Save prompt: `REBALANCING_RESEARCH_AGENT_PROMPT.md`
- Triggered by: User clicks "Analyze Portfolio" button
- Process: Market analysis, ETF research, trade recommendations (60 min)
- Output: Research Brief (markdown) → stored in dashboard

**Agent 2: Advisor Review Agent (Cowork or Self)**
- Save prompt: `REBALANCING_ADVISOR_AGENT_PROMPT.md`
- Triggered by: Research Brief completion
- Process: Validation, constraint checking, recommendation (30 min)
- Output: Advisor Review (markdown) → stored in dashboard

**Dashboard Integration**:
- New "Analyze Portfolio" button in Settings/Rebalance panel
- Shows: Research Brief (expandable) → Advisor Review (expandable)
- Audit trail: All analyses, decisions, executions logged
- Status: Ready for user approval/deferral

### Phase 2: Ongoing Automation

1. **Automated Data Syncs**
   - Nightly IBKR refresh (prices, positions, trades)
   - Weekly portfolio snapshot for trend analysis
   - CPF/DBS/Endowus manual input reminders

2. **Ongoing Maintenance**
   - Bug fixes + UX refinements
   - Rebalancing agent tuning (improve research quality)
   - API key rotation + security updates

3. **Documentation for Cowork**
   - This Claude.md serves as the system manual
   - Add runbooks for common tasks:
     - "How to run a rebalancing analysis" (use Research Agent)
     - "How to review a research brief" (use Advisor Agent)
     - "How to interpret confidence scores"
     - "How to adjust rebalancing thresholds"
     - "How to debug IBKR API errors"

---

## Success Criteria — Tier 1

✅ **Day 1**: Admin login works, empty dashboard loads  
✅ **Day 2**: IBKR integration live, positions display correctly  
✅ **Day 3**: CPF/DBS manual forms work, net worth calculated  
✅ **Day 4**: Asset allocation chart + YTD return calculated  
✅ **Day 5**: Rebalancing logic working, suggestions display  
✅ **By EOW**: Full Tier 1 tested, documented, demo-ready  

---

## Known Constraints & Trade-offs

| Issue | Tier 1 Decision | Tier 2+ Path |
|-------|-----------------|-------------|
| No API for CPF/DBS | Manual input | Investigate official APIs or direct bank connections |
| Multi-currency complexity | Convert to base SGD at fetch time | Build currency hedge dashboard |
| Real-time vs. caching | Nightly refresh (IBKR) | Add live price ticker for key positions |
| Rebalancing prescriptions only | Text suggestions, manual execution | Auto-rebalance with broker API (requires higher security) |
| No transaction history sync | Manual trades from IBKR (one-time) | Full transaction history + tax reporting |
| No dividend tracking | Display only | Full dividend calendar + reinvestment tracking |

---

## Future Product Considerations

Since this may become a product (with 2-3 beta advisors):

### 1. **2-Agent Governance as Core Product Feature**

The multi-agent rebalancing system is your institutional-grade moat:

- **Research Agent**: Scalable, consistent analysis (works for 1 user or 100)
- **Advisor Review Agent**: Can be you, a real advisor, or another Claude instance
- **Audit Trail**: Every decision logged, enables learning & compliance
- **Separation of Concerns**: Research (data) + Review (judgment) = auditable

**For Product Scale**:
- Clients get: Transparent research + governance, not just recommendations
- Advisors get: Audit trail, confidence scores, risk assessments
- You get: Data on which recommendations succeed/fail, improve over time

### 2. **Architecture for Scale**

- Separate frontend (React) from backend (Node/Python)
- API layer for multi-user tenancy
- Database (PostgreSQL) instead of localStorage
- Queue system (Bull/Celery) for async Cowork agent triggers
- Multi-broker support (IBKR, others via adapters)

### 3. **Security Upgrades**

- Encrypted API key storage (not plaintext localStorage)
- OAuth2 for broker integrations (instead of manual key input)
- Role-based access (admin, advisor, read-only)
- Audit logs for all portfolio changes + recommendations

### 4. **Compliance**

- Regulatory sign-off (if advising others in Singapore)
- Audit trail for every rebalancing recommendation (built-in via Tier 2)
- Disclaimer templates for wealth advisors
- Tax reporting (integrate with accountants if needed)

### 5. **Product Positioning**

**MVP (You)**: Personal wealth dashboard + governance-driven rebalancing

**Beta (2-3 Advisors)**: Advisors use your dashboard to advise clients
- Advisors appreciate: Transparent analysis, audit trail, research depth
- Clients see: Where recommendations come from (research-based, not opaque)

**Product (Eventually)**: Platform for advisory firms
- "Research-backed, auditable rebalancing for your clients"
- Charge monthly subscription per advisor + per client
- 2-agent governance built-in from day one (not added later)

---

## References & Useful Links

- **IBKR API Docs**: [Interactive Brokers API](https://ibkr.com/api)
- **Singapore CPF**: [cpf.gov.sg](https://www.cpf.gov.sg)
- **Cowork Automation**: Claude Cowork documentation
- **React Best Practices**: React official docs

---

## Questions & Contact

For clarifications during Claude Code build:
- Reach out with specific error messages or integration blockers
- Test rebalancing logic with sample portfolios before finalizing
- Confirm API key handling approach with security team (pre-product launch)
