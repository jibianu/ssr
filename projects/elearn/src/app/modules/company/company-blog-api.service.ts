import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class CompanyBlogApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listBlogs(pageNumber: number = 1, pageSize: number = 100, search?: string): Observable<{
    pageNumber: number;
    pageSize: number;
    totalNumberOfRecords: number;
    results: any[];
  }> {
    const params: Record<string, string> = { pageNumber: String(pageNumber), pageSize: String(pageSize) };
    if (search != null && search.trim() !== '') params['search'] = search.trim();
    return this.http.get<any>(`${this.apiUrl}api/company/blog`, { params });
  }

  publishBlog(id: string, approvalNote?: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}api/company/blog/${encodeURIComponent(id)}/publish`, {
      approvalNote: approvalNote ?? ''
    });
  }

  rejectBlog(id: string, rejectionReason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}api/company/blog/${encodeURIComponent(id)}/reject`, {
      rejectionReason: rejectionReason || ''
    });
  }
}
