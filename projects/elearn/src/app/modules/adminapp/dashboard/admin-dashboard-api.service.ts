import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

const REQUEST_TIMEOUT_MS = 15000;

export interface AdminDashboardSummary {
  totalCompaniesRegistered: number;
  totalTrainers: number;
  totalStudents: number;
  totalPurchases: number;
  totalRevenue: number;
}

export interface AdminDashboardChartPoint {
  label: string;
  value: number;
  date?: string;
}

export interface AdminDashboardRevenuePoint {
  label: string;
  value: number;
  date?: string;
}

export interface AdminDashboardActivityRow {
  actionType: string;
  entityName: string;
  dateUtc: string;
  performedBy: string;
}

export interface AdminDashboardActivityTable {
  results: AdminDashboardActivityRow[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardApiService {
  private readonly baseUrl = `${environment.apiUrl}api/admin/dashboard`;

  constructor(private http: HttpClient) {}

  getSummary(from: string, to: string): Observable<AdminDashboardSummary> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/summary`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => ({
        totalCompaniesRegistered: r?.totalCompaniesRegistered ?? r?.TotalCompaniesRegistered ?? 0,
        totalTrainers: r?.totalTrainers ?? r?.TotalTrainers ?? 0,
        totalStudents: r?.totalStudents ?? r?.TotalStudents ?? 0,
        totalPurchases: r?.totalPurchases ?? r?.TotalPurchases ?? 0,
        totalRevenue: r?.totalRevenue ?? r?.TotalRevenue ?? 0,
      }))
    );
  }

  getPurchasesChart(from: string, to: string): Observable<{ data: AdminDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/purchases-chart`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => ({ data: r?.data ?? r?.Data ?? [] })),
      catchError(() => of({ data: [] }))
    );
  }

  getRegistrationsChart(from: string, to: string): Observable<{ data: AdminDashboardChartPoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/registrations-chart`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => ({ data: r?.data ?? r?.Data ?? [] })),
      catchError(() => of({ data: [] }))
    );
  }

  getRevenueChart(from: string, to: string): Observable<{ data: AdminDashboardRevenuePoint[] }> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/revenue-chart`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((r) => ({ data: r?.data ?? r?.Data ?? [] })),
      catchError(() => of({ data: [] }))
    );
  }

  getActivityTable(
    from: string,
    to: string,
    page: number,
    pageSize: number,
    search: string
  ): Observable<AdminDashboardActivityTable> {
    let params = new HttpParams().set('from', from).set('to', to).set('page', String(page)).set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<any>(`${this.baseUrl}/activity-table`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
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
      }),
      catchError(() => of({ results: [], totalCount: 0 }))
    );
  }
}
