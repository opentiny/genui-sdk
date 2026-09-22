import { watch, type ComponentPublicInstance, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';

export const useInputMessage = (chatInstance: Ref<ComponentPublicInstance<typeof GenuiChat>>) => {
  const route = useRoute();

  const initInputMessage = () => {
    let applied = false;
    let stopReadyWatch: (() => void) | null = null;

    const applyInputMessage = (inputMessage: string) => {
      if (applied) {
        return;
      }
      const inst = chatInstance.value;
      if (!inst || inst.getConversation().state.loading) {
        return;
      }
      inst.setInputMessage(inputMessage);
      applied = true;
      stopReadyWatch?.();
      stopReadyWatch = null;
    };

    watch(
      () => route.query['input-message'],
      (inputMessage) => {
        if (applied) {
          return;
        }
        if (typeof inputMessage !== 'string' || !inputMessage) {
          stopReadyWatch?.();
          stopReadyWatch = null;
          return;
        }

        applyInputMessage(inputMessage);
        if (applied) {
          return;
        }

        stopReadyWatch?.();
        stopReadyWatch = watch(
          () => {
            const inst = chatInstance.value;
            return inst && !inst.getConversation().state.loading ? inst : null;
          },
          () => applyInputMessage(inputMessage),
        );
      },
      { immediate: true },
    );
  };

  return {
    initInputMessage,
  };
};
