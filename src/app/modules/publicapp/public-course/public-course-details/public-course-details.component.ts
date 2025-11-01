import { Component, OnDestroy, OnInit, computed, effect, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { environment } from './../../../../../environments/environment';

@Component({
    selector: 'app-public-course-details',
    templateUrl: './public-course-details.component.html',
    styleUrls: ['./public-course-details.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush for faster change detection
})
export class PublicCourseDetailsComponent {

  courseUrl: string;
  locationUrl: string;
  courseDetails;
  image = '';
  isBrowser = false;
  categoryName = '';
  courseId = '';
  // createdBy=[
  //   'f48824b8-f021-70f5-0cb8-a5cee2516932',
  //   'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'
  // ];
  private readonly createdByList = ['f48824b8-f021-70f5-0cb8-a5cee2516932', 'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'];

  isLoaded=false
  
  // ✅ FIX: Add missing 'more' property for FAQ expansion functionality
  more = false;

  constructor() {
    effect(() => {
      const course = this.courseDetailsFromRoute$();
      const location = this.location$();

      this.setComponentProperties(course, location);
    });
  }

  private readonly canonicalService = inject(CanonicalService);
  private readonly metadataService = inject(MetadataService);
  private readonly structuredDataService = inject(StructuredDataService);

  protected readonly courseDetailsFromRoute$ = input.required<{
    createdByUser?: { id: string };
    title?: string;
    metaDescription?: string;
    titleImageUrl?: string;
    createdOn?: string;
    updatedOn?: string;
    canonicalUrl?: string;
    category?: { name: string };
    price?: number;
    currency?: string;
  }>({alias: 'courseDetails'});
  protected readonly location$ = input<string | null>(null,{alias: 'location'});

  protected readonly isSelfLearning$ = computed(() => {
    const course = this.courseDetailsFromRoute$();
    return course.createdByUser && 
      this.createdByList.includes(course.createdByUser.id);
  })

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

}