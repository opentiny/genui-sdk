import { modifyChatBody as continueGeneratingBodyModifier } from '../continue-writing';
import type { OpenApiToolServiceConfig } from '../components/common.types';
import { DEFAULT_COMPONENT_LIB } from '../components/materials-tab';

type MaterialsMetaVariantKey = 'mini' | 'standard';
export interface IMcpServerConfig {
  name: string;
  url: string;
  description?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface IAgentConfig {
  name: string;
  agentCardUrl: string;
  description?: string;
  enabled?: boolean;
  // 以下字段来自 Agent Card，可选透传给服务端
  version?: string;
  api?: {
    type?: string;
    url?: string;
    version?: string;
  };
  auth?: {
    type?: string;
    instructions?: string;
  };
  capabilities?: string[];
}

export interface ISkillConfig {
  name: string;
  description?: string;
  modules?: Record<string, string>;
  enabled?: boolean;
}

export type IOpenApiToolServiceConfig = OpenApiToolServiceConfig;

export interface IPlaygroundConfig {
  mcpServers: IMcpServerConfig[];
  framework: string;
  componentLib?: 'TinyVue' | 'Element' | 'TinyNg';
  promptList: string[];
  model: string;
  temperature: number;
  agents: IAgentConfig[];
  skills: ISkillConfig[];
  openApiTools: IOpenApiToolServiceConfig[];
  promptVariant?: MaterialsMetaVariantKey;
}

/** 仅序列化已启用的 Skill，并去掉 enabled 字段以减小 metadata 体积 */
export function skillsPayloadForChat(skills: ISkillConfig[]): Omit<ISkillConfig, 'enabled'>[] {
  return skills.filter((skill) => skill.enabled !== false).map(({ enabled: _enabled, ...rest }) => rest);
}

export const modifyBody = (body: any) => {
  continueGeneratingBodyModifier(body);

  return body;
};

// 创建 customFetch，将 mcpServers、framework、promptList、model 和 temperature 传递到 metadata
export const createCustomFetch = (getConfig: () => IPlaygroundConfig) => {
  return (url: string, options) => {
    const body = JSON.parse(options.body);
    const config = getConfig();
    const {
      mcpServers,
      framework,
      componentLib,
      promptList,
      model,
      temperature,
      agents = [],
      skills = [],
      openApiTools = [],
      promptVariant,
    } = config;

    const fw = framework || 'Vue';
    const playgroundConfig = {
      mcpServers,
      framework: fw,
      componentLib: componentLib || DEFAULT_COMPONENT_LIB[fw] || 'TinyVue',
      promptList,
      model,
      temperature,
      agents: agents.filter((agent) => agent.enabled),
      skills: skillsPayloadForChat(skills),
      promptVariant: promptVariant || 'standard',
      openApiTools: openApiTools.filter((tool) => tool.enabled !== false),
    };

    return fetch(url, {
      ...options,
      body: JSON.stringify({
        ...modifyBody(body),
        metadata: { ...(body.metadata || {}), playground: JSON.stringify(playgroundConfig) },
      }),
    });
  };
};
