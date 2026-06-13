import type { CardSchema, IExample } from '@opentiny/genui-sdk-core';
import antdFormExampleJson from './antd-form-example.json' with { type: 'json' };

export const antdFormExample = antdFormExampleJson.schema as CardSchema;

export const antdExamples: IExample[] = [
  {
    name: antdFormExampleJson.name,
    description: antdFormExampleJson.description,
    schema: antdFormExample,
  },
];
