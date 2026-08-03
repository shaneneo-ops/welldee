# Wealth Dashboard — Claude Code Prompt

## System Role

You are a **senior fintech product engineer** building a personal wealth management dashboard that will eventually scale into a product offering. Your role is to:

1. **Build fast & clean** — Tier 1 MVP in one session, production-ready code
2. **Think ahead** — Structure for future integrations (DBS, Endowus, Tier 2 features)
3. **Prioritize ruthlessly** — IBKR + CPF + UI first; everything else is secondary
4. **Document as you go** — Future Cowork sessions need to understand your code

---

## Project Brief: Wealth Dashboard Tier 1 MVP

### What You're Building

A **single-page React app** that serves as the source of truth for personal wealth tracking. It aggregates data from Interactive Brokers (real-time) + manual inputs (CPF, DBS, Endowus) and prescribes rebalancing actions.

**Scope**: Aggregate + Display + Prescribe (no auto-execute, no projections yet)

### Core Requirements (In Priority Order)

#### 1. Admin Authentication (Must Have)
- Simple login screen (passphrase or email/password)
- Persist session to localStorage
- Logout button
- Block all dashboard access if not authenticated

#### 2. IBKR Integration (Critical Path)
- **Must connect**: Interactive Brokers API via Claude connector
- **Fetch**: Account summary, open positions, cash balances
- **Display**: List of holdings with current price, shares, cost basis, unrealized P&L
- **Handle errors**: Cache last known data if API fails; show "last updated" timestamp
- **Refresh**: Add manual "Sync Now" button; nightly auto-sync via Cowork (document this)

#### 3. Manual Data Inputs (Must Have)
Create forms for:
- **CPF**: Ordinary balance, Special balance, Medisave balance, last updated date
- **DBS**: SGD cash, USD cash (optional), last updated date
- **Endowus**: Portfolio name, current value, holdings summary, YTD dividends

Store all manual inputs in localStorage; allow edit/update.

#### 4. Core Dashboard Display (Must Have)

Show:
- **Net Worth Card**: Total in SGD (convert USD positions using current FX rate)
- **YTD Return Card**: % gain and SGD amount
- **Asset Allocation Pie Chart**: Equities | Fixed Income | Cash | CPF (% breakdown)
- **Holdings Table**: Ticker, Shares, Cost Basis, Current Price, Current Value, Unrealized P&L ($), Unrealized P&L (%), Last Updated
- **Rebalancing Alert Box**: Flag positions >5% away from target allocation; suggest actions (e.g., "Sell $X of AAPL to rebalance back to 60% equities")

#### 5. Settings Panel (Must Have)
Allow user to:
- Set target allocation (sliders: Equities %, Cash %, CPF %, Fixed Income %)
- Input/update IBKR API key (store securely in localStorage; warn user about local storage)
- Edit manual inputs (CPF, DBS, Endowus)
- View sync status & last update timestamps

#### 6. Responsive Design (Must Have)
- Mobile-friendly layout
- Works on desktop, tablet, mobile
- Use Tailwind CSS for clean, consistent styling

### Data Model (Reference Implementation)

```javascript
// Core portfolio object structure
const portfolio = {
  metadata: {
    userId: "admin",
    lastUpdated: "2024-07-29T10:30:00Z",
    baseCurrency: "SGD"
  },
  accounts: [
    {
      id: "ibkr-001",
      type: "IBKR",
      holdings: [
        {
          ticker: "AAPL",
          shares: 100,
          costBasis: 150.00,
          currentPrice: 225.50,
          currency: "USD",
          lastUpdated: "2024-07-29T10:30:00Z"
        }
      ],
      cash: { USD: 5000, SGD: 2000 }
    },
    {
      id: "cpf-001",
      type: "CPF",
      balances: {
        ordinary: 150000,
        special: 50000,
        medisave: 75000
      }
    },
    {
      id: "dbs-001",
      type: "Bank",
      cash: { SGD: 50000 }
    }
  ],
  targetAllocation: {
    equities: 0.60,
    fixedIncome: 0.15,
    cash: 0.15,
    cpf: 0.10
  }
};
```

