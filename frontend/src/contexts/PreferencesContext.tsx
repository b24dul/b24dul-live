import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

export const PREFERENCES_KEY = 'b24dul.preferences.v1';
export const LEGACY_SIDEBAR_KEY = 'b24dul.sidebar.collapsed.v1';

export type Preferences = Readonly<{
  version: 1;
  accent: 'violet' | 'cyan';
  density: 'comfortable' | 'compact';
  motion: 'system' | 'reduce';
  homeLayout: 'standard' | 'games-first';
  sidebarCollapsed: boolean;
}>;

export const DEFAULT_PREFERENCES: Preferences = {
  version: 1,
  accent: 'violet',
  density: 'comfortable',
  motion: 'system',
  homeLayout: 'standard',
  sidebarCollapsed: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parsePreferences(value: unknown): Preferences | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (
    value.accent !== 'violet' && value.accent !== 'cyan' ||
    value.density !== 'comfortable' && value.density !== 'compact' ||
    value.motion !== 'system' && value.motion !== 'reduce' ||
    value.homeLayout !== 'standard' && value.homeLayout !== 'games-first' ||
    typeof value.sidebarCollapsed !== 'boolean'
  ) return null;
  return {
    version: 1,
    accent: value.accent,
    density: value.density,
    motion: value.motion,
    homeLayout: value.homeLayout,
    sidebarCollapsed: value.sidebarCollapsed,
  };
}

export function readPreferences(): Preferences {
  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    if (stored !== null) {
      const parsed = parsePreferences(JSON.parse(stored) as unknown);
      if (parsed) return parsed;
      // A malformed or future schema is never trusted. Recover to safe defaults.
      window.localStorage.removeItem(PREFERENCES_KEY);
      return DEFAULT_PREFERENCES;
    }
    // Migrate only when there is no new-schema value, never on corrupt new data.
    const legacy = window.localStorage.getItem(LEGACY_SIDEBAR_KEY);
    if (legacy === 'true' || legacy === 'false') {
      const migrated = { ...DEFAULT_PREFERENCES, sidebarCollapsed: legacy === 'true' };
      try {
        window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(migrated));
        window.localStorage.removeItem(LEGACY_SIDEBAR_KEY);
      } catch {
        // A blocked browser still gets the recovered session value.
      }
      return migrated;
    }
  } catch {
    // localStorage may be unavailable, blocked or corrupted.
  }
  return DEFAULT_PREFERENCES;
}

export function writePreferences(preferences: Preferences): boolean {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

type PreferencesContextValue = {
  preferences: Preferences;
  updatePreferences: (patch: Partial<Omit<Preferences, 'version'>>) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);

  useEffect(() => {
    writePreferences(preferences);
  }, [preferences]);

  function updatePreferences(patch: Partial<Omit<Preferences, 'version'>>) {
    setPreferences((current) => ({
      ...current,
      ...patch,
      version: 1,
    }));
  }

  function resetPreferences() {
    setPreferences(DEFAULT_PREFERENCES);
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider is required');
  return value;
}
