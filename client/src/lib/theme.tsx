import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getWhopTheme(): Theme | "inherit" {
  if (typeof document === "undefined") return "inherit";
  const match = document.cookie.match(/whop-frosted-theme=(light|dark|inherit)/);
  return (match?.[1] as Theme | "inherit") || "inherit";
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const whopTheme = getWhopTheme();
    if (whopTheme === "inherit") return getSystemTheme();
    return whopTheme;
  });

  useEffect(() => {
    const updateTheme = () => {
      const whopTheme = getWhopTheme();
      const newTheme = whopTheme === "inherit" ? getSystemTheme() : whopTheme;
      setThemeState(newTheme);
    };

    // Update on mount
    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getWhopTheme() === "inherit") {
        updateTheme();
      }
    };
    mediaQuery.addEventListener("change", handler);

    // To handle cookie changes, we can listen for window focus
    // or use a short interval since there's no "cookiechange" event
    window.addEventListener("focus", updateTheme);
    const interval = setInterval(updateTheme, 2000);

    return () => {
      mediaQuery.removeEventListener("change", handler);
      window.removeEventListener("focus", updateTheme);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
