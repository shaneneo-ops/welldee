import { usePortfolio } from '../context/PortfolioContext';
import { computeDividendPayments, computeProjectedAnnualDividends } from '../utils/calculations';

function formatSGD(amount, hideNumbers) {
  if (hideNumbers) return '••••••';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DividendsCard() {
  const { portfolio, hideNumbers } = usePortfolio();
  const { totalSGD } = computeDividendPayments(portfolio);
  const projectedSGD = computeProjectedAnnualDividends(portfolio);

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">⭐</span>
      <p className="wd-card-title">Dividends Received (YTD)</p>
      <p className="text-3xl wd-value mt-1">{formatSGD(totalSGD, hideNumbers)}</p>
      <p className="wd-subtle mt-1">
        {projectedSGD > 0
          ? `Projected full year (from yield): ${formatSGD(projectedSGD, hideNumbers)}`
          : 'Log payments below, or set a dividend yield % on a holding for a projection'}
      </p>
    </div>
  );
}
