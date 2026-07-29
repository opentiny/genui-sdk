# GenUI SDK Skill 维护指南

本指南说明如何在在线文档变动时更新 skill，确保 skill 与文档保持一致。

## 📁 目录结构

```
genui-integration/
├── SKILL.md                    # 主 skill 文件（高层指导）
├── MAINTENANCE.md              # 本维护指南
├── references/                 # 详细参考文档
│   ├── vue.md
│   ├── angular.md
│   └── server.md
├── examples/                   # 示例文件
│   ├── renderer/
│   ├── chat/
│   └── angular/
└── scripts/                    # 维护脚本
    ├── sync_skill.py           # 同步脚本（从 URL 获取）
    ├── check_changes.py        # 变更检查脚本
    └── update_workflow.py      # 完整工作流脚本
```

## 🌐 文档来源

**在线文档基础 URL**: `https://docs.opentiny.design/genui-sdk`

### 参考文档来源

| Skill 文件 | 在线文档 URL |
|-----------|-------------|
| `references/vue.md` | `/guide/quick-start.html`<br>`/guide/start-with-renderer.html`<br>`/guide/renderer-with-tiny-robot.html` |
| `references/angular.md` | `/guide/angular/install.html`<br>`/guide/angular/start-with-renderer.html` |
| `references/server.md` | `/guide/server-usage.html` |

### 示例文件来源

| Skill 目录 | 在线文档 URL |
|-----------|-------------|
| `examples/renderer/*` | `/examples/renderer/*.html` |
| `examples/chat/*` | `/examples/chat/*.html` |
| `examples/angular/*` | `/examples/angular/renderer/*.html` |

## 🔄 更新流程

### 方式 1：自动检查并同步（推荐）

使用完整工作流脚本，自动检查变更并提示同步：

```bash
# 进入 skill 目录
cd packages/integrate/skill/genui-integration

# 运行工作流
python3 scripts/update_workflow.py
```

该脚本会：
1. 检查在线文档的 Last-Modified 时间
2. 与本地 skill 文件时间对比
3. 显示需要同步的部分
4. 提示是否同步
5. 执行同步（如果确认）

### 方式 2：手动检查和同步

#### 步骤 1：检查变更

```bash
# 检查在线文档是否有更新
python3 scripts/check_changes.py

# 以 JSON 格式输出（用于 CI/CD）
python3 scripts/check_changes.py --json
```

输出示例：
```
============================================================
GenUI SDK 在线文档变更检查
============================================================
文档基础 URL: https://docs.opentiny.design/genui-sdk

同步状态:
------------------------------------------------------------
⚠️  vue: 需要同步
   Skill 文件: 2026-07-15T14:20:00
   最新文档: 2026-07-28T10:30:00
   变更的 URL:
     - https://docs.opentiny.design/genui-sdk/guide/quick-start.html
     - https://docs.opentiny.design/genui-sdk/guide/start-with-renderer.html
✅ angular: 已同步
✅ server: 已同步

============================================================
建议操作:
  python3 scripts/sync_skill.py --only vue
============================================================
```

#### 步骤 2：同步文档

```bash
# 同步所有部分
python3 scripts/sync_skill.py

# 只同步特定部分
python3 scripts/sync_skill.py --only vue
python3 scripts/sync_skill.py --only angular
python3 scripts/sync_skill.py --only examples

# 预览同步操作（不实际执行）
python3 scripts/sync_skill.py --dry-run

# 保留用户自定义修改
python3 scripts/sync_skill.py --preserve-custom
```

#### 步骤 3：验证同步结果

```bash
# 查看 git 差异
git diff packages/integrate/skill/genui-integration/

# 测试 skill
# 使用 Claude 测试几个典型问题，验证输出是否正确
```

### 方式 3：CI/CD 集成

在 CI/CD 管道中自动检查：

```yaml
# .github/workflows/check-skill-sync.yml
name: Check Skill Sync

on:
  schedule:
    - cron: '0 0 * * 1'  # 每周一检查
  workflow_dispatch:      # 手动触发

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install requests beautifulsoup4

      - name: Check for changes
        id: check
        run: |
          cd packages/integrate/skill/genui-integration
          python3 scripts/check_changes.py --json > changes.json
          echo "needs_sync=$(jq -r '.needs_sync | join(",")' changes.json)" >> $GITHUB_OUTPUT

      - name: Sync if needed
        if: steps.check.outputs.needs_sync != ''
        run: |
          cd packages/integrate/skill/genui-integration
          python3 scripts/sync_skill.py --only ${{ steps.check.outputs.needs_sync }}

      - name: Create PR
        if: steps.check.outputs.needs_sync != ''
        uses: peter-evans/create-pull-request@v5
        with:
          title: '🔄 Auto-sync skill with online docs'
          body: 'Automated sync from documentation updates'
          branch: 'auto-sync/skill-update'
          labels: 'maintenance,skill'
```

