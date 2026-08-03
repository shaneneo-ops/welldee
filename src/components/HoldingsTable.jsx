import { Fragment } from 'react';
import { X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import {
  collectHoldings,
  toSGD,
  managedPortfolioUnrealizedPnL,
  filterPortfolioByIndustry,
} from '../utils/calculations';

function formatMoney(amount, currency = 'SGD', hideNumbers = false) {
  if (hideNumbers) return '••••••';
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTicker(ticker, hideNumbers) {
  if (hideNumbers) return '••••';
  return ticker;
}

function formatShares(shares, hideNumbers) {
  if (hideNumbers) return '•••';
  return shares ?? '—';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SG', { dateStyle: 'medium' });
}

function pnlColor(value) {
  if (value == null) return 'wd-muted';
  return value >= 0 ? 'wd-positive' : 'wd-negative';
}

// Weighted P&L% across a set of rows — pnlSGD summed over costBasisSGD
// summed, not an average of each row's own %, since rows can be wildly
// different sizes (a 5-figure StanChart position next to a small one).
function weightedPnLPct(rows) {
  const withCostBasis = rows.filter((r) => r.costBasisSGD != null);
  if (withCostBasis.length === 0) return null;
  const costBasisSGD = withCostBasis.reduce((sum, r) => sum + r.costBasisSGD, 0);
  const pnlSGD = withCostBasis.reduce((sum, r) => sum + (r.pnlSGD ?? 0), 0);
  return costBasisSGD > 0 ? pnlSGD / costBasisSGD : null;
}

function sumPnLSGD(rows) {
  const known = rows.filter((r) => r.pnlSGD != null);
  if (known.length === 0) return null;
  return known.reduce((sum, r) => sum + r.pnlSGD, 0);
}

// One group per account. Brokerage accounts get one row per holding plus a
// synthetic "Cash" row for any uninvested balance — answering "where did my
// cash go" directly in the table rather than only folding it into the
// allocation pie's Cash %. `portfolio` here is already the post-filter view
// (excludeCPF / industryFilter are applied by the caller via
// filterPortfolioByIndustry before this runs), so this stays a plain
// unconditional builder.
function buildGroups(portfolio) {
  const allHoldings = collectHoldings(portfolio);
  const groups = [];
  let endowusRows = [];

  for (const account of portfolio.accounts) {
    if (account.type === 'Brokerage') {
      const rows = allHoldings
        .filter((h) => h.accountId === account.id)
        .map((h) => ({
          key: `${h.accountId}-${h.ticker}`,
          kind: 'holding',
          ticker: h.ticker,
          shares: h.shares,
          costBasis: h.costBasis,
          currentPrice: h.currentPrice,
          currency: h.currency,
          valueSGD: h.currentValueSGD,
          pnlNative: h.unrealizedPnL,
          pnlPctNative: h.unrealizedPnLPct,
          pnlSGD: h.unrealizedPnL != null ? toSGD(h.unrealizedPnL, h.currency) : null,
          costBasisSGD: h.costBasis != null ? toSGD(h.costBasis * h.shares, h.currency) : null,
          lastUpdated: h.lastUpdated,
        }));

      const cashEntries = Object.entries(account.cash ?? {}).filter(([, amt]) => amt);
      if (cashEntries.length > 0) {
        rows.push({
          key: `${account.id}-cash`,
          kind: 'cash',
          ticker: 'Cash (awaiting deployment)',
          detail: cashEntries.map(([ccy, amt]) => `${ccy} ${amt.toLocaleString()}`).join(' + '),
          valueSGD: cashEntries.reduce((sum, [ccy, amt]) => sum + toSGD(amt, ccy), 0),
          pnlSGD: null,
          costBasisSGD: null,
          lastUpdated: account.lastUpdated,
        });
      }

      groups.push({ id: account.id, label: account.broker ?? account.id, style: 'brokerage', rows });
    }

    if (account.type === 'CPF') {
      const { ordinary = 0, special = 0, medisave = 0 } = account.balances ?? {};
      groups.push({
        id: account.id,
        label: 'CPF',
        style: 'summary',
        rows: [
          { key: `${account.id}-oa`, label: 'CPF — Ordinary Account', valueSGD: ordinary, pnlSGD: null, costBasisSGD: null, lastUpdated: account.lastUpdated },
          { key: `${account.id}-sa`, label: 'CPF — Special Account', valueSGD: special, pnlSGD: null, costBasisSGD: null, lastUpdated: account.lastUpdated },
          { key: `${account.id}-ma`, label: 'CPF — Medisave Account', valueSGD: medisave, pnlSGD: null, costBasisSGD: null, lastUpdated: account.lastUpdated },
        ],
      });
    }

    if (account.type === 'Bank') {
      const valueSGD = Object.entries(account.cash ?? {}).reduce((sum, [ccy, amt]) => sum + toSGD(amt, ccy), 0);
      groups.push({
        id: account.id,
        label: 'DBS Cash',
        style: 'summary',
        rows: [{ key: account.id, label: 'DBS Cash', valueSGD, pnlSGD: null, costBasisSGD: null, lastUpdated: account.lastUpdated }],
      });
    }

    if (account.type === 'ManagedPortfolio') {
      const valueSGD = toSGD(account.currentValue ?? 0, account.currency ?? 'SGD');
      const label = `${account.provider ? account.provider + ' — ' : ''}${account.portfolioName ?? account.id}`;
      const row = {
        key: account.id,
        label,
        valueSGD,
        pnlSGD: managedPortfolioUnrealizedPnL(account),
        costBasisSGD: account.costBasis != null ? toSGD(account.costBasis, account.currency ?? 'SGD') : null,
        lastUpdated: account.lastUpdated,
      };

      // Group all Endowus accounts together
      if (account.provider === 'Endowus') {
        endowusRows.push(row);
      } else {
        // Non-Endowus ManagedPortfolio accounts stay as individual groups
        groups.push({
          id: account.id,
          label,
          style: 'summary',
          rows: [row],
        });
      }
    }
  }

  // Add Endowus group if it has any rows
  if (endowusRows.length > 0) {
    groups.push({
      id: 'endowus-group',
      label: 'Endowus',
      style: 'summary',
      rows: endowusRows,
    });
  }

  return groups;
}

export default function HoldingsTable({ industryFilter, onClearIndustryFilter }) {
  const { portfolio, excludeCPF, hideNumbers } = usePortfolio();
  let effectivePortfolio = portfolio;
  if (excludeCPF) {
    effectivePortfolio = { ...effectivePortfolio, accounts: effectivePortfolio.accounts.filter((a) => a.type !== 'CPF') };
  }
  if (industryFilter) {
    effectivePortfolio = filterPortfolioByIndustry(effectivePortfolio, industryFilter);
  }
  const groups = buildGroups(effectivePortfolio);

  const allRows = groups.flatMap((g) => g.rows);
  const grandTotalValueSGD = allRows.reduce((sum, r) => sum + r.valueSGD, 0);
  const grandTotalPnLSGD = sumPnLSGD(allRows);
  const grandTotalPnLPct = weightedPnLPct(allRows);

  return (
    <div className="wd-card overflow-x-auto">
      <span className="wd-emoji-badge" aria-hidden="true">📋</span>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="wd-card-title">Holdings</p>
        <div className="flex items-center gap-3">
          {industryFilter && (
            <button onClick={onClearIndustryFilter} className="wd-badge">
              Filtered by: {industryFilter}
              <X size={12} />
            </button>
          )}
          {excludeCPF && <p className="wd-subtle">CPF excluded — toggle in the header to include it</p>}
        </div>
      </div>
      <table className="wd-table w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left border-b-2 wd-divider">
            <th className="pb-2 pr-3">Account</th>
            <th className="pb-2 pr-3">Ticker</th>
            <th className="pb-2 pr-3">Shares</th>
            <th className="pb-2 pr-3">Cost Basis</th>
            <th className="pb-2 pr-3">Price</th>
            <th className="pb-2 pr-3">Value (SGD)</th>
            <th className="pb-2 pr-3">Unrealized P&L</th>
            <th className="pb-2 pr-3">P&L %</th>
            <th className="pb-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 && (
            <tr>
              <td colSpan={9} className="py-6 text-center wd-muted">
                No positions
              </td>
            </tr>
          )}
          {groups.map((g) => {
            const showSubtotal = g.rows.length > 1;
            const subtotalPnL = showSubtotal ? sumPnLSGD(g.rows) : null;
            const subtotalPnLPct = showSubtotal ? weightedPnLPct(g.rows) : null;
            const subtotalValueSGD = showSubtotal ? g.rows.reduce((sum, r) => sum + r.valueSGD, 0) : null;

            return (
              <Fragment key={g.id}>
                {g.rows.map((r) =>
                  g.style === 'brokerage' ? (
                    <tr key={r.key} className="border-b wd-divider last:border-0">
                      <td className="py-2 pr-3 wd-muted">{g.label}</td>
                      <td className="py-2 pr-3 font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
                        {r.kind === 'cash' ? r.ticker : formatTicker(r.ticker, hideNumbers)}
                        {r.kind === 'cash' && <span className="block text-xs font-normal wd-subtle">{hideNumbers ? '••••••' : r.detail}</span>}
                      </td>
                      <td className="py-2 pr-3">{r.kind === 'cash' ? '—' : formatShares(r.shares, hideNumbers)}</td>
                      <td className="py-2 pr-3">
                        {r.costBasis != null ? formatMoney(r.costBasis, r.currency, hideNumbers) : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {r.currentPrice != null ? formatMoney(r.currentPrice, r.currency, hideNumbers) : '—'}
                      </td>
                      <td className="py-2 pr-3 font-medium" style={{ color: 'var(--wd-text-heading)' }}>{formatMoney(r.valueSGD, 'SGD', hideNumbers)}</td>
                      <td className={`py-2 pr-3 font-medium ${pnlColor(r.pnlNative ?? r.pnlSGD)}`}>
                        {r.kind === 'cash' ? '—' : r.pnlNative != null ? formatMoney(r.pnlNative, r.currency, hideNumbers) : '—'}
                      </td>
                      <td className={`py-2 pr-3 font-medium ${pnlColor(r.pnlPctNative)}`}>
                        {r.kind === 'cash' ? '—' : r.pnlPctNative != null ? `${(r.pnlPctNative * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 wd-subtle">{formatDate(r.lastUpdated)}</td>
                    </tr>
                  ) : (
                    <tr key={r.key} className="border-b wd-divider last:border-0 wd-row-alt">
                      <td className="py-2 pr-3 font-semibold" style={{ color: 'var(--wd-text-heading)' }} colSpan={5}>
                        {r.label}
                      </td>
                      <td className="py-2 pr-3 font-medium" style={{ color: 'var(--wd-text-heading)' }}>{formatMoney(r.valueSGD, 'SGD', hideNumbers)}</td>
                      <td className={`py-2 pr-3 font-medium ${pnlColor(r.pnlSGD)}`}>
                        {r.pnlSGD != null ? formatMoney(r.pnlSGD, 'SGD', hideNumbers) : '—'}
                      </td>
                      <td className={`py-2 pr-3 font-medium ${pnlColor(r.costBasisSGD ? r.pnlSGD / r.costBasisSGD : null)}`}>
                        {r.pnlSGD != null && r.costBasisSGD ? `${((r.pnlSGD / r.costBasisSGD) * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 wd-subtle">{formatDate(r.lastUpdated)}</td>
                    </tr>
                  )
                )}
                {showSubtotal && (
                  <tr key={`${g.id}-subtotal`} className="wd-subtotal-row font-semibold">
                    <td className="py-2 pr-3" colSpan={5}>
                      {g.label} Subtotal
                    </td>
                    <td className="py-2 pr-3">{formatMoney(subtotalValueSGD, 'SGD', hideNumbers)}</td>
                    <td className={`py-2 pr-3 ${pnlColor(subtotalPnL)}`}>
                      {subtotalPnL != null ? formatMoney(subtotalPnL, 'SGD', hideNumbers) : '—'}
                    </td>
                    <td className={`py-2 pr-3 ${pnlColor(subtotalPnLPct)}`}>
                      {subtotalPnLPct != null ? `${(subtotalPnLPct * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2"></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {groups.length > 0 && (
            <tr className="wd-grandtotal-row font-semibold">
              <td className="py-2.5 pr-3" colSpan={5}>
                Grand Total
              </td>
              <td className="py-2.5 pr-3">{formatMoney(grandTotalValueSGD, 'SGD', hideNumbers)}</td>
              <td className={`py-2.5 pr-3 ${pnlColor(grandTotalPnLSGD)}`}>
                {grandTotalPnLSGD != null ? formatMoney(grandTotalPnLSGD, 'SGD', hideNumbers) : '—'}
              </td>
              <td className={`py-2.5 pr-3 ${pnlColor(grandTotalPnLPct)}`}>
                {grandTotalPnLPct != null ? `${(grandTotalPnLPct * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
