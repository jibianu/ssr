import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { catchError, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';

/** Public site (4200) routes by slug, not raw course Id — iframes must not use /{guid} or the site shows 404. */
const GUID_PATH_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Embeds the public site course page (slug URL, e.g. /api-653-above-ground-storage-tank-inspector) inside Elearn.
 * Loads course from API first to resolve slug/canonicalUrl. If only a GUID path is available, uses native Elearn UI instead (site has no /{guid} route).
 */
@Component({
  selector: 'app-public-course-embed',
  templateUrl: './public-course-embed.component.html',
  styleUrls: ['./public-course-embed.component.scss'],
  standalone: false
})
export class PublicCourseEmbedComponent implements OnInit {
  iframeUrl: SafeResourceUrl | null = null;

  /** When false, show native course page (same route params) instead of an iframe. */
  usePublicSiteIframe = false;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private appService: AdminAppService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const env = environment as {
      publicCourseSiteUrl?: string;
      forcePublicCourseIframe?: boolean;
    };
    const base = env.publicCourseSiteUrl?.replace(/\/$/, '') || '';
    const forceIframe = !!env.forcePublicCourseIframe;
    const baseLooksLocal =
      !!base && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);

    this.usePublicSiteIframe = !!base && (!baseLooksLocal || forceIframe);

    if (!this.usePublicSiteIframe) {
      return;
    }

    combineLatest([
      this.route.paramMap.pipe(map((pm) => pm.get('courseID') || '')),
      this.route.queryParamMap.pipe(
        map((qm) => {
          const raw = qm.get('publicSlug')?.trim() || '';
          if (!raw || raw.includes('..')) return '';
          return raw;
        })
      ),
    ])
      .pipe(
        filter(([courseId]) => !!courseId),
        distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]),
        switchMap(([courseId, publicSlug]) =>
          this.appService.getCourseByCourseID(courseId, true).pipe(
            map((courseRes: any) => ({ courseId, publicSlug, courseRes })),
            catchError(() => of({ courseId, publicSlug, courseRes: null as any }))
          )
        )
      )
      .subscribe(({ courseId, publicSlug, courseRes }) => {
        // Prefer slug from API for this course id — query ?publicSlug= can get out of sync and load the wrong marketing page.
        const path = this.resolveMarketingSitePath(courseId, publicSlug, courseRes);
        // localhost:4200 (and prod site) resolve courses by slug; /{guid} → marketing 404 inside iframe.
        if (this.publicSitePathIsGuidOnly(path)) {
          this.usePublicSiteIframe = false;
          this.iframeUrl = null;
          this.cdr.markForCheck();
          return;
        }

        const setIframe = (enrolled: boolean) => {
          const query = enrolled ? 'embed=1&enrolled=1' : 'embed=1';
          const url = `${base}${path}?${query}`;
          this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        };

        const enrolledFromCourse = !!(
          courseRes?.isProgressedForLoggedInUser ?? courseRes?.IsProgressedForLoggedInUser
        );

        this.appService.getEnrollmentStatus(courseId).subscribe({
          next: (res) => {
            const enrolledFlag = (res as any)?.isEnrolled ?? (res as any)?.IsEnrolled;
            if (enrolledFlag === true) {
              setIframe(true);
              return;
            }
            if (enrolledFromCourse) {
              setIframe(true);
              return;
            }
            this.appService.getEnrollmentStatusBulk([courseId]).subscribe({
              next: (statusMap) => {
                const cidLower = String(courseId).toLowerCase();
                const enrolledFromBulk =
                  !!statusMap &&
                  Object.keys(statusMap).some(
                    (k) => k?.toLowerCase() === cidLower && !!(statusMap as any)[k]
                  );
                setIframe(enrolledFromBulk || enrolledFromCourse);
              },
              error: () => setIframe(enrolledFromCourse)
            });
          },
          error: () => {
            this.appService.getEnrollmentStatusBulk([courseId]).subscribe({
              next: (statusMap) => {
                const cidLower = String(courseId).toLowerCase();
                const enrolledFromBulk =
                  !!statusMap &&
                  Object.keys(statusMap).some(
                    (k) => k?.toLowerCase() === cidLower && !!(statusMap as any)[k]
                  );
                setIframe(enrolledFromBulk || enrolledFromCourse);
              },
              error: () => setIframe(enrolledFromCourse)
            });
          }
        });
      });
  }

  /**
   * Build public-site path: API slug wins when present; else query publicSlug (Explore hint); else course canonical / guid fallback.
   */
  private resolveMarketingSitePath(courseId: string, publicSlugFromQuery: string, courseRes: any): string {
    const apiSlug = (courseRes?.slug ?? courseRes?.Slug ?? '').toString().trim();
    const qSlug = (publicSlugFromQuery || '').trim();
    const pick = apiSlug || qSlug;
    if (!pick) {
      return this.publicSitePathForCourse(courseId, courseRes);
    }
    // If both exist and disagree, trust API so iframe matches the route :courseID.
    if (apiSlug && qSlug && !this.slugsMatchForSameCourse(apiSlug, qSlug)) {
      return this.pathFromSlugSegments(apiSlug);
    }
    return this.pathFromSlugSegments(pick);
  }

  private slugsMatchForSameCourse(a: string, b: string): boolean {
    const n = (s: string) => {
      const t = s.trim().toLowerCase().replace(/\/+$/, '');
      try {
        return decodeURIComponent(t);
      } catch {
        return t;
      }
    };
    return n(a) === n(b);
  }

  private pathFromSlugSegments(slug: string): string {
    return `/${slug
      .split('/')
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join('/')}`;
  }

  /** True if the iframe would load only a GUID path (no slug) — public site does not define that route. */
  private publicSitePathIsGuidOnly(path: string): boolean {
    const first = path.replace(/^\//, '').split('/').filter(Boolean)[0];
    if (!first) return true;
    const decoded = decodeURIComponent(first);
    return GUID_PATH_SEGMENT.test(decoded);
  }

  /**
   * Public marketing URLs use slug (or canonical path), not raw GUID.
   * Example: /api-653-above-ground-storage-tank-inspector
   */
  private publicSitePathForCourse(courseId: string, courseRes: any): string {
    if (!courseRes) {
      return `/${encodeURIComponent(courseId)}`;
    }
    const slug = (courseRes.slug ?? courseRes.Slug ?? '').toString().trim();
    if (slug) {
      return this.pathFromSlugSegments(slug);
    }
    const canonical = (courseRes.canonicalUrl ?? courseRes.CanonicalUrl ?? '')
      .toString()
      .trim()
      .replace(/^\/+/, '');
    if (canonical) {
      return `/${canonical.split('/').map((s) => encodeURIComponent(s)).join('/')}`;
    }
    return `/${encodeURIComponent(courseId)}`;
  }
}
