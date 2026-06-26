import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AdminAffiliateCourseOption {
  id: string;
  title: string;
  slug?: string;
}

export interface AdminAffiliatePageItem {
  id: string;
  title: string;
  url: string;
  category: 'portal' | 'course' | 'campaign';
  subtitle?: string;
}

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
  /** Optional allowlist for which courses affiliate can promote (if backend supports). */
  allowedCourseIds?: string[];
  restrictsCourses?: boolean;
  permittedCourses?: AdminAffiliateCourseOption[];
  allowedPageKeys?: string[];
  restrictsPages?: boolean;
  permittedPages?: { pageKey: string; title: string; pathSlug: string }[];
}

export interface UpdateAffiliateCommissionRequest {
  commissionRate?: number;
  courseCommissions?: { courseId: string; commissionPercent: number }[];
  /** Optional allowlist for which courses affiliate can promote (if backend supports). */
  allowedCourseIds?: string[];
  /** Empty = allow all portal pages; non-empty = restrict to these keys. */
  allowedPageKeys?: string[];
}

export interface AdminReferralItem {
  id: string;
  referredEmail: string;
  signupDate: string;
  purchaseAmount: number;
  commissionAmount: number;
  status: string;
}

export interface AffiliateSupportSettings {
  supportPhone: string;
  supportEmail: string;
  whatsAppUrl: string;
}

export interface UpdateAffiliateSupportSettingsRequest {
  supportPhone: string;
  supportEmail: string;
}

export interface ApproveAffiliateResponse {
  success: boolean;
  affiliateCode?: string;
  referralLink?: string;
}

export interface AdminAffiliateLinkItem {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  trackingCode: string;
  affiliateUrl: string;
  commissionPercentage: number | null;
  isActive: boolean;
  expiresAt: string | null;
  totalClicks: number;
  totalSales: number;
  totalCommission: number;
  validReferrals: number;
  invalidReferralAttempts: number;
  conversionPercent: number;
  createdOn: string;
}

export interface CreateAdminAffiliateLinkRequest {
  affiliateId: string;
  courseId: string;
  commissionPercentage?: number;
  expiresAt?: string | null;
  label?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminAffiliateApiService {
  private readonly baseUrl = `${(environment.apiUrl || '').replace(/\/$/, '')}/api/admin/affiliate`;
  private readonly linksBaseUrl = `${(environment.apiUrl || '').replace(/\/$/, '')}/api/admin/affiliate-links`;
  private readonly apiUrl = `${(environment.apiUrl || '').replace(/\/$/, '')}/`;

  constructor(private http: HttpClient) {}

  getList(pageNumber = 1, pageSize = 50): Observable<{ results: AdminAffiliateListItem[]; total: number }> {
    const url = `${this.baseUrl}?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    return this.http.get<any>(url).pipe(
      map((body) => {
        const rows = Array.isArray(body)
          ? body
          : (body?.results ?? body?.Results ?? []);
        const total = body?.totalNumberOfRecords ?? body?.TotalNumberOfRecords ?? rows.length;
        return {
          results: (rows || []).map((r: any) => this.normalizeListItem(r)),
          total: Number(total) || 0,
        };
      })
    );
  }

  /** Full affiliate list for dropdowns (campaign links, allow courses, etc.). */
  getListAll(): Observable<AdminAffiliateListItem[]> {
    return this.getList(1, 500).pipe(map((paged) => paged.results ?? []));
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
    const allowedCourseIdsRaw = r?.allowedCourseIds ?? r?.AllowedCourseIds ?? null;
    const allowedCourseIds = Array.isArray(allowedCourseIdsRaw)
      ? allowedCourseIdsRaw.map((x: any) => String(x))
      : undefined;
    const permittedRaw = r?.permittedCourses ?? r?.PermittedCourses ?? null;
    const permittedCourses = Array.isArray(permittedRaw)
      ? permittedRaw.map((c: any) => ({
          id: String(c?.id ?? c?.Id ?? ''),
          title: String(c?.title ?? c?.Title ?? ''),
          slug: String(c?.slug ?? c?.Slug ?? '').trim() || undefined,
        })).filter((x: AdminAffiliateCourseOption) => !!x.id && !!x.title)
      : undefined;
    const restrictsCourses = Boolean(
      r?.restrictsCourses ?? r?.RestrictsCourses ?? (allowedCourseIds?.length ?? 0) > 0
    );
    const allowedPageKeysRaw = r?.allowedPageKeys ?? r?.AllowedPageKeys ?? null;
    const allowedPageKeys = Array.isArray(allowedPageKeysRaw)
      ? allowedPageKeysRaw.map((x: any) => String(x))
      : undefined;
    const permittedPagesRaw = r?.permittedPages ?? r?.PermittedPages ?? null;
    const permittedPages = Array.isArray(permittedPagesRaw)
      ? permittedPagesRaw.map((p: any) => ({
          pageKey: String(p?.pageKey ?? p?.PageKey ?? ''),
          title: String(p?.title ?? p?.Title ?? ''),
          pathSlug: String(p?.pathSlug ?? p?.PathSlug ?? ''),
        }))
      : undefined;
    const restrictsPages = Boolean(
      r?.restrictsPages ?? r?.RestrictsPages ?? (allowedPageKeys?.length ?? 0) > 0
    );
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
      allowedCourseIds,
      restrictsCourses,
      permittedCourses,
      allowedPageKeys,
      restrictsPages,
      permittedPages,
    };
  }

  updateCommission(id: string, request: UpdateAffiliateCommissionRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }

  getSupportSettings(): Observable<AffiliateSupportSettings> {
    return this.http.get<any>(`${this.baseUrl}/support-settings`).pipe(
      map((r) => this.normalizeSupportSettings(r))
    );
  }

  updateSupportSettings(request: UpdateAffiliateSupportSettingsRequest): Observable<AffiliateSupportSettings> {
    return this.http.put<any>(`${this.baseUrl}/support-settings`, request).pipe(
      map((r) => this.normalizeSupportSettings(r))
    );
  }

  private normalizeSupportSettings(r: any): AffiliateSupportSettings {
    return {
      supportPhone: String(r?.supportPhone ?? r?.SupportPhone ?? ''),
      supportEmail: String(r?.supportEmail ?? r?.SupportEmail ?? ''),
      whatsAppUrl: String(r?.whatsAppUrl ?? r?.WhatsAppUrl ?? ''),
    };
  }

  approve(id: string): Observable<ApproveAffiliateResponse> {
    return this.http.put<ApproveAffiliateResponse>(`${this.baseUrl}/${id}/approve`, {});
  }

  markPaid(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/mark-paid`, {});
  }

