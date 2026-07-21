<#
.SYNOPSIS
  E23 后端成果接入真实 GitHub 分支脚本（在您的 Windows 仓库根目录运行）
.DESCRIPTION
  把本源码包中的 backend/、scripts/、deploy/、docs/ 成果接入到本地真实仓库的
  kimi/e23-v2-product 分支：校验 → 备份 → 复制 → 安装 → 测试 → 提交 → 推送。
  保护原则：不覆盖远程已修复文件（Android/工作流/根lock/vite/capacitor/index.html）、
  不创建孤儿历史、不修改 main、不 force push、测试不过不提交。
.PARAMETER PackageDir
  源码包解压目录（默认脚本所在目录的上级，即包根）
.PARAMETER SkipTests
  跳过测试直接提交（不推荐，仅供调试）
.EXAMPLE
  cd D:\Kimi制作文件\E23跑起来_Kimi_Git
  powershell -ExecutionPolicy Bypass -File .\scripts\integrate-kimi-backend.ps1
#>
[CmdletBinding()]
param(
  [string]$PackageDir = (Split-Path -Parent $PSScriptRoot),
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$Branch = 'kimi/e23-v2-product'
$script:HadStash = $false
$script:Copied = @()

function Log([string]$msg, [string]$color = 'Cyan') { Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $msg" -ForegroundColor $color }
function Ok([string]$msg) { Log "✅ $msg" 'Green' }
function Warn([string]$msg) { Log "⚠️  $msg" 'Yellow' }
function Die([string]$msg) { Log "❌ $msg" 'Red'; throw $msg }

# ============ 1. 校验当前目录是真实 Git 仓库 ============
Log '== 1/16 校验真实 Git 仓库 =='
if (-not (Test-Path '.git')) { Die '当前目录不是 Git 仓库（缺少 .git）。请先 clone 您的仓库到本目录。' }
$inside = git rev-parse --is-inside-work-tree 2>$null
if ($inside -ne 'true') { Die 'git rev-parse 校验失败。' }
Ok 'Git 仓库有效'

# ============ 2. 校验远程 origin ============
Log '== 2/16 校验远程 origin =='
$origin = git remote get-url origin 2>$null
if (-not $origin) { Die '未配置 origin 远程。请执行：git remote add origin <您的仓库URL>' }
Ok "origin = $origin"

# ============ 3. 拉取远程分支清单 ============
Log '== 3/16 git fetch origin =='
git fetch origin | Out-Null
if ($LASTEXITCODE -ne 0) { Die 'git fetch 失败：请检查网络与凭据。' }
Ok 'fetch 完成'

# ============ 4. 校验目标远程分支存在（不建孤儿历史） ============
Log '== 4/16 校验远程目标分支存在 =='
$remoteBranch = git ls-remote --heads origin $Branch
if (-not $remoteBranch) { Die "远程不存在分支 $Branch。按约定不得新建孤儿历史，请先确认分支名。" }
Ok "origin/$Branch 存在"

# ============ 5. 切换并同步到远程分支 ============
Log '== 5/16 切换到最新远程分支 =='
$dirty = git status --porcelain
if ($dirty) {
  Warn '工作区有未提交改动，先 stash 保护（脚本结束不会自动恢复，请自行 git stash pop）'
  git stash push -m "integrate-kimi-backend 自动保护 $(Get-Date -Format 'yyyyMMdd-HHmmss')" | Out-Null
  $script:HadStash = $true
}
git checkout $Branch 2>$null
if ($LASTEXITCODE -ne 0) { git checkout -b $Branch "origin/$Branch" }
git pull --ff-only origin $Branch | Out-Null
if ($LASTEXITCODE -ne 0) { Die '无法快进到最新远程分支（存在分叉）。请人工处理后再运行。' }
Ok "已位于 $Branch 最新提交（不修改 main、不 force push）"

# ============ 6. 校验源码包完整性 ============
Log '== 6/16 校验源码包 =='
$pkgBackend = Join-Path $PackageDir 'backend'
if (-not (Test-Path $pkgBackend)) { Die "源码包缺少 backend/：$PackageDir" }
foreach ($f in @('package.json','tsconfig.json','Dockerfile','docker-compose.yml','prisma\schema.prisma','src\server.ts')) {
  if (-not (Test-Path (Join-Path $pkgBackend $f))) { Die "源码包 backend/ 缺少 $f" }
}
Ok 'backend/ 结构完整'

# ============ 7. 校验 registry 与 appId（防远程修复被回滚） ============
Log '== 7/16 校验 registry 与 appId =='
$locks = @((Join-Path $pkgBackend 'package-lock.json'))
foreach ($lk in $locks) {
  if ((Get-Content $lk -Raw) -match 'msh\.team') { Die "源码包 $lk 含失效镜像 msh.team，禁止接入。" }
}
Ok 'package-lock 均为 registry.npmjs.org；android/ 不在本脚本写入范围，远程 appId 与 Kotlin 修复不会被触碰'

# ============ 8. 备份将被覆盖的现有内容 ============
Log '== 8/16 备份现有 backend/ =='
$backupDir = ".backup-integrate-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path 'backend') {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
  Copy-Item -Recurse 'backend' (Join-Path $backupDir 'backend')
  Ok "已备份到 $backupDir（如验收失败：Remove-Item backend -Recurse -Force; Copy-Item -Recurse $backupDir\backend backend）"
} else {
  Ok '无既有 backend/，跳过备份'
}

# ============ 9. 复制 backend/（排除产物与本地数据） ============
Log '== 9/16 复制 backend/ =='
if (Test-Path 'backend') { Remove-Item -Recurse -Force 'backend' }
New-Item -ItemType Directory -Path 'backend' | Out-Null
robocopy $pkgBackend 'backend' /MIR /XD node_modules dist data .git /XF .env *.local /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -gt 7) { Die "robocopy 失败（code $LASTEXITCODE）" }
$script:Copied += 'backend'
Ok 'backend/ 已接入（不含 node_modules/dist/本地数据）'

