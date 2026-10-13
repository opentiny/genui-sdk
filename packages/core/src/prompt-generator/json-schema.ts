import { type JsonSchema7Type, zodToJsonSchema } from 'zod-to-json-schema';
import { genRootSchema } from '../protocols';
import { ZodTypeAny } from 'zod';

export function genJsonSchemaPrompt(schemaJson: JsonSchema7Type) {
  return `## 卡片的 JSON Schema

\`\`\`json
${JSON.stringify(schemaJson)}
\`\`\`
`;
}

export function genSchema(whiteList: string[]) {
  return genRootSchema(whiteList) as ZodTypeAny;
}

export function genJsonSchema(whiteList: string[]) {
  //TODO: remove this "Type instantiation is excessively deep and possibly infinite."
  // @ts-ignore 
  return zodToJsonSchema(genSchema(whiteList)) as JsonSchema7Type;
}

