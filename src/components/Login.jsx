import { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { themeFamily } = useTheme();
  const isWhimsy = themeFamily === 'whimsy';
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const result = login(passphrase);
    if (!result.ok) {
      setError(result.error);
      setPassphrase('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <span className="wd-doodle-decor absolute text-3xl top-[8%] left-[10%] -rotate-12 opacity-70" aria-hidden="true">⭐</span>
      <span className="wd-doodle-decor absolute text-2xl top-[18%] right-[14%] rotate-12 opacity-60" aria-hidden="true">☁️</span>
      <span className="wd-doodle-decor absolute text-4xl bottom-[15%] left-[8%] rotate-6 opacity-60" aria-hidden="true">🌈</span>
      <span className="wd-doodle-decor absolute text-2xl bottom-[10%] right-[10%] -rotate-6 opacity-70" aria-hidden="true">✨</span>
      <span className="wd-doodle-decor absolute text-xl top-[35%] left-[4%] opacity-50" aria-hidden="true">⭐</span>
      <span className="wd-doodle-decor absolute text-xl top-[70%] right-[6%] opacity-50" aria-hidden="true">☁️</span>

      <div className="w-full max-w-sm wd-card relative z-10">
        <div className="flex flex-col items-center mb-6">
          {isWhimsy ? (
            <span
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
              style={{ background: 'color-mix(in srgb, var(--wd-lavender) 20%, var(--wd-card-bg))' }}
            >
              <Sparkles size={28} style={{ color: 'var(--wd-lavender)' }} />
            </span>
          ) : (
            <div className="text-5xl mb-2 -rotate-6" aria-hidden="true">🦄</div>
          )}
          <h1 className="text-2xl wd-heading font-semibold" style={{ color: 'var(--wd-text-heading)' }}>
            Welldee
          </h1>
          <p className="wd-subtle mt-1">
            <span className="wd-doodle-decor">✨ </span>
            Wealth Dashboard — Admin Access
            <span className="wd-doodle-decor"> ✨</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="passphrase" className="wd-label flex items-center gap-1">
              <Lock size={12} /> Passphrase
            </label>
            <input
              id="passphrase"
              type="password"
              autoFocus
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="wd-input"
              placeholder="Enter passphrase"
            />
          </div>

          {error && <p className="text-sm wd-negative">{error}</p>}

          <button type="submit" className="wd-btn-primary">
            Sign in <span className="wd-doodle-decor" aria-hidden="true">🦄</span>
          </button>
        </form>

        <p className="wd-subtle mt-6 text-center">
          Single-user MVP. Passphrase set in source — see README before sharing access.
        </p>
      </div>
    </div>
  );
}
