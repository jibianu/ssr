import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AffiliateRegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  linkedInProfile?: string;
  reason?: string;
}

export interface AffiliateRegisterResponse {
  success: boolean;
  message: string;
  affiliateId?: string;
}

export interface AffiliateCourseStat {
  courseId: string | null;
  courseTitle: string;
  signups: number;
  purchases: number;
  pendingEarnings: number;
}

export interface AffiliateGenerateLinkResponse {
  courseTitle: string;
  courseSlug: string;
  affiliateCode: string;
  affiliateLink: string;
}

export interface AffiliateDashboardResponse {
  totalClicks: number;
  totalSignups: number;
  totalPurchases: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  referralLink: string | null;
  /** Default commission rate (%). From API; admin can update it. */
  commissionRate?: number;
  status: string;
  affiliateCode?: string;
  phone?: string;
  linkedInProfile?: string;
  reason?: string;
  profileCompleted?: boolean;
  perCourseStats?: AffiliateCourseStat[];
}

export interface AffiliatePromotionLinkDto {
  id: string;
  channelType: string;
  platform?: string;
  url?: string;
}

export interface AffiliateProfileResponse {
  profileCompleted: boolean;
  businessCategory?: string;
  entityType?: string;
  accountDisplayName?: string;
  countryRegion?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  stateProvince?: string;
  zip?: string;
  timezone?: string;
  currency?: string;
  currencyLocked: boolean;
  agreementAcceptedAt?: string;
  promotionLinks: AffiliatePromotionLinkDto[];
}

export interface AffiliateSupportSettings {
  supportPhone: string;
  supportEmail: string;
  whatsAppUrl: string;
}

export interface AffiliateSnapshotResponse {
  clicks: number;
  actions: number;
  saleAmount: number;
  payouts: number;
  earnings: number;
}

export interface AffiliatePromotionLinkItem {
  channelType: string;
  platform?: string;
  url?: string;
}

export interface UpdateAffiliateProfileRequest {
  businessCategory?: string;
  entityType?: string;
  accountDisplayName?: string;
  countryRegion?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  stateProvince?: string;
  zip?: string;
  timezone?: string;
  currency?: string;
  acceptAgreement?: boolean;
  promotionLinks?: AffiliatePromotionLinkItem[];
}

