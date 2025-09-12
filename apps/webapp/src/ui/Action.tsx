import React from 'react';

type ActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  size?: 'md';
  iconLeft?: React.ReactNode;
};

export const Action: React.FC<ActionProps> = ({
  variant = 'primary',
  size = 'md',
  iconLeft,
  children,
  className = '',
  ...props
}) => {
  const variants: Record<string, string> = {
    primary: 'bg-neutral-100 text-neutral-900',
    ghost: 'bg-transparent text-neutral-100 border border-white/20',
  };

  const sizes: Record<string, string> = {
    md: 'h-11 px-4 text-sm',
  };

  return (
    <button
      className={`action inline-flex items-center justify-center rounded-lg gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {iconLeft && <span className="action__icon">{iconLeft}</span>}
      <span className="action__label">{children}</span>
    </button>
  );
};
