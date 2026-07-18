# ============================================================
# E23跑起来 · Kimi 产品线发布脚本（Windows PowerShell）
# 用途：把当前项目推送到 GitHub 独立分支 kimi/e23-v2-product
# 铁律：禁止切换/修改 main；禁止 force push；不保存任何凭证
# HTTPS 备用（不写入凭证，Git 会交互式询问）：
#   git remote set-url origin https://github.com/pippinforner651-cloud/shoujiAPP.git
#   git push -u origin kimi/e23-v2-product
# ============================================================

$ErrorActionPreference = 'Stop'
$BRANCH = 'kimi/e23-v2-product'
$REMOTE = 'git@github.com:pippinforner651-cloud/shoujiAPP.git'

function Fail($msg) { Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }

# 1. 当前目录必须是 Git 仓库
git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "当前目录不是 Git 仓库" }

# 2. 检查工作区是否干净
$dirty = git status --porcelain
if ($dirty) { Fail "工作区有未提交改动，请先 commit：`n$dirty" }

# 3. 输出当前完整 Commit SHA
$SHA = git rev-parse HEAD
Write-Host "当前 Commit: $SHA"

# 4. 当前分支不得是 main，且禁止切到 main
$cur = git rev-parse --abbrev-ref HEAD
if ($cur -eq 'main') { Fail "当前在 main 分支，禁止从 main 发布；请先切到特性分支" }

# 5. 检查/添加 origin
$origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "origin 不存在，添加：$REMOTE"
  git remote add origin $REMOTE
} else {
  Write-Host "origin = $origin"
}

# 6. 创建或切换到 kimi/e23-v2-product
git show-ref --verify --quiet "refs/heads/$BRANCH"
if ($LASTEXITCODE -eq 0) {
  git checkout $BRANCH
} else {
  git checkout -b $BRANCH
}
if ($LASTEXITCODE -ne 0) { Fail "切换分支失败" }

# 7. 推送（明确禁止 force push）
Write-Host "推送到 origin/$BRANCH ..."
git push -u origin $BRANCH
if ($LASTEXITCODE -ne 0) { Fail "推送失败（真实错误见上方 Git 输出）。禁止改用 --force" }

# 8. 输出结果
Write-Host ""
Write-Host "✅ 发布完成"
Write-Host "远程分支: origin/$BRANCH"
Write-Host "Commit  : $SHA"
Write-Host "GitHub Actions 将自动：构建 APK（E23跑起来_Kimi预览版）+ 部署 PWA 到 GitHub Pages"
