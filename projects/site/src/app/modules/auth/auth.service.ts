import { environment } from './../../../environments/environment';
import { CookieService } from './../../core/services/cookie.service';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay } from 'rxjs/operators';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

interface CognitoTokens {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly storageKeys = {
    accessToken: 'auth.accessToken',
    refreshToken: 'auth.refreshToken',
    idToken: 'auth.idToken',
    accessTokenExpiry: 'auth.accessTokenExpiry',
    currentUser: 'auth.currentUser'
  } as const;

  private readonly tokenExpiryBufferMs = 60 * 1000; // 1 minute safety buffer

  private user: any;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private idToken: string | null = null;
  private accessTokenExpiresAt: number | null = null;
  private refreshInProgress$: Observable<string | null> | null = null;

  readonly apiUrl = environment.apiUrl;

  private userInfoCache$: Observable<any> | null = null;
  private readonly authStateSubject = new BehaviorSubject<boolean>(false);
  readonly authState$ = this.authStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeFromStorage();
    }

    this.authStateSubject.next(this.hasValidAccessTokenInternal());
  }

  /**
   * Returns the current authenticated user (if any).
   */
  public currentUser(): any {
    if (!this.user && isPlatformBrowser(this.platformId)) {
      const storage = this.getStorage();
      const storedUser = storage?.getItem(this.storageKeys.currentUser);

      if (storedUser) {
        try {
          this.user = JSON.parse(storedUser);
        } catch (_error) {
          this.user = null;
        }
      }

      if (!this.user) {
        const userCookie = this.cookieService.getCookie('currentUser');
        if (userCookie) {
          try {
            this.user = JSON.parse(userCookie);
          } catch (_error) {
            this.user = null;
          }
        }
      }
    }

    return this.user ?? null;
  }

  /**
   * Returns the current Cognito access token if it exists and is still valid.
   */
  public currentToken(): string | null {
    if (!this.ensureAccessTokenLoaded()) {
      return null;
    }

    if (this.isAccessTokenExpired()) {
      return null;
    }

    return this.accessToken;
  }

  /**
   * ✅ CHANGED: Return the authentication token issued by our backend
   * The backend now returns (and expects) a custom JWT token.
   * This method is used by JwtInterceptor to attach tokens to requests.
   * It returns the token even if it's close to expiry (backend will validate).
   * Use currentToken() for validation checks that require a valid token.
   */
  public getToken(): string | null {
    return this.getIdToken();
  }

  /**
   * ✅ CHANGED: Get token for backward compatibility
   * This method is kept for backward compatibility but now returns the custom JWT via getIdToken()
   */
  public getAccessToken(): string | null {
    // ✅ CHANGED: Return the custom JWT token
    return this.getIdToken();
  }

  /**
   * ✅ NEW: Get authentication token explicitly
   * Returns the custom JWT token for API authentication.
   */
  public getIdToken(): string | null {
    // ✅ CRITICAL: Use custom JWT for API authentication
    // The custom JWT contains the local user ID plus permission flags.
    
    // ✅ DIAGNOSTIC: Enhanced logging to debug token retrieval
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log('[AuthService] getIdToken() called');
      console.log(`[AuthService]   In-memory idToken: ${this.idToken ? `YES (length: ${this.idToken.length})` : 'NO'}`);
    }
    
    // Ensure auth token is loaded from storage
    const loaded = this.ensureIdTokenLoaded();
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log(`[AuthService]   ensureIdTokenLoaded() returned: ${loaded}`);
      console.log(`[AuthService]   After load - idToken: ${this.idToken ? `YES (length: ${this.idToken.length})` : 'NO'}`);
    }
    
    if (!loaded) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn('[AuthService] ❌ Auth token not available after loading from storage');
        console.warn('[AuthService]   Access token present:', !!this.accessToken);
        console.warn('[AuthService]   Refresh token present:', !!this.refreshToken);
        console.warn('[AuthService]   This means user is not logged in or token was cleared');
      }
      return null;
    }

    // ✅ VERIFY: Log token structure so we can confirm whether it's custom JWT or Cognito
    if (typeof ngDevMode === 'undefined' || ngDevMode && this.idToken) {
      try {
        const tokenParts = this.idToken.split('.');
        if (tokenParts.length >= 2) {
          const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const tokenUse = payload.token_use;
          console.debug('[AuthService] getIdToken() - Inspecting auth token', {
            tokenUse: tokenUse || 'not-specified',
            hasIdToken: !!this.idToken,
            hasAccessToken: !!this.accessToken,
            tokenLength: this.idToken.length,
            issuer: payload.iss,
            audience: payload.aud
          });

          if (!tokenUse) {
            console.log('[AuthService] ✅ Custom JWT detected (no token_use claim present)');
          } else if (tokenUse === 'id') {
            console.warn('[AuthService] ⚠️ Cognito ID token detected. Backend expects custom JWT tokens now.');
          } else {
            console.warn('[AuthService] ⚠️ Unexpected token_use claim:', tokenUse);
          }
        }
      } catch (e) {
        // Token parsing failed - continue anyway
      }
    }

    // Return auth token even if expired - let backend handle validation
    // This ensures the interceptor always attaches the token if it exists
    return this.idToken;
  }

  /**
   * Convenience helper for guards & components that need to gate behaviour.
   */
  public hasValidAccessToken(): boolean {
    const isValid = this.hasValidAccessTokenInternal();
    this.updateAuthState(isValid);
    return isValid;
  }

  /**
   * ✅ NEW: Force load tokens from storage into memory
   * Useful before navigation to ensure guard can validate tokens
   */
  /**
   * True when a JWT is available for Bearer auth (localStorage, idToken cookie, or Elearn `token` cookie).
   * Use for public-site actions (enroll, checkout) instead of only hasValidAccessToken()+getIdToken().
   */
  public hasJwtForAuthenticatedApi(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    this.ensureTokensLoaded();
    const t = this.getIdToken();
    return !!t && typeof t === 'string' && t.trim().length > 0;
  }

  public ensureTokensLoaded(): void {
    // ✅ FIX: Always try to load tokens, even if platform check fails
    // This handles cases where platformId might not be properly detected
    try {
      this.ensureAccessTokenLoaded();
      this.ensureIdTokenLoaded();
    } catch (error) {
      console.warn('[AuthService] Error loading tokens:', error);
      // Try direct localStorage access as fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const storedAccessToken = window.localStorage.getItem(this.storageKeys.accessToken);
          const storedIdToken = window.localStorage.getItem(this.storageKeys.idToken);
          if (storedAccessToken) {
            this.accessToken = this.normalizeTokenString(storedAccessToken);
          }
          if (storedIdToken) {
            this.idToken = this.normalizeTokenString(storedIdToken);
          }
        } catch (e) {
          console.warn('[AuthService] Fallback token loading failed:', e);
        }
      }
    }
    
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      console.log('[AuthService] 🔄 Force loaded tokens:');
      console.log('[AuthService]   accessToken in memory:', !!this.accessToken);
      console.log('[AuthService]   idToken in memory:', !!this.idToken);
    }
  }

  /**
   * Primary login flow – parses Cognito tokens and stores them securely.
   */
  public login(username: string, password: string): Observable<string> {
    return this.http.post<any>(
      `${this.apiUrl}api/Account/login`,
      { username, password },
      { withCredentials: true }
    ).pipe(
      map(response => {
        // ✅ CRITICAL: Log the raw response to see what backend is returning
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.log('\n╔══════════════════════════════════════════════════════════════╗');
          console.log('║     LOGIN RESPONSE RECEIVED                                  ║');
          console.log('╚══════════════════════════════════════════════════════════════╝');
          console.log('[AuthService] 🔍 Raw login response:', JSON.stringify(response, null, 2));
          console.log('[AuthService]   Response keys:', Object.keys(response || {}));
          console.log('[AuthService]   hasToken property:', !!(response?.token));
          console.log('[AuthService]   hasIsSuccess property:', !!(response?.isSuccess));
          if (response?.token) {
            console.log('[AuthService]   Token length:', response.token.length);
            // Try to parse token to check type
            try {
              const tokenParts = response.token.split('.');
              if (tokenParts.length >= 2) {
                const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
                const tokenUse = payload.token_use;
                const issuer = payload.iss;
                console.log('[AuthService]   Token type (token_use):', tokenUse || 'custom JWT (none)');
                console.log('[AuthService]   Token issuer (iss):', issuer || 'not specified');
                if (!tokenUse) {
                  console.log('[AuthService]   ✅ Custom JWT detected (expected)');
                } else {
                  console.warn('[AuthService]   ⚠️  WARNING: Token includes token_use claim (value:', tokenUse, ')');
                  console.warn('[AuthService]   Backend is expected to return custom JWT tokens.');
                }
              }
            } catch (e) {
              console.error('[AuthService]   Could not parse token:', e);
            }
          }
          console.log('╚══════════════════════════════════════════════════════════════╝\n');
        }
        
        const tokens = this.parseAuthResponse(response);
        if (!tokens.accessToken) {
          console.error('[AuthService] ❌ Login response did not include a token');
          console.error('[AuthService] Response keys:', Object.keys(response || {}));
          console.error('[AuthService] Full response:', JSON.stringify(response, null, 2));
          throw new Error('Login response did not include a token');
        }

        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.log('[AuthService] ✅ Login successful - storing tokens');
          console.log(`[AuthService]   AccessToken slot: ${tokens.accessToken ? `YES (length: ${tokens.accessToken.length})` : 'NO'}`);
          console.log(`[AuthService]   AuthToken (idToken slot): ${tokens.idToken ? `YES (length: ${tokens.idToken.length})` : 'NO'}`);
          console.log(`[AuthService]   RefreshToken: ${tokens.refreshToken ? `YES (length: ${tokens.refreshToken.length})` : 'NO'}`);
          console.log(`[AuthService]   ✅ Custom JWT will be used for API authentication`);
        }

        // ✅ CRITICAL: Clear any old Cognito tokens before storing new token
        // This ensures we don't accidentally use old Cognito tokens
        this.clearTokens();
        
        this.storeTokens(tokens);
        this.userInfoCache$ = null; // force refetch of user profile
        this.updateAuthState(true);
        
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.log('[AuthService] ✅ Tokens stored successfully');
          console.log(`[AuthService]   In-memory accessToken: ${this.accessToken ? `YES (length: ${this.accessToken.length})` : 'NO'}`);
          console.log(`[AuthService]   In-memory auth token (idToken slot): ${this.idToken ? `YES (length: ${this.idToken.length})` : 'NO'}`);
          console.log(`[AuthService]   In-memory refreshToken: ${this.refreshToken ? `YES (length: ${this.refreshToken.length})` : 'NO'}`);
          console.log(`[AuthService]   ✅ Custom JWT will be used for API authentication`);
          
          // ✅ CRITICAL: Verify auth token is actually stored in localStorage
          const storage = this.getStorage();
          if (storage) {
            const storedIdToken = storage.getItem(this.storageKeys.idToken);
            console.log(`[AuthService]   localStorage auth token: ${storedIdToken ? `YES (length: ${storedIdToken.length})` : 'NO'}`);
            if (!storedIdToken) {
              console.error('[AuthService] ❌ CRITICAL: Auth token was NOT stored in localStorage!');
              console.error('[AuthService]   This will cause 401 errors on subsequent requests!');
            } else {
              // Inspect stored token metadata
              try {
                const tokenParts = storedIdToken.split('.');
                if (tokenParts.length >= 2) {
                  const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
                  const tokenUse = payload.token_use;
                  const issuer = payload.iss;
                  if (!tokenUse) {
                    console.log('[AuthService] ✅ Stored token is custom JWT (expected)');
                    console.log('[AuthService]   Token issuer:', issuer ?? 'N/A');
                  } else {
                    // Only warn if token_use is present (Cognito token) - custom JWTs don't have this
                    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
                      console.warn('[AuthService] ⚠️  Stored token contains token_use claim:', tokenUse);
                      console.warn('[AuthService]   Backend should be returning custom JWT tokens.');
                    }
                  }
                }
              } catch (e) {
                console.error('[AuthService] Could not verify stored token type:', e);
              }
            }
          }
        }
        
        return tokens.accessToken;
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  public register(payload: unknown): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}api/Account/registerstudent`,
      payload,
      { withCredentials: true }
    ).pipe(
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  /**
   * Fetches the authenticated user profile from the backend.
   * ✅ FIXED: Uses custom JWT Token for authentication.
   * The interceptor will automatically refresh expired tokens before making the request.
   */
  public getUserInfo(): Observable<any> {
    // ✅ FIXED: Use custom JWT Token for API authentication
    const token = this.getAccessToken();

    // ✅ Only skip on server-side rendering
    if (isPlatformServer(this.platformId)) {
      return of(null);
    }

    // ✅ If no token at all, return null immediately (user not logged in)
    if (!token) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn('[AuthService] getUserInfo() - No token available. User may not be logged in.');
      }
      return of(null);
    }

    // ✅ Always make the request - let interceptor handle token refresh if needed
    if (!this.userInfoCache$) {
      // Elearn.Serverless: Account API lives under api/Account (not legacy page/Account).
      const getInfoUrl = `${this.apiUrl}api/Account/getinfo`;
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.log(`[AuthService] getUserInfo() - Making request to: ${getInfoUrl}`);
        console.log(`[AuthService]   Token available: ${!!token}`);
        console.log(`[AuthService]   Token length: ${token?.length ?? 0}`);
        
        // ✅ CHANGED: Verify auth token format and content
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
              const tokenUse = payload.token_use;
              const userId = payload.sub || payload['cognito:username'] || payload.email;
              console.log(`[AuthService]   Token type (token_use): ${tokenUse || 'not-specified (custom JWT)'}`);
              console.log(`[AuthService]   Token issuer (iss): ${payload.iss || 'not-specified'}`);
              console.log(`[AuthService]   Token subject/user ID: ${userId || 'not-specified'}`);
              console.log(`[AuthService]   Token expiry (exp): ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'not-specified'}`);
              const isExpired = payload.exp && payload.exp * 1000 < Date.now();
              if (isExpired) {
                console.warn(`[AuthService]   ⚠️  Auth token is EXPIRED!`);
              }
              // ✅ CHANGED: Custom JWTs don't have token_use claim - this is expected
              if (!tokenUse) {
                // Custom JWT - no warning needed, this is expected
                if (typeof ngDevMode !== 'undefined' && ngDevMode) {
                  console.debug('[AuthService]   ✅ Custom JWT detected (expected - no token_use claim)');
                }
              } else {
                // Only warn if token_use is present (Cognito token)
                console.warn(`[AuthService]   ⚠️  Token includes token_use claim "${tokenUse}". Backend should return custom JWT tokens.`);
              }
            } else {
              console.error(`[AuthService]   ❌ Token format is invalid! Expected 3 parts, got ${tokenParts.length}`);
            }
          } catch (e) {
            console.error(`[AuthService]   ❌ Could not parse auth token:`, e);
          }
        }
      }
      
      this.userInfoCache$ = this.http.get(
        getInfoUrl,
        { withCredentials: true }
      ).pipe(
        map(user => {
          if (user) {
            this.storeUser(user);
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
              console.log('[AuthService] ✅ getUserInfo() - User info loaded successfully');
            }
          }
          return user;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError(error => {
          if (error?.status === 401) {
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
              console.warn('[AuthService] ❌ getUserInfo() - 401 Unauthorized. Token may be invalid or expired.');
              console.warn('[AuthService]   Clearing cached credentials and user info cache.');
            }
            this.logout();
          } else {
            console.error('[AuthService] ❌ getUserInfo() - Error fetching user info:', error);
          }

          this.userInfoCache$ = null;
          return of(null);
        })
      );
    }

    return this.userInfoCache$;
  }

  /**
   * Clears all authentication artefacts and returns the app to an anonymous state.
   */
  public logout(): void {
    this.clearTokens();
    this.clearUser();
    this.userInfoCache$ = null;
    this.updateAuthState(false);
  }

  public canRefreshToken(): boolean {
    return isPlatformBrowser(this.platformId) && !!this.refreshToken;
  }

  public refreshTokens(force = false): Observable<string | null> {
    if (!this.canRefreshToken()) {
      return of(null);
    }

    if (this.refreshInProgress$ && !force) {
      return this.refreshInProgress$;
    }

    const payload: Record<string, unknown> = {
      refreshToken: this.refreshToken
    };

    const secretHashUser = this.resolveUserNameForSecretHash();
    if (secretHashUser) {
      payload.userName = secretHashUser;
    }

    const refresh$ = this.http.post<any>(
      `${this.apiUrl}page/account/refresh`,
      payload,
      { withCredentials: true }
    ).pipe(
      map(response => {
        const tokens = this.parseAuthResponse(response);
        if (!tokens.accessToken) {
          throw new Error('Token refresh response did not include a Cognito access token');
        }

        const mergedTokens: CognitoTokens = {
          accessToken: tokens.accessToken,
          idToken: tokens.idToken ?? this.idToken,
          refreshToken: tokens.refreshToken ?? this.refreshToken,
          expiresAt: tokens.expiresAt
        };

        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.debug('[AuthenticationService] Refreshed Cognito tokens.', {
            hasAccessToken: !!mergedTokens.accessToken,
            hasIdToken: !!mergedTokens.idToken,
            hasRefreshToken: !!mergedTokens.refreshToken
          });
        }

        this.storeTokens(mergedTokens);
        this.updateAuthState(true);
        this.userInfoCache$ = null;
        return mergedTokens.accessToken;
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        this.logout();
        return of(null);
      }),
      finalize(() => {
        this.refreshInProgress$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.refreshInProgress$ = refresh$;
    return refresh$;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveUserNameForSecretHash(): string | null {
    const current = this.currentUser();
    if (current?.userName) {
      return current.userName;
    }

    const tokenSource = this.idToken ?? this.accessToken;
    if (!tokenSource) {
      return null;
    }

    try {
      const parts = tokenSource.split('.');
      if (parts.length < 2) {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      return payload?.['cognito:username'] ?? payload?.username ?? null;
    } catch (_error) {
      return null;
    }
  }

  private initializeFromStorage(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    const storedAccessToken = storage.getItem(this.storageKeys.accessToken);
    if (storedAccessToken) {
      const normalizedToken = this.normalizeTokenString(storedAccessToken);
      this.accessToken = this.isLikelyToken(normalizedToken) ? normalizedToken : null;
    }

    const storedRefreshToken = storage.getItem(this.storageKeys.refreshToken);
    this.refreshToken = storedRefreshToken ?? null;

    const storedIdToken = storage.getItem(this.storageKeys.idToken);
    this.idToken = storedIdToken ?? null;

    const storedExpiry = storage.getItem(this.storageKeys.accessTokenExpiry);
    this.accessTokenExpiresAt = storedExpiry ? Number(storedExpiry) : null;

    const storedUser = storage.getItem(this.storageKeys.currentUser);
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch (_error) {
        this.user = null;
      }
    }
  }

  private ensureIdTokenLoaded(): boolean {
    if (this.idToken) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.debug('[AuthService] ensureIdTokenLoaded() - Token already in memory');
      }
      return true;
    }

    // ✅ FIX: Check both platformId and window object for better browser detection
    const isBrowser = isPlatformBrowser(this.platformId) || (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined');
    
    if (!isBrowser) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.debug('[AuthService] ensureIdTokenLoaded() - Not in browser, skipping');
      }
      return false;
    }

    const storage = this.getStorage();
    if (!storage) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn('[AuthService] ensureIdTokenLoaded() - No storage available');
      }
      return false;
    }

    const storedToken = storage.getItem(this.storageKeys.idToken);
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log(`[AuthService] ensureIdTokenLoaded() - Checking localStorage`);
      console.log(`[AuthService]   Storage key: ${this.storageKeys.idToken}`);
      console.log(`[AuthService]   Stored token: ${storedToken ? `YES (length: ${storedToken.length})` : 'NO'}`);
    }

    if (storedToken) {
      const normalizedToken = this.normalizeTokenString(storedToken);
      const isToken = this.isLikelyToken(normalizedToken);
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.log(`[AuthService]   Normalized token: ${normalizedToken ? `YES (length: ${normalizedToken.length})` : 'NO'}`);
        console.log(`[AuthService]   Is valid token format: ${isToken}`);
      }
      this.idToken = isToken ? normalizedToken : null;
    }

    if (!this.idToken) {
      const cookieToken = this.cookieService.getCookie('idToken');
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.log(`[AuthService]   Checking cookie 'idToken': ${cookieToken ? `YES (length: ${cookieToken.length})` : 'NO'}`);
      }
      if (cookieToken) {
        const normalizedToken = this.normalizeTokenString(cookieToken);
        const isToken = this.isLikelyToken(normalizedToken);
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.log(`[AuthService]   Cookie token normalized: ${normalizedToken ? `YES (length: ${normalizedToken.length})` : 'NO'}`);
          console.log(`[AuthService]   Cookie token is valid format: ${isToken}`);
        }
        this.idToken = isToken ? normalizedToken : null;
      }
    }

    /**
     * Elearn stores the app JWT only in the `token` cookie (and sometimes only auth.accessToken in localStorage).
     * JwtInterceptor and enroll/checkout use getIdToken(). Sync id slot from access when missing so 4200 + 4201 share one session.
     */
    if (!this.idToken) {
      this.ensureAccessTokenLoaded();
      if (this.accessToken && this.isLikelyToken(this.accessToken)) {
        this.idToken = this.accessToken;
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.debug('[AuthService] ensureIdTokenLoaded() - Synced idToken from accessToken (Elearn token cookie / shared JWT)');
        }
      }
    }

    const result = !!this.idToken;
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log(`[AuthService] ensureIdTokenLoaded() - Result: ${result ? 'SUCCESS' : 'FAILED'}`);
    }
    return result;
  }

  // ✅ FIXED: Properly load Access Token from storage
  private ensureAccessTokenLoaded(): boolean {
    if (this.accessToken) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.debug('[AuthService] ensureAccessTokenLoaded() - Token already in memory');
      }
      return true;
    }

    // ✅ FIX: Check both platformId and window object for better browser detection
    const isBrowser = isPlatformBrowser(this.platformId) || (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined');
    
    if (!isBrowser) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.debug('[AuthService] ensureAccessTokenLoaded() - Not in browser, skipping');
      }
      return false;
    }

    const storage = this.getStorage();
    if (!storage) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn('[AuthService] ensureAccessTokenLoaded() - No storage available');
      }
      return false;
    }

    const storedToken = storage.getItem(this.storageKeys.accessToken);
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log(`[AuthService] ensureAccessTokenLoaded() - Checking localStorage`);
      console.log(`[AuthService]   Storage key: ${this.storageKeys.accessToken}`);
      console.log(`[AuthService]   Stored token: ${storedToken ? `YES (length: ${storedToken.length})` : 'NO'}`);
    }

    if (storedToken) {
      const normalizedToken = this.normalizeTokenString(storedToken);
      const isToken = this.isLikelyToken(normalizedToken);
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.log(`[AuthService]   Normalized token: ${normalizedToken ? `YES (length: ${normalizedToken.length})` : 'NO'}`);
        console.log(`[AuthService]   Is valid token format: ${isToken}`);
      }
      this.accessToken = isToken ? normalizedToken : null;
    }

    if (!this.accessToken) {
      const cookieToken = this.cookieService.getCookie('token');
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.log(`[AuthService]   Checking cookie 'token': ${cookieToken ? `YES (length: ${cookieToken.length})` : 'NO'}`);
      }
      if (cookieToken) {
        const normalizedToken = this.normalizeTokenString(cookieToken);
        const isToken = this.isLikelyToken(normalizedToken);
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.log(`[AuthService]   Cookie token normalized: ${normalizedToken ? `YES (length: ${normalizedToken.length})` : 'NO'}`);
          console.log(`[AuthService]   Cookie token is valid format: ${isToken}`);
        }
        this.accessToken = isToken ? normalizedToken : null;
      }
    }

    const result = !!this.accessToken;
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log(`[AuthService] ensureAccessTokenLoaded() - Result: ${result ? 'SUCCESS' : 'FAILED'}`);
    }
    return result;
  }

  private hasValidAccessTokenInternal(): boolean {
    const token = this.currentToken();
    return !!token && !this.isAccessTokenExpired();
  }

  private isAccessTokenExpired(): boolean {
    if (!this.accessToken) {
      return true;
    }

    if (!this.accessTokenExpiresAt) {
      this.accessTokenExpiresAt = this.decodeJwtExpiry(this.accessToken);
    }

    if (!this.accessTokenExpiresAt) {
      return false; // No expiry info – assume valid and let backend enforce
    }

    const threshold = this.accessTokenExpiresAt - this.tokenExpiryBufferMs;
    return Date.now() >= threshold;
  }

  private storeTokens(tokens: CognitoTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.idToken = tokens.idToken;
    this.accessTokenExpiresAt = tokens.expiresAt ?? (tokens.accessToken ? this.decodeJwtExpiry(tokens.accessToken) : null);

    const storage = this.getStorage();
    if (storage) {
      if (this.accessToken) {
        storage.setItem(this.storageKeys.accessToken, this.accessToken);
      } else {
        storage.removeItem(this.storageKeys.accessToken);
      }

      if (this.refreshToken) {
        storage.setItem(this.storageKeys.refreshToken, this.refreshToken);
      } else {
        storage.removeItem(this.storageKeys.refreshToken);
      }

      if (this.idToken) {
        storage.setItem(this.storageKeys.idToken, this.idToken);
      } else {
        storage.removeItem(this.storageKeys.idToken);
      }

      if (this.accessTokenExpiresAt) {
        storage.setItem(this.storageKeys.accessTokenExpiry, this.accessTokenExpiresAt.toString());
      } else {
        storage.removeItem(this.storageKeys.accessTokenExpiry);
      }
    }

    // ✅ FIXED: Store Access Token in cookie for API authentication
    if (isPlatformBrowser(this.platformId) && this.accessToken) {
      // Store Access Token in 'token' cookie for backward compatibility
      this.cookieService.setCookie('token', this.accessToken, { path: '/', sameSite: 'Lax' });
    }
    // Also store the auth token in cookie if available (for other uses)
    if (isPlatformBrowser(this.platformId) && this.idToken) {
      this.cookieService.setCookie('idToken', this.idToken, { path: '/', sameSite: 'Lax' });
    }
  }

  private storeUser(user: any): void {
    this.user = user;

    const storage = this.getStorage();
    if (storage) {
      storage.setItem(this.storageKeys.currentUser, JSON.stringify(user));
    }

    if (isPlatformBrowser(this.platformId)) {
      this.cookieService.setCookie('currentUser', JSON.stringify(user), { path: '/', sameSite: 'Lax' });
    }
  }

  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.idToken = null;
    this.accessTokenExpiresAt = null;
    this.refreshInProgress$ = null;

    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(this.storageKeys.accessToken);
      storage.removeItem(this.storageKeys.refreshToken);
      storage.removeItem(this.storageKeys.idToken);
      storage.removeItem(this.storageKeys.accessTokenExpiry);
    }

    this.cookieService.deleteCookie('token');
    this.cookieService.deleteCookie('idToken');
  }

  private clearUser(): void {
    this.user = null;

    const storage = this.getStorage();
    storage?.removeItem(this.storageKeys.currentUser);

    this.cookieService.deleteCookie('currentUser');
  }

  private parseAuthResponse(response: any): CognitoTokens {
    // ✅ DIAGNOSTIC: Log the raw response to see what we're getting
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.log('[AuthService] 🔍 Parsing login response:', {
        responseKeys: Object.keys(response || {}),
        hasAccessToken: !!(response?.AccessToken || response?.accessToken || response?.access_token),
        hasIdToken: !!(response?.IdToken || response?.idToken || response?.id_token),
        responsePreview: JSON.stringify(response).substring(0, 200) + '...'
      });
    }

    // ✅ CHANGED: Backend now returns a custom JWT in 'token' property
    // The backend returns { isSuccess: true, token: "<custom_jwt>" }
    // This token should be stored and used for API authentication
    let idTokenFromResponse: string | null = null;
    
    // ✅ CRITICAL: Check response.token directly first (backend returns the auth token here)
    if (response && typeof response === 'object' && response.token && typeof response.token === 'string') {
      const normalized = this.normalizeTokenString(response.token);
      if (this.isLikelyToken(normalized)) {
        idTokenFromResponse = normalized;
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.log('[AuthService] ✅ Found auth token in response.token property');
        }
      }
    }
    
    // Fallback to search methods if direct access didn't work
    if (!idTokenFromResponse) {
      idTokenFromResponse = this.fetchTokenFromResponse(response, ['token', 'Token', 'TOKEN', 'idtoken', 'id_token'], false, []);
      if (idTokenFromResponse && typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.log('[AuthService] ✅ Found auth token via fetchTokenFromResponse');
      }
    }
    
    // ✅ CHANGED: Store auth token as both idToken and accessToken (for backward compatibility)
    const idToken = idTokenFromResponse;
    const accessToken = idTokenFromResponse; // Store auth token as accessToken too for backward compatibility
    const refreshToken = this.fetchTokenFromResponse(response, ['refreshtoken', 'refresh_token'], true, []);

    // ✅ CHANGED: Validate auth token
    // Custom JWTs will NOT include a token_use claim. Cognito tokens will.
    if (idToken && typeof ngDevMode !== 'undefined' && ngDevMode) {
      try {
        const tokenParts = idToken.split('.');
        if (tokenParts.length >= 2) {
          const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
          
          const tokenUse = payload.token_use;
          const issuer = payload.iss;
          const userId = payload.sub || payload['cognito:username'] || payload.email;
          const hasExp = !!payload.exp;
          
          if (!tokenUse) {
            console.log('[AuthService] ✅ Custom JWT detected (no token_use claim)');
            console.log('[AuthService]   Issuer:', issuer ?? 'N/A');
            if (userId) {
              console.log('[AuthService]   User ID (custom claim or Name):', userId);
            }
          } else if (tokenUse === 'id') {
            console.warn('[AuthService] ⚠️  Cognito ID Token detected (token_use: "id"). Backend is expected to return a custom JWT. Using response as-is.');
          } else {
            console.warn('[AuthService] ⚠️  Unexpected token_use claim:', tokenUse);
          }
          
          if (hasExp) {
            const expiryDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = expiryDate < now;
            console.log('[AuthService]   Token expires:', expiryDate.toISOString());
            if (isExpired) {
              console.warn('[AuthService]   ⚠️  Token is EXPIRED!');
            }
          }
        }
      } catch (e) {
        console.error('[AuthService] Could not validate token structure:', e);
      }
    }

    const expiresIn = this.findNumericValue(response, ['expiresin', 'expires_in', 'tokenexpiresin']);
    const expiresAt = this.determineExpiry(accessToken, expiresIn);

    return {
      accessToken: accessToken ?? null,
      idToken: idToken ?? null,
      refreshToken: refreshToken ?? null,
      expiresAt
    };
  }

  private determineExpiry(accessToken: string | null, expiresInSeconds: number | null): number | null {
    if (accessToken) {
      const jwtExpiry = this.decodeJwtExpiry(accessToken);
      if (jwtExpiry) {
        return jwtExpiry;
      }
    }

    if (expiresInSeconds && expiresInSeconds > 0) {
      return Date.now() + expiresInSeconds * 1000;
    }

    return null;
  }

  private decodeJwtExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      if (payload && typeof payload.exp === 'number') {
        return payload.exp * 1000;
      }
    } catch (_error) {
      return null;
    }

    return null;
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');

    const bufferCtor = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
    if (bufferCtor) {
      return bufferCtor.from(padded, 'base64').toString('utf-8');
    }

    return '';
  }

  private fetchTokenFromResponse(
    source: any,
    preferredKeys: string[],
    allowNonJwt = false,
    fallbackKeys: string[] = []
  ): string | null {
    const preferredMatch = this.searchForKeys(source, preferredKeys, allowNonJwt);
    if (preferredMatch) {
      return preferredMatch;
    }

    if (fallbackKeys.length > 0) {
      return this.searchForKeys(source, fallbackKeys, allowNonJwt);
    }

    return null;
  }

  private searchForKeys(source: any, keys: string[], allowNonJwt: boolean): string | null {
    if (!source) {
      return null;
    }

    const visited = new Set<any>();
    const queue: any[] = [source];
    const keySet = new Set(keys.map(key => key.toLowerCase()));

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === null || current === undefined) {
        continue;
      }

      if (typeof current === 'string') {
        const value = this.normalizeTokenString(current);
        if (!value) {
          continue;
        }

        if (allowNonJwt ? this.isPossiblyToken(value) : this.isLikelyToken(value)) {
          return value;
        }
        continue;
      }

      if (typeof current !== 'object') {
        continue;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      for (const [key, value] of Object.entries(current)) {
        const normalizedKey = key.toLowerCase();
        const valueIsString = typeof value === 'string';

        if (keySet.has(normalizedKey) && value !== null && value !== undefined) {
          if (valueIsString) {
            const candidate = this.normalizeTokenString(value as string);
            if (candidate && (allowNonJwt ? this.isPossiblyToken(candidate) : this.isLikelyToken(candidate))) {
              return candidate;
            }
          } else {
            queue.push(value);
            continue;
          }
        }

        if (value !== null && (typeof value === 'object' || typeof value === 'string')) {
          queue.push(value);
        }
      }
    }

    return null;
  }

  private findNumericValue(source: any, keys: string[]): number | null {
    if (!source) {
      return null;
    }

    const visited = new Set<any>();
    const queue: any[] = [source];
    const keySet = new Set(keys.map(key => key.toLowerCase()));

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === null || current === undefined) {
        continue;
      }

      if (typeof current === 'number') {
        return current;
      }

      if (typeof current !== 'object') {
        continue;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      for (const [key, value] of Object.entries(current)) {
        const normalizedKey = key.toLowerCase();
        if (keySet.has(normalizedKey) && typeof value === 'number') {
          return value;
        }

        if (value !== null && (typeof value === 'object' || typeof value === 'number')) {
          queue.push(value);
        }
      }
    }

    return null;
  }

  private normalizeTokenString(value: string): string {
    let trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""') {
      return '';
    }

    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.substring(1, trimmed.length - 1).trim();
    }

    if (trimmed.toLowerCase().startsWith('bearer ')) {
      trimmed = trimmed.slice(7).trim();
    }

    return trimmed;
  }

  private isLikelyToken(value: string | null): value is string {
    if (!value) {
      return false;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }

    if (trimmed.includes('.') && trimmed.length > 20) {
      return true;
    }

    return trimmed.length > 32 && /^[A-Za-z0-9-_+=/]+$/.test(trimmed);
  }

  private isPossiblyToken(value: string | null): value is string {
    if (!value) {
      return false;
    }

    const trimmed = value.trim();
    return trimmed.length >= 8;
  }

  private getStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return window.localStorage;
    } catch (_error) {
      return null;
    }
  }

  private updateAuthState(isAuthenticated: boolean): void {
    if (this.authStateSubject.value !== isAuthenticated) {
      this.authStateSubject.next(isAuthenticated);
    }
  }

  private extractDirectToken(response: any): string | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const tokenCandidates = [
      response.token,
      response.accessToken,
      response.access_token,
      response.data?.token,
      response.result?.token
    ];

    for (const candidate of tokenCandidates) {
      if (!candidate) {
        continue;
      }

      if (typeof candidate === 'string') {
        const normalized = this.normalizeTokenString(candidate);
        if (this.isPossiblyToken(normalized)) {
          return normalized;
        }
      }

      if (typeof candidate === 'object') {
        const nested = this.extractDirectToken(candidate);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }
}

