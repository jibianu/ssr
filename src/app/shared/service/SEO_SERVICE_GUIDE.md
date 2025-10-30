# SEO Service Guide

This guide explains how to use the reusable SEO service for managing meta tags, titles, and structured data in your Angular application.

## Overview

The SEO service provides a comprehensive solution for managing SEO metadata across your Angular application. It integrates with Angular's `Meta` and `Title` services and automatically updates SEO data based on route configuration.

## Features

- ✅ **Automatic Route-based SEO**: SEO data is automatically applied from route configuration
- ✅ **Manual SEO Updates**: Update SEO data programmatically in components
- ✅ **Structured Data Support**: Add JSON-LD structured data for better search engine understanding
- ✅ **SSR Compatible**: Works with Angular Universal for server-side rendering
- ✅ **Type Safety**: Full TypeScript support with interfaces
- ✅ **Base Component**: Extend `SeoBaseComponent` for easier SEO management

## Quick Start

### 1. Basic Usage in Components

```typescript
import { Component, OnInit } from '@angular/core';
import { SeoService } from '../shared/service/seo.service';

@Component({
  selector: 'app-example',
  template: '<div>Example Component</div>'
})
export class ExampleComponent implements OnInit {
  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.updateSeoData({
      title: 'My Page Title - Oilandgasclub',
      description: 'This is my page description',
      keywords: 'oil, gas, training, courses',
      type: 'website'
    });
  }
}
```

### 2. Using the Base Component

```typescript
import { Component, OnInit } from '@angular/core';
import { SeoBaseComponent } from '../shared/components/seo-base.component';

@Component({
  selector: 'app-example',
  template: '<div>Example Component</div>'
})
export class ExampleComponent extends SeoBaseComponent implements OnInit {
  ngOnInit(): void {
    this.updateSeoWithRoute({
      title: 'My Page Title - Oilandgasclub',
      description: 'This is my page description',
      keywords: 'oil, gas, training, courses',
      type: 'website'
    });
  }
}
```

### 3. Route-based SEO Configuration

Configure SEO data directly in your routing module:

```typescript
import { RouteSeoData } from '../shared/interfaces/route-seo.interface';

const routes: Routes = [
  {
    path: 'about-us',
    component: AboutUsComponent,
    data: {
      seo: {
        title: 'About Us - Oilandgasclub',
        description: 'Learn about our company and mission',
        keywords: 'about, company, mission, oil and gas',
        type: 'website'
      }
    } as RouteSeoData
  }
];
```

## API Reference

### SeoService Methods

#### `updateSeoData(seoData: Partial<SeoData>): void`
Updates the page's SEO metadata.

```typescript
this.seoService.updateSeoData({
  title: 'Page Title',
  description: 'Page description',
  keywords: 'keyword1, keyword2',
  type: 'website',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/page'
});
```

#### `setRobots(index: boolean, follow: boolean, noArchive?: boolean, noSnippet?: boolean): void`
Sets the robots meta tag.

```typescript
// Allow indexing and following
this.seoService.setRobots(true, true);

// Prevent indexing
this.seoService.setRobots(false, true);
```

#### `updateCanonicalUrl(url: string): void`
Updates the canonical URL.

```typescript
this.seoService.updateCanonicalUrl('https://www.oilandgasclub.com/course/example');
```

#### `updateStructuredData(data: any): void`
Adds JSON-LD structured data.

```typescript
this.seoService.updateStructuredData({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Advanced Piping Design',
  description: 'Learn advanced piping design techniques',
  provider: {
    '@type': 'Organization',
    name: 'Oilandgasclub'
  }
});
```

### SeoBaseComponent Methods

#### `updateSeo(seoData: Partial<SeoData>): void`
Updates SEO data (inherited from base component).

#### `updateSeoWithRoute(seoData: Partial<SeoData>): void`
Updates SEO data with automatic URL generation.

#### `setRobots(index: boolean, follow: boolean, noArchive?: boolean, noSnippet?: boolean): void`
Sets robots meta tag (inherited from base component).

