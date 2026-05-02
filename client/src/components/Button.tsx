import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
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
      'border border-surface-inverse bg-surface-inverse text-foreground-inverse hover:border-foreground-faint hover:bg-foreground-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:border-outline-strong disabled:bg-outline-strong disabled:text-foreground-muted',
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

type CompactButtonProps = Omit<ComponentProps<typeof Button>, 'label' | 'className' | 'size'> & {
  compactUntil?: 'sm' | 'md';
  label?: ReactNode;
  className?: string;
};

export function CompactButton({
  compactUntil = 'sm',
  label,
  className,
  ...rest
}: CompactButtonProps) {
  const sharedClassName = className ?? '';
  const labeledClassName = {
    sm: 'max-sm:hidden',
    md: 'max-md:hidden',
  }[compactUntil];
  const iconClassName = {
    sm: 'sm:hidden',
    md: 'md:hidden',
  }[compactUntil];

  return (
    <>
      <Button {...rest} label={label} className={`${labeledClassName} ${sharedClassName}`} />
      <Button
        {...rest}
        size="icon"
        icon={rest.icon}
        className={`${iconClassName} ${sharedClassName}`}
      />
    </>
  );
}
