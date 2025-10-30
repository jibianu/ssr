/**
 * SEO SSR Verification Script (JavaScript version - no TypeScript required)
 * 
 * Verifies that SSR output contains all required SEO meta tags, structured data,
 * and canonical URLs for optimal search engine optimization.
 * 
 * Usage:
 *   node scripts/verify-ssr-seo.js
 *   SSR_URL=http://localhost:4000 node scripts/verify-ssr-seo.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { execSync } = require('child_process');

const baseUrl = process.env.SSR_URL || 'http://localhost:4000';
const testPages = [
  { path: '/', pageType: 'home', expectedSchemas: ['Organization', 'WebSite'] },
  { path: '/about-us', pageType: 'static', expectedSchemas: ['Organization'] },
  { path: '/contact-us', pageType: 'static', expectedSchemas: ['Organization'] }
];

// Add course and event pages if you have sample URLs
const sampleCourseUrl = process.env.SAMPLE_COURSE_URL || '/course/api-510';
const sampleEventUrl = process.env.SAMPLE_EVENT_URL || '/events/test-event';

if (sampleCourseUrl) {
  testPages.push({ path: sampleCourseUrl, pageType: 'course', expectedSchemas: ['Organization', 'Course'] });
}

if (sampleEventUrl) {
  testPages.push({ path: sampleEventUrl, pageType: 'event', expectedSchemas: ['Organization', 'Event'] });
}

/**
 * Fetch HTML from URL
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'SEO-Verification-Script/1.0'
        },
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    } catch (error) {
      // Fallback to curl if URL parsing fails
      try {
        const curlOutput = execSync(`curl -s --max-time 10 "${url}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        resolve(curlOutput);
      } catch (curlError) {
        reject(new Error(`Failed to fetch URL: ${error.message || String(error)}`));
      }
    }
  });
}

/**
 * Verify meta tags in HTML
 */
function verifyMetaTags(html, pageType, expectedSchemas) {
  const checks = {
    hasTitle: /<title>[\s\S]*?<\/title>/i.test(html),
    hasDescription: /<meta\s+name=["']description["'][^>]*>/i.test(html),
    hasOGTitle: /<meta\s+property=["']og:title["'][^>]*>/i.test(html),
    hasOGDescription: /<meta\s+property=["']og:description["'][^>]*>/i.test(html),
    hasOGImage: /<meta\s+property=["']og:image["'][^>]*>/i.test(html),
    hasOGUrl: /<meta\s+property=["']og:url["'][^>]*>/i.test(html),
    hasTwitterCard: /<meta\s+name=["']twitter:card["'][^>]*>/i.test(html),
    hasCanonical: /<link\s+rel=["']canonical["'][^>]*>/i.test(html),
    hasJSONLD: /<script\s+type=["']application\/ld\+json["'][^>]*>/i.test(html),
    hasOrganizationSchema: false,
    hasCourseSchema: false,
    hasEventSchema: false
  };

  // Check for specific schema types in JSON-LD
  if (checks.hasJSONLD) {
    const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      jsonLdMatches.forEach(script => {
        const content = script.replace(/<script[^>]*>|<\/script>/gi, '');
        if (/"@type"\s*:\s*"Organization"/i.test(content)) {
          checks.hasOrganizationSchema = true;
        }
        if (/"@type"\s*:\s*"Course"/i.test(content)) {
          checks.hasCourseSchema = true;
        }
        if (/"@type"\s*:\s*"Event"/i.test(content)) {
          checks.hasEventSchema = true;
        }
      });
    }
  }

  return checks;
}

/**
 * Verify a single page
 */
async function verifyPage(page) {
  const url = `${baseUrl}${page.path}`;
  const errors = [];
  
  try {
    console.log(`📄 Testing ${page.path}...`);
    const html = await fetchHtml(url);
    const checks = verifyMetaTags(html, page.pageType, page.expectedSchemas);
    
    // Validate required checks
    const requiredChecks = [
      'hasTitle',
      'hasDescription',
      'hasOGTitle',
      'hasOGDescription',
      'hasOGImage',
      'hasOGUrl',
      'hasTwitterCard',
      'hasCanonical',
      'hasJSONLD'
    ];

    const failedChecks = requiredChecks.filter(check => !checks[check]);
    
    if (failedChecks.length > 0) {
      errors.push(`Missing: ${failedChecks.join(', ')}`);
    }

    // Validate expected schemas
    if (page.expectedSchemas.includes('Organization') && !checks.hasOrganizationSchema) {
      errors.push('Missing Organization schema');
    }
    
    if (page.pageType === 'course' && page.expectedSchemas.includes('Course') && !checks.hasCourseSchema) {
      errors.push('Missing Course schema');
    }
    
    if (page.pageType === 'event' && page.expectedSchemas.includes('Event') && !checks.hasEventSchema) {
      errors.push('Missing Event schema');
    }

    const passed = errors.length === 0;
    
    if (!passed) {
      console.error(`❌ ${page.path} failed:`);
      errors.forEach(err => console.error(`   - ${err}`));
    } else {
      console.log(`✅ ${page.path} passed all checks`);
    }
    
    return { path: page.path, passed, checks, errors: errors.length > 0 ? errors : undefined };
  } catch (error) {
    const errorMessage = error.message || String(error);
    console.error(`❌ ${page.path} failed to fetch: ${errorMessage}`);
    return {
      path: page.path,
      passed: false,
      checks: {
        hasTitle: false,
        hasDescription: false,
        hasOGTitle: false,
        hasOGDescription: false,
        hasOGImage: false,
        hasOGUrl: false,
        hasTwitterCard: false,
        hasCanonical: false,
        hasJSONLD: false
      },
      errors: [`Failed to fetch: ${errorMessage}`]
    };
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log(`🔍 Verifying SEO tags for ${baseUrl}...\n`);
  console.log(`Testing ${testPages.length} page(s):\n`);
  
  const results = [];
  
  for (const page of testPages) {
    const result = await verifyPage(page);
    results.push(result);
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.path}`);
    if (!result.passed && result.errors) {
      result.errors.forEach(err => console.log(`   ${err}`));
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passedCount}/${totalCount} pages passed`);
  console.log('='.repeat(60));
  
  if (passedCount === totalCount) {
    console.log('\n🎉 All pages passed SEO verification!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${totalCount - passedCount} page(s) failed verification`);
    console.log('\nPlease check the errors above and ensure:');
    console.log('1. SSR server is running (pnpm run serve:ssr)');
    console.log('2. All components use MetadataService and StructuredDataService');
    console.log('3. Meta tags are set in component ngOnInit or constructor');
    process.exit(1);
  }
}

// Run the verification
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

