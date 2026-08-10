import { ASSET_CLASSES, FX_RATES, REBALANCE_THRESHOLD } from './constants';

// --- Currency -----------------------------------------------------------

// MVP: hardcoded rates from FX_RATES. Tier 2: fetch live rates and store
// them on portfolio.metadata so this function can read instead of hardcode.
export function toSGD(amount, currency) {
  const rate = FX_RATES[currency];
  if (rate == null) {
    console.error(`No FX rate configured for currency "${currency}" — add it to FX_RATES in constants.js`);
    return amount;
  }
  return amount * rate;
}

// --- Holdings -------------------------------------------------------------

export function holdingCurrentValue(holding) {
  return holding.shares * holding.currentPrice;
}

export function holdingUnrealizedPnL(holding) {
  if (holding.costBasis == null) return null;
  return holding.shares * (holding.currentPrice - holding.costBasis);
}

export function holdingUnrealizedPnLPct(holding) {
  const pnl = holdingUnrealizedPnL(holding);
  const costTotal = holding.costBasis * holding.shares;
  if (pnl == null || !costTotal) return null;
  return pnl / costTotal;
}

// --- Account-level SGD value, split by asset class -------------------------

// Returns { equities, fixedIncome, cash, cpf } in SGD for a single account.
function accountValueByAssetClass(account) {
  const byClass = { equities: 0, fixedIncome: 0, cash: 0, cpf: 0 };

  // "Brokerage" covers any account with individual ticker positions — IBKR,
  // Standard Chartered, or any other broker. Add a new account with this
  // type (and a `broker` label) rather than special-casing a broker name.
  if (account.type === 'Brokerage') {
    for (const holding of account.holdings ?? []) {
      const valueSGD = toSGD(holdingCurrentValue(holding), holding.currency);
      const assetClass = holding.assetClass ?? ASSET_CLASSES.EQUITIES;
      byClass[assetClass] += valueSGD;
    }
    for (const [currency, amount] of Object.entries(account.cash ?? {})) {
      byClass.cash += toSGD(amount, currency);
    }
  }

  if (account.type === 'CPF') {
    const { ordinary = 0, special = 0, medisave = 0 } = account.balances ?? {};
    byClass.cpf += ordinary + special + medisave;
  }

  if (account.type === 'Bank') {
    for (const [currency, amount] of Object.entries(account.cash ?? {})) {
      byClass.cash += toSGD(amount, currency);
    }
  }

  // "ManagedPortfolio" covers any lump-sum robo/DPMS account — Endowus,
  // iFAST, or any other provider — where you get a total value and an
  // equities/fixed-income split rather than individual tickers. Add a new
  // account with this type (and a `provider` label) rather than
  // special-casing a provider name.
  if (account.type === 'ManagedPortfolio') {
    const valueSGD = toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
    const split = account.allocation ?? { equities: 1, fixedIncome: 0 };
    byClass.equities += valueSGD * (split.equities ?? 0);
    byClass.fixedIncome += valueSGD * (split.fixedIncome ?? 0);
  }

  return byClass;
}

// --- Portfolio-level aggregates --------------------------------------------

// `excludeCPF: true` drops CPF accounts from every total below — this is
// what backs the dashboard-wide "exclude CPF" toggle (see PortfolioContext).
// It's a full exclusion, not just a display mask: Net Worth, the allocation
// chart, and rebalancing all recompute as if the CPF accounts didn't exist.
export function computeAllocationByClass(portfolio, { excludeCPF = false } = {}) {
  const totals = { equities: 0, fixedIncome: 0, cash: 0, cpf: 0 };
  for (const account of portfolio.accounts) {
    if (excludeCPF && account.type === 'CPF') continue;
    const byClass = accountValueByAssetClass(account);
    for (const key of Object.keys(totals)) totals[key] += byClass[key];
  }
  return totals;
}

export function computeNetWorth(portfolio, opts) {
  const totals = computeAllocationByClass(portfolio, opts);
  return totals.equities + totals.fixedIncome + totals.cash + totals.cpf;
}

export function computeYTDReturn(portfolio, opts) {
  const startValue = portfolio.metadata?.startOfYearValueSGD;
  const currentValue = computeNetWorth(portfolio, opts);
  if (!startValue) return { pct: null, amountSGD: null };
  const amountSGD = currentValue - startValue;
  return { pct: amountSGD / startValue, amountSGD };
}

// Returns [{ assetClass, valueSGD, currentPct, targetPct, deltaPct }].
// When excludeCPF is true, the CPF row is dropped entirely (not shown at
// 0%) and the remaining targets are renormalized to sum to 100% — e.g. a
// 60/15/15/10 target becomes 66.7/16.7/16.7 of the CPF-excluded net worth,
// so "on target" still means on target rather than every class reading as
// permanently ~11% overweight against a set of targets that used to sum to
// only 90%.
export function computeAllocationBreakdown(portfolio, { excludeCPF = false } = {}) {
  const totals = computeAllocationByClass(portfolio, { excludeCPF });
  const netWorth = totals.equities + totals.fixedIncome + totals.cash + totals.cpf;
  const target = portfolio.targetAllocation;
  const cpfTarget = target[ASSET_CLASSES.CPF] ?? 0;
  const renormalize = excludeCPF && cpfTarget < 1 ? 1 / (1 - cpfTarget) : 1;

  const classes = excludeCPF
    ? Object.values(ASSET_CLASSES).filter((c) => c !== ASSET_CLASSES.CPF)
    : Object.values(ASSET_CLASSES);

  return classes.map((assetClass) => {
    const valueSGD = totals[assetClass];
    const currentPct = netWorth > 0 ? valueSGD / netWorth : 0;
    const targetPct = (target[assetClass] ?? 0) * renormalize;
    return {
      assetClass,
      valueSGD,
      currentPct,
      targetPct,
      deltaPct: currentPct - targetPct,
    };
  });
}

