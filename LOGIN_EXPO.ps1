[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path $PSScriptRoot).Path
$runtimeRoot = Join-Path $projectRoot 'storage\runtime'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $runtimeRoot 'expo-home'
$env:DOTSLASH_CACHE = Join-Path $runtimeRoot 'dotslash'
$env:EXPO_NO_TELEMETRY = '1'

Push-Location $projectRoot
try {
    & node node_modules\expo\bin\cli login
    if ($LASTEXITCODE -ne 0) { throw 'Expo login was not completed.' }
    & node node_modules\expo\bin\cli whoami
} finally {
    Pop-Location
}
