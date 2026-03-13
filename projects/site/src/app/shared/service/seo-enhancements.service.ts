/**
 * SEO Enhancements Service
 * 
 * Additional SEO features for better Google indexing:
 * - Hreflang tags for internationalization
 * - Enhanced robots meta tags
 * - Image alt text management
 * - AggregateRating schema
 * - FAQPage schema
 */

import { Injectable, Inject } from '@angular/core';
import { Meta, MetaDefinition } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { StructuredDataService } from './structured-data.service';

@Injectable({
  providedIn: 'root'
})
export class SeoEnhancementsService {
  constructor(
    private meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document,
    private structuredDataService: StructuredDataService
  ) {}

  /**
   * Add hreflang tags for multi-language support
   * ✅ SSR: Works in both server-side and browser rendering
   */
  setHreflangTags(languages: Array<{ lang: string; url: string }>): void {
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
   * Set robots meta tag with granular control
   * ✅ SSR: Works in both server-side and browser rendering
   */
  setRobotsMeta(
    index: boolean = true,
    follow: boolean = true,
    noArchive: boolean = false,
    noSnippet: boolean = false
  ): void {
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
   * Add AggregateRating schema (for courses/products with reviews)
   * ✅ SSR: Works in both server-side and browser rendering
   */
  addAggregateRating(
    itemId: string,
    ratingValue: number,
    reviewCount: number,
    bestRating: number = 5,
    worstRating: number = 1
  ): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'AggregateRating',
      itemReviewed: {
        '@type': 'Course',
        '@id': itemId
      },
      ratingValue,
      reviewCount,
      bestRating,
      worstRating
    };

    this.injectStructuredData(`structured-data-rating-${itemId}`, structuredData);
  }

  /**
   * Add FAQPage schema
   * ✅ SSR: Works in both server-side and browser rendering
   */
  addFAQPage(faqs: Array<{ question: string; answer: string }>): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };

    this.injectStructuredData('structured-data-faq', structuredData);
  }

  /**
   * Add VideoObject schema for course videos
   * ✅ SSR: Works in both server-side and browser rendering
   */
  addVideoObject(video: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration: string;
    contentUrl: string;
    embedUrl?: string;
  }): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.name,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      uploadDate: video.uploadDate,
      duration: video.duration,
      contentUrl: video.contentUrl,
      ...(video.embedUrl && { embedUrl: video.embedUrl })
    };

    this.injectStructuredData('structured-data-video', structuredData);
  }

  /**
   * Add ImageObject schema with proper alt text
   * ✅ SSR: Works in both server-side and browser rendering
   */
  addImageObject(image: {
    url: string;
    width?: number;
    height?: number;
    caption?: string;
    alt?: string;
  }): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      url: image.url,
      ...(image.width && { width: image.width }),
      ...(image.height && { height: image.height }),
      ...(image.caption && { caption: image.caption }),
      ...(image.alt && { alternateName: image.alt })
    };

    this.injectStructuredData('structured-data-image', structuredData);
  }

  /**
   * Add additional Open Graph tags
   * ✅ SSR: Works in both server-side and browser rendering
   */
  addOpenGraphTags(tags: {
    locale?: string;
    imageAlt?: string;
    imageType?: string;
    video?: string;
    audio?: string;
  }): void {
    if (tags.locale) {
      this.meta.updateTag({ property: 'og:locale', content: tags.locale });
    }

    if (tags.imageAlt) {
      this.meta.updateTag({ property: 'og:image:alt', content: tags.imageAlt });
    }

    if (tags.imageType) {
      this.meta.updateTag({ property: 'og:image:type', content: tags.imageType });
    }

    if (tags.video) {
      this.meta.updateTag({ property: 'og:video', content: tags.video });
    }

    if (tags.audio) {
      this.meta.updateTag({ property: 'og:audio', content: tags.audio });
    }
  }

  /**
   * Helper to inject structured data (reuses document manipulation)
   * ✅ SSR: Works in both server-side and browser rendering
   */
  private injectStructuredData(id: string, data: object): void {
    // Remove existing script with same ID
    const existingScript = this.document.getElementById(id);
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject JSON-LD script
    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data, null, 0); // Minified
    this.document.head.appendChild(script);
  }
}

