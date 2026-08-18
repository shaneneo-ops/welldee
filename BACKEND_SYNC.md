# Backend Sync Setup — Vercel Postgres

Your portfolio data now syncs across all browsers and devices via Vercel Postgres. Changes in Chrome instantly appear in Claude browser, and vice versa.

## How It Works

- **On login:** a unique user ID is stored locally
- **On app load:** fetches latest portfolio from Postgres
- **On any change:** auto-saves to Postgres (debounced 2s to avoid thrashing)
- **Conflict resolution:** last-write-wins (if two browsers edit simultaneously, the most recent write wins; both browsers will re-fetch the server state)
- **Offline fallback:** localStorage is still used as a cache, so the app works offline; changes sync to Postgres once reconnected

## Setup (One-Time)

### 1. Provision Vercel Postgres

You have two options:

**Option A: Via Vercel Dashboard (easiest)**
1. Go to https://vercel.com/dashboard
2. Select your "welldee" project
3. Go to **Settings → Integrations**
4. Search for "Postgres" and click **Vercel Postgres**
5. Click **Add Integration** and authorize
6. Select your project and click **Create**
7. A `DATABASE_URL` env var is auto-set in your Vercel project

**Option B: Via CLI (if you have vercel CLI installed)**
```bash
npm i -g vercel
vercel link  # link this repo to your Vercel project
vercel integration add postgres --yes
vercel env pull --yes  # fetch DATABASE_URL to .env.local
```

### 2. Initialize the Database

```bash
npm install  # install @vercel/postgres
node scripts/init-postgres.js
```

This creates three tables:
- `users` — stores your email and login timestamp
- `portfolios` — the source of truth for your portfolio state + version for conflict detection
- `sync_logs` — audit trail of syncs and conflicts (optional, for debugging)

If you run this multiple times, it's safe — tables use `IF NOT EXISTS`.

### 3. Deploy

```bash
git add -A
git commit -m "Add backend sync via Vercel Postgres"
git push origin main
```

Vercel auto-deploys and the `/api/portfolio` endpoint goes live.

## Verification

### Check It Works Locally
```bash
# Terminal 1: start dev server
npm run dev

# Terminal 2: in another browser, load http://localhost:5173
# You should see "Not enough history yet" (since Postgres is not running locally)
# This is OK — the app falls back to localStorage in dev
```

### Check It Works on Production
1. Log in on Chrome: https://welldee.vercel.app
2. Add a holding or change a value
3. Open **incognito/private window** (different browser context, different localStorage)
4. Log in again and refresh
5. You should see your changes — proof that the backend is syncing

## Environment Variables

After provisioning Postgres, you'll have:

```env
DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require
```

In **Vercel Dashboard → Settings → Environment Variables**, this is auto-set.

In **local development** (`.env.local`), pull it with:
```bash
vercel env pull --yes
```

The app also works in dev without this env var — it just won't sync to Postgres, only localStorage.

## Troubleshooting

### "Backend fetch failed" in the console
- Postgres not provisioned yet, or
- `DATABASE_URL` not set in Vercel env vars, or
- `/api/portfolio` endpoint not deployed yet

→ Check Vercel Dashboard → Settings → Postgres to confirm it's linked.

### Changes aren't syncing between browsers
- Make sure you're logged in with the same passphrase in both
- If you just deployed, wait 30s for Vercel to finish the deploy
- Open DevTools → Network tab, click a button, and check if `/api/portfolio` requests succeed (200 status)

### "Conflict detected" in sync_logs
- Two browsers edited simultaneously
- The more recent write won (last-write-wins strategy)
- Both browsers will re-fetch and show the same state
- This is OK — it's the designed behavior

## How Conflict Detection Works

Each portfolio has a `version` number in Postgres. When you save:
1. You send your `localVersion`
2. Server compares it to the current `serverVersion`
3. If they match: clean merge, no conflict
4. If they don't match: last-write-wins, but a conflict log entry is created for audit

To see conflicts:
```sql
SELECT * FROM sync_logs WHERE conflict_resolved = true;
```

## Rollback (if needed)

If you want to go back to localStorage-only (no Postgres):

```bash
# Delete the Postgres integration from Vercel Dashboard
# Remove the DATABASE_URL env var
# The app will still work, using only localStorage (no cross-browser sync)
```

Or in code, comment out the `useEffect` in `PortfolioContext.jsx` that calls `fetchPortfolioFromBackend()`.

## Cost

Vercel Postgres is **free** up to:
- 3 GB storage
- 1 GB bandwidth per month
- Standard queries/connections

Your portfolio is tiny (~100KB JSON), so you're well within free tier forever.

---

**Questions?** Check `api/portfolio.js` and `src/context/PortfolioContext.jsx` for the implementation details.
