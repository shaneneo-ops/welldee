import { useEffect, useState } from 'react';

function readSGTParts() {
  const parts = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return {
    hour: parts.hour,
    minute: parts.minute,
    date: `${parts.weekday}, ${parts.day} ${parts.month}`,
  };
}

// Whimsy-only header centerpiece — live Singapore time. Gated entirely on
// themeFamily === 'whimsy' by the caller, so this has no effect on doodle.
export default function Clock() {
  const [time, setTime] = useState(readSGTParts);

  useEffect(() => {
    const id = setInterval(() => setTime(readSGTParts()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right whitespace-nowrap">
      <p className="wd-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
        Singapore &middot; Live
      </p>
      <div
        className="wd-heading font-bold leading-none"
        style={{ color: 'var(--wd-lavender)', fontSize: '1.75rem', fontVariantNumeric: 'tabular-nums' }}
      >
        {time.hour}
        <span className="wd-clock-colon">:</span>
        {time.minute}
      </div>
      <p className="wd-subtle" style={{ whiteSpace: 'nowrap' }}>{time.date}</p>
    </div>
  );
}
