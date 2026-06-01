import type { ComponentType, ReactNode } from 'react';
import type { ComponentRenderProps } from '@opentiny/genui-sdk-react';

type MapPropsFn<P> = (
  props: Record<string, unknown>,
  emit: (event: string) => void,
) => P;

export function adapt<P extends Record<string, unknown>>(
  Component: ComponentType<any>,
  mapProps?: MapPropsFn<P>,
) {
  return ({ props, children, emit }: ComponentRenderProps): ReactNode => {
    const mapped = mapProps?.(props, emit) ?? (props as P);
    const { children: mappedChildren, ...rest } = mapped as P & { children?: ReactNode };
    const content = children ?? mappedChildren ?? (props.text as ReactNode);
    return <Component {...(rest as P)}>{content}</Component>;
  };
}

export function pickStyle(props: Record<string, unknown>) {
  const { style, className } = props;
  return {
    style: style as React.CSSProperties | undefined,
    className: className as string | undefined,
  };
}

export function bindClick(props: Record<string, unknown>, emit: (event: string) => void) {
  const onClick = props.onClick as (() => void) | undefined;
  return onClick ?? (() => emit('click'));
}

export function mapCardVariant(props: Record<string, unknown>): 'outlined' | 'borderless' | 'filled' {
  if (props.variant === 'outlined' || props.variant === 'borderless' || props.variant === 'filled') {
    return props.variant;
  }
  if (props.bordered === false) {
    return 'borderless';
  }
  return 'outlined';
}

export function bindModelChange(
  props: Record<string, unknown>,
  emit: (event: string) => void,
  directValue = false,
) {
  const onChange = props.onChange as ((v: unknown) => void) | undefined;
  const onUpdate = props['onUpdate:value'] as ((v: unknown) => void) | undefined;
  const handler = onUpdate ?? onChange;
  if (!handler) return undefined;
  return (v: unknown) => {
    handler(v);
    emit('change');
  };
}
