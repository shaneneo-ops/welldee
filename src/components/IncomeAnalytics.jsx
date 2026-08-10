import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import { collectHoldings, computeYTDDividendIncome, computeYieldOnCostByHolding } from '../utils/calculations';
import { fetchDividendHistory } from '../services/dividendHistoryService';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(amount);
}

function formatCompactSGD(amount, hideNumbers) {
  if (hideNumbers) return '•••';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', maximumFractionDigits: 1 }).format(amount);
}

const tooltipContentStyle = {
  backgroundColor: 'var(--wd-card-bg)',
  border: '2px var(--wd-border-style) var(--wd-card-border)',
  borderRadius: '1rem',
  fontFamily: 'Quicksand, sans-serif',
  color: 'var(--wd-text-heading)',
};

// The headline YTD figure is calculated, not manually logged: today's share
// count × every real per-share payout that's gone ex-div this year, fetched
// per ticker from api/dividendHistory.js (see computeYTDDividendIncome).
// Managed portfolios (Endowus/iFAST, no resolvable ticker) fall back to
// whatever's logged in the Dividend Log for that account. Same
// fetch/degrade pattern as DividendCalendar.jsx — a Yahoo outage just means
// that ticker contributes nothing to the total, not a broken page.
export default function IncomeAnalytics() {
  const { portfolio, hideNumbers } = usePortfolio();
  const [holdings] = useState(() => collectHoldings(portfolio));
  const [tickers] = useState(() => [...new Set(holdings.map((h) => h.ticker))]);
  const [fetchedDividendHistory, setFetchedDividendHistory] = useState({});
  const [loading, setLoading] = useState(tickers.length > 0);

  useEffect(() => {
    if (tickers.length === 0) return;
    let remaining = tickers.length;
    tickers.forEach(async (ticker) => {
      const result = await fetchDividendHistory(ticker);
      if (result.ok) setFetchedDividendHistory((prev) => ({ ...prev, [ticker]: result.dividends }));
      remaining -= 1;
      if (remaining === 0) setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { totalSGD, manualManagedTotalSGD, byMonth } = computeYTDDividendIncome(portfolio, { fetchedDividendHistory });
  const yieldOnCost = computeYieldOnCostByHolding(portfolio);
  const hasAnyIncome = byMonth.some((m) => m.totalSGD > 0);

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">📈</span>
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <p className="wd-card-title mb-0">Income Analytics</p>
        {!loading && (
          <p className="text-sm font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
            {formatSGD(totalSGD, hideNumbers)} received YTD
          </p>
        )}
      </div>
      <p className="wd-subtle mb-3">
        Calculated from your current shares × real per-share payouts this year
        {manualManagedTotalSGD > 0 ? ', plus manually logged managed-portfolio payments below.' : '.'}
      </p>

      {loading ? (
        <p className="wd-muted py-8 text-center text-sm">Looking up this year's dividend payments…</p>
      ) : hasAnyIncome ? (
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--wd-card-border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--wd-text-faint)', fontSize: 11, fontFamily: 'Quicksand, sans-serif' }}
                axisLine={{ stroke: 'var(--wd-card-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--wd-text-faint)', fontSize: 11, fontFamily: 'Quicksand, sans-serif' }}
                tickFormatter={(v) => formatCompactSGD(v, hideNumbers)}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                formatter={(value) => [formatSGD(value, hideNumbers), 'Dividends']}
              />
              <Bar dataKey="totalSGD" fill="var(--wd-lavender)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="wd-muted py-8 text-center text-sm">
          No dividends paid out yet this year on your current holdings, and nothing logged for managed portfolios in
          the Dividend Log below.
        </p>
      )}

      {yieldOnCost.length > 0 && (
        <div className="mt-4">
          <p className="wd-label mb-1">Yield on cost</p>
          <table className="wd-table w-full text-sm">
            <tbody>
              {yieldOnCost.map((row) => (
                <tr key={`${row.accountId}-${row.ticker}`} className="border-t wd-divider first:border-0">
                  <td className="py-1.5 pr-3 wd-body-text">{row.label}</td>
                  <td className="py-1.5 pr-3 wd-subtle">Trailing yield {row.dividendYieldPct.toFixed(1)}%</td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
                    {row.yieldOnCostPct.toFixed(1)}% on cost
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
