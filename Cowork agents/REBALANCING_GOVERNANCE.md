# Rebalancing Governance & Multi-Agent Architecture

## Recommendation: Why Multi-Agent Governance?

You asked: **"Should it be a research agent + advisor review agent?"**

**My recommendation: Yes.** Here's why:

1. **Separation of Concerns**: Research is objective (data-driven analysis). Advisor review is subjective (risk appetite, constraints, life circumstances). Keep them separate so each can be audited independently.

2. **Scalability**: If this becomes a product, this pattern scales. You can use different AI models for each role, or replace one agent with a human advisor without rewriting the system.

3. **Audit Trail**: Each agent produces timestamped output with reasoning. If a rebalancing decision goes wrong, you can trace exactly where it diverged from the analysis.

4. **Lenix's Expertise**: You come from supply chain + demand planning. This is like a **planning workflow with governance**—you already know how to do this at scale.

---

## Architecture: 2-Agent Rebalancing Pipeline

```
User Triggers "Analyze Portfolio" (Manual)
                    ↓
        ┌───────────────────────────┐
        │  RESEARCH AGENT           │
        │  (Claude Cowork + Web)    │
        ├───────────────────────────┤
        │ • Fetch current portfolio │
        │ • Analyze market trends   │
        │ • Research ETF/Fund picks │
        │ • Calculate rebalancing   │
        │   deltas vs. target       │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ RESEARCH BRIEF OUTPUT:    │
        │ • Market context          │
        │ • Sector trends           │
        │ • ETF recommendations     │
        │ • Rebalancing actions     │
        │ • Confidence scores       │
        │ • Risks/caveats           │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │  ADVISOR REVIEW AGENT     │
        │  (Lenix or real advisor)  │
        ├───────────────────────────┤
        │ • Review research brief   │
        │ • Assess fit for your     │
        │   risk/constraints        │
        │ • Flag concerns           │
        │ • Recommend approve/reject│
        │ • Add personal context    │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ ADVISOR REVIEW OUTPUT:    │
        │ • Approval status         │
        │ • Rationale               │
        │ • Modifications (if any)  │
        │ • Implementation plan     │
        │ • Next review date        │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │  USER DECISION            │
        │  (You approve & execute   │
        │   or defer)               │
        └───────────────────────────┘
                      ↓
        ┌───────────────────────────┐
        │  EXECUTION & LOGGING      │
        │  • Log decision to audit  │
        │  • Store research brief   │
        │  • Update portfolio model │
        │  • Next review date       │
        └───────────────────────────┘
```

---

## Agent 1: Research Agent (Claude Cowork)

### Inputs
- Current portfolio (from dashboard)
- Target allocation (from settings)
- Market date & time
- User constraints (if any)

### Process

1. **Market Analysis**
   - Fetch trending indices (S&P 500, Nasdaq, MSCI World, etc.)
   - Analyze sector rotation (which sectors are outperforming)
   - Check macro trends (yields, inflation, FX rates, geopolitical)
   - Research output: brief market summary with trend scores

2. **Current Portfolio Assessment**
   - Calculate current allocation vs. target
   - Flag drift >5%
   - Analyze current holdings (performance, volatility, dividend yield)
   - Identify concentration risk (e.g., "50% in US equities")

3. **ETF/Fund Research**
   - For each drift-flagged asset class, research top-performing ETFs/Funds
   - Criteria to evaluate:
     - Expense ratio (<0.20% for passive, <0.50% for active)
     - YTD performance vs. benchmark
     - 5-year annualized return
     - Dividend yield (if relevant)
     - AUM (avoid too-small funds)
     - Sector/geographic exposure
   - Sources: Morningstar API (if available), Yahoo Finance, ETF provider websites
   - Output: ranked list of 3-5 ETF options per asset class

4. **Rebalancing Calculation**
   - For each flagged position, calculate:
     - How much to sell/buy
     - Which ETFs to buy/sell
     - Total transaction cost estimate
     - Tax implications (if tracked)
   - Output: concrete action plan

5. **Confidence & Risk Assessment**
   - Rate confidence in each recommendation (High/Medium/Low)
   - Flag risks (e.g., "Interest rate risk if rates continue to fall", "Geopolitical uncertainty in emerging markets")
   - Note caveats (e.g., "Based on past 6 months data", "No guarantee of future performance")

### Output: Research Brief (Markdown)

