import { Component, OnInit } from '@angular/core';
import { SeoService } from '../service/seo.service';
import { SeoBaseComponent } from './seo-base.component';

/**
 * Test component to demonstrate SEO service functionality
 * This component shows different ways to use the SEO service
 */
@Component({
  selector: 'app-seo-test',
  template: `
    <div class="container mt-4">
      <h1>SEO Service Test Component</h1>
      
      <div class="row">
        <div class="col-md-6">
          <h3>Direct Service Usage</h3>
          <button class="btn btn-primary" (click)="testDirectService()">
            Test Direct Service
          </button>
          <p class="mt-2">Check the page title and meta tags in the browser developer tools.</p>
        </div>
        
        <div class="col-md-6">
          <h3>Base Component Usage</h3>
          <button class="btn btn-success" (click)="testBaseComponent()">
            Test Base Component
          </button>
          <p class="mt-2">Uses inherited methods from SeoBaseComponent.</p>
        </div>
      </div>
      
      <div class="row mt-4">
        <div class="col-md-6">
          <h3>Structured Data Test</h3>
          <button class="btn btn-info" (click)="testStructuredData()">
            Add Structured Data
          </button>
          <p class="mt-2">Adds JSON-LD structured data to the page.</p>
        </div>
        
        <div class="col-md-6">
          <h3>Robots Test</h3>
          <button class="btn btn-warning" (click)="testRobots()">
            Test Robots Meta
          </button>
          <p class="mt-2">Updates the robots meta tag.</p>
        </div>
      </div>
      
      <div class="row mt-4">
        <div class="col-12">
          <h3>Current SEO Data</h3>
          <div class="card">
            <div class="card-body">
              <p><strong>Title:</strong> {{ currentTitle }}</p>
              <p><strong>Description:</strong> {{ currentDescription }}</p>
              <button class="btn btn-secondary" (click)="refreshData()">
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
    }
    .card {
      margin-top: 1rem;
    }
    .btn {
      margin-right: 0.5rem;
    }
  `]
})
export class SeoTestComponent extends SeoBaseComponent implements OnInit {
  currentTitle = '';
  currentDescription = '';

  constructor(seoService: SeoService) {
    super(seoService, null as any); // Note: In real usage, inject ActivatedRoute
  }

  ngOnInit(): void {
    // Initialize with default SEO data
    this.updateSeoWithRoute({
      title: 'SEO Service Test - Oilandgasclub',
      description: 'This is a test page to demonstrate the SEO service functionality.',
      keywords: 'seo test, oilandgasclub, meta tags',
      type: 'website'
    });
    
    this.refreshData();
  }

  testDirectService(): void {
    this.seoService.updateSeoData({
      title: 'Direct Service Test - Oilandgasclub',
      description: 'This title was set using the SeoService directly.',
      keywords: 'direct service, seo test, meta tags',
      type: 'website'
    });
    
    this.refreshData();
  }

  testBaseComponent(): void {
    this.updateSeoWithRoute({
      title: 'Base Component Test - Oilandgasclub',
      description: 'This title was set using the SeoBaseComponent methods.',
      keywords: 'base component, seo test, inheritance',
      type: 'website'
    });
    
    this.refreshData();
  }

  testStructuredData(): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'SEO Service Test Page',
      description: 'A test page for demonstrating SEO service functionality',
      url: 'https://www.oilandgasclub.com/seo-test',
      author: {
        '@type': 'Organization',
        name: 'Oilandgasclub'
      },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };

    this.addStructuredData(structuredData);
  }

  testRobots(): void {
    // Toggle between different robots settings
    const currentRobots = this.seoService.getDescription();
    if (currentRobots.includes('noindex')) {
      this.setRobots(true, true); // Allow indexing
    } else {
      this.setRobots(false, true); // Prevent indexing
    }
  }

  refreshData(): void {
    this.currentTitle = this.getCurrentTitle();
    this.currentDescription = this.getCurrentDescription();
  }
}
