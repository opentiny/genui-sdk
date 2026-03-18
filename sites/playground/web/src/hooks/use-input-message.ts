import { watch, type ComponentPublicInstance, type Ref } from 'vue';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';

export const useInputMessage = (chatInstance: Ref<ComponentPublicInstance<typeof GenuiChat>>) => {
  const initInputMessage = () => {
    const inputMessage = new URLSearchParams(window.location.search).get('input-message');
    if (!inputMessage || !chatInstance.value) {
      return;
    }

    const conversation = chatInstance.value?.getConversation();

    const unwatch = watch(
      () => conversation.state.loading,
      (newValue) => {
        if (!newValue) {
          chatInstance.value?.setInputMessage(inputMessage);
          unwatch();
        }
      },
      { immediate: true },
    );
  };
  return {
    initInputMessage,
  };
};
