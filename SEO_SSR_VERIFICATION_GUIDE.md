# SEO & Meta Rendering - SSR Verification Guide

## Overview

This guide outlines how to verify that SSR (Server-Side Rendering) is correctly outputting SEO meta tags, structured data, and canonical URLs for optimal search engine crawling and social media sharing.

## Quick Verification Steps

### 1. Verify Meta Tags in SSR Output

**Using curl (Linux/Mac/Git Bash):**
```bash
curl -s http://localhost:4000/course/api-510 | grep -E '<title>|<meta|canonical'
```

**Using PowerShell (Windows):**
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/course/api-510" | Select-Object -ExpandProperty Content | Select-String -Pattern '<title>|<meta|canonical'
```

**What to check:**
- ✅ `<title>` tag is present with page-specific content
- ✅ `<meta name="description">` is present
- ✅ `<meta property="og:title">`, `og:description`, `og:image`, `og:url` are present
- ✅ `<meta name="twitter:card">`, `twitter:title`, `twitter:description` are present
- ✅ `<link rel="canonical">` is present with correct URL

### 2. Verify Structured Data (JSON-LD)

**Using curl:**
```bash
curl -s http://localhost:4000/course/api-510 | grep -A 20 'application/ld+json'
```

**What to check:**
- ✅ `<script type="application/ld+json">` tags are present
- ✅ JSON-LD contains valid schema.org structured data
- ✅ Course/Event schemas include required fields (name, description, url, provider)

**Validate with Google's Rich Results Test:**
1. Visit: https://search.google.com/test/rich-results
2. Enter your URL or paste HTML
3. Verify no errors and structured data is recognized

### 3. Verify Page Source (Browser)

**Steps:**
1. Start your SSR server: `npm run serve:ssr` or `pnpm run serve:ssr`
2. Open browser DevTools (F12)
3. Navigate to a course or event detail page
4. Right-click → "View Page Source" (not Inspect Element)
5. Check the `<head>` section for:
   - Meta tags are rendered (not added later by JavaScript)
   - Canonical URL is present
   - JSON-LD scripts are present in `<head>`

**Why "View Page Source" matters:**
- "Inspect Element" shows DOM after JavaScript execution
- "View Page Source" shows what search engines receive (the SSR HTML)

### 4. Test Different Page Types

**Course Detail Pages:**
```bash
curl -s http://localhost:4000/course/api-510 | grep -E 'Course|schema.org/Course'
```

**Event Detail Pages:**
```bash
curl -s http://localhost:4000/events/event-url | grep -E 'Event|schema.org/Event'
```

**Static Pages (About Us, Contact, etc.):**
```bash
curl -s http://localhost:4000/about-us | grep -E 'Organization|schema.org/Organization'
```

### 5. Check for Common Issues

#### Issue: Missing Meta Tags in SSR Output

**Symptoms:**
- Meta tags appear in browser but not in view-source
- Social media previews show default values

**Solutions:**
- Ensure `MetadataService.updateMetadata()` is called in `ngOnInit` or constructor
- Check that services are injected (not using `document` directly without platform check)
- Verify route data is available synchronously during SSR

#### Issue: Duplicate Meta Tags

**Symptoms:**
- Multiple `<meta name="description">` tags in output
- SEO validators report duplicate tags

**Solutions:**
- `MetadataService` now checks for existing tags before adding (fixed in v2.0)
- Remove any hardcoded meta tags from component templates
- Ensure only one service manages meta tags per component

#### Issue: JSON-LD Not Rendering in SSR

**Symptoms:**
- Structured data missing from view-source
- Rich Results Test shows no structured data

**Solutions:**
- `StructuredDataService` uses platform checks - verify it's being called
- Check browser console for errors when calling `injectStructuredData()`
- Ensure the component is rendered during SSR (not lazy-loaded incorrectly)

#### Issue: Canonical URL Not Set

**Symptoms:**
- `<link rel="canonical">` missing from SSR output
- Duplicate content warnings in search console

**Solutions:**
- Call `CanonicalService.setCanonicalURL()` with absolute URL
- Verify service uses `DOCUMENT` injectable (works in SSR)
- Check that URL includes protocol (https://) and full domain

## Automated Testing

### Create Verification Script

**`scripts/verify-ssr-seo.ts`:**
```typescript
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const baseUrl = process.env.SSR_URL || 'http://localhost:4000';
const testUrls = [
  '/',
  '/about-us',
  '/course/api-510',
  '/events/test-event'
];

