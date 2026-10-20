# 정적 웹 미리보기를 apps/api/public/mobile 에 만든다 → API 실행 후 http://localhost:3000/mobile/
# 기본: 정식 API(PostgreSQL) 모드. -LocalStore: Docker 없는 로컬 SQLite 모드
[CmdletBinding()]
param([switch]$LocalStore)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mobileRoot = Join-Path $projectRoot 'apps\mobile'
$expoCli = Join-Path $projectRoot 'node_modules\expo\bin\cli'
$outputPath = Join-Path $projectRoot 'apps\api\public\mobile'

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.project-root'))) {
    throw 'Project root marker is missing.'
}

$env:EXPO_NO_TELEMETRY = '1'
$env:EXPO_PUBLIC_USE_LOCAL_STORE = if ($LocalStore) { 'true' } else { 'false' }
if (-not $env:EXPO_PUBLIC_API_URL) {
    $env:EXPO_PUBLIC_API_URL = 'http://localhost:3000/api'
}

Push-Location $mobileRoot
try {
    & node $expoCli export --platform web --output-dir $outputPath
    if ($LASTEXITCODE -ne 0) { throw 'Expo web export failed.' }
} finally {
    Pop-Location
}

Write-Host "Mobile web preview built at $outputPath"
