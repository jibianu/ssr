import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SlugResolverResponse {
  type: 'course' | 'blog' | 'event';
  slug: string;
}

@Injectable({ providedIn: 'root' })
export class SlugResolverService {
  private readonly apiUrl = `${environment.apiUrl}api/slug-resolver/`;

  constructor(private http: HttpClient) {}

  resolve(slug: string): Observable<SlugResolverResponse | null> {
    if (!slug || !slug.trim()) return of(null);
    const encoded = encodeURIComponent(slug.trim());
    return this.http.get<SlugResolverResponse>(`${this.apiUrl}${encoded}`).pipe(
      catchError(() => of(null))
    );
  }
}
