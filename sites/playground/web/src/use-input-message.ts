import { watch, type ComponentPublicInstance, type Ref } from 'vue';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';

export const useInputMessage = (chatInstance: Ref<ComponentPublicInstance<typeof GenuiChat>>) => {
  const initInputMessage = () => {
    const inputMessage = new URLSearchParams(window.location.search).get('input-message');
    if (inputMessage) {
      const conversation = chatInstance.value?.getConversation();
      if (!conversation.state.loading) {
        chatInstance.value?.setInputMessage(inputMessage);
      } else {
        watch(() => conversation.state.loading, () => {
          if (!conversation.state.loading) {
            chatInstance.value?.setInputMessage(inputMessage);
          }
        }, { once: true });
      }
    }
  };
  return {
    initInputMessage,
  };
};
