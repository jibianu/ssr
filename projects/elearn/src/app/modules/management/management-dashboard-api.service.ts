import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ManagementDashboardSummary {
  totalTrainers: number;
  totalStudents: number;
  totalCourses: number;
  totalPurchases: number;
  totalRevenue: number;
}

export interface ManagementDashboardChartPoint {
  label: string;
  value: number;
  date?: string;
}

export interface ManagementDashboardActivityRow {
  actionType: string;
  entityName: string;
  dateUtc: string;
  performedBy: string;
}

export interface ManagementDashboardActivityTable {
  results: ManagementDashboardActivityRow[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class ManagementDashboardApiService {
  private readonly baseUrl = `${environment.apiUrl}api/management/dashboard`;

  constructor(private http: HttpClient) {}

  getSummary(from: string, to: string): Observable<ManagementDashboardSummary> {
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

  getPurchasesChart(from: string, to: string): Observable<{ data: ManagementDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/purchases-chart`, { params }).pipe(
      map((r) => ({ data: r?.data ?? r?.Data ?? [] }))
    );
  }

  getRegistrationsChart(from: string, to: string): Observable<{ data: ManagementDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/registrations-chart`, { params }).pipe(
      map((r) => ({ data: r?.data ?? r?.Data ?? [] }))
    );
  }

  getActiveTrainersChart(from: string, to: string): Observable<{ data: ManagementDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/active-trainers-chart`, { params }).pipe(
      map((r) => ({ data: r?.data ?? r?.Data ?? [] }))
    );
  }

  getActivityTable(
    from: string,
    to: string,
    page: number,
    pageSize: number,
    search: string
  ): Observable<ManagementDashboardActivityTable> {
    let params = new HttpParams().set('from', from).set('to', to).set('page', String(page)).set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<any>(`${this.baseUrl}/activity-table`, { params }).pipe(
      map((r) => {
        const raw = r?.results ?? r?.Results ?? [];
        return {
          results: raw.map((row: any) => ({
            actionType: row?.actionType ?? row?.ActionType ?? '',
            entityName: row?.entityName ?? row?.EntityName ?? '',
            dateUtc: row?.dateUtc ?? row?.DateUtc ?? '',
            performedBy: row?.performedBy ?? row?.PerformedBy ?? '',
          })),
          totalCount: r?.totalCount ?? r?.TotalCount ?? 0,
        };
      })
    );
  }
}
