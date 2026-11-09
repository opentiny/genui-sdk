import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import type { IRendererExpose } from '@opentiny/genui-sdk-react';
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
    const rendererRef = useRef<IRendererExpose | null>(null);
    const onRendererReadyRef = useRef(onRendererReady);
    onRendererReadyRef.current = onRendererReady;

    useImperativeHandle(ref, () => ({
      updateProps: setProps,
      getRendererHandle: () => rendererRef.current,
      setContext: (ctx) => rendererRef.current?.rendererInstance?.setContext(ctx),
      setState: (state) => rendererRef.current?.setState(state),
    }));

    const setRendererRef = useCallback((instance: IRendererExpose | null) => {
      rendererRef.current = instance;
      if (instance) onRendererReadyRef.current?.();
    }, []);

    return React.createElement(
      GenuiConfigProvider,
      { materials: reactMaterials },
      React.createElement(GenuiRenderer, {
        ref: setRendererRef,
        content: props.content,
        generating: props.generating,
        isJsonComplete: props.isJsonComplete,
        customActions: props.customActions,
      }),
    );
  },
);
