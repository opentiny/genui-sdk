import { ref, shallowRef, computed } from 'vue';
import { useConversation, IndexedDBStrategy } from '@opentiny/genui-sdk-vue';
import { AIClient, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { CustomModelProvider } from './template-provider';
import type { LLMConfig, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';

const conversation = shallowRef<ReturnType<typeof useConversation> | null>(null);
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
  if (!conversation.value && options?.url) {
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
    conversation.value = useConversation({
      client: clientInstance,
      autoSave: false,
      allowEmpty: true,
      storage: new IndexedDBStrategy('genui-ai-template', 'conversations', 'conversations-list'),
      events: {
        onReceiveData(data, messages, preventDefault) {
          messages.value.push(data as any);
          preventDefault();
        },
        onLoaded(conversations) {
          // 如果历史会话为空，则创建一个默认会话
          if (!conversations.length) {
            conversation.value!.createConversation(DEFAULT_TEMPLATE_TITLE);
            conversation.value!.saveConversations();
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
          conversation.value!.saveConversations();
        },
      },
    });

    isTemplateInit.value = true;
  }

  const messages = computed(() => conversation.value?.getCurrentConversation()?.messages ?? []);
  const templateConversationState = computed(() => conversation.value?.state);
  const currentConversationId = computed(() => conversation.value?.state.currentId);

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
    if (!conversation.value) {
      return;
    }

    const { createConversation, saveConversations } = conversation.value;
    createConversation(DEFAULT_TEMPLATE_TITLE);
    saveConversations();
    setCurrentSchema(null);
  };

  /**
   * 切换模板
   * @param id 模板 id
   */
  const switchTemplate = (id: string) => {
    if (!conversation.value) {
      return;
    }

    conversation.value.switchConversation(id);
    const currentConversation = conversation.value.getCurrentConversation();
    // 更新 schema 卡片
    let latestSchema = null;

    if (!currentConversation?.messages.length) {
      setCurrentSchema(null);

      return;
    }

    const lastMessage = currentConversation?.messages[currentConversation.messages.length - 1];

    (lastMessage?.messages as IMessageItem[])?.some((message: IMessageItem) => {
      if (message.type === 'schema-card' || message.type === 'json-patch') {
        latestSchema = message.schema;
        setCurrentCardId(message.cardId ?? '');

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
    if (!conversation.value) {
      return;
    }

    const { state, deleteConversation, saveConversations } = conversation.value;

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
    if (!conversation.value) {
      return;
    }

    const { updateTitle, saveConversations } = conversation.value;
    updateTitle(id, title);
    saveConversations();
  };

  /**
   * 根据卡片 id 获取对应的卡片消息
   * @param cardId 卡片 id
   * @returns 卡片消息
   */
  const getMessageByCardId = (cardId: string) => {
    if (!conversation.value) {
      return;
    }

    // 从 messages 中找到对应的卡片。
    let targetMessage = null;

    conversation.value.getCurrentConversation()?.messages.some((msg: ChatMessage) => {
      const messages = msg.messages as IMessageItem[] | undefined;

      if (!messages || !Array.isArray(messages)) {
        return false;
      }

      const card = messages.find(
        (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
          (message.type === 'schema-card' || message.type === 'json-patch') && message.cardId === cardId,
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

  // 从对话中提取示例 schema 列表
  const templateSchemaList = computed(() => {
    if (!conversation.value) {
      return [];
    }

    return conversation.value.state.conversations.map((item) => {
      const lastMessage = item.messages[item.messages.length - 1];
      const schemaMessage = (lastMessage?.messages as IMessageItem[])?.find(
        (message) => message.type === 'schema-card' || message.type === 'json-patch',
      );
      return {
        id: item.id,
        name: item.title,
        schema: schemaMessage?.schema ?? '',
      };
    });
  });

  return {
    isTemplateInit,
    templateConversationState,
    conversation: conversation.value,
    currentSchema,
    currentCardId,
    currentConversationId,
    templateProvider,
    messages,
    templateSchemaList,
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
