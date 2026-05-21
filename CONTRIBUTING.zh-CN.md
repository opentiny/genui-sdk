# 贡献指南

语言： [English](CONTRIBUTING.md) | 简体中文

感谢你有意愿参与 GenUI SDK 开源项目的贡献！参与贡献的形式有很多种，你可以根据自己的特长和兴趣选择其中的一个或多个：

- 报告[新缺陷](https://github.com/opentiny/genui-sdk/issues/new?template=bug-report.yml)
- 为[已有缺陷](https://github.com/opentiny/genui-sdk/labels/bug)提供更详细的信息，比如补充截图、提供更详细的复现步骤、提供最小可复现 demo 链接等
- 修改文档中的错别字或完善文档
- 修复缺陷
- 实现新特性
- 完善单元测试
- 参与代码检视

## 提交 Issue

使用 GitHub Issues 报告缺陷。报告时请包含以下信息：

- **清晰的问题描述**：说明你遇到了什么问题
- **复现步骤**：详细描述如何复现该问题
- **预期行为 vs 实际行为**：说明你期望的结果和实际发生的情况
- **环境信息**：如 Node 版本、操作系统、相关依赖版本等

## 新特性建议

如果你有新特性想法，欢迎通过 [Issues](https://github.com/opentiny/genui-sdk/issues) 提交，请说明：

- 该特性主要解决什么问题
- 你期望的 API 或使用方式

## 提交 Pull Request

1. **Fork 本仓库**：点击 [GenUI SDK](https://github.com/opentiny/genui-sdk) 仓库右上角的 Fork 按钮
2. **创建新分支**：`git checkout -b feature/amazing-feature` 并开始你的修改
3. **遵循代码规范**：确保你的代码符合项目的代码风格规范
4. **更新文档**：如有需要，请更新 README.md 或相关文档
5. **提交 Pull Request**：完成修改后提交 PR

### 本地启动演练场

- fork 到个人仓后，使用git 克隆个人仓库到本地
- 关联上游仓库，方便同步上游仓库最新代码
- 在 genui-sdk 根目录下运行 `pnpm i`, 安装依赖
- 运行 `pnpm dev`，启动演练场
- 打开浏览器访问

```shell
# 将 username 替换为你的 GitHub 用户名
git clone git@github.com:username/genui-sdk.git
cd genui-sdk

# 关联上游仓库
git remote add upstream git@github.com:opentiny/genui-sdk.git

# 安装依赖
pnpm i

# 启动 Playground 开发环境
pnpm dev
```

### 本地启动其他项目

server、docs等启动步骤与演练场相似，仅需修改启动命名，具体命令请查看`package.json`

### 提交 PR 的步骤

1. 确保已完成本地开发环境搭建，并能正常运行
2. 同步上游仓库最新代码：`git pull upstream main`
3. 从上游创建新分支：`git checkout -b username/feature-name upstream/main`
4. 进行本地开发
5. 遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范提交
6. 推送到你的 Fork：`git push origin branch-name`
7. 在 [Pull Requests](https://github.com/opentiny/genui-sdk/pulls) 页面创建 PR
8. 等待 Code Review，根据反馈调整代码

### Commit 规范示例

推荐使用 Conventional Commits 格式，例如：

```
feat: 添加 schema 校验功能
fix: 修复渲染器在空数据时的崩溃问题
docs: 更新贡献指南
style: 统一代码缩进格式
refactor: 重构 schema 解析逻辑
test: 添加 tiny-schema-renderer 单元测试
chore: 升级依赖版本
```

### 代码规范

- 保持代码简洁、可读
- 为新功能补充必要的注释和文档
- 修改或新增功能时，请同步更新相关测试用例

## 加入社区

如果你对 GenUI SDK 或 OpenTiny 开源项目感兴趣，欢迎通过以下方式加入：

- 添加官方小助手微信：`opentiny-official`，加入技术交流群
- 加入邮件列表：<opentiny@googlegroups.com>

---

感谢你的贡献！
