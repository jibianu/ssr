import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService, SeoData } from '../service/seo.service';
import { Subscription } from 'rxjs';

/**
 * Base component that provides SEO functionality
 * Components can extend this to easily manage SEO data
 */
@Component({
  template: '' // This is a base component, no template needed
})
export abstract class SeoBaseComponent implements OnInit, OnDestroy {
  protected seoSubscription?: Subscription;

  constructor(
    protected seoService: SeoService,
    protected route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Override in child components if needed
  }

  ngOnDestroy(): void {
    if (this.seoSubscription) {
      this.seoSubscription.unsubscribe();
    }
  }

  /**
   * Update SEO data for the current component
   * This method can be called from child components to update SEO
   */
  protected updateSeo(seoData: Partial<SeoData>): void {
    this.seoService.updateSeoData(seoData);
  }

  /**
   * Update SEO data with route-specific information
   * Automatically includes current URL and route data
   */
  protected updateSeoWithRoute(seoData: Partial<SeoData>): void {
    const currentUrl = this.route.snapshot.url.join('/');
    const fullUrl = currentUrl ? `https://oilandgasclub.com/${currentUrl}` : 'https://oilandgasclub.com';
    
    this.seoService.updateSeoData({
      ...seoData,
      url: fullUrl,
      canonicalUrl: fullUrl
    });
  }

  /**
   * Set robots meta tag
   */
  protected setRobots(index: boolean = true, follow: boolean = true, noArchive: boolean = false, noSnippet: boolean = false): void {
    this.seoService.setRobots(index, follow, noArchive, noSnippet);
  }

  /**
   * Update canonical URL
   */
  protected updateCanonicalUrl(url: string): void {
    this.seoService.updateCanonicalUrl(url);
  }

  /**
   * Add structured data
   */
  protected addStructuredData(data: any): void {
    this.seoService.updateStructuredData(data);
  }

  /**
   * Get current page title
   */
  protected getCurrentTitle(): string {
    return this.seoService.getTitle();
  }

  /**
   * Get current meta description
   */
  protected getCurrentDescription(): string {
    return this.seoService.getDescription();
  }
}
