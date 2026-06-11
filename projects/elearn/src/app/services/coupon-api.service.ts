import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CouponDto {
  id: string;
  couponCode: string;
  couponName: string;
  couponType: string;
  discountValue: number;
  minimumPurchaseAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  status: boolean;
  applicableType: string;
  eventIds?: string[];
  courseIds?: string[];
  eventNames?: string[];
  courseNames?: string[];
}

export interface CouponListResponse {
  pageNumber: number;
  pageSize: number;
  totalNumberOfRecords: number;
  results: CouponDto[];
}

export interface CouponValidateRequest {
  couponCode: string;
  referenceId: string;
  referenceType: 'Event' | 'Course';
  amount: number;
}

export interface CouponValidateResponse {
  isValid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
  couponId?: string;
}

export interface CouponAnalyticsDto {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalDiscountGiven: number;
  mostUsedCoupon: string;
  mostUsedCouponCount: number;
  topEventCoupon: string;
  topCourseCoupon: string;
}

export interface CouponUsageDto {
  id: string;
  couponCode: string;
  userName: string;
  userEmail: string;
  orderId: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  usedDate: string;
}

export interface CouponSettingsResponse {
  allowCoupons: boolean;
  availableCoupons: { id: string; couponCode: string; couponName: string }[];
  applicableCouponIds: string[];
}

export interface CreateCouponRequest {
  couponName: string;
  couponCode: string;
  couponType: string;
  discountValue: number;
  minimumPurchaseAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  applicableType: string;
  status: boolean;
  eventIds?: string[];
  courseIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class CouponApiService {
  private readonly baseUrl = `${environment.apiUrl}api/coupons`;

  constructor(private http: HttpClient) {}

  getCoupons(params: Record<string, string | number | boolean>): Observable<CouponListResponse> {
    return this.http.get<CouponListResponse>(this.baseUrl, { params: params as any });
  }

  getCouponById(id: string): Observable<CouponDto> {
    return this.http.get<CouponDto>(`${this.baseUrl}/${id}`);
  }

  createCoupon(body: CreateCouponRequest): Observable<CouponDto> {
    return this.http.post<CouponDto>(this.baseUrl, body);
  }

  updateCoupon(id: string, body: CreateCouponRequest): Observable<CouponDto> {
    return this.http.put<CouponDto>(`${this.baseUrl}/${id}`, body);
  }

  deleteCoupon(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  setCouponStatus(id: string, active: boolean): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, null, { params: { active } });
  }

  getUsageHistory(couponId?: string, pageNumber = 1, pageSize = 50): Observable<CouponUsageDto[]> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (couponId) params.couponId = couponId;
    return this.http.get<CouponUsageDto[]>(`${this.baseUrl}/usage`, { params });
  }

  validateCoupon(body: CouponValidateRequest): Observable<CouponValidateResponse> {
    return this.http.post<CouponValidateResponse>(`${this.baseUrl}/validate`, body);
  }

  getAnalytics(): Observable<CouponAnalyticsDto> {
    return this.http.get<CouponAnalyticsDto>(`${this.baseUrl}/analytics`);
  }

  getEventCouponSettings(eventId: string): Observable<CouponSettingsResponse> {
    return this.http.get<CouponSettingsResponse>(`${this.baseUrl}/events/${eventId}/settings`);
  }

  updateEventCouponSettings(eventId: string, body: { allowCoupons: boolean; applicableCouponIds: string[] }): Observable<CouponSettingsResponse> {
    return this.http.put<CouponSettingsResponse>(`${this.baseUrl}/events/${eventId}/settings`, body);
  }

  getCourseCouponSettings(courseId: string): Observable<CouponSettingsResponse> {
    return this.http.get<CouponSettingsResponse>(`${this.baseUrl}/courses/${courseId}/settings`);
  }

  updateCourseCouponSettings(courseId: string, body: { allowCoupons: boolean; applicableCouponIds: string[] }): Observable<CouponSettingsResponse> {
    return this.http.put<CouponSettingsResponse>(`${this.baseUrl}/courses/${courseId}/settings`, body);
  }
}
