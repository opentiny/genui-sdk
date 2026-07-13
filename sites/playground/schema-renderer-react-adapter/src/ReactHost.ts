import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  GenuiConfigProvider,
  useGenuiMaterials,
  type ICustomAction,
} from '@opentiny/genui-sdk-react';
import {
  RendererContextProvider,
  SchemaRenderer,
  type SchemaRendererHandle,
  type SchemaRendererProps,
} from '@opentiny/tiny-schema-renderer-react';
import { materials as reactMaterials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

type RootNode = NonNullable<SchemaRendererProps['schema']>;

import type { ReactHostHandle, ReactHostContentProps } from './ReactHost.types';

export type { ReactHostHandle, ReactHostContentProps };

const ReactHostRenderer = forwardRef<
  SchemaRendererHandle,
  ReactHostContentProps & { onReady?: () => void }
>(function ReactHostRenderer({ onReady, ...props }, ref) {
  const rendererRef = useRef<SchemaRendererHandle | null>(null);

  const updateContextAndState = useCallback(() => {
    const instance = rendererRef.current;
    if (!instance) return;

    instance.setContext({
      callAction: (actionName: string, params?: unknown) => {
        if (!props.customActions?.[actionName]) {
          console.warn(`Action ${actionName} not found`);
          return;
        }
        return props.customActions[actionName].execute(params, instance.getContext());
      },
    });
    if (props.id) {
      instance.setContext({ cardId: props.id });
    }
    instance.setState(props.state || {});
  }, [props.customActions, props.id, props.state]);

  const setRendererRef = useCallback(
    (instance: SchemaRendererHandle | null) => {
      rendererRef.current = instance;
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }
      if (instance) {
        updateContextAndState();
        onReady?.();
      }
    },
    [ref, updateContextAndState, onReady],
  );

  useEffect(() => {
    updateContextAndState();
  }, [updateContextAndState]);

  useEffect(() => {
    updateContextAndState();
  }, [props.schema, updateContextAndState]);

  return React.createElement(SchemaRenderer, {
    ref: setRendererRef,
    schema: props.schema,
  });
});

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
      React.createElement(ReactHostWithMaterials, {
        props,
        rendererRef,
        flushPendingContext,
      }),
    );
  },
);

function ReactHostWithMaterials({
  props,
  rendererRef,
  flushPendingContext,
}: {
  props: ReactHostContentProps;
  rendererRef: React.MutableRefObject<SchemaRendererHandle | null>;
  flushPendingContext: () => void;
}) {
  const materials = useGenuiMaterials();

  return React.createElement(
    RendererContextProvider,
    { 'render-settings': { materials } },
    React.createElement(
      'div',
      { className: 'schema-render-container' },
      React.createElement(ReactHostRenderer, {
        ref: (instance: SchemaRendererHandle | null) => {
          rendererRef.current = instance;
          flushPendingContext();
        },
        ...props,
      }),
    ),
  );
}
