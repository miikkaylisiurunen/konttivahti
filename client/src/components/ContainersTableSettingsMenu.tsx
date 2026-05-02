import { Menu } from '@base-ui/react/menu';
import type { ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useContainerTable } from '../hooks/useContainerTable';
import {
  COLUMNS,
  STATUS_FILTERS,
  STATUS_LABELS,
  type DateFormat,
  type StatusVariant,
} from '../utils/containerUtils';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50];
const popupBaseClassName =
  'cursor-default select-none rounded-xl border border-outline bg-surface-0 p-1 text-foreground-strong shadow-popover transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0';

interface SubmenuProps {
  trigger: ReactNode;
  popupClassName: string;
  children: ReactNode;
}

interface CheckboxOptionProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  start: ReactNode;
  label: string;
}

interface RadioOptionProps {
  value: string;
  label: string;
}

function Submenu({ trigger, popupClassName, children }: SubmenuProps) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        openOnHover
        className="flex w-full cursor-default select-none items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground transition data-highlighted:bg-surface-2/70 data-popup-open:bg-surface-2/70"
      >
        <span className="mr-2">{trigger}</span>
        <ChevronRight className="size-4 text-foreground-muted" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} alignOffset={-4}>
          <Menu.Popup className={popupClassName}>
            <div className="max-h-(--available-height) overflow-y-auto">{children}</div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

function CheckboxOption({ checked, disabled, onCheckedChange, start, label }: CheckboxOptionProps) {
  return (
    <Menu.CheckboxItem
      checked={checked}
      disabled={disabled}
      closeOnClick={false}
      onCheckedChange={onCheckedChange}
      className="flex cursor-default items-center rounded-lg px-3 py-2 text-sm outline-none transition data-highlighted:bg-surface-2/70"
    >
      <span className="mr-3 flex shrink-0 items-center">{start}</span>
      <span>{label}</span>
      <Menu.CheckboxItemIndicator
        keepMounted
        className={`ml-auto flex items-center justify-end ${!checked ? 'opacity-0' : ''}`}
      >
        <Check className="size-4" />
      </Menu.CheckboxItemIndicator>
    </Menu.CheckboxItem>
  );
}

function RadioOption({ value, label }: RadioOptionProps) {
  return (
    <Menu.RadioItem
      value={value}
      className="flex cursor-default items-center rounded-lg px-3 py-2 text-sm outline-none transition data-highlighted:bg-surface-2/70"
    >
      <span>{label}</span>
      <Menu.RadioItemIndicator className="ml-auto flex items-center justify-center">
        <Check className="size-4" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}

export function ContainersTableSettingsMenu() {
  const { settings, handleSettingsChange } = useContainerTable();
  const { statusFilters, dateFormat, itemsPerPage, visibleColumns } = settings;

  const renderStatusDots = () => {
    const activeStatuses = STATUS_FILTERS.filter((status) => statusFilters.includes(status.value));
    if (activeStatuses.length === 0) return null;

    return (
      <span className="flex -space-x-1.5">
        {activeStatuses.map((status) => (
          <span
            key={status.value}
            className={`h-2.5 w-2.5 rounded-full border border-surface-0 ${status.dotClass}`}
          />
        ))}
      </span>
    );
  };

  const handleStatusToggle = (status: StatusVariant, checked: boolean) => {
    if (checked) {
      handleSettingsChange({ ...settings, statusFilters: [...statusFilters, status] });
      return;
    }

    handleSettingsChange({
      ...settings,
      statusFilters: statusFilters.filter((value) => value !== status),
    });
  };

  const handleColumnToggle = (column: (typeof visibleColumns)[number], checked: boolean) => {
    if (checked) {
      handleSettingsChange({ ...settings, visibleColumns: [...visibleColumns, column] });
      return;
    }

    handleSettingsChange({
      ...settings,
      visibleColumns: visibleColumns.filter((value) => value !== column),
    });
  };

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full min-w-50 cursor-default select-none items-center justify-between rounded-xl border border-outline bg-surface-0 px-4 py-2.5 text-sm text-foreground-strong transition hover:border-outline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus data-popup-open:border-outline-strong xs:w-auto">
        <span className="mr-3 flex items-center font-medium text-foreground-strong">
          <SlidersHorizontal className="size-4 text-foreground-strong mr-2" />
          Settings
        </span>
        <ChevronDown className="size-4 text-foreground-muted" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end">
          <Menu.Popup className={`min-w-50 ${popupBaseClassName}`}>
            <Submenu
              trigger={
                <span className="flex flex-1 items-center text-sm">
                  <span className="font-medium mr-2">Status</span>
                  {renderStatusDots()}
                </span>
              }
              popupClassName={`min-w-46 ${popupBaseClassName}`}
            >
              {STATUS_FILTERS.map((status) => {
                const isSelected = statusFilters.includes(status.value);

                return (
                  <CheckboxOption
                    key={status.value}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleStatusToggle(status.value, checked)}
                    start={<span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />}
                    label={STATUS_LABELS[status.value]}
                  />
                );
              })}
            </Submenu>

            <Submenu
              trigger={`Columns (${visibleColumns.length} of ${COLUMNS.length})`}
              popupClassName={`min-w-60 ${popupBaseClassName}`}
            >
              {COLUMNS.map((column) => {
                const isSelected = visibleColumns.includes(column.key);
                const isLastVisible = isSelected && visibleColumns.length === 1;

                return (
                  <CheckboxOption
                    key={column.key}
                    checked={isSelected}
                    disabled={isLastVisible}
                    onCheckedChange={(checked) => handleColumnToggle(column.key, checked)}
                    start={<column.Icon className="size-3.5 text-foreground-muted" />}
                    label={column.label}
                  />
                );
              })}
            </Submenu>

            <Submenu trigger="Date" popupClassName={`min-w-48 ${popupBaseClassName}`}>
              <Menu.RadioGroup
                value={dateFormat}
                onValueChange={(value) => {
                  handleSettingsChange({
                    ...settings,
                    dateFormat: value as DateFormat,
                  });
                }}
              >
                <RadioOption value={'relative' satisfies DateFormat} label="Relative" />
                <RadioOption value={'absolute' satisfies DateFormat} label="Local" />
                <RadioOption value={'iso' satisfies DateFormat} label="UTC (ISO 8601)" />
              </Menu.RadioGroup>
            </Submenu>

            <Submenu trigger="Per page" popupClassName={`min-w-26 ${popupBaseClassName}`}>
              <Menu.RadioGroup
                value={String(itemsPerPage)}
                onValueChange={(value) => {
                  handleSettingsChange({
                    ...settings,
                    itemsPerPage: Number.parseInt(value, 10),
                  });
                }}
              >
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <RadioOption key={option} value={String(option)} label={String(option)} />
                ))}
              </Menu.RadioGroup>
            </Submenu>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
