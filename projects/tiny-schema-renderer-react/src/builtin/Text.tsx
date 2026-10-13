import type { ReactNode } from 'react';

export function Text({
  text,
  children,
  className,
  class: cls,
}: {
  text?: string;
  children?: ReactNode;
  className?: string;
  class?: string;
}) {
  return <span className={className || cls}>{children ?? text}</span>;
}
