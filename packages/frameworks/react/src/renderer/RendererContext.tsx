import { createContext, useContext } from 'react';
import type { SchemaRendererProps, SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';

export type SchemaRendererComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<SchemaRendererProps> & React.RefAttributes<SchemaRendererHandle>
>;

export const RendererContext = createContext<SchemaRendererComponent | null>(null);

export function useSchemaRenderer(): SchemaRendererComponent | null {
  return useContext(RendererContext);
}
