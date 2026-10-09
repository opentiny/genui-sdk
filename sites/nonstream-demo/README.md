# genui-sdk-nonstream-demo

手工验证 **genui-server（`packages/server`）的非流式能力** 与 **`GenuiChat` 的 `:stream="false"` 渲染** 的最小环境。

一个页面：流式/非流式开关 + 模型名输入 + 清空按钮 + 内嵌 `GenuiChat`。后端就是 genui-server 包本身，没有另写后端。

```
sites/nonstream-demo/
├── server/
│   ├── start.ts        # 就文档里那段最小示例，从 @opentiny/genui-sdk-server 引
│   └── .env            # BASE_URL / API_KEY（从 .env.example 复制）
├── src/                # 前端
├── .env                # 前端配置
├── vite.config.ts
└── package.json
```

## 0. 先构建一次 genui-server（只需一次）

`server/start.ts` 引的是包入口 `@opentiny/genui-sdk-server`，指向 `packages/server/output/dist/`。**这个目录是构建产物、且被 gitignore**，新克隆的仓库里没有，必须先构建：

```bash
# 仓库根目录
pnpm install
pnpm --filter @opentiny/genui-sdk-server build
```

> 这样验证的就是**真正会被发布的那份产物**，而不是源码快照。
> 代价：改了 `packages/server/src` 之后要**重新 build** 才生效（不像引源码那样热重载）。

## 1. 填 key

`server/.env` 默认 `API_KEY=` 是空的，**不发请求也能起服务，但一发消息就会 401**：

```bash
cd sites/nonstream-demo
cp .env.example .env                # 前端配置
cp server/.env.example server/.env  # 后端配置
# 编辑 server/.env，填真实 BASE_URL / API_KEY
```

## 2. 启动

```bash
# 仓库根目录
pnpm --filter genui-sdk-nonstream-demo dev
```

一条命令起两个进程：genui-server（3100）+ Vite（打印实际端口）。打开 Vite 打印的地址即可，**默认就是非流式**。

想单独跑：`pnpm --filter genui-sdk-nonstream-demo dev:server` / `dev:web`。

`BASE_URL` / `API_KEY` 是通过 `dev:server` 脚本里的 `--env-file=server/.env` 注入的，`start.ts` 里没有 dotenv 代码。

## 怎么判断走的是非流式

**看渲染形态**：非流式是**一次性出现**；流式是逐字打字机。

**看 Network 面板**（更确凿）：`/chat/completions` 那个请求的响应

| | 非流式 | 流式 |
|---|---|---|
| `Content-Type` | `application/json` | `text/event-stream` |
| 响应体 | 一整个 `chat.completion` | 多行 `data: {...}`，结尾 `[DONE]` |

## 两个开关的作用

- **流式响应**：切换会重建 `GenuiChat`。因为 `stream` 只在组件 setup 时读一次（`GenuiChat.vue:260` → `useMessage.ts:90` 的 `ref(...)`），运行中改 prop 不生效。
- **清空对话**：`GenuiChat` 会把对话持久化到 IndexedDB，光重建组件会把旧对话读回来。按钮会先删掉 IndexedDB 里的记录再重建。

## 关于前端构建配置

前端 `vite.config.ts` 用 alias 把 `@opentiny/genui-sdk-vue` / `-core` / 物料包指到各自的 **`src/index.ts`**，绕过 dist —— 因为 Vue 侧的非流式改动还在开发中，dist 是旧的。改完源码刷新页面即可，不用 build。

（后端不一样：后端引的是包入口，所以要 build。两边取舍的原因不同。）

## 已知限制

- **端口**：`start.ts` 里写死 3100，和文档示例一致。被占用时 genui-server 会**静默漂到 3101**，前端就连不上了 —— 这时把 `.env` 的 `VITE_CHAT_URL` 改成实际端口。
- **工具调用**：genui-server 的流式和非流式都没有工具执行能力，所以工具卡片不会走到 success。要支持得让 genui-server 从「代理」变成「生成」。
- **key 和网关必须配套**。配错对的表现是 401 `Invalid authorization header`：
  - `https://api.deepseek.com/v1` ←→ 官方平台（`platform.deepseek.com`）的 **`sk-` 开头、35 位** key，模型用 `deepseek-chat`
  - `https://api.modelarts-maas.com/v1/` ←→ 华为 ModelArts 的 key（**不是** `sk-` 开头，86 位），模型用 `deepseek-v4-flash`
  - 模型名在页面的输入框里可以随时改，不用重启。
