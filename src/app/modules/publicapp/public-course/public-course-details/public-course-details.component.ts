import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { PublicAppService } from '../../publicapp.service';
import { environment } from './../../../../../environments/environment';

@Component({
    selector: 'app-public-course-details',
    templateUrl: './public-course-details.component.html',
    styleUrls: ['./public-course-details.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush for faster change detection
})
export class PublicCourseDetailsComponent implements OnInit, OnDestroy {

  course: any = null; // ✅ Course data - only set when user clicks "Load Course" button
  courseDetails: any = null; // ✅ Alias for backward compatibility with existing template
  image = '';
  categoryName = '';
  courseId = '';
  
  // ✅ Loading states
  isLoading = false;
  isLoaded = false;
  loadError: string | null = null;
  
  // ✅ SSR: Browser check for DOM operations
  private readonly isBrowser: boolean;
  private readonly createdByList = ['f48824b8-f021-70f5-0cb8-a5cee2516932', 'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'];

  // ✅ FIX: Add missing 'more' property for FAQ expansion functionality
  more = false;

  // ✅ FIX: Move inject() calls to constructor to prevent injector errors in SSR
  private readonly canonicalService: CanonicalService;
  private readonly metadataService: MetadataService;
  private readonly structuredDataService: StructuredDataService;
  private readonly publicAppService: PublicAppService;
  private readonly changeDetectorRef: ChangeDetectorRef;
  private subscription = new Subscription();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    canonicalService: CanonicalService,
    metadataService: MetadataService,
    structuredDataService: StructuredDataService,
    publicAppService: PublicAppService,
    changeDetectorRef: ChangeDetectorRef
  ) {
    // ✅ FIX: Initialize injected services in constructor to ensure injector is available
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.canonicalService = canonicalService;
    this.metadataService = metadataService;
    this.structuredDataService = structuredDataService;
    this.publicAppService = publicAppService;
    this.changeDetectorRef = changeDetectorRef;
  }

  ngOnInit(): void {
    const paramsSub = this.route.paramMap.subscribe(paramMap => {
      const slug = paramMap.get('url');
      const location = paramMap.get('location');
      this.loadCourse(slug, location);
    });
    this.subscription.add(paramsSub);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ✅ Manual course loading - ONLY triggered by user interaction (button click)
  // NO automatic calls on page load
  loadCourse(slug: string | null, location: string | null): void {
    if (!slug) {
      this.loadError = 'Course URL not found';
      return;
    }

    // Prevent multiple simultaneous requests
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.isLoaded = false;
    this.loadError = null;
    this.course = null;
    this.courseDetails = null;
    this.changeDetectorRef.markForCheck();

    // ✅ Use service method (caching works automatically via shareReplay)
    // ✅ IMPORTANT: This should result in ONLY ONE API call to /api/course/{slug}
    // shareReplay ensures duplicate concurrent requests share the same response
    const courseObservable = location 
      ? this.publicAppService.getCourseByCanonicalLocationURL(slug, location)
      : this.publicAppService.getCourseByCanonicalURL(slug);

    courseObservable.subscribe({
      next: (data) => {
        if (!data) {
          this.loadError = 'Course not found';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
          return;
        }
        
        // ✅ Set course data (only after successful API response)
        this.course = data;
        this.courseDetails = data; // ✅ Alias for backward compatibility
        this.setComponentProperties(data, location);
        this.isLoaded = true;
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.loadError = 'Failed to load course. Please try again.';
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  // ✅ Getter for self-learning check
  get isSelfLearning$(): boolean {
    if (!this.course) {
      return false;
    }
    return this.course.createdByUser && 
      this.createdByList.includes(this.course.createdByUser.id);
  }

  setComponentProperties(courseDetails, location: string | null) {
    const canonicalUrl = location ?
      `${courseDetails.canonicalUrl}-${location.toLowerCase()}`:
      `${courseDetails.canonicalUrl}`;
    
      this.courseDetails = courseDetails;
      this.courseId = this.courseDetails.id;
      this.categoryName = (this.courseDetails && this.courseDetails.category) ? this.courseDetails.category.name : '';
      this.image = this.courseDetails.titleImageUrl || 'https://www.oilandgasclub.com/assets/images/og-image.jpg';

      const fullUrl = environment.seoUrl + canonicalUrl;
      const authorName = this.courseDetails.createdByUser?.firstname && this.courseDetails?.createdByUser?.lastname
        ? `${this.courseDetails.createdByUser.firstname} ${this.courseDetails.createdByUser.lastname}`
        : 'Oilandgasclub';

      // ✅ SEO: Set meta tags (SSR-compatible)
      this.metadataService.updateMetadata({
        title: this.courseDetails.title || 'Course - Oilandgasclub',
        description: this.courseDetails.metaDescription || 'Professional oil and gas industry course',
        author: authorName,
        type: 'article',
        image: this.image,
        imageWidth: 1200,
        imageHeight: 630,
        seoUrl: fullUrl,
        time: this.courseDetails.createdOn,
        updatedTime: this.courseDetails.updatedOn,
        category: this.categoryName,
        canonicalUrl: fullUrl
      });
      this.canonicalService.setCanonicalURL(fullUrl);

      // ✅ SEO: Add Course structured data (JSON-LD)
      this.structuredDataService.setCourse({
        name: this.courseDetails.title || 'Course',
        description: this.courseDetails.metaDescription || 'Professional oil and gas industry course',
        url: fullUrl,
        image: this.image,
        provider: {
          name: 'Oilandgasclub',
          url: 'https://www.oilandgasclub.com'
        },
        educationalLevel: 'Professional',
        inLanguage: 'en',
        datePublished: this.courseDetails.createdOn,
        dateModified: this.courseDetails.updatedOn,
        category: this.categoryName,
        ...(this.courseDetails.price && {
          offers: {
            price: this.courseDetails.price.toString(),
            priceCurrency: this.courseDetails.currency || 'USD',
            availability: 'https://schema.org/InStock',
            url: fullUrl
          }
        })
      });

      // ✅ SEO: Add BreadcrumbList structured data
      const breadcrumbs = [
        { name: 'Home', url: environment.seoUrl },
        { name: 'Courses', url: `${environment.seoUrl}list` }
      ];
      
      if (this.categoryName) {
        breadcrumbs.push({
          name: this.categoryName,
          url: `${environment.seoUrl}category/${this.categoryName}`
        });
      }
      
      breadcrumbs.push({
        name: this.courseDetails.title || 'Course',
        url: fullUrl
      });
      
      this.structuredDataService.setBreadcrumbs(breadcrumbs);
  }

  // onImgError(event) {
  //   event.target.src = 'https://via.placeholder.com/468x300?text=OilandGasClub';
  // }

  onImgError(event: any) {
    (event.target as HTMLImageElement).src = 'assets/img/oilandgasclub.jpg';
  }

  onUserImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/user-profile.png';
    }
  }

  // ✅ PERFORMANCE: TrackBy functions for ngFor optimization
  trackBySummaryIndex(index: number): number {
    return index;
  }

  trackByCourseContentId(index: number, item: any): string {
    return item?.id || `content-${index}`;
  }

  trackBySubContentId(index: number, item: any): string {
    return item?.id || `subcontent-${index}`;
  }

  trackBySubSubContentId(index: number, item: any): string {
    return item?.id || `subsubcontent-${index}`;
  }

  // ✅ HELPER: Check if sub-item has nested items to show dropdown icon
  hasNestedItems(subItem: any): boolean {
    return subItem?.courseContentSubSubTypes && 
           Array.isArray(subItem.courseContentSubSubTypes) && 
           subItem.courseContentSubSubTypes.length > 0;
  }

  trackByFaqId(index: number, item: any): string {
    return item?.id || `faq-${index}`;
  }

  trackByTeacherId(index: number, item: any): string {
    return item?.id || `teacher-${index}`;
  }

  trackByFeatureId(index: number, item: any): string {
    return item?.id || `feature-${index}`;
  }

  trackByInfoItemId(index: number, item: any): string {
    return item?.id || `info-${index}`;
  }

  // ✅ FIX: Prevent navigation when clicking More/Less link
  toggleMore(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.more = !this.more;
  }

  // ✅ FIX: Prevent navigation when clicking dropdown/collapse links
  // ✅ SSR: Safe - only executes in browser
  preventNavigation(event: Event): void {
    // Prevent default to stop Angular router from intercepting hash links
    event.preventDefault();
    event.stopPropagation();
    
    // ✅ SSR: Only execute DOM operations in browser
    if (!this.isBrowser) {
      return;
    }
    
    const target = event.target as HTMLElement;
    const link = target.closest('a[data-toggle="collapse"]') as HTMLAnchorElement;
    
    if (!link) {
      return;
    }
    
    // Get the target element from href or hash
    const targetId = link.getAttribute('href')?.replace('#', '') || link.hash?.replace('#', '');
    if (!targetId) {
      return;
    }
    
    const targetElement = document.getElementById(targetId) || document.querySelector(`#${targetId}`);
    
    if (!targetElement) {
      return;
    }
    
    const collapseElement = targetElement as HTMLElement;
    const isExpanded = collapseElement.classList.contains('show');
    
    // Check if Bootstrap is available (for Bootstrap collapse)
    const bootstrap = (window as any).bootstrap;
    
    if (bootstrap && bootstrap.Collapse) {
      // Use Bootstrap 5+ Collapse API if available
      try {
        const collapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
        collapse.toggle();
        
        // Update link state
        setTimeout(() => {
          const isNowExpanded = collapseElement.classList.contains('show');
          link.setAttribute('aria-expanded', isNowExpanded.toString());
          if (isNowExpanded) {
            link.classList.remove('collapsed');
          } else {
            link.classList.add('collapsed');
          }
        }, 100);
        return;
      } catch (e) {
        console.warn('Bootstrap Collapse API failed, using fallback:', e);
      }
    }
    
    // Fallback: manually toggle if Bootstrap API fails or isn't available
    if (isExpanded) {
      collapseElement.classList.remove('show');
      link.setAttribute('aria-expanded', 'false');
      link.classList.add('collapsed');
    } else {
      // Close other items in the same parent accordion
      const parentSelector = link.getAttribute('data-parent') || 
                            collapseElement.getAttribute('data-parent');
      if (parentSelector) {
        const parent = document.querySelector(parentSelector);
        if (parent) {
          const siblings = parent.querySelectorAll('.collapse.show');
          siblings.forEach((sibling: Element) => {
            if (sibling !== targetElement) {
              (sibling as HTMLElement).classList.remove('show');
              // Update sibling link states
              const siblingLink = parent.querySelector(`a[href="#${sibling.id}"]`) as HTMLAnchorElement;
              if (siblingLink) {
                siblingLink.setAttribute('aria-expanded', 'false');
                siblingLink.classList.add('collapsed');
              }
            }
          });
        }
      }
      
      collapseElement.classList.add('show');
      link.setAttribute('aria-expanded', 'true');
      link.classList.remove('collapsed');
    }
  }

}