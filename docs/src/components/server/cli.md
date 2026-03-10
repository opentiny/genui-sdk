# CLI

`genui-sdk-server` 是一个全局安装的命令行工具，用于快速启动 GenUI SDK 聊天完成 HTTP 服务。它提供了零配置的服务器启动方式，自动处理环境变量加载、端口冲突检测等功能。

## 安装

通过 npm 或 yarn 全局安装：

```bash
npm install -g @opentiny/genui-sdk-server
# 或
yarn global add @opentiny/genui-sdk-server
```

安装完成后，你可以在终端中使用 `genui-sdk-server` 命令。

## 快速开始

1. 创建 `.env` 文件并配置必需的环境变量：

```env
BASE_URL=https://api.openai.com/v1
API_KEY=your-api-key-here
PORT=3100
```

2. 运行命令启动服务：

```bash
genui-sdk-server
```

服务启动成功后，会输出服务器地址，例如：

```
genui-sdk-server is running on http://localhost:3100
```

## 命令

### genui-sdk-server

启动 GenUI SDK 对话 HTTP 服务。

#### 用法

```bash
genui-sdk-server [选项]
```

#### 选项

| 选项 | 简写 | 类型 | 说明 |
|:---|:---:|:---:|:---|
| `--envFile <path>` | `-e` | `string` | 自定义环境变量文件路径（默认：当前目录 `.env`） |
| `--port <port>` | `-p` | `number` | 服务启动端口（默认：3100 或环境变量 `PORT`） |
| `--help` | `-h` | - | 显示帮助信息 |

#### 环境变量

CLI 工具需要以下环境变量（可通过 `.env` 文件或系统环境变量设置）：

| 变量名 | 必需 | 说明 | 默认值 |
|:---|:---:|:---|:---|
| `BASE_URL` | 是 | API 基础 URL，例如 `https://api.openai.com/v1` | - |
| `API_KEY` | 是 | API 密钥 | - |
| `PORT` | 否 | 服务启动端口 | `3100` |

**环境变量优先级**：

1. 命令行选项 `--port`（最高优先级）
2. 环境变量 `PORT`
3. 默认值 `3100`

#### 功能特性

- **自动端口检测**：如果指定端口被占用，会自动尝试下一个端口（最多尝试 10 次）
- **环境变量加载**：支持从 `.env` 文件或系统环境变量加载配置
- **CORS 支持**：自动启用 CORS，允许跨域请求
- **流式响应**：支持 SSE（Server-Sent Events）格式的流式响应

#### 示例

**基本用法**

使用默认配置启动服务（读取当前目录的 `.env` 文件，端口 3100）：

```bash
genui-sdk-server
```

**指定环境变量文件**

使用自定义的环境变量文件：

```bash
genui-sdk-server -e /path/to/custom/.env
```

**指定端口**

通过命令行选项指定服务端口：

```bash
genui-sdk-server -p 3000
```

**组合使用**

同时指定环境变量文件和端口：

```bash
genui-sdk-server -e /path/to/.env -p 3000
```

**使用系统环境变量**

不依赖 `.env` 文件，直接使用系统环境变量：

```bash
# 设置系统环境变量
export BASE_URL=https://api.openai.com/v1
export API_KEY=your-api-key
export PORT=3000

# 启动服务
genui-sdk-server
```

**查看帮助信息**

```bash
genui-sdk-server --help
# 或
genui-sdk-server -h
```

## 服务端点

启动成功后，服务会提供以下端点：

- **POST** `/chat/completions` - 聊天完成接口，支持流式响应（SSE 格式）

## 相关链接

- [Server API 文档](./api) - 查看组件 API 文档
- [使用文档](../../guide/server-usage) - 查看详细使用指南
