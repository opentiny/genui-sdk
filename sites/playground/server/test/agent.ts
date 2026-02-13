/**
 * 简易 A2A 测试 Agent
 * 用于配合 agents-to-tools 与 playground 的 agents 配置做联调测试。
 * 启动后暴露 JSON-RPC 端点，可被主模型作为工具调用。
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  type AgentCard,
  type Message,
  AGENT_CARD_PATH,
} from '@a2a-js/sdk';
import {
  type AgentExecutor,
  type RequestContext,
  type ExecutionEventBus,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from '@a2a-js/sdk/server';
import { agentCardHandler, jsonRpcHandler, UserBuilder } from '@a2a-js/sdk/server/express';

const PORT = Number(process.env.TEST_AGENT_PORT) || 4001;
const BASE_URL = process.env.TEST_AGENT_URL || `http://localhost:${PORT}`;

const testAgentCard: AgentCard = {
  name: 'Test Echo Agent',
  description: '用于测试的简易 A2A Agent，回显用户消息并附带简短回复。',
  protocolVersion: '0.3.0',
  version: '0.1.0',
  url: `${BASE_URL}/a2a/jsonrpc`,
  skills: [
    {
      id: 'echo',
      name: 'Echo',
      description: '回显输入并返回一条确认消息',
      tags: ['echo', 'test'],
    },
  ],
  capabilities: {
    pushNotifications: false,
    streaming: false,
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  additionalInterfaces: [
    { url: `${BASE_URL}/a2a/jsonrpc`, transport: 'JSONRPC' },
  ],
};

class TestEchoExecutor implements AgentExecutor {
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const { userMessage, contextId } = requestContext;
    const textPart = userMessage.parts?.find((p) => p.kind === 'text');
    const inputText = textPart && 'text' in textPart ? textPart.text : '（无文本）';

    const responseMessage: Message = {
      kind: 'message',
      messageId: uuidv4(),
      role: 'agent',
      parts: [
        {
          kind: 'text',
          text: `[Test Agent] 收到: ${inputText}\n已处理完成。`,
        },
      ],
      contextId,
    };

    eventBus.publish(responseMessage);
    eventBus.finished();
  }

  cancelTask = async (): Promise<void> => {};
}

const executor = new TestEchoExecutor();
const requestHandler = new DefaultRequestHandler(
  testAgentCard,
  new InMemoryTaskStore(),
  executor,
);

const app = express();
app.use(express.json());

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use(
  '/a2a/jsonrpc',
  jsonRpcHandler({
    requestHandler,
    userBuilder: UserBuilder.noAuthentication(),
  }),
);

app.listen(PORT, () => {
  console.info(`Test A2A Agent 运行在 ${BASE_URL}`);
  console.info(`  - Agent Card: ${BASE_URL}/${AGENT_CARD_PATH}`);
  console.info(`  - JSON-RPC:   ${BASE_URL}/a2a/jsonrpc`);
});
