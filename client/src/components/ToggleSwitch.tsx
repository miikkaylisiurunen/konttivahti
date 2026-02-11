import { Switch } from '@base-ui/react/switch';

type ToggleSwitchProps = {
  defaultChecked?: boolean;
  checked?: boolean;
  id?: string;
  onCheckedChange?: (checked: boolean) => void;
};

export function ToggleSwitch({ defaultChecked, checked, id, onCheckedChange }: ToggleSwitchProps) {
  return (
    <Switch.Root
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      id={id}
      className="relative flex h-6 w-10 rounded-full bg-surface-2 p-0.5 transition-colors duration-150 data-checked:bg-foreground-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0"
    >
      <Switch.Thumb className="aspect-square h-full rounded-full bg-foreground-subtle transition duration-150 data-checked:bg-surface-1 data-checked:translate-x-4" />
    </Switch.Root>
  );
}
