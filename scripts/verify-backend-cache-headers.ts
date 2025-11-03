/**
 * Backend Cache Headers Verification Script
 * 
 * This script verifies that backend API endpoints have proper cache headers implemented.
 * Run after backend team implements cache headers.
 * 
 * Usage:
 *   ts-node scripts/verify-backend-cache-headers.ts
 *   OR
 *   pnpm verify:backend:cache
 */

import * as https from 'https';
import { URL } from 'url';

interface CacheHeaderResult {
  endpoint: string;
  status: '✅ PASS' | '❌ FAIL' | '⚠️  WARNING';
  hasCacheControl: boolean;
  hasETag: boolean;
  cacheControl?: string;
  etag?: string;
  maxAge?: number;
  notes: string[];
}

const BACKEND_URL = process.env.BACKEND_URL || 'https://coursebackend.oilandgasclub.com';

// Expected cache durations (in seconds)
const EXPECTED_CACHE_DURATIONS: Record<string, number> = {
  '/api/page/category': 3600,     // 1 hour
  '/api/page/location': 3600,       // 1 hour
  '/api/page/icon': 86400,         // 24 hours
  '/api/page/course': 300,          // 5 minutes
  '/api/page/event': 300,           // 5 minutes
};

const ENDPOINTS_TO_TEST = [
  '/api/page/category',
  '/api/page/location',
  '/api/page/icon',
  '/api/page/course',
  '/api/page/event',
];

/**
 * Parse Cache-Control header to extract max-age
 */
function parseCacheControl(cacheControl: string): { maxAge?: number; hasStaleWhileRevalidate: boolean } {
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : undefined;
  const hasStaleWhileRevalidate = cacheControl.includes('stale-while-revalidate');
  
  return { maxAge, hasStaleWhileRevalidate };
}

/**
 * Make HTTP request to endpoint and check headers
 */
function checkEndpoint(endpoint: string): Promise<CacheHeaderResult> {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'HEAD', // Use HEAD to avoid downloading body
      headers: {
        'User-Agent': 'Cache-Header-Verifier/1.0',
      },
      rejectUnauthorized: false, // Allow self-signed certificates in dev
    };

    const req = https.request(options, (res) => {
      const headers = res.headers;
      const cacheControl = headers['cache-control'] as string;
      const etag = headers['etag'] as string;

      const result: CacheHeaderResult = {
        endpoint,
        status: '✅ PASS',
        hasCacheControl: !!cacheControl,
        hasETag: !!etag,
        cacheControl,
        etag,
        notes: [],
      };

      // Check if cache headers exist
      if (!cacheControl) {
        result.status = '❌ FAIL';
        result.notes.push('Missing Cache-Control header');
      } else {
        const { maxAge, hasStaleWhileRevalidate } = parseCacheControl(cacheControl);
        result.maxAge = maxAge;

        // Check expected duration
        const expectedDuration = EXPECTED_CACHE_DURATIONS[endpoint];
        if (expectedDuration && maxAge !== expectedDuration) {
          result.status = '⚠️  WARNING';
          result.notes.push(
            `Expected max-age=${expectedDuration}s, got ${maxAge}s`
          );
        }

        // Check for stale-while-revalidate (good practice for static content)
        if (hasStaleWhileRevalidate) {
          result.notes.push('✅ Has stale-while-revalidate (excellent!)');
        }
      }

      // Check ETag
      if (!etag) {
        result.status = result.status === '✅ PASS' ? '⚠️  WARNING' : result.status;
        result.notes.push('Missing ETag header (recommended for cache validation)');
      } else {
        result.notes.push('✅ Has ETag header');
      }

      // Check response status
      if (res.statusCode !== 200) {
        result.status = '❌ FAIL';
        result.notes.push(`Unexpected status code: ${res.statusCode}`);
      }

      resolve(result);
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: '❌ FAIL',
        hasCacheControl: false,
        hasETag: false,
        notes: [`Connection error: ${error.message}`],
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: '❌ FAIL',
        hasCacheControl: false,
        hasETag: false,
        notes: ['Request timeout (10s)'],
      });
    });

    req.end();
  });
}

