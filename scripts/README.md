# SEO Verification Scripts

This directory contains scripts to verify that SSR output contains all required SEO meta tags, structured data, and canonical URLs.

## Available Scripts

### TypeScript Version (Recommended)
```bash
pnpm run verify:seo
```

Uses `ts-node` to run the TypeScript verification script. Requires `ts-node` (already in devDependencies).

### JavaScript Version
```bash
pnpm run verify:seo:js
# or
node scripts/verify-ssr-seo.js
```

Pure JavaScript version that works without TypeScript compilation. No dependencies required.

### PowerShell Version (Windows)
```powershell
.\scripts\verify-ssr-seo.ps1
```

PowerShell script for Windows users. No Node.js required.

## Usage Examples

### Basic Usage
```bash
# Make sure SSR server is running first
pnpm run serve:ssr

# In another terminal, run verification
pnpm run verify:seo
```

### Custom SSR URL
```bash
# TypeScript/JavaScript
SSR_URL=http://localhost:4000 pnpm run verify:seo
SSR_URL=https://production.example.com pnpm run verify:seo

# PowerShell
$env:SSR_URL="http://localhost:4000"; .\scripts\verify-ssr-seo.ps1
```

### Custom Test Pages
```bash
# TypeScript/JavaScript
SAMPLE_COURSE_URL=/course/api-510 SAMPLE_EVENT_URL=/events/test-event pnpm run verify:seo

# PowerShell - modify the $TestPaths parameter or script
.\scripts\verify-ssr-seo.ps1 -TestPaths @('/', '/course/api-510', '/events/test-event')
```

## What It Checks

### Required Meta Tags
- ✅ `<title>` tag
- ✅ `<meta name="description">`
- ✅ `<meta property="og:title">`
- ✅ `<meta property="og:description">`
- ✅ `<meta property="og:image">`
- ✅ `<meta property="og:url">`
- ✅ `<meta name="twitter:card">`
- ✅ `<link rel="canonical">`

### Structured Data (JSON-LD)
- ✅ `<script type="application/ld+json">` presence
- ✅ Organization schema (expected on all pages)
- ✅ Course schema (expected on course pages)
- ✅ Event schema (expected on event pages)

## Output Example

```
🔍 Verifying SEO tags for http://localhost:4000...

Testing 5 page(s):

📄 Testing /...
✅ / passed all checks

📄 Testing /about-us...
✅ /about-us passed all checks

📄 Testing /course/api-510...
✅ /course/api-510 passed all checks

============================================================
SUMMARY
============================================================
✅ /
✅ /about-us
✅ /course/api-510
============================================================
Results: 3/3 pages passed
============================================================

🎉 All pages passed SEO verification!
```

## Troubleshooting

### "Failed to fetch" Errors

**Issue:** Script can't connect to SSR server

**Solutions:**
1. Ensure SSR server is running: `pnpm run serve:ssr`
2. Check the URL in `SSR_URL` environment variable
3. Verify firewall/network settings allow connections
4. Try accessing the URL manually in a browser

### Missing Meta Tags

**Issue:** Verification fails for specific pages

**Solutions:**
1. Check that components use `MetadataService.updateMetadata()` in `ngOnInit`
2. Verify `StructuredDataService` is being called for structured data
3. Ensure route data is available during SSR (use resolvers if needed)
4. Check server logs for SSR errors

### JSON-LD Not Found

**Issue:** Structured data missing from output

**Solutions:**
1. Ensure `StructuredDataService` methods are called (setOrganization, setCourse, setEvent)
2. Check that services use platform checks correctly (`isPlatformBrowser`)
3. Verify components are rendered during SSR (not lazy-loaded incorrectly)

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Verify SEO Tags
  run: |
    pnpm run build:ssr
    pnpm run serve:ssr &
    sleep 10  # Wait for server to start
    pnpm run verify:seo
```

### GitLab CI Example
```yaml
verify_seo:
  script:
    - pnpm run build:ssr
    - pnpm run serve:ssr &
    - sleep 10
    - pnpm run verify:seo
```

## Adding Custom Tests

To test additional pages, modify the `testPages` array in:
- `scripts/verify-ssr-seo.ts` (TypeScript)
- `scripts/verify-ssr-seo.js` (JavaScript)
- `scripts/verify-ssr-seo.ps1` (PowerShell - `$TestPaths` parameter)

## Related Documentation

- `../SEO_SSR_VERIFICATION_GUIDE.md` - Complete verification guide
- `../SEO_IMPLEMENTATION_SUMMARY.md` - SEO implementation details