function verifyMetaTags(html: string, pageType: string): boolean {
  const checks = {
    hasTitle: /<title>[\s\S]*?<\/title>/.test(html),
    hasDescription: /<meta\s+name=["']description["']/.test(html),
    hasOGTitle: /<meta\s+property=["']og:title["']/.test(html),
    hasCanonical: /<link\s+rel=["']canonical["']/.test(html),
    hasJSONLD: /<script\s+type=["']application\/ld\+json["']/.test(html)
  };

  const passed = Object.values(checks).every(v => v);
  
  if (!passed) {
    console.error(`❌ ${pageType} failed checks:`, checks);
  } else {
    console.log(`✅ ${pageType} passed all checks`);
  }
  
  return passed;
}

async function main() {
  console.log(`🔍 Verifying SEO tags for ${baseUrl}...\n`);
  
  let allPassed = true;
  for (const path of testUrls) {
    try {
      const url = `${baseUrl}${path}`;
      const html = execSync(`curl -s "${url}"`, { encoding: 'utf-8' });
      const passed = verifyMetaTags(html, path);
      allPassed = allPassed && passed;
    } catch (error) {
      console.error(`❌ Failed to fetch ${path}:`, error);
      allPassed = false;
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

main();
```

### Run Verification

```bash
# Add to package.json scripts:
# "verify:seo": "ts-node scripts/verify-ssr-seo.ts"

pnpm run verify:seo
```

## Browser Extension Tools

### Recommended Extensions

1. **SEO Meta in 1 CLICK** (Chrome/Firefox)
   - Quickly view all meta tags on any page
   - Highlights missing required tags

2. **Web Developer** (Chrome/Firefox)
   - View Meta Tags tool
   - Validate HTML structure

3. **Rich Results Test** (Official Google Tool)
   - https://search.google.com/test/rich-results
   - Validates structured data (JSON-LD)

## Social Media Preview Testing

### Facebook Sharing Debugger
- URL: https://developers.facebook.com/tools/debug/
- Enter your URL to see how Facebook will render it
- Shows Open Graph tags and preview

### Twitter Card Validator
- URL: https://cards-dev.twitter.com/validator
- Enter your URL to preview Twitter card
- Shows Twitter meta tags

### LinkedIn Post Inspector
- URL: https://www.linkedin.com/post-inspector/
- Enter your URL to see LinkedIn preview
- Uses Open Graph tags

## Production Verification

### 1. Google Search Console

1. Go to https://search.google.com/search-console
2. Navigate to "Enhancements" → "Structured Data"
3. Check for any errors or warnings
4. Verify pages are indexed with correct titles/descriptions

### 2. Google Rich Results Test

1. Visit: https://search.google.com/test/rich-results
2. Test your production URLs
3. Verify Course/Event structured data is recognized
4. Check for any warnings

### 3. Mobile-Friendly Test

1. Visit: https://search.google.com/test/mobile-friendly
2. Test your SSR pages
3. Verify meta viewport tag is present
4. Check page is mobile-friendly

## Common Meta Tag Checklist

### Required for All Pages

- ✅ `<title>` - Unique per page
- ✅ `<meta name="description">` - 150-160 characters
- ✅ `<meta name="viewport">` - Mobile responsiveness
- ✅ `<link rel="canonical">` - Absolute URL

### Open Graph (Facebook, LinkedIn)

- ✅ `og:title` - Page title
- ✅ `og:description` - Page description
- ✅ `og:type` - website, article, event
- ✅ `og:image` - 1200x630px recommended
- ✅ `og:url` - Canonical URL
- ✅ `og:site_name` - Site name

### Twitter Cards

- ✅ `twitter:card` - summary_large_image
- ✅ `twitter:title` - Page title
- ✅ `twitter:description` - Page description
- ✅ `twitter:image` - Image URL
- ✅ `twitter:site` - @username

### Structured Data (JSON-LD)

- ✅ Organization schema (all pages)
- ✅ Course schema (course pages)
- ✅ Event schema (event pages)
- ✅ BreadcrumbList (where applicable)

## Troubleshooting

### Meta Tags Not Showing in View Source

**Cause:** Component not rendering during SSR, or service not called

**Fix:**
- Ensure component is loaded synchronously (not lazy-loaded incorrectly)
- Call metadata service in `ngOnInit` or constructor
- Check server logs for SSR errors

### JSON-LD Script Not in Head

**Cause:** Script injected too late or in wrong location

**Fix:**
- `StructuredDataService` injects into `<head>` - verify it's called
- Check platform browser check isn't preventing execution
- Verify `DOCUMENT` is injected correctly

### Canonical URL Relative Instead of Absolute

**Cause:** Using relative URLs instead of absolute

**Fix:**
- Always use `environment.seoUrl + path` for canonical URLs
- Ensure protocol (https://) is included
- Check `environment.ts` has correct production URL

## Best Practices

1. **Always Use Services**
   - Use `MetadataService` for meta tags (not direct DOM manipulation)
   - Use `CanonicalService` for canonical URLs
   - Use `StructuredDataService` for JSON-LD

2. **Test SSR Output, Not Browser DOM**
   - Use "View Page Source" not "Inspect Element"
   - Use `curl` to verify raw HTML
   - Test with search engine tools

3. **Validate Structured Data**
   - Use Google Rich Results Test
   - Fix validation errors immediately
   - Test in production, not just development

4. **Monitor Search Console**
   - Check for crawl errors
   - Monitor indexing status
   - Review structured data reports

5. **Keep Meta Tags Updated**
   - Update titles/descriptions for content changes
   - Refresh structured data when course/event data changes
   - Ensure canonical URLs match actual URLs

## Summary

✅ **Verified Elements:**
- Meta tags render in SSR HTML source
- Canonical URLs are absolute and correct
- JSON-LD structured data is valid and recognized
- Open Graph and Twitter Card tags are present
- Pages are crawlable and well-structured

🔍 **Testing Tools:**
- Browser View Source
- curl/PowerShell commands
- Google Rich Results Test
- Social media debuggers
- Search Console

📝 **Documentation:**
- All services documented in code
- Component usage examples provided
- This verification guide

