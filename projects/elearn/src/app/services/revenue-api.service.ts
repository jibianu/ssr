import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RevenueByChannelItem {
  saleChannelType: string;
  orderCount: number;
  totalAmount: number;
  instructorTotal: number;
  platformTotal: number;
  affiliateTotal?: number;
}

export interface RevenueByCampaignItem {
  campaignId?: string;
  campaignName?: string;
  trackingCode?: string;
  orderCount: number;
  totalAmount: number;
  instructorTotal: number;
  platformTotal: number;
}

export interface RevenueByAffiliateItem {
  affiliateId?: string;
  affiliateName?: string;
  affiliateEmail?: string;
  trackingCode?: string;
  orderCount: number;
  totalAmount: number;
  commissionTotal: number;
  instructorTotal: number;
  platformTotal: number;
}

export interface AffiliatePayoutItem {
  id: string;
  affiliateId: string;
  affiliateName?: string;
  orderId: string;
  transactionNumber?: string;
  amount: number;
  status: string;
  createdOn: string;
  paidOn?: string;
}

export interface RevenueByInstructorItem {
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  orderCount: number;
  totalAmount: number;
  instructorEarnings: number;
}

export interface InstructorEarningsSummary {
  totalEarnings: number;
  totalOrders: number;
  byInstructorPromotion: number;
  byOrganic: number;
  byPaidAcquisition: number;
  byMarketingCampaign?: number;
  byAffiliate?: number;
}

export interface InstructorCouponDto {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  courseId?: string;
  validFrom: string;
  validTo: string;
  createdOn: string;
}

export interface CreateInstructorCouponRequest {
  code: string;
  discountType: string;
  discountValue: number;
  courseId?: string;
  validFrom: string;
  validTo: string;
}

@Injectable({ providedIn: 'root' })
export class RevenueApiService {
  private readonly baseUrl = `${environment.apiUrl}api`;

  constructor(private http: HttpClient) {}

  getRevenueByChannel(from?: string, to?: string): Observable<RevenueByChannelItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<RevenueByChannelItem[]>(`${this.baseUrl}/admin/revenue/by-channel`, { params });
  }

  getRevenueByInstructor(from?: string, to?: string): Observable<RevenueByInstructorItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<RevenueByInstructorItem[]>(`${this.baseUrl}/admin/revenue/by-instructor`, { params });
  }

  getRevenueByCampaign(from?: string, to?: string): Observable<RevenueByCampaignItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<RevenueByCampaignItem[]>(`${this.baseUrl}/admin/revenue/by-campaign`, { params });
  }

  getRevenueByAffiliate(from?: string, to?: string): Observable<RevenueByAffiliateItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<RevenueByAffiliateItem[]>(`${this.baseUrl}/admin/revenue/by-affiliate`, { params });
  }

  getAffiliatePayouts(status?: string): Observable<AffiliatePayoutItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<AffiliatePayoutItem[]>(`${this.baseUrl}/admin/affiliates/payouts`, { params });
  }

  getInstructorEarningsSummary(from?: string, to?: string): Observable<InstructorEarningsSummary> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<InstructorEarningsSummary>(`${this.baseUrl}/instructor/earnings/summary`, { params });
  }

  getInstructorCoupons(): Observable<InstructorCouponDto[]> {
    return this.http.get<InstructorCouponDto[]>(`${this.baseUrl}/instructor/coupons`);
  }

  createInstructorCoupon(body: CreateInstructorCouponRequest): Observable<InstructorCouponDto> {
    return this.http.post<InstructorCouponDto>(`${this.baseUrl}/instructor/coupons/create`, body);
  }
}
