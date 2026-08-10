import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { computeRebalancingHistory, daysSinceLastRebalance } from '../utils/calculations';
import { REBALANCE_MIN_INTERVAL_DAYS } from '../utils/constants';

const DECISION_OPTIONS = ['APPROVE', 'APPROVE_WITH_CONDITIONS', 'DEFER', 'REJECT'];

const DECISION_STYLE = {
  APPROVE: { bg: 'var(--wd-green)', label: 'Approved' },
  APPROVE_WITH_CONDITIONS: { bg: 'var(--wd-yellow)', label: 'Approved w/ conditions' },
  DEFER: { bg: 'var(--wd-blue)', label: 'Deferred' },
  REJECT: { bg: 'var(--wd-red)', label: 'Rejected' },
  APPROVED: { bg: 'var(--wd-green)', label: 'Approved' },
  DEFERRED: { bg: 'var(--wd-blue)', label: 'Deferred' },
  REJECTED: { bg: 'var(--wd-red)', label: 'Rejected' },
};

const TRADE_STATUS_STYLE = {
  FILLED: { bg: 'var(--wd-green)', label: 'Filled' },
  UNFILLED: { bg: 'var(--wd-red)', label: 'Unfilled' },
  PENDING: { bg: 'var(--wd-yellow)', label: 'Pending' },
};

function DecisionBadge({ decision }) {
  const style = DECISION_STYLE[decision] ?? { bg: 'var(--wd-card-border)', label: decision ?? '—' };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${style.bg} 30%, var(--wd-card-bg))`, color: 'var(--wd-text-heading)', border: `1.5px var(--wd-border-style) ${style.bg}` }}
    >
      {style.label}
    </span>
  );
}

function TradeStatusBadge({ status }) {
  const style = TRADE_STATUS_STYLE[status] ?? { bg: 'var(--wd-card-border)', label: status ?? '—' };
  return (
    <span
      className="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${style.bg} 35%, var(--wd-card-bg))`, color: 'var(--wd-text-heading)' }}
    >
      {style.label}
    </span>
  );
}

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  return [saved, flash];
}

export default function RebalancingHistory() {
  const { portfolio, addRebalancingHistoryEntry, deleteRebalancingHistoryEntry } = usePortfolio();
  const history = computeRebalancingHistory(portfolio);
  const daysSince = daysSinceLastRebalance(portfolio);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [researchSource, setResearchSource] = useState('rebalancing-research-agent');
  const [advisorSource, setAdvisorSource] = useState('AdvisorKim');
  const [advisorDecision, setAdvisorDecision] = useState('APPROVE');
  const [userDecision, setUserDecision] = useState('APPROVED');
  const [notes, setNotes] = useState('');
  const [saved, flash] = useSavedFlash();

  function add() {
    if (!date) return;
    addRebalancingHistoryEntry({
      date,
      triggeredBy: 'Manual request',
      researchSource,
      advisorSource,
      advisorDecision,
      userDecision,
      trades: [],
      notes,
    });
    setNotes('');
    flash();
  }

  return (
    <div className="wd-card">
      <span className="wd-emoji-badge" aria-hidden="true">📜</span>
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <p className="wd-card-title">Rebalancing History</p>
        {daysSince != null && (
          <p className="wd-subtle">
            Last rebalance: {daysSince} day{daysSince === 1 ? '' : 's'} ago
            {daysSince < REBALANCE_MIN_INTERVAL_DAYS && ` — ${REBALANCE_MIN_INTERVAL_DAYS - daysSince}d until next eligible under the 90-day rule`}
          </p>
        )}
      </div>
      <p className="wd-subtle mb-4">
        Audit trail for the 2-agent governance flow (Research → Advisor Review → your decision → executed trades).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="wd-input" />
        <input
          type="text"
          value={researchSource}
          onChange={(e) => setResearchSource(e.target.value)}
          placeholder="Research source"
          className="wd-input"
        />
        <input
          type="text"
          value={advisorSource}
          onChange={(e) => setAdvisorSource(e.target.value)}
          placeholder="Advisor source"
          className="wd-input"
        />
        <select value={advisorDecision} onChange={(e) => setAdvisorDecision(e.target.value)} className="wd-input">
          {DECISION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              Advisor: {DECISION_STYLE[d].label}
            </option>
          ))}
        </select>
        <select value={userDecision} onChange={(e) => setUserDecision(e.target.value)} className="wd-input">
          {['APPROVED', 'DEFERRED', 'REJECTED'].map((d) => (
            <option key={d} value={d}>
              You: {DECISION_STYLE[d].label}
            </option>
          ))}
        </select>
        <button onClick={add} className="wd-btn-primary whitespace-nowrap">
          {saved ? 'Logged ✓' : 'Log entry'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Trades executed, rationale, anything worth remembering..."
        rows={2}
        className="wd-input w-full mb-4"
      />

      {history.length === 0 ? (
        <p className="wd-muted text-sm">No rebalancing decisions logged yet.</p>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl p-3"
              style={{ backgroundColor: 'var(--wd-card-bg-alt)', border: '2px var(--wd-border-style) var(--wd-card-border)' }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
                    {entry.date}
                  </span>
                  <DecisionBadge decision={entry.advisorDecision} />
                  <DecisionBadge decision={entry.userDecision} />
                </div>
                <button
                  onClick={() => deleteRebalancingHistoryEntry(entry.id)}
                  className="wd-muted hover:opacity-100"
                  style={{ opacity: 0.6 }}
                  aria-label="Delete rebalancing history entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="wd-subtle mb-1">
                {entry.researchSource}
                {entry.advisorSource && ` → ${entry.advisorSource}`}
              </p>
              {entry.trades?.length > 0 && (
                <ul className="text-sm wd-body-text space-y-0.5 mb-1">
                  {entry.trades.map((t, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--wd-text-heading)' }}>
                        {t.action} {t.ticker}
                      </span>
                      <span className="wd-subtle">
                        {t.shares} sh @ {t.currency ?? 'SGD'}{t.price}
                      </span>
                      <TradeStatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
              {entry.notes && <p className="text-sm wd-body-text">{entry.notes}</p>}
              {entry.nextReviewDate && <p className="wd-subtle mt-1">Next review: {entry.nextReviewDate}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
