import { useEffect, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { collectHoldings, computeDividendCalendar, filterUpcomingWithinDays } from '../utils/calculations';
import { fetchDividendCalendar } from '../services/dividendCalendarService';
import { DIVIDEND_ALERT_WINDOW_DAYS } from '../utils/constants';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SourceBadge({ source }) {
  const isConfirmed = source === 'yahoo';
  const accent = isConfirmed ? 'var(--wd-green)' : 'var(--wd-text-faint)';
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        backgroundColor: `color-mix(in srgb, ${accent} 25%, var(--wd-card-bg))`,
        color: 'var(--wd-text-heading)',
        border: `1.5px var(--wd-border-style) ${accent}`,
      }}
    >
      {isConfirmed ? 'Confirmed' : 'Estimated'}
    </span>
  );
}

// Real market tickers get their ex-div/payment dates auto-fetched from
// Yahoo (see api/dividendCalendar.js); managed portfolios (Endowus, iFAST —
// no resolvable ticker) get a next-payment projection purely from the gap
// between their two most recent logged Dividend Log entries. One fetch per
// unique brokerage ticker, same loading/resolved/failed pattern as
// YTDBacktestCalculator.jsx, so a Yahoo outage degrades this section
// gracefully rather than blocking the page.
export default function DividendCalendar() {
  const { portfolio } = usePortfolio();
  const [holdings] = useState(() => collectHoldings(portfolio));
  const [tickers] = useState(() => [...new Set(holdings.map((h) => h.ticker))]);

  const [fetchedCalendarData, setFetchedCalendarData] = useState({});
  const [status, setStatus] = useState(() => Object.fromEntries(tickers.map((t) => [t, 'loading'])));

  useEffect(() => {
    tickers.forEach(async (ticker) => {
      const result = await fetchDividendCalendar(ticker);
      if (result.ok) {
        setFetchedCalendarData((prev) => ({ ...prev, [ticker]: result }));
        setStatus((prev) => ({ ...prev, [ticker]: 'resolved' }));
      } else {
        setStatus((prev) => ({ ...prev, [ticker]: 'failed' }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = computeDividendCalendar(portfolio, { fetchedCalendarData });
  const upcoming = filterUpcomingWithinDays(entries, DIVIDEND_ALERT_WINDOW_DAYS);
  const stillLoading = Object.values(status).some((s) => s === 'loading');

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">📅</span>
      <p className="wd-card-title mb-3">Dividend Calendar</p>

      {upcoming.length > 0 && (
        <div
          className="rounded-2xl p-3 mb-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--wd-yellow) 18%, var(--wd-card-bg))',
            border: '2px var(--wd-border-style) var(--wd-yellow)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
            {upcoming.length} payout{upcoming.length === 1 ? '' : 's'} coming up within {DIVIDEND_ALERT_WINDOW_DAYS} days
          </p>
          <ul className="mt-1 space-y-0.5">
            {upcoming.map((e) => (
              <li key={`${e.accountId}-${e.ticker ?? ''}`} className="text-sm wd-body-text">
                {e.label} — {formatDate(e.exDividendDate ?? e.paymentDate)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="wd-muted text-sm">
          {stillLoading
            ? 'Looking up ex-dividend dates…'
            : "No upcoming dividend dates found. Real market tickers are looked up automatically; managed portfolios (Endowus, iFAST) need at least 2 entries in the Dividend Log below before a projection can be made."}
        </p>
      ) : (
        <table className="wd-table w-full text-sm">
          <tbody>
            {entries.map((e) => (
              <tr key={`${e.accountId}-${e.ticker ?? ''}`} className="border-t wd-divider first:border-0">
                <td className="py-1.5 pr-3 wd-body-text">{e.label}</td>
                <td className="py-1.5 pr-3 wd-subtle whitespace-nowrap">Ex-div: {formatDate(e.exDividendDate) ?? '—'}</td>
                <td className="py-1.5 pr-3 wd-subtle whitespace-nowrap">Pay: {formatDate(e.paymentDate) ?? 'not yet announced'}</td>
                <td className="py-1.5 text-right">
                  <SourceBadge source={e.source} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