@Injectable({ providedIn: 'root' })
export class AffiliateService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(request: AffiliateRegisterRequest): Observable<AffiliateRegisterResponse> {
    return this.http.post<AffiliateRegisterResponse>(`${this.apiUrl}api/affiliate/register`, {
      fullName: request.fullName,
      email: request.email,
      password: request.password,
      phone: request.phone,
      linkedInProfile: request.linkedInProfile,
      reason: request.reason
    });
  }

  getDashboard(): Observable<AffiliateDashboardResponse> {
    return this.http.get<AffiliateDashboardResponse>(`${this.apiUrl}api/affiliate/dashboard`);
  }

  getSupportSettings(): Observable<AffiliateSupportSettings> {
    return this.http.get<any>(`${this.apiUrl}api/affiliate/support`).pipe(
      map((r) => ({
        supportPhone: String(r?.supportPhone ?? r?.SupportPhone ?? ''),
        supportEmail: String(r?.supportEmail ?? r?.SupportEmail ?? ''),
        whatsAppUrl: String(r?.whatsAppUrl ?? r?.WhatsAppUrl ?? ''),
      }))
    );
  }

  /** Get time-filtered snapshot metrics for the snapshot card. */
  getSnapshot(period: 'all' | '7d' | '30d'): Observable<AffiliateSnapshotResponse> {
    const p = period || 'all';
    return this.http.get<AffiliateSnapshotResponse>(`${this.apiUrl}api/affiliate/snapshot?period=${encodeURIComponent(p)}`);
  }

  recordClick(code: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}api/affiliate/click?code=${encodeURIComponent(code)}`, {});
  }

  /** POST /api/affiliate/track-click. Only admin campaign links with matching course are tracked. */
  trackClick(affiliateCode: string, courseSlug?: string, courseId?: string): Observable<{ tracked?: boolean }> {
    const body: { affiliateCode: string; courseSlug?: string; courseId?: string } = { affiliateCode };
    if (courseSlug) body.courseSlug = courseSlug;
    if (courseId) body.courseId = courseId;
    return this.http.post<{ tracked?: boolean }>(`${this.apiUrl}api/affiliate/track-click`, body);
  }

  updateApplication(phone?: string, linkedInProfile?: string, reason?: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}api/affiliate/application`, {
      phone: phone ?? '',
      linkedInProfile: linkedInProfile ?? '',
      reason: reason ?? ''
    });
  }

  /** Get course-specific referral link (legacy: auth/register?ref=...&course=...). */
  getReferralLinkForCourse(courseId: string): Observable<{ referralLink: string }> {
    return this.http.get<{ referralLink: string }>(`${this.apiUrl}api/affiliate/referral-link`, {
      params: { courseId }
    });
  }

  /** Generate SEO-friendly affiliate link: {baseUrl}/{courseSlug}?ref={affiliateCode}. */
  getGenerateLink(courseId: string): Observable<AffiliateGenerateLinkResponse> {
    return this.http.get<AffiliateGenerateLinkResponse>(`${this.apiUrl}api/affiliate/generate-link/${courseId}`);
  }

  /** Published courses and portal pages for affiliate link dropdown. */
  getPromotableItems(): Observable<{
    courses: { id: string; title: string }[];
    pages: { pageKey: string; title: string; pathSlug: string }[];
  }> {
    return this.http.get<any>(`${this.apiUrl}api/affiliate/courses`).pipe(
      map((r) => {
        if (Array.isArray(r)) {
          return { courses: r, pages: [] };
        }
        const courses = (r?.courses ?? r?.Courses ?? []).map((c: any) => ({
          id: String(c?.id ?? c?.Id ?? ''),
          title: String(c?.title ?? c?.Title ?? ''),
        }));
        const pages = (r?.pages ?? r?.Pages ?? []).map((p: any) => ({
          pageKey: String(p?.pageKey ?? p?.PageKey ?? ''),
          title: String(p?.title ?? p?.Title ?? ''),
          pathSlug: String(p?.pathSlug ?? p?.PathSlug ?? ''),
        }));
        return { courses, pages };
      })
    );
  }

  /** @deprecated Use getPromotableItems */
  getCoursesForLinks(): Observable<{ id: string; title: string }[]> {
    return this.getPromotableItems().pipe(map((x) => x.courses));
  }

  generatePageLink(pageKey: string): Observable<{
    pageKey: string;
    pageTitle: string;
    pathSlug: string;
    affiliateCode: string;
    affiliateLink: string;
  }> {
    const key = encodeURIComponent(pageKey);
    return this.http.get<any>(`${this.apiUrl}api/affiliate/generate-page-link/${key}`).pipe(
      map((r) => ({
        pageKey: r?.pageKey ?? r?.PageKey ?? pageKey,
        pageTitle: r?.pageTitle ?? r?.PageTitle ?? '',
        pathSlug: r?.pathSlug ?? r?.PathSlug ?? '',
        affiliateCode: r?.affiliateCode ?? r?.AffiliateCode ?? '',
        affiliateLink: r?.affiliateLink ?? r?.AffiliateLink ?? '',
      }))
    );
  }

  /** Get extended affiliate profile (Impact.com-style onboarding). */
  getProfile(): Observable<AffiliateProfileResponse> {
    return this.http.get<AffiliateProfileResponse>(`${this.apiUrl}api/affiliate/profile`);
  }

  /** Update extended affiliate profile. */
  updateProfile(request: UpdateAffiliateProfileRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}api/affiliate/profile`, request);
  }
}