# ============ 10. 复制脚本、部署与文档 ============
Log '== 10/16 复制 deploy/ 与 docs/ =='
foreach ($dir in @('deploy','docs')) {
  $src = Join-Path $PackageDir $dir
  if (Test-Path $src) {
    robocopy $src $dir /MIR /NFL /NDL /NJH /NJS | Out-Null
    $script:Copied += $dir
  }
}
$ps1Src = Join-Path $PackageDir 'scripts\integrate-kimi-backend.ps1'
if ((Test-Path $ps1Src) -and -not (Test-Path 'scripts\integrate-kimi-backend.ps1')) {
  New-Item -ItemType Directory -Path 'scripts' -Force | Out-Null
  Copy-Item $ps1Src 'scripts\'
}
Ok 'deploy/、docs/、scripts/ 已同步'

# ============ 11. 校验接入结果 ============
Log '== 11/16 校验接入结果 =='
foreach ($f in @('backend\package.json','backend\prisma\schema.prisma','backend\src\server.ts','deploy\deploy.sh')) {
  if (-not (Test-Path $f)) { Die "接入后缺少 $f" }
}
if ((Get-Content 'backend\package-lock.json' -Raw) -match 'msh\.team') { Die '接入后 lock 出现失效镜像（不应发生）' }
Ok '文件校验通过'

# ============ 12. 安装后端依赖 ============
Log '== 12/16 npm ci =='
Push-Location backend
npm ci
if ($LASTEXITCODE -ne 0) { Pop-Location; Die 'npm ci 失败' }
Pop-Location
Ok '依赖安装完成'

# ============ 13. 本地验证（typecheck / lint / test / build） ============
if ($SkipTests) {
  Warn '== 13/16 已按参数跳过测试（不推荐）=='
} else {
  Log '== 13/16 本地验证：typecheck → lint → test → build =='
  Push-Location backend
  try {
    npm run typecheck;  if ($LASTEXITCODE -ne 0) { Die 'typecheck 失败' }
    npm run lint;       if ($LASTEXITCODE -ne 0) { Die 'lint 失败' }
    npm test;           if ($LASTEXITCODE -ne 0) { Die 'API 集成测试失败（vitest）' }
    npm run build;      if ($LASTEXITCODE -ne 0) { Die '构建失败' }
  } finally { Pop-Location }
  Ok '全部本地验证通过'
}

# ============ 14. 提交（不提交产物与密钥） ============
Log '== 14/16 提交 =='
git add backend deploy docs scripts/integrate-kimi-backend.ps1
$staged = git diff --cached --name-only
if ($staged -match '\.env($|\.)') { Die '检测到 .env 被暂存：密钥严禁入仓。' }
if (-not $staged) { Warn '没有需要提交的变更（仓库已是最新成果）'; exit 0 }
git commit -m "接入E23后端成果：API/数据库/校验引擎/多平台适配器契约/部署包（沙箱31项集成测试通过）"
if ($LASTEXITCODE -ne 0) { Die '提交失败' }
$headSha = git rev-parse HEAD
Ok "提交完成：$headSha"

# ============ 15. 推送（仅目标分支，不 force） ============
Log '== 15/16 推送 =='
git push origin $Branch
if ($LASTEXITCODE -ne 0) { Die "推送失败。若是 non-fast-forward：先 git pull --rebase origin $Branch 后重跑本脚本；禁止 force push。" }
$remoteSha = (git ls-remote origin $Branch).Split()[0]
if ($remoteSha -ne $headSha) { Die "推送后 SHA 不一致：local=$headSha remote=$remoteSha" }
Ok "推送成功，SHA 一致：$remoteSha"

# ============ 16. 输出验收指引 ============
Log '== 16/16 完成 =='
Write-Host ''
Write-Host '================ 接入完成 ================' -ForegroundColor Green
Write-Host "分支：$Branch"
Write-Host "提交：$remoteSha"
Write-Host '下一步验收：'
Write-Host '  1. GitHub → Actions → Kimi Backend CI 应自动运行，请确认绿色'
Write-Host '  2. 本地已验证：typecheck / lint / vitest(31) / build'
Write-Host '  3. 云部署按 deploy/云端资源清单.md 与 deploy/环境变量清单.md 执行'
Write-Host '  4. 悦跑圈真实联调按 docs/悦跑圈真实联调清单.md 执行（当前 mock_verified）'
if ($script:HadStash) { Warn '您有 stash 保护的改动：git stash list 查看，git stash pop 恢复' }
