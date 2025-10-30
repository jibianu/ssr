# SEO SSR Verification Script (PowerShell for Windows)
# 
# Verifies that SSR output contains all required SEO meta tags, structured data,
# and canonical URLs for optimal search engine optimization.
#
# Usage:
#   .\scripts\verify-ssr-seo.ps1
#   $env:SSR_URL="http://localhost:4000"; .\scripts\verify-ssr-seo.ps1

param(
    [string]$BaseUrl = $env:SSR_URL,
    [string[]]$TestPaths = @('/', '/about-us', '/contact-us')
)

if (-not $BaseUrl) {
    $BaseUrl = "http://localhost:4000"
}

Write-Host "🔍 Verifying SEO tags for $BaseUrl...`n" -ForegroundColor Cyan

$results = @()
$totalPassed = 0
$totalFailed = 0

foreach ($path in $TestPaths) {
    $url = "$BaseUrl$path"
    Write-Host "📄 Testing $path..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $html = $response.Content
        
        $checks = @{
            HasTitle = $html -match '<title>[\s\S]*?</title>'
            HasDescription = $html -match '<meta\s+name=["'']description["''][^>]*>'
            HasOGTitle = $html -match '<meta\s+property=["'']og:title["''][^>]*>'
            HasOGDescription = $html -match '<meta\s+property=["'']og:description["''][^>]*>'
            HasOGImage = $html -match '<meta\s+property=["'']og:image["''][^>]*>'
            HasOGUrl = $html -match '<meta\s+property=["'']og:url["''][^>]*>'
            HasTwitterCard = $html -match '<meta\s+name=["'']twitter:card["''][^>]*>'
            HasCanonical = $html -match '<link\s+rel=["'']canonical["''][^>]*>'
            HasJSONLD = $html -match '<script\s+type=["'']application/ld\+json["''][^>]*>'
        }
        
        # Check for Organization schema in JSON-LD
        $hasOrganizationSchema = $false
        if ($checks.HasJSONLD) {
            $jsonLdMatches = [regex]::Matches($html, '<script\s+type=["'']application/ld\+json["''][^>]*>([\s\S]*?)</script>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $jsonLdMatches) {
                $content = $match.Groups[1].Value
                if ($content -match '@type["'']?\s*:\s*["'']?Organization') {
                    $hasOrganizationSchema = $true
                    break
                }
            }
        }
        
        $checks['HasOrganizationSchema'] = $hasOrganizationSchema
        
        # Determine if page passed
        $requiredChecks = @('HasTitle', 'HasDescription', 'HasOGTitle', 'HasOGDescription', 
                           'HasOGImage', 'HasOGUrl', 'HasTwitterCard', 'HasCanonical', 'HasJSONLD')
        
        $failedChecks = $requiredChecks | Where-Object { -not $checks[$_] }
        $passed = ($failedChecks.Count -eq 0) -and $hasOrganizationSchema
        
        if ($passed) {
            Write-Host "✅ $path passed all checks`n" -ForegroundColor Green
            $totalPassed++
        } else {
            Write-Host "❌ $path failed:" -ForegroundColor Red
            if ($failedChecks.Count -gt 0) {
                Write-Host "   Missing: $($failedChecks -join ', ')" -ForegroundColor Red
            }
            if (-not $hasOrganizationSchema) {
                Write-Host "   Missing Organization schema" -ForegroundColor Red
            }
            Write-Host ""
            $totalFailed++
        }
        
        $results += [PSCustomObject]@{
            Path = $path
            Passed = $passed
            Checks = $checks
        }
        
    } catch {
        Write-Host "❌ $path failed to fetch: $($_.Exception.Message)`n" -ForegroundColor Red
        $totalFailed++
        
        $results += [PSCustomObject]@{
            Path = $path
            Passed = $false
            Error = $_.Exception.Message
        }
    }
}

# Summary
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

foreach ($result in $results) {
    $status = if ($result.Passed) { "✅" } else { "❌" }
    Write-Host "$status $($result.Path)" -ForegroundColor $(if ($result.Passed) { "Green" } else { "Red" })
    if ($result.Error) {
        Write-Host "   $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "Results: $totalPassed/$($results.Count) pages passed" -ForegroundColor $(if ($totalPassed -eq $results.Count) { "Green" } else { "Yellow" })
Write-Host ("=" * 60) -ForegroundColor Cyan

if ($totalPassed -eq $results.Count) {
    Write-Host "`n🎉 All pages passed SEO verification!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  $totalFailed page(s) failed verification" -ForegroundColor Yellow
    Write-Host "`nPlease check the errors above and ensure:" -ForegroundColor Yellow
    Write-Host "1. SSR server is running (pnpm run serve:ssr)" -ForegroundColor Yellow
    Write-Host "2. All components use MetadataService and StructuredDataService" -ForegroundColor Yellow
    Write-Host "3. Meta tags are set in component ngOnInit or constructor" -ForegroundColor Yellow
    exit 1
}

