# 08 — Design tokens & styling

The existing `tempo/styles.css` is **already shaped like a design-token file** — every visual decision is a CSS custom property. Migration into Tailwind is mostly mechanical.

## Step 1 — drop `tokens.css` verbatim

Copy `tempo/styles.css` into `tempo-desktop/src/styles/tokens.css` unchanged (except the `.tempo` scaffold rule — that goes away since the desktop owns its own layout chrome via React/Tauri, not a 1280×800 box).

Variables to keep verbatim (the contract every component relies on):

- **Palette** — `--rose --cyan --solar --lime --violet --tangerine`
- **Sport aliases** — `--run --bike --swim --trail --lift --walk`
- **HR zones** — `--z1 … --z5`
- **Gradients** — `--grad-glow --grad-glow-wide --grad-effort`
- **Neutrals** — `--bg-0 … --bg-3`, `--line`, `--line-soft`, `--fg-0 … --fg-3`
- **Type** — `--font-sans --font-mono`
- **Radii** — `--r-xs --r-sm --r-md --r-lg --r-xl`
- **Shadow** — `--shadow-soft`
- **Accent** — `--accent`, `--accent-ink`

The `.tempo--light` class is the theme toggle. The `<html>` element gets `class="tempo--light"` when settings choose light mode — same hook the existing tweaks panel uses.

## Step 2 — Tailwind mapping

`tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";
const v = (name: string) => `var(--${name})`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { 0: v("bg-0"), 1: v("bg-1"), 2: v("bg-2"), 3: v("bg-3") },
        fg: { 0: v("fg-0"), 1: v("fg-1"), 2: v("fg-2"), 3: v("fg-3") },
        line: { DEFAULT: v("line"), soft: v("line-soft") },
        rose: v("rose"), cyan: v("cyan"), solar: v("solar"),
        lime: v("lime"), violet: v("violet"), tangerine: v("tangerine"),
        run: v("run"), bike: v("bike"), swim: v("swim"),
        trail: v("trail"), lift: v("lift"), walk: v("walk"),
        z1: v("z1"), z2: v("z2"), z3: v("z3"), z4: v("z4"), z5: v("z5"),
        accent: { DEFAULT: v("accent"), ink: v("accent-ink") },
      },
      borderRadius: {
        xs: v("r-xs"), sm: v("r-sm"), md: v("r-md"),
        lg: v("r-lg"), xl: v("r-xl"),
      },
      fontFamily: { sans: [v("font-sans")], mono: [v("font-mono")] },
      boxShadow: { soft: v("shadow-soft") },
      backgroundImage: {
        "grad-glow": v("grad-glow"),
        "grad-glow-wide": v("grad-glow-wide"),
        "grad-effort": v("grad-effort"),
      },
    },
  },
} satisfies Config;
```

After this, every Tailwind class in components reads from the live CSS var, so a theme swap costs nothing.

## Step 3 — preserve the atoms

Three components in `tempo/shared.jsx` matter and must be ported as-is (not "rewritten in Tailwind"):

- `Icon` — switch from `case` statement to a typed dictionary + `as const`. Same SVG output.
- `Sidebar` — translate to TS, route-aware `active` via `useMatch`.
- `TopBar` — same.

The rest of `shared.jsx` (`Stat`, `Chip`, `VibeChip`, `TickArc`, `EmptyCard`, `pathFromSeries`, `fmtPace`) ports one-to-one.

## Step 4 — fonts

The current page loads Geist + Geist Mono from Google Fonts. In the desktop, **self-host** them so the app works offline:

- `pnpm add @fontsource/geist @fontsource/geist-mono` (or download `.woff2` directly from rsms/geist).
- Import once in `src/main.tsx`.
- Verify `font-feature-settings` still applies (the JSX uses `"ss01", "ss03", "cv11", "tnum"` which are Geist features).

## Step 5 — Anti-patterns to forbid

- No inline `style={{ ... }}` for layout or spacing in TS code. Inline styles are fine for **one-off computed values** (a percentage width derived from data) — never for repeatable design tokens. Use Tailwind classes for the latter.
- No `!important` outside the `__om-edit-overrides` block that lives in the design canvas — that file isn't shipped.
- No new colours invented in components. If you need one, add a variable in `tokens.css` first.

## Step 6 — Dark/light parity audit

Every screen must be tested in both modes. The original design has both wired through the tweaks panel — keep parity. Specific places that often regress:

- Map card uses a custom dark gradient (`#1a1e1a → #0e1014`). In light mode, swap to the MapLibre light style; the data-overlay path colour stays sport-coded.
- Sleep stages strip uses `--z2/4/5` for stages — these are saturated and read well on both backgrounds. No change.
- Sparkle and PR halos use `color-mix(in oklch, var(--rose) 12%, var(--bg-2))` — `bg-2` already swaps, so this is fine.
