[CmdletBinding()]
param(
    [string]$ComputerIp,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$marker = Join-Path $projectRoot '.project-root'
if (-not (Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne 'NeighborFridge') {
    throw 'NeighborFridge project root marker is missing.'
}

if (-not $ComputerIp) {
    $ComputerIp = [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
        Where-Object { $_.Address.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork -and $_.Address.ToString() -notlike '169.254.*' } |
        ForEach-Object { $_.Address.ToString() } |
        Select-Object -First 1
}
$parsedIp = $null
if (-not $ComputerIp -or -not [Net.IPAddress]::TryParse($ComputerIp, [ref]$parsedIp)) {
    throw 'PC IPv4 address could not be detected. Run again with -ComputerIp 192.168.x.x.'
}

$node = (Get-Command node -ErrorAction Stop).Source
$expoCli = Join-Path $projectRoot 'node_modules\expo\bin\cli'
$apiEntry = Join-Path $projectRoot 'apps\api\dist\main.js'
$runtimeRoot = Join-Path $projectRoot 'storage\runtime'
if (-not (Test-Path -LiteralPath $expoCli) -or -not (Test-Path -LiteralPath $apiEntry)) {
    throw 'Project dependencies or API build are missing. Run npm install and npm run build first.'
}

$apiUrl = "http://${ComputerIp}:3000/api"
Write-Host "Phone API address: $apiUrl"
Write-Host 'Connect the PC and phone to the same Wi-Fi network.'
if ($CheckOnly) {
    Write-Host 'Phone preview readiness check passed.'
    exit 0
}

New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$apiAlreadyRunning = $false
try { $apiAlreadyRunning = (Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/health' -TimeoutSec 2).StatusCode -eq 200 } catch {}
if (-not $apiAlreadyRunning) {
    $oldDatabaseUrl = $env:DATABASE_URL; $oldLocalStore = $env:LOCAL_STORE_ENABLED; $oldLocalDb = $env:LOCAL_DB_PATH; $oldJwt = $env:JWT_SECRET; $oldScheduler = $env:ENABLE_EXPIRY_SCHEDULER
    try {
        $env:DATABASE_URL = 'postgresql://neighbor_fridge:local-development-only@127.0.0.1:5432/neighbor_fridge'
        $env:LOCAL_STORE_ENABLED = 'true'
        $env:LOCAL_DB_PATH = 'storage/db/neighbor-fridge-local.sqlite'
        $env:JWT_SECRET = 'local-development-secret-change-before-production'
        $env:ENABLE_EXPIRY_SCHEDULER = 'false'
        $apiProcess = Start-Process -FilePath $node -ArgumentList $apiEntry -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeRoot 'api.log') -RedirectStandardError (Join-Path $runtimeRoot 'api-error.log') -PassThru
        Set-Content -LiteralPath (Join-Path $runtimeRoot 'api.pid') -Value $apiProcess.Id
    } finally {
        $env:DATABASE_URL = $oldDatabaseUrl; $env:LOCAL_STORE_ENABLED = $oldLocalStore; $env:LOCAL_DB_PATH = $oldLocalDb; $env:JWT_SECRET = $oldJwt; $env:ENABLE_EXPIRY_SCHEDULER = $oldScheduler
    }
}

$env:EXPO_PUBLIC_API_URL = $apiUrl
$env:EXPO_PUBLIC_USE_LOCAL_STORE = 'true'
$env:EXPO_NO_TELEMETRY = '1'
$env:LOCALAPPDATA = Join-Path $runtimeRoot 'localappdata'
$env:DOTSLASH_CACHE = Join-Path $runtimeRoot 'dotslash'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $runtimeRoot 'expo-home'
New-Item -ItemType Directory -Force -Path $env:LOCALAPPDATA | Out-Null
New-Item -ItemType Directory -Force -Path $env:DOTSLASH_CACHE | Out-Null
New-Item -ItemType Directory -Force -Path $env:__UNSAFE_EXPO_HOME_DIRECTORY | Out-Null
Write-Host ''
Write-Host 'Open Expo Go on the phone and scan the QR code below.'
Write-Host 'Press Ctrl+C when mobile testing is finished, then run npm run phone:stop.'
Push-Location (Join-Path $projectRoot 'apps\mobile')
try { & $node $expoCli start --lan }
finally { Pop-Location }
