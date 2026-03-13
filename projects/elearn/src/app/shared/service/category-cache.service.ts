import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';

/** Minimal shape for category dropdown (id, name). */
export interface CategoryOption {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Caches categories in memory so they persist across component reloads.
 * Load categories only when needed (e.g. Add Course modal); avoid duplicate API calls.
 */
@Injectable({ providedIn: 'root' })
export class CategoryCacheService {
  private readonly categoriesSubject = new BehaviorSubject<CategoryOption[] | null>(null);

  /** Emits current categories (null = not loaded yet, [] = loaded empty). */
  readonly categories$ = this.categoriesSubject.asObservable();

  constructor(private readonly appService: AdminAppService) {}

  /**
   * Load categories from API if not already cached. Safe to call multiple times.
   * @returns Observable that completes with the categories list.
   */
  loadCategories(): Observable<CategoryOption[]> {
    if (this.categoriesSubject.value !== null) {
      return of(this.categoriesSubject.value);
    }
    return this.appService.getCategories().pipe(
      tap((list) => this.categoriesSubject.next((list ?? []) as unknown as CategoryOption[])),
      shareReplay(1)
    ) as Observable<CategoryOption[]>;
  }

  /** Clear cache (e.g. after logout). */
  clear(): void {
    this.categoriesSubject.next(null);
  }
}
