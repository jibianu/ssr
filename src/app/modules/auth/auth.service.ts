import { environment } from './../../../environments/environment';
import { CookieService } from './../../core/services/cookie.service';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
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
      this.logout();
      return null;
    }

    return this.accessToken;
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
   * Primary login flow – parses Cognito tokens and stores them securely.
   */
  public login(username: string, password: string): Observable<string> {
    return this.http.post<any>(`${this.apiUrl}page/account/login`, { username, password }).pipe(
      map(response => {
        const tokens = this.parseAuthResponse(response);
        if (!tokens.accessToken) {
          throw new Error('Login response did not include a Cognito access token');
        }

        this.storeTokens(tokens);
        this.userInfoCache$ = null; // force refetch of user profile
        this.updateAuthState(true);
        return tokens.accessToken;
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  public register(payload: unknown): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}page/account/register`, payload).pipe(
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  /**
   * Fetches the authenticated user profile from the backend.
   */
  public getUserInfo(): Observable<any> {
    const token = this.currentToken();

    if (!token || isPlatformServer(this.platformId)) {
      return of(null);
    }

    if (!this.userInfoCache$) {
      this.userInfoCache$ = this.http.get(`${this.apiUrl}page/Account/getinfo`).pipe(
        map(user => {
          if (user) {
            this.storeUser(user);
          }
          return user;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError(error => {
          if (error?.status === 401) {
            console.warn('Unauthorized while fetching user info. Clearing cached credentials.');
            this.logout();
          } else {
            console.error('Error fetching user info:', error);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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

  private ensureAccessTokenLoaded(): boolean {
    if (this.accessToken) {
      return true;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const storage = this.getStorage();
    const storedToken = storage?.getItem(this.storageKeys.accessToken);

    if (storedToken) {
      const normalizedToken = this.normalizeTokenString(storedToken);
      this.accessToken = this.isLikelyToken(normalizedToken) ? normalizedToken : null;
    }

    if (!this.accessToken) {
      const cookieToken = this.cookieService.getCookie('token');
      if (cookieToken) {
        const normalizedToken = this.normalizeTokenString(cookieToken);
        this.accessToken = this.isLikelyToken(normalizedToken) ? normalizedToken : null;
      }
    }

    return !!this.accessToken;
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

    if (isPlatformBrowser(this.platformId) && this.accessToken) {
      this.cookieService.setCookie('token', this.accessToken, { path: '/', sameSite: 'Lax' });
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

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.idToken = null;
    this.accessTokenExpiresAt = null;

    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(this.storageKeys.accessToken);
      storage.removeItem(this.storageKeys.refreshToken);
      storage.removeItem(this.storageKeys.idToken);
      storage.removeItem(this.storageKeys.accessTokenExpiry);
    }

    this.cookieService.deleteCookie('token');
  }

  private clearUser(): void {
    this.user = null;

    const storage = this.getStorage();
    storage?.removeItem(this.storageKeys.currentUser);

    this.cookieService.deleteCookie('currentUser');
  }

  private parseAuthResponse(response: any): CognitoTokens {
    const directToken = this.extractDirectToken(response);
    const accessToken = directToken ?? this.fetchTokenFromResponse(response, ['accesstoken', 'access_token'], false, ['token']);
    const idToken = this.fetchTokenFromResponse(response, ['idtoken', 'id_token'], false, []);
    const refreshToken = this.fetchTokenFromResponse(response, ['refreshtoken', 'refresh_token'], true, []);

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