## SeoData Interface

```typescript
interface SeoData {
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
```

## Route Configuration

### RouteSeoData Interface

```typescript
interface RouteSeoData {
  seo?: SeoData;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoImage?: string;
  seoCanonicalUrl?: string;
  seoRobots?: string;
}
```

### Example Route Configuration

```typescript
const routes: Routes = [
  {
    path: 'course/:id',
    component: CourseDetailComponent,
    data: {
      seo: {
        title: 'Course Details - Oilandgasclub',
        description: 'Learn about our comprehensive course offerings',
        type: 'product'
      }
    } as RouteSeoData
  }
];
```

## Best Practices

### 1. Use Route-based SEO for Static Pages
For pages with static content, configure SEO data in the route configuration:

```typescript
{
  path: 'about-us',
  component: AboutUsComponent,
  data: {
    seo: {
      title: 'About Us - Oilandgasclub',
      description: 'Learn about our company and mission',
      type: 'website'
    }
  }
}
```

### 2. Use Component-based SEO for Dynamic Content
For pages with dynamic content, update SEO data in the component:

```typescript
ngOnInit(): void {
  this.route.params.subscribe(params => {
    const courseId = params['id'];
    this.loadCourse(courseId).subscribe(course => {
      this.updateSeoWithRoute({
        title: `${course.title} - Oilandgasclub`,
        description: course.description,
        type: 'product'
      });
    });
  });
}
```

### 3. Add Structured Data for Rich Snippets
Use structured data to provide search engines with additional context:

```typescript
this.addStructuredData({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: course.title,
  description: course.description,
  provider: {
    '@type': 'Organization',
    name: 'Oilandgasclub'
  },
  offers: {
    '@type': 'Offer',
    price: course.price,
    priceCurrency: 'USD'
  }
});
```

### 4. Set Appropriate Robots Tags
Use robots meta tags to control search engine behavior:

```typescript
// For public pages
this.setRobots(true, true);

// For private/admin pages
this.setRobots(false, true);

// For pages with sensitive content
this.setRobots(true, false, true, true);
```

## Common Use Cases

### Course Detail Page
```typescript
ngOnInit(): void {
  this.courseService.getCourse(this.courseId).subscribe(course => {
    this.updateSeoWithRoute({
      title: `${course.title} - Oilandgasclub`,
      description: course.description,
      keywords: course.tags.join(', '),
      type: 'product',
      image: course.imageUrl,
      author: course.instructor,
      publishedTime: course.createdAt
    });

    this.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.description,
      provider: {
        '@type': 'Organization',
        name: 'Oilandgasclub'
      }
    });
  });
}
```

### Blog Post Page
```typescript
ngOnInit(): void {
  this.blogService.getPost(this.postId).subscribe(post => {
    this.updateSeoWithRoute({
      title: `${post.title} - Oilandgasclub Blog`,
      description: post.excerpt,
      keywords: post.tags.join(', '),
      type: 'article',
      image: post.featuredImage,
      author: post.author,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      category: post.category
    });
  });
}
```

## Troubleshooting

### SEO Data Not Updating
- Ensure the SEO service is properly injected
- Check that the component is calling the SEO update methods
- Verify route data configuration if using route-based SEO

### Duplicate Meta Tags
- The service automatically handles duplicate tags by updating existing ones
- If you see duplicates, check for multiple SEO service instances

### SSR Issues
- The service is designed to work with Angular Universal
- Ensure proper imports in server-side modules
- Test with `ng serve:ssr` to verify SSR compatibility

## Migration from Existing Services

If you're migrating from the existing `MetadataService`, here's how to update your code:

### Before (MetadataService)
```typescript
this.metadataService.updateMetadata({
  title: 'My Title',
  description: 'My Description'
});
```

### After (SeoService)
```typescript
this.seoService.updateSeoData({
  title: 'My Title',
  description: 'My Description'
});
```

The new service provides the same functionality with additional features and better integration with Angular's routing system.
