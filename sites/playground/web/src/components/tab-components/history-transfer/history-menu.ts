import { IconDelete, IconEditPen } from '@opentiny/tiny-robot-svgs';
import { IconDownload } from '@opentiny/vue-icon';
import { t } from '../../../i18n';

export const getHistoryMenuItems = () => [
  { id: 'export', text: t('history.menu.export'), icon: IconDownload() },
  { id: 'rename', text: t('history.menu.rename'), icon: IconEditPen },
  { id: 'delete', text: t('history.menu.delete'), icon: IconDelete },
];
