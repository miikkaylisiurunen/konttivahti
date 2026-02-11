import { useId } from 'react';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingsEventToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsEventToggle({
  label,
  description,
  checked,
  onChange,
}: SettingsEventToggleProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between rounded-xl border border-outline bg-surface-0/60 px-4 py-3 transition hover:bg-surface-1/60">
      <div className="mr-4">
        <label htmlFor={id} className="text-sm text-foreground">
          {label}
        </label>
        <div className="mt-1 text-xs text-foreground-subtle">{description}</div>
      </div>
      <ToggleSwitch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
