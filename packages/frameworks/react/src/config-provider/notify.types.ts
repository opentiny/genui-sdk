export type NotifyHandler = (options: {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  duration?: number;
}) => void;
