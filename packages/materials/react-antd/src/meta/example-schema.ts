import { cardSchema, type IExample } from '@opentiny/genui-sdk-core';
import nativeFormExampleJson from './examples/native-form.json' with { type: 'json' };
import antdFormExampleJson from './examples/antd-form.json' with { type: 'json' };

type ExampleJson = {
  name: string;
  description?: string;
  schema: unknown;
};

function createExample(json: ExampleJson): IExample {
  return {
    name: json.name,
    description: json.description,
    schema: cardSchema.parse(json.schema),
  };
}

export const examples: IExample[] = [createExample(nativeFormExampleJson), createExample(antdFormExampleJson)];
