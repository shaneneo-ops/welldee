# Welldee — Wealth Dashboard

A single-page React app that aggregates any number of brokerage accounts
(IBKR, Standard Chartered, ...) plus CPF, DBS, and Endowus into one net worth
view, with target-allocation rebalancing alerts and a dividend log. Portfolio
data lives in the browser's localStorage; the only backend is a small local
proxy used solely to reach IBKR's gateway (see "IBKR setup" below).

See [WEALTH_DASHBOARD.md](./WEALTH_DASHBOARD.md) for the product brief, data
model, and build progress log.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Default login passphrase is
`welldee2026` (change it in [src/utils/constants.js](./src/utils/constants.js), `ADMIN_PASSPHRASE`).

```bash
npm run build     # production build to dist/
npm run lint      # oxlint
npm run server    # IBKR proxy — only needed if you're syncing a real IBKR account
```

## Data sources

Holdings, CPF, and Endowus balances are entered one of three ways:

1. **Manual entry** in Settings (target allocation, CPF, DBS, Endowus, YTD baseline).
2. **The scalable spreadsheet** — copy the "Welldee - My Holdings" Google
   Sheet template (unlimited rows, any broker, any currency) and paste
   updated figures into `src/utils/defaultPortfolio.js`.
3. **Screenshots** — drop broker/CPF/Endowus app screenshots into
   `statements/` and ask to have them read and transcribed into
   `defaultPortfolio.js`.
4. **Live IBKR sync** — see below.

Editing `defaultPortfolio.js` only takes effect for a fresh browser (empty
localStorage); once the app has run once, `portfolio` in localStorage is the
source of truth and further changes go through Settings/Sync Now or by
clearing localStorage.

## IBKR setup (real sync)

IBKR's Client Portal Gateway is not a public CORS-enabled API a browser can
call directly — it's a session-authenticated process that runs locally at
`https://localhost:5000/v1/api/...` with a self-signed cert. There's also no
simple API key for retail accounts. Real sync needs two local processes:

1. Download and run [IBKR's Client Portal Gateway](https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi/),
   then log in at `https://localhost:5000` in a browser tab (this is where
   any 2FA happens — the gateway holds the session after that).
2. In this repo, run `npm run server` — starts a small Express proxy on
   `http://localhost:4000` ([server/index.js](./server/index.js)) that
   forwards requests to the gateway and adds CORS headers so the frontend can
   call it. The self-signed-cert bypass in
   [server/gatewayClient.js](./server/gatewayClient.js) is scoped to just
   these gateway requests, not applied process-wide.
3. In **Settings → IBKR Connection**, confirm the Proxy URL (default
   `http://localhost:4000`) and click **Sync Now**.
   [src/services/ibkrService.js](./src/services/ibkrService.js) checks the
   proxy/gateway status, discovers your account ID, fetches positions +
   ledger, and maps them into the same generic `Brokerage` account shape used
   by every other broker — no mock fallback, a failure surfaces a clear error
   in Settings instead.

The gateway session expires after a period of inactivity — if Sync Now
starts failing with an "not authenticated" error, log in again at
`https://localhost:5000`.

## How to test locally

1. `npm run dev`, open the app, log in with the passphrase above.
2. Dashboard loads with whatever's in `defaultPortfolio.js`/localStorage —
   Net Worth, YTD Return, Dividends, Asset Allocation pie, Holdings table,
   Dividend Log, and Rebalancing alerts should all populate.
3. Click **Settings** to edit target allocation sliders, CPF/DBS/Endowus
   balances, IBKR proxy URL, and the YTD baseline — changes persist to
   localStorage and the dashboard updates live.
4. Log a dividend payment in the Dividend Log section — the Dividends card
   total should update immediately; delete it and confirm it reverts.
5. Click **Sync Now** to fetch live IBKR data (needs the gateway + proxy
   running — see above; otherwise shows a clear error, not fake data).
6. **Logout** then reload — the app should stay locked until you log back in.

## Known Limitations

| Limitation | Current approach | Future path |
|---|---|---|
| FX rate is hardcoded (`FX_RATES` in `constants.js`) | Static per-currency rate | Fetch live rates |
| Auth is a single hardcoded passphrase | `localStorage` session, no user accounts | Real auth provider, multi-user |
| IBKR proxy is local-only | Two processes on your own machine (`npm run server` + the gateway) | Deploy the proxy somewhere always-on, with real auth in front of it |
| No dividend reinvestment tracking | Dividend Log records actual payments; doesn't adjust share counts for DRIP | Reconcile reinvested dividends against holdings |
| No geographic/industry drill-down | Asset-class breakdown only | Sector/region breakdown (IBKR portfolio analyst data supports this) |
| Rebalancing is suggestion-only | Text suggestions, no execution | Broker API execution (with strong auth) |
| CPF flagged but not "sellable" | Rebalance alert explains CPF is locked, no sell suggestion | N/A — this is permanent, not a gap |

## Architecture notes (for Cowork / future sessions)

- **State**: `src/context/AuthContext.jsx` (session) and
  `src/context/PortfolioContext.jsx` (portfolio data + IBKR sync) are the
  only two React contexts. No Redux/Zustand — deliberately simple.
- **Persistence**: every read/write goes through
  `src/utils/storage.js` (`loadJSON`/`saveJSON`). All keys are listed in
  `STORAGE_KEYS` in `src/utils/constants.js` — that's the map to check when
  wiring a nightly Cowork sync or a real backend. (The IBKR proxy URL is the
  one exception — it's a plain string read/written with raw
  `localStorage.getItem`/`setItem` in `Header.jsx`/`SettingsPanel.jsx`, not
  through the JSON wrapper.)
- **Calculations**: all net worth / P&L / allocation / rebalancing /
  dividend math is in `src/utils/calculations.js`, pure functions taking a
  `portfolio` object. No calculation logic lives in components.
- **Rebalancing threshold**: `REBALANCE_THRESHOLD` in `constants.js` (5%
  default) — the single place to adjust sensitivity app-wide.
- **Multi-broker**: any account with `type: 'Brokerage'` and a `broker` label
  is aggregated identically — see `accountValueByAssetClass` and
  `collectHoldings` in `calculations.js`. Add brokers by adding accounts, not
  by adding code.
- **Multi-currency**: `toSGD()` in `calculations.js` reads `FX_RATES` in
  `constants.js` — add a currency by adding one line there.
- **IBKR sync**: `src/services/ibkrService.js` talks to `server/` (the local
  proxy), which talks to IBKR's gateway — see "IBKR setup" above.
  `PortfolioContext.syncIBKR()` is the function to call on a schedule for
  automated refresh, if that's ever wired up.
- **Dividends**: `portfolio.dividendPayments` is the ledger of actual logged
  payments (`src/components/DividendLog.jsx` to add/remove,
  `computeDividendPayments()` to total). `dividendYieldPct` on a holding or
  Endowus account feeds `computeProjectedAnnualDividends()`, a separate
  forward-looking projection — the two are intentionally not mixed into one
  number.
