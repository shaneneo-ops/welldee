import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import { computeBreakdownByDimension, filterPortfolioByIndustry } from '../utils/calculations';
import { DOODLE_PALETTE } from '../utils/constants';

const PALETTE = DOODLE_PALETTE;

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

function DimensionPie({ title, rows, hideNumbers, filterNote }) {
  const data = rows.map((r) => ({ name: r.label, value: r.valueSGD, pct: r.pct }));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="wd-card-title">{title}</p>
        {filterNote && <p className="wd-subtle">{filterNote}</p>}
      </div>
      {data.length === 0 ? (
        <p className="wd-muted py-8 text-center text-sm">No positions yet</p>
      ) : (
        <div className="h-56" style={{ color: 'var(--wd-text-body)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                isAnimationActive={false}
                stroke="var(--wd-card-bg)"
                strokeWidth={3}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatSGD(value, hideNumbers)} contentStyle={tooltipContentStyle} />
              <Legend formatter={(name, entry) => `${name} ${(entry.payload.pct * 100).toFixed(0)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Recharts flattens each leaf's own data fields (name, value, pct, fill)
// directly onto the props passed to a custom Treemap `content` renderer,
// alongside the computed x/y/width/height — see recharts' Treemap.js
// (nodeProps = { ...node, ...layout }). Click handling is wired separately
// via the Treemap's own `onClick` prop below, not here.
function TreemapCell({ x, y, width, height, name, pct, fill, selected }) {
  const isDimmed = selected && selected !== name;
  const showLabel = width > 50 && height > 28;

  return (
    <g className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="var(--wd-card-bg)"
        strokeWidth={3}
        rx={10}
        opacity={isDimmed ? 0.35 : 1}
      />
      {showLabel && (
        <text x={x + 8} y={y + 18} fill="#241d3f" fontSize={11} fontWeight={700} fontFamily="Quicksand, sans-serif">
          {name}
        </text>
      )}
      {showLabel && height > 42 && (
        <text x={x + 8} y={y + 34} fill="#241d3f" fontSize={10} opacity={0.75} fontFamily="Quicksand, sans-serif">
          {(pct * 100).toFixed(0)}%
        </text>
      )}
    </g>
  );
}

function IndustryTreemap({ rows, selected, onSelect, hideNumbers }) {
  const data = rows.map((r, i) => ({ name: r.label, value: r.valueSGD, pct: r.pct, fill: PALETTE[i % PALETTE.length] }));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="wd-card-title">By Industry</p>
        {selected && (
          <button onClick={() => onSelect(selected)} className="wd-badge">
            Clear filter ✕
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <p className="wd-muted py-8 text-center text-sm">No positions yet</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="value"
              nameKey="name"
              stroke="var(--wd-card-bg)"
              isAnimationActive={false}
              onClick={(node) => onSelect(node.name)}
              content={<TreemapCell selected={selected} />}
            >
              <Tooltip formatter={(value) => formatSGD(value, hideNumbers)} contentStyle={tooltipContentStyle} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}
      <p className="wd-subtle mt-2">Click a block to filter Holdings, Asset Allocation, and Geography below to that industry.</p>
    </div>
  );
}

// The Industry treemap itself always shows the full, unfiltered breakdown
// (so there's always something to click) — only Geography narrows down to
// the selected industry, matching the PowerBI-style "source visual stays
// whole, other visuals filter" convention.
export default function GeographyIndustryBreakdown({ selectedIndustry, onSelectIndustry, industryFilter }) {
  const { portfolio, hideNumbers } = usePortfolio();
  const geographyPortfolio = industryFilter ? filterPortfolioByIndustry(portfolio, industryFilter) : portfolio;
  const geography = computeBreakdownByDimension(geographyPortfolio, 'geography');
  const industry = computeBreakdownByDimension(portfolio, 'industry');

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">🗺️</span>
      <p className="wd-card-title mb-1">Geography & Industry</p>
      <p className="wd-subtle mb-4">
        Brokerage holdings and managed portfolios only — CPF and idle cash have no meaningful region/sector.
        Managed portfolios (Endowus, iFAST) are tagged at the whole-portfolio level, not looked through to
        their underlying funds.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <DimensionPie
          title="By Geography"
          rows={geography}
          hideNumbers={hideNumbers}
          filterNote={industryFilter ? `Filtered by: ${industryFilter}` : null}
        />
        <IndustryTreemap rows={industry} selected={selectedIndustry} onSelect={onSelectIndustry} hideNumbers={hideNumbers} />
      </div>
    </div>
  );
}
