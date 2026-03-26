import { Injectable } from '@angular/core';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface PageMetadata {
  title: string;
  imageRelativeUrl?: string;
  description: string;
  author: string;
  type: string;
  site?: string;
  domain?: string;
  image: string;
  time?: string;
  updatedTime?: string;
  category?: string;
  imageHeight?: number;
  imageWidth?: number;
  seoUrl: string;
  robots?: string;
  canonicalUrl?: string;
}

const seoOrigin = (environment.seoUrl || 'https://elearn.oilandgasclub.com/').replace(/\/+$/, '');

function defaultPublicHost(): string {
  try {
    return new URL(seoOrigin + '/').hostname;
  } catch {
    return 'elearn.oilandgasclub.com';
  }
}

const defaultMetadata: PageMetadata = {
  title: 'Oilandgasclub - Your Oil and Gas Learning Platform',
  imageRelativeUrl: 'assets/oilandgasclub.png',
  description:
    'Start learning today with Oilandgasclub.com. Unlimited access to oil and gas courses and resources.',
  author: 'Anush',
  type: 'website',
  image: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
  imageWidth: 1200,
  imageHeight: 630,
  seoUrl: seoOrigin,
  site: 'oilandgasclub',
  domain: defaultPublicHost(),
  robots: 'index, follow',
};

@Injectable({
  providedIn: 'root',
})
export class MetadataService {
  constructor(
    private meta: Meta,
    private title: Title
  ) {}

  /**
   * Update the page metadata and meta tags
   * @param metadata Partial metadata to override defaults
   * @param index Whether the page should be indexed by search engines
   */
  public updateMetadata(metadata: Partial<PageMetadata>, index: boolean = true): void {
    const mergedMetadata: PageMetadata = { ...defaultMetadata, ...metadata };
    mergedMetadata.robots = index ? 'index, follow' : 'noindex';

    this.updateTitle(mergedMetadata.title);
    this.updateMetaTags(mergedMetadata);

    if (mergedMetadata.canonicalUrl) {
      this.updateCanonicalUrl(mergedMetadata.canonicalUrl);
    }
  }

  private updateTitle(title: string): void {
    this.title.setTitle(title);
  }

  private updateMetaTags(metadata: PageMetadata): void {
    const tags: MetaDefinition[] = [
      { name: 'description', content: metadata.description },
      { name: 'author', content: metadata.author },
      { name: 'robots', content: metadata.robots || 'index, follow' },

      { property: 'og:title', content: metadata.title },
      { property: 'og:description', content: metadata.description },
      { property: 'og:type', content: metadata.type },
      { property: 'og:image', content: metadata.image },
      { property: 'og:url', content: metadata.seoUrl },
      {
        property: 'og:site_name',
        content: metadata.site != null && metadata.site !== '' ? metadata.site : (defaultMetadata.site ?? 'oilandgasclub'),
      },

      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: metadata.title },
      { name: 'twitter:description', content: metadata.description },
      { name: 'twitter:image', content: metadata.image },
      { name: 'twitter:site', content: `@${metadata.site ?? defaultMetadata.site}` },
      { name: 'twitter:creator', content: `@${metadata.author}` },
      { name: 'twitter:domain', content: metadata.domain ?? defaultMetadata.domain ?? '' },
    ];

    if (metadata.imageWidth != null) {
      tags.push({ property: 'og:image:width', content: metadata.imageWidth.toString() });
    }

    if (metadata.imageHeight != null) {
      tags.push({ property: 'og:image:height', content: metadata.imageHeight.toString() });
    }

    if (metadata.time) {
      tags.push({ property: 'article:published_time', content: metadata.time });
    }

    if (metadata.updatedTime) {
      tags.push({ property: 'article:modified_time', content: metadata.updatedTime });
    }

    if (metadata.category) {
      tags.push({ property: 'article:tag', content: metadata.category });
    }

    const viewportTag = this.meta.getTag('name="viewport"');
    if (!viewportTag) {
      this.meta.addTag({ name: 'viewport', content: 'width=device-width, initial-scale=1' });
    }

    const contentTypeTag = this.meta.getTag('http-equiv="Content-Type"');
    if (!contentTypeTag) {
      this.meta.addTag({ 'http-equiv': 'Content-Type', content: 'text/html; charset=utf-8' });
    }

    tags.forEach((tag) => {
      const existingTag = tag.property
        ? this.meta.getTag(`property="${tag.property}"`)
        : this.meta.getTag(`name="${tag.name}"`);

      if (existingTag) {
        this.meta.updateTag(tag);
      } else {
        this.meta.addTag(tag);
      }
    });
  }

  public updateCanonicalUrl(url: string): void {
    const existingCanonical = this.meta.getTag('rel="canonical"');
    if (existingCanonical) {
      this.meta.removeTagElement(existingCanonical);
    }

    this.meta.addTag({ rel: 'canonical', href: url });
  }
}
