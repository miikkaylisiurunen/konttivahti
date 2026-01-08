import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-outline bg-surface-1/40 p-4 sm:p-6 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </div>
  );
}
