"use client";

// =============================================================================
// الوضع الليلي — ثلاثة أوضاع: فاتح، داكن، تلقائي حسب إعداد النظام.
// يُطبَّق الوضع عبر السمة data-theme على عنصر <html> فتنقلب رموز الألوان كلها،
// ويُحفظ الاختيار في متصفح المستخدم مستقلاً عن بيانات المنصة.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_KEY = "dtsp-theme";

/** يُحقن في <head> قبل أول رسم لمنع وميض الوضع الفاتح */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_KEY}")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

interface Ctx {
  mode: ThemeMode;
  theme: Theme;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeCtx = createContext<Ctx>({
  mode: "system",
  theme: "light",
  setMode: () => {},
  toggle: () => {},
});

function resolve(mode: ThemeMode): Theme {
  if (mode === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [theme, setTheme] = useState<Theme>("light");

  // قراءة الاختيار المحفوظ بعد التحميل (السكربت في <head> طبّقه بصرياً سلفاً)
  useEffect(() => {
    let saved: ThemeMode = "system";
    try {
      saved = (localStorage.getItem(THEME_KEY) as ThemeMode) || "system";
    } catch {
      saved = "system";
    }
    setModeState(saved);
    setTheme(resolve(saved));
  }, []);

  // تطبيق الوضع على عنصر <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // متابعة تغيّر إعداد النظام أثناء الوضع التلقائي
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setTheme(resolve(m));
    try {
      localStorage.setItem(THEME_KEY, m);
    } catch {
      /* التخزين المحلي معطّل — يبقى الاختيار للجلسة الحالية فقط */
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(resolve(mode) === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(() => ({ mode, theme, setMode, toggle }), [mode, theme, setMode, toggle]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/** ألوان الرسوم البيانية المعتمدة على الوضع الحالي */
export function useChartTheme() {
  const { theme } = useTheme();
  return theme === "dark"
    ? {
        grid: "#322d55",
        axis: "#9a94b8",
        tooltipBg: "#1e1b38",
        tooltipBorder: "#322d55",
        tooltipText: "#f0eefa",
        track: "#272348",
        muted: "#4a4470",
        planned: "#4a4470",
      }
    : {
        grid: "#e2e0e8",
        axis: "#767286",
        tooltipBg: "#ffffff",
        tooltipBorder: "#e2e0e8",
        tooltipText: "#1a1730",
        track: "#f2f1f6",
        muted: "#c3c1cc",
        planned: "#c3c1cc",
      };
}

/** ألوان داكنة أصلاً تحتاج تفتيحاً لتبقى ظاهرة على خلفية داكنة */
const DARK_ACCENT: Record<string, string> = {
  "#2a206a": "#8b7bff",
  "#1c1554": "#7a6ce8",
  "#531a80": "#c79bf0",
  "#005c9d": "#6bc7ff",
  "#008756": "#3ce6a4",
  "#c40000": "#ff7a7a",
  "#767286": "#9a94b8",
  "#5d6167": "#9a94b8",
  "#c3c1cc": "#4a4470",
  "#f2f1f6": "#272348",
};

/** يحوّل لون هوية مُمرَّر كنص hex إلى نظيره المناسب للوضع الحالي */
export function useAccent() {
  const { theme } = useTheme();
  return (hex?: string) => {
    if (!hex) return hex;
    return theme === "dark" ? (DARK_ACCENT[hex.toLowerCase()] ?? hex) : hex;
  };
}
