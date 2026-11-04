import { type IChatMessage, type IMessageItem, type IStreamDelta } from '@opentiny/genui-sdk-core';
import { v4 as uuidv4 } from 'uuid';
import type { ICompleteResponseJson } from './response-handler';

export type IToolCall = NonNullable<IStreamDelta['tool_calls']>[number];

export interface INonStreamTiming {
  /** 发送请求 → 收到响应头 */
  ttfb: number;
}

const NON_STREAM_TIMING = Symbol('genui.non-stream-timing');

/** 挂在响应对象上但不参与展开 / 序列化，避免混进消息和会话存储 */
export function setNonStreamTiming(json: object, timing: INonStreamTiming) {
  Object.defineProperty(json, NON_STREAM_TIMING, { value: timing, enumerable: false });
}

export function getNonStreamTiming(json: object): INonStreamTiming | undefined {
  return (json as { [NON_STREAM_TIMING]?: INonStreamTiming })[NON_STREAM_TIMING];
}

/** 统一规范后交给解析器的输入 */
export interface IParserBlock {
  field: string;
  text: string;
  value: unknown;
}

export interface IMessageParser {
  id: string;
  /** 处理哪个响应字段 */
  field: string;
  pattern?: RegExp;
  handle: (block: IParserBlock) => IMessageItem | IMessageItem[] | null | void;
}

export interface IParseContext {
  content?: string;
  reasoning_content?: string;
  tool_calls?: IToolCall[];
  [field: string]: unknown;
}

const SCHEMA_JSON_PATTERN = /```schemaJson([\s\S]*?)(?:\n\s*```|$)/;
const THINK_PATTERN = /<think>([\s\S]*?)(?:<\/think>|$)/;

export const schemaJsonParser: IMessageParser = {
  id: 'schema-json',
  field: 'content',
  pattern: SCHEMA_JSON_PATTERN,
  handle(block) {
    const content = SCHEMA_JSON_PATTERN.exec(block.text)?.[1];
    if (!content) return;
    return { type: 'schema-card', content, id: uuidv4() };
  },
};

export const thinkParser: IMessageParser = {
  id: 'think',
  field: 'content',
  pattern: THINK_PATTERN,
  handle(block) {
    const content = THINK_PATTERN.exec(block.text)?.[1];
    if (!content) return;
    return { type: 'reasoning', content, thinking: false };
  },
};

export const reasoningContentParser: IMessageParser = {
  id: 'reasoning-content',
  field: 'reasoning_content',
  handle(block) {
    if (!block.text) return;
    return { type: 'reasoning', content: block.text, thinking: false };
  },
};

export const toolCallParser: IMessageParser = {
  id: 'tool-call',
  field: 'tool_calls',
  handle(block) {
    const toolCall = block.value as IToolCall | undefined;
    if (!toolCall) return;
    return {
      type: 'tool',
      name: toolCall.function.name,
      formatPretty: true,
      status: 'running',
      content: JSON.stringify({ arguments: toolCall.function.arguments || '' }, null, 2),
      id: toolCall.id,
    };
  },
};


export const finishInfoParser = (json: ICompleteResponseJson) => {
  const timing = getNonStreamTiming(json);
  return {
    id: json.id,
    object: json.object,
    model: json.model,
    created: json.created,
    choices: [{ index: 0, finish_reason: json.choices?.[0]?.finish_reason ?? null }],
    usage: json.usage,
    ...(timing ? { ttfb: timing.ttfb } : {}),
  };
};

/** 相邻的同类条目合并；tool / schema-card 各自独立，不合并 */
function pushItem(items: IMessageItem[], item: IMessageItem) {
  const last = items[items.length - 1];
  if (last?.type === 'markdown' && item.type === 'markdown') {
    last.content = mergeText(last.content, item.content);
    return;
  }
  if (last?.type === 'reasoning' && item.type === 'reasoning') {
    last.content = mergeText(last.content, item.content);
    return;
  }
  items.push(item);
}

function mergeText(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  return `${left}\n${right}`;
}

function mergePatterns(parsers: IMessageParser[]) {
  const flags = new Set(['g']);
  const sources = parsers.map((parser) => {
    if (!parser.pattern) {
      throw new Error(`[genui] message parser "${parser.id}" pattern is required`);
    }
    for (const flag of parser.pattern.flags) {
      if (flag !== 'g' && flag !== 'y') flags.add(flag);
    }
    return parser.pattern.source;
  });
  return new RegExp(sources.map((source, index) => `(?<__p${index}>${source})`).join('|'), [...flags].join(''));
}

const DEFAULT_FIELDS: Array<[string, (context: IParseContext) => unknown]> = [
  ['reasoning_content', (context) => context.reasoning_content],
  ['tool_calls', (context) => context.tool_calls],
  ['content', (context) => context.content],
];

export class MessageParser {
  private parsers: IMessageParser[] = [];
  private fields = new Map<string, (context: IParseContext) => unknown>();

  finishInfo: (json: ICompleteResponseJson) => Record<string, unknown> | void = finishInfoParser;

