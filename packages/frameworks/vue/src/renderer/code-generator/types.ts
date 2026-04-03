import type { CardSchema } from '@opentiny/genui-sdk-core';

export interface ICodeGeneratorParams {
  pageInfo: {
    schema: CardSchema;
    name?: string;
  };
  componentsMap?: {
    componentName: string;
    package: string;
    exportName?: string;
  }[];
}