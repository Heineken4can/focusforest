$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$dockerDesktopBin = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerCommand) {
  $dockerPath = $dockerCommand.Source
} elseif (Test-Path $dockerDesktopBin) {
  $dockerPath = $dockerDesktopBin
} else {
  throw 'docker command not found. Install Docker Desktop or add docker to PATH.'
}

& $dockerPath compose -f (Join-Path $repoRoot 'compose.dev.yaml') down -v
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
