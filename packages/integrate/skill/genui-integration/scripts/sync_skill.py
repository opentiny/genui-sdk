#!/usr/bin/env python3
"""
GenUI SDK Skill 同步脚本

从在线文档同步内容到 skill 文件，确保 skill 与文档保持一致。

使用方法：
    python3 sync_skill.py [选项]

选项：
    --dry-run          只显示将要执行的同步操作，不实际执行
    --only TYPE        只同步指定类型 (vue|angular|server|examples|all)
    --force            强制覆盖所有文件
    --preserve-custom  保留用户自定义修改（在 preserve_sections 中定义）
"""

import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
import argparse
import requests
from bs4 import BeautifulSoup
import re

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
            f"{DOCS_BASE_URL}/examples/renderer/state.html",
            f"{DOCS_BASE_URL}/examples/renderer/required-complete-field-selectors.html",
            f"{DOCS_BASE_URL}/examples/chat/custom-actions.html",
            f"{DOCS_BASE_URL}/examples/chat/custom-components.html",
            f"{DOCS_BASE_URL}/examples/chat/history.html",
            f"{DOCS_BASE_URL}/examples/chat/image-upload.html",
            f"{DOCS_BASE_URL}/examples/angular/renderer/custom-actions.html",
            f"{DOCS_BASE_URL}/examples/angular/renderer/custom-components.html",
        ],
        "target": SKILL_DIR / "examples",
    },
}

# 需要保留的用户自定义章节（不会被同步覆盖）
PRESERVE_SECTIONS = [
    "## 自定义配置",
    "## 项目特定说明",
]


def fetch_page(url: str) -> str:
    """
    获取网页内容

    Args:
        url: 网页 URL

    Returns:
        网页 HTML 内容
    """
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"警告: 无法获取 {url}: {e}")
        return ""


def html_to_markdown(html: str, url: str = "") -> str:
    """
    将 HTML 转换为 Markdown

    Args:
        html: HTML 内容
        url: 源 URL（用于生成链接）

    Returns:
        Markdown 格式的内容
    """
    soup = BeautifulSoup(html, 'html.parser')

    # 提取主要内容区域（通常是 .content 或 main）
    main_content = soup.find('main') or soup.find('div', class_='content') or soup.find('article')

    if not main_content:
        main_content = soup.body if soup.body else soup

    # 移除导航、侧边栏等
    for element in main_content.find_all(['nav', 'aside', 'footer', 'header']):
        element.decompose()

    # 转换为 Markdown
    markdown_lines = []

    for element in main_content.children:
        if hasattr(element, 'name'):
            if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                level = int(element.name[1])
                markdown_lines.append(f"\n{'#' * level} {element.get_text(strip=True)}\n")
            elif element.name == 'p':
                markdown_lines.append(f"\n{element.get_text(strip=True)}\n")
            elif element.name == 'pre':
                code = element.find('code')
                if code:
                    lang = ''
                    if code.get('class'):
                        for cls in code['class']:
                            if cls.startswith('language-'):
                                lang = cls.replace('language-', '')
                                break
                    markdown_lines.append(f"\n```{lang}\n{code.get_text()}\n```\n")
            elif element.name == 'ul':
                for li in element.find_all('li'):
                    markdown_lines.append(f"- {li.get_text(strip=True)}")
                markdown_lines.append("")
            elif element.name == 'ol':
                for i, li in enumerate(element.find_all('li'), 1):
                    markdown_lines.append(f"{i}. {li.get_text(strip=True)}")
                markdown_lines.append("")
            elif element.name == 'table':
                # 简单处理表格
                markdown_lines.append("\n")
                for i, row in enumerate(element.find_all('tr')):
                    cells = [cell.get_text(strip=True) for cell in row.find_all(['th', 'td'])]
                    markdown_lines.append("| " + " | ".join(cells) + " |")
                    if i == 0:
                        markdown_lines.append("| " + " | ".join(["---"] * len(cells)) + " |")
                markdown_lines.append("\n")

    # 翻译为中文
    content = "\n".join(markdown_lines)
    content = translate_content(content)

    # 添加源链接
    if url:
        content = f"<!-- 源文档: {url} -->\n\n{content}"

    return content


def translate_content(content: str, target_lang: str = "zh") -> str:
    """
    将内容翻译为目标语言

    这里使用简单的替换规则，实际项目中可以接入翻译 API
    """
    translations = {
        "Installation": "安装",
        "Quick Start": "快速开始",
        "Configuration": "配置",
        "Usage": "使用",
        "Examples": "示例",
        "API Reference": "API 参考",
        "Next Steps": "下一步",
        "Troubleshooting": "故障排除",
        "Prerequisites": "前提条件",
        "Getting Started": "开始使用",
    }

    for eng, chi in translations.items():
        content = content.replace(eng, chi)

    return content