  /** Admin helper: list published courses for allowlist selection. */
  getCampaignLinks(affiliateId?: string, courseId?: string): Observable<AdminAffiliateLinkItem[]> {
    const params: Record<string, string> = {};
    if (affiliateId) params['affiliateId'] = affiliateId;
    if (courseId) params['courseId'] = courseId;
    return this.http.get<any[]>(this.linksBaseUrl, { params }).pipe(
      map((rows) => (rows || []).map((r) => this.normalizeLinkItem(r)))
    );
  }

  createCampaignLink(request: CreateAdminAffiliateLinkRequest): Observable<AdminAffiliateLinkItem> {
    return this.http.post<any>(`${this.linksBaseUrl}/create`, request).pipe(
      map((r) => this.normalizeLinkItem(r))
    );
  }

  updateCampaignLinkStatus(id: string, isActive: boolean): Observable<AdminAffiliateLinkItem> {
    return this.http.put<any>(`${this.linksBaseUrl}/${id}/status`, { isActive }).pipe(
      map((r) => this.normalizeLinkItem(r))
    );
  }

  deleteCampaignLink(id: string): Observable<void> {
    return this.http.delete<void>(`${this.linksBaseUrl}/${id}`);
  }

  private normalizeLinkItem(r: any): AdminAffiliateLinkItem {
    return {
      id: String(r?.id ?? r?.Id ?? ''),
      affiliateId: String(r?.affiliateId ?? r?.AffiliateId ?? ''),
      affiliateName: r?.affiliateName ?? r?.AffiliateName ?? '',
      affiliateEmail: r?.affiliateEmail ?? r?.AffiliateEmail ?? '',
      courseId: String(r?.courseId ?? r?.CourseId ?? ''),
      courseTitle: r?.courseTitle ?? r?.CourseTitle ?? '',
      courseSlug: r?.courseSlug ?? r?.CourseSlug ?? '',
      trackingCode: r?.trackingCode ?? r?.TrackingCode ?? '',
      affiliateUrl: r?.affiliateUrl ?? r?.AffiliateUrl ?? '',
      commissionPercentage: r?.commissionPercentage ?? r?.CommissionPercentage ?? null,
      isActive: Boolean(r?.isActive ?? r?.IsActive ?? true),
      expiresAt: r?.expiresAt ?? r?.ExpiresAt ?? null,
      totalClicks: Number(r?.totalClicks ?? r?.TotalClicks ?? 0),
      totalSales: Number(r?.totalSales ?? r?.TotalSales ?? 0),
      totalCommission: Number(r?.totalCommission ?? r?.TotalCommission ?? 0),
      validReferrals: Number(r?.validReferrals ?? r?.ValidReferrals ?? 0),
      invalidReferralAttempts: Number(r?.invalidReferralAttempts ?? r?.InvalidReferralAttempts ?? 0),
      conversionPercent: Number(r?.conversionPercent ?? r?.ConversionPercent ?? 0),
      createdOn: r?.createdOn ?? r?.CreatedOn ?? '',
    };
  }

  getPublishedCoursesForSelection(pageSize: number = 500): Observable<AdminAffiliateCourseOption[]> {
    const params: any = {
      pageNumber: '1',
      pageSize: String(pageSize),
      'Filter.IsPublished': 'true',
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': 'true'
    };
    return this.http.get<any>(`${this.apiUrl}api/course`, { params }).pipe(
      map((res) => {
        const rows = res?.results ?? res?.Results ?? res ?? [];
        if (!Array.isArray(rows)) return [];
        return rows.map((c: any) => ({
          id: String(c?.id ?? c?.Id ?? ''),
          title: String(c?.title ?? c?.Title ?? ''),
          slug: String(c?.slug ?? c?.Slug ?? c?.canonicalUrl ?? c?.CanonicalUrl ?? '').trim() || undefined,
        })).filter((x: AdminAffiliateCourseOption) => !!x.id && !!x.title);
      })
    );
  }
}
