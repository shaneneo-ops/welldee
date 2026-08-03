import { useEffect, useState, useRef } from 'react';
import { X, Info, Download, Upload, FileJson } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { STORAGE_KEYS, DEFAULT_IBKR_PROXY_URL } from '../utils/constants';
import { exportPortfolioToCSV, exportPortfolioToPDF, importPortfolioFromCSV } from '../utils/calculations';
import TargetAllocationForm from './TargetAllocationForm';
import { CPFForm, DBSForm, StandardCharteredForm, ManagedPortfolioForm, YTDBaselineForm } from './ManualInputForms';

function Section({ title, children }) {
  return (
    <section className="border-t-2 wd-divider pt-5 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold mb-3 wd-heading" style={{ color: 'var(--wd-text-heading)' }}>{title}</h3>
      {children}
    </section>
  );
}

function InfoBox({ children }) {
  return (
    <div
      className="flex items-start gap-2 rounded-2xl p-3 text-xs wd-muted"
      style={{ backgroundColor: 'var(--wd-card-bg-alt)', border: '2px dashed var(--wd-card-border)' }}
    >
      <Info size={14} className="shrink-0 mt-0.5" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// Plain string, not JSON — read/written with raw localStorage calls (same as
// Header.jsx, which reads this key directly to trigger a sync) rather than
// the loadJSON/saveJSON wrapper used elsewhere, to avoid a stray JSON-quote
// mismatch breaking the URL.
function IBKRConnectionForm() {
  const [proxyUrl, setProxyUrl] = useState(
    () => localStorage.getItem(STORAGE_KEYS.IBKR_PROXY_URL) ?? DEFAULT_IBKR_PROXY_URL
  );
  const [saved, setSaved] = useState(false);
  const { syncStatus } = usePortfolio();

  function save() {
    localStorage.setItem(STORAGE_KEYS.IBKR_PROXY_URL, proxyUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      <InfoBox>
        <p>IBKR has no simple API key for retail accounts — real sync needs two things running locally:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>IBKR's Client Portal Gateway, logged in at https://localhost:5000</li>
          <li>This app's proxy: <code className="px-1 rounded" style={{ backgroundColor: 'var(--wd-card-bg)' }}>npm run server</code></li>
        </ol>
        <p>Then hit Sync Now. See README "IBKR setup" for details.</p>
      </InfoBox>
      <div>
        <label className="wd-label">Proxy URL</label>
        <input
          type="text"
          value={proxyUrl}
          onChange={(e) => setProxyUrl(e.target.value)}
          placeholder={DEFAULT_IBKR_PROXY_URL}
          className="wd-input"
        />
      </div>
      <button onClick={save} className="wd-btn-primary">
        {saved ? 'Saved ✓' : 'Save proxy URL'}
      </button>

      <div className="wd-subtle pt-1">
        <p>
          Sync status: <span className="font-medium wd-muted">{syncStatus.source ?? 'not synced'}</span>
        </p>
        {syncStatus.syncedAt && (
          <p>Last sync: {new Date(syncStatus.syncedAt).toLocaleString('en-SG')}</p>
        )}
        {syncStatus.error && <p className="wd-negative">Error: {syncStatus.error}</p>}
      </div>
    </div>
  );
}

// Sync portfolio data across browsers/devices via clipboard.
function ClipboardSyncForm() {
  const { copyPortfolioToClipboard, pastePortfolioFromClipboard } = usePortfolio();
  const [copyMessage, setCopyMessage] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');

  async function handleCopy() {
    const success = await copyPortfolioToClipboard();
    if (success) {
      setCopyMessage('Portfolio copied to clipboard ✓');
      setTimeout(() => setCopyMessage(''), 3000);
    } else {
      setCopyMessage('Failed to copy — check browser permissions');
      setTimeout(() => setCopyMessage(''), 3000);
    }
  }

  async function handlePaste() {
    const success = await pastePortfolioFromClipboard();
    if (success) {
      setPasteMessage('Portfolio pasted ✓ — page will reload');
      setTimeout(() => location.reload(), 1500);
    } else {
      setPasteMessage('Failed to paste — clipboard may not contain valid portfolio data');
      setTimeout(() => setPasteMessage(''), 3000);
    }
  }

  return (
    <div className="space-y-3">
      <InfoBox>
        <p>Sync portfolio data across browsers (Chrome, Safari, etc.) on the same device using clipboard.</p>
        <ol className="list-decimal list-inside space-y-0.5 text-xs mt-1">
          <li>Copy portfolio from this browser</li>
          <li>Switch to another browser</li>
          <li>Paste portfolio to sync</li>
        </ol>
      </InfoBox>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleCopy} className="wd-btn-primary flex items-center justify-center gap-2">
          <Download size={14} />
          <span>Copy</span>
        </button>
        <button onClick={handlePaste} className="wd-btn-primary flex items-center justify-center gap-2">
          <Upload size={14} />
          <span>Paste</span>
        </button>
      </div>

      {copyMessage && <p className="wd-subtle">{copyMessage}</p>}
      {pasteMessage && <p className="wd-subtle">{pasteMessage}</p>}
    </div>
  );
}

// CSV/PDF export and import for portfolio backup and external editing.
function PortfolioCSVForm() {
  const { portfolio, importPortfolio } = usePortfolio();
  const [exportMessage, setExportMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);
  const fileInputRef = useRef(null);

  function handleExportCSV() {
    try {
      const csv = exportPortfolioToCSV(portfolio);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `welldee-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      setExportMessage('CSV exported ✓');
      setTimeout(() => setExportMessage(''), 2000);
    } catch (err) {
      setExportMessage(`Error: ${err.message}`);
      setTimeout(() => setExportMessage(''), 3000);
    }
  }

  async function handleExportPDF() {
    setExportingPDF(true);
    try {
      const doc = await exportPortfolioToPDF(portfolio);
      doc.save(`welldee-portfolio-${new Date().toISOString().split('T')[0]}.pdf`);
      setExportMessage('PDF exported ✓');
      setTimeout(() => setExportMessage(''), 2000);
    } catch (err) {
      setExportMessage(`Error: ${err.message}`);
      setTimeout(() => setExportMessage(''), 3000);
    } finally {
      setExportingPDF(false);
    }
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const imported = importPortfolioFromCSV(csv);
        importPortfolio(imported);
        setImportMessage('Imported ✓ — page will reload');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        setImportMessage(`Error: ${err.message}`);
        setTimeout(() => setImportMessage(''), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      <InfoBox>
        <p>Export to CSV for backup, auditing, or external editing. Edit the file and re-import to update your portfolio.</p>
      </InfoBox>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleExportCSV} className="wd-btn-primary flex items-center justify-center gap-2" title="Download as CSV">
          <Download size={14} />
          <span className="hidden sm:inline">CSV</span>
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exportingPDF}
          className="wd-btn-primary flex items-center justify-center gap-2"
          title="Download as PDF"
        >
          <FileJson size={14} />
          <span className="hidden sm:inline">PDF</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="wd-btn-secondary flex items-center justify-center gap-2"
          title="Upload CSV file"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImport}
          style={{ display: 'none' }}
          aria-label="Import CSV file"
        />
      </div>

      {exportMessage && <p className="wd-subtle">{exportMessage}</p>}
      {importMessage && <p className="wd-subtle">{importMessage}</p>}
    </div>
  );
}

export default function SettingsPanel({ onClose }) {
  // Lock background scroll while the drawer is open — standard modal UX.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full shadow-xl overflow-y-auto"
        style={{ backgroundColor: 'var(--wd-bg)', borderLeft: '2px dashed var(--wd-card-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b-2 wd-divider sticky top-0 z-10"
          style={{ backgroundColor: 'var(--wd-bg)' }}
        >
          <h2 className="text-base wd-heading font-semibold flex items-center gap-2" style={{ color: 'var(--wd-text-heading)' }}>
            <span aria-hidden="true">⚙️🦄</span> Settings
          </h2>
          <button onClick={onClose} className="wd-muted hover:opacity-70" aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <Section title="Target Allocation">
            <TargetAllocationForm />
          </Section>

          <Section title="IBKR Connection">
            <IBKRConnectionForm />
          </Section>

          <Section title="CPF Balances">
            <CPFForm />
          </Section>

          <Section title="DBS Cash">
            <DBSForm />
          </Section>

          <Section title="Standard Chartered Holdings & Cash">
            <StandardCharteredForm />
          </Section>

          <Section title="Managed Portfolios (Endowus, iFAST, ...)">
            <ManagedPortfolioForm />
          </Section>

          <Section title="YTD Return Baseline">
            <YTDBaselineForm />
          </Section>

          <Section title="Sync Across Browsers">
            <ClipboardSyncForm />
          </Section>

          <Section title="Portfolio Backup & Export">
            <PortfolioCSVForm />
          </Section>
        </div>
      </div>
    </div>
  );
}
