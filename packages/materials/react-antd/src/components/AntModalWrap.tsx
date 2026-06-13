import { Modal } from 'antd';
import type { ModalProps } from 'antd';

type AntModalWrapProps = ModalProps & {
  visible?: boolean;
};

/**
 * Modal 包装：兼容 schema 里的 visible，映射为 antd 5 的 open。
 */
export function AntModalWrap({ visible, open, ...rest }: AntModalWrapProps) {
  return <Modal open={open ?? visible} {...rest} />;
}
