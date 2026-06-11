import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface StudentDashboardSummary {
  coursesPurchased: number;
  coursesInProgress: number;
  coursesCompleted: number;
  certificatesEarned: number;
  coursesPurchasedAllTime: number;
  coursesInProgressAllTime: number;
  coursesCompletedAllTime: number;
  certificatesEarnedAllTime: number;
}

export interface StudentDashboardChartPoint {
  label: string;
  value: number;
  date?: string;
}

export interface StudentDashboardCompletedVsPending {
  completed: number;
  pending: number;
}

export interface StudentDashboardActivityRow {
  activityType: string;
  courseName: string;
  dateUtc: string;
}

export interface StudentDashboardActivityTable {
  results: StudentDashboardActivityRow[];
  totalCount: number;
}

export interface StudentPurchaseHistoryItem {
  itemType?: 'Course' | 'Event';
  courseId: string;
  enrollmentId: string;
  courseTitle: string;
  eventId?: string;
  eventTitle?: string;
  purchaseDate: string;
  totalPrice: number | null;
  paymentTypeName: string;
  hasReceipt: boolean;
  hasInvoice: boolean;
  transactionNumber: string | null;
}

export interface StudentPurchaseHistoryResponse {
  items: StudentPurchaseHistoryItem[];
  totalCount: number;
}

export interface StudentNotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdOn: string;
  linkUrl: string | null;
  type: string | null;
}

