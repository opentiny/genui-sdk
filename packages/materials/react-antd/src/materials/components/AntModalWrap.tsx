import { Modal } from 'antd';
import type { ModalProps } from 'antd';

type AntModalWrapProps = ModalProps & {
  visible?: boolean;
};

export function AntModalWrap({ visible, open, ...rest }: AntModalWrapProps) {
  return <Modal open={open ?? visible} {...rest} />;
}
