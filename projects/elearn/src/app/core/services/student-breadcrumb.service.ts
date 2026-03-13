import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BreadcrumbSegment {
  label: string;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentBreadcrumbService {
  private readonly segments$ = new BehaviorSubject<BreadcrumbSegment[] | null>(null);

  get breadcrumb$() {
    return this.segments$.asObservable();
  }

  setBreadcrumb(segments: BreadcrumbSegment[]): void {
    this.segments$.next(segments);
  }

  clear(): void {
    this.segments$.next(null);
  }
}
