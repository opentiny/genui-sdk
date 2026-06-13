import type { ReactNode } from 'react';

export function Button({
  children,
  text,
  onClick,
  onPress,
  className,
  type = 'button',
}: {
  children?: ReactNode;
  text?: string;
  onClick?: () => void;
  onPress?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  return (
    <button type={type} className={className} onClick={onClick ?? onPress}>
      {children ?? text}
    </button>
  );
}
