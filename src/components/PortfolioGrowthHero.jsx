import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import {
  computeNetWorth,
  computeNetWorthHistory,
  filterNetWorthHistory,
  computeRangeChange,
  NET_WORTH_HISTORY_RANGES,
} from '../utils/calculations';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(amount);
}

function formatSGDSigned(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  if (amount == null) return '—';
  const sign = amount >= 0 ? '+' : '−';
  return `${sign}${formatSGD(Math.abs(amount), false)}`;
}

function formatCompactSGD(amount, hideNumbers) {
  if (hideNumbers) return '•••';
  if (amount == null) return '';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', maximumFractionDigits: 1 }).format(amount);
}

const tooltipContentStyle = {
  backgroundColor: 'var(--wd-card-bg)',
  border: '2px var(--wd-border-style) var(--wd-card-border)',
  borderRadius: '1rem',
  fontFamily: 'Quicksand, sans-serif',
  color: 'var(--wd-text-heading)',
};

// Not a real historical performance chart yet — Welldee has no backfilled
// price history, only daily snapshots captured going forward (see
// PortfolioContext's auto-capture effect). Renders an honest empty state
// rather than a fabricated trend when there's fewer than 2 real points in
// the selected range.
export default function PortfolioGrowthHero() {
  const { portfolio, excludeCPF, hideNumbers } = usePortfolio();
  const [range, setRange] = useState('YTD');

  const netWorth = computeNetWorth(portfolio, { excludeCPF });
  const history = computeNetWorthHistory(portfolio);
  const filtered = filterNetWorthHistory(history, range);
  const { deltaSGD, deltaPct } = computeRangeChange(filtered, { excludeCPF });

  const valueKey = excludeCPF ? 'netWorthExCPFSGD' : 'netWorthSGD';
  const chartData = filtered.map((h) => ({ date: h.date, value: h[valueKey] }));

  const isPositive = (deltaSGD ?? 0) >= 0;
  const deltaColorClass = isPositive ? 'wd-positive' : 'wd-negative';
  const activeRange = NET_WORTH_HISTORY_RANGES.find((r) => r.key === range);

  return (
    <div className="wd-card text-center">
      <span className="wd-emoji-badge" aria-hidden="true">💎</span>
      <p className="wd-card-title mb-2">{excludeCPF ? 'Net Worth (excl. CPF)' : 'Net Worth'}</p>
      <p className="text-4xl sm:text-5xl wd-value">{formatSGD(netWorth, hideNumbers)}</p>

      {chartData.length >= 2 && deltaSGD != null ? (
        <p className={`text-sm mt-2 ${deltaColorClass}`}>
          {formatSGDSigned(deltaSGD, hideNumbers)}
          {deltaPct != null && ` (${isPositive ? '+' : ''}${(deltaPct * 100).toFixed(1)}%)`}
          <span className="wd-subtle"> {activeRange.since}</span>
        </p>
      ) : (
        <p className="wd-subtle mt-2">Not enough history yet — Welldee logs a snapshot each day you use it.</p>
      )}

      <div className="h-56 mt-4 -mx-2">
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wdGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--wd-lavender)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--wd-bg)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--wd-card-border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--wd-text-faint)', fontSize: 11, fontFamily: 'Quicksand, sans-serif' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
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
                labelFormatter={(d) => new Date(d).toLocaleDateString('en-SG', { dateStyle: 'medium' })}
                formatter={(value) => [formatSGD(value, hideNumbers), 'Net worth']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--wd-lavender)"
                strokeWidth={2.5}
                fill="url(#wdGrowthGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center wd-muted text-sm px-6 text-center">
            {history.length === 0
              ? "No history yet — today's snapshot was just logged. Check back tomorrow to see the first stretch of the line."
              : 'Not enough points in this range yet — try a wider range or check back as more days get logged.'}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {NET_WORTH_HISTORY_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`wd-btn-toggle ${range === r.key ? 'wd-btn-toggle-active' : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
