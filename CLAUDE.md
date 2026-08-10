# Welldee — Wealth Dashboard

A single-page React app (Vite + Tailwind) that aggregates brokerage accounts
(IBKR, Standard Chartered), CPF, DBS, and Endowus into one net worth view,
with target-allocation rebalancing alerts and a dividend log. Portfolio data
lives in browser localStorage; the only backend is a small local Express
proxy used solely to reach IBKR's gateway (`npm run server`).

See [WEALTH_DASHBOARD.md](./WEALTH_DASHBOARD.md) for the full product brief,
data model, and build progress log. See [README.md](./README.md) for setup
and IBKR sync instructions.

## Stack

- Vite + React 19 + Tailwind v4
- Recharts for charts, lucide-react for icons
- State: `PortfolioContext` (React Context + localStorage persistence)
- Deployed to Vercel (frontend only — `vercel.json`); IBKR proxy server runs
  locally, never deployed, since it talks to `localhost:5000`

## Current design system ("doodle" theme)

Dark/light pastel theme with dashed borders, rounded pill cards, unicorn
branding — CSS vars defined across components, palette in
`src/utils/constants.js`. See progress log in WEALTH_DASHBOARD.md for the
full doodle restyle history (tasks #19–28).

## Open Tasks

### Redesign pass — "Whimsy Wealth" visual system

**Status: prototype built, awaiting decision on integration.** A standalone
mockup was published at
https://claude.ai/code/artifact/f97ecbe2-e3ea-418b-82f9-fed983cf902b (private
artifact — republish the same conversation, or pass this URL as `url` to
the Artifact tool from any conversation, to update it in place). It uses the
user's real last-synced figures (net worth $536,691, Standard
Chartered/Endowus/iFAST/DBS accounts, 69/19/12 asset allocation) rather than
placeholder data, embeds Quicksand (display) + Inter (body) as base64
@font-face so it renders standalone, and implements the live Singapore
digital clock, pastel donut + stacked-account-bar charts, and two-tone
invested-vs-gained progress bars called for below. Both light and dark
themes were built and verified in-browser.

**Not yet done:** integrating this into the actual React app. The mockup is
one static HTML file: it has no wiring to `PortfolioContext`, doesn't handle
the Standard Chartered per-holding table or dividend log the doodle theme
covers, and its "goals" bars use a cost-basis/gain split invented for this
prototype (real "goals" have no user-defined dollar targets per
`computeAccountGroups` — confirm that framing still makes sense before
porting). Next step is deciding, with the user, whether/how to fold this
visual language into the live app — likely a new theme variant alongside
"doodle" rather than a wholesale replacement, given how much of the current
UI (Holdings table, Settings forms, dividend log, rebalancing alerts) this
mockup doesn't attempt to cover.

Original mood board and full brief below, kept for reference if resuming or
extending the prototype:

Reference mood board supplied by user (image attached in session, not
committed to repo — ask user to re-share if starting this task fresh).

Full design brief to execute:

> [PROJECT CONTEXT & GOAL]
> - Build a high-performance, single-file HTML financial portfolio management dashboard.
> - **Vibe:** Fun, engaging, friendly, and polished ("Whimsy Wealth"). Absolutely zero boring corporate tables, harsh dark modes, or lazy AI tropes.
> - **Reference:** Use the attached image_0.png (the "Whimsy Wealth" mood board) as the strict source of truth for all design tokens.
>
> [VISUAL DESIGN SYSTEM EXECUTION (DERIVED FROM MOOD BOARD)]
> - **Color Palette (Strict):**
>     - Background: Soft, warm off-white paper texture (like the mood board background).
>     - Primary UI Accent: Lavender (#B9A8F4 - from mood board palette).
>     - Secondary UI Accent: Soft Mint (#ADEFD1 - from mood board palette).
>     - Data/Chart Colors: Use the specific pastel gradient set seen in the charts (Soft Teal -> Peach -> Lavender -> Mint).
> - **Typography (Strict):**
>     - Absolutely NO system fonts (Arial, Roboto).
>     - Headers/Key Metrics: Must use a rounded, friendly sans-serif font (closely resembling **San Francisco Pro Rounded** or **Quicksand Bold**) for a soft, approachable feel.
>     - Body Text: Clean, highly legible sans-serif (like **SF Pro Text** or **Inter**).
>     - *Instruction:* Import these via Google Fonts <link> tags.
> - **UI Elements (Shape & Depth):**
>     - Cards: Soft white, floating cards with subtle, diffused drop shadows (neumorphic/glassmorphic blend) and **significant corner rounding (pill-shaped edges)**, mirroring the dashboard in image_0.png.
>     - Borders: Minimal or non-existent, relying on depth separation rather than hard lines.
>
> [SPECIFIC COMPONENT REQUIREMENTS]
> - **The Clock Component (Design Priority):**
>     - This must be an integrated visual centerpiece, not an afterthought.
>     - **Style:** Digital, but styled with the rounded, friendly typography of the dashboard. The numbers should be large, soft-colored (perhaps lavender or mint), and use a gentle pulse animation to indicate live time.
>     - **Placement:** Place it prominently in the top-right header area, perhaps next to the main "Whimsy Wealth" title, balanced by the main Net Worth card on the left.
> - **Icons:**
>     - **NO EMOJIS.**
>     - Use simple, thin-line, pastel-colored SVG icons (like the House, Piggy Bank, and Chart icons seen in the "UI Elements" section of image_0.png).
> - **Dashboard Structure:**
>     - Replicate the asymmetric, tile-based layout hierarchy seen on the iPad screen in image_0.png:
>         1. Top Header: Title + Custom Clock.
>         2. Row 1: Large Net Worth Card (with internal sparkline) + Savings Goals Card (with rounded progress bars).
>         3. Row 2: Spending Insights (Pastel Donut Chart) + Portfolio Summary.
>
> [EXECUTION]
> Deliver the complete, standalone HTML/CSS/JS file. The result must look identical to a high-fidelity design mockup derived specifically from the "Whimsy Wealth" mood board.

**Scope note:** this is a from-scratch visual system, not an incremental
patch to the existing "doodle" theme — treat it as a design direction to
evaluate/prototype (e.g. as a standalone mockup or a new theme variant)
before deciding whether to replace the current doodle theme app-wide. Confirm
with the user which components carry over 1:1 (Holdings table structure,
account grouping logic, all calculation logic in `calculations.js`) versus
which need a genuine visual rebuild (cards, charts, header, clock).