  constructor(parsers: IMessageParser[] = [], fields: Array<[string, (context: IParseContext) => unknown]> = DEFAULT_FIELDS) {
    fields.forEach(([name, resolve]) => this.registerField(name, resolve));
    parsers.forEach((parser) => this.register(parser));
  }

  register(parser: IMessageParser) {
    this.assertParser(parser);
    if (this.get(parser.id)) {
      throw new Error(`[genui] message parser "${parser.id}" already exists`);
    }
    this.parsers.push(parser);
    return this;
  }

  registerField(name: string, resolve: (context: IParseContext) => unknown) {
    if (!name) throw new Error('[genui] parser field name is required');
    if (this.fields.has(name)) {
      throw new Error(`[genui] parser field "${name}" already exists`);
    }
    this.fields.set(name, resolve);
    return this;
  }

  get(id: string) {
    return this.parsers.find((parser) => parser.id === id);
  }

  replace(id: string, parser: IMessageParser) {
    this.assertParser(parser);
    const index = this.parsers.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`[genui] message parser "${id}" not found`);
    }
    if (parser.id !== id && this.get(parser.id)) {
      throw new Error(`[genui] message parser "${parser.id}" already exists`);
    }
    this.parsers[index] = parser;
    return this;
  }

  remove(id: string) {
    const index = this.parsers.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.parsers.splice(index, 1);
    return true;
  }

  /**
   * @param order 字段优先级前缀；没列到的字段按注册顺序排在后面
   */
  parse(context: IParseContext, order: string[] = []): IMessageItem[] {
    const items: IMessageItem[] = [];
    // name：处理字段名， resolve：把对应字段值处理
    for (const { name, resolve } of this.resolveFields(order)) { // 按顺序处理各字段
      const parsers = this.parsers.filter((parser) => parser.field === name);
      const value = resolve(context); // 获取字段值
      if (value == null) continue;

      for (const raw of Array.isArray(value) ? value : [value]) {
        if (typeof raw !== 'string') {
          this.applyParsers(items, parsers, { field: name, text: '', value: raw });
        } else if (!raw) {
          continue;
        } else if (parsers.some((parser) => parser.pattern)) {
          this.scan(raw, name, parsers, items);
        } else if (!parsers.length) {
          pushItem(items, { type: 'markdown', content: raw });
        } else {
          this.applyParsers(items, parsers, { field: name, text: raw, value: raw });
        }
      }
    }
    return items;
  }

  private resolveFields(order: string[]) {
    const names = [...this.fields.keys()];
    return [...order.filter((name) => this.fields.has(name)), ...names.filter((name) => !order.includes(name))].map(
      (name) => ({ name, resolve: this.fields.get(name)! }),
    );
  }

  /** 用解析器的正则合并扫描，空隙文本生成 markdown */
  private scan(text: string, field: string, parsers: IMessageParser[], items: IMessageItem[]) {
    const pattern = mergePatterns(parsers);
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const block = match[0];
      if (!block) continue;

      if (index > offset) {
        pushItem(items, { type: 'markdown', content: text.slice(offset, index) });
      }
      const parser = parsers.find((_, i) => match.groups?.[`__p${i}`] !== undefined);
      if (parser) {
        this.applyParsers(items, [parser], { field, text: block, value: block });
      }
      offset = index + block.length;
    }
    if (offset < text.length) {
      pushItem(items, { type: 'markdown', content: text.slice(offset) });
    }
  }

  /** 按声明顺序找到第一个能处理该 block 的解析器 */
  private applyParsers(items: IMessageItem[], parsers: IMessageParser[], block: IParserBlock) {
    for (const parser of parsers) {
      const result = parser.handle(block);
      if (Array.isArray(result)) {
        result.forEach((item) => pushItem(items, item));
        return;
      }
      if (result) {
        pushItem(items, result);
        return;
      }
    }
  }

  private assertParser(parser: IMessageParser) {
    if (!parser.id) throw new Error('[genui] message parser id is required');
    if (!parser.field) {
      throw new Error(`[genui] message parser "${parser.id}" field is required`);
    }
  }
}

export const defaultMessageParser = new MessageParser([
  schemaJsonParser,
  thinkParser,
  reasoningContentParser,
  toolCallParser,
]);

export function parseCompleteResponse(
  json: ICompleteResponseJson,
  parser: MessageParser = defaultMessageParser,
): IChatMessage {
  const choice = json.choices?.[0];
  const message = choice?.message ?? {};
  const finishReason = choice?.finish_reason ?? null;
  const content = message.content ?? '';

  // 生成到工具调用就停了时，content 是调工具前的开场白，排在 tool_calls 前
  const order =
    finishReason === 'tool_calls'
      ? ['reasoning_content', 'content', 'tool_calls']
      : ['reasoning_content', 'tool_calls', 'content'];

  const chatMessage: IChatMessage = {
    role: 'assistant',
    content,
    messages: parser.parse({ ...message, content }, order),
  };

  const finishInfoResult = parser.finishInfo(json);
  if (finishInfoResult) chatMessage.finishInfo = finishInfoResult;

  return chatMessage;
}
