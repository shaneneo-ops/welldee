import { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import { loadJSON, saveJSON } from '../utils/storage';
import { defaultPortfolio } from '../utils/defaultPortfolio';
import { syncIBKRAccount } from '../services/ibkrService';
import { computeNetWorth } from '../utils/calculations';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [portfolio, setPortfolio] = useState(() =>
    loadJSON(STORAGE_KEYS.PORTFOLIO, defaultPortfolio)
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    loadJSON(STORAGE_KEYS.IBKR_CACHE, { source: null, syncedAt: null, error: null })
  );
  const [isSyncing, setIsSyncing] = useState(false);
  // Excludes CPF accounts from every calculation (net worth, allocation
  // chart, holdings, rebalancing) app-wide — not a display mask. See
  // computeAllocationByClass in calculations.js for where this plugs in.
  const [excludeCPF, setExcludeCPF] = useState(() => loadJSON(STORAGE_KEYS.HIDE_CPF, false));
  // Masks every dollar figure app-wide with "••••••" — a display-only
  // privacy mode for screen-sharing, unlike excludeCPF this changes nothing
  // about what's calculated, only what's rendered.
  const [hideNumbers, setHideNumbers] = useState(() => loadJSON(STORAGE_KEYS.HIDE_NUMBERS, false));

  // Persist to localStorage on every change — the app's single write path.
  useEffect(() => {
    saveJSON(STORAGE_KEYS.PORTFOLIO, portfolio);
  }, [portfolio]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.IBKR_CACHE, syncStatus);
  }, [syncStatus]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.HIDE_CPF, excludeCPF);
  }, [excludeCPF]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.HIDE_NUMBERS, hideNumbers);
  }, [hideNumbers]);

  // Auto-capture today's net worth snapshot for the Portfolio Growth chart
  // (PortfolioGrowthHero.jsx) — real history only, no backfilled/fabricated
  // points. Today's entry stays "live" (overwritten as the portfolio
  // changes); once a new calendar day starts, a fresh entry is appended and
  // yesterday's freezes. The equality check makes this idempotent, so it's
  // safe to depend on the whole `portfolio` object without looping.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const netWorthSGD = computeNetWorth(portfolio);
    const netWorthExCPFSGD = computeNetWorth(portfolio, { excludeCPF: true });

    setPortfolio((prev) => {
      const history = prev.netWorthHistory ?? [];
      const idx = history.findIndex((h) => h.date === today);
      if (idx === -1) {
        return { ...prev, netWorthHistory: [...history, { date: today, netWorthSGD, netWorthExCPFSGD }] };
      }
      const existing = history[idx];
      if (existing.netWorthSGD === netWorthSGD && existing.netWorthExCPFSGD === netWorthExCPFSGD) {
        return prev;
      }
      const updated = [...history];
      updated[idx] = { date: today, netWorthSGD, netWorthExCPFSGD };
      return { ...prev, netWorthHistory: updated };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio]);

  function toggleExcludeCPF() {
    setExcludeCPF((prev) => !prev);
  }

  function toggleHideNumbers() {
    setHideNumbers((prev) => !prev);
  }

  function updateAccount(accountId, updater) {
    setPortfolio((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, lastUpdated: new Date().toISOString() },
      accounts: prev.accounts.map((acc) => (acc.id === accountId ? updater(acc) : acc)),
    }));
  }

  function upsertAccount(account) {
    setPortfolio((prev) => {
      const exists = prev.accounts.some((a) => a.id === account.id);
      return {
        ...prev,
        metadata: { ...prev.metadata, lastUpdated: new Date().toISOString() },
        accounts: exists
          ? prev.accounts.map((a) => (a.id === account.id ? account : a))
          : [...prev.accounts, account],
      };
    });
  }

  function setTargetAllocation(targetAllocation) {
    setPortfolio((prev) => ({ ...prev, targetAllocation }));
  }

  function setStartOfYearValue(startOfYearValueSGD) {
    setPortfolio((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, startOfYearValueSGD },
    }));
  }

  function addDividendPayment(payment) {
    setPortfolio((prev) => ({
      ...prev,
      dividendPayments: [...(prev.dividendPayments ?? []), { id: `div-${Date.now()}`, ...payment }],
    }));
  }

  function deleteDividendPayment(id) {
    setPortfolio((prev) => ({
      ...prev,
      dividendPayments: (prev.dividendPayments ?? []).filter((p) => p.id !== id),
    }));
  }

  // Audit trail for the Tier 2 rebalancing governance flow — see
  // RebalancingHistory.jsx and defaultPortfolio.js's rebalancingHistory doc
  // comment for the entry shape.
  function addRebalancingHistoryEntry(entry) {
    setPortfolio((prev) => ({
      ...prev,
      rebalancingHistory: [...(prev.rebalancingHistory ?? []), { id: `rebal-${Date.now()}`, ...entry }],
    }));
  }

  function updateRebalancingHistoryEntry(id, updater) {
    setPortfolio((prev) => ({
      ...prev,
      rebalancingHistory: (prev.rebalancingHistory ?? []).map((e) => (e.id === id ? updater(e) : e)),
    }));
  }

  function deleteRebalancingHistoryEntry(id) {
    setPortfolio((prev) => ({
      ...prev,
      rebalancingHistory: (prev.rebalancingHistory ?? []).filter((e) => e.id !== id),
    }));
  }

  // Cowork (Phase 2): this is the function to call on a nightly schedule for
  // automated IBKR refresh — see README "Sync strategy".
  async function syncIBKR(proxyUrl) {
    setIsSyncing(true);
    try {
      const existing = portfolio.accounts.find((a) => a.id === 'ibkr-001');
      const { account, source, syncedAt } = await syncIBKRAccount({
        proxyUrl,
        brokerAccountId: existing?.brokerAccountId,
      });
      upsertAccount(account);
      setSyncStatus({ source, syncedAt, error: null });
    } catch (err) {
      console.error('IBKR sync failed:', err);
      setSyncStatus((prev) => ({ ...prev, error: err.message }));
    } finally {
      setIsSyncing(false);
    }
  }

  function importPortfolio(newPortfolio) {
    setPortfolio({
      ...newPortfolio,
      metadata: { ...newPortfolio.metadata, lastUpdated: new Date().toISOString() },
    });
  }

  // Lets YTDBacktestCalculator survive unmount/refresh with whatever the
  // user has typed so far, instead of resetting to auto-fetch/current-value
  // defaults every time the panel reopens.
  function setYTDBacktestInputs(inputs) {
    setPortfolio((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ytdBacktestInputs: inputs },
    }));
  }

  async function copyPortfolioToClipboard() {
    try {
      const data = JSON.stringify(portfolio, null, 2);
      await navigator.clipboard.writeText(data);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }

  // Shared by the one-click clipboard paste and the manual textarea fallback
  // below (some browser/webview contexts block programmatic clipboard reads
  // — e.g. cross-app OS clipboard access from a sandboxed in-app browser —
  // even though a normal Cmd+V into a focused textarea always works there).
  function importPortfolioFromText(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: 'That text isn\'t valid JSON.' };
    }
    if (!data.accounts || !data.metadata) {
      return { ok: false, error: 'That JSON doesn\'t look like a Welldee portfolio export (missing accounts/metadata).' };
    }
    importPortfolio(data);
    return { ok: true };
  }

  async function pastePortfolioFromClipboard() {
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      return { ok: false, error: 'This browser blocked reading the clipboard — use "Paste manually" below instead.' };
    }
    return importPortfolioFromText(text);
  }

  return (
    <PortfolioContext.Provider
      value={{
        portfolio,
        updateAccount,
        upsertAccount,
        setTargetAllocation,
        setStartOfYearValue,
        addDividendPayment,
        deleteDividendPayment,
        addRebalancingHistoryEntry,
        updateRebalancingHistoryEntry,
        deleteRebalancingHistoryEntry,
        syncIBKR,
        isSyncing,
        syncStatus,
        excludeCPF,
        toggleExcludeCPF,
        hideNumbers,
        toggleHideNumbers,
        importPortfolio,
        importPortfolioFromText,
        setYTDBacktestInputs,
        copyPortfolioToClipboard,
        pastePortfolioFromClipboard,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