```markdown
# Rebalancing Research Brief
**Date**: 2024-07-29
**Portfolio Value**: SGD 1,234,567
**Analysis Triggered By**: Manual request

## Executive Summary
Portfolio is **2% overweight** in Equities (current 62% vs. target 60%).
Market conditions favor maintaining equity allocation. Recommend rotating $30K from
US-heavy positions to international ETFs for geographic diversification.

## Market Context
- S&P 500: Up 15% YTD, trading at 19.5x P/E (slightly elevated)
- Nasdaq: Up 18% YTD (tech-heavy; concentration risk)
- MSCI World: Up 12% YTD
- Interest Rates: Fed holding steady; 10-year at 4.2%
- USD: Strong; SGD holding steady vs. basket

**Trend**: Broad equity rally; rotation toward value + international slowing.

## Current Portfolio Assessment
| Asset Class | Current | Target | Delta | Action |
|-------------|---------|--------|-------|--------|
| US Equities | 42% | 40% | +2% | Trim $25K |
| Intl Equities | 20% | 20% | 0% | Hold |
| Fixed Income | 15% | 15% | 0% | Hold |
| CPF | 10% | 10% | 0% | Hold |
| Cash | 13% | 15% | -2% | Add $25K |

**Key Risks**: 
- Concentration in US tech (AAPL, GOOGL = 30% of equities)
- Currency risk: 50% of portfolio in USD

## Recommendations

### Action 1: Trim US Equities (Sell $25K)
**Rationale**: Slight overweight + valuation caution

| Current Holding | Sell | Suggested Replacement | Reason |
|-----------------|------|----------------------|--------|
| AAPL (100 sh) | $22.5K (50%) | VTI (Vanguard Total US) | Reduce single-stock risk; diversify |
| GOOGL (50 sh) | $2.5K (50%) | — | — |

**Replacement ETF**: VTI (Vanguard Total US Market ETF)
- Expense Ratio: 0.04%
- YTD Performance: +15.2%
- Diversified across 3,500+ US stocks
- Recommended allocation: 70% VTI, 30% GOOGL (if you like tech exposure)

**Confidence**: HIGH (US equities are holding strong; this is tactical optimization)

### Action 2: Add International Exposure (Buy $15K)
**Rationale**: Diversify geographic risk; international valuations attractive

**Recommended ETF**: VXUS (Vanguard Intl Total Stock Market)
- Expense Ratio: 0.09%
- YTD Performance: +12.5% (USD-denominated)
- Geographic breakdown: Europe 40%, Asia-Pacific 35%, Emerging Markets 25%
- Currency exposure: Natural hedge if SGD weakens

**Confidence**: MEDIUM (emerging markets volatile; monitor political risk)

### Action 3: Rebalance to Cash (Add $10K)
**Rationale**: Bring Cash % closer to target 15%; prepare for opportunistic buying

**Where to Hold**: 
- SGD Cash (50%): Keep in DBS savings for daily access
- USD Cash (50%): Hold in IBKR money market or short-term Treasury fund

**Recommended Treasury Fund**: VGIT (Vanguard Intermediate Treasury ETF)
- Yield: ~4.5% (higher than money market)
- Duration: 5.3 years (minimal rate risk)
- If rates stay elevated, great income generator

**Confidence**: HIGH (rate environment supports cash yields)

## Tax Implications
- AAPL sale: If held >1 year, long-term capital gains tax (assume ~15% US capital gains)
- Estimated tax cost: ~$1,125 on $7,550 gain
- **Action**: Consider tax-loss harvesting opportunities in other positions first

## Summary of Trades
```
SELL $25,000:
  - AAPL: Sell 50 shares @ $225.50 = $11,275
  - GOOGL: Sell 25 shares @ $178 = $4,450
  - Cash from trimming = $25,000 available

BUY $25,000:
  - VTI: Buy $15,000 (66 shares @ ~$228)
  - VXUS: Buy $5,000 (22 shares @ ~$228)
  - VGIT: Buy $5,000 (35 shares @ ~$142)

NET EFFECT:
  - US Equities: 42% → 40% (target achieved)
  - International Equities: 20% → 22% (+2%)
  - Fixed Income/Cash: 15% + 13% → 14% + 15% (more balanced)
```

## Risks & Caveats
⚠️ **Market Timing Risk**: This analysis is a snapshot as of 2024-07-29. Market conditions change daily.

⚠️ **Execution Risk**: Prices will change between analysis and execution. Recommend placing limit orders 0.5-1% above/below research prices.

⚠️ **Currency Risk**: VXUS is USD-denominated; SGD strength could reduce returns. Consider SGD-hedged alternative (VXVS) if concerned.

⚠️ **Interest Rate Risk**: If Fed raises rates, bond holdings (VGIT) will decline in value. Short-term pain, long-term gain if rates stay elevated.

## Next Review
Recommend quarterly rebalancing check (next: October 2024) or when portfolio drifts >10% from target.

---

**Research Analyst**: Claude Research Agent v1.0
**Analysis Duration**: 45 minutes
**Data Sources**: IBKR API, Yahoo Finance, Morningstar, Federal Reserve
```

