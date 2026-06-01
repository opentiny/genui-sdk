import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { GenuiRenderer, type GenuiRendererHandle, type ICustomAction } from '@opentiny/genui-sdk-react';
import { antdRegistry } from '@opentiny/genui-sdk-materials-react-antd/extend-renderer';
import 'antd/dist/reset.css';

export type ReactHostContentProps = {
  content: Record<string, unknown>;
  generating?: boolean;
  isJsonComplete?: boolean;
  customActions?: Record<string, ICustomAction>;
  id?: string;
  state?: Record<string, unknown>;
};

export type ReactHostHandle = {
  updateProps: (props: ReactHostContentProps) => void;
  getRendererHandle: () => GenuiRendererHandle | null;
  setContext: (ctx: Record<string, unknown>) => void;
};

export const ReactHost = forwardRef<ReactHostHandle, { initial: ReactHostContentProps }>(
  function ReactHost({ initial }, ref) {
    const [props, setProps] = useState(initial);
    const rendererRef = useRef<GenuiRendererHandle | null>(null);
    const pendingContextRef = useRef<Record<string, unknown>>({});

    const flushPendingContext = () => {
      const renderer = rendererRef.current;
      if (!renderer || !Object.keys(pendingContextRef.current).length) return;
      renderer.setContext({ ...pendingContextRef.current });
    };

    useImperativeHandle(ref, () => ({
      updateProps: setProps,
      getRendererHandle: () => rendererRef.current,
      setContext: (ctx) => {
        pendingContextRef.current = { ...pendingContextRef.current, ...ctx };
        flushPendingContext();
      },
    }));

    return (
      <GenuiRenderer
        ref={(instance) => {
          rendererRef.current = instance;
          flushPendingContext();
        }}
        content={props.content}
        generating={props.generating}
        isJsonComplete={props.isJsonComplete}
        customComponents={antdRegistry}
        customActions={props.customActions}
        id={props.id}
        state={props.state}
      />
    );
  },
);