## 📝 更新检查清单

每次更新后，检查以下内容：

- [ ] 代码示例是否最新
- [ ] API 名称是否正确
- [ ] 包名和版本号是否正确
- [ ] 链接引用是否有效
- [ ] 中文翻译是否准确
- [ ] 示例文件是否完整
- [ ] SKILL.md 的版本信息是否更新
- [ ] 测试用例是否仍然通过

## 🔍 常见问题

### Q: 如何知道在线文档是否有更新？

A: 运行 `check_changes.py` 脚本，它会检查 HTTP Last-Modified 头：
```bash
python3 scripts/check_changes.py
```

### Q: 更新后如何测试 skill？

A: 可以：
1. 使用 Claude 测试几个典型问题
2. 检查输出是否包含最新的 API 和用法
3. 验证代码示例是否可以运行

### Q: 如何保留对 skill 的自定义修改？

A: 在同步时使用 `--preserve-custom` 标志：
```bash
python3 scripts/sync_skill.py --preserve-custom
```

这会在 `PRESERVE_SECTIONS` 中定义的章节不会被覆盖。

### Q: 同步脚本会覆盖所有内容吗？

A: 默认情况下，脚本会：
- 覆盖参考文档（references/*.md）
- 覆盖示例文件（examples/）
- 保留用户自定义章节（如果使用 --preserve-custom）

### Q: 如果在线文档结构变了怎么办？

A: 如果文档结构发生重大变化：
1. 更新 `scripts/sync_skill.py` 中的 `html_to_markdown` 函数
2. 调整 MAPPINGS 配置
3. 手动运行一次同步并检查结果

### Q: 如何处理大规模的文档重构？

A: 对于大规模重构，建议：
1. 先备份当前 skill
2. 使用 `--force` 标志完全重新生成
3. 手动检查和调整翻译
4. 运行测试验证

```bash
# 备份
cp -r packages/integrate/skill/genui-integration /tmp/skill-backup

# 强制同步
python3 scripts/sync_skill.py --force

# 验证
git diff packages/integrate/skill/genui-integration/
```

## 📌 版本追踪

skill 的版本信息记录在 `SKILL.md` 的 frontmatter 中：

```yaml
---
name: genui-integration
description: ...
version: 1.0.0
last_synced: 2026-07-29
maintainer: genui-sdk-team
---
```

- `version`: skill 的版本号（遵循语义化版本）
- `last_synced`: 最后同步日期
- `maintainer`: 维护者

## 🛠️ 脚本说明

### sync_skill.py

从在线文档同步内容到 skill 文件。

**主要功能**：
- 获取在线文档 HTML
- 转换为 Markdown
- 翻译为中文
- 写入 skill 文件
- 更新版本信息

**用法**：
```bash
python3 scripts/sync_skill.py [选项]

选项：
  --dry-run          预览操作
  --only TYPE        只同步指定类型 (vue|angular|server|examples|all)
  --force            强制覆盖
  --preserve-custom  保留自定义修改
```

**依赖**：
```bash
pip install requests beautifulsoup4
```

### check_changes.py

检查在线文档变更并分析影响。

**主要功能**：
- 检查 HTTP Last-Modified 头
- 与本地文件时间对比
- 显示需要同步的部分
- 提供同步建议

**用法**：
```bash
python3 scripts/check_changes.py [选项]

选项：
  --json             JSON 格式输出
  --auto-sync        自动同步
```

**依赖**：
```bash
pip install requests
```

### update_workflow.py

完整的更新工作流。

**主要功能**：
- 检查变更
- 显示影响
- 提示确认
- 执行同步
- 验证结果

**用法**：
```bash
python3 scripts/update_workflow.py [选项]

选项：
  --auto             自动执行，不提示确认
  --skip-check       跳过检查，直接同步
  --dry-run          预览操作
  --preserve-custom  保留自定义修改
```

## 📚 相关资源

- [GenUI SDK 在线文档](https://docs.opentiny.design/genui-sdk/)
- [GenUI SDK GitHub](https://github.com/opentiny/genui-sdk)
- [Skill 创建指南](../../README.md)