---

## Agent 2: Advisor Review Agent

### Inputs
- Research Brief (from Research Agent)
- Your personal constraints (risk appetite, life goals, planned expenses)
- Advisor guidelines (if you have a real advisor)

### Process

1. **Validate Research**
   - Are the ETF picks aligned with your goals?
   - Are the trades tax-efficient?
   - Are there any overlapping positions (e.g., VTI + individual US stocks = redundancy)?

2. **Apply Personal Context**
   - Life events: retirement timeline, major expenses coming, etc.
   - Risk tolerance: Conservative? Moderate? Aggressive?
   - Constraints: Minimum cash buffer? Avoid certain sectors? ESG preferences?
   - Tax situation: Any loss harvesting opportunities? Holding period concerns?

3. **Advisor Perspective**
   - Cross-check against financial plan or investment policy statement (IPS)
   - Flag any deviations
   - Suggest modifications if needed
   - Recommend approval, conditional approval, or rejection

4. **Implementation Guidance**
   - How to execute trades (all at once vs. dollar-cost average)
   - When to execute (market open, specific day, etc.)
   - How to handle partial fills or price slips
   - How to track results

### Output: Advisor Review (Markdown)

```markdown
# Advisor Review & Recommendation
**Reviewed By**: Lenix Neo (Self-Advisor Mode)
**Date**: 2024-07-29
**Review Time**: 15 minutes

## Summary
✅ **APPROVED** — Research brief is sound and aligns with your goals.

## Validation Checklist
- [x] Trades reduce concentration risk (good)
- [x] ETF picks are low-cost, liquid, diversified
- [x] No overlapping positions (clean transition)
- [x] Tax impact manageable (~$1,125 is acceptable)
- [x] Maintains 3-month cash buffer (good emergency fund)
- [x] Timeframe aligns with quarterly review cycle (good discipline)

## Personal Context Applied
**Risk Appetite**: Moderate (based on 60% equity target)
**Time Horizon**: 20+ years (retirement ~45-50 years away)
**Constraints**: Maintain SGD 50K emergency fund (✅ satisfied post-rebalance)
**Goals**: Long-term wealth building, retirement readiness, geographic diversification

**Verdict**: All trades support these goals.

## Modifications
None recommended. Research brief is ready to execute as-is.

## Implementation Plan

**Timing**: Execute over 3 trading days (Mon-Wed) to avoid single-day market impact

**Day 1 (Monday)**:
  - Place limit order: SELL 50 AAPL @ $226 (1% above research price)
  - Place limit order: BUY 66 VTI @ $227 (1% below research price)

**Day 2 (Tuesday)**:
  - Place limit order: SELL 25 GOOGL @ $179 (1% above research price)
  - Place limit order: BUY 22 VXUS @ $227 (at research price)

**Day 3 (Wednesday)**:
  - Place limit order: BUY 35 VGIT @ $141 (0.5% below research price)
  - Monitor fills; adjust Day 4 if needed

**Why this approach?**
- Spreads execution across 3 days (reduces market impact risk)
- Leaves flexibility if prices move unexpectedly
- Allows you to cancel if market conditions change dramatically

## Risks You Should Monitor
1. **Tech Sector Rotation**: If tech outperforms significantly after this trade, you may feel FOMO. Remember: this is about diversification, not timing the market.
2. **Interest Rate Surprise**: If Fed cuts rates aggressively, bond holdings (VGIT) will appreciate. This is a *good* outcome long-term.
3. **SGD Appreciation**: If SGD strengthens vs. USD, international holdings will show paper losses. Normal volatility; stay the course.

## Next Steps
1. ✅ Review this recommendation (done—you're reading it)
2. ⬜ Execute trades Day 1-3 (your call)
3. ⬜ Log execution prices in dashboard
4. ⬜ Schedule next review: 2024-10-29 (quarterly)
5. ⬜ Or trigger a new analysis if portfolio drifts >10%

## Questions for Your Consideration
- Do you feel comfortable with the geographic split (60% US, 40% international)?
- Would you prefer a more defensive position (e.g., 50/50 equity/bond) given market uncertainty?
- Should we explore ESG or dividend-focused ETFs for income in future rebalances?

---

**Advisor**: Lenix Neo (Self-Review)
**Advisor Type**: Self-advisor (can escalate to professional advisor if desired)
**Recommendation**: Approve & execute
```

---

## Integration with Dashboard (Tier 1.5)

### UI Addition: Rebalancing Panel

