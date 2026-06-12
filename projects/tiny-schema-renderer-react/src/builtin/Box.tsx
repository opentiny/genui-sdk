import type { ReactNode, CSSProperties } from 'react';
import { parseInlineStyle } from '../engine/parse-inline-style';

export interface BoxProps {
  children?: ReactNode;
  className?: string;
  style?: string | CSSProperties;
}

export function Box({ children, className, style }: BoxProps) {
  const resolvedStyle = typeof style === 'string' ? parseInlineStyle(style) : style;
  return (
    <div className={className} style={resolvedStyle}>
      {children}
    </div>
  );
}
