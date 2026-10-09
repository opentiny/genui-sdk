/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_URL?: string;
  readonly VITE_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
