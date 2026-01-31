import { Field } from '@base-ui/react/field';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, name, type = 'text', ...rest }, ref) => {
    return (
      <Field.Root name={name} className="flex flex-col space-y-2">
        {label ? (
          <Field.Label className="text-sm font-medium text-foreground">{label}</Field.Label>
        ) : null}
        <Field.Control
          ref={ref}
          name={name}
          type={type}
          className={`w-full rounded-xl border border-outline bg-surface-0/60 px-4 py-2.5 text-sm text-foreground-strong placeholder:text-foreground-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ''}`}
          {...rest}
        />
      </Field.Root>
    );
  },
);