export interface StudentNotificationsResponse {
  items: StudentNotificationItem[];
  unreadCount: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class StudentDashboardApiService {
  private readonly baseUrl = `${environment.apiUrl}api/student/dashboard`;
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Published events only (for student Events page). Uses GET api/events/published. */
  getPublishedEvents(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}api/events/published`).pipe(
      map((body: any) => {
        const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
        return Array.isArray(list) ? list : [];
      })
    );
  }

  getEventByCanonicalUrl(canonicalUrl: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/events/event/${encodeURIComponent(canonicalUrl)}`);
  }

  /** Get event by id. GET api/events/{id} */
  getEventById(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/events/${eventId}`);
  }

  /** Upcoming events for event detail page. GET api/events/upcoming/{eventId} */
  getUpcomingEvents(eventId: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}api/events/upcoming/${eventId}`).pipe(
      map((body: any) => {
        const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
        return Array.isArray(list) ? list : [];
      })
    );
  }

  /** My Events: events the current user has registered for. GET api/student/events */
  getMyEvents(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}api/student/events`).pipe(
      map((body: any) => {
        const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
        return Array.isArray(list) ? list : [];
      })
    );
  }

  /** Check if current user is registered for event. GET api/events/check-registration/{eventId} */
  checkEventRegistration(eventId: string): Observable<{ registered: boolean }> {
    return this.http.get<any>(`${this.apiUrl}api/events/check-registration/${eventId}`).pipe(
      map((r) => ({ registered: r?.registered === true }))
    );
  }

  /** Register for event (auth). Free: enrolls. Paid: returns needPayment. POST api/events/register */
  registerForEvent(eventId: string, body?: { name?: string; email?: string; mobile?: string; companyName?: string; designation?: string; department?: string }): Observable<{ enrolled?: boolean; needPayment?: boolean; message?: string }> {
    return this.http.post<any>(`${this.apiUrl}api/events/register`, { eventId, ...body });
  }

  /** GET api/events/registration-draft/{eventId} */
  getEventRegistrationDraft(eventId: string): Observable<{ hasDraft?: boolean; name?: string; email?: string; mobile?: string; companyName?: string; designation?: string; department?: string }> {
    return this.http.get<any>(`${this.apiUrl}api/events/registration-draft/${eventId}`);
  }

  /** Create Stripe checkout session for paid event (redirect flow). POST api/events/checkout-session */
  createEventCheckoutSession(eventId: string): Observable<{ paymentUrl: string }> {
    return this.http.post<any>(`${this.apiUrl}api/events/checkout-session`, { eventId });
  }

  /** Create PaymentIntent for embedded event checkout (Payment Element). POST api/events/create-payment-intent */
  createEventPaymentIntent(eventId: string, couponCode?: string): Observable<{ clientSecret: string; paymentIntentId: string }> {
    const body: { eventId: string; couponCode?: string } = { eventId };
    if (couponCode?.trim()) body.couponCode = couponCode.trim();
    return this.http.post<any>(`${this.apiUrl}api/events/create-payment-intent`, body);
  }

  /** Confirm event payment after Payment Element success. POST api/events/confirm-payment-intent */
  confirmEventPaymentIntent(paymentIntentId: string): Observable<{ registered?: boolean; message?: string }> {
    return this.http.post<any>(`${this.apiUrl}api/events/confirm-payment-intent`, { paymentIntentId });
  }

  /** Confirm event payment after Stripe redirect (session). POST api/events/confirm-payment */
  confirmEventPayment(sessionId: string): Observable<{ registered?: boolean; message?: string }> {
    return this.http.post<any>(`${this.apiUrl}api/events/confirm-payment`, { sessionId });
  }

  getSummary(from: string, to: string): Observable<StudentDashboardSummary> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/summary`, { params }).pipe(
      map((r) => ({
        coursesPurchased: r?.coursesPurchased ?? r?.CoursesPurchased ?? 0,
        coursesInProgress: r?.coursesInProgress ?? r?.CoursesInProgress ?? 0,
        coursesCompleted: r?.coursesCompleted ?? r?.CoursesCompleted ?? 0,
        certificatesEarned: r?.certificatesEarned ?? r?.CertificatesEarned ?? 0,
        coursesPurchasedAllTime: r?.coursesPurchasedAllTime ?? r?.CoursesPurchasedAllTime ?? 0,
        coursesInProgressAllTime: r?.coursesInProgressAllTime ?? r?.CoursesInProgressAllTime ?? 0,
        coursesCompletedAllTime: r?.coursesCompletedAllTime ?? r?.CoursesCompletedAllTime ?? 0,
        certificatesEarnedAllTime: r?.certificatesEarnedAllTime ?? r?.CertificatesEarnedAllTime ?? 0,
      }))
    );
  }

  getProgressChart(from: string, to: string): Observable<{ data: StudentDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/progress-chart`, { params }).pipe(
      map((r) => ({ data: r?.data ?? r?.Data ?? [] }))
    );
  }

  getCompletedVsPending(): Observable<StudentDashboardCompletedVsPending> {
    return this.http.get<any>(`${this.baseUrl}/completed-vs-pending`).pipe(
      map((r) => ({
        completed: r?.completed ?? r?.Completed ?? 0,
        pending: r?.pending ?? r?.Pending ?? 0,
      }))
    );
  }

  getActivityTable(
    from: string,
    to: string,
    page: number,
    pageSize: number,
    search: string
  ): Observable<StudentDashboardActivityTable> {
    let params = new HttpParams().set('from', from).set('to', to).set('page', String(page)).set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<any>(`${this.baseUrl}/activity-table`, { params }).pipe(
      map((r) => {
        const raw = r?.results ?? r?.Results ?? [];
        return {
          results: raw.map((row: any) => ({
            activityType: row?.activityType ?? row?.ActivityType ?? '',
            courseName: row?.courseName ?? row?.CourseName ?? '',
            dateUtc: row?.dateUtc ?? row?.DateUtc ?? '',
          })),
          totalCount: r?.totalCount ?? r?.TotalCount ?? 0,
        };
      })
    );
  }

  getPurchaseHistory(page = 1, pageSize = 10): Observable<StudentPurchaseHistoryResponse> {
    const params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get<any>(`${this.baseUrl}/purchase-history`, { params }).pipe(
      map((r) => {
        const raw = r?.items ?? r?.Items ?? [];
        return {
          items: raw.map((row: any) => ({
            itemType: row?.itemType ?? row?.ItemType ?? 'Course',
            courseId: row?.courseId ?? row?.CourseId ?? '',
            enrollmentId: row?.enrollmentId ?? row?.EnrollmentId ?? '',
            courseTitle: row?.courseTitle ?? row?.CourseTitle ?? '',
            eventId: row?.eventId ?? row?.EventId ?? undefined,
            eventTitle: row?.eventTitle ?? row?.EventTitle ?? undefined,
            purchaseDate: row?.purchaseDate ?? row?.PurchaseDate ?? '',
            totalPrice: row?.totalPrice ?? row?.TotalPrice ?? null,
            paymentTypeName: row?.paymentTypeName ?? row?.PaymentTypeName ?? '—',
            hasReceipt: row?.hasReceipt ?? row?.HasReceipt ?? false,
            hasInvoice: row?.hasInvoice ?? row?.HasInvoice ?? false,
            transactionNumber: row?.transactionNumber ?? row?.TransactionNumber ?? null,
          })),
          totalCount: r?.totalCount ?? r?.TotalCount ?? 0,
        };
      })
    );
  }

  getNotifications(page = 1, pageSize = 20): Observable<StudentNotificationsResponse> {
    const params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get<any>(`${this.baseUrl}/notifications`, { params }).pipe(
      map((r) => {
        const raw = r?.items ?? r?.Items ?? [];
        return {
          items: raw.map((row: any) => ({
            id: row?.id ?? row?.Id ?? '',
            title: row?.title ?? row?.Title ?? '',
            message: row?.message ?? row?.Message ?? '',
            isRead: row?.isRead ?? row?.IsRead ?? false,
            createdOn: row?.createdOn ?? row?.CreatedOn ?? '',
            linkUrl: row?.linkUrl ?? row?.LinkUrl ?? null,
            type: row?.type ?? row?.Type ?? null,
          })),
          unreadCount: r?.unreadCount ?? r?.UnreadCount ?? 0,
          totalCount: r?.totalCount ?? r?.TotalCount ?? 0,
        };
      })
    );
  }

  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/${notificationId}/mark-read`, {});
  }

  markAllNotificationsAsRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/mark-all-read`, {});
  }

  clearAllNotifications(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/clear-all`, {});
  }
}
