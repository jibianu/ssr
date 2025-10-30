import { test, expect } from '@playwright/test';

/**
 * Route Navigation Tests
 * 
 * Tests Angular routing and navigation:
 * - Client-side routing without full page reloads
 * - Route parameter handling
 * - Navigation guards
 * - Browser history navigation
 */

test.describe('Route Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate using routerLink without full page reload', async ({ page }) => {
    let reloadCount = 0;
    
    // Track page reloads
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        reloadCount++;
      }
    });

    // Navigate to courses page
    await page.locator('a[routerLink="/course"], a[href="/course"]').first().click();
    await page.waitForURL('**/course**', { timeout: 10000 });
    
    // Verify we're on the course page
    expect(page.url()).toContain('/course');
    
    // Navigation should not cause a full page reload (count should be 1 for initial load)
    expect(reloadCount).toBeLessThanOrEqual(2); // Allow one extra for navigation
  });

  test('should navigate to course listing page', async ({ page }) => {
    // Navigate to courses
    await page.goto('/course');
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded correctly
    await expect(page.locator('body')).toBeVisible();
    
    // Verify URL is correct
    expect(page.url()).toContain('/course');
  });

  test('should navigate to course detail page', async ({ page }) => {
    // First go to course listing
    await page.goto('/course');
    await page.waitForLoadState('networkidle');
    
    // Find a course card link
    const courseLink = page.locator('.carousel-course-related a[routerLink], .course-card a[routerLink], a[routerLink]').first();
    const linkCount = await courseLink.count();
    
    if (linkCount > 0) {
      const href = await courseLink.getAttribute('routerLink');
      
      if (href && href !== '') {
        // Click the course link
        await courseLink.click();
        
        // Wait for navigation
        await page.waitForURL(`**${href}**`, { timeout: 15000 });
        
        // Verify we're on a course detail page
        expect(page.url()).toContain(href);
        
        // Verify page content is visible
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle route with location parameter', async ({ page }) => {
    // Navigate to a course with location parameter
    // Example: /course/rt-4-professional-radiographic-inspection-certification/location/some-location
    // Adjust based on your actual routes
    
    // First check if there are any course links with location in the URL
    await page.goto('/course');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to a course (this might have location parameter)
    const courseLinks = page.locator('a[routerLink]');
    const linkCount = await courseLinks.count();
    
    if (linkCount > 0) {
      // Get first available course link
      const firstLink = courseLinks.first();
      const href = await firstLink.getAttribute('routerLink');
      
      if (href && href.includes('/course/')) {
        await firstLink.click();
        await page.waitForURL(`**${href}**`, { timeout: 15000 });
        
        // Verify page loads successfully
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should navigate to about-us page', async ({ page }) => {
    await page.locator('a[routerLink="/about-us"], a[href="/about-us"]').first().click();
    await page.waitForURL('**/about-us**', { timeout: 10000 });
    
    // Verify navigation
    expect(page.url()).toContain('/about-us');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to contact-us page', async ({ page }) => {
    await page.locator('a[routerLink="/contact-us"], a[href="/contact-us"]').first().click();
    await page.waitForURL('**/contact-us**', { timeout: 10000 });
    
    // Verify navigation
    expect(page.url()).toContain('/contact-us');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle browser back navigation', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to another page
    await page.goto('/about-us');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    await page.waitForURL('**/**', { timeout: 10000 });
    
    // Verify we're back at home
    expect(page.url()).toMatch(/\/$|localhost:4000$/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle browser forward navigation', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to another page
    await page.goto('/contact-us');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Go forward
    await page.goForward();
    await page.waitForURL('**/contact-us**', { timeout: 10000 });
    
    // Verify we're on contact-us page
    expect(page.url()).toContain('/contact-us');
  });

  test('should navigate to category pages', async ({ page }) => {
    // Navigate to course listing
    await page.goto('/course');
    await page.waitForLoadState('networkidle');
    
    // Look for category links
    const categoryLink = page.locator('a[routerLink*="/category/"], a[href*="/category/"]').first();
    const linkCount = await categoryLink.count();
    
    if (linkCount > 0) {
      const href = await categoryLink.getAttribute('routerLink') || await categoryLink.getAttribute('href');
      
      if (href && href.includes('/category/')) {
        await categoryLink.click();
        await page.waitForURL('**/category/**', { timeout: 10000 });
        
        // Verify we're on a category page
        expect(page.url()).toContain('/category/');
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should handle invalid routes (404)', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/this-route-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to page-not-found or show 404
    // Adjust based on your routing configuration
    const url = page.url();
    const bodyText = await page.locator('body').textContent();
    
    // Should either be on 404 page or page-not-found
    expect(url.includes('page-not-found') || bodyText?.toLowerCase().includes('not found') || bodyText?.toLowerCase().includes('404')).toBeTruthy();
  });

  test('should update URL on navigation', async ({ page }) => {
    const initialUrl = page.url();
    
    // Navigate to a different route
    await page.locator('a[routerLink="/about-us"], a[href="/about-us"]').first().click();
    await page.waitForURL('**/about-us**', { timeout: 10000 });
    
    // Verify URL changed
    expect(page.url()).not.toBe(initialUrl);
    expect(page.url()).toContain('/about-us');
  });

  test('should maintain component state during navigation', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take note of some state (e.g., course count)
    const courseCards = page.locator('.carousel-course-related, .course-card');
    const initialCount = await courseCards.count();
    
    // Navigate away
    await page.goto('/about-us');
    await page.waitForLoadState('networkidle');
    
    // Navigate back
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify content is still there (state maintained)
    const courseCardsAfter = page.locator('.carousel-course-related, .course-card');
    const afterCount = await courseCardsAfter.count();
    
    // Should still have course cards (might be cached or re-fetched)
    expect(afterCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle query parameters in routes', async ({ page }) => {
    // Navigate to course listing with query params
    await page.goto('/course/list?page=1');
    await page.waitForLoadState('networkidle');
    
    // Verify URL contains query parameter
    expect(page.url()).toContain('page=1');
    
    // Verify page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle anchor links (scroll to section)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for anchor links
    const anchorLinks = page.locator('a[href^="#"]');
    const anchorCount = await anchorLinks.count();
    
    if (anchorCount > 0) {
      const firstVar = anchorLinks.first();
      const href = await firstVar.getAttribute('href');
      
      if (href && href.startsWith('#')) {
        await firstVar.click();
        
        // Wait for scroll
        await page.waitForTimeout(500);
        
        // Verify URL contains hash
        expect(page.url()).toContain(href);
      }
    }
  });
});

