import type { ComponentType, ReactNode } from 'react';
import { Box } from './Box';
import { Text } from './Text';
import { Img } from './Img';
import { Button } from './Button';
import { Input } from './Input';
import { Slot } from './Slot';
import type { ComponentRegistry, ComponentRenderProps } from '../types';

function wrap<C extends Record<string, unknown>>(
  Component: ComponentType<C>,
): (p: ComponentRenderProps<C>) => ReactNode {
  return ({ props, children, emit }) => {
    const onClick = props.onClick as (() => void) | undefined;
    return (
      <Component
        {...(props as C)}
        onClick={onClick ?? (props.onPress ? () => emit('press') : undefined)}
      >
        {children}
      </Component>
    );
  };
}

export const builtinRegistry: ComponentRegistry = {
  Page: ({ children }) => <div className="genui-page">{children}</div>,
  Box: wrap(Box),
  div: wrap(Box),
  Text: wrap(Text),
  span: ({ props, children }) => <span {...props}>{children ?? (props as { text?: string }).text}</span>,
  Img: wrap(Img),
  img: wrap(Img),
  Button: wrap(Button),
  button: wrap(Button),
  Input: wrap(Input),
  input: wrap(Input),
  Slot: wrap(Slot),
};