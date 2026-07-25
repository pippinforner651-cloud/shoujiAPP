# 07_BUILD_AND_DEPLOY.md
## E23跑起来 · 构建与部署

## 本地开发

```bash
cd repo
npm install
npm run dev          # Vite 开发服务器 → http://localhost:5173
npm run build        # tsc + vite build → dist/
npx cap sync android # Capacitor sync
```

## Android APK

```bash
cd android
./gradlew clean assembleDebug
apksigner verify --verbose app-debug.apk
```

GitHub Actions 自动执行: `.github/workflows/codex-phase1-gps-map-apk.yml`

## PWA 部署

```bash
npm run build        # 构建 dist/
# 将 dist/ 部署到静态服务器
```

固定 Web 测试地址: `https://33764578423842b8a0268b9842908784.app.codebuddy.work`

## 环境变量

| 变量 | 用途 | 当前值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | (空) |
| `VITE_MULTIPLAYER_ENABLED` | 多人模式 | `false` |
| `VITE_TEST_SMS_CODE` | 测试验证码 | `123456` |
| `VITE_ANNUAL_GOAL_KM` | 年度目标 | `270` |
| `VITE_COMMIT_SHA` | 构建时注入 | GitHub Actions 自动 |
| `DATABASE_URL` | 后端 Prisma | (空) |

## GitHub Actions

- 工作流: `codex-phase1-gps-map-apk.yml`
- 触发: push 到 `codex/e23-phase1-gps-map-fix`
- 步骤: tsc → lint → test → build → cap sync → Android test → assemble → sign → upload
- Artifact 保留: 14 天
