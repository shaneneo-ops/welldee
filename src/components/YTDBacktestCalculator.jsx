import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { collectHoldings, accountCurrentValueSGD, computeBacktestedNetWorthSGD } from '../utils/calculations';
import { fetchHistoricalPrice } from '../services/historyService';

function currentYearJan1() {
  return `${new Date().getFullYear()}-01-01`;
}

function accountLabel(account) {
  if (account.type === 'CPF') return 'CPF';
  if (account.type === 'Bank') return account.broker ?? 'Bank Cash';
  if (account.type === 'ManagedPortfolio') {
    return `${account.provider ? account.provider + ' — ' : ''}${account.portfolioName ?? account.id}`;
  }
  return account.id;
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(n);
}

// "Same shares, back-dated price" — not a reconstruction of actual trades
// during the year. Ticker prices are auto-fetched via /api/history (Yahoo's
// public chart data); anything without a real market ticker (CPF, bank
// cash, managed portfolios, unit trusts) always needs a manual value, and
// any ticker lookup that fails (thin/delisted/obscure) degrades to the same
// manual field rather than blocking the rest.
export default function YTDBacktestCalculator() {
  const { portfolio, setStartOfYearValue } = usePortfolio();
  const [holdings] = useState(() => collectHoldings(portfolio));
  const [nonTickerAccounts] = useState(() => portfolio.accounts.filter((a) => a.type !== 'Brokerage'));

  const [holdingRows, setHoldingRows] = useState(() =>
    Object.fromEntries(holdings.map((h) => [`${h.accountId}::${h.ticker}`, { status: 'loading', price: '' }]))
  );
  const [accountRows, setAccountRows] = useState(() =>
    Object.fromEntries(nonTickerAccounts.map((a) => [a.id, String(accountCurrentValueSGD(a))]))
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const jan1 = currentYearJan1();
    holdings.forEach(async (h) => {
      const key = `${h.accountId}::${h.ticker}`;
      const result = await fetchHistoricalPrice(h.ticker, jan1);
      setHoldingRows((prev) => ({
        ...prev,
        [key]: result.ok
          ? { status: 'resolved', price: String(result.price) }
          : { status: 'failed', price: '', error: result.error },
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateHoldingPrice(key, value) {
    setHoldingRows((prev) => ({ ...prev, [key]: { ...prev[key], status: 'manual', price: value } }));
  }

  function updateAccountValue(id, value) {
    setAccountRows((prev) => ({ ...prev, [id]: value }));
  }

  const holdingPrices = {};
  for (const [key, row] of Object.entries(holdingRows)) {
    if (row.price !== '' && row.price != null) holdingPrices[key] = Number(row.price);
  }
  const accountValues = {};
  for (const [id, val] of Object.entries(accountRows)) {
    if (val !== '' && val != null) accountValues[id] = Number(val);
  }

  const missingCount =
    holdings.filter((h) => holdingPrices[`${h.accountId}::${h.ticker}`] == null).length +
    nonTickerAccounts.filter((a) => accountValues[a.id] == null).length;

  const total = computeBacktestedNetWorthSGD(portfolio, { holdingPrices, accountValues });

  function handleUse() {
    setStartOfYearValue(total);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-4">
      <p className="wd-subtle">
        Estimates your Jan 1 net worth by pricing today's exact shares/balances back on that date — it does
        not account for buys or sells during the year. Only real market tickers can be auto-fetched; everything
        else (CPF, bank cash, managed portfolios, unit trusts) is pre-filled with today's value for you to adjust.
      </p>

      <div className="space-y-2">
        <p className="wd-label mb-0">Brokerage holdings</p>
        {holdings.map((h) => {
          const key = `${h.accountId}::${h.ticker}`;
          const row = holdingRows[key];
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <div className="w-24 shrink-0 font-medium truncate" style={{ color: 'var(--wd-text-heading)' }} title={h.ticker}>
                {h.ticker}
              </div>
              <div className="w-16 shrink-0 wd-subtle truncate" title={`${h.shares} shares`}>
                {h.shares} sh
              </div>
              <input
                type="number"
                step="0.0001"
                value={row.price}
                onChange={(e) => updateHoldingPrice(key, e.target.value)}
                placeholder={row.status === 'loading' ? 'Looking up…' : 'Enter price'}
                disabled={row.status === 'loading'}
                className="wd-input flex-1"
              />
              <div className="w-9 shrink-0 wd-subtle">{h.currency}</div>
              <div className="w-5 shrink-0 flex justify-center" title={row.status === 'failed' ? row.error : undefined}>
                {row.status === 'loading' && <Loader2 size={14} className="animate-spin wd-muted" />}
                {row.status === 'resolved' && <CheckCircle2 size={14} className="wd-positive" />}
                {row.status === 'failed' && <AlertCircle size={14} className="wd-negative" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="wd-label mb-0">Other accounts (no market ticker — enter manually)</p>
        {nonTickerAccounts.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <div className="flex-1 truncate" style={{ color: 'var(--wd-text-heading)' }} title={accountLabel(a)}>
              {accountLabel(a)}
            </div>
            <input
              type="number"
              step="0.01"
              value={accountRows[a.id]}
              onChange={(e) => updateAccountValue(a.id, e.target.value)}
              className="wd-input w-40"
            />
          </div>
        ))}
      </div>

      <div className="pt-2 border-t wd-divider flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="wd-subtle mb-0.5">Estimated Jan 1 net worth</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
            {formatMoney(total)}
          </p>
          {missingCount > 0 && (
            <p className="wd-subtle" style={{ color: 'var(--wd-negative)' }}>
              {missingCount} row{missingCount === 1 ? '' : 's'} still {missingCount === 1 ? 'needs' : 'need'} a price
            </p>
          )}
        </div>
        <button onClick={handleUse} disabled={missingCount > 0} className="wd-btn-primary w-auto px-4">
          {saved ? 'Saved ✓' : 'Use as YTD baseline'}
        </button>
      </div>
    </div>
  );
}
