import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CompanyDashboardSummary {
  totalTrainers: number;
  totalStudents: number;
  totalCourses: number;
  totalPurchases: number;
  totalRevenue: number;
}

export interface CompanyDashboardChartPoint {
  label: string;
  value: number;
  date?: string;
}

export interface CompanyDashboardTrainersChart {
  activeTrainers: number;
  inactiveTrainers: number;
}

export interface CompanyDashboardActivityRow {
  courseName: string;
  actionType: string;
  dateUtc: string;
  performedBy: string;
}

export interface CompanyDashboardActivityTable {
  results: CompanyDashboardActivityRow[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyDashboardApiService {
  private readonly baseUrl = `${environment.apiUrl}api/company/dashboard`;

  constructor(private http: HttpClient) {}

  getSummary(from: string, to: string): Observable<CompanyDashboardSummary> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/summary`, { params }).pipe(
      map((r) => ({
        totalTrainers: r?.totalTrainers ?? r?.TotalTrainers ?? 0,
        totalStudents: r?.totalStudents ?? r?.TotalStudents ?? 0,
        totalCourses: r?.totalCourses ?? r?.TotalCourses ?? 0,
        totalPurchases: r?.totalPurchases ?? r?.TotalPurchases ?? 0,
        totalRevenue: r?.totalRevenue ?? r?.TotalRevenue ?? 0,
      }))
    );
  }

  getPurchasesChart(from: string, to: string): Observable<{ data: CompanyDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/purchases-chart`, { params }).pipe(
      map((r) => ({ data: r?.data ?? r?.Data ?? [] }))
    );
  }

  getTrainersChart(): Observable<CompanyDashboardTrainersChart> {
    return this.http.get<any>(`${this.baseUrl}/trainers-chart`).pipe(
      map((r) => ({
        activeTrainers: r?.activeTrainers ?? r?.ActiveTrainers ?? 0,
        inactiveTrainers: r?.inactiveTrainers ?? r?.InactiveTrainers ?? 0,
      }))
    );
  }

  getTopCoursesChart(from: string, to: string): Observable<{ data: CompanyDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/top-courses-chart`, { params }).pipe(
      map((r) => ({ data: r?.data ?? r?.Data ?? [] }))
    );
  }

  getActivityTable(
    from: string,
    to: string,
    page: number,
    pageSize: number,
    search: string
  ): Observable<CompanyDashboardActivityTable> {
    let params = new HttpParams().set('from', from).set('to', to).set('page', String(page)).set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<any>(`${this.baseUrl}/activity-table`, { params }).pipe(
      map((r) => {
        const raw = r?.results ?? r?.Results ?? [];
        return {
          results: raw.map((row: any) => ({
            courseName: row?.courseName ?? row?.CourseName ?? '',
            actionType: row?.actionType ?? row?.ActionType ?? '',
            dateUtc: row?.dateUtc ?? row?.DateUtc ?? '',
            performedBy: row?.performedBy ?? row?.PerformedBy ?? '',
          })),
          totalCount: r?.totalCount ?? r?.TotalCount ?? 0,
        };
      })
    );
  }
}
