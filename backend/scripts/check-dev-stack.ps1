$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot '.env'
$postgresProbe = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
$redisProbe = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue
$dockerDesktopBin = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = $null

if ($dockerCommand) {
  $dockerPath = $dockerCommand.Source
} elseif (Test-Path $dockerDesktopBin) {
  $dockerPath = $dockerDesktopBin
}

$checks = @(
  @{
    Name = 'backend/.env'
    Ok = Test-Path $envPath
    Detail = if (Test-Path $envPath) { 'present' } else { 'missing' }
  },
  @{
    Name = 'PostgreSQL localhost:5432'
    Ok = [bool]$postgresProbe.TcpTestSucceeded
    Detail = if ($postgresProbe.TcpTestSucceeded) { 'reachable' } else { 'not reachable' }
  },
  @{
    Name = 'Redis localhost:6379'
    Ok = [bool]$redisProbe.TcpTestSucceeded
    Detail = if ($redisProbe.TcpTestSucceeded) { 'reachable' } else { 'not reachable' }
  }
)

$checks | ForEach-Object {
  $status = if ($_.Ok) { 'OK' } else { 'FAIL' }
  Write-Host ('[{0}] {1} - {2}' -f $status, $_.Name, $_.Detail)
}

if (-not $dockerPath) {
  Write-Host '[INFO] docker command not found. compose.dev.yaml is ready, but Docker must be installed before dev:stack:up can be used.'
} else {
  Write-Host ('[OK] docker - {0}' -f $dockerPath)
}

if (($checks | Where-Object { -not $_.Ok }).Count -gt 0) {
  exit 1
}
