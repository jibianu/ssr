import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MembershipPlanApi {
  planCode: string;
  planName: string;
  sixMonthPrice: number;
  yearlyDiscountPercent: number;
  yearlyPrice: number;
  yearlyOriginalPrice: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateMembershipPlanRequest {
  planName: string;
  sixMonthPrice: number;
  yearlyDiscountPercent: number;
  isActive: boolean;
  displayOrder: number;
}

export interface MembershipStatusApi {
  isActiveMember: boolean;
  planName?: string;
  planCode?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  couponCode?: string;
  couponStatus?: string;
}

export interface MembershipCheckoutOrderApi {
  paymentIntentId?: string;
  clientSecret?: string;
  finalAmountPaise?: number;
  planName?: string;
  alreadyActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MembershipApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPlans(): Observable<MembershipPlanApi[]> {
    return this.http.get<MembershipPlanApi[]>(`${this.apiUrl}api/membership/plans`);
  }

  getStatus(): Observable<MembershipStatusApi> {
    return this.http.get<any>(`${this.apiUrl}api/membership/status`).pipe(
      map((r) => ({
        isActiveMember: !!(r?.isActiveMember ?? r?.IsActiveMember),
        planName: r?.planName ?? r?.PlanName ?? undefined,
        planCode: r?.planCode ?? r?.PlanCode ?? undefined,
        status: r?.status ?? r?.Status ?? undefined,
        startDate: r?.startDate ?? r?.StartDate ?? undefined,
        endDate: r?.endDate ?? r?.EndDate ?? undefined,
        couponCode: r?.couponCode ?? r?.CouponCode ?? undefined,
        couponStatus: r?.couponStatus ?? r?.CouponStatus ?? undefined,
      }))
    );
  }

  createStripeOrder(planCode: string, billingCycle: string): Observable<MembershipCheckoutOrderApi> {
    return this.http.post<MembershipCheckoutOrderApi>(`${this.apiUrl}api/membership/checkout/create-order`, {
      planCode,
      billingCycle
    });
  }

  saveCheckoutDetails(body: {
    name: string;
    email: string;
    mobile: string;
    companyName: string;
    designation: string;
    department: string;
  }): Observable<{ saved?: boolean }> {
    return this.http.post<{ saved?: boolean }>(`${this.apiUrl}api/membership/checkout/save-details`, body);
  }

  confirmStripePayment(paymentIntentId: string): Observable<{ activated: boolean; membership: MembershipStatusApi }> {
    return this.http.post<{ activated: boolean; membership: MembershipStatusApi }>(
      `${this.apiUrl}api/membership/checkout/confirm-payment-intent`,
      { paymentIntentId }
    );
  }

  getAdminSubscriptions(
    pageNumber: number,
    pageSize: number,
    search: string,
    planCode: string,
    subscriptionStatus: string,
    gateway: string
  ): Observable<any> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (search?.trim()) params['search'] = search.trim();
    if (planCode?.trim()) params['planCode'] = planCode.trim();
    if (subscriptionStatus?.trim()) params['subscriptionStatus'] = subscriptionStatus.trim();
    if (gateway?.trim()) params['gateway'] = gateway.trim();
    return this.http.get<any>(`${this.apiUrl}api/admin/membership-subscriptions`, { params });
  }

  getAdminSubscriptionDetail(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/admin/membership-subscriptions/${id}`);
  }

  getAdminPlans(): Observable<MembershipPlanApi[]> {
    return this.http.get<MembershipPlanApi[]>(`${this.apiUrl}api/admin/membership-plans`);
  }

  updateAdminPlan(planCode: string, body: UpdateMembershipPlanRequest): Observable<MembershipPlanApi> {
    return this.http.put<MembershipPlanApi>(`${this.apiUrl}api/admin/membership-plans/${encodeURIComponent(planCode)}`, body);
  }
}
