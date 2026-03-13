import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const SESSION_STORAGE_KEY = 'studentSessionId';

export interface StudentSessionStartResponse {
  sessionId: string;
  sessionStartUtc: string;
}

export interface StudentSessionAnalyticsResponse {
  totalSecondsInApp: number;
  daysActive: number;
  currentSessionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class StudentSessionService {
  private readonly baseUrl = `${environment.apiUrl}api/student/session`;
  private sessionId: string | null = null;

  constructor(private http: HttpClient) {
    this.sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  }

  /** Start a new session. Call when student layout loads. */
  startSession(): Observable<StudentSessionStartResponse | null> {
    return this.http.post<StudentSessionStartResponse>(`${this.baseUrl}/start`, {}).pipe(
      tap((res) => {
        if (res?.sessionId) {
          this.sessionId = res.sessionId;
          sessionStorage.setItem(SESSION_STORAGE_KEY, res.sessionId);
        }
      }),
      catchError(() => of(null))
    );
  }

  /** End the current session. Call on logout (and optionally beforeunload). */
  endSession(): Observable<void> {
    const id = this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) return of(undefined);
    return this.http.post<void>(`${this.baseUrl}/end`, { sessionId: id }).pipe(
      tap(() => {
        this.sessionId = null;
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }),
      catchError(() => of(undefined))
    );
  }

  /** End session during beforeunload using fetch keepalive (sends with auth). Clears stored id. */
  endSessionBeforeUnload(token: string | null): void {
    const id = this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id || !token) return;
    const url = `${this.baseUrl}/end`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify({ sessionId: id }),
        headers,
        keepalive: true,
      });
    } catch (_) {}
    this.sessionId = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /** Get time in app and days active for the current user. */
  getAnalytics(): Observable<StudentSessionAnalyticsResponse | null> {
    return this.http.get<StudentSessionAnalyticsResponse>(`${this.baseUrl}/analytics`).pipe(
      catchError(() => of(null))
    );
  }

  getCurrentSessionId(): string | null {
    return this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
  }
}
