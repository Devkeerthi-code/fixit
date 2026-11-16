import type { Config } from "tailwindcss";

const v = (name: string) => `var(--${name})`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      bg: v("bg"),
      paper: v("paper"),
      "paper-2": v("paper-2"),
      line: v("line"),
      "line-strong": v("line-strong"),
      ink: v("text"),
      muted: v("text-muted"),
      gold: v("gold"),
      "gold-ink": v("gold-ink"),
      "gold-display": v("gold-display"),
      "on-gold": v("on-gold"),
      olive: v("olive"),
      "olive-deep": v("olive-deep"),
      "on-olive": v("on-olive"),
      "on-olive-muted": v("on-olive-muted"),
      "gold-on-olive": v("gold-on-olive"),
      "olive-line": v("olive-line"),
      mustard: v("mustard"),
      danger: v("danger"),
      "danger-soft": v("danger-soft"),
      ok: v("ok"),
    },
    fontFamily: {
      display: v("font-display"),
      body: v("font-body"),
    },
    borderRadius: {
      none: "0",
      pill: v("r-pill"),
      sheet: v("r-sheet"),
      full: "50%",
    },
    extend: {
      fontSize: {
        xs: v("text-xs"),
        sm: v("text-sm"),
        base: v("text-base"),
        md: v("text-md"),
        lg: v("text-lg"),
        xl: v("text-xl"),
      },
      maxWidth: { container: v("container") },
      transitionTimingFunction: { out: v("ease-out"), spring: v("ease-spring") },
      transitionDuration: { fast: "120ms", base: "180ms" },
    },
  },
  plugins: [],
} satisfies Config;