// Rebalancing only considers the Equities/Fixed Income split — Cash and CPF
// aren't "invested" in the stock/bond sense (Cash is dry powder, CPF is a
// locked retirement account you can't rebalance out of), so both are
// excluded here rather than compared against a target they were never
// meant to hold to. `currentPct`/`targetPct` are relative to the combined
// Equities+Fixed Income total, not the whole net worth — portfolio.
// targetAllocation's equities/fixedIncome values are renormalized to sum to
// 100% between just the two of them.
export function computeInvestedAllocationBreakdown(portfolio) {
  const totals = computeAllocationByClass(portfolio);
  const investedTotal = totals.equities + totals.fixedIncome;
  const target = portfolio.targetAllocation;
  const targetEquities = target[ASSET_CLASSES.EQUITIES] ?? 0;
  const targetFixedIncome = target[ASSET_CLASSES.FIXED_INCOME] ?? 0;
  const targetTotal = targetEquities + targetFixedIncome;

  return [ASSET_CLASSES.EQUITIES, ASSET_CLASSES.FIXED_INCOME].map((assetClass) => {
    const valueSGD = totals[assetClass];
    const currentPct = investedTotal > 0 ? valueSGD / investedTotal : 0;
    const targetPct = targetTotal > 0 ? (target[assetClass] ?? 0) / targetTotal : 0;
    return {
      assetClass,
      valueSGD,
      currentPct,
      targetPct,
      deltaPct: currentPct - targetPct,
    };
  });
}

// Returns breakdown rows where |delta| exceeds REBALANCE_THRESHOLD, each with
// a human-readable suggested action.
export function computeRebalanceAlerts(portfolio) {
  const breakdown = computeInvestedAllocationBreakdown(portfolio);
  const investedTotal = breakdown.reduce((sum, row) => sum + row.valueSGD, 0);

  return breakdown
    .filter((row) => Math.abs(row.deltaPct) > REBALANCE_THRESHOLD)
    .map((row) => {
      const overweight = row.deltaPct > 0;
      const driftSGD = Math.abs(row.deltaPct) * investedTotal;
      return {
        ...row,
        overweight,
        driftSGD,
      };
    });
}

// --- Managed portfolios (Endowus, iFAST, ...) ------------------------------

// costBasis is the total amount originally invested, in the account's own
// currency — mirrors holdingCostBasis's role for individual holdings, just
// at the whole-account level since these don't expose per-unit prices.
export function managedPortfolioUnrealizedPnL(account) {
  if (account.costBasis == null) return null;
  return toSGD(account.currentValue - account.costBasis, account.currency ?? 'SGD');
}

export function managedPortfolioUnrealizedPnLPct(account) {
  if (account.costBasis == null || !account.costBasis) return null;
  return (account.currentValue - account.costBasis) / account.costBasis;
}

// Flat list of holdings across all brokerage accounts, for the holdings table.
export function collectHoldings(portfolio) {
  const rows = [];
  for (const account of portfolio.accounts) {
    if (account.type !== 'Brokerage') continue;
    for (const holding of account.holdings ?? []) {
      rows.push({
        ...holding,
        accountId: account.id,
        broker: account.broker ?? account.id,
        currentValue: holdingCurrentValue(holding),
        currentValueSGD: toSGD(holdingCurrentValue(holding), holding.currency),
        unrealizedPnL: holdingUnrealizedPnL(holding),
        unrealizedPnLPct: holdingUnrealizedPnLPct(holding),
      });
    }
  }
  return rows;
}

// Current SGD value of any non-Brokerage account (Brokerage accounts are
// covered holding-by-holding via collectHoldings instead, since they need
// per-ticker prices, not one lump value). Used by the Jan-1 backcalculation
// tool to pre-fill a starting value for accounts with no ticker/share
// model at all — CPF, bank cash, and managed portfolios.
export function accountCurrentValueSGD(account) {
  if (account.type === 'CPF') {
    const { ordinary = 0, special = 0, medisave = 0 } = account.balances ?? {};
    return ordinary + special + medisave;
  }
  if (account.type === 'Bank') {
    return Object.entries(account.cash ?? {}).reduce((sum, [ccy, amt]) => sum + toSGD(amt, ccy), 0);
  }
  if (account.type === 'ManagedPortfolio') {
    return toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
  }
  return 0;
}

