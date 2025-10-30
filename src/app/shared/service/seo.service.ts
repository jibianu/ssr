import { Injectable, Inject, Optional } from '@angular/core';
import { Meta, Title, MetaDefinition } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { filter, map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
  robots?: string;
  canonicalUrl?: string;
  publishedTime?: string;
  modifiedTime?: string;
  category?: string;
  tags?: string[];
  structuredData?: any;
}

export interface RouteSeoData {
  seo?: SeoData;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoImage?: string;
  seoCanonicalUrl?: string;
  seoRobots?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly defaultSeoData: SeoData = {
    title: 'Oilandgasclub - Your Oil and Gas Learning Platform',
    description: 'Start learning today with Oilandgasclub.com. Unlimited access to oil and gas courses and resources.',
    author: 'Anush',
    image: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
    type: 'website',
    siteName: 'Oilandgasclub',
    locale: 'en_US',
    robots: 'index, follow',
    url: 'https://www.oilandgasclub.com'
  };

  constructor(
    private meta: Meta,
    private title: Title,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.initializeRouteBasedSeo();
  }

  /**
   * Initialize automatic SEO updates based on route data
   */
  private initializeRouteBasedSeo(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        switchMap(route => route.data)
      )
      .subscribe((data: RouteSeoData) => {
        this.updateFromRouteData(data);
      });
  }

  /**
   * Update SEO data from route configuration
   */
  private updateFromRouteData(routeData: RouteSeoData): void {
    if (routeData.seo) {
      this.updateSeoData(routeData.seo);
    } else {
      // Handle individual SEO properties for backward compatibility
      const seoData: SeoData = {};
      
      if (routeData.seoTitle) seoData.title = routeData.seoTitle;
      if (routeData.seoDescription) seoData.description = routeData.seoDescription;
      if (routeData.seoKeywords) seoData.keywords = routeData.seoKeywords;
      if (routeData.seoImage) seoData.image = routeData.seoImage;
      if (routeData.seoCanonicalUrl) seoData.canonicalUrl = routeData.seoCanonicalUrl;
      if (routeData.seoRobots) seoData.robots = routeData.seoRobots;

      if (Object.keys(seoData).length > 0) {
        this.updateSeoData(seoData);
      }
    }
  }

  /**
   * Update SEO data with comprehensive meta tag management
   */
  public updateSeoData(seoData: Partial<SeoData>): void {
    const mergedData = { ...this.defaultSeoData, ...seoData };
    
    // Update title
    if (mergedData.title) {
      this.title.setTitle(mergedData.title);
    }

    // Update meta tags
    this.updateMetaTags(mergedData);

    // Update canonical URL
    if (mergedData.canonicalUrl || mergedData.url) {
      this.updateCanonicalUrl(mergedData.canonicalUrl || mergedData.url!);
    }

    // Update structured data
    if (mergedData.structuredData) {
      this.updateStructuredData(mergedData.structuredData);
    }
  }

  /**
   * Update meta tags for SEO
   */
  private updateMetaTags(seoData: SeoData): void {
    const tags: MetaDefinition[] = [
      // Basic meta tags
      { name: 'description', content: seoData.description || '' },
      { name: 'author', content: seoData.author || '' },
      { name: 'robots', content: seoData.robots || 'index, follow' },
      
      // Keywords
      ...(seoData.keywords ? [{ name: 'keywords', content: seoData.keywords }] : []),
      
      // Open Graph tags
      { property: 'og:title', content: seoData.title || '' },
      { property: 'og:description', content: seoData.description || '' },
      { property: 'og:type', content: seoData.type || 'website' },
      { property: 'og:image', content: seoData.image || '' },
      { property: 'og:url', content: seoData.url || '' },
      { property: 'og:site_name', content: seoData.siteName || '' },
      { property: 'og:locale', content: seoData.locale || 'en_US' },
      
      // Twitter Card tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: seoData.title || '' },
      { name: 'twitter:description', content: seoData.description || '' },
      { name: 'twitter:image', content: seoData.image || '' },
      { name: 'twitter:site', content: `@${seoData.siteName || 'oilandgasclub'}` },
      { name: 'twitter:creator', content: `@${seoData.author || 'anush'}` }
    ];

    // Add image alt text if provided
    if (seoData.imageAlt) {
      tags.push({ property: 'og:image:alt', content: seoData.imageAlt });
    }

    // Add article-specific tags
    if (seoData.publishedTime) {
      tags.push({ property: 'article:published_time', content: seoData.publishedTime });
    }
    if (seoData.modifiedTime) {
      tags.push({ property: 'article:modified_time', content: seoData.modifiedTime });
    }
    if (seoData.category) {
      tags.push({ property: 'article:section', content: seoData.category });
    }
    if (seoData.tags && seoData.tags.length > 0) {
      seoData.tags.forEach(tag => {
        tags.push({ property: 'article:tag', content: tag });
      });
    }

    // Update or add tags
    tags.forEach(tag => {
      const selector = tag.property 
        ? `property="${tag.property}"`
        : `name="${tag.name}"`;
      
      const existingTag = this.meta.getTag(selector);
      
      if (existingTag) {
        this.meta.updateTag(tag);
      } else {
        this.meta.addTag(tag);
      }
    });
  }

  /**
   * Update canonical URL
   */
  public updateCanonicalUrl(url: string): void {
    // Remove existing canonical link
    const existingCanonical = this.meta.getTag('rel="canonical"');
    if (existingCanonical) {
      this.meta.removeTagElement(existingCanonical);
    }

    // Add new canonical link
    this.meta.addTag({ rel: 'canonical', href: url });
  }

  /**
   * Update structured data (JSON-LD)
   */
  public updateStructuredData(structuredData: any): void {
    // Remove existing structured data
    const existingScript = this.document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = this.document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData, null, 0);
    this.document.head.appendChild(script);
  }

  /**
   * Get current page title
   */
  public getTitle(): string {
    return this.title.getTitle();
  }

  /**
   * Get current meta description
   */
  public getDescription(): string {
    const metaTag = this.meta.getTag('name="description"');
    return metaTag ? metaTag.content : '';
  }

  /**
   * Set robots meta tag
   */
  public setRobots(index: boolean = true, follow: boolean = true, noArchive: boolean = false, noSnippet: boolean = false): void {
    const directives: string[] = [];
    
    if (!index) directives.push('noindex');
    else directives.push('index');
    
    if (!follow) directives.push('nofollow');
    else directives.push('follow');
    
    if (noArchive) directives.push('noarchive');
    if (noSnippet) directives.push('nosnippet');

    this.meta.updateTag({
      name: 'robots',
      content: directives.join(', ')
    });
  }

  /**
   * Add hreflang tags for internationalization
   */
  public setHreflangTags(languages: Array<{ lang: string; url: string }>): void {
    // Remove existing hreflang tags
    const existingHreflangs = this.document.head.querySelectorAll('link[rel="alternate"][hreflang]');
    existingHreflangs.forEach(link => link.remove());

    // Add new hreflang tags
    languages.forEach(({ lang, url }) => {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    });
  }

  /**
   * Generate SEO data for a specific route
   */
  public generateSeoData(route: string, data: Partial<SeoData>): SeoData {
    const baseUrl = 'https://www.oilandgasclub.com';
    return {
      ...this.defaultSeoData,
      ...data,
      url: `${baseUrl}/${route}`,
      canonicalUrl: `${baseUrl}/${route}`
    };
  }

  /**
   * Clear all SEO data (useful for testing or reset)
   */
  public clearSeoData(): void {
    // Reset to default
    this.updateSeoData(this.defaultSeoData);
  }
}
