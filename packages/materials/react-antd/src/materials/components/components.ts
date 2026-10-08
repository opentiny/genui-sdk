import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Switch,
  Table,
} from 'antd';
import type { IMaterialsMap } from '@opentiny/genui-sdk-core';

import { AntTabsWrap } from './AntTabsWrap';
import { AntDatePicker } from './AntDatePickerWrap';

export const components: IMaterialsMap = {
  AntButton: Button,
  AntInput: Input,
  AntSelect: Select,
  AntForm: Form,
  AntFormItem: Form.Item,
  AntCard: Card,
  AntTable: Table,
  AntTabs: AntTabsWrap,
  AntModal: Modal,
  AntSwitch: Switch,
  AntCheckbox: Checkbox,
  AntRadio: Radio,
  AntDatePicker,
};