// Backcalculates what net worth would have been on a given date, holding
// today's exact shares/balances but at that date's per-holding price —
// "same shares, back-dated price," not a reconstruction of actual trades.
// `holdingPrices` is { [accountId::ticker]: price in the holding's own
// currency }; `accountValues` is { [accountId]: valueSGD } for the
// non-ticker accounts collected via accountCurrentValueSGD. Missing entries
// in either map are simply skipped (0 contribution) — the caller decides
// what "missing" means in the UI (e.g. block the total until filled in).
export function computeBacktestedNetWorthSGD(portfolio, { holdingPrices = {}, accountValues = {} } = {}) {
  let totalSGD = 0;

  for (const holding of collectHoldings(portfolio)) {
    const key = `${holding.accountId}::${holding.ticker}`;
    const price = holdingPrices[key];
    if (price == null) continue;
    totalSGD += toSGD(holding.shares * price, holding.currency);
  }

  for (const account of portfolio.accounts) {
    if (account.type === 'Brokerage') {
      // Cash has no "price" to back-date — its current SGD amount is the
      // Jan-1 contribution too, same principle as the non-ticker accounts.
      for (const [ccy, amt] of Object.entries(account.cash ?? {})) {
        totalSGD += toSGD(amt, ccy);
      }
      continue;
    }
    const value = accountValues[account.id];
    totalSGD += value ?? 0;
  }

  return totalSGD;
}

// --- Overall P&L -------------------------------------------------------

// Unrealized P&L across every priced position — brokerage holdings and
// managed portfolios (CPF/cash have no P&L concept, so they're never part
// of this). pnlPct is weighted by cost basis, not averaged per-position, so
// a large position's % swing counts for more than a small one's — same
// principle as the per-account subtotals in HoldingsTable.jsx.
export function computeOverallUnrealizedPnL(portfolio) {
  let pnlSGD = 0;
  let costBasisSGD = 0;
  let hasAny = false;

  for (const holding of collectHoldings(portfolio)) {
    if (holding.unrealizedPnL == null) continue;
    hasAny = true;
    pnlSGD += toSGD(holding.unrealizedPnL, holding.currency);
    if (holding.costBasis != null) costBasisSGD += toSGD(holding.costBasis * holding.shares, holding.currency);
  }

  for (const account of portfolio.accounts) {
    if (account.type !== 'ManagedPortfolio') continue;
    const pnl = managedPortfolioUnrealizedPnL(account);
    if (pnl == null) continue;
    hasAny = true;
    pnlSGD += pnl;
    if (account.costBasis != null) costBasisSGD += toSGD(account.costBasis, account.currency ?? 'SGD');
  }

  return {
    pnlSGD: hasAny ? pnlSGD : null,
    pnlPct: costBasisSGD > 0 ? pnlSGD / costBasisSGD : null,
  };
}

// --- Cross-filtering -----------------------------------------------------

// Restricts a portfolio to just the accounts/holdings tagged with a given
// industry — backs the industry-treemap click filter (Dashboard.jsx),
// shared so Holdings, Asset Allocation, and Geography all narrow together.
// CPF and idle cash have no industry, so they always drop out of a
// filtered view (same reasoning as computeBreakdownByDimension excluding
// them outright).
export function filterPortfolioByIndustry(portfolio, industry) {
  if (!industry) return portfolio;
  return {
    ...portfolio,
    accounts: portfolio.accounts
      .map((account) => {
        if (account.type === 'Brokerage') {
          const holdings = (account.holdings ?? []).filter((h) => h.industry === industry);
          return holdings.length > 0 ? { ...account, holdings, cash: {} } : null;
        }
        if (account.type === 'ManagedPortfolio') {
          return account.industry === industry ? account : null;
        }
        return null;
      })
      .filter(Boolean),
  };
}

// --- Geography / industry breakdown -----------------------------------

// Groups invested assets (brokerage holdings + managed portfolios) by
// `dimension` ('geography' or 'industry'), converted to SGD. CPF and idle
// cash are excluded — neither has a meaningful sector/region. Managed
// portfolios (Endowus, iFAST) are tagged at the whole-portfolio level (see
// defaultPortfolio.js) rather than looked through to their dozens of
// underlying funds, so those figures are broad, not precise look-through
// exposure. Returns rows sorted largest first.
export function computeBreakdownByDimension(portfolio, dimension) {
  const totals = new Map();

  for (const holding of collectHoldings(portfolio)) {
    const key = holding[dimension] ?? 'Unclassified';
    totals.set(key, (totals.get(key) ?? 0) + holding.currentValueSGD);
  }

  for (const account of portfolio.accounts) {
    if (account.type !== 'ManagedPortfolio') continue;
    const key = account[dimension] ?? 'Unclassified';
    const valueSGD = toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
    totals.set(key, (totals.get(key) ?? 0) + valueSGD);
  }

  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([label, valueSGD]) => ({ label, valueSGD, pct: grandTotal > 0 ? valueSGD / grandTotal : 0 }))
    .sort((a, b) => b.valueSGD - a.valueSGD);
}

// --- Dividends ---------------------------------------------------------

