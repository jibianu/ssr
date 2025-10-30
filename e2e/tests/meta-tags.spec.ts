import { test, expect } from '@playwright/test';

/**
 * Meta Tags Tests
 * Verifies SEO meta tags are correctly set for SSR
 */
test.describe('Meta Tags', () => {
  test('homepage should have correct meta tags', async ({ page }) => {
    await page.goto('/');

    // Check title tag
    await expect(page).toHaveTitle(/Oilandgasclub/i);

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);

    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', /.+/);

    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'website');

    const ogUrl = page.locator('meta[property="og:url"]');
    await expect(ogUrl).toHaveAttribute('content', /.+/);

    // Check Twitter Card tags
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute('content', /.+/);

    const twitterTitle = page.locator('meta[name="twitter:title"]');
    await expect(twitterTitle).toHaveAttribute('content', /.+/);
  });

  test('should have canonical URL', async ({ page }) => {
    await page.goto('/');

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.+/);
  });

  test('should have structured data (JSON-LD)', async ({ page }) => {
    await page.goto('/');

    // Check for JSON-LD structured data
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    
    // Should have at least Organization and WebSite schema
    expect(count).toBeGreaterThan(0);

    // Verify JSON-LD is valid
    for (let i = 0; i < count; i++) {
      const content = await jsonLd.nth(i).textContent();
      expect(() => JSON.parse(content || '')).not.toThrow();
    }
  });

  test('should set correct meta tags via MetadataService', async ({ page }) => {
    await page.goto('/');

    // Verify meta tags are set (not empty)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(0);
  });

  test('should not have meta tags in HTML template (they should be in head via service)', async ({ page }) => {
    await page.goto('/');
    
    const html = await page.content();
    
    // Meta tags should not be in body/content
    const bodyContent = html.split('<body>')[1]?.split('</body>')[0] || '';
    
    // Check that meta tags are not in the body
    expect(bodyContent).not.toContain('<meta name="description"');
    expect(bodyContent).not.toContain('<meta property="og:title"');
  });
});

