import { Injectable, Inject } from '@angular/core';
import { API_URL_TOKEN } from '../tokens';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  constructor(@Inject(API_URL_TOKEN) private readonly apiUrl: string) {}

  get baseUrl(): string {
    const url = this.apiUrl?.trim() ?? '';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /** Full URL for a path (e.g. path '/courses' -> baseUrl + '/courses') */
  url(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${p}`;
  }
}
