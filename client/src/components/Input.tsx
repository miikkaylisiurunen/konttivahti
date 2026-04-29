import { Field } from '@base-ui/react/field';
import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, name, type = 'text', ...rest }, ref) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && isRevealed ? 'text' : type;
    const Icon = isRevealed ? EyeOff : Eye;
    const revealTitle = isRevealed ? 'Hide value' : 'Show value';

    return (
      <Field.Root name={name} className="flex flex-col space-y-2">
        {label ? (
          <Field.Label className="text-sm font-medium text-foreground">{label}</Field.Label>
        ) : null}
        <div className="relative">
          <Field.Control
            ref={ref}
            name={name}
            type={inputType}
            className={`w-full rounded-xl border border-outline bg-surface-0/60 px-4 py-2.5 text-sm text-foreground-strong placeholder:text-foreground-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60 ${isPassword ? 'pr-10' : ''} ${className ?? ''}`}
            {...rest}
          />
          {isPassword ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground-faint transition-colors hover:text-foreground-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setIsRevealed((current) => !current)}
              disabled={rest.disabled}
              title={revealTitle}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </Field.Root>
    );
  },
);
