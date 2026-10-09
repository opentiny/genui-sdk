import { describe, expect, it, vi } from 'vitest';
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit';
import { CustomModelProvider, type ICustomModelChatOptions } from '../CustomModelProvider';
import { defaultResponseHandlers, type IResponseHandler } from '../response-handler';
import type { IStreamData } from '@opentiny/genui-sdk-core';

const request = {
  messages: [{ role: 'user', content: 'hi' }],
  options: { stream: false },
} as unknown as ChatCompletionRequest;

/** 用一份固定的完整响应替换网络请求，其余走真实 handler 链 */
class TestProvider extends CustomModelProvider {
  constructor(private body: unknown) {
    super({
      getChatOptions: (): ICustomModelChatOptions => ({
        url: 'http://test.local/chat',
        model: 'test-model',
        temperature: 0.3,
        chatConfig: { addToolCallContext: false, showThinkingResult: false },
        customComponents: [],
        customSnippets: [],
        customExamples: [],
        customActions: [],
      }),
    });
    this.setResponseHandlers(defaultResponseHandlers);
  }

  override async getData(): Promise<Response> {
    return new Response(JSON.stringify(this.body));
  }
}

const buildCompletion = (message: Record<string, unknown>, finishReason = 'stop') => ({
  id: 'chatcmpl-test',
  object: 'chat.completion',
  model: 'test-model',
  created: 1700000000,
  choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: finishReason }],
  usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 },
});

