# CLI

`genui-sdk-server` is a globally installed command-line tool for quickly starting a GenUI SDK chat completion HTTP service. It provides zero-config server startup with automatic environment variable loading and port conflict detection.

## Installation

Install globally via npm or yarn:

```bash
npm install -g @opentiny/genui-sdk-server
# or
yarn global add @opentiny/genui-sdk-server
```

After installation, you can use the `genui-sdk-server` command in your terminal.

## Quick Start

1. Create a `.env` file and configure required environment variables:

```env
BASE_URL=https://api.openai.com/v1
API_KEY=
PORT=3100
```

2. Run the command to start the service:

```bash
genui-sdk-server
```

On success, the server address is printed, for example:

```text
genui-sdk-server is running on http://localhost:3100
```

> **Materials note**: the CLI exposes no materials option and **can only use the server's built-in default materials**, selected by the request `metadata.tinygenui.framework`: `Vue` → OpenTiny Vue, `Angular` → OpenTiny Angular, other / unspecified → the Vue default. So when the frontend replaces its materials (React materials, Vue Element Plus, the mini set, custom materials, etc.), the server still uses the framework-selected built-in default, which no longer matches the frontend and yields schema component names the frontend cannot render; in that case you must switch to programmatic startup or Express integration and pass the matching `materialsMeta` explicitly. See [Server Usage - Materials configuration](../../guide/server-usage).

## Commands

### genui-sdk-server

Starts the GenUI SDK chat HTTP service.

#### Usage

```bash
genui-sdk-server [options]
```

#### Options

| Option | Short | Type | Description |
|:---|:---:|:---:|:---|
| `--envFile <path>` | `-e` | `string` | Custom environment file path (default: `.env` in the current directory) |
| `--port <port>` | `-p` | `number` | Server port (default: 3100 or `PORT` environment variable) |
| `--help` | `-h` | - | Show help information |

#### Environment Variables

The CLI requires the following environment variables (via `.env` file or system environment):

| Variable | Required | Description | Default |
|:---|:---:|:---|:---|
| `BASE_URL` | Yes | API base URL, e.g. `https://api.openai.com/v1` | - |
| `API_KEY` | Yes | API key | - |
| `PORT` | No | Server port | `3100` |

**Environment variable priority**:

1. Command-line option `--port` (highest priority)
2. Environment variable `PORT`
3. Default value `3100`

#### Features

- **Automatic port detection**: If the specified port is in use, tries the next port automatically (up to 10 attempts)
- **Environment variable loading**: Supports loading configuration from `.env` files or system environment variables
- **CORS support**: CORS is enabled automatically for cross-origin requests
- **Streaming responses**: Supports SSE (Server-Sent Events) streaming format

#### Examples

**Basic usage**

Start with default configuration (reads `.env` in the current directory, port 3100):

```bash
genui-sdk-server
```

**Custom environment file**

Use a custom environment file:

```bash
genui-sdk-server -e /path/to/custom/.env
```

**Specify port**

Set the server port via command-line option:

```bash
genui-sdk-server -p 3000
```

**Combined usage**

Specify both environment file and port:

```bash
genui-sdk-server -e /path/to/.env -p 3000
```

**System environment variables**

Use system environment variables without a `.env` file:

```bash
# Set system environment variables
export BASE_URL=https://api.openai.com/v1
export API_KEY=
export PORT=3000

# Start the service
genui-sdk-server
```

**Show help**

```bash
genui-sdk-server --help
# or
genui-sdk-server -h
```

## Server Endpoints

After startup, the service exposes the following endpoint:

- **POST** `/chat/completions` - Chat completion endpoint with streaming response (SSE format)

## Related Links

- [Server API](./api) - Component API documentation
- [Usage Guide](../../guide/server-usage) - Detailed usage guide
