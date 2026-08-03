import { ASSET_CLASSES } from './constants';

// Real data as of 2026-07-29, transcribed from screenshots/statements the
// user dropped in Welldee/statements/ (Standard Chartered app, CPF
// dashboard, Endowus app, DBS unit trust screen, iFAST DPMS PDF statement).
// Replaces the earlier IBKR/AAPL/GOOGL mock demo data — that was never real
// (the connected IBKR account is unfunded), and mixing fake positions into a
// "real" dashboard would be misleading.
//
// Known gaps, deliberately left blank rather than guessed:
// - IBKR: no real data yet. Add a `type: 'Brokerage', broker: 'IBKR'`
//   account (same shape as the Standard Chartered one below) once you have
//   one, or connect a real API key in Settings and hit Sync Now.
// - startOfYearValueSGD: no Jan-1 baseline given, so YTD Return is
//   intentionally left unset rather than computed against a guess.
// - CLR.SG (a REIT ETF) and GLD.US (a gold ETF) are classified as Equities
//   below for lack of a dedicated REIT/Commodities bucket in this Tier 1
//   model — flagged so you can request a proper bucket if it matters to you.
// - Endowus equities/fixed-income splits for "Core - Flagship (Measured)"
//   and "My goal (Aggressive)" are estimates (the app screen doesn't expose
//   the underlying mix) — adjust in Settings if you know the real split.
// - The iFAST DPMS account is funded via SRS, which (like CPF) has
//   withdrawal restrictions before statutory retirement age — but unlike
//   CPF it isn't its own asset-class bucket here, since the underlying money
//   is genuinely invested in equities/fixed income, not sitting in a
//   separate locked cash-like account the way CPF is.
// - `geography`/`industry` on each holding and ManagedPortfolio account
//   drive the Geography & Industry breakdown (GeographyIndustryBreakdown.jsx).
//   For individual stocks/ETFs these are straightforward. For ManagedPortfolio
//   accounts they're a single label for the whole portfolio, not a real
//   look-through into the dozens of underlying funds each one holds (iFAST's
//   own statement alone lists 9+ underlying funds inside one DPMS account) —
//   treat these as broad, not precise.
export const defaultPortfolio = {
  metadata: {
    userId: 'admin',
    lastUpdated: new Date().toISOString(),
    baseCurrency: 'SGD',
    startOfYearValueSGD: null,
  },
  // Any number of `type: 'Brokerage'` accounts can coexist — add one per
  // broker (IBKR, Standard Chartered, ...) with its own `broker` label,
  // holdings (any currency — see FX_RATES in constants.js), and cash.
  // `dividendYieldPct` is optional per holding; see computeEstimatedYTDDividends
  // in calculations.js — no manual dividend $ entry required.
  accounts: [
    {
      id: 'stanchart-001',
      type: 'Brokerage',
      broker: 'Standard Chartered',
      holdings: [
        {
          ticker: 'A35.SG',
          shares: 22647, // 6,100 original + 16,547 topped up 2026-07-31 (rebalancing brief RRB-2026-0731-01, Action 1)
          costBasis: 1.096191, // weighted avg: (6100*1.075 + 16547*1.104) / 22647
          currentPrice: 1.107,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.FIXED_INCOME, // ABF Singapore Bond Index ETF
          geography: 'Singapore',
          industry: 'Fixed Income (Bonds)',
          lastUpdated: '2026-07-31',
        },
        {
          ticker: 'AWG.SG',
          shares: 4000,
          costBasis: 1.2709,
          currentPrice: 0.22,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.EQUITIES, // Ascent Bridge Ord
          geography: 'Singapore',
          industry: 'Unclassified', // small-cap — not confident enough in a sector guess to state one
          lastUpdated: '2026-07-29T17:06:00+08:00',
        },
        {
          ticker: 'C6L.SG',
          shares: 6100,
          costBasis: 6.1758,
          currentPrice: 7.53,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.EQUITIES, // Singapore Airlines Ord
          geography: 'Singapore',
          industry: 'Airlines & Transportation',
          lastUpdated: '2026-07-29T17:06:00+08:00',
        },
        {
          ticker: 'CLR.SG',
          shares: 11400,
          costBasis: 0.9956,
          currentPrice: 0.854,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.EQUITIES, // Lion-Phillip S-REIT ETF — see note above
          geography: 'Singapore',
          industry: 'Real Estate (REITs)',
          lastUpdated: '2026-07-29T17:06:00+08:00',
        },
        {
          ticker: 'D05.SG',
          shares: 400,
          costBasis: 51.0915,
          currentPrice: 75.0,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.EQUITIES, // DBS Group Holdings Ord
          geography: 'Singapore',
          industry: 'Financials (Banking)',
          lastUpdated: '2026-07-29T17:06:00+08:00',
        },
        {
          ticker: 'ES3.SG',
          shares: 19340,
          costBasis: 3.2383,
          currentPrice: 5.8,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.EQUITIES, // State Street SPDR STI ETF
          geography: 'Singapore',
          industry: 'Diversified (Index)',
          lastUpdated: '2026-07-29T17:06:00+08:00',
        },
        {
          ticker: 'GLD.US',
          shares: 34,
          costBasis: 438.7318,
          currentPrice: 369.36,
          currency: 'USD',
          assetClass: ASSET_CLASSES.EQUITIES, // SPDR Gold Shares ETF — see note above
          geography: 'Global',
          industry: 'Commodities (Gold)',
          lastUpdated: '2026-07-29T18:21:00+08:00',
        },
      ],
      // Uninvested cash, after RRB-2026-0731-01 Action 1. Only the A35.SG
      // top-up filled (~SGD 18,267.89) — the MBH.SG leg (~SGD 27,474) did
      // NOT execute and was released back as purchasing power. Figures below
      // are the broker-reported purchasing power as of 2026-08-01, which
      // already reflects that release: SGD 27,974 + USD 21,299 (~SGD 55,496
      // total liquid) — back above the SGD 50,000 emergency-fund floor.
      // See rebalancingHistory (rebal-2026-07-31-001) for the full record;
      // retry the MBH.SG leg once it fills (expected Monday).
      cash: { SGD: 27974, USD: 21299 },
    },
    {
      id: 'dbs-ut-001',
      type: 'Brokerage',
      broker: 'DBS (Unit Trust)',
      holdings: [
        {
          ticker: "Amova S'pore STI ETF (SAdis)",
          shares: 3174,
          costBasis: 3.872347, // WAC = investment amount / quantity, per the fund platform's own methodology
          currentPrice: 5.72,
          currency: 'SGD',
          assetClass: ASSET_CLASSES.EQUITIES, // tracks the Straits Times Index
          geography: 'Singapore',
          industry: 'Diversified (Index)',
          lastUpdated: '2026-07-28',
        },
      ],
      cash: {},
    },
    {
      id: 'cpf-001',
      type: 'CPF',
      balances: {
        ordinary: 25204.19,
        special: 142734.69,
        medisave: 79000.0,
      },
      lastUpdated: '2026-07-29',
    },
    {
      id: 'dbs-001',
      type: 'Bank',
      cash: { SGD: 0 }, // not in the screenshots provided — fill in via Settings
      lastUpdated: null,
    },
    // "ManagedPortfolio" covers any lump-sum robo/DPMS account — Endowus,
    // iFAST, or any other provider — one account per underlying portfolio so
    // allocation math treats them individually. `costBasis` is the total
    // amount originally invested (in `currency`), used to derive the P&L
    // shown in the Holdings table — see managedPortfolioUnrealizedPnL in
    // calculations.js.
    {
      id: 'endowus-core-flagship',
      type: 'ManagedPortfolio',
      provider: 'Endowus',
      portfolioName: 'Core - Flagship (Measured)',
      currentValue: 38627.14,
      costBasis: 31477.35, // currentValue - reported gain of +7,149.79
      currency: 'SGD',
      allocation: { equities: 0.5, fixedIncome: 0.5 }, // estimate — "Measured" risk tier
      geography: 'Global (Diversified)',
      industry: 'Diversified (Multi-Asset)',
      lastUpdated: '2026-07-29',
    },
    {
      id: 'endowus-my-goal',
      type: 'ManagedPortfolio',
      provider: 'Endowus',
      portfolioName: 'My Goal (Flagship, Aggressive)',
      currentValue: 83174.86,
      costBasis: 71410.87, // currentValue - reported gain of +11,763.99
      currency: 'SGD',
      allocation: { equities: 0.9, fixedIncome: 0.1 }, // estimate — "Aggressive" risk tier
      geography: 'Global (Diversified)',
      industry: 'Diversified (Multi-Asset)',
      lastUpdated: '2026-07-29',
    },
    {
      id: 'endowus-my-goal-2',
      type: 'ManagedPortfolio',
      provider: 'Endowus',
      portfolioName: 'My Goal 2 (Satellite, China Equities)',
      currentValue: 9022.58,
      costBasis: 7762.35, // currentValue - reported gain of +1,260.23
      currency: 'SGD',
      allocation: { equities: 1, fixedIncome: 0 },
      geography: 'China',
      industry: 'Diversified (Equities)',
      lastUpdated: '2026-07-29',
    },
    {
      id: 'endowus-energy',
      type: 'ManagedPortfolio',
      provider: 'Endowus',
      portfolioName: 'Energy and Raw Material (Fund Smart)',
      currentValue: 15010.05,
      costBasis: 16031.35, // currentValue - reported loss of -1,021.30
      currency: 'SGD',
      allocation: { equities: 1, fixedIncome: 0 },
      geography: 'Global (Diversified)',
      industry: 'Energy & Materials',
      lastUpdated: '2026-07-29',
    },
    {
      id: 'ifast-dpms-001',
      type: 'ManagedPortfolio',
      provider: 'iFAST',
      portfolioName: 'My Investment (DPMS, via SRS)',
      currentValue: 29346.91, // Total Assets: DPMS market value + Cash Solutions
      costBasis: 25002.48, // DPMS investment amount + Cash Solutions investment amount
      currency: 'SGD',
      allocation: { equities: 0.6702, fixedIncome: 0.3298 }, // given directly on the statement
      geography: 'Global (Diversified)', // mix of World/Europe/Asia-Pac/EM funds — see the statement PDF for the full look-through
      industry: 'Diversified (Multi-Asset)',
      lastUpdated: '2026-06-30',
    },
  ],
  // Rebalancing only ever compares Equities vs Fixed Income (Cash and CPF
  // aren't "invested" in that sense — see computeInvestedAllocationBreakdown
  // in calculations.js), so this is just the two of them, summing to 100%.
  // 80/20 here is the old 60/15/15/10 split's equities:fixed-income ratio
  // (60:15 = 4:1) carried over — adjust freely in Settings.
  targetAllocation: {
    [ASSET_CLASSES.EQUITIES]: 0.8,
    [ASSET_CLASSES.FIXED_INCOME]: 0.2,
  },
  // Actual logged dividend payments — see DividendLog.jsx to add entries and
  // computeDividendPayments() in calculations.js for how these roll up.
  // `ticker` is null for lump-sum accounts (ManagedPortfolio) where `label`
  // alone identifies the source.
  dividendPayments: [],
  // Audit trail for the Tier 2 rebalancing governance flow (Research Agent →
  // Advisor Review → user decision → executed trades). See RebalancingHistory.jsx
  // to add entries and getLastRebalanceDate() in calculations.js for how the
  // 90-day minimum-interval rule reads this. `trades[].status` tracks fills
  // separately from the decision, since an approved trade can still fail to
  // execute (see MBH.SG below).
  rebalancingHistory: [
    {
      id: 'rebal-2026-07-31-001',
      date: '2026-07-31',
      triggeredBy: 'Manual request',
      researchSource: 'rebalancing-research-agent (RRB-2026-0731-01)',
      advisorSource: 'AdvisorKim',
      advisorDecision: 'APPROVE_WITH_CONDITIONS',
      userDecision: 'APPROVED',
      trades: [
        { ticker: 'A35.SG', action: 'BUY', shares: 16547, price: 1.104, status: 'FILLED' },
        { ticker: 'MBH.SG', action: 'BUY', shares: 27474, price: 1.0, status: 'UNFILLED' },
      ],
      notes:
        'Deploy idle SC cash into SGD Fixed Income to close the Equities/FI drift (89.4/10.6 → target 80/20) without touching existing equity positions. A35.SG leg filled and topped up the existing position. MBH.SG leg did not fill — retrying when a buying position opens (expected Mon 2026-08-03).',
      nextReviewDate: '2026-10-29',
    },
  ],
  // Daily net worth snapshots, auto-captured by PortfolioContext (today's
  // entry is overwritten live as the portfolio changes; past entries are
  // frozen). Starts empty — deliberately NOT backfilled with a fabricated
  // trend, since there's no real historical data to backfill from. Powers
  // the Portfolio Growth chart in PortfolioGrowthHero.jsx; see
  // computeNetWorthHistory in calculations.js.
  netWorthHistory: [],
};
