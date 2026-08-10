// Central place for tunable thresholds and storage keys.
// Cowork (Phase 2): all localStorage keys used by the app are listed here —
// this is the single map to check when wiring nightly sync or a backend.

export const STORAGE_KEYS = {
  AUTH_SESSION: 'welldee_auth_session',
  PORTFOLIO: 'welldee_portfolio',
  IBKR_CACHE: 'welldee_ibkr_cache',
  IBKR_PROXY_URL: 'welldee_ibkr_proxy_url',
  HIDE_CPF: 'welldee_hide_cpf',
  HIDE_NUMBERS: 'welldee_hide_numbers',
};

// IBKR has no simple API-key auth for retail Client Portal accounts — real
// sync needs the local proxy in server/ (see README "IBKR setup").
export const DEFAULT_IBKR_PROXY_URL = 'http://localhost:4000';

// Flag any asset class more than this far from its target allocation.
// Cowork: adjust this single constant to change rebalancing sensitivity
// app-wide (dashboard alert box + settings panel both read from here).
export const REBALANCE_THRESHOLD = 0.05;

// Governance rule from WEALTH_DASHBOARD.md's Tier 2 design — minimum days
// between rebalances, to prevent over-trading. RebalancingHistory.jsx checks
// the most recent logged entry against this.
export const REBALANCE_MIN_INTERVAL_DAYS = 90;

// How close an ex-dividend/payment date has to be to show the Dividend
// Calendar's alert banner. Fixed for now rather than a Settings toggle.
export const DIVIDEND_ALERT_WINDOW_DAYS = 7;

// Still a hardcoded snapshot, not a live fetch (see README "Known
// Limitations" — automating this is the one open item there). Updated by
// hand to the market rate as of 2026-07-29 (~1.292, per XE/Investing.com).
// Keyed by currency code -> units of that currency per 1 SGD... no: per-SGD
// multiplier, i.e. amount_in_that_currency * rate = amount_in_SGD.
// Add a line here for any new currency a broker introduces (e.g. HKD) —
// no other code changes needed, toSGD() reads this map directly.
export const FX_RATES = {
  SGD: 1,
  USD: 1.292,
};

export const ASSET_CLASSES = {
  EQUITIES: 'equities',
  FIXED_INCOME: 'fixedIncome',
  CASH: 'cash',
  CPF: 'cpf',
};

export const ASSET_CLASS_LABELS = {
  [ASSET_CLASSES.EQUITIES]: 'Equities',
  [ASSET_CLASSES.FIXED_INCOME]: 'Fixed Income',
  [ASSET_CLASSES.CASH]: 'Cash',
  [ASSET_CLASSES.CPF]: 'CPF',
};

// Pastel doodle-moodboard palette — kept the same across dark/light theme
// since these are SVG fill props (JS constants), not CSS vars; pastels read
// cleanly on the dark background this app defaults to, and still work fine
// against white with the white cell stroke added in the chart components.
export const ASSET_CLASS_COLORS = {
  [ASSET_CLASSES.EQUITIES]: '#c4b5fd', // lavender
  [ASSET_CLASSES.FIXED_INCOME]: '#93c5fd', // sky blue
  [ASSET_CLASSES.CASH]: '#86efac', // mint green
  [ASSET_CLASSES.CPF]: '#fde68a', // pastel yellow
};

// Cycled through for open-ended dimensions (Geography, Industry) — same
// pastel family as ASSET_CLASS_COLORS above.
export const DOODLE_PALETTE = [
  '#c4b5fd', // lavender
  '#93c5fd', // sky blue
  '#86efac', // mint green
  '#fde68a', // pastel yellow
  '#f9a8d4', // pink
  '#fca5b7', // rose
  '#fdba8c', // peach
  '#67e8f9', // cyan
  '#d8b4fe', // violet
  '#a3e635', // lime
];

// MVP: passphrase only. Tier 2 should move this to a real auth provider —
// see README "Known Limitations" for the upgrade path.
export const ADMIN_PASSPHRASE = 'welldee2026';
