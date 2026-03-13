import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

const REQUEST_TIMEOUT_MS = 20000;

export interface AdminAnalyticsStudentSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  sessionCount: number;
  totalSessionSeconds: number;
  totalActiveSeconds: number;
  activeDaysCount: number;
  lastSeenUtc: string | null;
  enrolledCourseCount: number;
}

export interface AdminAnalyticsSessionDto {
  sessionId: string;
  startedAtUtc: string;
  endedAtUtc: string | null;
  durationSeconds: number | null;
}

export interface AdminAnalyticsEventDto {
  eventId: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  payload: string | null;
  createdUtc: string;
}

export interface AdminAnalyticsEnrolledCourseDto {
  courseId: string;
  courseName: string | null;
  enrolledOn: string;
  progressPercent: number;
  lastAccessedCurriculumId: string | null;
  lastAccessedLessonTitle: string | null;
  isCompleted: boolean;
}

export interface AdminAnalyticsStudentDetail {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  sessionCount: number;
  totalSessionSeconds: number;
  totalActiveSeconds: number;
  activeDaysCount: number;
  lastSeenUtc: string | null;
  sessions: AdminAnalyticsSessionDto[];
  events: AdminAnalyticsEventDto[];
  enrolledCourses: AdminAnalyticsEnrolledCourseDto[];
}

export interface AdminAnalyticsCourseSummary {
  courseId: string;
  courseName: string;
  enrollmentCount: number;
  completionCount: number;
  eventCountInRange: number;
}

export interface DropOffReportItem {
  curriculumId: string;
  curriculumTitle: string;
  sortOrder: number;
  dropOffCount: number;
  dropOffPercent: number;
}

export interface DropOffReport {
  courseId: string;
  courseName: string;
  totalEnrolled: number;
  neverStartedCount: number;
  items: DropOffReportItem[];
}

export interface AdminAnalyticsStudentListResponse {
  results: AdminAnalyticsStudentSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminAnalyticsTimeSeriesPoint {
  date: string;
  label: string;
  value: number;
}

export interface AdminAnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  newUsers: number;
  dau: number;
  mau: number;
  conversionRateSignupToPurchase: number;
  courseEnrollments: number;
  courseCompletionRate: number;
  avgSessionDurationSeconds: number;
  failedPaymentsCount: number;
  refundRatePercent: number;
  dailyRevenueSeries: AdminAnalyticsTimeSeriesPoint[];
  dailyOrdersSeries: AdminAnalyticsTimeSeriesPoint[];
  dailyActiveUsersSeries: AdminAnalyticsTimeSeriesPoint[];
}

export interface AdminAnalyticsTopSellingCourse {
  courseId: string;
  courseName: string;
  revenue: number;
  orderCount: number;
}

export interface AdminAnalyticsTopDropOffLesson {
  courseId: string;
  courseName: string;
  curriculumId: string;
  lessonName: string;
  dropOffCount: number;
}

