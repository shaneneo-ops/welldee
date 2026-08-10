import { useEffect, useState } from 'react';
import { RefreshCw, Settings, LogOut, EyeOff, Eye, Filter, FilterX, Moon, Sun, Sparkles, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useTheme } from '../context/ThemeContext';
import Clock from './Clock';

function formatTimestamp(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Pulls live prices for real market tickers (Standard Chartered, DBS — no
// IBKR account is actually funded, see Settings' IBKR Connection section
// for that separate path) and refreshes the Dividend Calendar/Income
// Analytics Yahoo data. Result flashes on the button itself for a few
// seconds — this used to fail completely silently (IBKR sync with no local
// proxy running), which is exactly why it "felt broken."
function SyncButton({ syncMarketData, isSyncingPrices, priceSyncStatus }) {
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (!priceSyncStatus.syncedAt) return;
    setJustSynced(true);
    const t = setTimeout(() => setJustSynced(false), 4000);
    return () => clearTimeout(t);
  }, [priceSyncStatus.syncedAt]);

  // A "skip" isn't a failure to fix — holdings like DBS's unit trust have
  // no exchange ticker at all, so Yahoo can never look them up, permanently.
  // Styling that in alarming red/"failed" wording reads as broken when it's
  // actually expected — this is purely informational.
  const hasSkipped = priceSyncStatus.failed.length > 0;
  const title = priceSyncStatus.syncedAt
    ? `Last synced ${new Date(priceSyncStatus.syncedAt).toLocaleTimeString('en-SG')} — ${priceSyncStatus.updated} price${priceSyncStatus.updated === 1 ? '' : 's'} updated${hasSkipped ? `. Skipped (no market ticker to look up, not an error): ${priceSyncStatus.failed.join(', ')}` : ''}`
    : 'Refresh live prices for your holdings and the Dividend Calendar';

  let label = 'Sync Now';
  if (isSyncingPrices) label = 'Syncing...';
  else if (justSynced) label = hasSkipped ? `Synced ✓ (${priceSyncStatus.failed.length} skipped)` : 'Synced ✓';

  return (
    <button onClick={syncMarketData} disabled={isSyncingPrices} className="wd-btn-toggle" title={title}>
      <RefreshCw size={14} className={isSyncingPrices ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function Header({ onOpenSettings }) {
  const { logout } = useAuth();
  const { portfolio, syncMarketData, isSyncingPrices, priceSyncStatus, excludeCPF, toggleExcludeCPF, hideNumbers, toggleHideNumbers } = usePortfolio();
  const { theme, toggleTheme, themeFamily, toggleThemeFamily } = useTheme();
  const isWhimsy = themeFamily === 'whimsy';

  return (
    <header
      className="sticky top-0 z-10 border-b-2"
      style={{ borderColor: 'var(--wd-card-border)', backgroundColor: 'var(--wd-card-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isWhimsy ? (
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-2xl shrink-0"
              style={{ background: 'color-mix(in srgb, var(--wd-lavender) 20%, var(--wd-card-bg))' }}
            >
              <Sparkles size={18} style={{ color: 'var(--wd-lavender)' }} />
            </span>
          ) : (
            <span className="text-2xl -rotate-6 inline-block" aria-hidden="true">🦄</span>
          )}
          <div>
            <h1 className="text-lg wd-heading font-semibold leading-tight" style={{ color: 'var(--wd-text-heading)' }}>
              Welldee
            </h1>
            <p className="wd-subtle">Last updated {formatTimestamp(portfolio.metadata.lastUpdated)}</p>
          </div>
          {isWhimsy && (
            <div className="hidden md:block ml-4 shrink-0">
              <Clock />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={toggleThemeFamily}
            className={`wd-btn-toggle ${isWhimsy ? 'wd-btn-toggle-active' : ''}`}
            title="Toggle Doodle / Whimsy Wealth style"
          >
            {isWhimsy ? <Sparkles size={14} /> : <PenTool size={14} />}
            <span className="hidden sm:inline">{isWhimsy ? 'Whimsy' : 'Doodle'}</span>
          </button>

          <button onClick={toggleTheme} className="wd-btn-toggle" title="Toggle dark / light mode">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={toggleHideNumbers}
            className={`wd-btn-toggle ${hideNumbers ? 'wd-btn-toggle-active' : ''}`}
            title="Mask every dollar figure — for screen-sharing"
          >
            {hideNumbers ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{hideNumbers ? 'Numbers Hidden' : 'Hide Numbers'}</span>
          </button>

          <button
            onClick={toggleExcludeCPF}
            className={`wd-btn-toggle ${excludeCPF ? 'wd-btn-toggle-active' : ''}`}
            title="Exclude CPF from net worth, allocation, holdings, and rebalancing"
          >
            {excludeCPF ? <FilterX size={14} /> : <Filter size={14} />}
            <span className="hidden sm:inline">{excludeCPF ? 'CPF Excluded' : 'Exclude CPF'}</span>
          </button>

          <SyncButton syncMarketData={syncMarketData} isSyncingPrices={isSyncingPrices} priceSyncStatus={priceSyncStatus} />

          <button onClick={onOpenSettings} className="wd-btn-toggle" aria-label="Settings">
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button onClick={logout} className="wd-btn-toggle" aria-label="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
