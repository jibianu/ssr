import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ManagementTrainerService {
  private apiUrl = environment?.apiUrl || '';

  constructor(private http: HttpClient) {}

  mapTrainers(managementId: string, trainerIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}api/Management/trainers/map`, {
      managementUserId: managementId,
      trainerUserIds: trainerIds
    });
  }

  unmapTrainer(managementId: string, trainerId: string): Observable<any> {
    return this.http.request<any>('delete', `${this.apiUrl}api/Management/trainers/unmap`, {
      body: { managementUserId: managementId, trainerUserId: trainerId }
    });
  }

  getMappedTrainers(managementId: string, params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/Management/${managementId}/trainers`, { params: params || {} });
  }
}
