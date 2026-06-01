import type { ReactNode } from 'react';

export function Slot({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
