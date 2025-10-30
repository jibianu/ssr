# SEO Verification Quick Start

Quick guide to verify SEO meta tags and structured data in SSR output.

## 🚀 Quick Start

### 1. Start SSR Server
```bash
pnpm run serve:ssr
```
The server should start on `http://localhost:4000` (check the output).

### 2. Run Verification

**TypeScript (Recommended):**
```bash
pnpm run verify:seo
```

**JavaScript (Alternative):**
```bash
pnpm run verify:seo:js
```

**PowerShell (Windows):**
```powershell
.\scripts\verify-ssr-seo.ps1
```

### 3. Check Results

✅ **Success:** All pages passed verification
❌ **Failed:** Check errors and ensure:
- SSR server is running
- Components use `MetadataService` and `StructuredDataService`
- Meta tags are set in component lifecycle hooks

## 📋 What Gets Tested

### Pages Tested
- `/` (Homepage)
- `/about-us`
- `/contact-us`
- `/course/api-510` (if available)
- `/events/test-event` (if available)

### Required Meta Tags
- ✅ `<title>`
- ✅ `<meta name="description">`
- ✅ `<meta property="og:title">`
- ✅ `<meta property="og:description">`
- ✅ `<meta property="og:image">`
- ✅ `<meta property="og:url">`
- ✅ `<meta name="twitter:card">`
- ✅ `<link rel="canonical">`

### Structured Data (JSON-LD)
- ✅ `<script type="application/ld+json">`
- ✅ Organization schema (all pages)
- ✅ Course schema (course pages)
- ✅ Event schema (event pages)

## 🔧 Customization

### Test Different URLs

```bash
# Custom SSR server URL
SSR_URL=http://localhost:5000 pnpm run verify:seo

# Test specific course/event
SAMPLE_COURSE_URL=/course/my-course pnpm run verify:seo
SAMPLE_EVENT_URL=/events/my-event pnpm run verify:seo
```

### Add More Test Pages

Edit `scripts/verify-ssr-seo.ts` (or `.js` file) and modify the `testPages` array:

```typescript
const testPages: PageExpectations[] = [
  { path: '/', pageType: 'home', expectedSchemas: ['Organization', 'WebSite'] },
  { path: '/your-page', pageType: 'static', expectedSchemas: ['Organization'] },
  // Add more pages...
];
```

## 🐛 Troubleshooting

### Server Not Running
```
❌ / failed to fetch: connect ECONNREFUSED
```
**Fix:** Start SSR server with `pnpm run serve:ssr`

### Missing Meta Tags
```
❌ /course/api-510 failed:
   - Missing: hasOGTitle, hasOGDescription
```
**Fix:**
1. Check component uses `MetadataService.updateMetadata()` in `ngOnInit`
2. Verify route data is available during SSR
3. Check server logs for errors

### JSON-LD Missing
```
❌ / failed:
   - Missing Organization schema
```
**Fix:**
1. Ensure `StructuredDataService.setOrganization()` is called
2. Check component `ngOnInit` includes structured data setup
3. Verify platform checks aren't preventing execution

## 📚 More Information

- **Full Guide:** `SEO_SSR_VERIFICATION_GUIDE.md`
- **Implementation Details:** `SEO_IMPLEMENTATION_SUMMARY.md`
- **Scripts Documentation:** `scripts/README.md`

## 🎯 Expected Output

```
🔍 Verifying SEO tags for http://localhost:4000...

Testing 5 page(s):

📄 Testing /...
✅ / passed all checks

📄 Testing /about-us...
✅ /about-us passed all checks

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

## 💡 Tips

1. **Run after build:** Verify after `pnpm run build:ssr` before deploying
2. **CI/CD integration:** Add to your deployment pipeline
3. **Regular checks:** Run periodically to catch regressions
4. **Custom URLs:** Use environment variables for different environments

## 🔗 Related Commands

```bash
# Build SSR first
pnpm run build:ssr

# Serve and verify
pnpm run serve:ssr &
sleep 5
pnpm run verify:seo

# Production testing
SSR_URL=https://production.example.com pnpm run verify:seo
```

