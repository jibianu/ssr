import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export const PAYOUT_METHOD = {
  BankTransfer: 1,
  PayPal: 2,
  Payoneer: 3,
  UPI: 4,
} as const;

export const PAYOUT_STATUS = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const;

export interface TrainerPayoutMethodDto {
  id: string;
  trainerId: string;
  methodType: number;
  methodTypeName: string;
  accountName?: string;
  maskedAccountNumber?: string;
  maskedUpiId?: string;
  ifsc?: string;
  bankName?: string;
  maskedPAN?: string;
  gst?: string;
  email?: string;
  status: number;
  statusName: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface UpsertTrainerPayoutRequest {
  methodType: number;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  pan?: string;
  gst?: string;
  upiId?: string;
  email?: string;
}

export interface AdminPayoutListItemDto {
  id: string;
  trainerId: string;
  trainerName?: string;
  trainerEmail?: string;
  methodType: number;
  methodTypeName: string;
  maskedAccountNumber?: string;
  bankName?: string;
  maskedPAN?: string;
  status: number;
  statusName: string;
  createdAt: string;
  approvedAt?: string;
}

export interface AdminPayoutStatsDto {
  totalConnected: number;
  pendingApprovals: number;
  approved: number;
  rejected: number;
}

@Injectable({ providedIn: 'root' })
export class PayoutApiService {
  private readonly baseUrl = `${environment.apiUrl}api`;

  constructor(private http: HttpClient) {}

  // Trainer APIs
  getTrainerPayouts(): Observable<TrainerPayoutMethodDto[]> {
    return this.http.get<TrainerPayoutMethodDto[]>(`${this.baseUrl}/trainer/payout`);
  }

  postTrainerPayout(body: UpsertTrainerPayoutRequest): Observable<TrainerPayoutMethodDto> {
    return this.http.post<TrainerPayoutMethodDto>(`${this.baseUrl}/trainer/payout`, body);
  }

  putTrainerPayout(body: UpsertTrainerPayoutRequest): Observable<TrainerPayoutMethodDto> {
    return this.http.put<TrainerPayoutMethodDto>(`${this.baseUrl}/trainer/payout/update`, body);
  }

  deleteTrainerPayout(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/trainer/payout?id=${encodeURIComponent(id)}`);
  }

  // Admin APIs
  getAdminPayouts(): Observable<AdminPayoutListItemDto[]> {
    return this.http.get<AdminPayoutListItemDto[]>(`${this.baseUrl}/admin/payouts`);
  }

  getAdminPayoutStats(): Observable<AdminPayoutStatsDto> {
    return this.http.get<AdminPayoutStatsDto>(`${this.baseUrl}/admin/payouts/stats`);
  }

  getRecentPayouts(count = 20): Observable<PayoutReportItemDto[]> {
    return this.http.get<PayoutReportItemDto[]>(`${this.baseUrl}/admin/payouts/recent?count=${count}`);
  }

  approvePayout(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/payouts/approve?id=${encodeURIComponent(id)}`, {});
  }

  rejectPayout(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/payouts/reject?id=${encodeURIComponent(id)}`, {});
  }

  processPayout(
    payoutMethodId: string,
    amount: number,
    currency: string,
    notes?: string,
    tdsPercent?: number
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/admin/payouts/process`, {
      payoutMethodId,
      amount,
      currency: currency || 'INR',
      notes: notes || '',
      tdsPercent: tdsPercent ?? null,
    });
  }

  getPayoutReport(from: string, to: string): Observable<PayoutReportItemDto[]> {
    return this.http.get<PayoutReportItemDto[]>(
      `${this.baseUrl}/admin/payouts/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
  }

  getPayoutReportCsv(from: string, to: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/admin/payouts/report/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { responseType: 'blob' }
    );
  }
}

export interface PayoutReportItemDto {
  transactionId: string;
  payoutMethodId: string;
  trainerName: string;
  trainerEmail: string;
  methodType: number;
  methodTypeName: string;
  maskedAccount: string;
  grossAmount: number;
  tdsPercent?: number;
  tdsAmount?: number;
  netAmount?: number;
  currency: string;
  processedAt: string;
  notes?: string;
}