export interface AdminAnalyticsStudentFilterParams {
  from?: string;
  to?: string;
  registeredFrom?: string;
  registeredTo?: string;
  activityStatus?: string;
  totalTimeMinSeconds?: number;
  totalTimeMaxSeconds?: number;
  avgSessionDurationMinSeconds?: number;
  avgSessionDurationMaxSeconds?: number;
  sessionsCountMin?: number;
  sessionsCountMax?: number;
  purchaseStatus?: string;
  purchaseFrom?: string;
  purchaseTo?: string;
  repeatBuyer?: boolean;
  totalSpentMin?: number;
  totalSpentMax?: number;
  progressBucket?: string;
  courseIdFilter?: string;
  quizAttemptsMin?: number;
  quizAttemptsMax?: number;
  quizScoreMin?: number;
  quizScoreMax?: number;
  funnelStage?: string;
  funnelCourseId?: string;
  search?: string;
  sortBy?: string;
  sortDesc?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsApiService {
  private readonly baseUrl = `${environment.apiUrl}api/admin/analytics`;

  constructor(private http: HttpClient) {}

  getStudents(from: string, to: string): Observable<AdminAnalyticsStudentSummary[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/students`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (Array.isArray(r) ? r : (r?.results ?? [])).map(normalizeStudentSummary)),
      catchError(() => of([]))
    );
  }

  getStudentsFiltered(p: AdminAnalyticsStudentFilterParams): Observable<AdminAnalyticsStudentListResponse> {
    let params = new HttpParams();
    if (p.from != null) params = params.set('from', p.from);
    if (p.to != null) params = params.set('to', p.to);
    if (p.registeredFrom != null) params = params.set('registeredFrom', p.registeredFrom);
    if (p.registeredTo != null) params = params.set('registeredTo', p.registeredTo);
    if (p.activityStatus != null) params = params.set('activityStatus', p.activityStatus);
    if (p.totalTimeMinSeconds != null) params = params.set('totalTimeMinSeconds', String(p.totalTimeMinSeconds));
    if (p.totalTimeMaxSeconds != null) params = params.set('totalTimeMaxSeconds', String(p.totalTimeMaxSeconds));
    if (p.avgSessionDurationMinSeconds != null) params = params.set('avgSessionDurationMinSeconds', String(p.avgSessionDurationMinSeconds));
    if (p.avgSessionDurationMaxSeconds != null) params = params.set('avgSessionDurationMaxSeconds', String(p.avgSessionDurationMaxSeconds));
    if (p.sessionsCountMin != null) params = params.set('sessionsCountMin', String(p.sessionsCountMin));
    if (p.sessionsCountMax != null) params = params.set('sessionsCountMax', String(p.sessionsCountMax));
    if (p.purchaseStatus != null) params = params.set('purchaseStatus', p.purchaseStatus);
    if (p.purchaseFrom != null) params = params.set('purchaseFrom', p.purchaseFrom);
    if (p.purchaseTo != null) params = params.set('purchaseTo', p.purchaseTo);
    if (p.repeatBuyer != null) params = params.set('repeatBuyer', String(p.repeatBuyer));
    if (p.totalSpentMin != null) params = params.set('totalSpentMin', String(p.totalSpentMin));
    if (p.totalSpentMax != null) params = params.set('totalSpentMax', String(p.totalSpentMax));
    if (p.progressBucket != null) params = params.set('progressBucket', p.progressBucket);
    if (p.courseIdFilter != null) params = params.set('courseIdFilter', p.courseIdFilter);
    if (p.quizAttemptsMin != null) params = params.set('quizAttemptsMin', String(p.quizAttemptsMin));
    if (p.quizAttemptsMax != null) params = params.set('quizAttemptsMax', String(p.quizAttemptsMax));
    if (p.quizScoreMin != null) params = params.set('quizScoreMin', String(p.quizScoreMin));
    if (p.quizScoreMax != null) params = params.set('quizScoreMax', String(p.quizScoreMax));
    if (p.funnelStage != null) params = params.set('funnelStage', p.funnelStage);
    if (p.funnelCourseId != null) params = params.set('funnelCourseId', p.funnelCourseId);
    if (p.search != null && p.search.trim() !== '') params = params.set('search', p.search.trim());
    if (p.sortBy != null) params = params.set('sortBy', p.sortBy);
    if (p.sortDesc != null) params = params.set('sortDesc', String(p.sortDesc));
    if (p.page != null) params = params.set('page', String(p.page));
    if (p.pageSize != null) params = params.set('pageSize', String(p.pageSize));
    return this.http.get<any>(`${this.baseUrl}/students`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => {
        if (Array.isArray(r)) {
          return { results: r.map(normalizeStudentSummary), totalCount: r.length, page: 1, pageSize: r.length };
        }
        const results = (r?.results ?? r?.Results ?? []).map(normalizeStudentSummary);
        return {
          results,
          totalCount: r?.totalCount ?? r?.TotalCount ?? results.length,
          page: r?.page ?? r?.Page ?? 1,
          pageSize: r?.pageSize ?? r?.PageSize ?? results.length,
        };
      }),
      catchError(() => of({ results: [], totalCount: 0, page: 1, pageSize: 20 }))
    );
  }

  getStudentById(id: string, from: string, to: string): Observable<AdminAnalyticsStudentDetail | null> {
    let params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/student/${id}`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (r ? normalizeStudentDetail(r) : null)),
      catchError(() => of(null))
    );
  }

  getCourses(from: string, to: string): Observable<AdminAnalyticsCourseSummary[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any[]>(`${this.baseUrl}/courses`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (Array.isArray(r) ? r : []).map(normalizeCourseSummary)),
      catchError(() => of([]))
    );
  }

  getDropOffReport(courseId: string, from?: string, to?: string): Observable<DropOffReport | null> {
    let params = new HttpParams();
    if (from != null) params = params.set('from', from);
    if (to != null) params = params.set('to', to);
    return this.http.get<any>(`${this.baseUrl}/courses/${courseId}/drop-off`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (r ? normalizeDropOffReport(r) : null)),
      catchError(() => of(null))
    );
  }

  getOverview(from: string, to: string, courseId?: string): Observable<AdminAnalyticsOverview | null> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (courseId != null && courseId !== '') params = params.set('courseId', courseId);
    return this.http.get<any>(`${this.baseUrl}/overview`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (r ? normalizeOverview(r) : null)),
      catchError(() => of(null))
    );
  }

  getTopSellingCourses(from: string, to: string, take = 10, courseId?: string): Observable<AdminAnalyticsTopSellingCourse[]> {
    let params = new HttpParams().set('from', from).set('to', to).set('take', String(take));
    if (courseId != null && courseId !== '') params = params.set('courseId', courseId);
    return this.http.get<any[]>(`${this.baseUrl}/top-selling-courses`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (Array.isArray(r) ? r : []).map(normalizeTopSellingCourse)),
      catchError(() => of([]))
    );
  }

  getTopDropOffLessons(from: string, to: string, take = 10, courseId?: string): Observable<AdminAnalyticsTopDropOffLesson[]> {
    let params = new HttpParams().set('from', from).set('to', to).set('take', String(take));
    if (courseId != null && courseId !== '') params = params.set('courseId', courseId);
    return this.http.get<any[]>(`${this.baseUrl}/top-dropoff-lessons`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => (Array.isArray(r) ? r : []).map(normalizeTopDropOffLesson)),
      catchError(() => of([]))
    );
  }
}

