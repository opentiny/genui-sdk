import { IconDelete, IconEditPen, IconFileOther } from '@opentiny/tiny-robot-svgs';
import HistoryTransferToolbar from './HistoryTransferToolbar.vue';
export { downloadConversations, parseConversationFile, reconcileImportedConversationIds } from './history-transfer';

export { HistoryTransferToolbar };

export const historyMenuItems = [
  { id: 'export', text: '导出', icon: IconFileOther },
  { id: 'rename', text: '重命名', icon: IconEditPen },
  { id: 'delete', text: '删除', icon: IconDelete },
];
