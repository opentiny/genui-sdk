import type { IMaterialsMeta } from '../material/materials-meta';
import { genCustomActionsPrompt, type IGenPromptAction } from './action';
import { aboutThis } from './about-this';
import { genComponentsPrompt, type IGenPromptComponent } from './component';
import { genExamplesPrompt, type IGenPromptExample } from './examples';
import { getFrameworkConfig, type IGenPromptFrameworkConfig, type IGenPromptFramework } from './framework-config';
import { genJsonSchema, genJsonSchemaPrompt } from './json-schema';
import { promptPrefix, skillPromptPrefix } from './prefix';
import { genRulesPrompt } from './rules';
import { genSnippetsPrompt, type IGenPromptSnippet } from './snippet';

export type { IGenPromptAction } from './action';
export type { IGenPromptComponent } from './component';
export type { IGenPromptExample } from './examples';
export type { IGenPromptSnippet } from './snippet';

export interface IGenPromptCustomConfig {
  customComponents?: IGenPromptComponent[];
  customSnippets?: IGenPromptSnippet[];
  customExamples?: IGenPromptExample[];
  customActions?: IGenPromptAction[];
}


export interface IGenPromptOptions {
  isSkill?: boolean;
  includeJsonSchema?: boolean;
  includeSnippets?: boolean;
  includeExamples?: boolean;
  includeActions?: boolean;
  includeAboutThis?: boolean;
  includeBaseRules?: boolean;
  rules?: string[];
}

function getExtendWhiteList(whiteList: string[], customComponents: IGenPromptComponent[]) {
  if (!Array.isArray(customComponents) || customComponents.length === 0) {
    return whiteList;
  }
  const newWhiteList = customComponents.map((component: IGenPromptComponent) => component.component);
  return [...new Set([...whiteList, ...newWhiteList])];
}

function buildPromptSections(
  materialsMeta: IMaterialsMeta,
  tgCustomConfig: IGenPromptCustomConfig | undefined,
  options?: IGenPromptOptions,
) {
  const { materials, examples, whiteList, wrapperComponent, rules: materialRules } = materialsMeta;
  const { customComponents, customSnippets, customExamples, customActions } = tgCustomConfig || {};
  const includeJsonSchema = options?.includeJsonSchema ?? true;
  const includeSnippets = options?.includeSnippets ?? true;
  const includeExamples = options?.includeExamples ?? true;
  const includeActions = options?.includeActions ?? true;
  const includeAboutThis = options?.includeAboutThis ?? true;
  const extendWhiteList = getExtendWhiteList(whiteList, customComponents || []);
  const rules = [...(materialRules ?? []), ...(options?.rules ?? [])];

  return [
    options?.isSkill ? skillPromptPrefix : promptPrefix,
    genComponentsPrompt(materials, extendWhiteList, customComponents || []),
    includeJsonSchema ? genJsonSchemaPrompt(genJsonSchema(extendWhiteList)) : null,
    includeExamples ? genExamplesPrompt(examples.concat(customExamples || []), wrapperComponent) : null,
    includeSnippets ? genSnippetsPrompt(materials, extendWhiteList, customSnippets || []) : null,
    includeAboutThis ? aboutThis.trim() : null,
    includeActions ? genCustomActionsPrompt(customActions || []) : null,
    genRulesPrompt(tgCustomConfig, wrapperComponent, { ...options, rules }),
  ].filter(Boolean);
}

export function genPrompt(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  options?: IGenPromptOptions,
) {
  const frameworkConfig = typeof framework === 'string' ? getFrameworkConfig(framework) : framework;
  const mergedOptions: IGenPromptOptions = {
    ...options,
    rules: [...(frameworkConfig.rules ?? []), ...(options?.rules ?? [])],
  };
  const sections = buildPromptSections(materialsMeta, tgCustomConfig, mergedOptions);
  return sections.join('\n\n');
}
