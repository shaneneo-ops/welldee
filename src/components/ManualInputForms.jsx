import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="wd-label">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="wd-input"
      />
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div>
      <label className="wd-label">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="wd-input" />
    </div>
  );
}

function SaveButton({ onClick, saved }) {
  return (
    <button onClick={onClick} className="wd-btn-primary">
      {saved ? 'Saved ✓' : 'Save'}
    </button>
  );
}

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  return [saved, flash];
}

export function CPFForm() {
  const { portfolio, updateAccount } = usePortfolio();
  const account = portfolio.accounts.find((a) => a.type === 'CPF');
  const [balances, setBalances] = useState(account?.balances ?? { ordinary: 0, special: 0, medisave: 0 });
  const [saved, flash] = useSavedFlash();

  function save() {
    updateAccount('cpf-001', (acc) => ({
      ...(acc ?? { id: 'cpf-001', type: 'CPF' }),
      balances,
      lastUpdated: new Date().toISOString(),
    }));
    flash();
  }

  return (
    <div className="space-y-3">
      <NumberField label="Ordinary Account (SGD)" value={balances.ordinary} onChange={(v) => setBalances({ ...balances, ordinary: v })} />
      <NumberField label="Special Account (SGD)" value={balances.special} onChange={(v) => setBalances({ ...balances, special: v })} />
      <NumberField label="Medisave Account (SGD)" value={balances.medisave} onChange={(v) => setBalances({ ...balances, medisave: v })} />
      <SaveButton onClick={save} saved={saved} />
    </div>
  );
}

export function DBSForm() {
  const { portfolio, updateAccount } = usePortfolio();
  const account = portfolio.accounts.find((a) => a.type === 'Bank');
  const [cash, setCash] = useState(account?.cash ?? { SGD: 0, USD: 0 });
  const [saved, flash] = useSavedFlash();

  function save() {
    updateAccount('dbs-001', (acc) => ({
      ...(acc ?? { id: 'dbs-001', type: 'Bank' }),
      cash,
      lastUpdated: new Date().toISOString(),
    }));
    flash();
  }

  return (
    <div className="space-y-3">
      <NumberField label="SGD Cash" value={cash.SGD ?? 0} onChange={(v) => setCash({ ...cash, SGD: v })} />
      <NumberField label="USD Cash (optional)" value={cash.USD ?? 0} onChange={(v) => setCash({ ...cash, USD: v })} />
      <SaveButton onClick={save} saved={saved} />
    </div>
  );
}

// There can be several ManagedPortfolio accounts (multiple Endowus
// portfolios, iFAST, ...) — pick one to edit rather than assuming a single
// hardcoded account, which would silently create an orphaned duplicate.
export function ManagedPortfolioForm() {
  const { portfolio, updateAccount } = usePortfolio();
  const managedAccounts = portfolio.accounts.filter((a) => a.type === 'ManagedPortfolio');
  const [selectedId, setSelectedId] = useState(managedAccounts[0]?.id ?? '');
  const account = managedAccounts.find((a) => a.id === selectedId);
  const [name, setName] = useState(account?.portfolioName ?? '');
  const [value, setValue] = useState(account?.currentValue ?? 0);
  const [costBasis, setCostBasis] = useState(account?.costBasis ?? '');
  const [yieldPct, setYieldPct] = useState(account?.dividendYieldPct ?? '');
  const [saved, flash] = useSavedFlash();

  function selectAccount(id) {
    setSelectedId(id);
    const acc = managedAccounts.find((a) => a.id === id);
    setName(acc?.portfolioName ?? '');
    setValue(acc?.currentValue ?? 0);
    setCostBasis(acc?.costBasis ?? '');
    setYieldPct(acc?.dividendYieldPct ?? '');
  }

  function save() {
    if (!selectedId) return;
    updateAccount(selectedId, (acc) => ({
      ...acc,
      portfolioName: name,
      currentValue: value,
      costBasis: costBasis === '' ? null : costBasis,
      dividendYieldPct: yieldPct === '' ? null : yieldPct,
      lastUpdated: new Date().toISOString(),
    }));
    flash();
  }

  if (managedAccounts.length === 0) {
    return <p className="wd-subtle">No managed portfolios yet — add one via a spreadsheet import or screenshot.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="wd-label">Portfolio</label>
        <select value={selectedId} onChange={(e) => selectAccount(e.target.value)} className="wd-input">
          {managedAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.provider ? `${a.provider} — ` : ''}
              {a.portfolioName ?? a.id}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Portfolio Name" value={name} onChange={setName} />
      <NumberField label="Current Value (SGD)" value={value} onChange={setValue} />
      <NumberField label="Cost Basis / Amount Invested (optional)" value={costBasis} onChange={setCostBasis} />
      <NumberField label="Trailing Dividend Yield % (optional)" value={yieldPct} onChange={setYieldPct} />
      <p className="wd-subtle">
        Cost basis drives the P&L shown in the Holdings table. YTD dividends are estimated from yield ×
        value, not entered by hand — leave blank if unknown.
      </p>
      <SaveButton onClick={save} saved={saved} />
    </div>
  );
}

