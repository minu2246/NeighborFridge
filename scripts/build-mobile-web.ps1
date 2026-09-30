[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mobileRoot = Join-Path $projectRoot 'apps\mobile'
$expoCli = Join-Path $projectRoot 'node_modules\expo\bin\cli'
$outputPath = Join-Path $projectRoot 'apps\api\public\mobile'

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.project-root'))) {
    throw 'Project root marker is missing.'
}

$env:EXPO_NO_TELEMETRY = '1'
$env:EXPO_PUBLIC_USE_LOCAL_STORE = 'true'
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
