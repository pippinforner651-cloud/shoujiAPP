#!/bin/bash
# ===================================================
# 全民环游中国 - Android APK 完整构建脚本
# 用法: bash build-android.sh
# ===================================================

set -e

echo "═══════════════════════════════════════════"
echo "  全民环游中国 Android APK 构建"
echo "═══════════════════════════════════════════"

# 1. 检查环境
echo ""
echo "🔍 [1/6] 检查环境..."

command -v node >/dev/null 2>&1 || { echo "❌ 需要安装 Node.js"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ 需要安装 npm"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ 需要安装 npx"; exit 1; }

echo "  ✅ Node.js $(node -v)"
echo "  ✅ npm $(npm -v)"

# 检查 Java
if command -v java >/dev/null 2>&1; then
    echo "  ✅ Java available"
else
    echo "  ⚠️  需要 Java 17+ (仅打包需要)"
fi

# 2. 安装依赖
echo ""
echo "📦 [2/6] 安装前端依赖..."
cd frontend
npm install

echo ""
echo "📦 [2/6] 安装 Capacitor 平台..."
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. 构建前端
echo ""
echo "🔨 [3/6] 构建前端..."
npm run build
echo "  ✅ dist/ 生成完成"

# 4. 初始化 Capacitor Android
echo ""
echo "🤖 [4/6] 初始化 Android 平台..."
if [ ! -d "android" ]; then
    npx cap add android
    echo "  ✅ android/ 目录创建完成"
else
    echo "  ✅ android/ 已存在"
fi

# 5. 同步代码
echo ""
echo "🔄 [5/6] 同步前端到 Android..."
npx cap sync android
echo "  ✅ 同步完成"

# 6. 生成 APK
echo ""
echo "📱 [6/6] 生成 APK..."
echo ""
echo "═══════════════════════════════════════════"
echo "  手动步骤："
echo "═══════════════════════════════════════════"
echo ""
echo "  1. 打开 Android Studio:"
echo "     cd frontend && npx cap open android"
echo ""
echo "  2. 等待 Gradle 同步完成"
echo ""
echo "  3. 生成 APK:"
echo "     Build → Build Bundle(s) / APK(s)"
echo "            → Build APK(s)"
echo ""
echo "  4. APK 位置:"
echo "     android/app/build/outputs/apk/debug/"
echo "     → app-debug.apk"
echo ""
echo "  5. 安装到手机:"
echo "     adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo "     或直接拷贝 APK 到手机安装"
echo ""
echo "═══════════════════════════════════════════"

# 显示构建信息
echo ""
echo "📋 构建信息:"
echo "  APP名称:     全民环游中国"
echo "  包名:        com.chinarun.app"
echo "  版本:        1.0.0"
echo "  前端版本:    $(node -e "console.log(require('./package.json').version || '1.0.0')")"
echo "  Dist大小:    $(du -sh dist | cut -f1)"

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Android 构建环境准备完成"
echo "  请按照上述步骤在 Android Studio 中生成 APK"
echo "═══════════════════════════════════════════"
