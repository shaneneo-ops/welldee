import { usePortfolio } from '../context/PortfolioContext';
import { computeAccountGroups } from '../utils/calculations';
import { ASSET_CLASS_LABELS } from '../utils/constants';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(amount);
}

function formatSGDSigned(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  const sign = amount >= 0 ? '+' : '−';
  return `${sign}${formatSGD(Math.abs(amount), false)}`;
}

const CLASS_COLOR = {
  equities: 'var(--wd-lavender)',
  fixedIncome: 'var(--wd-blue)',
  cash: 'var(--wd-green)',
  cpf: 'var(--wd-yellow)',
};

function AllocationBar({ allocation }) {
  const segments = Object.entries(allocation).filter(([, pct]) => pct > 0);
  if (segments.length === 0) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden mt-3" style={{ backgroundColor: 'var(--wd-card-border)' }}>
      {segments.map(([cls, pct]) => (
        <div
          key={cls}
          style={{ width: `${pct * 100}%`, backgroundColor: CLASS_COLOR[cls] ?? 'var(--wd-card-border)' }}
          title={`${ASSET_CLASS_LABELS[cls] ?? cls} ${(pct * 100).toFixed(0)}%`}
        />
      ))}
    </div>
  );
}

// "Goal" cards are a stand-in for real goal-tracking, which Welldee doesn't
// have yet (no named goals with targets — see WEALTH_DASHBOARD.md Tier 3).
// Each card is one account/provider grouping instead, so nothing here is
// fabricated — it's your real accounts, just laid out goal-card style.
export default function YourGoals() {
  const { portfolio, excludeCPF, hideNumbers } = usePortfolio();
  let effectivePortfolio = portfolio;
  if (excludeCPF) {
    effectivePortfolio = { ...portfolio, accounts: portfolio.accounts.filter((a) => a.type !== 'CPF') };
  }
  const groups = computeAccountGroups(effectivePortfolio);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-1">
        <h2 className="text-xl wd-heading font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
          <span className="wd-doodle-decor">🎯 </span>
          Your Goals
        </h2>
      </div>
      <p className="wd-subtle mb-3">Grouped by account — named goals with targets aren't tracked yet.</p>

      {groups.length === 0 ? (
        <p className="wd-muted text-sm">No accounts yet.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {groups.map((g) => (
            <div key={g.id} className="wd-card wd-card-alt">
              <p className="text-sm font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
                {g.label}
              </p>
              <div className="flex items-baseline justify-between gap-2 flex-wrap mt-1">
                <p className="text-2xl wd-value">{formatSGD(g.valueSGD, hideNumbers)}</p>
                {g.pnlSGD != null && (
                  <p className={`text-sm font-semibold ${g.pnlSGD >= 0 ? 'wd-positive' : 'wd-negative'}`}>
                    {formatSGDSigned(g.pnlSGD, hideNumbers)}
                  </p>
                )}
              </div>
              <AllocationBar allocation={g.allocation} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