def merge_markdown(urls: list[str], target: Path, preserve_custom: bool = False) -> str:
    """
    合并多个网页的 Markdown 内容

    Args:
        urls: 源 URL 列表
        target: 目标文件路径
        preserve_custom: 是否保留用户自定义章节

    Returns:
        合并后的内容
    """
    merged = []

    # 如果保留自定义内容，先读取现有文件
    custom_sections = []
    if preserve_custom and target.exists():
        existing = target.read_text(encoding="utf-8")
        for section in PRESERVE_SECTIONS:
            if section in existing:
                # 提取该章节的内容
                start = existing.find(section)
                if start != -1:
                    # 找到下一个同级或更高级的章节
                    next_section = existing.find("\n## ", start + len(section))
                    if next_section == -1:
                        custom_sections.append(existing[start:])
                    else:
                        custom_sections.append(existing[start:next_section])

    # 获取并合并 URL 内容
    for url in urls:
        print(f"获取: {url}")
        html = fetch_page(url)
        if html:
            markdown = html_to_markdown(html, url)
            merged.append(markdown)
            merged.append("\n\n---\n\n")

    # 添加保留的自定义章节
    if custom_sections:
        merged.append("\n\n---\n\n")
        merged.extend(custom_sections)

    return "".join(merged)


def sync_examples(urls: list[str], target: Path, dry_run: bool = False):
    """同步示例文件"""
    for url in urls:
        if dry_run:
            print(f"[DRY RUN] 将同步: {url}")
            continue

        print(f"获取示例: {url}")
        html = fetch_page(url)
        if not html:
            continue

        # 确定目标文件路径
        # 从 URL 提取路径，例如：
        # https://docs.opentiny.design/genui-sdk/examples/renderer/custom-actions.html
        # -> examples/renderer/custom-actions.md
        path_match = re.search(r'/examples/(.+?)\.html', url)
        if path_match:
            rel_path = path_match.group(1)
            target_file = target / f"{rel_path}.md"

            # 创建目录
            target_file.parent.mkdir(parents=True, exist_ok=True)

            # 转换并保存
            markdown = html_to_markdown(html, url)
            target_file.write_text(markdown, encoding="utf-8")
            print(f"已保存: {target_file.relative_to(SKILL_DIR)}")


def sync_references(key: str, dry_run: bool = False, preserve_custom: bool = False):
    """同步参考文档"""
    mapping = MAPPINGS[key]
    urls = mapping["urls"]
    target = mapping["target"]

    if dry_run:
        print(f"[DRY RUN] 将同步 {key}:")
        for url in urls:
            print(f"  - {url}")
        print(f"  -> {target.relative_to(SKILL_DIR)}")
        return

    # 合并并翻译
    merged_content = merge_markdown(urls, target, preserve_custom)

    # 写入目标文件
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(merged_content, encoding="utf-8")
    print(f"已同步: {key} -> {target.relative_to(SKILL_DIR)}")


def update_version_info():
    """更新 SKILL.md 的版本信息"""
    skill_md = SKILL_DIR / "SKILL.md"
    if not skill_md.exists():
        return

    # 读取当前内容
    content = skill_md.read_text(encoding="utf-8")

    # 更新 last_synced
    now = datetime.now().strftime("%Y-%m-%d")
    if "last_synced:" in content:
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if line.startswith("last_synced:"):
                lines[i] = f"last_synced: {now}"
                break
        content = "\n".join(lines)

    skill_md.write_text(content, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="同步 GenUI SDK Skill")
    parser.add_argument("--dry-run", action="store_true", help="只显示将要执行的操作")
    parser.add_argument("--only", choices=["vue", "angular", "server", "examples", "all"], default="all")
    parser.add_argument("--force", action="store_true", help="强制覆盖所有文件")
    parser.add_argument("--preserve-custom", action="store_true", help="保留用户自定义修改")

    args = parser.parse_args()

    print("=" * 60)
    print("GenUI SDK Skill 同步工具")
    print("=" * 60)
    print(f"文档基础 URL: {DOCS_BASE_URL}")
    print(f"Skill 目录: {SKILL_DIR}")
    print()

    if args.only == "all":
        keys = ["vue", "angular", "server", "examples"]
    else:
        keys = [args.only]

    for key in keys:
        if key == "examples":
            sync_examples(MAPPINGS[key]["urls"], MAPPINGS[key]["target"], args.dry_run)
        else:
            sync_references(key, args.dry_run, args.preserve_custom)

    if not args.dry_run:
        update_version_info()
        print()
        print("✅ 同步完成!")
        print(f"更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    print("=" * 60)


if __name__ == "__main__":
    main()
