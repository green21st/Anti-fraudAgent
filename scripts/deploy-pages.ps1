param(
    [string]$HBuilderX = "F:\HBuilderX",
    [string]$Repo = "https://github.com/green21st/Anti-fraudAgent.git",
    [string]$Branch = "gh-pages"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $HBuilderX "plugins\uniapp-cli-vite"

if (-not (Test-Path $cli)) {
    throw "未找到 HBuilderX 编译插件：$cli，请用 -HBuilderX 指定 HBuilderX 安装目录"
}

# HBuilderX 工程没有 node_modules，构建时临时链接插件的依赖
$nm = Join-Path $root "node_modules"
if (-not (Test-Path $nm)) {
    New-Item -ItemType Junction -Path $nm -Target (Join-Path $cli "node_modules") | Out-Null
}

$dist = Join-Path $root "dist"
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }

$env:UNI_PLATFORM = "h5"
$env:UNI_INPUT_DIR = $root
$env:UNI_CLI_CONTEXT = $root
$env:NODE_ENV = "production"

Write-Host "正在构建 H5 ..." -ForegroundColor Cyan
Push-Location $root
try {
    $ErrorActionPreference = "Continue"
    & node (Join-Path $cli "node_modules\vite\bin\vite.js") build --config (Join-Path $cli "vite.config.js") 2>&1 | ForEach-Object { Write-Host $_ }
    $code = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    if ($code -ne 0) { throw "H5 构建失败" }
} finally {
    Pop-Location
}

if (-not (Test-Path (Join-Path $dist "index.html"))) {
    throw "构建产物缺失：$dist\index.html"
}

# 准备 gh-pages 发布目录（.nojekyll 防止 Jekyll 忽略下划线开头的资源文件）
$tmp = Join-Path $env:TEMP "anti-fraud-pages"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory $tmp | Out-Null
Copy-Item (Join-Path $dist "*") $tmp -Recurse
New-Item -ItemType File (Join-Path $tmp ".nojekyll") | Out-Null

Write-Host "正在推送到 $Branch 分支 ..." -ForegroundColor Cyan
Push-Location $tmp
try {
    $ErrorActionPreference = "Continue"
    git init -q 2>&1 | Out-Null
    git checkout -q -b $Branch
    git add -A
    git -c user.name="deploy" -c user.email="deploy@local" commit -q -m "deploy: H5 build"
    git remote add origin $Repo
    git push -f origin $Branch 2>&1 | ForEach-Object { Write-Host $_ }
    $code = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    if ($code -ne 0) { throw "推送失败：请确认已登录 GitHub，且拥有该仓库的写入权限" }
} finally {
    Pop-Location
}

Write-Host "部署完成：https://green21st.github.io/Anti-fraudAgent/" -ForegroundColor Green
