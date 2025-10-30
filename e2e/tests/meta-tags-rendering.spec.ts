import { test, expect } from '@playwright/test';

/**
 * Meta Tags Rendering Tests
 * 
 * Comprehensive tests for SEO meta tag rendering:
 * - Meta tags presence and content
 * - Dynamic meta tag updates
 * - Open Graph tags
 * - Twitter Card tags
 * - Structured data (JSON-LD)
 * - Canonical URLs
 */

test.describe('Meta Tags Rendering', () => {
  test('homepage should have all required meta tags', async ({ page }) => {
    await page.goto('/');

    // Title tag
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).toContain('oilandgasclub');

    // Meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
    const descriptionContent = await metaDescription.getAttribute('content');
    expect(descriptionContent).toBeTruthy();
    expect(descriptionContent?.length).toBeGreaterThan(50); // Should be meaningful length

    // Canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toBeTruthy();
    expect(canonicalHref).toContain('oilandgasclub');
  });

  test('homepage should have Open Graph meta tags', async ({ page }) => {
    await page.goto('/');

    // OG Title
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    const ogTitleContent = await ogTitle.getAttribute('content');
    expect(ogTitleContent).toBeTruthy();

    // OG Description
    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveCount(1);
    const ogDescriptionContent = await ogDescription.getAttribute('content');
    expect(ogDescriptionContent).toBeTruthy();

    // OG Type
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveCount(1);
    const ogTypeContent = await ogType.getAttribute('content');
    expect(ogTypeContent).toBe('website');

    // OG URL
    const ogUrl = page.locator('meta[property="og:url"]');
    await expect(ogUrl).toHaveCount(1);
    const ogUrlContent = await ogUrl.getAttribute('content');
    expect(ogUrlContent).toBeTruthy();
    expect(ogUrlContent).toContain('oilandgasclub');

    // OG Image (optional but recommended)
    const ogImage = page.locator('meta[property="og:image"]');
    const ogImageCount = await ogImage.count();
    if (ogImageCount > 0) {
      const ogImageContent = await ogImage.getAttribute('content');
      expect(ogImageContent).toBeTruthy();
      expect(ogImageContent).toMatch(/^https?:\/\//); // Should be absolute URL
    }
  });

  test('homepage should have Twitter Card meta tags', async ({ page }) => {
    await page.goto('/');

    // Twitter Card type
    const twitterCard = page.locator('meta[name="twitter:card"]');
    const twitterCardCount = await twitterCard.count();
    if (twitterCardCount > 0) {
      const twitterCardContent = await twitterCard.getAttribute('content');
      expect(twitterCardContent).toBeTruthy();
      expect(['summary', 'summary_large_image', 'app', 'player']).toContain(twitterCardContent);
    }

    // Twitter Title
    const twitterTitle = page.locator('meta[name="twitter:title"]');
    const twitterTitleCount = await twitterTitle.count();
    if (twitterTitleCount > 0) {
      const twitterTitleContent = await twitterTitle.getAttribute('content');
      expect(twitterTitleContent).toBeTruthy();
    }

    // Twitter Description
    const twitterDescription = page.locator('meta[name="twitter:description"]');
    const twitterDescriptionCount = await twitterDescription.count();
    if (twitterDescriptionCount > 0) {
      const twitterDescriptionContent = await twitterDescription.getAttribute('content');
      expect(twitterDescriptionContent).toBeTruthy();
    }
  });

  test('should have structured data (JSON-LD) on homepage', async ({ page }) => {
    await page.goto('/');

    // Check for JSON-LD scripts
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScripts.count();
    
    // Should have at least Organization or WebSite schema
    expect(count).toBeGreaterThan(0);

    // Verify JSON-LD is valid JSON
    for (let i = 0; i < count; i++) {
      const content = await jsonLdScripts.nth(i).textContent();
      expect(content).toBeTruthy();
      
      // Parse and verify JSON structure
      let jsonData;
      expect(() => {
        jsonData = JSON.parse(content || '');
      }).not.toThrow();
      
      // Verify it has required schema.org structure
      expect(jsonData).toHaveProperty('@context');
      expect(jsonData['@context']).toContain('schema.org');
    }
  });

  test('course page should have course-specific meta tags', async ({ page }) => {
    await page.goto('/course');
    await page.waitForLoadState('networkidle');

    // Verify title is course-related
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toMatch(/course|training|learning/i);

    // Verify description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
    const descriptionContent = await metaDescription.getAttribute('content');
    expect(descriptionContent).toBeTruthy();

    // Verify canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toContain('/course');
  });

  test('about-us page should have page-specific meta tags', async ({ page }) => {
    await page.goto('/about-us');

    // Verify title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toContain('about');

    // Verify canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toContain('/about-us');
  });

  test('should update meta tags on route navigation', async ({ page }) => {
    await page.goto('/');
    
    // Get initial title
    const initialTitle = await page.title();
    expect(initialTitle).toBeTruthy();

    // Navigate to a different page
    await page.goto('/contact-us');
    await page.waitForLoadState('networkidle');

    // Verify title changed
    const newTitle = await page.title();
    expect(newTitle).toBeTruthy();
    expect(newTitle).not.toBe(initialTitle);
    expect(newTitle.toLowerCase()).toContain('contact');
  });

  test('should have robots meta tag where appropriate', async ({ page }) => {
    // Check homepage (should be indexable)
    await page.goto('/');
    const robots = page.locator('meta[name="robots"]');
    const robotsCount = await robots.count();
    
    if (robotsCount > 0) {
      const robotsContent = await robots.getAttribute('content');
      expect(robotsContent).toBeTruthy();
      // Should allow indexing for most pages
      expect(robotsContent).not.toContain('noindex');
    }

    // Check privacy policy (might have noindex)
    await page.goto('/privacy-policy');
    const privacyRobots = page.locator('meta[name="robots"]');
    const privacyRobotsCount = await privacyRobots.count();
    
    if (privacyRobotsCount > 0) {
      const privacyRobotsContent = await privacyRobots.getAttribute('content');
      // Privacy policy might have noindex
      expect(privacyRobotsContent).toBeTruthy();
    }
  });

  test('should have proper meta tags for SEO keywords', async ({ page }) => {
    await page.goto('/');

    // Meta keywords (optional, but check if present)
    const metaKeywords = page.locator('meta[name="keywords"]');
    const keywordsCount = await metaKeywords.count();
    
    if (keywordsCount > 0) {
      const keywordsContent = await metaKeywords.getAttribute('content');
      expect(keywordsContent).toBeTruthy();
      expect(keywordsContent?.length).toBeGreaterThan(0);
    }
  });

  test('should have author meta tag where applicable', async ({ page }) => {
    await page.goto('/');

    // Author meta tag (optional)
    const author = page.locator('meta[name="author"]');
    const authorCount = await author.count();
    
    if (authorCount > 0) {
      const authorContent = await author.getAttribute('content');
      expect(authorContent).toBeTruthy();
    }
  });

  test('should have correct charset and viewport meta tags', async ({ page }) => {
    await page.goto('/');

    // Charset
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveCount(1);
    const charsetValue = await charset.getAttribute('charset');
    expect(charsetValue?.toLowerCase()).toBe('utf-8');

    // Viewport
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    const viewportContent = await viewport.getAttribute('content');
    expect(viewportContent).toBeTruthy();
    expect(viewportContent).toContain('width');
  });

  test('should have no duplicate meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for duplicate titles
    const titles = page.locator('title');
    expect(await titles.count()).toBe(1);

    // Check for duplicate descriptions
    const descriptions = page.locator('meta[name="description"]');
    expect(await descriptions.count()).toBe(1);

    // Check for duplicate canonical URLs
    const canonicals = page.locator('link[rel="canonical"]');
    expect(await canonicals.count()).toBe(1);
  });

  test('should have proper meta tags in head section only', async ({ page }) => {
    await page.goto('/');

    const html = await page.content();
    const headEnd = html.indexOf('</head>');
    const bodyStart = html.indexOf('<body>');
    
    // Extract head section
    const headSection = html.substring(0, headEnd);
    const bodySection = html.substring(bodyStart);

    // Meta tags should be in head, not body
    expect(headSection).toContain('<meta');
    expect(bodySection).not.toMatch(/<meta[^>]*name=["']description["']/i);
    expect(bodySection).not.toMatch(/<link[^>]*rel=["']canonical["']/i);
  });

  test('should have absolute URLs for OG image and canonical', async ({ page }) => {
    await page.goto('/');

    // Canonical URL should be absolute
    const canonical = page.locator('link[rel="canonical"]');
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toMatch(/^https?:\/\//);

    // OG Image should be absolute (if present)
    const ogImage = page.locator('meta[property="og:image"]');
    const ogImageCount = await ogImage.count();
    if (ogImageCount > 0) {
      const ogImageContent = await ogImage.getAttribute('content');
      expect(ogImageContent).toMatch(/^https?:\/\//);
    }
  });
});

