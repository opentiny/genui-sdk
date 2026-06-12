import type { ReactNode } from 'react';

export function Button({
  children,
  text,
  onClick,
  className,
  type = 'button',
}: {
  children?: ReactNode;
  text?: string;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  return (
    <button type={type} className={className} onClick={onClick}>
      {children ?? text}
    </button>
  );
}
