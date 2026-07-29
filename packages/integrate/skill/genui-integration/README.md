# GenUI SDK Integration Skill

帮助用户集成 GenUI SDK 到项目中的 Claude skill。

## 📖 概述

本 skill 提供完整的 GenUI SDK 集成指导，支持：

- **Vue 3** - 使用 `GenuiChat` 或 `GenuiRenderer`
- **Angular** - 使用 `GenuiRenderer`
- **Server** - Node.js 后端服务集成

## 🚀 快速开始

### 使用 skill

在 Claude 中触发本 skill：

```
帮我集成 GenUI SDK 到 Vue 项目
如何在 Angular 中使用 GenuiRenderer？
怎么设置 genui-sdk-server？
```

### 目录结构

```
genui-integration/
├── SKILL.md              # 主 skill 文件
├── MAINTENANCE.md        # 维护指南
├── references/           # 详细参考文档
│   ├── vue.md
│   ├── angular.md
│   └── server.md
├── examples/             # 示例文件
│   ├── renderer/
│   ├── chat/
│   └── angular/
└── scripts/              # 维护脚本
    ├── sync_skill.py
    ├── check_changes.py
    └── update_workflow.py
```

## 📚 核心概念

### 物料系统

GenUI SDK 使用物料系统将核心 SDK 与 UI 组件解耦：

- **Vue**: `@opentiny/genui-sdk-materials-vue-opentiny-vue`
- **Angular**: `@opentiny/genui-sdk-materials-angular-opentiny-ng`

### 组件

- **GenuiChat**: 集成聊天组件（仅 Vue）
- **GenuiRenderer**: 核心渲染器（Vue + Angular）
- **GenuiConfigProvider**: 配置提供者

### 集成模式

1. **GenuiChat** - 快速开始，开箱即用
2. **GenuiRenderer** - 自定义 UI，灵活控制
3. **Server** - 后端服务，代理 LLM 调用

## 🌐 文档来源

本 skill 从在线文档自动同步内容：

**在线文档**: https://docs.opentiny.design/genui-sdk/

- Vue 指南: `/guide/quick-start.html` 等
- Angular 指南: `/guide/angular/install.html` 等
- Server 指南: `/guide/server-usage.html`
- 示例: `/examples/renderer/*.html` 等

## 🔧 维护

### 检查文档变更

```bash
cd packages/integrate/skill/genui-integration
python3 scripts/check_changes.py
```

### 同步文档

```bash
# 同步所有部分
python3 scripts/sync_skill.py

# 只同步特定部分
python3 scripts/sync_skill.py --only vue

# 预览操作
python3 scripts/sync_skill.py --dry-run
```

### 完整工作流

```bash
# 自动检查并同步
python3 scripts/update_workflow.py

# 自动执行，不提示确认
python3 scripts/update_workflow.py --auto
```

### 依赖安装

同步脚本需要以下 Python 包：

```bash
pip install requests beautifulsoup4
```

详细的维护指南请参见 [MAINTENANCE.md](MAINTENANCE.md)。

## 📝 版本信息

- **当前版本**: 1.0.0
- **最后更新**: 2026-07-29
- **维护者**: genui-sdk-team

## 🔗 相关资源

- [GenUI SDK 在线文档](https://docs.opentiny.design/genui-sdk/)
- [GenUI SDK GitHub](https://github.com/opentiny/genui-sdk)
- [Skill 开发指南](../../README.md)

## 📄 许可证

MIT License
