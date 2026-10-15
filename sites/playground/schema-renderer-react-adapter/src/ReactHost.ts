import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import type { SchemaRendererHandle } from '@opentiny/genui-sdk-react';
import { materials as reactMaterials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

import type { ReactHostHandle, ReactHostContentProps } from './ReactHost.types';

export type { ReactHostHandle, ReactHostContentProps };

export const ReactHost = forwardRef<
  ReactHostHandle,
  { initial: ReactHostContentProps; onRendererReady?: () => void }
>(
  function ReactHost({ initial, onRendererReady }, ref) {
    const [props, setProps] = useState(initial);
    const rendererRef = useRef<SchemaRendererHandle | null>(null);

    useImperativeHandle(ref, () => ({
      updateProps: setProps,
      getRendererHandle: () => rendererRef.current,
      setContext: (ctx) => rendererRef.current?.setContext(ctx),
    }));

    return React.createElement(
      GenuiConfigProvider,
      { materials: reactMaterials },
      React.createElement(GenuiRenderer, {
        ref: (instance: SchemaRendererHandle | null) => {
          rendererRef.current = instance;
          if (instance) onRendererReady?.();
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
