import { AlertTriangle } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { collectHoldings, computeRebalanceAlerts } from '../utils/calculations';
import { ASSET_CLASS_LABELS, REBALANCE_THRESHOLD } from '../utils/constants';

function formatSGD(amount, hideNumbers = false) {
  if (hideNumbers) return '••••••';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Rebalancing only ever covers Equities/Fixed Income now (see
// computeInvestedAllocationBreakdown in calculations.js) — Cash and CPF
// aren't part of the comparison at all, so there's no "can't withdraw CPF"
// case to special-case here anymore.
function suggestedAction(alert, holdings, hideNumbers) {
  const label = ASSET_CLASS_LABELS[alert.assetClass];
  const amount = formatSGD(alert.driftSGD, hideNumbers);

  if (!alert.overweight) {
    return `Add ${amount} to ${label} to reach target.`;
  }

  const candidates = holdings
    .filter((h) => h.assetClass === alert.assetClass)
    .sort((a, b) => b.currentValueSGD - a.currentValueSGD);

  if (candidates.length > 0) {
    const ticker = hideNumbers ? '••••' : candidates[0].ticker;
    return `Sell ~${amount} of ${ticker} to rebalance back toward target ${label.toLowerCase()}.`;
  }
  return `Reduce ${label} by ${amount} to reach target.`;
}

export default function RebalanceAlert() {
  const { portfolio, hideNumbers } = usePortfolio();
  const alerts = computeRebalanceAlerts(portfolio);
  const holdings = collectHoldings(portfolio);

  if (alerts.length === 0) {
    return (
      <div className="wd-card">
        <span className="wd-emoji-badge" aria-hidden="true">🌟</span>
        <p className="wd-value text-sm">
          Equities/Fixed Income mix is within {(REBALANCE_THRESHOLD * 100).toFixed(0)}% of target. No rebalancing needed.
        </p>
      </div>
    );
  }

  return (
    <div className="wd-card space-y-3">
      <span className="wd-emoji-badge" aria-hidden="true">⚖️</span>
      <div className="flex items-center gap-2" style={{ color: 'var(--wd-orange)' }}>
        <AlertTriangle size={18} />
        <p className="text-sm font-semibold wd-heading" style={{ color: 'var(--wd-text-heading)' }}>Rebalancing suggested</p>
      </div>
      <p className="wd-subtle -mt-1">Equities vs Fixed Income only — Cash and CPF aren't part of this comparison.</p>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.assetClass} className="text-sm wd-body-text">
            <span className="font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
              {ASSET_CLASS_LABELS[alert.assetClass]} at {(alert.currentPct * 100).toFixed(0)}%
              (target {(alert.targetPct * 100).toFixed(0)}%)
            </span>
            <br />
            <span className="wd-body-text">→ {suggestedAction(alert, holdings, hideNumbers)}</span>
          </li>
        ))}
      </ul>
      <p className="wd-subtle pt-1 border-t-2 wd-divider">
        Suggestions only — no trades are executed automatically.
      </p>
    </div>
  );
}
