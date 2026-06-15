import type { CardSchema, IExample } from '@opentiny/genui-sdk-core';
import nativeFormExampleJson from './native-form-example.json' with { type: 'json' };
import antdFormExampleJson from './antd-form-example.json' with { type: 'json' };

type ExampleJson = {
  name: string;
  description?: string;
  schema: CardSchema;
};

/**
 * 将 JSON 示例文件转为 genPrompt 使用的 IExample 结构。
 */
function toExample(json: ExampleJson): IExample {
  return {
    name: json.name,
    description: json.description,
    schema: json.schema,
  };
}

export const nativeFormExample = nativeFormExampleJson.schema as CardSchema;
export const antdFormExample = antdFormExampleJson.schema as CardSchema;

export const antdExamples: IExample[] = [toExample(antdFormExampleJson)];
export const examples: IExample[] = [
  toExample(nativeFormExampleJson),
  ...antdExamples,
];
