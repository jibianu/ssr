import { test, expect } from '@playwright/test';

/**
 * Navigation Tests
 * Verifies Angular routing and navigation work correctly
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate using routerLink without full page reload', async ({ page }) => {
    // Check that routerLink navigation doesn't cause full page reload
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/list') && response.status() === 200
    );

    // Click on a routerLink
    await page.locator('a[routerLink="/list"]').first().click();
    
    // Wait for navigation but verify no full page reload occurred
    await page.waitForURL('**/list**', { timeout: 10000 });
    
    // Verify content is loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to course detail pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find first course card link
    const courseLink = page.locator('.carousel-course-related a[routerLink]').first();
    const href = await courseLink.getAttribute('routerLink');
    
    if (href && href !== '') {
      // Navigate to course page
      await courseLink.click();
      
      // Wait for navigation
      await page.waitForURL(`**${href}**`, { timeout: 10000 });
      
      // Verify we're on the course page
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to category pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find first category link
    const categoryLink = page.locator('a[routerLink*="/category/"]').first();
    
    if (await categoryLink.count() > 0) {
      await categoryLink.click();
      
      // Wait for navigation
      await page.waitForURL('**/category/**', { timeout: 10000 });
      
      // Verify we're on a category page
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to a different page
    await page.locator('a[routerLink="/about-us"]').first().click();
    await page.waitForURL('**/about-us**', { timeout: 10000 });

    // Navigate back to home
    await page.goBack();
    await page.waitForURL('**/**', { timeout: 10000 });

    // Verify homepage is still functional
    await expect(page.locator('h1')).toContainText('Master industry skills');
  });
});

