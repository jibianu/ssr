import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Google Tag Manager Service
 * 
 * Provides integration with Google Tag Manager for tracking pageviews
 * and custom events in an Angular SPA.
 * 
 * Features:
 * - Initializes window.dataLayer for GTM
 * - Tracks SPA pageviews on route changes
 * - Provides methods for custom event tracking
 * - SSR-safe (only runs in browser)
 */
@Injectable({
  providedIn: 'root'
})
export class GtmService {
  private readonly isBrowser: boolean;
  private dataLayer: any[];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initializeDataLayer();
  }

  /**
   * Initialize the dataLayer array for GTM
   * Only runs in browser environment (SSR-safe)
   */
  private initializeDataLayer(): void {
    if (this.isBrowser && typeof window !== 'undefined') {
      // Initialize dataLayer if it doesn't exist
      (window as any).dataLayer = (window as any).dataLayer || [];
      this.dataLayer = (window as any).dataLayer;
    }
  }

  /**
   * Push a custom event to the GTM dataLayer
   * 
   * @param eventName - The name of the event (e.g., 'buttonClick', 'formSubmit')
   * @param payload - Additional data to send with the event
   */
  pushEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isBrowser || !this.dataLayer) {
      return;
    }

    const eventData: Record<string, any> = {
      event: eventName,
      ...payload
    };

    this.dataLayer.push(eventData);
  }

  /**
   * Push a pageview event to the GTM dataLayer
   * 
   * @param path - The URL path (e.g., '/home', '/courses/123')
   * @param title - Optional page title
   */
  pushPageView(path: string, title?: string): void {
    if (!this.isBrowser || !this.dataLayer) {
      return;
    }

    const pageData: Record<string, any> = {
      event: 'pageview',
      page_path: path,
      page_location: this.getFullUrl(path)
    };

    if (title) {
      pageData.page_title = title;
    }

    this.dataLayer.push(pageData);
  }

  /**
   * Get the full URL for a given path
   * 
   * @param path - The path to convert to full URL
   * @returns The full URL including protocol and hostname
   */
  private getFullUrl(path: string): string {
    if (!this.isBrowser || typeof window === 'undefined') {
      return path;
    }

    // Remove leading slash if present for proper URL construction
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${cleanPath}`;
  }
}

