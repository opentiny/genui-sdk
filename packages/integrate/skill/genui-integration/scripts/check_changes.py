#!/usr/bin/env python3
"""
检查文档变更脚本

检测在线文档是否有更新，并提示是否需要同步到 skill。

使用方法：
    python3 check_changes.py [选项]

选项：
    --json             以 JSON 格式输出结果
    --auto-sync        如果有变更，自动执行同步
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
import argparse
import requests
from email.utils import parsedate_to_datetime

# 配置
SKILL_DIR = Path(__file__).parent.parent
DOCS_BASE_URL = "https://docs.opentiny.design/genui-sdk"

# 在线文档映射关系
MAPPINGS = {
    "vue": {
        "urls": [
            f"{DOCS_BASE_URL}/guide/quick-start.html",
            f"{DOCS_BASE_URL}/guide/start-with-renderer.html",
            f"{DOCS_BASE_URL}/guide/renderer-with-tiny-robot.html",
        ],
        "target": SKILL_DIR / "references" / "vue.md",
    },
    "angular": {
        "urls": [
            f"{DOCS_BASE_URL}/guide/angular/install.html",
            f"{DOCS_BASE_URL}/guide/angular/start-with-renderer.html",
        ],
        "target": SKILL_DIR / "references" / "angular.md",
    },
    "server": {
        "urls": [
            f"{DOCS_BASE_URL}/guide/server-usage.html",
        ],
        "target": SKILL_DIR / "references" / "server.md",
    },
    "examples": {
        "urls": [
            f"{DOCS_BASE_URL}/examples/renderer/custom-actions.html",
            f"{DOCS_BASE_URL}/examples/renderer/custom-components.html",
            f"{DOCS_BASE_URL}/examples/chat/custom-actions.html",
            f"{DOCS_BASE_URL}/examples/chat/custom-components.html",
        ],
        "target": SKILL_DIR / "examples",
    },
}


def get_url_last_modified(url: str) -> datetime:
    """
    获取 URL 的最后修改时间

    Args:
        url: 网页 URL

    Returns:
        最后修改时间，如果无法获取则返回 None
    """
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        response.raise_for_status()

        # 尝试从 Last-Modified 头获取
        last_modified = response.headers.get('Last-Modified')
        if last_modified:
            return parsedate_to_datetime(last_modified)

        # 如果没有 Last-Modified，尝试从 ETag 获取（作为备用）
        etag = response.headers.get('ETag')
        if etag:
            # ETag 通常包含时间戳信息，但不是标准格式
            # 这里只是作为标记，实际还是需要 Last-Modified
            pass

    except requests.RequestException as e:
        print(f"警告: 无法获取 {url}: {e}")

    return None


def check_url_changes(urls: list[str], target_time: datetime) -> dict:
    """
    检查 URL 是否有更新

    Args:
        urls: URL 列表
        target_time: 目标文件的最后修改时间

    Returns:
        变更信息
    """
    changes = []
    latest_source_time = None

    for url in urls:
        source_time = get_url_last_modified(url)

        if source_time:
            if latest_source_time is None or source_time > latest_source_time:
                latest_source_time = source_time

            if target_time and source_time > target_time:
                changes.append({
                    "url": url,
                    "last_modified": source_time.isoformat(),
                })

    return {
        "changes": changes,
        "latest_source_time": latest_source_time.isoformat() if latest_source_time else None,
        "has_changes": len(changes) > 0,
    }


def check_skill_sync_status() -> dict:
    """
    检查 skill 文件的同步状态

    Returns:
        同步状态信息
    """
    status = {}

    for skill_key, mapping in MAPPINGS.items():
        urls = mapping["urls"]
        target = mapping["target"]

        # 获取目标文件的修改时间
        if skill_key == "examples":
            # 对于 examples，检查目录中最新的文件
            if target.exists():
                target_time = max(
                    (f.stat().st_mtime for f in target.rglob("*.md") if f.is_file()),
                    default=0
                )
                target_time = datetime.fromtimestamp(target_time) if target_time > 0 else None
            else:
                target_time = None
        else:
            # 对于参考文档，检查单个文件
            if target.exists():
                target_time = datetime.fromtimestamp(target.stat().st_mtime)
            else:
                target_time = None

        # 检查 URL 变更
        result = check_url_changes(urls, target_time)

        status[skill_key] = {
            "synced": not result["has_changes"],
            "target_time": target_time.isoformat() if target_time else None,
            "source_time": result["latest_source_time"],
            "needs_sync": result["has_changes"],
            "changed_urls": result["changes"],
        }

    return status


def main():
    parser = argparse.ArgumentParser(description="检查在线文档变更")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    parser.add_argument("--auto-sync", action="store_true", help="如果有变更，自动同步")

    args = parser.parse_args()

    print("=" * 60)
    print("GenUI SDK 在线文档变更检查")
    print("=" * 60)
    print(f"文档基础 URL: {DOCS_BASE_URL}")
    print()

    # 检查同步状态
    sync_status = check_skill_sync_status()
    needs_sync = []

    print("同步状态:")
    print("-" * 60)

    for skill_key, status in sync_status.items():
        icon = "✅" if status["synced"] else "⚠️ "
        status_text = "已同步" if status["synced"] else "需要同步"
        print(f"{icon} {skill_key}: {status_text}")

        if not status["synced"]:
            needs_sync.append(skill_key)
            print(f"   Skill 文件: {status['target_time']}")
            print(f"   最新文档: {status['source_time']}")

            if status["changed_urls"]:
                print(f"   变更的 URL:")
                for change in status["changed_urls"][:3]:
                    print(f"     - {change['url']}")
                if len(status["changed_urls"]) > 3:
                    print(f"     ... 还有 {len(status['changed_urls']) - 3} 个 URL")

    # 输出 JSON
    if args.json:
        result = {
            "sync_status": sync_status,
            "needs_sync": needs_sync,
        }
        print("\n" + json.dumps(result, indent=2, ensure_ascii=False))

    # 自动同步
    if args.auto_sync and needs_sync:
        print("\n" + "=" * 60)
        print("自动同步...")
        print("=" * 60)

        # 导入同步脚本
        sys.path.insert(0, str(Path(__file__).parent))
        from sync_skill import sync_references, sync_examples, update_version_info, MAPPINGS as SYNC_MAPPINGS

        for skill_key in needs_sync:
            if skill_key == "examples":
                sync_examples(SYNC_MAPPINGS["examples"]["urls"], SYNC_MAPPINGS["examples"]["target"])
            else:
                sync_references(skill_key)

        update_version_info()
        print("\n✅ 同步完成!")

    elif needs_sync:
        print("\n" + "=" * 60)
        print("建议操作:")
        print(f"  python3 {Path(__file__).parent / 'sync_skill.py'} --only {','.join(needs_sync)}")
        print("=" * 60)
    else:
        print("\n✅ 所有文档都已同步，无需更新")

    print()


if __name__ == "__main__":
    main()
