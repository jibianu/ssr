import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CanonicalService } from '../../../../shared/service/canonical.service';
import { environment } from '../../../../../environments/environment';

/**
 * Wrapper for elearn/course/:id. Resolves course by ID, renders same CourseContentComponent
 * (PublicCourseDetailsComponent), and sets canonical URL to the public slug for SEO.
 */
@Component({
  selector: 'app-elearn-course-wrapper',
  standalone: false,
  templateUrl: './elearn-course-wrapper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElearnCourseWrapperComponent implements OnInit {
  course: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private canonicalService: CanonicalService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.course = this.route.snapshot.data['course'] ?? this.route.parent?.snapshot?.data['course'] ?? null;
    if (!this.course) {
      if (isPlatformBrowser(this.platformId)) {
        void this.router.navigate(['/page-not-found'], { replaceUrl: true });
      }
      return;
    }
    const slug = (this.course.canonicalUrl ?? this.course.CanonicalUrl ?? this.course.slug ?? this.course.Slug ?? '').toString().trim();
    if (slug) {
      const base = environment.seoUrl.replace(/\/?$/, '');
      this.canonicalService.setCanonicalURL(`${base}/${slug}`);
    }
    this.cdr.markForCheck();
  }

  get courseSlug(): string {
    if (!this.course) return '';
    return (this.course.canonicalUrl ?? this.course.CanonicalUrl ?? this.course.slug ?? this.course.Slug ?? '').toString().trim();
  }
}
