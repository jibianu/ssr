import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs';
import { switchMap, map, catchError, shareReplay, startWith, filter, distinctUntilChanged } from 'rxjs/operators';
import { PublicAppService } from './../../publicapp.service';
import { Component, OnDestroy, Input, OnChanges, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-public-related-courses',
    templateUrl: './public-related-courses.component.html',
    styleUrls: ['./public-related-courses.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicRelatedCoursesComponent implements OnChanges, OnDestroy {

  readonly itemsPerPage = 5;

  courses$: Observable<any[]>;

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

              return courses.map((course: any) => ({
                ...course,
                canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
              }));
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
            if (!currentCourseId) {
              return courses;
            }

            const index = courses.findIndex(course => course?.id === currentCourseId);
            if (index === -1) {
              return courses;
            }

            const updatedCourses = [...courses];
            updatedCourses.splice(index, 1);
            return updatedCourses;
          })
        )
      ),
      startWith([]),
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

  trackByCourseId(index: number, course: any): string {
    return course?.id || index.toString();
  }

  private normalizeCourseUrl(url: string | null | undefined): string {
    if (!url) return '';
    // Remove leading slash
    let normalized = url.replace(/^\/+/, '');
    // Remove 'course/course/' prefix if present
    if (normalized.startsWith('course/course/')) {
      normalized = normalized.replace(/^course\/course\//, '');
    } else if (normalized.startsWith('course/')) {
      normalized = normalized.replace(/^course\//, '');
    }
    return '/' + normalized;
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
}
