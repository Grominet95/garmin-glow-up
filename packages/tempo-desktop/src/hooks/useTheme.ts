import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const KEY = "tempo.theme";

function getInitial(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) ?? "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    document.body.classList.toggle("tempo--light", theme === "light");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
