import { environment } from 'src/environments/environment';

/**
 * Google OAuth redirect_uri (code flow). Must exactly match
 * "Authorized redirect URIs" for the Web client in Google Cloud Console.
 *
 * Resolves from &lt;base href&gt; first so it matches the deployed app path
 * (/course/, /Elearn/, or /) even if environment.googleRedirectUri is stale.
 */
export function getGoogleOAuthRedirectUri(): string {
  if (typeof document !== 'undefined') {
    const href = document.querySelector('base')?.href;
    if (href) {
      try {
        return new URL('auth/google-callback', href).href.replace(/\/+$/, '');
      } catch {
        /* use fallbacks */
      }
    }
  }
  const configured = (environment.googleRedirectUri || '').trim().replace(/\/+$/, '');
  if (configured) {
    return configured;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/auth/google-callback`.replace(/\/+$/, '');
}
