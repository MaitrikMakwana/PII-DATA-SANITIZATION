import React from 'react';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: LucideIcon;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  children: React.ReactNode;
}

export function ActionButton({
  variant = 'default',
  size = 'default',
  icon: Icon,
  iconPosition = 'start',
  loading = false,
  children,
  disabled,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="mr-2" />
          {children}
        </>
      ) : (
        <>
          {Icon && iconPosition === 'start' && <Icon className="mr-2 h-4 w-4" />}
          {children}
          {Icon && iconPosition === 'end' && <Icon className="ml-2 h-4 w-4" />}
        </>
      )}
    </Button>
  );
}
