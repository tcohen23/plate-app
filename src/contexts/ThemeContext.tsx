import { createContext, useContext, useEffect, useState } from "react";

/**
 * Plate Theme System
 * - "dark" = Pure Black (#000) — default
 * - "cream" = Warm cream/light
 * - "system" = Follow OS preference
 */
export type ThemePreference = "dark" | "cream" | "system";
type ResolvedTheme = "dark" | "cream";

interface ThemeContextType {
  /** The user's preference (dark | cream | system) */
  preference: ThemePreference;
  /** The actually applied theme */
  theme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  /** Legacy compat */
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "cream"
      : "dark";
  }
  return "dark";
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") return getSystemTheme();
  return pref;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = true,
}: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem("plate-theme");
      if (stored === "dark" || stored === "cream" || stored === "system") {
        return stored;
      }
    } catch {}
    return defaultTheme;
  });

  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(preference));

  // Apply theme classes to <html>
  useEffect(() => {
    const resolved = resolveTheme(preference);
    setTheme(resolved);

    const root = document.documentElement;
    root.classList.remove("dark", "cream");

    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("cream");
    }

    // Update browser chrome / status bar color to match theme
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", resolved === "cream" ? "#FAF8F5" : "#000000");
    }

    try {
      localStorage.setItem("plate-theme", preference);
    } catch {}
  }, [preference]);

  // Listen for OS theme changes when set to "system"
  useEffect(() => {
    if (preference !== "system") return;

    const lightQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      const resolved = resolveTheme("system");
      setTheme(resolved);

      const root = document.documentElement;
      root.classList.remove("dark", "cream");
      root.classList.add(resolved);

      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute("content", resolved === "cream" ? "#FAF8F5" : "#000000");
      }
    };

    lightQuery.addEventListener("change", handleChange);
    return () => lightQuery.removeEventListener("change", handleChange);
  }, [preference]);

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
