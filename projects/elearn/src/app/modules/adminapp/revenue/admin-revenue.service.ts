import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RevenueApiService,
  RevenueByChannelItem,
  RevenueByInstructorItem,
  RevenueByCampaignItem,
  RevenueByAffiliateItem,
  AffiliatePayoutItem,
} from '../../../services/revenue-api.service';

/** Thin wrapper so admin-revenue can use RevenueApiService via this module. */
@Injectable({ providedIn: 'root' })
export class AdminRevenueService {
  constructor(private revenueApi: RevenueApiService) {}

  getRevenueByChannel(from?: string, to?: string): Observable<RevenueByChannelItem[]> {
    return this.revenueApi.getRevenueByChannel(from, to);
  }

  getRevenueByInstructor(from?: string, to?: string): Observable<RevenueByInstructorItem[]> {
    return this.revenueApi.getRevenueByInstructor(from, to);
  }

  getRevenueByCampaign(from?: string, to?: string): Observable<RevenueByCampaignItem[]> {
    return this.revenueApi.getRevenueByCampaign(from, to);
  }

  getRevenueByAffiliate(from?: string, to?: string): Observable<RevenueByAffiliateItem[]> {
    return this.revenueApi.getRevenueByAffiliate(from, to);
  }

  getAffiliatePayouts(status?: string): Observable<AffiliatePayoutItem[]> {
    return this.revenueApi.getAffiliatePayouts(status);
  }
}
