import { environment } from 'src/environments/environment';

/**
 * Google OAuth redirect_uri (code flow). Must exactly match
 * "Authorized redirect URIs" for the Web client in Google Cloud Console.
 *
 * Resolves from <base href> first so it matches the deployed app path
 * (/course/, /Elearn/, or /) even if environment.googleRedirectUri is stale.
 */
export function getGoogleOAuthRedirectUri(): string {
  if (typeof document !== 'undefined') {
    const href = document.querySelector('base')?.href;
    if (href) {
      try {
        return new URL('google-callback', href).href.replace(/\/+$/, '');
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
  return `${origin}/google-callback`.replace(/\/+$/, '');
}

/**
 * Build the Google OAuth (response_type=code) authorize URL.
 * `state` carries an app return URL so we can redirect back after login.
 */
export function buildGoogleAuthUrl(clientId: string, redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile'
  });
  if (state) {
    params.set('state', state);
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Detect embedded browsers / in-app WebViews. Google rejects OAuth from these
 * user agents with "Error 403: disallowed_useragent" ("Use secure browsers" policy),
 * regardless of whether we use a full-page redirect, popup, or iframe.
 *
 * Covers: Android System WebView, iOS WKWebView/UIWebView, and the in-app
 * browsers of Instagram, Facebook, Messenger, LinkedIn, Snapchat, Line, WeChat,
 * Twitter/X, TikTok, Pinterest, KakaoTalk, etc.
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = (navigator.userAgent || '').toLowerCase();
  if (!ua) {
    return false;
  }

  // Named in-app browsers (most common source of the error on mobile).
  const inAppPatterns = [
    'fban', 'fbav', 'fb_iab', 'fbios', 'instagram', 'messenger',
    'line/', 'linkedinapp', 'snapchat', 'micromessenger', 'wechat',
    'twitter', 'tiktok', 'musical_ly', 'pinterest', 'kakaotalk',
    'whatsapp', 'gsa/', 'okhttp', 'electron'
  ];
  if (inAppPatterns.some((p) => ua.includes(p))) {
    return true;
  }

  const isAndroid = ua.includes('android');
  const isIOS = /iphone|ipod|ipad/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);

  // Android System WebView: "; wv)" token, or Version/x.x without a real browser brand.
  if (isAndroid) {
    if (ua.includes('; wv)') || ua.includes('; wv ')) {
      return true;
    }
    const looksLikeRealBrowser =
      ua.includes('chrome/') && !ua.includes('wv') && (ua.includes('mobile safari') || ua.includes('samsungbrowser') || ua.includes('firefox') || ua.includes('edg'));
    if (ua.includes('version/') && !looksLikeRealBrowser) {
      return true;
    }
  }

  // iOS: real Safari has "Safari/" + "Version/". WKWebView (in-app) has neither
  // a Safari token nor a known browser brand (CriOS=Chrome, FxiOS=Firefox, EdgiOS=Edge).
  if (isIOS) {
    const isRealBrowserBrand = /crios|fxios|edgios|opios/.test(ua);
    const isMobileSafari = ua.includes('safari') && ua.includes('version/');
    if (!isRealBrowserBrand && !isMobileSafari) {
      return true;
    }
  }

  return false;
}

export interface GoogleOAuthLaunchResult {
  /** True when the navigation to Google was started (real browser). */
  launched: boolean;
  /** True when an embedded/in-app browser was detected (caller should show guidance). */
  embedded: boolean;
  /** The authorize URL (useful for "open in browser" / copy-link UI). */
  authUrl: string;
}

/**
 * Launch Google OAuth using a secure full-page redirect in the system browser.
 *
 * - Normal browser: navigates the top-level window to Google (no popup/iframe).
 * - In-app browser / WebView: does NOT redirect (would 403). On Android it
 *   attempts to hand off to Chrome via an `intent://` URL; on iOS/other it
 *   returns `embedded: true` so the caller can guide the user to open the
 *   page in their system browser. Forces the top frame to break out of any iframe.
 */
export function launchGoogleOAuth(clientId: string, redirectUri: string, state?: string): GoogleOAuthLaunchResult {
  const authUrl = buildGoogleAuthUrl(clientId, redirectUri, state);

  if (typeof window === 'undefined') {
    return { launched: false, embedded: false, authUrl };
  }

  const embedded = isEmbeddedBrowser();

  if (embedded) {
    const ua = (navigator.userAgent || '').toLowerCase();
    // Android: try to escape the WebView into Chrome.
    if (ua.includes('android')) {
      try {
        const noScheme = authUrl.replace(/^https?:\/\//, '');
        const intentUrl =
          `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;` +
          `S.browser_fallback_url=${encodeURIComponent(authUrl)};end`;
        window.location.href = intentUrl;
        return { launched: true, embedded: true, authUrl };
      } catch {
        /* fall through to guidance */
      }
    }
    // iOS / other in-app browsers: cannot reliably break out; caller shows guidance.
    return { launched: false, embedded: true, authUrl };
  }

  // Secure system browser: full-page, top-level redirect (never inside an iframe).
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = authUrl;
      return { launched: true, embedded: false, authUrl };
    }
  } catch {
    /* cross-origin top access blocked; fall back to current window */
  }
  window.location.href = authUrl;
  return { launched: true, embedded: false, authUrl };
}
