import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { computeOverallUnrealizedPnL } from '../utils/calculations';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  const sign = amount >= 0 ? '+' : '−';
  return `${sign}${new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))}`;
}

export default function UnrealizedPnLCard() {
  const { portfolio, hideNumbers } = usePortfolio();
  const { pnlSGD, pnlPct } = computeOverallUnrealizedPnL(portfolio);

  if (pnlSGD == null) {
    return (
      <div className="wd-card">
        <span className="wd-emoji-badge" aria-hidden="true">✨</span>
        <p className="wd-card-title">Unrealized P&L</p>
        <p className="wd-muted mt-1">No priced positions yet</p>
      </div>
    );
  }

  const isPositive = pnlSGD >= 0;
  const colorClass = isPositive ? 'wd-positive' : 'wd-negative';

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">✨</span>
      <p className="wd-card-title">Unrealized P&L</p>
      <div className={`flex items-center gap-1.5 mt-1 ${colorClass}`}>
        {isPositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
        <p className="text-3xl wd-value">{formatSGD(pnlSGD, hideNumbers)}</p>
      </div>
      <p className={`text-xs mt-1 ${colorClass}`}>
        {pnlPct != null ? `${(pnlPct * 100).toFixed(1)}% overall` : 'Across brokerage + managed portfolios'}
      </p>
    </div>
  );
}