/**
 * Test 304 Not Modified response with ETag
 */
async function test304Response(endpoint: string, etag: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'HEAD',
      headers: {
        'If-None-Match': etag,
        'User-Agent': 'Cache-Header-Verifier/1.0',
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 304);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Main verification function
 */
async function verifyCacheHeaders() {
  console.log('🔍 Verifying Backend Cache Headers...\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  console.log('─'.repeat(80));

  const results: CacheHeaderResult[] = [];

  // Check each endpoint
  for (const endpoint of ENDPOINTS_TO_TEST) {
    console.log(`\n📡 Checking: ${endpoint}`);
    const result = await checkEndpoint(endpoint);
    results.push(result);

    // Display result
    console.log(`   Status: ${result.status}`);
    if (result.hasCacheControl) {
      console.log(`   Cache-Control: ${result.cacheControl}`);
      if (result.maxAge) {
        const minutes = Math.floor(result.maxAge / 60);
        const hours = Math.floor(result.maxAge / 3600);
        const duration = hours > 0 
          ? `${hours}h` 
          : minutes > 0 
            ? `${minutes}m` 
            : `${result.maxAge}s`;
        console.log(`   Max-Age: ${result.maxAge}s (${duration})`);
      }
    }
    if (result.hasETag) {
      console.log(`   ETag: ${result.etag}`);
      
      // Test 304 response
      console.log('   Testing 304 Not Modified...');
      const supports304 = await test304Response(endpoint, result.etag!);
      if (supports304) {
        console.log('   ✅ 304 Not Modified supported');
        result.notes.push('✅ Supports 304 Not Modified');
      } else {
        console.log('   ⚠️  304 Not Modified not working');
        result.notes.push('⚠️  304 Not Modified not working');
      }
    }

    if (result.notes.length > 0) {
      console.log('   Notes:');
      result.notes.forEach(note => console.log(`     ${note}`));
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 SUMMARY\n');

  const passed = results.filter(r => r.status === '✅ PASS').length;
  const warnings = results.filter(r => r.status === '⚠️  WARNING').length;
  const failed = results.filter(r => r.status === '❌ FAIL').length;

  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`⚠️  Warnings: ${warnings}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  // Detailed summary table
  console.log('\n📋 Detailed Results:\n');
  console.log('Endpoint'.padEnd(30) + 'Cache-Control'.padEnd(20) + 'ETag'.padEnd(15) + 'Status');
  console.log('─'.repeat(80));

  results.forEach(result => {
    const endpoint = result.endpoint.padEnd(30);
    const cacheControl = (result.hasCacheControl ? '✅ Yes' : '❌ No').padEnd(20);
    const etag = (result.hasETag ? '✅ Yes' : '❌ No').padEnd(15);
    const status = result.status;
    
    console.log(`${endpoint}${cacheControl}${etag}${status}`);
  });

  // Recommendations
  if (failed > 0 || warnings > 0) {
    console.log('\n💡 RECOMMENDATIONS:\n');
    
    results.forEach(result => {
      if (result.status !== '✅ PASS') {
        console.log(`\n${result.endpoint}:`);
        if (!result.hasCacheControl) {
          console.log('  - Add Cache-Control header to response');
          console.log('  - Example: Response.Headers.Add("Cache-Control", "public, max-age=3600")');
        }
        if (!result.hasETag) {
          console.log('  - Add ETag header for cache validation');
          console.log('  - Example: Response.Headers.Add("ETag", GenerateETag(data))');
        }
      }
    });

    console.log('\n📖 See BACKEND_IMPLEMENTATION_STEP_BY_STEP.md for implementation details');
  }

  // Exit code
  const exitCode = failed > 0 ? 1 : warnings > 0 ? 0 : 0;
  process.exit(exitCode);
}

// Run verification
verifyCacheHeaders().catch((error) => {
  console.error('❌ Error running verification:', error);
  process.exit(1);
});

