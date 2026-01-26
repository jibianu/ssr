import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs';
import { switchMap, map, catchError, shareReplay, startWith, filter, distinctUntilChanged } from 'rxjs/operators';
import { PublicAppService } from './../../publicapp.service';
import { Component, OnDestroy, Input, OnChanges, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

interface RelatedCourseFeature {
  id?: string;
  description?: string;
  iconUrl?: string;
}

interface RelatedCourseCard {
  id?: string;
  title?: string;
  titleImageUrl?: string;
  amount?: number;
  canonicalUrl: string;
  courseFeatures: RelatedCourseFeature[];
  badge?: string;
  listPrice?: number;
  discountPercent?: number;
  instructorName?: string;
  shortDescription?: string;
  learnersCount?: number;
  rating?: number;
  reviewCount?: number;
  tagLabel?: string;
}

@Component({
    selector: 'app-public-related-courses',
    templateUrl: './public-related-courses.component.html',
    styleUrls: ['./public-related-courses.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicRelatedCoursesComponent implements OnChanges, OnDestroy {

  readonly itemsPerPage = 4;

  courses$: Observable<RelatedCourseCard[]>;

  @Input() categoryName: string | null = null;
  @Input() courseId: string | null = null;

  private categoryName$ = new BehaviorSubject<string | null>(null);
  private courseId$ = new BehaviorSubject<string | null>(null);

  constructor(
    private publicAppService: PublicAppService
  ) {
    const categoryChanges$ = this.categoryName$.pipe(
      map(value => (value ?? '').trim()),
      filter(value => value.length > 0),
      distinctUntilChanged()
    );

    const courseIdChanges$ = this.courseId$.pipe(
      distinctUntilChanged(),
      startWith(null)
    );

    this.courses$ = categoryChanges$.pipe(
      switchMap(categoryName =>
        combineLatest([
          this.publicAppService.getRelatedCourses(categoryName).pipe(
            map(courses => {
              if (!Array.isArray(courses)) {
                return [];
              }

              return courses.map(course => this.mapCourse(course));
            }),
            catchError(error => {
              console.error('Error fetching related courses:', error);
              return of([]);
            }),
            startWith([])
          ),
          courseIdChanges$
        ]).pipe(
          map(([courses, currentCourseId]) => {
            const filtered = currentCourseId
              ? courses.filter(course => course?.id !== currentCourseId)
              : courses;

            return filtered.slice(0, this.itemsPerPage);
          })
        )
      ),
      startWith([] as RelatedCourseCard[]),
      shareReplay(1)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.categoryName) {
      this.updateCategoryName(changes.categoryName.currentValue);
    }
    if (changes.courseId) {
      this.updateCourseId(changes.courseId.currentValue);
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
    }
  }

  trackByCourseId(index: number, course: RelatedCourseCard): string {
    return course?.id != null ? String(course.id) : String(index);
  }

  getRatingPercentage(rating: number | undefined): number {
    if (!rating) return 0;
    // ✅ Convert 5-star rating to percentage (e.g., 4.9 → 98%)
    // If rating is already a percentage (0-100), return as is
    if (rating > 5) {
      return Math.round(rating);
    }
    // Convert 5-star scale to percentage
    return Math.round((rating / 5) * 100);
  }

  formatReviewCount(count: number | undefined): string {
    if (!count) return '0';
    // ✅ Format review count: 1500 → "1.5K", 908 → "908"
    if (count >= 1000) {
      const k = count / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return count.toString();
  }

  private normalizeCourseUrl(url: string | null | undefined): string {
    if (!url) return '';
    let normalized = url.replace(/^\/+/, '');
    if (normalized.startsWith('course/course/')) {
      normalized = normalized.replace(/^course\/course\//, '');
    } else if (normalized.startsWith('course/')) {
      normalized = normalized.replace(/^course\//, '');
    }
    return normalized ? `/${normalized}` : '';
  }

  private mapCourse(course: any): RelatedCourseCard {
    const courseFeatures: RelatedCourseFeature[] = Array.isArray(course?.courseFeatures)
      ? course.courseFeatures.map((feature: any) => ({
          id: feature?.id,
          description: feature?.description,
          iconUrl: feature?.iconUrl
        }))
      : [];

    const badge = course?.isBestSeller ? 'Best Seller' : course?.badge;
    const salePrice = this.toNumber(
      course?.amount ??
      course?.saleAmount ??
      course?.salePrice ??
      course?.discountedPrice ??
      course?.price
    );
    const listPrice = this.toNumber(
      course?.mrp ??
      course?.originalAmount ??
      course?.strikePrice ??
      course?.listPrice ??
      course?.basePrice ??
      course?.markedPrice ??
      course?.actualAmount
    );
    const discountPercent = this.calculateDiscount(listPrice, salePrice);

    const instructorName =
      course?.mentorName ??
      course?.trainerName ??
      course?.instructorName ??
      course?.teacherName ??
      course?.createdBy ??
      course?.author ??
      '';

    const learnersCount = this.toNumber(
      course?.learnersCount ??
      course?.studentsCount ??
      course?.totalStudents ??
      course?.totalEnrollments ??
      course?.enrolledCount ??
      course?.enrollmentCount
    );

    const rating = this.toNumber(
      course?.rating ??
      course?.averageRating ??
      course?.ratingsAverage ??
      course?.ratings?.average ??
      course?.ratingValue
    );

    const reviewCount = this.toNumber(
      course?.reviewCount ??
      course?.ratingsCount ??
      course?.numberOfRatings ??
      course?.ratingCount ??
      course?.reviewsCount
    );

    const tagLabel =
      course?.tag ??
      course?.label ??
      course?.badgeSecondary ??
      course?.categoryName ??
      course?.courseType ??
      '';

    const shortDescription =
      course?.shortDescription ??
      course?.aboutCourse ??
      course?.shortDesc ??
      course?.metaDescription ??
      course?.summary ??
      '';

    return {
      ...course,
      canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl),
      courseFeatures,
      badge,
      amount: salePrice ?? listPrice ?? this.toNumber(course?.amount) ?? undefined,
      listPrice,
      discountPercent,
      instructorName: instructorName || undefined,
      shortDescription: shortDescription || undefined,
      learnersCount,
      rating,
      reviewCount,
      tagLabel: tagLabel || undefined
    };
  }

  ngOnDestroy(): void {
    this.categoryName$.complete();
    this.courseId$.complete();
  }

  private updateCategoryName(value: string | null | undefined): void {
    const normalized = (value ?? '').trim();
    const current = this.categoryName$.value ?? '';

    if (!normalized) {
      if (current !== '') {
        this.categoryName$.next(null);
      }
      return;
    }

    if (current === normalized) {
      return;
    }

    this.categoryName$.next(normalized);
  }

  private updateCourseId(value: string | null | undefined): void {
    const normalized = value ?? null;

    if (this.courseId$.value === normalized) {
      return;
    }

    this.courseId$.next(normalized);
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      const cleaned = value.replace(/[, ]+/g, '');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private calculateDiscount(listPrice?: number, salePrice?: number): number | undefined {
    if (!listPrice || !salePrice || salePrice >= listPrice) {
      return undefined;
    }

    const discount = Math.round(((listPrice - salePrice) / listPrice) * 100);
    return Number.isFinite(discount) ? discount : undefined;
  }
}
