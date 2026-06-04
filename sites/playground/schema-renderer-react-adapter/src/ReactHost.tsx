import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  PageContextProvider,
  SchemaRenderer,
  type GenuiRendererHandle,
  type ICustomAction,
} from '@opentiny/genui-sdk-react';
import { antdRegistry } from '@opentiny/genui-sdk-materials-react-antd/extend-renderer';
import type { RootNode } from '@opentiny/genui-sdk-core';
import 'antd/dist/reset.css';

export type ReactHostContentProps = {
  schema: RootNode;
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

    const isJsonComplete = props.generating ? false : (props.isJsonComplete ?? true);

    return (
      <PageContextProvider customActions={props.customActions}>
        <div className="schema-render-container">
          <SchemaRenderer
            ref={(instance) => {
              rendererRef.current = instance;
              flushPendingContext();
            }}
            schema={props.schema}
            customComponents={antdRegistry}
            generating={props.generating}
            isJsonComplete={isJsonComplete}
            customActions={props.customActions}
            id={props.id}
            state={props.state}
          />
        </div>
      </PageContextProvider>
    );
  },
);
