# Whimsy Wealth Dashboard

A high-performance, single-file HTML financial portfolio management dashboard with a fun, engaging, and friendly design aesthetic.

## Project Overview

- **Goal:** Build a beautiful, single-file HTML financial dashboard that's engaging and user-friendly
- **Vibe:** Fun, engaging, friendly, and polished ("Whimsy Wealth") — absolutely zero boring corporate tables, harsh dark modes, or lazy AI tropes
- **Reference:** Design tokens strictly derived from the "Whimsy Wealth" mood board (`image_0.png`)

## Tasks

### 1. Implement Whimsy Wealth Dashboard Design
**Status:** TODO

Build a high-performance, single-file HTML financial portfolio management dashboard with strict adherence to the Whimsy Wealth design system.

#### Visual Design System (Derived from Mood Board)

**Color Palette (Strict):**
- Background: Soft, warm off-white paper texture (like the mood board background)
- Primary UI Accent: Lavender (#B9A8F4)
- Secondary UI Accent: Soft Mint (#ADEFD1)
- Data/Chart Colors: Use the specific pastel gradient set seen in charts (Soft Teal → Peach → Lavender → Mint)

**Typography (Strict):**
- Headers/Key Metrics: Rounded, friendly sans-serif (San Francisco Pro Rounded or Quicksand Bold) for soft, approachable feel
- Body Text: Clean, legible sans-serif (SF Pro Text or Inter)
- Import via Google Fonts `<link>` tags

**UI Elements (Shape & Depth):**
- Cards: Soft white, floating with subtle diffused drop shadows (neumorphic/glassmorphic blend)
- Significant corner rounding (pill-shaped edges), mirroring the dashboard design
- Minimal borders, relying on depth separation

#### Component Requirements

**The Clock Component (Design Priority):**
- Integrated visual centerpiece, not an afterthought
- Style: Digital but styled with rounded, friendly typography
- Numbers: Large, soft-colored (lavender or mint) with gentle pulse animation
- Placement: Prominently in top-right header area next to main "Whimsy Wealth" title

**Icons:**
- NO EMOJIS
- Simple, thin-line, pastel-colored SVG icons (House, Piggy Bank, Chart icons)

**Dashboard Structure:**
- Replicate asymmetric, tile-based layout hierarchy:
  1. Top Header: Title + Custom Clock
  2. Row 1: Large Net Worth Card (with internal sparkline) + Savings Goals Card (with rounded progress bars)
  3. Row 2: Spending Insights (Pastel Donut Chart) + Portfolio Summary

#### Deliverables
- Complete, standalone HTML/CSS/JS file
- Result must look identical to high-fidelity design mockup derived from mood board
- Fully functional with realistic financial data displays

## Development Branch

**Branch:** `claude/whimsy-wealth-dashboard-design-c84dbb`

All development work should be committed and pushed to this branch.

## Resources

- Design Reference: Whimsy Wealth mood board (image_0.png)
- Color Reference File: `references/palette.md` (if creating external palette reference)

## Notes

- Focus on polish and user experience — no corporate aesthetics
- Every UI element should reinforce the "fun and friendly" vibe
- Design consistency across all components is critical
