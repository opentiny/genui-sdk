export interface PersistedConversation {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages?: unknown[];
  metadata?: Record<string, unknown>;
}