// Real dividend history, logged via DividendLog.jsx — this is the actual
// "so far this year" number, not an estimate.
// Returns { totalSGD, entries } with entries sorted newest first.
export function computeDividendPayments(portfolio, { year } = {}) {
  const targetYear = year ?? new Date().getFullYear();
  const entries = (portfolio.dividendPayments ?? [])
    .filter((p) => new Date(p.date).getFullYear() === targetYear)
    .map((p) => ({ ...p, amountSGD: toSGD(p.amount, p.currency) }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalSGD = entries.reduce((sum, e) => sum + e.amountSGD, 0);
  return { totalSGD, entries };
}

// Forward-looking projection from each position's trailing yield: annual
// dividend = value * yield%. Positions/accounts without a dividendYieldPct
// are skipped (not treated as zero-yield), so this only reflects what's
// known. This is a projection, not a "so far" figure — see
// computeDividendPayments() for actual payments received.
export function computeProjectedAnnualDividends(portfolio) {
  let annualSGD = 0;

  for (const holding of collectHoldings(portfolio)) {
    if (holding.dividendYieldPct == null) continue;
    annualSGD += holding.currentValueSGD * (holding.dividendYieldPct / 100);
  }

  for (const account of portfolio.accounts) {
    if (account.type !== 'ManagedPortfolio' || account.dividendYieldPct == null) continue;
    const valueSGD = toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
    annualSGD += valueSGD * (account.dividendYieldPct / 100);
  }

  return annualSGD;
}

// Upcoming ex-dividend/payment dates, sorted soonest-first. `fetchedCalendarData`
// is `{ [ticker]: { exDividendDate, paymentDate, trailingDividendRate,
// trailingDividendYieldPct } }` assembled by the caller from live
// /api/dividendCalendar lookups (real market tickers only — see
// DividendCalendar.jsx). Each row is tagged `source: 'yahoo'` when backed by
// that real data, or `'cadence'` when projected purely from the gap between
// the two most recent logged `dividendPayments` for a ManagedPortfolio
// account (Endowus/iFAST etc — these never have a resolvable ticker).
// Accounts with fewer than 2 logged payments are omitted rather than given a
// fabricated date. CPF/Bank accounts never appear (no dividend concept).
export function computeDividendCalendar(portfolio, { fetchedCalendarData = {} } = {}) {
  const rows = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const holding of collectHoldings(portfolio)) {
    const data = fetchedCalendarData[holding.ticker];
    if (!data) continue;
    // Yahoo returns the *last known* ex-div date even for stocks that
    // haven't paid one in years (verified live: a thin small-cap returned a
    // 2021 date) — only a today-or-later date is actually "upcoming".
    const hasFutureDate = (data.exDividendDate && data.exDividendDate >= today) || (data.paymentDate && data.paymentDate >= today);
    if (!hasFutureDate) continue;
    rows.push({
      accountId: holding.accountId,
      ticker: holding.ticker,
      label: `${holding.broker} — ${holding.ticker}`,
      exDividendDate: data.exDividendDate,
      paymentDate: data.paymentDate,
      trailingDividendRate: data.trailingDividendRate,
      trailingDividendYieldPct: data.trailingDividendYieldPct,
      source: 'yahoo',
    });
  }

  for (const account of portfolio.accounts) {
    if (account.type !== 'ManagedPortfolio') continue;
    const payments = (portfolio.dividendPayments ?? [])
      .filter((p) => p.accountId === account.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (payments.length < 2) continue;

    const [latest, prior] = payments;
    const intervalDays = Math.round((new Date(latest.date) - new Date(prior.date)) / (1000 * 60 * 60 * 24));
    if (intervalDays <= 0) continue;
    const projectedDate = new Date(latest.date);
    projectedDate.setDate(projectedDate.getDate() + intervalDays);

    rows.push({
      accountId: account.id,
      ticker: null,
      label: `${account.provider ? account.provider + ' — ' : ''}${account.portfolioName ?? account.id}`,
      exDividendDate: null,
      paymentDate: projectedDate.toISOString().slice(0, 10),
      trailingDividendRate: null,
      trailingDividendYieldPct: account.dividendYieldPct ?? null,
      source: 'cadence',
    });
  }

  return rows.sort((a, b) => {
    const aDate = a.exDividendDate ?? a.paymentDate;
    const bDate = b.exDividendDate ?? b.paymentDate;
    return new Date(aDate) - new Date(bDate);
  });
}

// Filters computeDividendCalendar() rows down to whichever date (ex-div or
// payment, whichever is sooner) falls within the next `days` days — backs
// the Dividend Calendar's alert banner.
export function filterUpcomingWithinDays(calendarEntries, days) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);

  return calendarEntries.filter((entry) => {
    const date = entry.exDividendDate ?? entry.paymentDate;
    if (!date) return false;
    const d = new Date(date);
    return d >= now && d <= cutoff;
  });
}

// Real logged dividend payments (portfolio.dividendPayments), grouped by
// calendar month for the requested year (default: this year) — backs the
// Income Analytics bar chart. Returns 12 entries (Jan-Dec) even for months
// with no payments, so the chart always has a full x-axis.
export function computeMonthlyDividendTotals(portfolio, { year } = {}) {
  const targetYear = year ?? new Date().getFullYear();
  const totals = Array.from({ length: 12 }, () => 0);

  for (const payment of portfolio.dividendPayments ?? []) {
    const d = new Date(payment.date);
    if (d.getFullYear() !== targetYear) continue;
    totals[d.getMonth()] += toSGD(payment.amount, payment.currency);
  }

  return totals.map((totalSGD, i) => ({
    month: new Date(targetYear, i, 1).toLocaleDateString('en-SG', { month: 'short' }),
    totalSGD,
  }));
}

