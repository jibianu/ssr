import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SlugResolverService, SlugResolverResponse } from './slug-resolver.service';
import { PublicAppService } from '../publicapp.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { PublicCourseModule } from '../public-course/public-course.module';
import { BlogDetailComponent } from '../blog/blog-detail/blog-detail.component';
import { PublicEventModule } from '../public-event/public-event.module';

@Component({
  selector: 'app-slug-resolver',
  templateUrl: './slug-resolver.component.html',
  styleUrls: ['./slug-resolver.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, PublicCourseModule, BlogDetailComponent, PublicEventModule]
})
export class SlugResolverComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private slugResolver = inject(SlugResolverService);
  private publicAppService = inject(PublicAppService);
  private adminService = inject(AdminAppService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  resolved = signal<SlugResolverResponse | null>(null);
  loading = signal(true);
  notFound = signal(false);
  type = signal<'course' | 'blog' | 'event' | null>(null);
  slug = signal('');
  course = signal<any>(null);
  eventData = signal<any>(null);

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const slug = params['slug'] || '';
        if (!slug) {
          this.notFound.set(true);
          this.loading.set(false);
          return of(null);
        }
        this.slug.set(slug);
        this.loading.set(true);
        this.notFound.set(false);
        this.resolved.set(null);
        this.course.set(null);
        this.eventData.set(null);
        this.type.set(null);
        return this.slugResolver.resolve(slug);
      }),
      switchMap(res => {
        if (res === undefined) return of(null);
        if (res === null) {
          this.notFound.set(true);
          this.loading.set(false);
          return of(null);
        }
        this.resolved.set(res);
        this.type.set(res.type);
        if (res.type === 'course') {
          return this.publicAppService.getCourseByCanonicalURL(res.slug, { refresh: false }).pipe(
            catchError(() => {
              this.notFound.set(true);
              return of(null);
            })
          );
        }
        if (res.type === 'event') {
          return this.adminService.getEventByCanonicalURL(res.slug).pipe(
            switchMap((event: any) => {
              if (!event?.id) {
                this.notFound.set(true);
                return of(null);
              }
              return this.publicAppService.getUpcomingEvents(event.id).pipe(
                catchError(() => of([])),
                switchMap((upcoming: any[]) => {
                  this.eventData.set({ ...event, upcomingEvents: upcoming || [] });
                  return of(true);
                })
              );
            }),
            catchError(() => {
              this.notFound.set(true);
              return of(null);
            })
          );
        }
        this.loading.set(false);
        return of(true);
      })
    ).subscribe(result => {
      if (result === null && this.type() !== 'blog') {
        this.loading.set(false);
        if (this.notFound()) this.router.navigate(['/page-not-found'], { replaceUrl: true });
        return;
      }
      if (this.type() === 'course' && result && typeof result === 'object') {
        this.course.set(result);
      }
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
