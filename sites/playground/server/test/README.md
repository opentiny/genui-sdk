# 测试用 A2A Agent

本目录包含一个简易的 A2A 协议 Agent，用于配合 Playground 的 **agents** 配置和 `agents-to-tools` 做联调测试。

## 启动测试 Agent

在 `sites/playground/server` 目录下执行：

```bash
pnpm run dev:test-agent
```

默认监听 **4001** 端口。可通过环境变量覆盖：

- `TEST_AGENT_PORT`：端口号（默认 `4001`）
- `TEST_AGENT_URL`：对外暴露的 base URL（默认 `http://localhost:4001`）

## 在 Playground 中配置

在 Playground 的「playground 配置」里为 **agents** 增加一条，指向本测试 Agent 的 Agent Card 或直接填 `url`：

```json
{
  "agents": [
    {
      "name": "Test Echo Agent",
      "description": "用于测试的简易 A2A Agent，回显用户消息并附带简短回复。",
      "url": "http://localhost:4001/a2a/jsonrpc"
    }
  ]
}
```

主模型即可将「Test Echo Agent」当作一个工具调用；调用时会向该 URL 发送 A2A `message/send`，本 Agent 会回显内容并返回一条确认消息。

## 端点说明

| 路径 | 说明 |
|------|------|
| `/.well-known/agent-card.json` | Agent Card（能力描述） |
| `/a2a/jsonrpc` | A2A JSON-RPC（message/send 等） |
