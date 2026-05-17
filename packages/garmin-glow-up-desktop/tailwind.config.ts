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
        rose: v("rose"),
        cyan: v("cyan"),
        solar: v("solar"),
        lime: v("lime"),
        violet: v("violet"),
        tangerine: v("tangerine"),
        run: v("run"),
        bike: v("bike"),
        swim: v("swim"),
        trail: v("trail"),
        lift: v("lift"),
        walk: v("walk"),
        z1: v("z1"),
        z2: v("z2"),
        z3: v("z3"),
        z4: v("z4"),
        z5: v("z5"),
        accent: { DEFAULT: v("accent"), ink: v("accent-ink") },
      },
      borderRadius: {
        xs: v("r-xs"),
        sm: v("r-sm"),
        md: v("r-md"),
        lg: v("r-lg"),
        xl: v("r-xl"),
      },
      fontFamily: {
        sans: [v("font-sans")],
        mono: [v("font-mono")],
      },
      boxShadow: {
        soft: v("shadow-soft"),
      },
      backgroundImage: {
        "grad-glow": v("grad-glow"),
        "grad-glow-wide": v("grad-glow-wide"),
        "grad-effort": v("grad-effort"),
      },
    },
  },
} satisfies Config;
