import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import type { SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';
import { materials as reactMaterials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

import type { ReactHostHandle, ReactHostContentProps } from './ReactHost.types';

export type { ReactHostHandle, ReactHostContentProps };

export const ReactHost = forwardRef<ReactHostHandle, { initial: ReactHostContentProps }>(
  function ReactHost({ initial }, ref) {
    const [props, setProps] = useState(initial);
    const rendererRef = useRef<SchemaRendererHandle | null>(null);
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

    return React.createElement(
      GenuiConfigProvider,
      { materials: reactMaterials },
      React.createElement(GenuiRenderer, {
        ref: (instance: SchemaRendererHandle | null) => {
          rendererRef.current = instance;
          flushPendingContext();
        },
        content: props.content,
        generating: props.generating,
        isJsonComplete: props.isJsonComplete,
        customActions: props.customActions,
        id: props.id,
        state: props.state,
      }),
    );
  },
);
