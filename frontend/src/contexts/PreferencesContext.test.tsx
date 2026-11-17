import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  LEGACY_SIDEBAR_KEY,
  PREFERENCES_KEY,
  PreferencesProvider,
  parsePreferences,
  readPreferences,
  usePreferences,
} from './PreferencesContext';

describe('versioned local preferences', () => {
  beforeEach(() => window.localStorage.clear());

  it('validates the schema and rejects missing or invalid values', () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, accent: 'red' })).toBeNull();
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, version: 2 })).toBeNull();
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, sidebarCollapsed: 'yes' })).toBeNull();
    expect(parsePreferences(null)).toBeNull();
    expect(parsePreferences(DEFAULT_PREFERENCES)).toEqual(DEFAULT_PREFERENCES);
  });

  it('recovers safely from corrupt storage and future-schema values', () => {
    window.localStorage.setItem(PREFERENCES_KEY, '{not valid json');
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(window.localStorage.getItem(PREFERENCES_KEY)).toBeNull();
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 20 }));
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('migrates the earlier desktop sidebar preference once', () => {
    window.localStorage.setItem(LEGACY_SIDEBAR_KEY, 'true');
    expect(readPreferences().sidebarCollapsed).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || '{}').sidebarCollapsed).toBe(
      true,
    );
    expect(window.localStorage.getItem(LEGACY_SIDEBAR_KEY)).toBeNull();
  });

  it('does not let an old key override newer saved preferences', () => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    window.localStorage.setItem(LEGACY_SIDEBAR_KEY, 'true');
    expect(readPreferences().sidebarCollapsed).toBe(false);
  });

  it('updates UI state and persists only non-sensitive appearance preferences', () => {
    function Fixture() {
      const { preferences, updatePreferences, resetPreferences } = usePreferences();
      return (
        <>
          <output>{preferences.accent}</output>
          <button onClick={() => updatePreferences({ accent: 'cyan', density: 'compact' })}>
            Change preferences
          </button>
          <button onClick={resetPreferences}>Reset preferences</button>
        </>
      );
    }
    render(
      <PreferencesProvider>
        <Fixture />
      </PreferencesProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change preferences' }));
    expect(screen.getByText('cyan')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || '{}')).toMatchObject({
      version: 1,
      accent: 'cyan',
      density: 'compact',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset preferences' }));
    expect(screen.getByText('violet')).toBeInTheDocument();
  });

  it('keeps working when saving preferences is blocked', () => {
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    function Fixture() {
      const { preferences, updatePreferences } = usePreferences();
      return (
        <button onClick={() => updatePreferences({ accent: 'cyan' })}>{preferences.accent}</button>
      );
    }
    try {
      render(
        <PreferencesProvider>
          <Fixture />
        </PreferencesProvider>,
      );
      act(() => fireEvent.click(screen.getByRole('button', { name: 'violet' })));
      expect(screen.getByRole('button', { name: 'cyan' })).toBeInTheDocument();
    } finally {
      spy.mockRestore();
      expect(Storage.prototype.setItem).toBe(original);
    }
  });
});
