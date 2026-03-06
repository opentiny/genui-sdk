import { ref, shallowRef, computed } from 'vue';
import { useConversation, IndexedDBStrategy } from '@opentiny/genui-sdk-vue';
import { AIClient, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { CustomModelProvider } from './template-provider';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import type { LLMConfig, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';

let conversation: ReturnType<typeof useConversation> | null = null;
let templateProvider: CustomModelProvider | null = null;
// 判断模板会话是否初始化完成。
const isTemplateInit = ref(false);
// 当前 schema。 可能是：AI 生成的 schemaJson、AI 生成的 jsonPatch 更新后的 schema、切换到历史版本的 schema、编辑器中手动修改的 schema。
const currentSchema = shallowRef<any>(null);
// 当前卡片 id，用于记录卡片 id，避免重复执行 patch 操作
const currentCardId = ref<string>('');
const DEFAULT_TEMPLATE_TITLE = '新模板';

export interface UseTemplateOptions {
  url: string;
  llmConfig?: LLMConfig;
}

export default function useTemplate(options?: UseTemplateOptions) {
  if (!isTemplateInit.value && !options?.url) {
    return;
  }

  if (!conversation) {
    const { url, llmConfig } = options;

    // 创建 provider 实例
    templateProvider = new CustomModelProvider({
      url,
      llmConfig: llmConfig || { model: '', temperature: 0.3 },
    });

    // 创建 client 实例
    const clientInstance = new AIClient({
      provider: 'custom',
      providerImplementation: templateProvider,
    });

    // 创建 conversation 实例
    conversation = useConversation({
      client: clientInstance,
      autoSave: false,
      storage: new IndexedDBStrategy('genui-ai-template', 'conversations', 'conversations-list'),
      events: {
        onReceiveData(data, messages, preventDefault) {
          messages.value.push(data as any);
          preventDefault();
        },
        onLoaded(conversations) {
          // 如果历史会话为空，则创建一个默认会话
          if (!conversations.length) {
            conversation!.createConversation(DEFAULT_TEMPLATE_TITLE);
            conversation!.saveConversations();
          }
        },
        onFinish(data: any, context) {
          if (data?.type === 'error') {
            context.messages.value.push({
              role: 'assistant',
              content: '',
              messages: [{ type: 'error-text', content: data.error.message }],
            });
          }
          conversation!.saveConversations();
        },
      },
    });

    isTemplateInit.value = true;
  }

  const messages = computed(() => conversation.getCurrentConversation()?.messages ?? []);

  /**
   * 修改 LLM 配置
   * @param llmConfig LLM 配置
   */
  const changeLlmConfig = (llmConfig: LLMConfig) => {
    templateProvider.changeLlmConfig(llmConfig);
  };

  /**
   * 设置当前 schema，渲染器使用。
   * @param schema 模板 schema
   */
  const setCurrentSchema = (schema: any) => {
    currentSchema.value = schema;
    templateProvider.setTemplateSchema(schema);
  };

  /**
   * 创建模板
   */
  const createTemplate = () => {
    const { createConversation, saveConversations } = conversation;
    createConversation(DEFAULT_TEMPLATE_TITLE);
    saveConversations();
    setCurrentSchema(null);
  };

  /**
   * 切换模板
   * @param id 模板 id
   */
  const switchTemplate = (id: string) => {
    conversation.switchConversation(id);
    const currentConversation = conversation.getCurrentConversation();
    // 更新 schema 卡片
    let latestSchema = null;

    if (!currentConversation?.messages.length) {
      setCurrentSchema(null);
      return
    }

    const lastMessage = currentConversation?.messages[currentConversation.messages.length - 1];

    (lastMessage?.messages as IMessageItem[])?.some((message: IMessageItem) => {
      if (message.type === 'schema-card' || message.type === 'json-patch') {
        latestSchema = message.schema;
        return true;
      }
      return false;
    });

    if (latestSchema) {
      setCurrentSchema(JSON.parse(latestSchema));
    }
  };

  /**
   * 删除模板
   * @param id 模板 id
   */
  const deleteTemplate = (id: string) => {
    const { state, deleteConversation, saveConversations } = conversation;

    deleteConversation(id);
    saveConversations();

    // 保证至少有一个会话
    if (state.conversations.length === 0) {
      createTemplate();
    }
  };

  /**
   * 更新模板标题
   * @param id 模板 id
   * @param title 模板标题
   */
  const updateTemplateTitle = (id: string, title: string) => {
    const { updateTitle, saveConversations } = conversation;
    updateTitle(id, title);
    saveConversations();
  };

  /**
   * 根据卡片 id 获取对应的卡片消息
   * @param cardId 卡片 id
   * @returns 卡片消息
   */
  const getMessageByCardId = (cardId: string) => {
    // 从 messages 中找到对应的卡片。
    let targetMessage = null;

    conversation.getCurrentConversation()?.messages.some((msg: ChatMessage) => {
      const messages = msg.messages as IMessageItem[] | undefined;

      if (!messages || !Array.isArray(messages)) {
        return false;
      }

      const card = messages.find(
        (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
          (message.type === 'schema-card' || message.type === 'json-patch') && message.cardId === cardId
      );

      if (card) {
        targetMessage = card;

        return true;
      }

      return false;
    });

    if (!targetMessage) {
      return;
    }

    return targetMessage;
  };

  const setCurrentCardId = (cardId: string) => {
    currentCardId.value = cardId;
  };

  const getCurrentCardId = () => {
    return currentCardId.value;
  };

  return {
    isTemplateInit,
    templateConversationState: conversation.state,
    conversation,
    currentSchema,
    currentCardId,
    templateProvider,
    messages,
    createTemplate,
    changeLlmConfig,
    setCurrentSchema,
    setCurrentCardId,
    getCurrentCardId,
    switchTemplate,
    deleteTemplate,
    updateTemplateTitle,
    getMessageByCardId,
  };
}