// Real logged dividend payments, grouped by calendar year — same source as
// computeMonthlyDividendTotals, just summed at year granularity instead.
export function computeYearlyDividendTotals(portfolio) {
  const totals = new Map();
  for (const payment of portfolio.dividendPayments ?? []) {
    const year = new Date(payment.date).getFullYear();
    totals.set(year, (totals.get(year) ?? 0) + toSGD(payment.amount, payment.currency));
  }
  return [...totals.entries()].sort(([a], [b]) => a - b).map(([year, totalSGD]) => ({ year, totalSGD }));
}

// Yield on cost per brokerage holding: today's dividend yield against what
// you actually paid, not today's price — the metric a dividend-income
// investor tracks over a decade of buys at different prices. Skips (does
// not zero-fill) any holding missing dividendYieldPct or costBasis, same
// "skip, don't fabricate" rule as computeProjectedAnnualDividends.
export function computeYieldOnCostByHolding(portfolio) {
  const rows = [];
  for (const holding of collectHoldings(portfolio)) {
    if (holding.dividendYieldPct == null || !holding.costBasis) continue;
    const annualDividendPerShare = holding.currentPrice * (holding.dividendYieldPct / 100);
    const yieldOnCostPct = (annualDividendPerShare / holding.costBasis) * 100;
    rows.push({
      accountId: holding.accountId,
      ticker: holding.ticker,
      label: `${holding.broker} — ${holding.ticker}`,
      dividendYieldPct: holding.dividendYieldPct,
      yieldOnCostPct,
    });
  }
  return rows.sort((a, b) => b.yieldOnCostPct - a.yieldOnCostPct);
}

// --- Rebalancing governance audit trail ---------------------------------

