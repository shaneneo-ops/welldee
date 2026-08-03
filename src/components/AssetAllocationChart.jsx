import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import { computeAllocationBreakdown, filterPortfolioByIndustry } from '../utils/calculations';
import { ASSET_CLASS_COLORS, ASSET_CLASS_LABELS } from '../utils/constants';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(amount);
}

const tooltipContentStyle = {
  backgroundColor: 'var(--wd-card-bg)',
  border: '2px dashed var(--wd-card-border)',
  borderRadius: '1rem',
  fontFamily: 'Quicksand, sans-serif',
  color: 'var(--wd-text-heading)',
};

export default function AssetAllocationChart({ industryFilter }) {
  const { portfolio, excludeCPF, hideNumbers } = usePortfolio();
  const effectivePortfolio = industryFilter ? filterPortfolioByIndustry(portfolio, industryFilter) : portfolio;
  const breakdown = computeAllocationBreakdown(effectivePortfolio, { excludeCPF }).filter((row) => row.valueSGD > 0);

  const data = breakdown.map((row) => ({
    name: ASSET_CLASS_LABELS[row.assetClass],
    value: row.valueSGD,
    pct: row.currentPct,
    assetClass: row.assetClass,
  }));

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">🌈</span>
      <div className="flex items-center justify-between mb-2">
        <p className="wd-card-title">Asset Allocation</p>
        {industryFilter && <p className="wd-subtle">Filtered by: {industryFilter}</p>}
      </div>
      {data.length === 0 ? (
        <p className="wd-muted py-8 text-center text-sm">No positions yet</p>
      ) : (
        <div className="h-64" style={{ color: 'var(--wd-text-body)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                isAnimationActive={false}
                stroke="var(--wd-card-bg)"
                strokeWidth={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.assetClass} fill={ASSET_CLASS_COLORS[entry.assetClass]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatSGD(value, hideNumbers)} contentStyle={tooltipContentStyle} />
              <Legend
                formatter={(name, entry) => `${name} ${(entry.payload.pct * 100).toFixed(0)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
