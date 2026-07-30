import type { IExample } from '../material/materials-meta';
import type { CardSchema } from '../protocols';

export interface IGenPromptExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

function expamleWrapCard(schema: CardSchema, wrapperComponent: string) {
  const newSchema = { ...schema };
  const rootChildren = newSchema.children;
  if (rootChildren) {
    newSchema.children = [{ componentName: wrapperComponent, children: rootChildren }];
  }
  return newSchema;
}

export function genExamplesPrompt(examples: IExample[], wrapperComponent = 'TinyCard') {
  const examplesStr = examples
    .map(
      ({ name, schema }: IExample) =>
        `### ${name}\n\n\`\`\`json\n${JSON.stringify(expamleWrapCard(schema, wrapperComponent))}\n\`\`\``,
    )
    .join('\n\n');
  return `## 卡片示例

${examplesStr}
`;
}
