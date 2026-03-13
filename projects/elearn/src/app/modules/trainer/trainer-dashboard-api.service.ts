import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface EnrollmentsByCourseItem {
  courseId: string;
  courseName: string;
  enrollmentCount: number;
}

export interface TrainerDashboardSummary {
  totalCoursesCreated: number;
  totalCoursesEdited: number;
  totalEnrollments: number;
  enrollmentsByCourse: EnrollmentsByCourseItem[];
  totalPurchases: number;
  totalRevenue: number;
  totalEarnings: number;
  totalPaidOut: number;
}

export interface TrainerDashboardChartPoint {
  label: string;
  value: number;
  date: string;
}

export interface TrainerDashboardPurchasesChart {
  data: TrainerDashboardChartPoint[];
}

export interface TrainerDashboardCourseActivityChart {
  created: TrainerDashboardChartPoint[];
  edited: TrainerDashboardChartPoint[];
}

export interface TrainerDashboardActivityRow {
  courseId: string;
  courseName: string;
  actionType: string;
  dateUtc: string;
  performedBy: string;
}

export interface TrainerDashboardActivityTable {
  results: TrainerDashboardActivityRow[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class TrainerDashboardApiService {
  private readonly baseUrl = `${environment.apiUrl}api/trainer/dashboard`;

  constructor(private http: HttpClient) {}

  getSummary(from: string, to: string): Observable<TrainerDashboardSummary> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/summary`, { params }).pipe(
      map((r) => {
        const rawList = r?.enrollmentsByCourse ?? r?.EnrollmentsByCourse ?? [];
        const enrollmentsByCourse: EnrollmentsByCourseItem[] = Array.isArray(rawList)
          ? rawList.map((x: any) => ({
              courseId: x?.courseId ?? x?.CourseId ?? '',
              courseName: x?.courseName ?? x?.CourseName ?? '',
              enrollmentCount: x?.enrollmentCount ?? x?.EnrollmentCount ?? 0,
            }))
          : [];
        return {
          totalCoursesCreated: r?.totalCoursesCreated ?? r?.TotalCoursesCreated ?? 0,
          totalCoursesEdited: r?.totalCoursesEdited ?? r?.TotalCoursesEdited ?? 0,
          totalEnrollments: r?.totalEnrollments ?? r?.TotalEnrollments ?? 0,
          enrollmentsByCourse,
          totalPurchases: r?.totalPurchases ?? r?.TotalPurchases ?? 0,
          totalRevenue: r?.totalRevenue ?? r?.TotalRevenue ?? 0,
          totalEarnings: r?.totalEarnings ?? r?.TotalEarnings ?? 0,
          totalPaidOut: r?.totalPaidOut ?? r?.TotalPaidOut ?? 0,
        };
      })
    );
  }

  getPurchasesChart(from: string, to: string): Observable<TrainerDashboardPurchasesChart> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/purchases-chart`, { params }).pipe(
      map((r) => ({
        data: r?.data ?? r?.Data ?? [],
      }))
    );
  }

  getCourseActivityChart(from: string, to: string): Observable<TrainerDashboardCourseActivityChart> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/course-activity-chart`, { params }).pipe(
      map((r) => ({
        created: r?.created ?? r?.Created ?? [],
        edited: r?.edited ?? r?.Edited ?? [],
      }))
    );
  }

  getActivityTable(
    from: string,
    to: string,
    page: number,
    pageSize: number,
    search: string
  ): Observable<TrainerDashboardActivityTable> {
    let params = new HttpParams().set('from', from).set('to', to).set('page', String(page)).set('pageSize', String(pageSize));
    if (search != null && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    return this.http.get<any>(`${this.baseUrl}/activity-table`, { params }).pipe(
      map((r) => {
        const raw = r?.results ?? r?.Results ?? [];
        const results: TrainerDashboardActivityRow[] = raw.map((row: any) => ({
          courseId: row?.courseId ?? row?.CourseId ?? '',
          courseName: row?.courseName ?? row?.CourseName ?? '',
          actionType: row?.actionType ?? row?.ActionType ?? '',
          dateUtc: row?.dateUtc ?? row?.DateUtc ?? '',
          performedBy: row?.performedBy ?? row?.PerformedBy ?? '',
        }));
        return {
          results,
          totalCount: r?.totalCount ?? r?.TotalCount ?? 0,
        };
      })
    );
  }
}
