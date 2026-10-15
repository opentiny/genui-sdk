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
import { Area, Bar, Column, Line, Pie, Radar } from '@ant-design/plots';
import type { IMaterialsMap } from '@opentiny/genui-sdk-core';

import { AntTabsWrap } from './AntTabsWrap';
import { AntDatePicker } from './AntDatePickerWrap';
import { AntIcon } from './AntIcon';

export const components: IMaterialsMap = {
  AntButton: Button,
  AntIcon,
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
  AntBar: Bar,
  AntColumn: Column,
  AntLine: Line,
  AntArea: Area,
  AntRadar: Radar,
  AntPie: Pie,
};
