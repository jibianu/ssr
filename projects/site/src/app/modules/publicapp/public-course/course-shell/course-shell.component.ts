import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CourseHeaderContextService } from 'src/app/core/services/course-header-context.service';
import { environment } from 'src/environments/environment';

// UUID-like (e.g. 8-4-4-4-12 or 9-4-4-4-12 hex) so course IDs always get Elearn layout + breadcrumb header
const UUID_LIKE_REGEX = /^[0-9a-fA-F]{8,9}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function looksLikeCourseId(param: string | null): boolean {
  if (!param || typeof param !== 'string') return false;
  const t = param.trim();
  return /^\d+$/.test(t) || UUID_LIKE_REGEX.test(t);
}

/**
 * Course page for :courseSlug. When param is numeric or GUID (e.g. /123), use Elearn layout
 * (header, sidebar, content). Otherwise use public layout (content only; header/footer from parent).
 */
@Component({
  selector: 'app-course-shell',
  standalone: false,
  templateUrl: './course-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseShellComponent implements OnInit, OnDestroy {
  course: any = null;
  courseSlug = '';
  private dataSub: Subscription | null = null;

  /** For Elearn layout, use course's canonical slug (for canonical tag); otherwise same as courseSlug. */
  get canonicalSlug(): string {
    if (!this.course) return this.courseSlug;
    const slug = this.course.canonicalUrl ?? this.course.CanonicalUrl ?? this.course.slug ?? this.course.Slug ?? '';
    return (slug || this.courseSlug).toString().trim();
  }
  /** True when URL is /:courseId (ID) → show Elearn layout; false for canonical slug → public layout. */
  useElearnLayout = false;
  /** True when ?embed=1 (e.g. when page is iframed inside 4201) → show only content, no topbar/sidebar. */
  get isEmbedMode(): boolean {
    return this.route.snapshot.queryParamMap.get('embed') === '1';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private headerContext: CourseHeaderContextService
  ) {}

  private applySlugAndCourse(slug: string, resolved: any): void {
    this.courseSlug = slug;
    this.course = resolved;

    if (!this.course) {
      this.router.navigate(['/page-not-found'], { replaceUrl: true });
      this.cdr.markForCheck();
      return;
    }
    this.useElearnLayout = looksLikeCourseId(this.courseSlug || null) && !this.isEmbedMode;
    if (this.useElearnLayout) {
      const elearnBase = (environment as { elearnAppUrl?: string }).elearnAppUrl?.replace(/\/$/, '') || '';
      const categoryName = this.course.categoryName ?? this.course.CategoryName
        ?? (this.course.category && (this.course.category.name ?? this.course.category.Name))
        ?? '';
      const courseTitle = (this.course.title ?? this.course.Title ?? '').toString().trim();
      this.headerContext.set({
        breadcrumb: [
          { label: 'Explore', link: elearnBase ? `${elearnBase}/app/student/categories` : undefined },
          ...(categoryName ? [{ label: categoryName, link: elearnBase ? `${elearnBase}/app/student/categories` : undefined }] : [])
        ],
        courseTitle
      });
    } else {
      this.headerContext.clear();
    }
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    const parent = this.route.parent ?? this.route;
    const paramMap$ = parent.paramMap.pipe(
      map(p => (p.get('courseSlug') ?? '').toString())
    );
    const data$ = parent.data.pipe(
      map(d => d['course'] ?? null)
    );
    this.dataSub = combineLatest([paramMap$, data$]).subscribe(([slug, resolved]) => {
      this.applySlugAndCourse(slug, resolved);
    });
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
    this.dataSub = null;
    this.headerContext.clear();
  }
}
