// Our ticker format -> Yahoo's. SGX-listed holdings are entered as `X.SG`
// here but Yahoo lists them under the `.SI` suffix; US tickers are entered
// as `X.US` but Yahoo has no suffix for the primary US listing. Anything
// else passes through unchanged (best effort, not a guarantee of a match).
// Shared by api/history.js and api/dividendCalendar.js so the mapping can't
// drift between the two.
export function toYahooTicker(ticker) {
  if (ticker.endsWith('.SG')) return ticker.slice(0, -3) + '.SI';
  if (ticker.endsWith('.US')) return ticker.slice(0, -3);
  return ticker;
}
