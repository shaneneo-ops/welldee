# Rebalancing Governance — Quick Start Guide

## The Vision (Why This System?)

You're building a **research-driven, audit-friendly rebalancing system** that will:

1. **Analyze** market trends + your portfolio → research brief with confidence scores
2. **Review** that brief through an advisor lens → validate logic, apply personal context
3. **Decide** whether to approve/defer/modify → audit trail of all decisions
4. **Execute** trades if approved → log results for future learning

This scales from your personal system → to an advisor tool → to a productized wealth management platform.

---

## Three Documents, One Workflow

### 📋 Document 1: REBALANCING_GOVERNANCE.md
**What**: Blueprint for the system
**Who reads**: You (Lenix) + anyone implementing this system
**Use when**: Designing the workflow, understanding the architecture, justifying to stakeholders

**Key sections**:
- Why 2-agent governance? (see "Recommendation" section)
- 2-agent architecture diagram
- Agent 1 (Research) workflow
- Agent 2 (Advisor) workflow
- Dashboard UI mockup
- Governance guardrails (limits, rules, audit trail)
- Future productization notes

**Bottom line**: This is your system design document.

---

### 🔬 Document 2: REBALANCING_RESEARCH_AGENT_PROMPT.md
**What**: Executable prompt for the Research Agent (Agent #1)
**Who uses**: Claude in Cowork, when you trigger "Analyze Portfolio"
**Use when**: You click "Analyze" in dashboard; Research Agent handles everything from data fetch to research brief output

**Key workflow**:
1. Fetch current portfolio
2. Analyze market trends (web search)
3. Research ETF/Fund options
4. Calculate rebalancing trades
5. Assess risks
6. Output research brief (markdown)

**Output**: Structured research brief (what you see in dashboard)

**Time to complete**: 45-60 minutes

**Bottom line**: Paste this prompt into Cowork when you're ready to research rebalancing options.

---

### 👨‍💼 Document 3: REBALANCING_ADVISOR_AGENT_PROMPT.md
**What**: Prompt for the Advisor Review Agent (Agent #2)
**Who uses**: You (Lenix) initially, later could be Claude or a real advisor
**Use when**: After Research Agent outputs brief; you want to review & recommend

**Key workflow**:
1. Validate research quality (spot-check math, data)
2. Align with financial plan (is this on-target allocation?)
3. Assess personal constraints (emergency fund, concentration, tax)
4. Optimize tax impact (loss harvesting opportunities)
5. Check execution practicality (can you actually execute these trades?)
6. Recommend: Approve / Approve with Conditions / Defer / Reject

**Output**: Advisor review (what you see in dashboard next)

**Time to complete**: 15-30 minutes

**Bottom line**: Paste this prompt into Cowork for formal review, or use it as a mental checklist for self-review.

---

## Workflow: From Dashboard Click to Decision

```
USER ACTION: Click "Analyze Portfolio" in dashboard

    ↓

STEP 1: RESEARCH (45-60 min)
  ┌─────────────────────────────────┐
  │ Claude Cowork (Research Agent)  │
  │ Prompt: REBALANCING_RESEARCH... │
  │                                 │
  │ Inputs:                         │
  │ • Current portfolio (JSON)      │
  │ • Target allocation (settings)  │
  │ • Market date                   │
  │                                 │
  │ Process:                        │
  │ 1. Portfolio snapshot           │
  │ 2. Market research (web search) │
  │ 3. Holdings assessment          │
  │ 4. Rebalancing targets          │
  │ 5. ETF research                 │
  │ 6. Trade plan                   │
  │ 7. Risk assessment              │
  │ 8. Output markdown brief        │
  │                                 │
  │ Output: Research Brief          │
  └─────────────────────────────────┘

    ↓

STEP 2: DASHBOARD DISPLAY
  ┌─────────────────────────────────┐
  │ Dashboard shows:                │
  │ • Research Brief (expandable)   │
  │ • Status: ⏳ Waiting for Advisor │
  │ • [View] [Download] buttons     │
  └─────────────────────────────────┘

    ↓

STEP 3: ADVISOR REVIEW (15-30 min)
  ┌─────────────────────────────────┐
  │ You (or Claude + Advisor Prompt)│
  │ Prompt: REBALANCING_ADVISOR...  │
  │                                 │
  │ Process:                        │
  │ 1. Validate research quality    │
  │ 2. Align with financial plan    │
  │ 3. Assess personal constraints  │
  │ 4. Tax optimization             │
  │ 5. Execution practicality       │
  │ 6. Recommend: Approve/Defer/... │
  │                                 │
  │ Output: Advisor Review          │
  └─────────────────────────────────┘

    ↓

STEP 4: DASHBOARD DISPLAY
  ┌─────────────────────────────────┐
  │ Dashboard shows:                │
  │ • Research Brief (expandable)   │
  │ • Advisor Review (expandable)   │
  │ • Status: Ready for Decision    │
  │ • [Approve] [Defer] buttons     │
  └─────────────────────────────────┘

    ↓

STEP 5: YOUR DECISION
  ┌─────────────────────────────────┐
  │ You:                            │
  │ • Read both briefs              │
  │ • Click [Approve] or [Defer]    │
  │ • Decision logged to audit      │
  └─────────────────────────────────┘

    ↓

STEP 6: EXECUTION (if approved)
  ┌─────────────────────────────────┐
  │ You (manual execution):         │
  │ • Place trades in IBKR          │
  │ • Use limit orders per plan     │
  │ • Log execution prices          │
  │ • Update dashboard              │
  └─────────────────────────────────┘

    ↓

STEP 7: AUDIT LOG
  ┌─────────────────────────────────┐
  │ Dashboard stores:               │
  │ • Research brief + date         │
  │ • Advisor review + date         │
  │ • Your decision + timestamp     │
  │ • Execution prices + dates      │
  │ • Results vs. plan              │
  │                                 │
  │ For future: Analyze patterns,   │
  │ track advisor accuracy, etc.    │
  └─────────────────────────────────┘
```

---

## When to Use Each Prompt

### Use Research Agent Prompt When:
✅ You want to analyze portfolio
✅ It's been 3+ months since last review (quarterly cadence)
✅ Portfolio has drifted >5% from target allocation
✅ Market conditions have changed significantly
✅ You want to research ETF/Fund alternatives

### Use Advisor Review Prompt When:
✅ Research Agent has completed analysis
✅ You want to formally review the recommendations
✅ You want an audit-ready decision document
✅ You're considering escalating to a real financial advisor

### Use Governance Document When:
✅ Setting up the system for the first time
✅ Onboarding a real advisor into your workflow
✅ Scaling to other clients/users (product phase)
✅ Documenting guardrails and constraints

---

## Integration With Dashboard (Tier 1.5 Feature)

### In Dashboard Settings:

```
┌─ Rebalancing Panel ─────────────────────┐
│                                         │
│ Target Allocation:                      │
│ • Equities: [60%] ◄──────► Adjust       │
│ • Fixed Income: [15%]                   │
│ • Cash: [15%]                           │
│ • CPF: [10%]                            │
│                                         │
│ Rebalancing History:                    │
│ • Last analysis: Jul 29, 2024           │
│ • Last rebalance: Jul 15, 2024          │
│ • Next review: Oct 29, 2024 (due)       │
│                                         │
│ ┌─ [Analyze Portfolio] ◄─ TRIGGER      │
│ │ Click to run Research Agent analysis  │
│ └──────────────────────────────────────┘
│                                         │
│ Governance Limits:                      │
│ • Max concentration per position: 10%   │
│ • Min emergency fund: SGD 50K           │
│ • Rebalancing frequency: Quarterly      │
│ • Analysis frequency: 2x/month max      │
│                                         │
│ [View Audit Trail] [Download History]  │
│                                         │
└─────────────────────────────────────────┘
```

### In Dashboard Home (After Analysis):

```
┌─ Rebalancing Status ────────────────────┐
│                                         │
│ 📊 Current Allocation vs. Target:       │
│                                         │
│ Equities     [████████░] 62% vs 60%     │
│ Fixed Income [███░░░░░░] 15% vs 15%    │
│ Cash         [███░░░░░░] 13% vs 15%    │
│ CPF          [███░░░░░░] 10% vs 10%    │
│                                         │
│ ⚠️ ALERT: Equities overweight by 2%    │
│                                         │
│ Latest Analysis: Jul 29, 2024           │
│ Status: ✅ Advisor approved             │
│ Recommendation: Trim equities by $25K   │
│                                         │
│ [View Research Brief]                   │
│ [View Advisor Review]                   │
│ [Execute Trades] [Defer]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step-by-Step: Your First Rebalancing Analysis

### Session 1: Setup (30 min)
1. ✅ Read REBALANCING_GOVERNANCE.md (understand the system)
2. ✅ Save REBALANCING_RESEARCH_AGENT_PROMPT.md to a file you can copy from
3. ✅ Save REBALANCING_ADVISOR_AGENT_PROMPT.md to a file you can copy from
4. ✅ Update dashboard settings with target allocation + guardrails

### Session 2: First Research Analysis (60 min)
1. ✅ Click "Analyze Portfolio" in dashboard
2. ✅ Copy REBALANCING_RESEARCH_AGENT_PROMPT.md into Claude Cowork
3. ✅ Claude generates research brief
4. ✅ Dashboard displays brief in "Rebalancing Status" section
5. ✅ Download/save research brief to your files

### Session 3: Advisor Review (30 min)
1. ✅ Read the research brief (take notes on any concerns)
2. ✅ Copy REBALANCING_ADVISOR_AGENT_PROMPT.md into Claude Cowork (or self-review using the checklist)
3. ✅ Claude generates advisor review (or you self-review)
4. ✅ Dashboard displays review
5. ✅ Download/save advisor review

### Session 4: Decision & Execution (30-60 min)
1. ✅ Read both research brief + advisor review
2. ✅ Click [Approve] or [Defer]
3. ✅ If approved: Open IBKR, place trades using limit orders from brief
4. ✅ Log execution prices in dashboard
5. ✅ Wait for fills; monitor for 1-3 days

### Session 5: Post-Execution (15 min)
1. ✅ Log all filled trades in dashboard
2. ✅ Update portfolio snapshot (prices change post-execution)
3. ✅ Calculate actual results vs. plan
4. ✅ Schedule next review (quarterly)

**Total time: 3-4 hours over 5 sessions** ← This is your quarterly rebalancing rhythm.

---

## Example Scenario: You Run First Analysis

**Date**: July 29, 2024
**Your Action**: Click "Analyze Portfolio" in dashboard

**Claude Cowork (Research Agent)**:
- Fetches portfolio: AAPL, GOOGL, CPF, DBS cash
- Searches: S&P 500 performance, tech valuations, Singapore interest rates
- Finds: Equities at 62% vs. target 60% (2% overweight)
- Researches: VTI (broad US), VXUS (international), VGIT (bond fund)
- Recommends: Sell $25K AAPL/GOOGL, buy VTI + VXUS to rebalance
- Output: 8-page research brief with confidence scores & risks
- Time: 55 minutes

**Dashboard**: Displays research brief, status: "Waiting for Advisor Review"

**You (Advisor Review)**:
- Read research brief (15 min)
- Check: Emergency fund OK? ✅ Constraints satisfied? ✅ Tax impact? ~$1,100 (acceptable)
- Recommendation: Approve, but suggest tax-loss harvesting first (save $300 in taxes)
- Output: Advisor review with 1 modification
- Time: 25 minutes

**Dashboard**: Displays advisor review, status: "Ready for Your Decision"

**You (Final Decision)**:
- Read both briefs (10 min)
- Click [Approve]
- Decision logged: "Approved with tax-loss harvest modification. Execute Jul 30-Aug 1."

**You (Execution)**:
- Monday: Sell 50 AAPL @ $226 limit order → fills at $226.20
- Tuesday: Sell 25 GOOGL @ $179 → fills at $178.80
- Wednesday: Buy 70 VTI @ $227 → fills at $227.50; Buy 22 VXUS @ $227 → fills at $227.10
- Log prices in dashboard

**Dashboard Audit Trail**:
- Analysis Date: Jul 29, 2024
- Advisor Approval: Jul 29, 2024 (with modification)
- Your Decision: Jul 29, 2024
- Execution Dates: Jul 30-Aug 1, 2024
- Results: Planned $25K trimmed, executed $25.5K (slight slippage). Portfolio rebalanced to 60.1% equities (target). Tax cost: $800 (beat plan by $300).
- Next Review: Oct 29, 2024

**Lessons Learned**:
- Tax-loss harvesting was worth it ($300 savings)
- 3-day execution worked well (no major price movement)
- Recommendation accuracy: High (confidence scores matched outcomes)

---

## Key Principles

### 1. **Separate Research from Judgment**
- Agent #1 (Research): "Here's what the data says"
- Agent #2 (Advisor): "Here's what makes sense for you"
- You: "I approve or defer"

### 2. **Confidence ≠ Certainty**
- HIGH confidence recommendation can still lose money (market risk)
- Acknowledge this in every brief
- Use it to set expectations

### 3. **Audit Trail is Everything**
- Every analysis, decision, execution is logged
- Future you can learn why past-you made certain choices
- If/when you scale, clients can see transparency

### 4. **Governance Rules Protect You**
- Max 10% per position: prevents over-concentration
- Min SGD 50K emergency fund: preserves safety
- Quarterly cadence: prevents over-trading
- These aren't suggestions; they're guardrails

### 5. **This Scales**
- MVP: You do everything (research yourself or use Cowork agent)
- Phase 2: Integrate a real financial advisor into "Agent #2" step
- Phase 3+: Offer this system to 2-3 beta clients
- Phase 4+: Productize as a wealth management SaaS tool

---

## Troubleshooting

### "Research Agent takes too long (>90 min)"
- Reduce scope: "Focus on rebalancing drift >5% only; skip micro-cap funds"
- Simplify market research: Use fewer search queries
- Reuse previous analysis: "Key markets haven't changed; iterate off last brief"

### "Advisor Review feels like rubber-stamping"
- You're not validating enough. Go deeper:
  - Spot-check 3-4 calculations manually
  - Research 1-2 ETF picks yourself
  - Ask clarifying questions if anything feels off
- If research is solid, approval is appropriate; don't overthink it

### "Can't decide between Approve/Defer"
- Defer if unsure. Better to wait for clarity than execute under doubt.
- Document reason: "Deferring due to Fed rate decision next week"
- Set specific trigger: "Revisit when Fed decision is clear"

### "Actual results differ from plan"
- Normal. Markets move.
- Log it in dashboard: "Planned $25K trim, executed $25.5K (slight slippage). Acceptable."
- Learn: Adjust limit orders in future (e.g., tighter spreads if slippage is consistent)

### "Rebalancing made things worse"
- Possible, but rare. Markets are random.
- Audit trail will show: Was the analysis flawed? Or just unlucky timing?
- If flawed: Improve research process. If unlucky: Accept volatility and hold.

---

## Next: Integrating Into Dashboard

Once you've done one full cycle (Research → Review → Decision → Execution), update the dashboard to:

1. **Store rebalancing history** (localStorage or database)
2. **Display rebalancing panel** (status, audit trail)
3. **Add "Analyze Portfolio" button** (triggers research agent)
4. **Add approval workflow** (shows research brief + advisor review in UI)
5. **Add execution tracking** (log trades, monitor fills)

---

## Final Thought

This is your **systematic, auditable, scalable rebalancing system**. Start simple (you do research + advisor review). Iterate. Improve. Eventually, it becomes a product.

The key: **Separate concerns, document everything, learn from results.**

🚀 Let's build this.