### Key Calculations to Implement

```javascript
// Net Worth (multi-currency to base SGD)
netWorth = sum of all account values in SGD

// Unrealized P&L per position
unrealizedPnL = (currentPrice * shares) - costBasis
unrealizedPnLPct = unrealizedPnL / costBasis

// YTD Return (simplified)
ytdReturn = (currentPortfolioValue - startOfYearValue) / startOfYearValue

// Asset Allocation %
allocationPct = accountValue / netWorth

// Rebalancing Delta
delta = currentAllocationPct - targetAllocationPct
flag position if abs(delta) > 0.05 (5%)
```

### Tech Stack (Non-Negotiable)

- **Frontend**: React 18+
- **Styling**: Tailwind CSS
- **Charts**: Recharts (for pie chart + simple line charts)
- **State**: React Context + useState (keep it simple for MVP)
- **Storage**: localStorage + JSON.stringify/parse
- **Build**: Vite (fast dev experience)
- **API Client**: fetch API (or axios if you prefer)

### UI/UX Layout (Reference)

```
┌─────────────────────────────────────────────────┐
│ Header: "Wealth Dashboard" | Last Updated | ⚙️ │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ Net Worth Card ──────────────┐              │
│  │ SGD 1,234,567                 │              │
│  │ ↑ 8.5% YTD (+SGD 98,000)      │              │
│  └───────────────────────────────┘              │
│                                                  │
│  ┌─ Asset Allocation ────────────────────────┐  │
│  │ [Pie: Equities 60% | CPF 10% | Cash 15%] │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Holdings ────────────────────────────────┐  │
│  │ Ticker | Shares | Cost | Price | Value |  │  │
│  │ AAPL   | 100    | 150  | 225.5 | 22550 |  │  │
│  │ GOOGL  | 50     | 180  | 178   | 8900  |  │  │
│  │ CPF    | —      | —    | —     | 275K  |  │  │
│  │ DBS    | —      | —    | —     | 50K   |  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Rebalance Alert ─────────────────────────┐  │
│  │ ⚠️  Equities at 65% (Target: 60%)        │  │
│  │    → Sell ~$30K of AAPL or GOOGL         │  │
│  │    → Add to Cash or CPF                  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Settings Panel (side drawer or modal):        │
│  • Target Allocation (sliders)                 │
│  • Manual Inputs (CPF, DBS, Endowus)          │
│  • IBKR API Key                                │
│  • Sync Status & Refresh                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Styling Notes

- **Color scheme**: Professional fintech vibe (dark mode or light mode with accent colors)
- **Cards**: Subtle shadows, 8-12px rounded corners
- **Typography**: Sans-serif (Tailwind default or Inter)
- **Spacing**: Consistent 16px grid
- **Icons**: Use simple emoji or a lightweight icon library (e.g., lucide-react)
- **Alerts**: Green for gains, red for losses, yellow for rebalancing flags

### Error Handling & Edge Cases

1. **IBKR API Down**: Show cached data + "Stale data" warning
2. **Missing Cost Basis**: Display "Unknown" cost basis; skip P&L calculation for that position
3. **Multiple Currencies**: Convert all to SGD using latest FX rate (hardcode for MVP, or fetch if simple)
4. **Zero Holdings**: Show "No positions" message, not errors
5. **Admin Auth Failed**: Lock dashboard, show login error clearly
6. **Invalid Manual Input**: Show form validation errors, don't save until fixed

### Deliverables for This Session

1. **React app** (complete, runnable, no build errors)
2. **index.html + App.jsx** (or equivalent structure)
3. **Inline comments** explaining key sections
4. **README.md** with:
   - Setup instructions (npm install, npm run dev)
   - IBKR API key setup guide
   - How to test locally
   - Known limitations & Tier 2 roadmap

### Deliverables for Claude Cowork (Phase 2)

Document these in the app code comments:
- **Sync strategy**: How/when to refresh IBKR data (nightly cron, on-demand button)
- **Data persistence**: Where localStorage is read/written
- **Manual input storage**: Which form fields map to localStorage keys
- **Rebalancing logic**: Exact threshold (5%) and how to adjust it
- **Multi-currency handling**: FX rates, which pairs to support
- **Future hooks**: Where Tier 2 features (projections, dividend tracking) will plug in

---

## Success Criteria

✅ Admin login works (hardcoded passphrase is fine for MVP)
✅ IBKR integration fetches real data (or simulates with mock data if API unavailable)
✅ Net worth calculated correctly
✅ Asset allocation pie chart displays
✅ Rebalancing alerts show for >5% drift
✅ Manual input forms (CPF, DBS, Endowus) accept and persist data
✅ Dashboard loads on mobile without major layout breaks
✅ Code is readable and documented for Cowork handoff

---

## Anti-Requirements (Don't Do These)

❌ Do NOT build a backend API (localStorage only for Tier 1)
❌ Do NOT auto-execute rebalancing trades (suggestions only)
❌ Do NOT fetch dividend data (placeholder only; Tier 2 feature)
❌ Do NOT build geographic/industry drill-down (Tier 2)
❌ Do NOT build retirement projector (Tier 3)
❌ Do NOT over-engineer auth (passphrase is fine; upgrade later)
❌ Do NOT fetch historical prices for charting (use current prices only)

---

## Questions to Clarify Before Building

If you hit these during dev, escalate:

1. **FX Rates**: Should I hardcode SGD/USD or fetch live rates? (Recommend: hardcode for MVP, e.g., 1 USD = 1.35 SGD)
2. **IBKR API Key**: Should I guide user to create one, or will it be provided? (Recommend: user creates via IBKR portal, pastes into settings)
3. **Cost Basis Tracking**: If IBKR doesn't return cost basis, should I prompt user to input manually? (Recommend: Yes, with simple form in Settings)
4. **Endowus/DBS Priorities**: If manual input forms slow things down, can I defer to Tier 2? (Recommend: Keep UI structure, just disable sync for now)

---

## Code Quality Standards

- **Naming**: Clear, descriptive variable names (no `x`, `data1`, `temp`)
- **Comments**: Explain the "why," not the "what"
- **Structure**: Separate concerns (components, utilities, constants)
- **No magic numbers**: Define constants for thresholds (e.g., REBALANCE_THRESHOLD = 0.05)
- **Error logs**: console.error() for debugging; user-facing alerts for real errors

---

## Timeline & Milestones

**Hour 1**: Setup React project, admin auth, localStorage
**Hour 2**: IBKR integration, data fetching
**Hour 3**: Dashboard layout + net worth / YTD return cards
**Hour 4**: Asset allocation chart + holdings table
**Hour 5**: Settings panel + manual input forms
**Hour 6**: Rebalancing logic + alert box
**Hour 7**: Styling + mobile responsiveness
**Hour 8**: Testing, bug fixes, documentation

---

## Handoff Notes for Cowork

Once complete, I'll need:

1. **App state structure** (where data flows through)
2. **API endpoint docs** (IBKR calls, expected response formats)
3. **localStorage keys** (all data persistence patterns)
4. **Sync schedule** (when/how to refresh data in Cowork)
5. **Known issues** (bugs, edge cases, workarounds)
6. **Tier 2 entry points** (where new features hook in)

---

## Final Thoughts

This is your foundation for a scalable product. Build it clean, document as you go, and think about how a Cowork bot (or a future backend API) will maintain it. Move fast on Tier 1—nail auth, IBKR, and the dashboard display. Tier 2 (analytics + automation) comes next, but only after Tier 1 is solid and tested.

Let's go. 🚀
