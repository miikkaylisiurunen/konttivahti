import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

type ButtonProps = {
  label?: ReactNode;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'icon';
  to?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  label,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'default',
  className,
  to,
  ...rest
}: ButtonProps) {
  const variantClassName = {
    primary:
      'border border-outline bg-surface-0/60 text-foreground-strong hover:bg-surface-1/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60',
    secondary:
      'border border-zinc-200 bg-zinc-200 text-zinc-900 hover:border-zinc-100 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:border-zinc-400 disabled:bg-zinc-400 disabled:text-zinc-700',
    ghost:
      'border border-transparent bg-transparent text-foreground-faint hover:bg-surface-1/40 hover:text-foreground-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:text-foreground-placeholder',
  }[variant];

  const sizeClassName = {
    default: 'space-x-2 px-3.5 py-2.5',
    icon: 'p-3',
  }[size];

  const sharedClassName = `inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed shrink-0 ${variantClassName} ${sizeClassName} ${
    className ?? ''
  }`;

  const content =
    size === 'icon' ? (
      icon
    ) : iconPosition === 'right' ? (
      <>
        {label ? <span>{label}</span> : null}
        {icon ? <span>{icon}</span> : null}
      </>
    ) : (
      <>
        {icon ? <span>{icon}</span> : null}
        {label ? <span>{label}</span> : null}
      </>
    );

  if (to) {
    return (
      <Link to={to} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={sharedClassName} {...rest}>
      {content}
    </button>
  );
}