```
Dashboard → Settings → "Analyze Portfolio" button

┌──────────────────────────────────────────────┐
│ REBALANCING ANALYSIS                         │
├──────────────────────────────────────────────┤
│                                               │
│ Current Allocation vs. Target:                │
│ [Chart showing drift]                         │
│                                               │
│ Status: ⏳ Analysis in Progress...            │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ STEP 1: Market Research                 │  │
│ │ ✅ Complete (15 min ago)                 │  │
│ │                                          │  │
│ │ ▼ View Research Brief (expandable)       │  │
│ │   - Market trends                        │  │
│ │   - ETF recommendations                  │  │
│ │   - Confidence scores                    │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ STEP 2: Advisor Review                  │  │
│ │ ✅ Complete (10 min ago)                 │  │
│ │                                          │  │
│ │ ▼ View Advisor Review (expandable)       │  │
│ │   - Validation checklist                 │  │
│ │   - Personal context applied             │  │
│ │   - Recommendation: APPROVE              │  │
│ │   - Implementation plan                  │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ STEP 3: Your Decision                   │  │
│ │                                          │  │
│ │ [Approve] [Defer] [Modify] [View Log]   │  │
│ │                                          │  │
│ │ Approval stores decision + logs to       │  │
│ │ audit trail for accountability           │  │
│ └─────────────────────────────────────────┘  │
│                                               │
└──────────────────────────────────────────────┘
```

### Dashboard Storage (localStorage)

```json
{
  "rebalancingHistory": [
    {
      "id": "rebal-2024-07-29-001",
      "date": "2024-07-29T10:30:00Z",
      "status": "APPROVED",
      "researchBrief": { /* full markdown content */ },
      "advisorReview": { /* full markdown content */ },
      "userDecision": "APPROVE",
      "executedTrades": [
        { "ticker": "AAPL", "action": "SELL", "shares": 50, "price": 226.00, "date": "2024-07-30" },
        { "ticker": "VTI", "action": "BUY", "shares": 66, "price": 227.50, "date": "2024-07-30" }
      ],
      "executionLog": "Trades completed over 3 days; all filled at or better than limit prices",
      "nextReviewDate": "2024-10-29"
    }
  ]
}
```

---

## Governance Rules (Lenix's Guardrails)

Document these upfront:

```markdown
# Rebalancing Governance Guardrails

## Approval Authority
- **Rebalancing <SGD 50K**: Self-approve (Lenix)
- **Rebalancing SGD 50K–200K**: Self-approve with advisor consultation (optional)
- **Rebalancing >SGD 200K**: Escalate to real financial advisor for review

## Frequency Limits
- Minimum rebalancing interval: 90 days (prevent over-trading)
- Maximum analysis requests: 2 per week (prevent analysis paralysis)
- Quarterly review: Recommended, optional

## Trade Restrictions (MVP)
- No margin or leverage
- No short selling
- No derivatives (options, futures)
- No currencies (stick to asset class rebalancing)
- No single-stock additions (ETF/Funds only)
- Minimum ETF size: AUM >$500M

## Risk Limits
- Max concentration in single ticker: 10%
- Max cash drag: 20% of target (e.g., target 15% cash → never go below 12%)
- Min emergency fund: SGD 50K (always maintain)

## Tax Optimization
- Tax-loss harvesting: Encouraged when P&L is negative
- Long-term holding preference: Don't sell if <1 year, unless rebalancing critical
- Wash-sale awareness: Don't repurchase same/similar ETF within 30 days

## Audit Trail
- Every analysis, approval, rejection, modification is logged
- Timestamp + reasoning stored in localStorage
- Quarterly export to CSV for advisor review (if desired)
```

---

## Recommendation Summary for You

| Aspect | Recommendation | Rationale |
|--------|-----------------|-----------|
| **Agent Count** | 2 agents (Research + Advisor) | Separate concerns; auditability; scalable |
| **Research Scope** | Full market analysis + research reports | Yields + valuations + sector rotation = better decisions |
| **Advisor Type** | Start as self-advisor; escalate to real advisor later | You have the expertise; but build pattern for productization |
| **ETF Universe** | Any ETF/Fund; no individual stocks on rebalance | Simplicity; passive indexing; lower fees |
| **Trigger** | Manual only (you click "Analyze") | Prevents over-analysis; keeps you in control |
| **Governance Rules** | Guardrails by trade size + frequency | Prevents reckless rebalancing; encourages discipline |
| **Audit Trail** | Store every analysis + decision + execution | Future accountability; productization foundation |

This is **sophisticated but not overengineered**. You can start with this in Cowork, prove it works for your portfolio, then evolve into advisor tools or a productized offering.

---

## Next: Rebalancing Prompt

I'll now write the **Claude Cowork prompt** for the Research Agent (agent #1). The Advisor Review Agent can be you initially, then evolve into a second Claude agent or integrate with your real advisor's review process.
