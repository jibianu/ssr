import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CookieService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Gets a cookie value by name
   * @param name Cookie name to retrieve
   * @returns The cookie value or null if not found
   */
  public getCookie(name: string): string | null {
    if (!this.isBrowser || !name) return null;
    
    const cookies = document.cookie.split(';');
    const cookiePrefix = `${name}=`;
    
    for (const cookie of cookies) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.startsWith(cookiePrefix)) {
        return decodeURIComponent(trimmedCookie.substring(cookiePrefix.length));
      }
    }
    return null;
  }

  /**
   * Deletes a cookie by name
   * @param name Cookie name to delete
   * @param path Path where the cookie was set (defaults to '/')
   * @param domain Optional domain scope for the cookie
   */
  public deleteCookie(name: string, path: string = '/', domain?: string): void {
    this.setCookie(name, '', {
      expires: -1,
      path,
      domain
    });
  }

  /**
   * Sets a cookie with configurable options
   * @param name Cookie name
   * @param value Cookie value
   * @param options Cookie configuration options
   */
  public setCookie(
    name: string,
    value: string,
    options: {
      expires?: number | Date;
      path?: string;
      domain?: string;
      secure?: boolean;
      sameSite?: 'Lax' | 'Strict' | 'None';
    } = {}
  ): void {
    if (!this.isBrowser) return;

    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    // Handle expiration
    if (options.expires) {
      const expires = typeof options.expires === 'number' 
        ? new Date(Date.now() + options.expires * 864e5) // Convert days to ms
        : options.expires;
      cookieString += `; expires=${expires.toUTCString()}`;
    }

    // Add additional options
    if (options.path) cookieString += `; path=${options.path}`;
    if (options.domain) cookieString += `; domain=${options.domain}`;
    if (options.secure) cookieString += '; secure';
    if (options.sameSite) cookieString += `; sameSite=${options.sameSite}`;

    document.cookie = cookieString;
  }

  /**
   * Helper property to check if running in browser context
   */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}