function normalizeTimeSeriesPoint(r: any): AdminAnalyticsTimeSeriesPoint {
  return {
    date: r?.date ?? r?.Date ?? '',
    label: r?.label ?? r?.Label ?? '',
    value: Number(r?.value ?? r?.Value ?? 0),
  };
}

function normalizeOverview(r: any): AdminAnalyticsOverview {
  return {
    totalRevenue: Number(r?.totalRevenue ?? r?.TotalRevenue ?? 0),
    totalOrders: Number(r?.totalOrders ?? r?.TotalOrders ?? 0),
    newUsers: Number(r?.newUsers ?? r?.NewUsers ?? 0),
    dau: Number(r?.dau ?? r?.Dau ?? 0),
    mau: Number(r?.mau ?? r?.Mau ?? 0),
    conversionRateSignupToPurchase: Number(r?.conversionRateSignupToPurchase ?? r?.ConversionRateSignupToPurchase ?? 0),
    courseEnrollments: Number(r?.courseEnrollments ?? r?.CourseEnrollments ?? 0),
    courseCompletionRate: Number(r?.courseCompletionRate ?? r?.CourseCompletionRate ?? 0),
    avgSessionDurationSeconds: Number(r?.avgSessionDurationSeconds ?? r?.AvgSessionDurationSeconds ?? 0),
    failedPaymentsCount: Number(r?.failedPaymentsCount ?? r?.FailedPaymentsCount ?? 0),
    refundRatePercent: Number(r?.refundRatePercent ?? r?.RefundRatePercent ?? 0),
    dailyRevenueSeries: (r?.dailyRevenueSeries ?? r?.DailyRevenueSeries ?? []).map(normalizeTimeSeriesPoint),
    dailyOrdersSeries: (r?.dailyOrdersSeries ?? r?.DailyOrdersSeries ?? []).map(normalizeTimeSeriesPoint),
    dailyActiveUsersSeries: (r?.dailyActiveUsersSeries ?? r?.DailyActiveUsersSeries ?? []).map(normalizeTimeSeriesPoint),
  };
}

function normalizeTopSellingCourse(r: any): AdminAnalyticsTopSellingCourse {
  return {
    courseId: r?.courseId ?? r?.CourseId ?? '',
    courseName: r?.courseName ?? r?.CourseName ?? '',
    revenue: Number(r?.revenue ?? r?.Revenue ?? 0),
    orderCount: Number(r?.orderCount ?? r?.OrderCount ?? 0),
  };
}

function normalizeTopDropOffLesson(r: any): AdminAnalyticsTopDropOffLesson {
  return {
    courseId: r?.courseId ?? r?.CourseId ?? '',
    courseName: r?.courseName ?? r?.CourseName ?? '',
    curriculumId: r?.curriculumId ?? r?.CurriculumId ?? '',
    lessonName: r?.lessonName ?? r?.LessonName ?? '',
    dropOffCount: Number(r?.dropOffCount ?? r?.DropOffCount ?? 0),
  };
}

function normalizeStudentSummary(r: any): AdminAnalyticsStudentSummary {
  return {
    userId: r?.userId ?? r?.UserId ?? '',
    firstName: r?.firstName ?? r?.FirstName ?? '',
    lastName: r?.lastName ?? r?.LastName ?? '',
    email: r?.email ?? r?.Email ?? '',
    sessionCount: r?.sessionCount ?? r?.SessionCount ?? 0,
    totalSessionSeconds: r?.totalSessionSeconds ?? r?.TotalSessionSeconds ?? 0,
    totalActiveSeconds: r?.totalActiveSeconds ?? r?.TotalActiveSeconds ?? 0,
    activeDaysCount: r?.activeDaysCount ?? r?.ActiveDaysCount ?? 0,
    lastSeenUtc: r?.lastSeenUtc ?? r?.LastSeenUtc ?? null,
    enrolledCourseCount: r?.enrolledCourseCount ?? r?.EnrolledCourseCount ?? 0,
  };
}

