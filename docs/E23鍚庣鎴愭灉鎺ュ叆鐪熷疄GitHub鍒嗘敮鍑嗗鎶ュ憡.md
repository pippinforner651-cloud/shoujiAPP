# E23后端成果接入真实GitHub分支准备报告

> 日期：2026-07-20 · 作业分支：kimi/e23-v2-product（未动 main，未建孤儿历史，未 force push）

## 一、沙箱当前 HEAD

| 项 | 值 |
|---|---|
| 本地 HEAD（接入包生成时） | 交付时 `git rev-parse HEAD` 实测值，与源码包文件名一致 |
| 分支 | kimi/e23-v2-product |
| origin | 沙箱无远程（凭据在您处）；接入脚本第 15 步会在您仓库推送后校验 local/remote SHA 一致 |

## 二、源码包文件清单（包内 docs/文件清单.md 同步给出）

- `backend/`：完整后端（src/prisma/tests/Dockerfile/docker-compose.yml/.env.example/eslint.config.mjs）
- `scripts/integrate-kimi-backend.ps1`：16 步接入脚本
- `deploy/`：Caddyfile、deploy.sh、pg_backup.sh、环境变量清单、云端资源清单、API接口说明、数据安全说明、真实数据接入状态表
- `docs/`：本报告、模拟验收报告、联调报告、悦跑圈联调清单、风险清单、第三阶段验收报告
- 前端与安卓工程全量源码（`.github/workflows/` 三个工作流；`e23_repo.bundle`：含最终 HEAD 的完整 git 历史（`git bundle list-heads` 输出中 kimi/e23-v2-product == 包文件名 SHA））

## 三、远程仓库与沙箱差异处理说明

| 远程已有修复 | 沙箱对应 | 处理方式 |
|---|---|---|
| npm 失效镜像修复 | 两个 lock 已全量替换 registry.npmjs.org（msh.team=0） | 保持一致；接入脚本第 7/11 步防回滚 |
| Pages 子路径与部署配置 | vite base 默认 './'，工作流注入 `VITE_BASE_PATH=/${repo}/` | 不覆盖远程工作流与 vite.config |
| Android Kotlin 冲突修复 | 沙箱 android/ 未含该修复（远程独有） | **脚本不写入 android/**，远程修复原样保留 |
| gradlew 权限修复 | 已修正为 git 100755 | 保持一致 |
| appId 区分正式/预览 | `com.e23running.app.kimi.preview` 一致 | 保持一致 |

## 四、CI 工作流命名与触发分支确认

| 工作流 | name | 触发 |
|---|---|---|
| kimi-backend-ci.yml | **Kimi Backend CI** | push/PR 到 kimi/e23-v2-product 且 backend/** 变更 + 手动 |
| kimi-android-preview.yml | **E23 Android 预览版 APK** | kimi 分支 + 手动（appId=...kimi.preview） |
| kimi-pwa-pages.yml | **E23 PWA 部署 GitHub Pages** | kimi 分支 + 手动（base=/${repo}/） |

## 五、沙箱已通过的本地验证（真实执行）

- `npm run typecheck`：tsc --noEmit 0 错误
- `npm run lint`：ESLint 9 + typescript-eslint 0 错误 0 警告
- `npm test`（= `test:integration`；外部 PG 经 TEST_DATABASE_URL 提供）/ `npm run test:ci`（CI service 模式）：vitest **31/31**（prisma db push --force-reset + seed；embedded-postgres 仅开发 fallback，Windows 无 URL 可读失败）
- `npm run test:unit`（根目录 = `node scripts/unit_test.mjs`）：**103/103** 静态与单元断言（早期文档曾写 82/82，为第六阶段末旧数字，已统一；口径对照见 docs/测试报告.md）
- 移动端四宽度（375/390/393/430）× 24 断言全过
- `npm run build`：前端 tsc+vite 通过；后端 tsc 产物 dist/src/server.js

## 六、接入脚本执行步骤（scripts/integrate-kimi-backend.ps1，16 步）

1 校验真实仓库 → 2 校验 origin → 3 fetch → 4 校验远程分支存在 → 5 切换并快进 → 6 校验源码包 → 7 校验 registry/appId → 8 备份现有 backend/ → 9 复制 backend/ → 10 复制 deploy/docs/scripts → 11 接入后校验 → 12 npm ci → 13 typecheck/lint/test/build → 14 提交（拒绝 .env） → 15 推送并校验 SHA 一致 → 16 输出验收指引。

保护：测试不过不提交；不覆盖 android/、.github/、根 package.json/package-lock.json、vite.config.ts、capacitor.config.ts、index.html；不修改 main；不 force push。

## 七、Windows 逐行命令（PowerShell）

源码包解压后顶层目录为 `app\`。下一步唯一命令（一行，先解压再接入；把 <SHA> 替换为包文件名中的完整 SHA）：

```powershell
Expand-Archive D:\Kimi制作文件\E23跑起来_Kimi正式开发线源码包_<SHA>.zip D:\Kimi制作文件\pkg -Force; cd D:\Kimi制作文件\E23跑起来_Kimi_Git; powershell -ExecutionPolicy Bypass -File D:\Kimi制作文件\pkg\app\scripts\integrate-kimi-backend.ps1
```

说明：脚本以**当前目录**为目标仓库（第 1 步校验 `.git`），PackageDir 默认取脚本所在目录的上级（即 `pkg\app`），无需额外参数。

## 八、脚本输出后的 GitHub Actions 验收清单

- [ ] Actions → **Kimi Backend CI** 对提交 SHA 运行：npm ci ✅ / typecheck ✅ / lint ✅ / PG service + Prisma 迁移 ✅ / vitest 31 ✅ / build ✅ / docker build ✅
- [ ] **E23 PWA 部署 GitHub Pages** 不受 backend/** 变更影响，保持绿色
- [ ] **E23 Android 预览版 APK** 不受 backend/** 变更影响，保持绿色
- [ ] origin/kimi/e23-v2-product SHA == 本地 HEAD SHA（脚本第 15 步已自动校验）

## 九、尚未完成事项（如实）

- GitHub 首次推送需您执行（沙箱无凭据）；Actions 首跑结果待确认
- 云服务器/域名采购与后端实际上线（deploy/云端资源清单.md）
- 悦跑圈官方凭据申请与 16 步真实联调（当前 mock_verified，**悦跑圈真实联调未完成**）
- docker build 沙箱内不可执行（无 Docker），已由 CI 工作流在 GitHub 环境承担
