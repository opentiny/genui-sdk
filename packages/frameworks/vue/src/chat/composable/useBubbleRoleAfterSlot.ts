import type { ComputedRef } from 'vue';
import type { BubbleMessage } from '@opentiny/tiny-robot';
import { toSlotFunction } from '../chat-utils';
import type { IBubbleSlotsProps, IMessageManagerBridge, IRolesConfig } from '../chat.types';

export type BubbleListAfterSlotProps = {
  messages: BubbleMessage[];
  role?: string;
  messageIndexes: number[];
};

export function useBubbleRoleAfterSlot(options: {
  roles?: IRolesConfig;
  messageManager: ComputedRef<IMessageManagerBridge>;
  allMessages: ComputedRef<BubbleMessage[]>;
  isProcessing: ComputedRef<boolean>;
}) {
  const resolveAfterSlot = (role: string) => {
    const roleConfig = options.roles?.[role as keyof IRolesConfig];
    const slot = roleConfig?.slots?.after ?? roleConfig?.slots?.trailer;
    return toSlotFunction(slot);
  };

  const renderAfterSlot = (slotProps: BubbleListAfterSlotProps) => {
    const role = slotProps.role ?? '';
    const slotFn = resolveAfterSlot(role);
    if (!slotFn) {
      return null;
    }

    const messageIndexes = slotProps.messageIndexes ?? [];
    if (!messageIndexes.length) {
      return null;
    }

    const index = role === 'assistant' ? messageIndexes[messageIndexes.length - 1] : messageIndexes[0];
    const chatMessage = options.allMessages.value[index];
    if (!chatMessage) {
      return null;
    }

    const isFinished =
      role !== 'assistant' || index !== options.allMessages.value.length - 1 || !options.isProcessing.value;

    const legacyProps: IBubbleSlotsProps = {
      index,
      bubbleProps: { role, ...chatMessage } as IBubbleSlotsProps['bubbleProps'],
      isFinished,
      messageManager: options.messageManager.value,
      chatMessage: chatMessage as IBubbleSlotsProps['chatMessage'],
    };

    return slotFn(legacyProps);
  };

  return { renderAfterSlot };
}
