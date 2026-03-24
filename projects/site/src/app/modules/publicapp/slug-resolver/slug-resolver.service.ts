import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_URL } from 'src/app/core/config/api-url.config';

export interface SlugResolverResponse {
  type: 'course' | 'blog' | 'event';
  slug: string;
}

@Injectable({ providedIn: 'root' })
export class SlugResolverService {
  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(API_URL) apiBase: string
  ) {
    const base = (apiBase || '').endsWith('/') ? apiBase : `${apiBase}/`;
    this.baseUrl = `${base}api/slug-resolver/`;
  }

  resolve(slug: string): Observable<SlugResolverResponse | null> {
    if (!slug || !slug.trim()) return of(null);
    const encoded = encodeURIComponent(slug.trim());
    return this.http.get<any>(`${this.baseUrl}${encoded}`).pipe(
      map((res) => {
        if (!res || typeof res !== 'object') return null;
        const t = (res.type ?? res.Type ?? '').toString().toLowerCase();
        if (t !== 'course' && t !== 'blog' && t !== 'event') return null;
        const s = (res.slug ?? res.Slug ?? slug).toString().trim() || slug.trim();
        return { type: t as SlugResolverResponse['type'], slug: s };
      }),
      catchError(() => of(null))
    );
  }
}
