import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { StudentBreadcrumbService, BreadcrumbSegment } from '../../../core/services/student-breadcrumb.service';

@Component({
  selector: 'app-student-breadcrumb',
  templateUrl: './student-breadcrumb.component.html',
  styleUrls: ['./student-breadcrumb.component.scss'],
  standalone: false
})
export class StudentBreadcrumbComponent implements OnInit, OnDestroy {
  segments: BreadcrumbSegment[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private breadcrumbService: StudentBreadcrumbService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.segments = this.getDefaultFromRoute();

    this.breadcrumbService.breadcrumb$
      .pipe(takeUntil(this.destroy$))
      .subscribe((segments) => {
        this.segments = segments || this.getDefaultFromRoute();
      });

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.breadcrumbService.clear();
        this.segments = this.getDefaultFromRoute();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getDefaultFromRoute(): BreadcrumbSegment[] {
    const url = this.router.url || '';
    const base = '/app/student';
    if (url.startsWith(base + '/dashboard')) return [{ label: 'Dashboard' }];
    if (url.startsWith(base + '/courses')) return [{ label: 'My Courses' }];
    if (url.startsWith(base + '/categories')) return [{ label: 'Explore' }];
    if (url.startsWith(base + '/details')) return [{ label: 'My Courses', url: '/app/student/courses' }, { label: 'Course' }];
    if (url.startsWith(base + '/profile')) return [{ label: 'Profile' }];
    if (url.startsWith(base + '/certificate-template')) return [{ label: 'Certificates', url: '/app/student/certificate' }, { label: 'Certificate' }];
    if (url.startsWith(base + '/certificate')) return [{ label: 'Certificates' }];
    if (url.startsWith(base + '/purchase-history')) return [{ label: 'Purchase History' }];
    if (url.startsWith(base + '/notifications')) return [{ label: 'Notifications' }];
    if (url.startsWith(base + '/exam-test') || url.startsWith(base + '/curriculum-questions') || url.startsWith(base + '/practice-question')) {
      return [{ label: 'My Courses', url: '/app/student/courses' }, { label: 'Questions' }];
    }
    if (url.startsWith(base + '/category-courses-description')) return [{ label: 'Explore', url: '/app/student/categories' }, { label: 'Course' }];
    if (url.startsWith(base + '/category-courses')) return [{ label: 'Explore', url: '/app/student/categories' }, { label: 'Category' }];
    return [];
  }
}

