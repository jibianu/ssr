# Playwright E2E Tests for Angular SSR Application

This directory contains end-to-end tests using Playwright for validating SSR functionality, route navigation, and meta tag rendering.

## 📁 Test Files

- **`home-page.spec.ts`** - Sample test for the home page functionality
- **`ssr-validation.spec.ts`** - SSR validation tests (HTML structure, hydration, server-side rendering)
- **`route-navigation.spec.ts`** - Route navigation tests (client-side routing, browser history)
- **`meta-tags-rendering.spec.ts`** - Meta tag rendering tests (SEO, Open Graph, Twitter Cards, JSON-LD)

## 🚀 Getting Started

### Prerequisites

1. Install Playwright:
   ```bash
   pnpm add -D @playwright/test
   pnpm exec playwright install
   ```

2. Ensure the SSR server is running or will auto-start:
   ```bash
   pnpm run serve:ssr
   ```
   The test configuration will automatically start the server if not already running.

### Running Tests

```bash
# Run all tests
pnpm exec playwright test

# Run tests with UI mode (recommended for development)
pnpm exec playwright test --ui

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Run specific test file
pnpm exec playwright test home-page

# Run tests in debug mode
pnpm exec playwright test --debug

# Run tests and generate HTML report
pnpm exec playwright test && pnpm exec playwright show-report
```

## 📋 Test Coverage

### SSR Validation (`ssr-validation.spec.ts`)
- ✅ Server-side HTML rendering
- ✅ Meta tags in initial HTML
- ✅ Angular hydration (no errors)
- ✅ Content preservation after hydration
- ✅ HTTP headers validation
- ✅ Structured data (JSON-LD) in SSR HTML

### Routing & Navigation (`route-navigation.spec.ts`)
- ✅ Client-side routing (no full page reloads)
- ✅ Route parameter handling
- ✅ Browser back/forward navigation
- ✅ Invalid route handling (404)
- ✅ Query parameters
- ✅ Anchor links (scroll to section)

### Meta Tags Rendering (`meta-tags-rendering.spec.ts`)
- ✅ Basic meta tags (title, description, canonical)
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Structured data (JSON-LD)
- ✅ Dynamic meta tag updates on navigation
- ✅ Robots meta tags
- ✅ Meta tags in head section only

### Home Page (`home-page.spec.ts`)
- ✅ Page load and rendering
- ✅ Hero section visibility
- ✅ Course carousel display
- ✅ Navigation links functionality
- ✅ Course cards with links
- ✅ Footer with links
- ✅ Console error checking
- ✅ Performance metrics
- ✅ Mobile responsiveness
- ✅ Scroll interactions

## 🔧 Configuration

The configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:4000` (configurable via `BASE_URL` environment variable)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 in local development
- **Reports**: HTML reports generated in `playwright-report/`

## 🌍 Environment Variables

- `BASE_URL` - Override the base URL for tests (default: `http://localhost:4000`)
- `CI` - When set, runs in CI mode (more retries, single worker)

## 📊 Test Reports

After running tests, view the HTML report:
```bash
pnpm exec playwright show-report
```

Reports include:
- Test results and status
- Screenshots on failure
- Video recordings on failure
- Trace files for debugging

## 🐛 Debugging Tests

1. **Use UI Mode**: 
   ```bash
   pnpm exec playwright test --ui
   ```

2. **Use Debug Mode**:
   ```bash
   pnpm exec playwright test --debug
   ```

3. **View Traces**:
   ```bash
   pnpm exec playwright show-trace trace.zip
   ```

## 📝 Writing New Tests

When writing new tests:

1. Create test files in the `tests/` directory
2. Use descriptive test names
3. Group related tests using `test.describe()`
4. Use appropriate selectors (prefer data-testid attributes)
5. Wait for elements with `waitForLoadState('networkidle')` for SSR pages
6. Filter out non-critical console errors/warnings

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('.my-element')).toBeVisible();
  });
});
```

## ✅ CI/CD Integration

Tests are configured to run in CI mode automatically:
- More retries (2 instead of 0)
- Single worker (to avoid resource conflicts)
- JUnit XML reports for CI systems

## 🔍 Tips

- Use `networkidle` wait state for SSR pages to ensure all content is loaded
- Filter console errors to avoid false positives from non-critical warnings
- Use `toHaveCount()` and `toBeVisible()` for element visibility checks
- Check both `routerLink` and `href` attributes for navigation links
