// Client for the /api/dividendHistory serverless function — this year's
// real per-share dividend payment history for a ticker. Same never-throw
// contract as historyService.js/dividendCalendarService.js: any failure
// resolves to { ok: false }, and callers simply treat that ticker as
// contributing nothing to the calculated YTD figure / calendar cadence,
// rather than failing the page.

export async function fetchDividendHistory(ticker) {
  let res;
  try {
    res = await fetch(`/api/dividendHistory?ticker=${encodeURIComponent(ticker)}`);
  } catch {
    return { ok: false, error: 'Network error reaching the dividend history lookup.' };
  }

  // Local `vite dev` has no /api routes — those only exist as Vercel
  // serverless functions — so it 200s with index.html's SPA fallback
  // instead of a real 404. A non-JSON response is always a failure here,
  // regardless of status code.
  if (!res.headers.get('content-type')?.includes('application/json')) {
    return { ok: false, error: 'Dividend history isn\'t available in this environment (needs the deployed site).' };
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body.error ?? `Lookup failed (${res.status}).` };
  }
  return { ok: true, dividends: body.dividends ?? [], resolvedTicker: body.resolvedTicker };
}
