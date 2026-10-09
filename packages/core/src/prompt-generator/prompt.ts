import type { IMaterialsMeta } from '../material/materials-meta';
import { genCustomActionsPrompt, type IGenPromptAction } from './action';
import { aboutThis } from './about-this';
import {
  builderExamplesPrompt,
  builderOutputPrompt,
  builderPromptPrefix,
  genBuilderRulesPrompt,
  genJsonPatchSchemaPrompt,
  type IBuilderPromptValidationLevel,
} from './builder';
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

export type IGenPromptMode = 'generate' | 'builder';

export interface IGenPromptBuilderOptions {
  includePatchSchema?: boolean;
  includeExamples?: boolean;
  validationLevel?: IBuilderPromptValidationLevel;
}

export interface IGenPromptOptions {
  /** Prompt task mode. Defaults to `generate` for backward compatibility. */
  mode?: IGenPromptMode;
  isSkill?: boolean;
  includeJsonSchema?: boolean;
  includeSnippets?: boolean;
  includeExamples?: boolean;
  includeActions?: boolean;
  includeAboutThis?: boolean;
  includeBaseRules?: boolean;
  rules?: string[];
  builder?: IGenPromptBuilderOptions;
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
  const mode = options?.mode ?? 'generate';
  const isBuilder = mode === 'builder';
  const includeJsonSchema = options?.includeJsonSchema ?? true;
  const includeSnippets = options?.includeSnippets ?? true;
  const includeExamples = options?.includeExamples ?? true;
  const includeBuilderExamples = options?.builder?.includeExamples ?? includeExamples;
  const includeActions = options?.includeActions ?? true;
  const includeAboutThis = options?.includeAboutThis ?? true;
  const extendWhiteList = getExtendWhiteList(whiteList, customComponents || []);
  const rules = [...(materialRules ?? []), ...(options?.rules ?? [])];

  return [
    isBuilder ? builderPromptPrefix : options?.isSkill ? skillPromptPrefix : promptPrefix,
    genComponentsPrompt(materials, extendWhiteList, customComponents || []),
    includeJsonSchema ? genJsonSchemaPrompt(genJsonSchema(extendWhiteList)) : null,
    !isBuilder && includeExamples
      ? genExamplesPrompt(examples.concat(customExamples || []), wrapperComponent)
      : null,
    isBuilder && options?.builder?.includePatchSchema !== false ? genJsonPatchSchemaPrompt() : null,
    includeSnippets ? genSnippetsPrompt(materials, extendWhiteList, customSnippets || []) : null,
    includeAboutThis ? aboutThis.trim() : null,
    includeActions ? genCustomActionsPrompt(customActions || []) : null,
    isBuilder
      ? genBuilderRulesPrompt({
          validationLevel: options?.builder?.validationLevel,
          rules,
          isSkill: options?.isSkill,
          includeBaseRules: options?.includeBaseRules,
          wrapperComponent,
        })
      : genRulesPrompt(tgCustomConfig, wrapperComponent, { ...options, rules }),
    isBuilder && includeBuilderExamples ? builderExamplesPrompt : null,
    isBuilder ? builderOutputPrompt : null,
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