// Sorted newest-first — the audit trail for the Tier 2 Research → Advisor →
// user-decision flow. See defaultPortfolio.js's rebalancingHistory doc
// comment for the entry shape and RebalancingHistory.jsx for the UI.
export function computeRebalancingHistory(portfolio) {
  return [...(portfolio.rebalancingHistory ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Null if no rebalance has ever been logged — callers should treat that as
// "no interval to check", not as "0 days ago".
export function daysSinceLastRebalance(portfolio) {
  const history = computeRebalancingHistory(portfolio);
  if (history.length === 0) return null;
  const lastDate = new Date(history[0].date);
  const diffMs = Date.now() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// --- Net worth history / portfolio growth chart -------------------------

export const NET_WORTH_HISTORY_RANGES = [
  { key: 'YTD', label: 'YTD', since: 'since start of year' },
  { key: '1M', label: '1M', since: 'past 1 month' },
  { key: '6M', label: '6M', since: 'past 6 months' },
  { key: '1Y', label: '1Y', since: 'past 1 year' },
  { key: '3Y', label: '3Y', since: 'past 3 years' },
  { key: 'ALL', label: 'All Time', since: 'all time' },
];

function rangeStartDate(range, latestDateStr) {
  const end = new Date(latestDateStr);
  switch (range) {
    case 'YTD':
      return new Date(end.getFullYear(), 0, 1);
    case '1M': {
      const d = new Date(end);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case '6M': {
      const d = new Date(end);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case '1Y': {
      const d = new Date(end);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case '3Y': {
      const d = new Date(end);
      d.setFullYear(d.getFullYear() - 3);
      return d;
    }
    case 'ALL':
    default:
      return null;
  }
}

// Sorted oldest-first (chronological, chart-ready) — unlike
// computeRebalancingHistory/computeDividendPayments which sort newest-first
// for log display. Deliberately NOT backfilled with synthetic points:
// callers should render an empty/sparse state rather than a fabricated
// trend when history.length is small.
export function computeNetWorthHistory(portfolio) {
  return [...(portfolio.netWorthHistory ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function filterNetWorthHistory(history, range) {
  if (history.length === 0) return [];
  const latestDate = history[history.length - 1].date;
  const start = rangeStartDate(range, latestDate);
  if (!start) return history;
  return history.filter((h) => new Date(h.date) >= start);
}

// Change over a (already range-filtered) history slice. Requires at least 2
// points to mean anything — callers should treat a single point as "not
// enough history yet", not as a real 0% change.
export function computeRangeChange(history, { excludeCPF = false } = {}) {
  if (history.length < 2) return { startValue: null, endValue: null, deltaSGD: null, deltaPct: null };
  const key = excludeCPF ? 'netWorthExCPFSGD' : 'netWorthSGD';
  const startValue = history[0][key];
  const endValue = history[history.length - 1][key];
  const deltaSGD = endValue - startValue;
  const deltaPct = startValue !== 0 ? deltaSGD / startValue : null;
  return { startValue, endValue, deltaSGD, deltaPct };
}

// --- Account groupings ("Your Goals" cards) ------------------------------

function normalizeAllocation(byClass, total) {
  const out = {};
  if (total <= 0) return out;
  for (const [key, value] of Object.entries(byClass)) {
    if (value > 0) out[key] = value / total;
  }
  return out;
}

// Not real user-defined goals — Welldee doesn't track named goals with
// targets yet (see WEALTH_DASHBOARD.md Tier 3). This groups by account
// instead, each with its own value + asset-class mix, as a stand-in for the
// "Your Goals" card layout. Revisit if/when real goal-tracking is built.
export function computeAccountGroups(portfolio) {
  const groups = [];
  let endowusGroup = null;

  for (const account of portfolio.accounts) {
    if (account.type === 'Brokerage') {
      const byClass = { equities: 0, fixedIncome: 0, cash: 0 };
      let valueSGD = 0;
      let pnlSGD = 0;
      let hasPnL = false;
      for (const holding of account.holdings ?? []) {
        const v = toSGD(holdingCurrentValue(holding), holding.currency);
        const assetClass = holding.assetClass ?? ASSET_CLASSES.EQUITIES;
        byClass[assetClass] = (byClass[assetClass] ?? 0) + v;
        valueSGD += v;
        const pnl = holdingUnrealizedPnL(holding);
        if (pnl != null) {
          hasPnL = true;
          pnlSGD += toSGD(pnl, holding.currency);
        }
      }
      for (const [currency, amount] of Object.entries(account.cash ?? {})) {
        const v = toSGD(amount, currency);
        byClass.cash += v;
        valueSGD += v;
      }
      if (valueSGD > 0) {
        groups.push({
          id: account.id,
          label: account.broker ?? account.id,
          valueSGD,
          pnlSGD: hasPnL ? pnlSGD : null,
          allocation: normalizeAllocation(byClass, valueSGD),
        });
      }
    }

    if (account.type === 'CPF') {
      const { ordinary = 0, special = 0, medisave = 0 } = account.balances ?? {};
      const valueSGD = ordinary + special + medisave;
      if (valueSGD > 0) {
        groups.push({ id: account.id, label: 'CPF', valueSGD, pnlSGD: null, allocation: { cpf: 1 } });
      }
    }

    if (account.type === 'Bank') {
      const valueSGD = Object.entries(account.cash ?? {}).reduce((sum, [ccy, amt]) => sum + toSGD(amt, ccy), 0);
      if (valueSGD > 0) {
        groups.push({ id: account.id, label: account.id, valueSGD, pnlSGD: null, allocation: { cash: 1 } });
      }
    }

    if (account.type === 'ManagedPortfolio') {
      const valueSGD = toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
      const equities = account.allocation?.equities ?? 0;
      const fixedIncome = account.allocation?.fixedIncome ?? 0;

      // Group all Endowus accounts together
      if (account.provider === 'Endowus') {
        if (!endowusGroup) {
          endowusGroup = {
            id: 'endowus-group',
            label: 'Endowus',
            valueSGD: 0,
            pnlSGD: 0,
            hasPnL: false,
            totalEquities: 0,
            totalFixedIncome: 0,
          };
        }
        endowusGroup.valueSGD += valueSGD;
        const pnl = managedPortfolioUnrealizedPnL(account);
        if (pnl != null) {
          endowusGroup.hasPnL = true;
          endowusGroup.pnlSGD += pnl;
        }
        endowusGroup.totalEquities += valueSGD * equities;
        endowusGroup.totalFixedIncome += valueSGD * fixedIncome;
      } else if (valueSGD > 0) {
        // Non-Endowus ManagedPortfolio accounts stay as individual groups
        const label = `${account.provider ? account.provider + ' — ' : ''}${account.portfolioName ?? account.id}`;
        groups.push({
          id: account.id,
          label,
          valueSGD,
          pnlSGD: managedPortfolioUnrealizedPnL(account),
          allocation: { equities, fixedIncome },
        });
      }
    }
  }

  // Add Endowus group if it has any value
  if (endowusGroup && endowusGroup.valueSGD > 0) {
    groups.push({
      id: endowusGroup.id,
      label: endowusGroup.label,
      valueSGD: endowusGroup.valueSGD,
      pnlSGD: endowusGroup.hasPnL ? endowusGroup.pnlSGD : null,
      allocation: {
        equities: endowusGroup.totalEquities / endowusGroup.valueSGD,
        fixedIncome: endowusGroup.totalFixedIncome / endowusGroup.valueSGD,
      },
    });
  }

  return groups.sort((a, b) => b.valueSGD - a.valueSGD);
}

// --- CSV Export / Import ---------------------------------------------------

// Export portfolio to PDF format for readable snapshots. Includes holdings table,
// allocation summary, and key metrics. Formatted for easy printing/sharing.
export function exportPortfolioToPDF(portfolio) {
  // Dynamic import to avoid breaking builds if jsPDF isn't available
  return import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Welldee Portfolio Export', 20, yPos);
    yPos += 15;

    // Date
    doc.setFontSize(10);
    doc.text(`Exported: ${new Date().toLocaleString('en-SG')}`, 20, yPos);
    yPos += 10;

    // Summary cards
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const summaryLines = [
      `Net Worth (ex-CPF): SGD ${(computeNetWorth(portfolio, { excludeCPF: true }) ?? 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
      `Total Net Worth: SGD ${(computeNetWorth(portfolio) ?? 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
    ];

    const unrealizedPnL = computeOverallUnrealizedPnL(portfolio);
    if (unrealizedPnL.pnlSGD != null) {
      summaryLines.push(`Unrealized P&L: SGD ${unrealizedPnL.pnlSGD.toLocaleString('en-SG', { maximumFractionDigits: 0 })} (${((unrealizedPnL.pnlPct ?? 0) * 100).toFixed(1)}%)`);
    }

    summaryLines.forEach((line) => {
      doc.text(line, 20, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Holdings table
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Holdings by Account', 20, yPos);
    yPos += 8;

    const tableData = [];
    tableData.push(['Account', 'Ticker', 'Shares', 'Price', 'Value (SGD)', 'P&L']);

    for (const account of portfolio.accounts) {
      if (account.type === 'Brokerage') {
        for (const holding of account.holdings ?? []) {
          const value = holdingCurrentValue(holding);
          const valueSGD = toSGD(value, holding.currency);
          const pnl = holdingUnrealizedPnL(holding);
          const pnlSGD = pnl != null ? toSGD(pnl, holding.currency) : null;

          tableData.push([
            account.broker ?? account.id,
            holding.ticker ?? '',
            (holding.shares ?? 0).toString(),
            `${holding.currency}${(holding.currentPrice ?? 0).toFixed(2)}`,
            `SGD ${valueSGD.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
            pnlSGD != null ? `SGD ${pnlSGD.toLocaleString('en-SG', { maximumFractionDigits: 0 })}` : '—',
          ]);
        }
      } else if (account.type === 'ManagedPortfolio') {
        const valueSGD = toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
        const pnl = account.currentValue ? ((account.currentValue - (account.costBasis ?? 0))) : null;

        tableData.push([
          `${account.provider ?? 'Portfolio'}: ${account.portfolioName ?? account.id}`,
          '',
          '',
          '',
          `SGD ${valueSGD.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
          pnl != null ? `SGD ${pnl.toLocaleString('en-SG', { maximumFractionDigits: 0 })}` : '—',
        ]);
      } else if (account.type === 'CPF') {
        const total = (account.balances?.ordinary ?? 0) + (account.balances?.special ?? 0) + (account.balances?.medisave ?? 0);
        tableData.push([
          'CPF (Total)',
          '',
          '',
          '',
          `SGD ${total.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
          '—',
        ]);
      } else if (account.type === 'Bank') {
        const total = (account.cash?.SGD ?? 0) + toSGD(account.cash?.USD ?? 0, 'USD');
        tableData.push([
          account.id,
          '',
          '',
          '',
          `SGD ${total.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
          '—',
        ]);
      }
    }

    doc.autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: yPos,
      margin: 20,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 },
      },
      fontSize: 8,
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();
        doc.setFontSize(9);
        doc.setTextColor(128);
        doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      },
    });

    // Asset allocation summary
    const finalY = doc.lastAutoTable?.finalY ?? yPos + 100;
    if (finalY + 40 < pageHeight) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Asset Allocation', 20, finalY + 10);

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const alloc = computeAllocationByClass(portfolio, { excludeCPF: false });
      Object.entries(alloc).forEach(([className, pct]) => {
        doc.text(`${className}: ${(pct * 100).toFixed(1)}%`, 20, finalY + 18 + (Object.entries(alloc).indexOf([className, pct]) * 6));
      });
    }

    return doc;
  });
}

// Export portfolio to CSV format for backup/audit/external editing.
// Format: one row per brokerage holding + one row per ManagedPortfolio account
// + one row per CPF/Bank account. Can be edited externally and re-imported.
export function exportPortfolioToCSV(portfolio) {
  const rows = [];
  const header = [
    'accountId',
    'accountType',
    'broker/provider',
    'ticker',
    'shares',
    'costBasis',
    'currentPrice',
    'currency',
    'assetClass',
    'geography',
    'industry',
    'portfolioName',
    'currentValue',
    'allocation_equities',
    'allocation_fixedIncome',
    'balances_ordinary',
    'balances_special',
    'balances_medisave',
    'cash_SGD',
    'cash_USD',
    'dividendYieldPct',
    'lastUpdated',
  ];
  rows.push(header);

  // Brokerage holdings
  for (const account of portfolio.accounts) {
    if (account.type === 'Brokerage') {
      for (const holding of account.holdings ?? []) {
        rows.push([
          account.id,
          'Brokerage',
          account.broker ?? '',
          holding.ticker ?? '',
          holding.shares ?? '',
          holding.costBasis ?? '',
          holding.currentPrice ?? '',
          holding.currency ?? 'SGD',
          holding.assetClass ?? '',
          holding.geography ?? '',
          holding.industry ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          holding.dividendYieldPct ?? '',
          holding.lastUpdated ?? '',
        ]);
      }
      // Account cash balances
      for (const [ccy, amount] of Object.entries(account.cash ?? {})) {
        const row = Array(header.length).fill('');
        row[0] = account.id;
        row[1] = 'Brokerage';
        row[2] = account.broker ?? '';
        if (ccy === 'SGD') row[18] = amount;
        else if (ccy === 'USD') row[19] = amount;
        rows.push(row);
      }
    }

    // ManagedPortfolio
    if (account.type === 'ManagedPortfolio') {
      rows.push([
        account.id,
        'ManagedPortfolio',
        account.provider ?? '',
        '',
        '',
        account.costBasis ?? '',
        '',
        account.currency ?? 'SGD',
        '',
        account.geography ?? '',
        account.industry ?? '',
        account.portfolioName ?? '',
        account.currentValue ?? '',
        account.allocation?.equities ?? '',
        account.allocation?.fixedIncome ?? '',
        '',
        '',
        '',
        '',
        '',
        account.dividendYieldPct ?? '',
        account.lastUpdated ?? '',
      ]);
    }

    // CPF
    if (account.type === 'CPF') {
      rows.push([
        account.id,
        'CPF',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        account.balances?.ordinary ?? '',
        account.balances?.special ?? '',
        account.balances?.medisave ?? '',
        '',
        '',
        '',
        account.lastUpdated ?? '',
      ]);
    }

    // Bank
    if (account.type === 'Bank') {
      rows.push([
        account.id,
        'Bank',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        account.cash?.SGD ?? '',
        account.cash?.USD ?? '',
        '',
        account.lastUpdated ?? '',
      ]);
    }
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

// Import portfolio from CSV. Reconstructs the portfolio data structure.
// Expects columns matching the header from exportPortfolioToCSV.
export function importPortfolioFromCSV(csvString) {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header + at least one data row');

  const header = lines[0].split(',').map((h) => h.replace(/^"|"$/g, ''));
  const accounts = new Map();

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser: split by comma, strip quotes
    const cells = lines[i].split(',').map((c) => c.replace(/^"|"$/g, ''));
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx];
    });

    const accountId = row.accountId?.trim();
    const accountType = row.accountType?.trim();
    if (!accountId || !accountType) continue;

    if (!accounts.has(accountId)) {
      accounts.set(accountId, { id: accountId, type: accountType });
    }

    const account = accounts.get(accountId);

    // Brokerage holding
    if (accountType === 'Brokerage' && row.ticker?.trim()) {
      if (!account.holdings) account.holdings = [];
      account.holdings.push({
        ticker: row.ticker.trim(),
        shares: parseFloat(row.shares) || null,
        costBasis: parseFloat(row.costBasis) || null,
        currentPrice: parseFloat(row.currentPrice) || null,
        currency: row.currency?.trim() || 'SGD',
        assetClass: row.assetClass?.trim() || null,
        geography: row.geography?.trim() || null,
        industry: row.industry?.trim() || null,
        dividendYieldPct: parseFloat(row.dividendYieldPct) || null,
        lastUpdated: row.lastUpdated?.trim() || null,
      });
    }

    // Brokerage cash
    if (accountType === 'Brokerage' && !row.ticker?.trim()) {
      if (!account.cash) account.cash = {};
      if (row.cash_SGD?.trim()) account.cash.SGD = parseFloat(row.cash_SGD);
      if (row.cash_USD?.trim()) account.cash.USD = parseFloat(row.cash_USD);
      if (row['broker/provider']?.trim()) account.broker = row['broker/provider'];
    }

    // ManagedPortfolio
    if (accountType === 'ManagedPortfolio') {
      account.provider = row['broker/provider']?.trim() || null;
      account.portfolioName = row.portfolioName?.trim() || null;
      account.currentValue = parseFloat(row.currentValue) || null;
      account.costBasis = parseFloat(row.costBasis) || null;
      account.currency = row.currency?.trim() || 'SGD';
      account.geography = row.geography?.trim() || null;
      account.industry = row.industry?.trim() || null;
      account.allocation = {
        equities: parseFloat(row.allocation_equities) || null,
        fixedIncome: parseFloat(row.allocation_fixedIncome) || null,
      };
      account.dividendYieldPct = parseFloat(row.dividendYieldPct) || null;
      account.lastUpdated = row.lastUpdated?.trim() || null;
    }

    // CPF
    if (accountType === 'CPF') {
      account.balances = {
        ordinary: parseFloat(row.balances_ordinary) || 0,
        special: parseFloat(row.balances_special) || 0,
        medisave: parseFloat(row.balances_medisave) || 0,
      };
      account.lastUpdated = row.lastUpdated?.trim() || null;
    }

    // Bank
    if (accountType === 'Bank') {
      account.cash = {};
      if (row.cash_SGD?.trim()) account.cash.SGD = parseFloat(row.cash_SGD);
      if (row.cash_USD?.trim()) account.cash.USD = parseFloat(row.cash_USD);
      account.lastUpdated = row.lastUpdated?.trim() || null;
    }
  }

  return {
    metadata: {
      userId: 'admin',
      lastUpdated: new Date().toISOString(),
      baseCurrency: 'SGD',
      startOfYearValueSGD: null,
    },
    accounts: Array.from(accounts.values()),
    targetAllocation: {
      equities: 0.8,
      fixedIncome: 0.2,
    },
    dividendPayments: [],
  };
}
