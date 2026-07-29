# GenUI SDK Skill 维护指南

本文档说明如何在源文档变动时更新 skill。

## 📁 文件映射关系

### 参考文档来源
- `references/vue.md` ← `docs/src/guide/quick-start.md` + `docs/src/guide/start-with-renderer.md` + `docs/src/guide/renderer-with-tiny-robot.md`
- `references/angular.md` ← `docs/src/guide/angular/install.md` + `docs/src/guide/angular/start-with-renderer.md`
- `references/server.md` ← `docs/src/guide/server-usage.md`

### 示例文件来源
- `examples/renderer/*` ← `docs/src/examples/renderer/*`
- `examples/chat/*` ← `docs/src/examples/chat/*`
- `examples/angular/renderer/*` ← `docs/src/examples/angular/renderer/*`

## 🔄 更新流程

### 方式 1：手动更新（推荐用于小幅修改）

1. **识别变动的源文件**
   ```bash
   # 查看哪些文档文件有更新
   git log --oneline --since="2024-01-01" docs/src/guide/
   git log --oneline --since="2024-01-01" docs/src/examples/
   ```

2. **对比并更新对应的 skill 文件**
   - 打开源文档和 skill 文件
   - 对比差异
   - 将重要的变更同步到 skill 文件

3. **测试更新后的 skill**
   ```bash
   # 使用测试用例验证
   cd /Users/jyh/Desktop/work_space/clone/opentiny/genui-sdk/new-skills/genui-integration
   # 运行测试或手动检查关键内容
   ```

### 方式 2：使用同步脚本（推荐用于批量更新）

```bash
# 运行同步脚本
python3 scripts/sync_skill.py

# 或只同步特定部分
python3 scripts/sync_skill.py --only vue
python3 scripts/sync_skill.py --only examples
```

### 方式 3：重新生成（推荐用于大规模重构）

```bash
# 完全重新生成 skill
python3 scripts/regenerate_skill.py

# 这会：
# 1. 从源文档重新提取内容
# 2. 翻译为中文
# 3. 修复链接引用
# 4. 保留用户自定义的修改
```

## 📝 更新检查清单

每次更新后，检查以下内容：

- [ ] 代码示例是否最新
- [ ] API 名称是否正确
- [ ] 包名和版本号是否正确
- [ ] 链接引用是否有效
- [ ] 中文翻译是否准确
- [ ] 示例文件是否完整

## 🔍 常见问题

### Q: 如何知道哪些 skill 文件需要更新？

A: 运行以下命令查看源文档的变更：
```bash
# 查看最近的文档变更
git log --name-status --oneline docs/src/guide/ docs/src/examples/ | head -50
```

### Q: 更新后如何测试 skill？

A: 可以：
1. 使用 Claude 测试几个典型问题
2. 检查输出是否包含最新的 API 和用法
3. 验证代码示例是否可以运行

### Q: 如何保留对 skill 的自定义修改？

A: 在 `scripts/sync_skill.py` 中配置 `preserve_sections` 列表，标记需要保留的章节。

## 📌 版本追踪

在 SKILL.md 的 frontmatter 中添加版本信息：

```yaml
---
name: genui-integration
description: ...
version: 1.0.0
last_synced: 2026-07-29
source_commit: abc123
---
```

这样可以追踪 skill 是基于哪个版本的源文档生成的。
