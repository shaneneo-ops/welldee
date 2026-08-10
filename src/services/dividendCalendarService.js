// Client for the /api/dividendCalendar serverless function — ex-dividend
// date, payment date, and trailing dividend rate/yield lookup, used only by
// the Dividend Calendar. Same never-throw contract as historyService.js:
// any failure resolves to { ok: false }, and callers fall back to a
// cadence-derived projection or omit the row, rather than failing the page.

export async function fetchDividendCalendar(ticker) {
  let res;
  try {
    res = await fetch(`/api/dividendCalendar?ticker=${encodeURIComponent(ticker)}`);
  } catch {
    return { ok: false, error: 'Network error reaching the dividend data lookup.' };
  }

  // Local `vite dev` has no /api routes — those only exist as Vercel
  // serverless functions — so it 200s with index.html's SPA fallback
  // instead of a real 404. A non-JSON response is always a failure here,
  // regardless of status code.
  if (!res.headers.get('content-type')?.includes('application/json')) {
    return { ok: false, error: 'Dividend lookup isn\'t available in this environment (needs the deployed site).' };
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body.error ?? `Lookup failed (${res.status}).` };
  }
  return {
    ok: true,
    exDividendDate: body.exDividendDate,
    paymentDate: body.paymentDate,
    trailingDividendRate: body.trailingDividendRate,
    trailingDividendYieldPct: body.trailingDividendYieldPct,
    resolvedTicker: body.resolvedTicker,
  };
}
