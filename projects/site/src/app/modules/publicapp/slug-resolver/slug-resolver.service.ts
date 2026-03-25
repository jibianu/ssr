import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { API_URL } from 'src/app/core/config/api-url.config';

export interface SlugResolverResponse {
  type: 'course' | 'blog' | 'event';
  slug: string;
}

@Injectable({ providedIn: 'root' })
export class SlugResolverService {
  private readonly baseUrl: string;
  /** Avoid duplicate GET api/slug-resolver/{slug} when resolver + guards revisit the same slug. */
  private readonly resolveCache = new Map<string, Observable<SlugResolverResponse | null>>();
  private static readonly RESOLVE_CACHE_CAP = 64;

  constructor(
    private http: HttpClient,
    @Inject(API_URL) apiBase: string
  ) {
    const base = (apiBase || '').endsWith('/') ? apiBase : `${apiBase}/`;
    this.baseUrl = `${base}api/slug-resolver/`;
  }

  resolve(slug: string): Observable<SlugResolverResponse | null> {
    if (!slug || !slug.trim()) return of(null);
    const key = slug.trim().toLowerCase();
    const hit = this.resolveCache.get(key);
    if (hit) {
      return hit;
    }
    const encoded = encodeURIComponent(slug.trim());
    const request$ = this.http.get<any>(`${this.baseUrl}${encoded}`).pipe(
      map((res) => {
        if (!res || typeof res !== 'object') return null;
        const t = (res.type ?? res.Type ?? '').toString().toLowerCase();
        if (t !== 'course' && t !== 'blog' && t !== 'event') return null;
        const raw = (res.slug ?? res.Slug ?? slug).toString().trim() || slug.trim();
        const s = this.normalizeResolvedSlug(raw);
        return { type: t as SlugResolverResponse['type'], slug: s };
      }),
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    while (this.resolveCache.size >= SlugResolverService.RESOLVE_CACHE_CAP) {
      const oldest = this.resolveCache.keys().next().value;
      if (oldest === undefined) break;
      this.resolveCache.delete(oldest);
    }
    this.resolveCache.set(key, request$);
    return request$;
  }

  private normalizeResolvedSlug(value: string): string {
    let s = (value || '').trim();
    try {
      s = decodeURIComponent(s);
    } catch {
      // keep original when malformed escape exists
    }
    s = s
      .replace(/[?#].*$/, '')
      .replace(/&/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return s;
  }
}
