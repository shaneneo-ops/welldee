import { RefreshCw, Settings, LogOut, EyeOff, Eye, Filter, FilterX, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useTheme } from '../context/ThemeContext';
import { STORAGE_KEYS, DEFAULT_IBKR_PROXY_URL } from '../utils/constants';

function formatTimestamp(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Header({ onOpenSettings }) {
  const { logout } = useAuth();
  const { portfolio, syncIBKR, isSyncing, excludeCPF, toggleExcludeCPF, hideNumbers, toggleHideNumbers, forceRecalculate } = usePortfolio();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-10 border-b-2"
      style={{ borderColor: 'var(--wd-card-border)', backgroundColor: 'var(--wd-card-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl -rotate-6 inline-block" aria-hidden="true">🦄</span>
          <div>
            <h1 className="text-lg wd-heading font-semibold leading-tight" style={{ color: 'var(--wd-text-heading)' }}>
              Welldee
            </h1>
            <p className="wd-subtle">Last updated {formatTimestamp(portfolio.metadata.lastUpdated)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
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

          <button onClick={() => syncIBKR(loadedProxyUrl())} disabled={isSyncing} className="wd-btn-toggle" title="Sync IBKR account data">
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button onClick={forceRecalculate} className="wd-btn-toggle" title="Recalculate all portfolio values (fixes stale data)">
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Recalculate</span>
          </button>

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

// Proxy URL lives in localStorage (see SettingsPanel); read directly here to
// avoid threading it through every component that can trigger a sync.
function loadedProxyUrl() {
  try {
    return localStorage.getItem(STORAGE_KEYS.IBKR_PROXY_URL) ?? DEFAULT_IBKR_PROXY_URL;
  } catch {
    return DEFAULT_IBKR_PROXY_URL;
  }
}