export function StandardCharteredForm() {
  const { portfolio, updateAccount } = usePortfolio();
  const account = portfolio.accounts.find((a) => a.type === 'Brokerage' && a.broker === 'Standard Chartered');
  const [cash, setCash] = useState(account?.cash ?? { SGD: 0, USD: 0 });
  const [holdings, setHoldings] = useState(account?.holdings ?? []);
  const [saved, flash] = useSavedFlash();

  function updateHolding(index, field, value) {
    const updated = [...holdings];
    updated[index] = { ...updated[index], [field]: value };
    setHoldings(updated);
  }

  function save() {
    if (!account) return;
    updateAccount(account.id, (acc) => ({
      ...acc,
      holdings,
      cash,
      lastUpdated: new Date().toISOString(),
    }));
    flash();
  }

  if (!account) {
    return <p className="wd-subtle">Standard Chartered account not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="wd-label mb-2">Holdings</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {holdings.map((holding, idx) => (
            <div key={idx} className="flex gap-2 items-end text-sm">
              <div className="flex-shrink-0 w-16">
                <label className="wd-label text-xs">Ticker</label>
                <div className="wd-body-text font-medium">{holding.ticker}</div>
              </div>
              <div className="flex-1">
                <label htmlFor={`shares-${idx}`} className="wd-label text-xs">Shares</label>
                <input
                  id={`shares-${idx}`}
                  type="number"
                  value={holding.shares}
                  onChange={(e) => updateHolding(idx, 'shares', Number(e.target.value))}
                  className="wd-input"
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`price-${idx}`} className="wd-label text-xs">Current Price (SGD)</label>
                <input
                  id={`price-${idx}`}
                  type="number"
                  step="0.01"
                  value={holding.currentPrice}
                  onChange={(e) => updateHolding(idx, 'currentPrice', Number(e.target.value))}
                  className="wd-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-dashed" style={{ borderColor: 'var(--wd-card-border)' }}>
        <p className="wd-label mt-4 mb-2">Cash</p>
        <NumberField label="SGD Cash" value={cash.SGD ?? 0} onChange={(v) => setCash({ ...cash, SGD: v })} />
        <NumberField label="USD Cash (optional)" value={cash.USD ?? 0} onChange={(v) => setCash({ ...cash, USD: v })} />
      </div>

      <SaveButton onClick={save} saved={saved} />
    </div>
  );
}

export function YTDBaselineForm() {
  const { portfolio, setStartOfYearValue } = usePortfolio();
  const [value, setValue] = useState(portfolio.metadata.startOfYearValueSGD ?? 0);
  const [saved, flash] = useSavedFlash();

  function save() {
    setStartOfYearValue(value);
    flash();
  }

  return (
    <div className="space-y-3">
      <p className="wd-subtle">
        Net worth (SGD) on 1 Jan this year — used to calculate the YTD Return card.
      </p>
      <NumberField label="Start-of-year Net Worth (SGD)" value={value} onChange={setValue} />
      <SaveButton onClick={save} saved={saved} />
    </div>
  );
}
