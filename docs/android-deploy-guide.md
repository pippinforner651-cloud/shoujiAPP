# Android APP 构建与部署指南

> 全民环游中国虚拟跑步地图  
> 版本 1.0.0  
> 更新: 2026-07-10

---

## 一、架构总览

```
┌─────────────────────────────────────────────────┐
│                 Android APP (WebView)             │
│  ┌───────────────────────────────────────────┐  │
│  │              Capacitor                    │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │          React App (Vite)           │  │  │
│  │  │  ┌───────┐ ┌──────┐ ┌───────────┐  │  │  │
│  │  │  │ 首页   │ │ 跑步  │ │ 排行榜/我的│  │  │  │
│  │  │  └───────┘ └──────┘ └───────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                        │                          │
│                   HTTPS / WebSocket              │
│                        ▼                          │
│                  API Server (Fastify)             │
│                        │                          │
│                   PostgreSQL (Render/Railway)     │
└─────────────────────────────────────────────────┘
```

---

## 二、前置条件

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 18 | 前端构建 |
| npm | >= 9 | 包管理 |
| Java JDK | >= 17 | Android 编译（仅打包需要） |
| Android Studio | 最新 | Android 项目管理和 APK 生成 |
| Git | 最新 | 版本管理 |

---

## 三、构建 APK（完整流程）

### 步骤 1：构建前端

```bash
cd frontend
npm install
npm run build
# 输出: dist/ → index.html + assets/
```

### 步骤 2：安装 Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 步骤 3：初始化 Android 项目

```bash
# 首次
npx cap add android

# 后续更新
npx cap sync android
```

### 步骤 4：生成 APK

```bash
# 方式1：命令行
npx cap open android
# → Android Studio 打开后
# → Build → Build Bundle(s) / APK(s) → Build APK(s)
# → 生成: android/app/build/outputs/apk/debug/app-debug.apk
```

### 步骤 5：安装到手机

```bash
# 通过 adb
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 或直接拷贝 APK 文件到手机，点击安装
```

---

## 四、APK 文件信息

| 项目 | 值 |
|------|-----|
| APP 名称 | 全民环游中国 |
| 包名 | `com.chinarun.app` |
| 版本 | 1.0.0 |
| 最低 SDK | Android 7.0 (API 24) |
| 目标 SDK | Android 14 (API 34) |
| 安装包大小 | 约 8-15 MB（含 WebView 运行时） |

---

## 五、微信登录配置

### 前置条件

1. 在 [微信开放平台](https://open.weixin.qq.com) 注册开发者账号
2. 创建移动应用 → 获取 `APP_ID`
3. 提交应用审核（获取登录权限）

### 配置步骤

```
backend/.env 中配置：
  WECHAT_APP_ID=wx_your_app_id
  WECHAT_APP_SECRET=your_app_secret

frontend/capacitor.config.ts 中配置：
  plugins.Wechat.appId: "wx_your_app_id"
```

### 微信登录流程

```
Android APP → 点击"微信登录"
  → 拉起微信SDK
  → 用户确认授权
  → 返回 auth code
  → APP 发送 code 到后端 POST /v1/auth/wechat/login
  → 后端调微信接口获取 access_token + openid
  → 获取用户信息（昵称、头像）
  → 创建/更新用户
  → 返回 token
  → APP 进入首页
```

---

## 六、部署后端

### 方式 A：Docker Compose（推荐）

```bash
# 一键启动 (PostgreSQL + API)
cd backend
cp .env.example .env  # 配置数据库密码
docker compose up -d

# 初始化数据库
docker compose exec api npx prisma db push
docker compose exec api npx tsx prisma/seed.ts
```

### 方式 B：Render / Railway 云部署

```
1. 创建 PostgreSQL 实例
2. 部署 backend/ 到 Render Web Service
3. 设置环境变量 DATABASE_URL
4. 设置 PORT=3001
5. 部署后执行 migrate: npx prisma db push
```

### 方式 C：手动部署

```bash
# 1. 安装 PostgreSQL
# 2. 建库
createdb vr_china

# 3. 启动后端
cd backend
cp .env.example .env  # 修改 DATABASE_URL
npm install
npx prisma db push
npm run dev  # 开发模式
# 或
npm run build && npm start  # 生产模式
```

---

## 七、Android 权限说明

| 权限 | 用途 | 请求时机 |
|------|------|---------|
| `ACCESS_FINE_LOCATION` | GPS 精确定位 | 首次跑步 |
| `ACCESS_BACKGROUND_LOCATION` | 锁屏后继续记录 | 首次跑步 |
| `FOREGROUND_SERVICE` | 跑步前台服务 | 跑步开始 |
| `INTERNET` | API 请求 | APP 启动 |
| `WRITE_EXTERNAL_STORAGE` | 保存分享照片 | 分享时 |

---

## 八、真机测试清单

```
□ APK 安装成功
□ 桌面图标显示 "🌏 全民环游中国"
□ 打开 APP 显示 Splash 启动页
□ 自动跳转到登录页
□ 手机号 + 验证码 123456 登录成功
□ 进入首页，地图加载正常
□ 跑步 Tab 开启 GPS 授权
□ 开始跑步，距离实时更新
□ 暂停/继续正常
□ 结束跑步，显示 RunSummary
□ 跑量数据上传到服务器
□ 排行榜数据更新
□ 退出登录，数据保留
□ 重新登录，数据恢复
```

---

## 九、常见问题

### Q: 提示 "检测到模拟器"？
A: 使用真机测试，部分 Android 模拟器不支持 GPS。

### Q: GPS 精度不准？
A: 确保在室外开阔区域，开启 WiFi/4G 辅助定位。

### Q: APK 安装失败？
A: 检查是否开启"允许安装未知来源应用"。

### Q: 微信登录无反应？
A: 确认微信开放平台 APPID 配置正确，签名一致。

---

## 十、发布到应用商店

```
Android:
  1. 生成签名 APK
     Android Studio → Build → Generate Signed Bundle / APK
  2. 上传到华为/小米/OPPO/vivo 应用商店
  3. 每个商店需单独注册开发者账号

iOS:
  1. 需要 Mac + Xcode
  2. 注册 Apple Developer Program ($99/年)
  3. npx cap add ios
  4. Xcode → Archive → Distribute App
```
