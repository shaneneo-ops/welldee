import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { computeYTDReturn } from '../utils/calculations';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  const sign = amount >= 0 ? '+' : '−';
  return `${sign}${new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))}`;
}

export default function YTDReturnCard() {
  const { portfolio, excludeCPF, hideNumbers } = usePortfolio();
  const { pct, amountSGD } = computeYTDReturn(portfolio, { excludeCPF });

  if (pct == null) {
    return (
      <div className="wd-card">
        <span className="wd-emoji-badge" aria-hidden="true">🌈</span>
        <p className="wd-card-title">YTD Return</p>
        <p className="wd-muted mt-1">Set a start-of-year value in Settings to enable this</p>
      </div>
    );
  }

  const isPositive = pct >= 0;
  const colorClass = isPositive ? 'wd-positive' : 'wd-negative';

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">🌈</span>
      <p className="wd-card-title">YTD Return</p>
      <div className={`flex items-center gap-1.5 mt-1 ${colorClass}`}>
        {isPositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
        <p className="text-3xl wd-value">{(pct * 100).toFixed(1)}%</p>
      </div>
      <p className={`text-xs mt-1 ${colorClass}`}>{formatSGD(amountSGD, hideNumbers)} since start of year</p>
    </div>
  );
}
