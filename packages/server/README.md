# GenUI Chat Completion

## 目录结构

```
src/
├── cli.ts                      # 命令行入口
├── start-server.ts             # 服务器启动逻辑
├── equip-chat-completions.ts   # Express 集成函数
├── types.ts                    # 类型定义
├── index.ts                    # 统一导出入口
├── chat-completions/           # 聊天补全核心模块
│   ├── chat-completions.ts     # Genui 主类
│   ├── request-transform.ts    # 请求转换（注入 GenUI 提示词）
│   └── index.ts
├── handler/                    # HTTP 请求处理器
│   ├── create-chat-completion.ts  # 聊天补全处理器
│   └── index.ts
└── chat-service/               # 聊天服务实现
    ├── base-chat-service.ts    # 抽象基类
    ├── fetch-chat-service.ts   # Fetch 实现
    ├── openai-chat-service.ts  # OpenAI SDK 实现
    ├── ai-sdk-chat-service.ts  # AI SDK 实现
    ├── openai-compatible-transform.ts  # AI SDK 到 OpenAI 格式转换
    └── index.ts
```

## 开发

### 构建

```bash
pnpm build
```

### 构建并混淆代码

```bash
pnpm build:obfuscator
```

### 开发模式

```bash
pnpm dev
```
