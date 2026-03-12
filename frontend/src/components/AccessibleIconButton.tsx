import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type AccessibleIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> & {
  ariaLabel: string;
  children: ReactNode;
};

export function AccessibleIconButton({
  ariaLabel,
  children,
  className,
  type = 'button',
  ...props
}: AccessibleIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={cn('icon-button', className)}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
