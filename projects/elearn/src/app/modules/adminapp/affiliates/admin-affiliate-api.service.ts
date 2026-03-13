import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AdminAffiliateListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  affiliateCode: string;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  createdAt: string;
}

export interface AdminAffiliatePromotionLink {
  id: string;
  channelType: string;
  platform: string;
  url: string;
}

export interface AdminAffiliateCourseCommission {
  courseId: string;
  courseTitle: string;
  commissionPercent: number;
}

export interface AdminAffiliateDetail extends AdminAffiliateListItem {
  linkedInProfile: string;
  reason: string;
  commissionRate: number;
  referrals: AdminReferralItem[];
  profileCompleted: boolean;
  businessCategory: string;
  entityType: string;
  accountDisplayName: string;
  countryRegion: string;
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  stateProvince: string;
  zip: string;
  timezone: string;
  currency: string;
  promotionLinks: AdminAffiliatePromotionLink[];
  courseCommissions: AdminAffiliateCourseCommission[];
}

export interface UpdateAffiliateCommissionRequest {
  commissionRate?: number;
  courseCommissions?: { courseId: string; commissionPercent: number }[];
}

export interface AdminReferralItem {
  id: string;
  referredEmail: string;
  signupDate: string;
  purchaseAmount: number;
  commissionAmount: number;
  status: string;
}

export interface ApproveAffiliateResponse {
  success: boolean;
  affiliateCode?: string;
  referralLink?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAffiliateApiService {
  private readonly baseUrl = `${(environment.apiUrl || '').replace(/\/$/, '')}/api/admin/affiliate`;

  constructor(private http: HttpClient) {}

  getList(): Observable<AdminAffiliateListItem[]> {
    return this.http.get<any[]>(this.baseUrl).pipe(
      map((rows) => (rows || []).map((r) => this.normalizeListItem(r)))
    );
  }

  getDetails(id: string): Observable<AdminAffiliateDetail> {
    return this.http.get<any>(`${this.baseUrl}/${id}/details`).pipe(
      map((r) => this.normalizeDetail(r))
    );
  }

  private normalizeListItem(r: any): AdminAffiliateListItem {
    return {
      id: r?.id ?? r?.Id ?? '',
      name: r?.name ?? r?.Name ?? '',
      email: r?.email ?? r?.Email ?? '',
      phone: r?.phone ?? r?.Phone ?? '',
      status: r?.status ?? r?.Status ?? 'Pending',
      affiliateCode: r?.affiliateCode ?? r?.AffiliateCode ?? '',
      totalEarnings: Number(r?.totalEarnings ?? r?.TotalEarnings ?? 0),
      pendingEarnings: Number(r?.pendingEarnings ?? r?.PendingEarnings ?? 0),
      paidEarnings: Number(r?.paidEarnings ?? r?.PaidEarnings ?? 0),
      createdAt: r?.createdAt ?? r?.CreatedAt ?? '',
    };
  }

  private normalizeDetail(r: any): AdminAffiliateDetail {
    const item = this.normalizeListItem(r);
    const refs = (r?.referrals ?? r?.Referrals ?? []).map((ref: any) => ({
      id: ref?.id ?? ref?.Id ?? '',
      referredEmail: ref?.referredEmail ?? ref?.ReferredEmail ?? '',
      signupDate: ref?.signupDate ?? ref?.SignupDate ?? '',
      purchaseAmount: ref?.purchaseAmount ?? ref?.PurchaseAmount ?? null,
      commissionAmount: ref?.commissionAmount ?? ref?.CommissionAmount ?? null,
      status: ref?.status ?? ref?.Status ?? '',
    }));
    const links = (r?.promotionLinks ?? r?.PromotionLinks ?? []).map((l: any) => ({
      id: l?.id ?? l?.Id ?? '',
      channelType: l?.channelType ?? l?.ChannelType ?? '',
      platform: l?.platform ?? l?.Platform ?? '',
      url: l?.url ?? l?.Url ?? '',
    }));
    const courseCommissions = (r?.courseCommissions ?? r?.CourseCommissions ?? []).map((c: any) => ({
      courseId: c?.courseId ?? c?.CourseId ?? '',
      courseTitle: c?.courseTitle ?? c?.CourseTitle ?? '',
      commissionPercent: Number(c?.commissionPercent ?? c?.CommissionPercent ?? 0),
    }));
    return {
      ...item,
      linkedInProfile: r?.linkedInProfile ?? r?.LinkedInProfile ?? '',
      reason: r?.reason ?? r?.Reason ?? '',
      commissionRate: Number(r?.commissionRate ?? r?.CommissionRate ?? 0),
      referrals: refs,
      profileCompleted: Boolean(r?.profileCompleted ?? r?.ProfileCompleted),
      businessCategory: r?.businessCategory ?? r?.BusinessCategory ?? '',
      entityType: r?.entityType ?? r?.EntityType ?? '',
      accountDisplayName: r?.accountDisplayName ?? r?.AccountDisplayName ?? '',
      countryRegion: r?.countryRegion ?? r?.CountryRegion ?? '',
      streetAddress1: r?.streetAddress1 ?? r?.StreetAddress1 ?? '',
      streetAddress2: r?.streetAddress2 ?? r?.StreetAddress2 ?? '',
      city: r?.city ?? r?.City ?? '',
      stateProvince: r?.stateProvince ?? r?.StateProvince ?? '',
      zip: r?.zip ?? r?.Zip ?? '',
      timezone: r?.timezone ?? r?.Timezone ?? '',
      currency: r?.currency ?? r?.Currency ?? '',
      promotionLinks: links,
      courseCommissions,
    };
  }

  updateCommission(id: string, request: UpdateAffiliateCommissionRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }

  approve(id: string): Observable<ApproveAffiliateResponse> {
    return this.http.put<ApproveAffiliateResponse>(`${this.baseUrl}/${id}/approve`, {});
  }

  markPaid(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/mark-paid`, {});
  }
}
