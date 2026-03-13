## GenUI SDK

Language: English | [简体中文](README.zh-CN.md)

GenUI SDK is a full‑stack development toolkit developed by OpenTiny for building **Generative UI**–based AI applications. It helps you quickly create AI apps and embed generative interfaces into existing products.

### Instruction

**GenUI SDK** is an open‑source solution built by the OpenTiny team around the Generative UI concept, providing integrated capabilities across both frontend and backend.  
It follows the OpenAI API specification, so you can connect to mainstream LLM providers out of the box.  
The SDK ships with Vue and Angular renderers, and supports custom component libraries, interaction logic, and theming.  
Whether you are building an AI chat application from scratch or adding generative UI capabilities into an existing business system, GenUI SDK is designed to be ready‑to‑use yet highly extensible.

### Try It Now

You can visit the [Playground](https://playground.opentiny.design/genui-sdk) to experience Generative UI capabilities in action.  
The playground itself is built using GenUI SDK.

### Getting Started

If you want to use GenUI SDK in your own project, please refer to the
[Quick Start](https://docs.opentiny.design/genui-sdk/guide/quick-start.html) guide and the [Server package usage](https://docs.opentiny.design/genui-sdk/guide/server-usage.html) documentation.

### Core Capabilities

GenUI SDK is designed to balance **out‑of‑the‑box experience** with **deep customization**, offering rich features and strong ecosystem compatibility:

| Feature                    | Description                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI ecosystem compatibility | Follows the OpenAI API specification and can integrate mainstream LLM services. Supports MCP for extending tools and connecting external/enterprise systems. |
| Theme customization        | Supports theme switching, dark mode, and token‑based theming to adapt to different brand and product style guides.                                 |
| Custom components          | Provides schema‑driven component descriptions, allowing you to extend generative UI component libraries and incorporate business components.       |
| Custom interactions        | Allows flexible configuration of multi‑turn conversation flows and custom commands/actions (e.g., open page, fetch data, generate forms) to fit complex scenarios. |
| Multi‑stack support        | Bundles Vue and Angular renderers so you can adopt GenUI SDK in new projects or integrate it progressively into existing frontends.                |
| Advanced capabilities      | Offers sample projects and best‑practice templates. Combined with server‑side features, you can implement message orchestration, tool invocation, access control, and more. |

For more details, see the GenUI SDK [feature examples](https://docs.opentiny.design/genui-sdk/examples/renderer/custom-actions.html) for complete explanations and practical guides.

### Packages

| Name                        | Description                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@opentiny/genui-sdk-server`  | Backend service that integrates Generative UI capabilities. Easy to configure and quick to start, with support for custom components and actions. |
| `@opentiny/genui-sdk-vue`     | Vue‑based frontend components and renderer for quickly building Generative UI web apps, with powerful customization for complex applications.     |
| `@opentiny/genui-sdk-angular` | Angular‑based renderer for integrating Generative UI into Angular applications.                                |

### Contributing

If you are interested in GenUI SDK, we welcome contributions.  
Before contributing, please read the [Contributing Guide](CONTRIBUTING.md).

You can also reach us via:

- Add the official WeChat assistant: `opentiny-official` to join the technical discussion group
- Join the mailing list: <opentiny@googlegroups.com>

### License

[MIT](https://opensource.org/license/MIT)