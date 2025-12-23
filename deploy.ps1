# PowerShell script for Frontend Angular SSR Docker Deployment (Windows)

$ErrorActionPreference = "Stop"

# Configuration
$ImageName = if ($env:IMAGE_NAME) { $env:IMAGE_NAME } else { "course-angular-ui:latest" }
$ContainerName = if ($env:CONTAINER_NAME) { $env:CONTAINER_NAME } else { "course-angular-ui" }
$Port = if ($env:PORT) { $env:PORT } else { "4000" }
$ApiBaseUrl = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:8080" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Frontend Angular SSR Docker Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop and remove existing container
Write-Host "[1/4] Stopping existing container (if any)..." -ForegroundColor Yellow
docker stop $ContainerName 2>$null
docker rm $ContainerName 2>$null
Write-Host "✓ Cleanup complete" -ForegroundColor Green

# Step 2: Build Docker image
Write-Host "[2/4] Building Docker image..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
docker build -t $ImageName --build-arg BUILD_ENV=production .
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build complete" -ForegroundColor Green

# Step 3: Run container
Write-Host "[3/4] Starting container..." -ForegroundColor Yellow

docker run -d `
  --name $ContainerName `
  --restart unless-stopped `
  --cpus="1.0" `
  --memory="512m" `
  -p "${Port}:${Port}" `
  -e "PORT=${Port}" `
  -e "NODE_ENV=production" `
  -e "API_BASE_URL=${ApiBaseUrl}" `
  -e "NODE_OPTIONS=--max-old-space-size=512" `
  $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Container start failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Container started" -ForegroundColor Green

# Step 4: Wait and verify
Write-Host "[4/4] Waiting for application to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$status = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
if ($status) {
    Write-Host "✓ Container is running: $status" -ForegroundColor Green
} else {
    Write-Host "✗ Container is not running! Check logs:" -ForegroundColor Red
    docker logs $ContainerName
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Frontend URL: http://localhost:$Port" -ForegroundColor White
Write-Host "API Base URL: $ApiBaseUrl" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:    docker logs -f $ContainerName"
Write-Host "  Stop:         docker stop $ContainerName"
Write-Host "  Start:        docker start $ContainerName"
Write-Host "  Remove:       docker rm -f $ContainerName"
Write-Host "  Check CPU:    docker stats $ContainerName"
Write-Host ""

