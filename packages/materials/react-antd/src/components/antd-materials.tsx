import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Radio,
  Select,
  Switch,
  Table,
} from 'antd';

import { AntModalWrap } from './AntModalWrap';
import { AntTabsWrap } from './AntTabsWrap';

export const antdMaterials = {
  AntButton: Button,
  AntInput: Input,
  AntSelect: Select,
  AntForm: Form,
  AntFormItem: Form.Item,
  AntCard: Card,
  AntTable: Table,
  AntTabs: AntTabsWrap,
  AntModal: AntModalWrap,
  AntSwitch: Switch,
  AntCheckbox: Checkbox,
  AntRadio: Radio,
  AntDatePicker: DatePicker,
};
