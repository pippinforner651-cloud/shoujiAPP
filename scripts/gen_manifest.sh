#!/bin/bash
# 生成文件清单（排除依赖/构建产物/版本库）
cd "$(dirname "$0")/.."
{
echo "# 文件清单"
echo ""
echo '```'
find . -path ./node_modules -prune -o -path ./dist -prune -o -path ./.git -prune -o -type f -print | sort
echo '```'
} > docs/文件清单.md
