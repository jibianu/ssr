/**
 * Default brand logo path under `src/assets` (no leading slash so it resolves against `<base href>`).
 * When the app is mounted at `/course/`, `/auth/`, etc., absolute `/assets/...` would hit the wrong origin path.
 */
const DEFAULT_LOGO_RELATIVE = 'assets/img/oilandgas_club.svg';

/**
 * Returns the default logo URL, resolved against the document base when running in the browser.
 */
export function getDefaultLogoUrl(): string {
  if (typeof document !== 'undefined' && document?.baseURI) {
    try {
      return new URL(DEFAULT_LOGO_RELATIVE, document.baseURI).href;
    } catch {
      /* ignore */
    }
  }
  // SSR or fallback: relative path works with Angular's `<base href>` in index.html
  return DEFAULT_LOGO_RELATIVE;
}
