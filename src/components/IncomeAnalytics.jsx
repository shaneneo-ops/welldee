import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import { computeMonthlyDividendTotals, computeYieldOnCostByHolding } from '../utils/calculations';

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

export default function IncomeAnalytics() {
  const { portfolio, hideNumbers } = usePortfolio();
  const monthly = computeMonthlyDividendTotals(portfolio);
  const yieldOnCost = computeYieldOnCostByHolding(portfolio);
  const hasAnyIncome = monthly.some((m) => m.totalSGD > 0);

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">📈</span>
      <p className="wd-card-title mb-3">Income Analytics</p>

      {hasAnyIncome ? (
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
          No dividends logged this year yet — entries added in the Dividend Log below will show up here by month.
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
