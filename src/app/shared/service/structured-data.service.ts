/**
 * Structured Data Service - JSON-LD Schema.org Markup
 * 
 * Provides structured data (JSON-LD) for better SEO and search engine understanding
 * Supports multiple schema.org types: Organization, Course, Event, BreadcrumbList, etc.
 */

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface OrganizationData {
  name: string;
  url: string;
  logo: string;
  description?: string;
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    email?: string;
    areaServed?: string;
  };
  sameAs?: string[]; // Social media profiles
}

export interface CourseData {
  name: string;
  description: string;
  url: string;
  image?: string;
  provider: {
    name: string;
    url: string;
  };
  educationalLevel?: string;
  courseCode?: string;
  inLanguage?: string;
  timeRequired?: string;
  datePublished?: string;
  dateModified?: string;
  category?: string;
  offers?: {
    price: string;
    priceCurrency: string;
    availability?: string;
    url?: string;
  };
}

export interface EventData {
  name: string;
  description: string;
  url: string;
  image?: string;
  startDate: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  organizer?: {
    name: string;
    url: string;
  };
  offers?: {
    price: string;
    priceCurrency: string;
    availability?: string;
    url?: string;
    validFrom?: string;
  };
}

export interface BreadcrumbData {
  name: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class StructuredDataService {
  // ✅ SSR: Removed isBrowser check - not needed since DOCUMENT works in both SSR and browser
  // Angular's DOCUMENT service is SSR-compatible and renders properly in server HTML

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    // Platform ID kept for potential future browser-specific logic if needed
  }

  /**
   * Remove existing structured data script with given ID
   * ✅ SSR: Works in both server-side and browser rendering
   */
  private removeStructuredData(id: string): void {
    // ✅ SSR: Remove browser check - DOCUMENT works in both SSR and browser
    const existingScript = this.document.getElementById(id);
    if (existingScript) {
      existingScript.remove();
    }
  }

  /**
   * Inject JSON-LD structured data into the page
   * ✅ SSR: Works in both server-side and browser rendering
   */
  private injectStructuredData(id: string, data: object): void {
    // ✅ SSR: Remove browser check - DOCUMENT works in both SSR and browser
    // Angular's DOCUMENT service is SSR-compatible and renders in server HTML
    
    this.removeStructuredData(id);

    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data, null, 0); // Minified for production
    this.document.head.appendChild(script);
  }

  /**
   * Add Organization schema (should be on every page)
   */
  setOrganization(data: OrganizationData): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: data.name,
      url: data.url,
      logo: data.logo,
      ...(data.description && { description: data.description }),
      ...(data.contactPoint && {
        contactPoint: {
          '@type': 'ContactPoint',
          ...data.contactPoint
        }
      }),
      ...(data.sameAs && data.sameAs.length > 0 && { sameAs: data.sameAs })
    };

    this.injectStructuredData('structured-data-organization', structuredData);
  }

  /**
   * Add Course schema
   * ✅ SSR: Works in both server-side and browser rendering
   * 
   * Enhanced for better Google indexing:
   * - Ensures all URLs are absolute
   * - Includes required fields for rich snippets
   */
  setCourse(data: CourseData): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: data.name,
      description: data.description,
      url: data.url, // ✅ Must be absolute URL
      ...(data.image && { 
        image: data.image, // ✅ Must be absolute URL
        '@type': 'ImageObject'
      }),
      provider: {
        '@type': 'Organization',
        name: data.provider.name,
        url: data.provider.url // ✅ Must be absolute URL
      },
      ...(data.educationalLevel && { educationalLevel: data.educationalLevel }),
      ...(data.courseCode && { courseCode: data.courseCode }),
      ...(data.inLanguage && { inLanguage: data.inLanguage }),
      ...(data.timeRequired && { timeRequired: data.timeRequired }),
      ...(data.datePublished && { datePublished: data.datePublished }), // ✅ ISO 8601 format
      ...(data.dateModified && { dateModified: data.dateModified }), // ✅ ISO 8601 format
      ...(data.category && { category: data.category }),
      ...(data.offers && {
        offers: {
          '@type': 'Offer',
          price: data.offers.price,
          priceCurrency: data.offers.priceCurrency,
          ...(data.offers.availability && { availability: data.offers.availability }),
          ...(data.offers.url && { url: data.offers.url }) // ✅ Must be absolute URL
        }
      })
    };

    this.injectStructuredData('structured-data-course', structuredData);
  }

  /**
   * Add Event schema
   */
  setEvent(data: EventData): void {
    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: data.name,
      description: data.description,
      url: data.url,
      startDate: data.startDate,
      ...(data.image && { image: data.image }),
      ...(data.endDate && { endDate: data.endDate }),
      ...(data.location && {
        location: {
          '@type': 'Place',
          ...(data.location.name && { name: data.location.name }),
          ...(data.location.address && {
            address: {
              '@type': 'PostalAddress',
              ...data.location.address
            }
          })
        }
      }),
      ...(data.organizer && {
        organizer: {
          '@type': 'Organization',
          name: data.organizer.name,
          url: data.organizer.url
        }
      }),
      ...(data.offers && {
        offers: {
          '@type': 'Offer',
          price: data.offers.price,
          priceCurrency: data.offers.priceCurrency,
          ...(data.offers.availability && { availability: data.offers.availability }),
          ...(data.offers.url && { url: data.offers.url }),
          ...(data.offers.validFrom && { validFrom: data.offers.validFrom })
        }
      })
    };

    this.injectStructuredData('structured-data-event', structuredData);
  }

  /**
   * Add BreadcrumbList schema
   * ✅ SSR: Works in both server-side and browser rendering
   * 
   * @param breadcrumbs Array of breadcrumb items (name and URL)
   * @example
   * setBreadcrumbs([
   *   { name: 'Home', url: 'https://example.com' },
   *   { name: 'Courses', url: 'https://example.com/courses' },
   *   { name: 'API 510', url: 'https://example.com/course/api-510' }
   * ])
   */
  setBreadcrumbs(breadcrumbs: BreadcrumbData[]): void {
    if (!breadcrumbs || breadcrumbs.length === 0) return;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url  // ✅ Must be absolute URL for Google indexing
      }))
    };

    this.injectStructuredData('structured-data-breadcrumbs', structuredData);
  }

  /**
   * Add WebSite schema with search action
   */
  setWebSite(name: string, url: string, searchUrl?: string): void {
    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: name,
      url: url
    };

    if (searchUrl) {
      structuredData.potentialAction = {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: searchUrl
        },
        'query-input': 'required name=search_term_string'
      };
    }

    this.injectStructuredData('structured-data-website', structuredData);
  }

  /**
   * Clear all structured data
   * ✅ SSR: Works in both server-side and browser rendering
   */
  clearAll(): void {
    // ✅ SSR: Remove browser check - DOCUMENT works in both SSR and browser
    const ids = [
      'structured-data-organization',
      'structured-data-course',
      'structured-data-event',
      'structured-data-breadcrumbs',
      'structured-data-website'
    ];

    ids.forEach(id => this.removeStructuredData(id));
  }
}

