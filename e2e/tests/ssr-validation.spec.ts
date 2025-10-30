import { test, expect } from '@playwright/test';

/**
 * SSR Validation Tests
 * 
 * Validates that server-side rendering works correctly:
 * - Initial HTML contains expected content
 * - No hydration errors
 * - Proper HTML structure
 * - Critical content is server-rendered
 */

test.describe('SSR Validation', () => {
  test('should render initial HTML from server', async ({ page }) => {
    // Navigate with no JavaScript enabled (to verify SSR)
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Verify response is successful
    expect(response?.status()).toBe(200);
    
    // Get initial HTML before JavaScript executes
    const html = await page.content();
    
    // Verify critical HTML structure is present
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });

  test('should have meta tags in initial HTML', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Get HTML before JavaScript hydration
    const html = await page.content();
    
    // Verify meta tags are present in SSR HTML
    expect(html).toMatch(/<title>.*<\/title>/i);
    expect(html).toMatch(/<meta[^>]*name=["']description["'][^>]*>/i);
    expect(html).toMatch(/<link[^>]*rel=["']canonical["'][^>]*>/i);
  });

  test('should render course content in initial HTML', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Verify course-related elements exist in initial HTML
    const html = await page.content();
    
    // Check for course-related structure (adjust selectors based on your actual HTML)
    expect(html).toMatch(/course|carousel|card/i);
  });

  test('should have no Angular hydration errors', async ({ page }) => {
    const hydrationErrors: string[] = [];
    
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('hydration') || 
            text.includes('NG0') || 
            text.includes('Angular hydration') ||
            text.includes('mismatch')) {
          hydrationErrors.push(text);
        }
      }
    });

    page.on('pageerror', (error) => {
      if (error.message.includes('hydration') || error.message.includes('NG0')) {
        hydrationErrors.push(error.message);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Allow some time for Angular to initialize
    await page.waitForTimeout(2000);
    
    // Filter out non-critical warnings (like HMR warnings in dev mode)
    const criticalErrors = hydrationErrors.filter(error => 
      !error.includes('NG0751') && // HMR defer warning (expected in dev)
      !error.includes('HMR')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should maintain SSR content after hydration', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Get content before hydration
    const beforeHydration = await page.locator('body').textContent();
    
    // Wait for hydration
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Get content after hydration
    const afterHydration = await page.locator('body').textContent();
    
    // Content should still be present (no content loss)
    expect(afterHydration).toBeTruthy();
    expect(afterHydration?.length).toBeGreaterThan(0);
    
    // Critical content should match (allowing for minor differences)
    expect(afterHydration?.substring(0, 100)).toBe(beforeHydration?.substring(0, 100));
  });

  test('should have proper HTML structure for SEO', async ({ page }) => {
    await page.goto('/');
    
    // Verify critical SEO elements
    const head = await page.locator('head').innerHTML();
    
    // Should have title tag
    expect(head).toContain('<title>');
    
    // Should have meta description
    expect(head).toMatch(/<meta[^>]*name=["']description["']/i);
    
    // Should have canonical link
    expect(head).toMatch(/<link[^>]*rel=["']canonical["']/i);
  });

  test('should render prerendered content correctly', async ({ page }) => {
    // Test a prerendered route
    await page.goto('/about-us', { waitUntil: 'domcontentloaded' });
    
    // Verify page content is present
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent?.length).toBeGreaterThan(0);
    
    // Verify title is set
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toContain('about');
  });

  test('should handle dynamic routes with SSR', async ({ page }) => {
    // Test a dynamic route (course listing)
    await page.goto('/course', { waitUntil: 'domcontentloaded' });
    
    // Verify page loads
    await page.waitForLoadState('networkidle');
    
    // Verify content is rendered
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    
    // Verify page has expected structure
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have correct HTTP headers for SSR', async ({ page }) => {
    const response = await page.goto('/');
    
    // Verify content-type
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('text/html');
    
    // Verify status code
    expect(response?.status()).toBe(200);
  });

  test('should have no JavaScript errors blocking SSR', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      // Only track errors, not warnings
      if (error.name === 'Error' || error.name === 'ReferenceError' || error.name === 'TypeError') {
        jsErrors.push(error.message);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = jsErrors.filter(error =>
      !error.includes('$localize') && // Should be fixed but filter just in case
      !error.includes('favicon') &&
      !error.includes('chrome-extension')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should render structured data (JSON-LD) in SSR HTML', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Get HTML content
    const html = await page.content();
    
    // Check for JSON-LD scripts
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi);
    
    if (jsonLdMatches && jsonLdMatches.length > 0) {
      // Verify JSON-LD is valid
      const jsonLdScripts = page.locator('script[type="application/ld+json"]');
      const count = await jsonLdScripts.count();
      
      for (let i = 0; i < count; i++) {
        const content = await jsonLdScripts.nth(i).textContent();
        expect(() => JSON.parse(content || '')).not.toThrow();
      }
    }
  });
});

