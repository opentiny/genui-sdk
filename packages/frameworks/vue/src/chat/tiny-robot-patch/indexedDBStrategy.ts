import { isRef, isReactive, toRaw, unref } from "vue";
import { type ConversationStorageStrategy, type Conversation } from "@opentiny/tiny-robot-kit";

// 去除响应式
const deepUnwrap = (obj: any): any => {
  if (isRef(obj)) return deepUnwrap(unref(obj));
  if (isReactive(obj)) return deepUnwrap(toRaw(obj));
  if (Array.isArray(obj)) return obj.map(deepUnwrap);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      acc[key] = deepUnwrap(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};


export class IndexedDBStrategy implements ConversationStorageStrategy {
  private dbName: string;
  private storeName: string;
  private dataKey: string;
  private db: IDBDatabase | null = null;

  constructor(
    dbName: string = 'genui-ai',
    storeName: string = 'conversations',
    dataKey: string = 'conversations-list',
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dataKey = dataKey;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error('打开 IndexedDB 失败'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async saveConversations(conversations: Conversation[]): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const serializedData = deepUnwrap(conversations);
      return new Promise<void>((resolve, reject) => {
        const putRequest = store.put(serializedData, this.dataKey);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => {
          console.error('保存会话失败:', putRequest.error);
          reject(putRequest.error);
        };
      });
    } catch (error) {
      console.error('保存会话失败:', error);
      throw error;
    }
  }

  async loadConversations(): Promise<Conversation[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise<Conversation[]>((resolve, reject) => {
        const request = store.get(this.dataKey);
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve([]);
            return;
          }
          let conversations: Conversation[] = [];
          // 如果存储的是字符串，需要反序列化
          if (typeof result === 'string') {
            try {
              conversations = JSON.parse(result);
            } catch (parseError) {
              console.error('解析会话数据失败:', parseError);
              resolve([]);
              return;
            }
          } else {
            // 兼容旧数据格式（如果之前直接存储了对象）
            conversations = Array.isArray(result) ? result : [];
          }
          resolve(conversations);
        };
        request.onerror = () => {
          console.error('加载会话失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('加载会话失败:', error);
      return [];
    }
  }
}
