# Run in normal Windows PowerShell, outside the Codex sandbox.
# Git Credential Manager stores credentials in Windows Credential Manager.
$ErrorActionPreference = 'Stop'
$projectRepo = $PSScriptRoot
$projectGit = 'C:\Program Files\Git\cmd\git.exe'
$projectRemote = 'https://github.com/minu2246/NeighborFridge.git'

if (-not (Test-Path -LiteralPath $projectGit)) {
    throw 'Git for Windows was not found.'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRepo '.git'))) {
    throw 'This script must remain in the NeighborFridge repository root.'
}

# The repository can be created by the isolated Codex account and later used by
# the normal Windows account. Trust only this exact checkout before querying it.
$safeProjectRepo = $projectRepo.Replace('\', '/')
$safeDirectories = @(& $projectGit config --global --get-all safe.directory)
if ($safeDirectories -notcontains $safeProjectRepo) {
    & $projectGit config --global --add safe.directory $safeProjectRepo
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not register the NeighborFridge checkout as a safe Git directory.'
    }
}

$existingRemote = & $projectGit -C $projectRepo remote get-url origin
if ($LASTEXITCODE -ne 0) {
    throw 'Could not read the origin URL after registering the safe directory.'
}
if ($existingRemote -ne $projectRemote) {
    throw 'The origin URL differs from the expected NeighborFridge repository.'
}

& $projectGit -C $projectRepo config --local --replace-all credential.helper manager
& $projectGit -C $projectRepo config --local credential.credentialStore wincredman
& $projectGit -C $projectRepo config --local credential.interactive true
& $projectGit -C $projectRepo config --local http.sslBackend schannel

Write-Host 'Complete GitHub login in the browser as minu2246.'
& $projectGit -C $projectRepo credential-manager github login --username minu2246 --browser
if ($LASTEXITCODE -ne 0) { throw 'GitHub login was not completed.' }

& $projectGit -C $projectRepo push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed.' }

Write-Host 'SUCCESS: NeighborFridge main was pushed to GitHub.' -ForegroundColor Green
