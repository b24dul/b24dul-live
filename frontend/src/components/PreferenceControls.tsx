import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import { GlassPanel, SecondaryButton, StatusIndicator, Toast } from './ui';

type Option<T extends string> = { value: T; label: string; detail: string };

function PreferenceField<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="preference-field">
      <legend className="text-base font-semibold">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            className="preference-option"
            key={option.value}
            data-selected={value === option.value}
          >
            <input
              type="radio"
              name={legend}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="flex-1">
              <span className="block font-semibold">{option.label}</span>
              <span className="mt-1 block text-sm text-slate-300">{option.detail}</span>
            </span>
            {value === option.value && (
              <Check aria-hidden="true" size={19} className="text-brand-cyan" />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PreferenceControls() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [notice, setNotice] = useState(false);
  return (
    <>
      <GlassPanel className="p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Appearance and layout</h2>
          <StatusIndicator status="success">Changes apply immediately</StatusIndicator>
        </div>
        <p className="mb-7 text-sm text-slate-300">
          These settings are stored in this browser only. The accessible dark theme stays enabled;
          no account, login tokens or Firebase records are used.
        </p>
        <div className="flex flex-col gap-7">
          <PreferenceField
            legend="Accent colour"
            value={preferences.accent}
            options={[
              { value: 'violet', label: 'Violet', detail: 'Signature purple accents' },
              { value: 'cyan', label: 'Cyan', detail: 'Brighter blue highlights' },
            ]}
            onChange={(accent) => updatePreferences({ accent })}
          />
          <PreferenceField
            legend="Content density"
            value={preferences.density}
            options={[
              { value: 'comfortable', label: 'Comfortable', detail: 'Roomier cards and spacing' },
              { value: 'compact', label: 'Compact', detail: 'More content in view' },
            ]}
            onChange={(density) => updatePreferences({ density })}
          />
          <PreferenceField
            legend="Motion"
            value={preferences.motion}
            options={[
              {
                value: 'system',
                label: 'Follow device',
                detail: 'Respect reduced-motion settings',
              },
              {
                value: 'reduce',
                label: 'Reduce motion',
                detail: 'Minimise animation in this preview',
              },
            ]}
            onChange={(motion) => updatePreferences({ motion })}
          />
          <PreferenceField
            legend="Homepage layout"
            value={preferences.homeLayout}
            options={[
              {
                value: 'standard',
                label: 'Discover first',
                detail: 'Explore the platform before featured games',
              },
              {
                value: 'games-first',
                label: 'Games first',
                detail: 'Move featured games above discovery',
              },
            ]}
            onChange={(homeLayout) => updatePreferences({ homeLayout })}
          />
          <PreferenceField
            legend="Desktop sidebar"
            value={preferences.sidebarCollapsed ? 'collapsed' : 'expanded'}
            options={[
              { value: 'expanded', label: 'Expanded', detail: 'Show full section names' },
              { value: 'collapsed', label: 'Collapsed', detail: 'Show compact icon navigation' },
            ]}
            onChange={(sidebar) => updatePreferences({ sidebarCollapsed: sidebar === 'collapsed' })}
          />
        </div>
        <div className="mt-8 border-t border-white/15 pt-6">
          <SecondaryButton
            onClick={() => {
              resetPreferences();
              setNotice(true);
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset appearance settings
          </SecondaryButton>
        </div>
      </GlassPanel>
      {notice && (
        <Toast
          message="Appearance settings restored to defaults"
          tone="success"
          onDismiss={() => setNotice(false)}
        />
      )}
    </>
  );
}
