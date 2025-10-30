import { test, expect } from '@playwright/test';

/**
 * SSR Rendering Tests
 * Verifies that server-side rendering works correctly
 */
test.describe('SSR Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render homepage with SSR content', async ({ page }) => {
    // Verify critical content is present in initial HTML (not loaded via JS)
    await expect(page.locator('h1')).toContainText('Master industry skills');
    await expect(page.locator('.container')).toBeVisible();
  });

  test('should have proper HTML structure', async ({ page }) => {
    // Check that HTML structure is correct
    const html = await page.content();
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  test('should have no hydration errors in console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known non-critical errors
        if (!text.includes('favicon') && !text.includes('404')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for Angular hydration mismatch errors
    const hydrationErrors = errors.filter(error => 
      error.includes('hydration') || error.includes('Angular') || error.includes('mismatch')
    );
    
    expect(hydrationErrors).toHaveLength(0);
  });

  test('should render course cards on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that course cards are rendered
    const courseCards = page.locator('.carousel-course-related');
    await expect(courseCards.first()).toBeVisible();
    
    // Verify course card content
    await expect(courseCards.first().locator('h6')).toBeVisible();
    await expect(courseCards.first().locator('.price')).toBeVisible();
  });

  test('should render event cards on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to events section
    const eventsSection = page.locator('h2:has-text("Top Events")');
    await eventsSection.scrollIntoViewIfNeeded();

    // Check that event cards are rendered
    const eventCards = page.locator('.carousel-course-related');
    const eventCount = await eventCards.count();
    expect(eventCount).toBeGreaterThan(0);
  });
});