describe('CustomModelProvider 非流式（完整响应）', () => {
  it('返回值同时保留 OpenAI 镜像与 IChatMessage 两种形状', async () => {
    const provider = new TestProvider(buildCompletion({ content: 'hello world' }));
    const result: any = await provider.chat(request);

    // OpenAI 形状：useMessage.chat / useConversation.generateTitle 读这两项
    expect(result.choices[0].message.content).toBe('hello world');
    expect(result.choices[0].finish_reason).toBe('stop');

    // IChatMessage 形状：GenuiChat 的 onReceiveData 直接整对象 push
    expect(result.role).toBe('assistant');
    expect(result.content).toBe('hello world');
    expect(result.messages).toEqual([{ type: 'markdown', content: 'hello world' }]);
  });

  it('finishInfo 由完整响应直接组装，并保持 chunk 形状', async () => {
    const provider = new TestProvider(buildCompletion({ content: 'hi' }, 'length'));
    const result: any = await provider.chat(request);

    // FinishInfo.vue / AssistantFooter.vue 读的是 finishInfo.choices[0].finish_reason
    expect(result.finishInfo.choices[0].finish_reason).toBe('length');
    expect(result.finishInfo.model).toBe('test-model');
    expect(result.finishInfo.created).toBe(1700000000);
    expect(result.finishInfo.usage).toEqual({ prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 });
  });

  it('整段 content 一次性切成 markdown 与 schema-card', async () => {
    const content = '看这个:\n```schemaJson\n{"type":"div"}\n```\n完';
    const provider = new TestProvider(buildCompletion({ content }));
    const result: any = await provider.chat(request);

    expect(result.messages.map((item: any) => item.type)).toEqual(['markdown', 'schema-card', 'markdown']);
    expect(result.messages[1].content).toContain('"type":"div"');
    expect(result.messages[1].id).toBeTruthy();
    // 卡片内容完整，没有被留在 patternExtractor 的缓存里
    expect(result.messages[1].content).not.toContain('```');
  });

  it('reasoning / tool_calls / tool_calls_result / content 各自落到对应消息项', async () => {
    const provider = new TestProvider(
      buildCompletion({
        reasoning_content: '先说结论',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'getWeather', arguments: '{"city":"bj"}' },
          },
        ],
        tool_calls_result: [
          {
            id: 'call_1',
            type: 'function',
            function: { arguments: { city: 'bj' }, result: { temp: 20 } },
          },
        ],
        content: '今天 20 度',
      }),
    );
    const result: any = await provider.chat(request);

    expect(result.messages.map((item: any) => item.type)).toEqual(['reasoning', 'tool', 'markdown']);

    const [reasoning, tool, markdown] = result.messages;
    expect(reasoning.content).toBe('先说结论');
    // 完整响应下思考过程一次到齐，不应停留在「思考中」
    expect(reasoning.thinking).toBe(false);

    expect(tool.name).toBe('getWeather');
    expect(tool.status).toBe('success');

    expect(markdown.content).toBe('今天 20 度');
    expect(result.content).toBe('今天 20 度');
  });

  it('多个工具调用的结果逐个落位，不会只有第一个走到 success', async () => {
    const provider = new TestProvider(
      buildCompletion({
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'getWeather', arguments: '{"city":"bj"}' } },
          { id: 'call_2', type: 'function', function: { name: 'getTime', arguments: '{"tz":"Asia/Shanghai"}' } },
        ],
        // 非流式下服务端把所有 step 的结果平铺进一个数组；流式下这里长度为 1
        tool_calls_result: [
          { id: 'call_1', type: 'function', function: { arguments: { city: 'bj' }, result: { temp: 20 } } },
          { id: 'call_2', type: 'function', function: { arguments: { tz: 'Asia/Shanghai' }, result: { now: '13:59' } } },
        ],
      }),
    );
    const result: any = await provider.chat(request);

    const tools = result.messages.filter((item: any) => item.type === 'tool');
    expect(tools.map((item: any) => item.name)).toEqual(['getWeather', 'getTime']);
    expect(tools.map((item: any) => item.status)).toEqual(['success', 'success']);
    // 每个 tool 项拿到的是自己的结果，而不是共用第一份
    expect(JSON.parse(tools[0].content).result).toEqual({ temp: 20 });
    expect(JSON.parse(tools[1].content).result).toEqual({ now: '13:59' });
  });

  it('单个切面不会串到其他切面', async () => {
    const provider = new TestProvider(buildCompletion({ reasoning_content: '只想不说话' }));
    const result: any = await provider.chat(request);

    expect(result.messages.map((item: any) => item.type)).toEqual(['reasoning']);
    expect(result.content).toBe('');
  });

  it('不再把完整响应伪装成流式 chunk 回放', async () => {
    const provider = new TestProvider(buildCompletion({ content: 'hi' }));
    const chunkSpy = vi.spyOn(provider, 'handlerChunk');

    await provider.chat(request);

    // handlerChunk 是流式路径（SSE 行）的入口，非流式不应再走它
    expect(chunkSpy).not.toHaveBeenCalled();
  });

  it('未实现 complete 的自定义 handler 仍能收到按切面分发的数据', async () => {
    const seen: string[] = [];
    const legacyHandler: IResponseHandler<IStreamData> = {
      name: 'legacy',
      match: (data) => Boolean(data.choices?.[0]?.delta?.content),
      handler: (data) => {
        seen.push(data.choices?.[0]?.delta?.content as string);
        return true;
      },
    };

    const provider = new TestProvider(buildCompletion({ content: 'legacy 也要工作' }));
    provider.setResponseHandlers([...defaultResponseHandlers, legacyHandler]);

    const result: any = await provider.chat(request);

    expect(seen).toEqual(['legacy 也要工作']);
    // 回退路径与内置 content handler 并存，互不影响
    expect(result.messages).toEqual([{ type: 'markdown', content: 'legacy 也要工作' }]);
  });

  it('请求失败时通知 handler 并向上抛错', async () => {
    const onRequestError = vi.fn();
    const error = new Error('boom');
    const provider = new TestProvider(buildCompletion({ content: 'x' }));
    provider.setResponseHandlers([
      { ...defaultResponseHandlers[0], onRequestError },
      ...defaultResponseHandlers.slice(1),
    ]);
    vi.spyOn(provider, 'getData').mockRejectedValue(error);

    await expect(provider.chat(request)).rejects.toThrow('boom');
    expect(onRequestError).toHaveBeenCalledWith(expect.anything(), error);
  });
});
