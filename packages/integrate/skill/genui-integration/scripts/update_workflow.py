#!/usr/bin/env python3
"""
GenUI SDK Skill 更新工作流

完整的检查和同步工作流，自动化文档更新过程。

使用方法：
    python3 update_workflow.py [选项]

选项：
    --since DATE       检查指定日期之后的变更 (YYYY-MM-DD)
    --auto             自动执行同步，不提示确认
    --skip-check       跳过变更检查，直接同步
    --dry-run          预览操作，不实际执行
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime
import argparse

# 配置
SKILL_DIR = Path(__file__).parent.parent
PROJECT_ROOT = SKILL_DIR.parents[3]

# 导入其他脚本
sys.path.insert(0, str(Path(__file__).parent))
from check_changes import get_git_changes, get_affected_skills, check_skill_sync_status
from sync_skill import sync_references, sync_examples, update_version_info, MAPPINGS


def print_header(title: str):
    """打印标题"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_section(title: str):
    """打印章节标题"""
    print(f"\n{title}")
    print("-" * 70)


def check_step(since: str = None) -> dict:
    """
    步骤 1: 检查变更

    Returns:
        变更分析结果
    """
    print_section("步骤 1: 检查文档变更")

    changes = get_git_changes(since)

    if not changes:
        print("✅ 最近没有文档变更")
        return {"needs_sync": [], "affected": {}}

    print(f"发现 {len(changes)} 个 commit 包含文档变更\n")

    # 分析影响
    affected = get_affected_skills(changes)

    if not affected:
        print("✅ 变更不影响 skill 文件")
        return {"needs_sync": [], "affected": {}}

    # 显示影响
    print("受影响的 skill 部分:")
    for skill_key, data in affected.items():
        print(f"\n  {skill_key.upper()}:")
        print(f"    变更文件数: {data['count']}")
        print(f"    涉及 commits: {len(data['commits'])}")
        print(f"    文件:")
        for file in data["files"][:3]:
            print(f"      - {file}")
        if len(data["files"]) > 3:
            print(f"      ... 还有 {len(data['files']) - 3} 个文件")

    # 检查同步状态
    print_section("当前同步状态")

    sync_status = check_skill_sync_status()
    needs_sync = []

    for skill_key, status in sync_status.items():
        icon = "✅" if status["synced"] else "⚠️ "
        status_text = "已同步" if status["synced"] else "需要同步"
        print(f"{icon} {skill_key}: {status_text}")

        if not status["synced"]:
            needs_sync.append(skill_key)
            print(f"   源文件: {status['source_time']}")
            print(f"   Skill:  {status['target_time']}")

    return {
        "needs_sync": needs_sync,
        "affected": affected,
        "sync_status": sync_status,
    }


def sync_step(needs_sync: list, dry_run: bool = False, preserve_custom: bool = False):
    """
    步骤 2: 同步文档

    Args:
        needs_sync: 需要同步的部分列表
        dry_run: 是否只预览
        preserve_custom: 是否保留自定义修改
    """
    if not needs_sync:
        print("\n✅ 所有部分都已同步，无需操作")
        return

    print_section("步骤 2: 同步文档")

    if dry_run:
        print("[DRY RUN] 将同步以下部分:")
        for skill_key in needs_sync:
            print(f"  - {skill_key}")
        return

    print(f"开始同步 {len(needs_sync)} 个部分...\n")

    for skill_key in needs_sync:
        if skill_key == "examples":
            print(f"同步示例文件...")
            sync_examples(MAPPINGS["examples"]["sources"], MAPPINGS["examples"]["target"])
        else:
            print(f"同步 {skill_key} 参考文档...")
            sync_references(skill_key, preserve_custom=preserve_custom)

    # 更新版本信息
    update_version_info()

    print("\n✅ 同步完成!")


def verify_step():
    """
    步骤 3: 验证结果
    """
    print_section("步骤 3: 验证结果")

    # 显示 git 状态
    try:
        output = subprocess.check_output(
            ["git", "status", "--short"],
            cwd=SKILL_DIR,
            stderr=subprocess.DEVNULL,
        ).decode("utf-8")

        if output.strip():
            print("修改的文件:")
            for line in output.strip().split("\n")[:10]:
                print(f"  {line}")
            if len(output.strip().split("\n")) > 10:
                print(f"  ... 还有更多文件")
        else:
            print("✅ 没有文件变更")

    except subprocess.CalledProcessError:
        print("⚠️  无法获取 git 状态")

    # 提示下一步操作
    print("\n建议的下一步操作:")
    print("  1. 查看变更: git diff packages/integrate/skill/genui-integration/")
    print("  2. 测试 skill: 使用 Claude 测试几个典型问题")
    print("  3. 提交变更: git add . && git commit -m 'chore: sync skill with docs'")


def main():
    parser = argparse.ArgumentParser(description="GenUI SDK Skill 更新工作流")
    parser.add_argument("--since", help="检查指定日期之后的变更 (YYYY-MM-DD)")
    parser.add_argument("--auto", action="store_true", help="自动执行同步，不提示确认")
    parser.add_argument("--skip-check", action="store_true", help="跳过变更检查，直接同步")
    parser.add_argument("--dry-run", action="store_true", help="预览操作，不实际执行")
    parser.add_argument("--preserve-custom", action="store_true", help="保留用户自定义修改")

    args = parser.parse_args()

    print_header("GenUI SDK Skill 更新工作流")
    print(f"项目根目录: {PROJECT_ROOT}")
    print(f"Skill 目录: {SKILL_DIR}")
    print(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 步骤 1: 检查变更
    if args.skip_check:
        result = {
            "needs_sync": ["vue", "angular", "server", "examples"],
            "affected": {},
        }
    else:
        result = check_step(args.since)

    # 步骤 2: 同步
    if result["needs_sync"]:
        if not args.auto and not args.dry_run:
            print("\n" + "=" * 70)
            response = input(f"是否同步 {len(result['needs_sync'])} 个部分? [y/N] ")
            if response.lower() not in ["y", "yes"]:
                print("取消操作")
                return

        sync_step(result["needs_sync"], args.dry_run, args.preserve_custom)

        # 步骤 3: 验证
        if not args.dry_run:
            verify_step()
    else:
        print("\n✅ 所有部分都已同步，无需操作")

    print_header("工作流完成")


if __name__ == "__main__":
    main()
