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
} from '@opentiny/tiny-schema-renderer-react';
import { antdMaterials } from '@opentiny/genui-sdk-materials-react-antd/components';
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
  getRendererHandle: () => SchemaRendererHandle | null;
  setContext: (ctx: Record<string, unknown>) => void;
};

const ReactHostRenderer = forwardRef<
  SchemaRendererHandle,
  ReactHostContentProps & { onReady?: () => void }
>(function ReactHostRenderer({ onReady, ...props }, ref) {
  const rendererRef = useRef<SchemaRendererHandle | null>(null);

  /**
   * 流式属性通过 ref 注入 SchemaRenderer，而非 SchemaRenderer props。
   */
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

  return <SchemaRenderer ref={setRendererRef} schema={props.schema} />;
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

    return (
      <GenuiConfigProvider materials={antdMaterials}>
        <ReactHostWithMaterials
          props={props}
          rendererRef={rendererRef}
          flushPendingContext={flushPendingContext}
        />
      </GenuiConfigProvider>
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

  return (
    <RendererContextProvider render-settings={{ materials }}>
      <div className="schema-render-container">
        <ReactHostRenderer
          ref={(instance) => {
            rendererRef.current = instance;
            flushPendingContext();
          }}
          {...props}
        />
      </div>
    </RendererContextProvider>
  );
}
