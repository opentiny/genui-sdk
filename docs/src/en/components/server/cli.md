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

> **Materials note**: without `--materials`, the CLI uses the server's built-in default materials, selected by the request `metadata.tinygenui.framework`: `Vue` → OpenTiny Vue, `Angular` → OpenTiny Angular, other / unspecified → the Vue default. When the frontend replaces its materials (React materials, Vue Element Plus, the mini set, custom materials, etc.), pass `-m, --materials` with the material package name or the path to a materials meta module/JSON file to keep the server materials consistent with the frontend; combine it with `--materials-export` to pick a named export (e.g. the Vue mini set's `miniMaterialsMeta`). See [Server Usage - Materials configuration](../../guide/server-usage).

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
| `--materials <source>` | `-m` | `string` | Materials source: a material package name (e.g. `@opentiny/genui-sdk-materials-react-antd`; the `/meta` subpath may be omitted) or a path to a module/JSON file that exports the materials metadata. Omit it to use the built-in defaults |
| `--materials-export <name>` | - | `string` | Named export to read from the materials module (default `materialsMeta`; e.g. `miniMaterialsMeta` for the Vue mini set) |
| `--help` | `-h` | - | Show help information |

**How the materials source is resolved**:

- **File path**: starts with `.` or `/`, or looks like a Windows path such as `C:\`, or is a `file:` URL. Relative paths are resolved from the current working directory. `.json` files are parsed directly as materials metadata.
- **Package name**: resolved from the current working directory, so the material package must be installed in the project that runs the CLI. When only a package name is given (e.g. `@opentiny/genui-sdk-materials-react-antd`), the CLI first tries the `<package>/meta` subpath (smaller, no component runtime) and falls back to the package entry.
- **Export name**: the export named by `--materials-export` (default `materialsMeta`) is used first, then the module's `default` export, and finally the module itself is treated as materials metadata.

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
- **Materials loading**: Loads materials metadata from a package name or a module/JSON file path, with `--materials-export` to pick the export
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

**Materials by package name**

When the frontend uses React materials, load the same materials on the server (the `/meta` subpath is picked automatically):

```bash
genui-sdk-server -m @opentiny/genui-sdk-materials-react-antd
```

**Materials by file path**

When the materials metadata comes from a local module or JSON file, pass a relative or absolute path:

```bash
genui-sdk-server -m ./my-materials.mjs
genui-sdk-server -m /path/to/materials.json
```

**Materials export name**

When the metadata is not on the default `materialsMeta` export (e.g. the Vue mini set), select it with `--materials-export`:

```bash
genui-sdk-server -m @opentiny/genui-sdk-materials-vue-opentiny-vue/meta --materials-export miniMaterialsMeta
```

**Materials with a custom port**

```bash
genui-sdk-server -m @opentiny/genui-sdk-materials-vue-element-plus -p 3000
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
