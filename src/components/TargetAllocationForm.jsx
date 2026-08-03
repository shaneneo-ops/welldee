import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { ASSET_CLASSES, ASSET_CLASS_LABELS } from '../utils/constants';

// Rebalancing only ever compares Equities vs Fixed Income (see
// computeInvestedAllocationBreakdown in calculations.js) — Cash and CPF
// aren't part of that comparison, so there's no target % for them to set.
const SLIDER_CLASSES = [ASSET_CLASSES.EQUITIES, ASSET_CLASSES.FIXED_INCOME];

export default function TargetAllocationForm() {
  const { portfolio, setTargetAllocation } = usePortfolio();
  const [draft, setDraft] = useState(portfolio.targetAllocation);

  const total = SLIDER_CLASSES.reduce((sum, key) => sum + (draft[key] ?? 0), 0);
  const isValid = Math.abs(total - 1) < 0.005;

  function handleChange(assetClass, value) {
    setDraft((prev) => ({ ...prev, [assetClass]: Number(value) / 100 }));
  }

  function handleSave() {
    if (!isValid) return;
    setTargetAllocation(draft);
  }

  return (
    <div className="space-y-4">
      {SLIDER_CLASSES.map((assetClass) => (
        <div key={assetClass}>
          <div className="flex justify-between text-sm mb-1">
            <label htmlFor={`slider-${assetClass}`} className="wd-body-text">
              {ASSET_CLASS_LABELS[assetClass]}
            </label>
            <span className="font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
              {Math.round((draft[assetClass] ?? 0) * 100)}%
            </span>
          </div>
          <input
            id={`slider-${assetClass}`}
            type="range"
            min={0}
            max={100}
            value={Math.round((draft[assetClass] ?? 0) * 100)}
            onChange={(e) => handleChange(assetClass, e.target.value)}
            className="w-full"
            style={{ accentColor: 'var(--wd-lavender)' }}
          />
        </div>
      ))}

      <p className={`wd-subtle ${!isValid ? 'wd-negative' : ''}`}>
        Total: {Math.round(total * 100)}% {!isValid && '(must sum to 100%)'}
      </p>

      <button onClick={handleSave} disabled={!isValid} className="wd-btn-primary">
        Save target allocation
      </button>
    </div>
  );
}
