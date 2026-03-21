# PowerShell: build & run frontend Docker stack
#   .\deploy.ps1
#   $env:HOST_PORT = "8080"; .\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:HOST_PORT) {
    if ($env:PORT) { $env:HOST_PORT = $env:PORT }
    else { $env:HOST_PORT = "4000" }
}

Write-Host "Building image..."
docker compose build

Write-Host "Starting container on host port $($env:HOST_PORT) -> container 4000..."
docker compose up -d --remove-orphans

Write-Host ""
Write-Host "Public: http://localhost:$($env:HOST_PORT)/"
Write-Host "Elearn: http://localhost:$($env:HOST_PORT)/course/"
Write-Host "Stop: docker compose down"