function normalizeStudentDetail(r: any): AdminAnalyticsStudentDetail {
  return {
    userId: r?.userId ?? r?.UserId ?? '',
    firstName: r?.firstName ?? r?.FirstName ?? '',
    lastName: r?.lastName ?? r?.LastName ?? '',
    email: r?.email ?? r?.Email ?? '',
    sessionCount: r?.sessionCount ?? r?.SessionCount ?? 0,
    totalSessionSeconds: r?.totalSessionSeconds ?? r?.TotalSessionSeconds ?? 0,
    totalActiveSeconds: r?.totalActiveSeconds ?? r?.TotalActiveSeconds ?? 0,
    activeDaysCount: r?.activeDaysCount ?? r?.ActiveDaysCount ?? 0,
    lastSeenUtc: r?.lastSeenUtc ?? r?.LastSeenUtc ?? null,
    sessions: (r?.sessions ?? r?.Sessions ?? []).map((s: any) => ({
      sessionId: s?.sessionId ?? s?.SessionId ?? '',
      startedAtUtc: s?.startedAtUtc ?? s?.StartedAtUtc ?? '',
      endedAtUtc: s?.endedAtUtc ?? s?.EndedAtUtc ?? null,
      durationSeconds: s?.durationSeconds ?? s?.DurationSeconds ?? null,
    })),
    events: (r?.events ?? r?.Events ?? []).map((e: any) => ({
      eventId: e?.eventId ?? e?.EventId ?? '',
      eventType: e?.eventType ?? e?.EventType ?? '',
      entityType: e?.entityType ?? e?.EntityType ?? '',
      entityId: e?.entityId ?? e?.EntityId ?? null,
      payload: e?.payload ?? e?.Payload ?? null,
      createdUtc: e?.createdUtc ?? e?.CreatedUtc ?? '',
    })),
    enrolledCourses: (r?.enrolledCourses ?? r?.EnrolledCourses ?? []).map((c: any) => ({
      courseId: c?.courseId ?? c?.CourseId ?? '',
      courseName: c?.courseName ?? c?.CourseName ?? null,
      enrolledOn: c?.enrolledOn ?? c?.EnrolledOn ?? '',
      progressPercent: c?.progressPercent ?? c?.ProgressPercent ?? 0,
      lastAccessedCurriculumId: c?.lastAccessedCurriculumId ?? c?.LastAccessedCurriculumId ?? null,
      lastAccessedLessonTitle: c?.lastAccessedLessonTitle ?? c?.LastAccessedLessonTitle ?? null,
      isCompleted: c?.isCompleted ?? c?.IsCompleted ?? false,
    })),
  };
}

function normalizeCourseSummary(r: any): AdminAnalyticsCourseSummary {
  return {
    courseId: r?.courseId ?? r?.CourseId ?? '',
    courseName: r?.courseName ?? r?.CourseName ?? '',
    enrollmentCount: r?.enrollmentCount ?? r?.EnrollmentCount ?? 0,
    completionCount: r?.completionCount ?? r?.CompletionCount ?? 0,
    eventCountInRange: r?.eventCountInRange ?? r?.EventCountInRange ?? 0,
  };
}

function normalizeDropOffReportItem(r: any): DropOffReportItem {
  return {
    curriculumId: r?.curriculumId ?? r?.CurriculumId ?? '',
    curriculumTitle: r?.curriculumTitle ?? r?.CurriculumTitle ?? '',
    sortOrder: r?.sortOrder ?? r?.SortOrder ?? 0,
    dropOffCount: r?.dropOffCount ?? r?.DropOffCount ?? 0,
    dropOffPercent: r?.dropOffPercent ?? r?.DropOffPercent ?? 0,
  };
}

function normalizeDropOffReport(r: any): DropOffReport {
  const items = (r?.items ?? r?.Items ?? []).map(normalizeDropOffReportItem);
  return {
    courseId: r?.courseId ?? r?.CourseId ?? '',
    courseName: r?.courseName ?? r?.CourseName ?? '',
    totalEnrolled: r?.totalEnrolled ?? r?.TotalEnrolled ?? 0,
    neverStartedCount: r?.neverStartedCount ?? r?.NeverStartedCount ?? 0,
    items,
  };
}
