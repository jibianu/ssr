import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  link?: string;
}

export interface CourseHeaderContext {
  breadcrumb: BreadcrumbItem[];
  courseTitle: string;
}

/**
 * Context for the Elearn header on course detail pages.
 * CourseShellComponent sets this when showing Elearn layout; topbar shows breadcrumb + course title.
 * Uses BehaviorSubject so topbar updates when context is set (fixes change-detection timing).
 */
@Injectable({ providedIn: 'root' })
export class CourseHeaderContextService {
  private readonly context$ = new BehaviorSubject<CourseHeaderContext | null>(null);

  set(context: CourseHeaderContext | null): void {
    this.context$.next(context);
  }

  get(): CourseHeaderContext | null {
    return this.context$.value;
  }

  getContext$(): Observable<CourseHeaderContext | null> {
    return this.context$.asObservable();
  }

  clear(): void {
    this.context$.next(null);
  }
}
