"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, type GameId, type Settings } from "@/lib/types";

// Key predates the BrainCompass rename; kept so saved settings survive.
const KEY = "neurotrace.settings.v1";

interface SettingsCtx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  bumpSessionCount: (game: GameId) => number;
  reset: () => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

function load(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sessionCounts: { ...DEFAULT_SETTINGS.sessionCounts, ...(parsed.sessionCounts ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(s: Settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable; the game still runs */
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = load();
    // Honour the OS reduced-motion preference on first run.
    if (!s.firstLaunchDone && typeof window !== "undefined") {
      const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      if (mq?.matches) s.reducedMotion = true;
    }
    // Settings live in localStorage, which only exists after hydration, so the
    // first client render deliberately uses defaults and then adopts the saved values.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(s);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = document.documentElement;
    el.dataset.textSize = settings.textSize;
    el.dataset.contrast = settings.highContrast ? "high" : "normal";
    el.dataset.reducedMotion = settings.reducedMotion ? "true" : "false";
    el.dataset.theme = settings.theme;
  }, [ready, settings.textSize, settings.highContrast, settings.reducedMotion, settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const bumpSessionCount = useCallback(
    (game: GameId) => {
      const current = load();
      const n = (current.sessionCounts[game] ?? 0) + 1;
      const next = { ...current, sessionCounts: { ...current.sessionCounts, [game]: n } };
      save(next);
      setSettings(next);
      return n;
    },
    [],
  );

  const reset = useCallback(() => {
    save(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, ready, update, bumpSessionCount, reset }),
    [settings, ready, update, bumpSessionCount, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
