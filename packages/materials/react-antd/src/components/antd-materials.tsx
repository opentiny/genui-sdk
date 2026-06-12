import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Switch,
  Table,
  Tabs,
} from 'antd';
import type { FormInstance } from 'antd';
import type { ComponentRegistry } from '@opentiny/genui-sdk-react';
import { mergeRegistry } from '@opentiny/genui-sdk-react';
import { adapt, bindClick, bindModelChange, mapCardVariant, pickStyle } from './adapt';

/** Ant Design 5 运行时物料表，对齐 Vue 物料包的 `vueMaterials`。 */
export const antdMaterials: ComponentRegistry = {
  AntButton: adapt(Button, (props, emit) => ({
    ...pickStyle(props),
    type: props.type as 'primary' | 'default' | 'dashed' | 'link' | 'text' | undefined,
    disabled: props.disabled as boolean | undefined,
    danger: props.danger as boolean | undefined,
    size: props.size as 'small' | 'middle' | 'large' | undefined,
    onClick: bindClick(props, emit),
    children: (props.text as string) ?? (props.children as React.ReactNode),
  })),

  AntInput: adapt(Input, (props) => ({
    ...pickStyle(props),
    value: String(props.value ?? props.modelValue ?? ''),
    placeholder: props.placeholder as string | undefined,
    disabled: props.disabled as boolean | undefined,
    type: props.type as string | undefined,
    onChange: props.onChange,
  })),

  AntSelect: adapt(Select, (props, emit) => ({
    ...pickStyle(props),
    value: props.value ?? undefined,
    placeholder: props.placeholder as string | undefined,
    disabled: props.disabled as boolean | undefined,
    options: props.options as { label: string; value: string | number }[] | undefined,
    style: { width: '100%', ...(pickStyle(props).style as object) },
    onChange: bindModelChange(props, emit, true),
  })),

  AntForm: ({ props, children }) => (
    <Form
      {...pickStyle(props)}
      ref={props.ref as React.Ref<FormInstance>}
      layout={(props.layout as 'horizontal' | 'vertical' | 'inline') ?? 'vertical'}
      initialValues={props.initialValues as Record<string, unknown> | undefined}
      onValuesChange={props.onValuesChange as ((changed: Record<string, unknown>, all: Record<string, unknown>) => void) | undefined}
    >
      {children}
    </Form>
  ),

  AntFormItem: ({ props, children }) => (
    <Form.Item
      {...pickStyle(props)}
      name={props.name as string | number | (string | number)[] | undefined}
      label={props.label as React.ReactNode}
      required={props.required as boolean | undefined}
      rules={props.rules as object[] | undefined}
      help={props.help as React.ReactNode}
      validateStatus={props.validateStatus as 'success' | 'warning' | 'error' | 'validating' | '' | undefined}
    >
      {children}
    </Form.Item>
  ),

  AntCard: adapt(Card, (props) => ({
    ...pickStyle(props),
    title: props.title as React.ReactNode,
    variant: mapCardVariant(props),
  })),

  AntTable: adapt(Table, (props) => ({
    ...pickStyle(props),
    columns: props.columns as object[] | undefined,
    dataSource: props.dataSource as object[] | undefined,
    rowKey: (props.rowKey as string) ?? 'key',
    pagination: props.pagination as boolean | object | undefined,
  })),

  AntTabs: adapt(Tabs, (props, emit) => ({
    ...pickStyle(props),
    defaultActiveKey: props.defaultActiveKey as string | undefined,
    activeKey: props.activeKey as string | undefined,
    items: props.items as { key: string; label: string; children?: React.ReactNode }[] | undefined,
    onChange:
      bindModelChange(props, emit, true) ??
      ((key: string) => {
        const handler =
          (props['onUpdate:activeKey'] as ((v: string) => void) | undefined) ??
          (props.onChange as ((v: string) => void) | undefined);
        handler?.(key);
        emit('change');
      }),
  })),

  AntTabPane: ({ props, children }) => (
    <Tabs.TabPane
      tab={props.tab as React.ReactNode}
      key={(props.tabKey as string) ?? (props.key as string)}
      {...pickStyle(props)}
    >
      {children}
    </Tabs.TabPane>
  ),

  AntModal: adapt(Modal, (props, emit) => ({
    ...pickStyle(props),
    open: (props.open ?? props.visible) as boolean | undefined,
    title: props.title as React.ReactNode,
    okText: props.okText as string | undefined,
    cancelText: props.cancelText as string | undefined,
    onOk: (props.onOk as (() => void) | undefined) ?? (() => emit('ok')),
    onCancel: (props.onCancel as (() => void) | undefined) ?? (() => emit('cancel')),
  })),

  AntSwitch: adapt(Switch, (props, emit) => ({
    ...pickStyle(props),
    checked: (props.checked ?? props.value) as boolean | undefined,
    disabled: props.disabled as boolean | undefined,
    onChange: bindModelChange(props, emit, true),
  })),

  AntCheckbox: adapt(Checkbox, (props, emit) => ({
    ...pickStyle(props),
    checked: (props.checked ?? props.value) as boolean | undefined,
    disabled: props.disabled as boolean | undefined,
    onChange: (e) => {
      const handler =
        (props['onUpdate:checked'] as ((v: boolean) => void) | undefined) ??
        (props.onChange as ((v: unknown) => void) | undefined);
      handler?.(e.target.checked);
      emit('change');
    },
    children: (props.text as string) ?? (props.children as React.ReactNode),
  })),

  AntRadio: adapt(Radio, (props, emit) => ({
    ...pickStyle(props),
    value: props.value as string | number | undefined,
    checked: props.checked as boolean | undefined,
    disabled: props.disabled as boolean | undefined,
    onChange: bindModelChange(props, emit, true),
    children: (props.text as string) ?? (props.children as React.ReactNode),
  })),

  AntDatePicker: adapt(DatePicker, (props, emit) => ({
    ...pickStyle(props),
    value: props.value,
    placeholder: props.placeholder as string | undefined,
    disabled: props.disabled as boolean | undefined,
    style: { width: '100%', ...(pickStyle(props).style as object) },
    onChange: bindModelChange(props, emit, true),
  })),
};

/**
 * 将 Ant Design 默认物料与额外注册表合并。
 *
 * @param registries - 需要叠加的自定义组件注册表
 * @returns 合并后的完整注册表
 */
export function mergeAntdMaterials(...registries: ComponentRegistry[]): ComponentRegistry {
  return mergeRegistry(antdMaterials, ...registries);
}
