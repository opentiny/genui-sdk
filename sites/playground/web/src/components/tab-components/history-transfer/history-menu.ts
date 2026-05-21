import { IconDelete, IconEditPen } from '@opentiny/tiny-robot-svgs';
import { IconDownload } from '@opentiny/vue-icon';

export const historyMenuItems = [
  { id: 'export', text: '导出', icon: IconDownload() },
  { id: 'rename', text: '重命名', icon: IconEditPen },
  { id: 'delete', text: '删除', icon: IconDelete },
];
