import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Notify } from './engine/notify';
import type { PageContextValue } from './engine';

type SchemaErrorBoundaryProps = PropsWithChildren<{
  componentName?: string;
  resetKey?: unknown;
  notifyContext?: PageContextValue;
}>;

type SchemaErrorBoundaryState = {
  error: Error | null;
};

export class SchemaErrorBoundary extends Component<SchemaErrorBoundaryProps, SchemaErrorBoundaryState> {
  state: SchemaErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SchemaErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: SchemaErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const name = this.props.componentName || 'Schema';
    console.error(`SchemaRenderer ${name} render error:`, error, info.componentStack);
    Notify(
      {
        type: 'warning',
        title: `${name} rendering error`,
        message: error.message,
      },
      this.props.notifyContext,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          data-tag="schema-error"
          style={{ color: '#c00', fontSize: 13, lineHeight: '20px', padding: '4px 0' }}
        >
          {this.props.componentName ? `${this.props.componentName} failed to render: ` : 'Failed to render: '}
          {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
