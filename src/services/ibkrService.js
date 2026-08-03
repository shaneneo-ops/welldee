// IBKR data-fetch layer, talking to the local proxy in server/ (which in
// turn talks to IBKR's Client Portal Gateway). See README "IBKR setup" for
// why a direct browser->gateway call doesn't work (self-signed cert, no
// CORS) and why this needs two local processes running.
//
// Deliberately no mock/demo fallback here: if the proxy or gateway is
// unreachable, this throws and the caller (PortfolioContext.syncIBKR)
// surfaces the error via syncStatus.error. Silently falling back to fake
// data would misrepresent it as real, which is exactly what the rest of
// this app's data was cleaned up to avoid.

import { ASSET_CLASSES } from '../utils/constants';

async function proxyGet(proxyUrl, path) {
  let res;
  try {
    res = await fetch(`${proxyUrl}${path}`);
  } catch {
    throw new Error(`Welldee proxy unreachable at ${proxyUrl} — is "npm run server" running?`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Proxy request to ${path} failed (${res.status})`);
  }
  return res.json();
}

// IBKR assetClass -> our ASSET_CLASSES. Defaults to Equities for anything
// not explicitly a bond, matching the same default used for manually-entered
// holdings (see accountValueByAssetClass in calculations.js).
function mapAssetClass(ibkrAssetClass) {
  if (ibkrAssetClass === 'BOND') return ASSET_CLASSES.FIXED_INCOME;
  return ASSET_CLASSES.EQUITIES;
}

function mapPosition(pos) {
  return {
    ticker: pos.contractDesc ?? String(pos.conid),
    shares: pos.position,
    costBasis: pos.avgCost ?? pos.avgPrice ?? null,
    currentPrice: pos.mktPrice,
    currency: pos.currency,
    assetClass: mapAssetClass(pos.assetClass),
    lastUpdated: new Date().toISOString(),
  };
}

function mapLedgerToCash(ledger) {
  const cash = {};
  for (const [currency, entry] of Object.entries(ledger ?? {})) {
    if (currency === 'BASE') continue;
    if (typeof entry?.cashbalance === 'number') cash[currency] = entry.cashbalance;
  }
  return cash;
}

export async function syncIBKRAccount({ proxyUrl, brokerAccountId }) {
  const status = await proxyGet(proxyUrl, '/api/ibkr/status');
  if (!status.gatewayReachable) {
    throw new Error('IBKR Client Portal Gateway is not reachable — start it and log in at https://localhost:5000');
  }
  if (!status.authenticated) {
    throw new Error('IBKR gateway session is not authenticated — log in at https://localhost:5000 in a browser tab, then Sync Now again');
  }

  let resolvedAccountId = brokerAccountId;
  if (!resolvedAccountId) {
    const accounts = await proxyGet(proxyUrl, '/api/ibkr/accounts');
    resolvedAccountId = accounts?.[0]?.accountId;
    if (!resolvedAccountId) throw new Error('IBKR gateway returned no accounts for this session');
  }

  const [positions, ledger] = await Promise.all([
    proxyGet(proxyUrl, `/api/ibkr/portfolio/${resolvedAccountId}/positions`),
    proxyGet(proxyUrl, `/api/ibkr/portfolio/${resolvedAccountId}/ledger`),
  ]);

  const account = {
    id: 'ibkr-001',
    type: 'Brokerage',
    broker: 'IBKR',
    brokerAccountId: resolvedAccountId,
    holdings: positions.map(mapPosition),
    cash: mapLedgerToCash(ledger),
  };

  return { account, source: 'live', syncedAt: new Date().toISOString() };
}
