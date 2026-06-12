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
  PageContextProvider,
  SchemaRenderer,
  type GenuiRendererHandle,
  type ICustomAction,
} from '@opentiny/genui-sdk-react';
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
  getRendererHandle: () => GenuiRendererHandle | null;
  setContext: (ctx: Record<string, unknown>) => void;
};

const ReactHostRenderer = forwardRef<
  GenuiRendererHandle,
  ReactHostContentProps & { onReady?: () => void }
>(function ReactHostRenderer({ onReady, ...props }, ref) {
  const rendererRef = useRef<GenuiRendererHandle | null>(null);

  /**
   * 对齐 Vue SchemaCardRenderer：流式属性通过 ref 注入基础渲染器，而非 SchemaRenderer props。
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
    (instance: GenuiRendererHandle | null) => {
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
      <GenuiConfigProvider materials={antdMaterials}>
        <PageContextProvider
          customActions={props.customActions}
          settings={{ materials: antdMaterials }}
        >
          <div className="schema-render-container">
            <ReactHostRenderer
              ref={(instance) => {
                rendererRef.current = instance;
                flushPendingContext();
              }}
              {...props}
            />
          </div>
        </PageContextProvider>
      </GenuiConfigProvider>
    );
  },
);
