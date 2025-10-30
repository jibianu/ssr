import { Component, OnInit } from '@angular/core';
import { SeoService, SeoData } from '../service/seo.service';
import { SeoBaseComponent } from '../components/seo-base.component';

/**
 * Example 1: Using SeoService directly
 */
@Component({
  selector: 'app-example-direct',
  template: '<div>Example using SeoService directly</div>'
})
export class ExampleDirectUsageComponent implements OnInit {
  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    // Update SEO data directly
    this.seoService.updateSeoData({
      title: 'Example Page - Oilandgasclub',
      description: 'This is an example page showing how to use the SEO service directly.',
      keywords: 'example, seo, oilandgasclub',
      type: 'website'
    });

    // Set robots meta tag
    this.seoService.setRobots(true, true, false, false);

    // Add structured data
    this.seoService.updateStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Example Page',
      description: 'This is an example page',
      url: 'https://www.oilandgasclub.com/example'
    });
  }
}

/**
 * Example 2: Extending SeoBaseComponent
 */
@Component({
  selector: 'app-example-base',
  template: '<div>Example using SeoBaseComponent</div>'
})
export class ExampleBaseUsageComponent extends SeoBaseComponent implements OnInit {
  ngOnInit(): void {
    // Use inherited methods for easier SEO management
    this.updateSeoWithRoute({
      title: 'Example Base Page - Oilandgasclub',
      description: 'This example shows how to use the SeoBaseComponent for easier SEO management.',
      keywords: 'example, base component, seo',
      type: 'website'
    });

    // Set robots
    this.setRobots(true, true);

    // Add structured data
    this.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Example Article',
      author: {
        '@type': 'Person',
        name: 'Oilandgasclub Team'
      },
      datePublished: new Date().toISOString()
    });
  }
}

/**
 * Example 3: Dynamic SEO based on component data
 */
@Component({
  selector: 'app-example-dynamic',
  template: '<div>Dynamic SEO Example</div>'
})
export class ExampleDynamicSeoComponent extends SeoBaseComponent implements OnInit {
  courseData = {
    title: 'Advanced Piping Design Course',
    description: 'Learn advanced piping design techniques with industry experts.',
    instructor: 'John Doe',
    price: '$299',
    category: 'Piping Design'
  };

  ngOnInit(): void {
    this.updateDynamicSeo();
  }

  private updateDynamicSeo(): void {
    const seoData: Partial<SeoData> = {
      title: `${this.courseData.title} - Oilandgasclub`,
      description: this.courseData.description,
      keywords: `${this.courseData.category}, piping design, online course, ${this.courseData.instructor}`,
      type: 'product',
      author: this.courseData.instructor,
      publishedTime: new Date().toISOString(),
      category: this.courseData.category
    };

    this.updateSeoWithRoute(seoData);

    // Add product structured data
    this.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: this.courseData.title,
      description: this.courseData.description,
      brand: {
        '@type': 'Brand',
        name: 'Oilandgasclub'
      },
      offers: {
        '@type': 'Offer',
        price: this.courseData.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      }
    });
  }
}

/**
 * Example 4: Route-based SEO (configured in routing module)
 * This example shows how SEO data is automatically applied from route configuration
 */
@Component({
  selector: 'app-example-route-based',
  template: '<div>Route-based SEO Example</div>'
})
export class ExampleRouteBasedComponent extends SeoBaseComponent {
  // No need to manually set SEO data - it's automatically applied from route configuration
  // The SEO service will automatically pick up the data from the route's data property
}
