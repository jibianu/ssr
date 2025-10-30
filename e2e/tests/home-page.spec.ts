import { test, expect } from '@playwright/test';

/**
 * Home Page Sample Test
 * 
 * This test suite validates the home page functionality including:
 * - Page load and rendering
 * - Critical content visibility
 * - Interactive elements
 * - Performance metrics
 * - Accessibility basics
 */

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto('/');
  });

  test('should load home page successfully', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Verify page title
    await expect(page).toHaveTitle(/Oilandgasclub/i);
    
    // Verify page URL
    expect(page.url()).toContain('localhost:4000');
    
    // Verify body is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    // Look for hero section or main heading
    const heroHeading = page.locator('h1').first();
    
    // Verify hero section is visible
    await expect(heroHeading).toBeVisible();
    
    // Verify hero content is not empty
    const heroText = await heroHeading.textContent();
    expect(heroText).toBeTruthy();
    expect(heroText?.length).toBeGreaterThan(0);
  });

  test('should display course carousel', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for course carousel containers
    const courseCarousel = page.locator('.carousel-course-related, .course-card').first();
    
    // Verify course carousel is visible
    await expect(courseCarousel).toBeVisible({ timeout: 10000 });
    
    // Verify course cards have expected content
    const courseTitle = courseCarousel.locator('h6, .card-title, h3').first();
    const coursePrice = courseCarousel.locator('.price').first();
    
    await expect(courseTitle).toBeVisible();
    await expect(coursePrice).toBeVisible();
  });

  test('should have functional navigation links', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Test header navigation links
    const navLinks = [
      { selector: 'a[routerLink="/course"], a[href="/course"]', name: 'Courses' },
      { selector: 'a[routerLink="/events"], a[href="/events"]', name: 'Events' },
      { selector: 'a[routerLink="/about-us"], a[href="/about-us"]', name: 'About Us' },
    ];

    for (const link of navLinks) {
      const element = page.locator(link.selector).first();
      const count = await element.count();
      
      if (count > 0) {
        await expect(element).toBeVisible();
        const href = await element.getAttribute('href') || await element.getAttribute('routerLink');
        expect(href).toBeTruthy();
      }
    }
  });

  test('should have course cards with links', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Find course cards
    const courseCards = page.locator('.carousel-course-related, .course-card');
    const cardCount = await courseCards.count();
    
    // Should have at least one course card
    expect(cardCount).toBeGreaterThan(0);
    
   我还 // Verify first course card has a link
    const firstCard = courseCards.first();
    const courseLink = firstCard.locator('a并进行[routerLink], a[href]').first();
    
    const linkCount = await courseLink.count();
    if (linkCount > 0) {
      await expect(courseLink).toBeVisible();
      
      // Verify link is clickable
      const href = await courseLink.getAttribute('href') || await courseLink.getAttribute('routerLink');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
      expect(href).not.toBe('javascript:void(0)');
    }
  });

  test('should have footer with links', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Find footer
    const footer = page.locator('footer, .footer').first();
    const footerCount = await footer.count();
    
    if (footerCount > 0) {
      await expect(footer).toBeVisible();
      
      // Verify footer has links
      const footerLinks = footer.locator('a');
      const linkCount = await footerLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known non-critical errors
        if (!text.includes('favicon') && 
            !text.includes('404') && 
            !text.includes('chrome-extension') &&
            !text.includes('DevTools')) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out Angular hydration warnings in dev mode
    const criticalErrors = errors.filter(error => 
      !error.includes('NG0751') && // HMR defer warning (expected in dev)
      !error.includes('hydration') &&
      !error.includes('HMR')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    const descriptionContent = await metaDescription.getAttribute('content');
    expect(descriptionContent).toBeTruthy();
    expect(descriptionContent?.length).toBeGreaterThan(0);
    
    // Check canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toBeTruthy();
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds (adjust based on your requirements)
    expect(loadTime).toBeLessThan(5000);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible();
    
    // Verify content is accessible (not cut off)
    const bodyWidth = await page.locator('body').boundingBox();
    expect(bodyWidth?.width).toBeLessThanOrEqual(375);
  });

  test('should handle scroll interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Verify page is still interactive
    await expect(page.locator('body')).toBeVisible();
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    
    // Verify hero section is visible again
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
  });
});

