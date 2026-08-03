import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { computeDividendPayments } from '../utils/calculations';
import { FX_RATES } from '../utils/constants';

function formatMoney(amount, currency, hideNumbers = false) {
  if (hideNumbers) return '••••••';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

// One selectable "source" per brokerage holding, plus one per
// ManagedPortfolio account (Endowus, iFAST, ... — no individual tickers).
// `ticker` is null for the latter so computeDividendPayments/DividendLog
// entries stay consistent with the dividendPayments schema in
// defaultPortfolio.js.
function sourceOptions(portfolio) {
  const options = [];
  for (const account of portfolio.accounts) {
    if (account.type === 'Brokerage') {
      for (const holding of account.holdings ?? []) {
        options.push({
          value: `${account.id}|${holding.ticker}`,
          label: `${account.broker ?? account.id} — ${holding.ticker}`,
          accountId: account.id,
          ticker: holding.ticker,
          currency: holding.currency,
        });
      }
    }
    if (account.type === 'ManagedPortfolio') {
      options.push({
        value: `${account.id}|`,
        label: `${account.provider ? account.provider + ' — ' : ''}${account.portfolioName ?? account.id}`,
        accountId: account.id,
        ticker: null,
        currency: account.currency ?? 'SGD',
      });
    }
  }
  return options;
}

export default function DividendLog() {
  const { portfolio, addDividendPayment, deleteDividendPayment, hideNumbers } = usePortfolio();
  const options = sourceOptions(portfolio);
  const [selected, setSelected] = useState(options[0]?.value ?? '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(options[0]?.currency ?? 'SGD');

  const { totalSGD, entries } = computeDividendPayments(portfolio);

  function handleSelect(value) {
    setSelected(value);
    const opt = options.find((o) => o.value === value);
    if (opt) setCurrency(opt.currency);
  }

  function add() {
    const opt = options.find((o) => o.value === selected);
    if (!opt || amount === '' || !date) return;
    addDividendPayment({
      date,
      accountId: opt.accountId,
      ticker: opt.ticker,
      label: opt.label,
      amount: Number(amount),
      currency,
    });
    setAmount('');
  }

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">💰</span>
      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="wd-card-title">Dividend Log</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
          {formatMoney(totalSGD, 'SGD', hideNumbers)} received this year
        </p>
      </div>

      {options.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <select
            value={selected}
            onChange={(e) => handleSelect(e.target.value)}
            className="wd-input col-span-2 sm:col-span-2"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="wd-input" />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="wd-input"
          />
          <div className="flex gap-2">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="wd-input">
              {Object.keys(FX_RATES).map((ccy) => (
                <option key={ccy} value={ccy}>
                  {ccy}
                </option>
              ))}
            </select>
            <button onClick={add} className="wd-btn-primary px-3 whitespace-nowrap">
              Add
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="wd-muted text-sm">No dividends logged yet this year.</p>
      ) : (
        <table className="wd-table w-full text-sm">
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t wd-divider first:border-0">
                <td className="py-1.5 pr-3 wd-muted">{e.date}</td>
                <td className="py-1.5 pr-3 wd-body-text">{e.label}</td>
                <td className="py-1.5 pr-3" style={{ color: 'var(--wd-text-heading)' }}>{formatMoney(e.amount, e.currency, hideNumbers)}</td>
                <td className="py-1.5 pr-3 wd-subtle">{formatMoney(e.amountSGD, 'SGD', hideNumbers)}</td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => deleteDividendPayment(e.id)}
                    className="wd-muted hover:opacity-100"
                    style={{ opacity: 0.6 }}
                    aria-label="Delete dividend entry"
                    onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--wd-negative)')}
                    onMouseLeave={(ev) => (ev.currentTarget.style.color = '')}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
