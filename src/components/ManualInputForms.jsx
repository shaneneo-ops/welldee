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
  const { portfolio, updateAccount, upsertAccount } = usePortfolio();
  const managedAccounts = portfolio.accounts.filter((a) => a.type === 'ManagedPortfolio');
  const [selectedId, setSelectedId] = useState(managedAccounts[0]?.id ?? '');
  const account = managedAccounts.find((a) => a.id === selectedId);
  const [name, setName] = useState(account?.portfolioName ?? '');
  const [value, setValue] = useState(account?.currentValue ?? 0);
  const [costBasis, setCostBasis] = useState(account?.costBasis ?? '');
  const [yieldPct, setYieldPct] = useState(account?.dividendYieldPct ?? '');
  const [provider, setProvider] = useState(account?.provider ?? 'Endowus');
  const [saved, flash] = useSavedFlash();

  function selectAccount(id) {
    setSelectedId(id);
    const acc = managedAccounts.find((a) => a.id === id);
    setName(acc?.portfolioName ?? '');
    setValue(acc?.currentValue ?? 0);
    setCostBasis(acc?.costBasis ?? '');
    setYieldPct(acc?.dividendYieldPct ?? '');
    setProvider(acc?.provider ?? 'Endowus');
  }

  function save() {
    if (!selectedId) return;
    updateAccount(selectedId, (acc) => ({
      ...acc,
      portfolioName: name,
      currentValue: value,
      costBasis: costBasis === '' ? null : costBasis,
      dividendYieldPct: yieldPct === '' ? null : yieldPct,
      provider,
      lastUpdated: new Date().toISOString(),
    }));
    flash();
  }

  function deleteAccount() {
    if (!selectedId || !confirm('Delete this portfolio? This cannot be undone.')) return;
    updateAccount(selectedId, () => null);
    const remaining = managedAccounts.filter((a) => a.id !== selectedId);
    setSelectedId(remaining[0]?.id ?? '');
    flash();
  }

  function addNewAccount() {
    const newId = `managed-${Date.now()}`;
    upsertAccount({
      id: newId,
      type: 'ManagedPortfolio',
      provider: 'Endowus',
      portfolioName: 'New Portfolio',
      currentValue: 0,
      costBasis: null,
      dividendYieldPct: null,
      lastUpdated: new Date().toISOString(),
    });
    setSelectedId(newId);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="wd-label">Portfolio</label>
        <div className="flex gap-2">
          <select value={selectedId} onChange={(e) => selectAccount(e.target.value)} className="wd-input flex-1">
            {managedAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.provider ? `${a.provider} — ` : ''}
                {a.portfolioName ?? a.id}
              </option>
            ))}
          </select>
          {account && (
            <button onClick={deleteAccount} className="wd-btn-secondary px-3" title="Delete this portfolio">
              Delete
            </button>
          )}
        </div>
      </div>
      {account && (
        <>
          <TextField label="Portfolio Name" value={name} onChange={setName} />
          <TextField label="Provider (Endowus, iFAST, etc.)" value={provider} onChange={setProvider} />
          <NumberField label="Current Value (SGD)" value={value} onChange={setValue} />
          <NumberField label="Cost Basis / Amount Invested (optional)" value={costBasis} onChange={setCostBasis} />
          <NumberField label="Trailing Dividend Yield % (optional)" value={yieldPct} onChange={setYieldPct} />
          <p className="wd-subtle">
            Cost basis drives the P&L shown in the Holdings table. YTD dividends are estimated from yield ×
            value, not entered by hand — leave blank if unknown.
          </p>
          <SaveButton onClick={save} saved={saved} />
        </>
      )}
      <button onClick={addNewAccount} className="wd-btn-secondary w-full">
        + Add New Portfolio
      </button>
    </div>
  );
}

export function StandardCharteredForm() {
  const { portfolio, updateAccount } = usePortfolio();
  const account = portfolio.accounts.find((a) => a.type === 'Brokerage' && a.broker === 'Standard Chartered');
  const [cash, setCash] = useState(account?.cash ?? { SGD: 0, USD: 0 });
  const [holdings, setHoldings] = useState(account?.holdings ?? []);
  const [newHolding, setNewHolding] = useState({ ticker: '', shares: 0, costBasis: 0, currentPrice: 0, currency: 'SGD' });
  const [saved, flash] = useSavedFlash();

  function updateHolding(index, field, value) {
    const updated = [...holdings];
    updated[index] = { ...updated[index], [field]: value };
    setHoldings(updated);
  }

  function deleteHolding(index) {
    setHoldings(holdings.filter((_, i) => i !== index));
  }

  function addHolding() {
    if (!newHolding.ticker.trim()) return;
    setHoldings([...holdings, { ...newHolding, assetClass: 'equities', geography: '', industry: 'Unclassified', lastUpdated: new Date().toISOString() }]);
    setNewHolding({ ticker: '', shares: 0, costBasis: 0, currentPrice: 0, currency: 'SGD' });
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
            <div key={idx} className="flex gap-2 items-end text-sm border-l-2 wd-card-border pl-2">
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
                <label htmlFor={`price-${idx}`} className="wd-label text-xs">Price ({holding.currency})</label>
                <input
                  id={`price-${idx}`}
                  type="number"
                  step="0.01"
                  value={holding.currentPrice}
                  onChange={(e) => updateHolding(idx, 'currentPrice', Number(e.target.value))}
                  className="wd-input"
                />
              </div>
              <button
                onClick={() => deleteHolding(idx)}
                className="wd-btn-secondary text-xs px-2 py-1"
                title="Delete this holding"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Add new holding form */}
        <div className="mt-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--wd-card-bg-alt)', border: '2px dashed var(--wd-card-border)' }}>
          <p className="wd-label mb-2 text-xs">Add New Holding</p>
          <div className="space-y-2 text-sm">
            <input
              type="text"
              placeholder="Ticker (e.g., ES3.SG)"
              value={newHolding.ticker}
              onChange={(e) => setNewHolding({ ...newHolding, ticker: e.target.value.toUpperCase() })}
              className="wd-input"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Shares"
                value={newHolding.shares || ''}
                onChange={(e) => setNewHolding({ ...newHolding, shares: Number(e.target.value) })}
                className="wd-input"
              />
              <input
                type="number"
                placeholder="Cost basis"
                step="0.01"
                value={newHolding.costBasis || ''}
                onChange={(e) => setNewHolding({ ...newHolding, costBasis: Number(e.target.value) })}
                className="wd-input"
              />
              <input
                type="number"
                placeholder="Current price"
                step="0.01"
                value={newHolding.currentPrice || ''}
                onChange={(e) => setNewHolding({ ...newHolding, currentPrice: Number(e.target.value) })}
                className="wd-input"
              />
              <select
                value={newHolding.currency}
                onChange={(e) => setNewHolding({ ...newHolding, currency: e.target.value })}
                className="wd-input"
              >
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <button onClick={addHolding} className="wd-btn-primary w-full text-sm">
              Add Holding
            </button>
          </div>
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
