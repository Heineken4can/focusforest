$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$stdout = Join-Path $repoRoot 'tmp-backend-stdout.log'
$stderr = Join-Path $repoRoot 'tmp-backend-stderr.log'
$envFile = Join-Path $repoRoot '.env'

function Get-EnvFileValue([string]$Path, [string]$Key) {
  if (-not (Test-Path $Path)) {
    return $null
  }

  $line = Get-Content $Path | Where-Object {
    $_ -match "^$Key="
  } | Select-Object -First 1

  if (-not $line) {
    return $null
  }

  return ($line -split '=', 2)[1].Trim()
}

$port = if ($env:PORT) {
  $env:PORT
} else {
  $portFromEnvFile = Get-EnvFileValue -Path $envFile -Key 'PORT'
  if ($portFromEnvFile) { $portFromEnvFile } else { '3000' }
}
$baseUrl = "http://127.0.0.1:$port"

if (Test-Path $stdout) {
  Remove-Item $stdout -Force
}

if (Test-Path $stderr) {
  Remove-Item $stderr -Force
}

$process = Start-Process -FilePath 'node' -ArgumentList 'dist/src/main.js' -WorkingDirectory $repoRoot -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr

function Get-HttpResult([string]$Uri) {
  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 5
    return [pscustomobject]@{
      Uri = $Uri
      StatusCode = [int]$response.StatusCode
    }
  } catch [System.Net.WebException] {
    $httpResponse = $_.Exception.Response
    if (-not $httpResponse) {
      throw
    }

    return [pscustomobject]@{
      Uri = $Uri
      StatusCode = [int]$httpResponse.StatusCode
    }
  }
}

try {
  for ($index = 0; $index -lt 20; $index++) {
    Start-Sleep -Milliseconds 500
    try {
      Invoke-WebRequest -Uri "$baseUrl/health/live" -UseBasicParsing -TimeoutSec 2 | Out-Null
      break
    } catch {
      if ($process.HasExited) {
        throw 'Backend process exited before becoming reachable.'
      }

      if ($index -eq 19) {
        throw "Backend did not become reachable on port $port."
      }
    }
  }

  $results = @(
    Get-HttpResult "$baseUrl/health/live"
    Get-HttpResult "$baseUrl/health/ready"
    Get-HttpResult "$baseUrl/api-docs/"
  )

  $results | ForEach-Object {
    Write-Host ('URI={0}' -f $_.Uri)
    Write-Host ('STATUS={0}' -f $_.StatusCode)
  }

  if (($results | Where-Object { $_.Uri -like '*/health/ready' }).StatusCode -ne 200) {
    exit 1
  }
} finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
  }

  if (Test-Path $stderr) {
    Get-Content -Raw $stderr
    Remove-Item $stderr -Force
  }

  if (Test-Path $stdout) {
    Remove-Item $stdout -Force
  }
}
