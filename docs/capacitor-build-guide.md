# Capacitor APP 构建指南

> 项目：全民环游中国虚拟跑步地图  
> 日期：2026-07-09

---

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 | 前端构建 |
| npm | >= 9 | 包管理 |
| Java JDK | >= 17 | Android 构建 |
| Android SDK | API 34+ | Android 构建 |
| Xcode | >= 15 | iOS 构建 |
| CocoaPods | >= 1.12 | iOS 依赖 |

---

## 第一步：安装 Capacitor

```bash
cd frontend

# 安装 Capacitor 核心包
npm install @capacitor/core @capacitor/cli

# 安装平台包
npm install @capacitor/android
npm install @capacitor/ios
```

---

## 第二步：构建前端

```bash
# 构建生产版本
npm run build

# 确认 dist/ 目录生成
ls dist/
# → index.html, assets/
```

---

## 第三步：初始化 Capacitor

```bash
# 初始化（已创建 capacitor.config.ts）
npx cap init 全民环游中国 com.chinarun.app

# 添加 Android 平台
npx cap add android

# 添加 iOS 平台
npx cap add ios
```

---

## 第四步：同步前端到平台

```bash
# 每次前端构建后执行
npx cap copy

# 同步依赖
npx cap sync
```

---

## 第五步：Android 构建

```bash
# 打开 Android Studio
npx cap open android

# 在 Android Studio 中：
# 1. Build → Build Bundle(s) / APK(s)
# 2. Build APK(s)
# 3. 生成 APK 位置：
#    android/app/build/outputs/apk/debug/
```

### Android 签名（发布版）

```bash
# 生成签名密钥
keytool -genkey -v -keystore chinarun.keystore \
  -alias chinarun -keyalg RSA -keysize 2048 -validity 10000

# 配置 android/app/build.gradle 中的 signingConfigs
```

---

## 第六步：iOS 构建

```bash
# 打开 Xcode
npx cap open ios

# 在 Xcode 中：
# 1. 选择目标设备/Generic iOS Device
# 2. Product → Archive
# 3. Distribute App
```

---

## 第七步：权限配置

### Android

编辑 `android/app/src/main/AndroidManifest.xml`，添加：

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS

编辑 `ios/App/App/Info.plist`，添加：

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>记录你的跑步轨迹</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>跑步时在后台持续记录位置</string>
```

---

## 快捷命令

```bash
# 完整构建 + 同步
npm run build && npx cap sync

# 开发调试（浏览器）
npm run dev

# 开发调试（Android 模拟器）
npm run build && npx cap copy && npx cap open android

# 开发调试（iOS 模拟器）
npm run build && npx cap copy && npx cap open ios
```

---

## 目录结构（生成后）

```
frontend/
├── android/                    ← Capacitor 生成
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── java/
│   │   └── build.gradle
│   └── build.gradle
├── ios/                        ← Capacitor 生成
│   └── App/
│       ├── App/
│       │   └── Info.plist
│       └── Podfile
├── dist/                       ← Vite 构建输出
├── capacitor.config.ts         ← ⚡ Capacitor 配置
└── package.json
```
