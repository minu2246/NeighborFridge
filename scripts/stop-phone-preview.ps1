[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$marker = Join-Path $projectRoot '.project-root'
if (-not (Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne 'NeighborFridge') {
    throw 'NeighborFridge project root marker is missing.'
}

$pidFile = Join-Path $projectRoot 'storage\runtime\api.pid'
if (Test-Path -LiteralPath $pidFile) {
    $processId = [int](Get-Content -LiteralPath $pidFile -Raw)
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq 'node') { Stop-Process -Id $processId }
    Remove-Item -LiteralPath $pidFile -Force
}
Write-Host 'NeighborFridge phone preview processes were stopped.'
