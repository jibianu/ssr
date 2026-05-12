import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const SESSION_STORAGE_KEY = 'analyticsSessionId';
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const ACTIVE_THRESHOLD_MS = 60 * 1000;

export interface AnalyticsSessionStartResponse {
  sessionId: string;
  startedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly baseUrl = `${environment.apiUrl}api/analytics`;
  private sessionId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = 0;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    this.sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  }

  /** Start a new analytics session and begin activity/heartbeat tracking. */
  startSession(): Observable<AnalyticsSessionStartResponse | null> {
    return this.http.post<AnalyticsSessionStartResponse>(`${this.baseUrl}/session/start`, {}).pipe(
      tap((res) => {
        if (res?.sessionId) {
          this.sessionId = res.sessionId;
          sessionStorage.setItem(SESSION_STORAGE_KEY, res.sessionId);
          this.lastActivityAt = Date.now();
          // Avoid duplicate listeners when layout re-inits (student desktop/mobile/layout swap).
          this.stopActivityListeners();
          this.startActivityListeners();
          this.startHeartbeat();
        }
      }),
      catchError(() => of(null))
    );
  }

  /** End the analytics session and stop heartbeat. */
  endSession(): Observable<void> {
    this.stopHeartbeat();
    this.stopActivityListeners();
    const id = this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) return of(undefined);
    return this.http.post<void>(`${this.baseUrl}/session/end`, { sessionId: id }).pipe(
      tap(() => {
        this.sessionId = null;
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }),
      catchError(() => of(undefined))
    );
  }

  /** End session on beforeunload using fetch keepalive. */
  endSessionBeforeUnload(token: string | null): void {
    this.stopHeartbeat();
    const id = this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id || !token) return;
    const url = `${this.baseUrl}/session/end`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      fetch(url, { method: 'POST', body: JSON.stringify({ sessionId: id }), headers, keepalive: true });
    } catch (_) {}
    this.sessionId = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /** Record heartbeat (optional activeSeconds since last heartbeat). */
  sendHeartbeat(activeSeconds?: number): void {
    const id = this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) return;
    const body: { sessionId: string; activeSeconds?: number } = { sessionId: id };
    if (activeSeconds != null) body.activeSeconds = activeSeconds;
    this.ngZone.runOutsideAngular(() => {
      this.http.post(`${this.baseUrl}/heartbeat`, body).pipe(catchError(() => of(null))).subscribe();
    });
  }

  /** Record an event (CourseOpen, LessonOpen, VideoProgress, LessonCompleted, etc.). */
  recordEvent(eventType: string, entityType?: string, entityId?: string, payload?: string): void {
    const id = this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
    const body: { sessionId?: string; eventType: string; entityType?: string; entityId?: string; payload?: string } = { eventType };
    if (id) body.sessionId = id;
    if (entityType) body.entityType = entityType;
    if (entityId) body.entityId = entityId;
    if (payload) body.payload = payload;
    this.ngZone.runOutsideAngular(() => {
      this.http.post(`${this.baseUrl}/event`, body).pipe(catchError(() => of(null))).subscribe();
    });
  }

  getCurrentSessionId(): string | null {
    return this.sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
  }

  private startActivityListeners(): void {
    if (typeof document === 'undefined') return;
    const markActive = () => { this.lastActivityAt = Date.now(); };
    document.addEventListener('mousemove', markActive);
    document.addEventListener('keydown', markActive);
    document.addEventListener('scroll', markActive, true);
    (this as any)._analyticsListeners = { mousemove: markActive, keydown: markActive, scroll: markActive };
  }

  private stopActivityListeners(): void {
    const listeners = (this as any)._analyticsListeners as Record<string, () => void> | undefined;
    if (!listeners || typeof document === 'undefined') return;
    document.removeEventListener('mousemove', listeners.mousemove);
    document.removeEventListener('keydown', listeners.keydown);
    document.removeEventListener('scroll', listeners.scroll, true);
    (this as any)._analyticsListeners = null;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (typeof setInterval === 'undefined') {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      this.heartbeatTimer = setInterval(() => {
        const now = Date.now();
        const active = now - this.lastActivityAt < ACTIVE_THRESHOLD_MS;
        this.sendHeartbeat(active ? HEARTBEAT_INTERVAL_MS / 1000 : undefined);
      }, HEARTBEAT_INTERVAL_MS);
    });
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
