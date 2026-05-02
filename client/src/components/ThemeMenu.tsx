import { Menu } from '@base-ui/react/menu';
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../contexts/ThemeContext';

const themeOptions: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function ThemeMenu() {
  const { themeMode, setThemeMode } = useTheme();
  const selectedOption =
    themeOptions.find((option) => option.value === themeMode) ?? themeOptions[2];
  const SelectedIcon = selectedOption.Icon;

  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex shrink-0 items-center justify-center rounded-xl border border-outline bg-surface-0/60 px-3.5 py-2.5 text-sm font-medium text-foreground-strong transition-colors duration-150 hover:bg-surface-1/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus max-md:p-3">
        <SelectedIcon className="size-4" aria-hidden="true" />
        <span className="ml-2 max-md:hidden">{selectedOption.label}</span>
        <ChevronDown
          className="ml-2 size-4 text-foreground-muted max-md:hidden"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end">
          <Menu.Popup className="min-w-36 cursor-default select-none rounded-xl border border-outline bg-surface-0 p-1 text-foreground-strong shadow-popover transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.RadioGroup
              value={themeMode}
              onValueChange={(value) => setThemeMode(value as ThemeMode)}
            >
              {themeOptions.map(({ value, label, Icon }) => (
                <Menu.RadioItem
                  key={value}
                  value={value}
                  className="flex cursor-default items-center rounded-lg px-3 py-2 text-sm outline-none transition data-highlighted:bg-surface-2/70"
                >
                  <Icon className="mr-3 size-4 text-foreground-muted" aria-hidden="true" />
                  <span>{label}</span>
                  <Menu.RadioItemIndicator className="ml-auto flex items-center justify-center">
                    <Check className="size-4" aria-hidden="true" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
