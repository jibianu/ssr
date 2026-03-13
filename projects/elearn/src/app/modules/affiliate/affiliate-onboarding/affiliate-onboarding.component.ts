import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AffiliateService, AffiliateProfileResponse, UpdateAffiliateProfileRequest, AffiliatePromotionLinkItem } from '../affiliate.service';
import { SharedService } from '../../../shared/service/shared-service.service';
import { first } from 'rxjs/operators';

const BUSINESS_CATEGORIES: { value: string; label: string; description: string }[] = [
  { value: 'SocialInfluencer', label: 'Social Influencer', description: 'My audience follows me for entertainment, education and community, and they engage with social-native content that we produce.' },
  { value: 'ContentReviews', label: 'Content/Reviews', description: 'My audience comes to my properties to learn more about specific products or product categories, find gift ideas, read reviews, and make informed purchasing decisions.' },
  { value: 'LoyaltyRewards', label: 'Loyalty/Rewards', description: 'My audience receives compensation (monetary or otherwise) when they make purchases and I help connect them to those rewards.' },
  { value: 'DealCoupon', label: 'Deal/Coupon', description: 'My audience relies on us to save money and make savvy purchasing decisions. We present coupons, vouchers and/or discounts on this property.' },
  { value: 'EmailNewsletter', label: 'Email/Newsletter', description: 'My audience subscribes to regular communications bringing together valuable content, discounts, and other information.' },
  { value: 'SearchComparison', label: 'Search/Comparison', description: 'My audience uses our platform to discover and compare products, services, or prices across multiple vendors.' },
  { value: 'Network', label: 'Network', description: 'We bring together a range of publishers to allow advertisers access to the audiences they are looking for.' },
  { value: 'TechnologySolution', label: 'Technology Solution', description: 'We provide innovative technological solutions that enhance the customer experience and drive conversions.' },
  { value: 'CrossAudienceMonetization', label: 'Cross Audience Monetization', description: 'My audience purchases my products and I link them to similar, noncompeting products for other brands.' }
];

const CHANNEL_TYPES: { value: string; label: string }[] = [
  { value: 'Website', label: 'Website' },
  { value: 'Social', label: 'Social' },
  { value: 'MobileApp', label: 'Mobile App' },
  { value: 'Podcast', label: 'Podcast' },
  { value: 'EmailNewsletter', label: 'Email/Newsletter' },
  { value: 'Offline', label: 'Offline' }
];

const SOCIAL_PLATFORMS: { value: string; label: string }[] = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'Pinterest', label: 'Pinterest' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'LinkedIn', label: 'LinkedIn' }
];

const CURRENCIES = [
  { value: 'INR', label: 'INR Indian Rupee' },
  { value: 'USD', label: 'USD US Dollar' },
  { value: 'GBP', label: 'GBP British Pound' },
  { value: 'EUR', label: 'EUR Euro' }
];

@Component({
  selector: 'app-affiliate-onboarding',
  templateUrl: './affiliate-onboarding.component.html',
  styleUrls: ['./affiliate-onboarding.component.scss'],
  standalone: false
})
export class AffiliateOnboardingComponent implements OnInit {
  step = 0;
  loading = true;
  profile: AffiliateProfileResponse | null = null;
  submitting = false;
  error = '';

  businessCategories = BUSINESS_CATEGORIES;
  channelTypes = CHANNEL_TYPES;
  socialPlatforms = SOCIAL_PLATFORMS;
  currencies = CURRENCIES;

  businessCategory = '';
  promotionLinks: AffiliatePromotionLinkItem[] = [];
  entityType = 'Individual';
  accountDisplayName = '';
  countryRegion = 'India';
  streetAddress1 = '';
  streetAddress2 = '';
  city = '';
  stateProvince = '';
  zip = '';
  timezone = '(GMT+05:30) India Standard Time';
  currency = 'INR';
  acceptAgreement = false;

  addingChannel: string | null = null;
  addPlatform = '';
  addUrl = '';

  constructor(
    private affiliateService: AffiliateService,
    private router: Router,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Complete your profile');
    this.affiliateService.getProfile().pipe(first()).subscribe({
      next: (p) => {
        this.profile = p;
        this.loading = false;
        if (p.profileCompleted) {
          this.router.navigate(['/app/affiliate/dashboard']);
          return;
        }
        this.businessCategory = p.businessCategory ?? '';
        this.entityType = p.entityType ?? 'Individual';
        this.accountDisplayName = p.accountDisplayName ?? '';
        this.countryRegion = p.countryRegion ?? 'India';
        this.streetAddress1 = p.streetAddress1 ?? '';
        this.streetAddress2 = p.streetAddress2 ?? '';
        this.city = p.city ?? '';
        this.stateProvince = p.stateProvince ?? '';
        this.zip = p.zip ?? '';
        this.timezone = p.timezone ?? '(GMT+05:30) India Standard Time';
        this.currency = p.currency ?? 'INR';
        this.promotionLinks = (p.promotionLinks ?? []).map(l => ({
          channelType: l.channelType,
          platform: l.platform,
          url: l.url
        }));
      },
      error: () => { this.loading = false; this.error = 'Failed to load profile.'; }
    });
  }

  nextStep(): void {
    if (this.step === 0 && !this.businessCategory) return;
    if (this.step < 2) this.step++;
    else this.submit();
  }

  prevStep(): void {
    if (this.step > 0) this.step--;
  }

  addPromotion(channelType: string): void {
    this.addingChannel = channelType;
    this.addPlatform = '';
    this.addUrl = '';
  }

  savePromotionLink(): void {
    if (!this.addingChannel) return;
    const item: AffiliatePromotionLinkItem = {
      channelType: this.addingChannel,
      url: this.addUrl?.trim() || undefined
    };
    if (this.addingChannel === 'Social' && this.addPlatform) item.platform = this.addPlatform;
    this.promotionLinks = [...this.promotionLinks, item];
    this.addingChannel = null;
    this.addUrl = '';
    this.addPlatform = '';
  }

  removePromotionLink(index: number): void {
    this.promotionLinks = this.promotionLinks.filter((_, i) => i !== index);
  }

  cancelAdd(): void {
    this.addingChannel = null;
    this.addUrl = '';
    this.addPlatform = '';
  }

  submit(): void {
    if (!this.accountDisplayName?.trim() || !this.countryRegion?.trim() || !this.currency || !this.acceptAgreement) {
      this.error = 'Please fill required fields and accept the agreement.';
      return;
    }
    this.error = '';
    this.submitting = true;
    const request: UpdateAffiliateProfileRequest = {
      businessCategory: this.businessCategory || undefined,
      entityType: this.entityType,
      accountDisplayName: this.accountDisplayName.trim(),
      countryRegion: this.countryRegion.trim(),
      streetAddress1: this.streetAddress1?.trim() || undefined,
      streetAddress2: this.streetAddress2?.trim() || undefined,
      city: this.city?.trim() || undefined,
      stateProvince: this.stateProvince?.trim() || undefined,
      zip: this.zip?.trim() || undefined,
      timezone: this.timezone?.trim() || undefined,
      currency: this.currency,
      acceptAgreement: true,
      promotionLinks: this.promotionLinks.length ? this.promotionLinks : undefined
    };
    this.affiliateService.updateProfile(request).pipe(first()).subscribe({
      next: () => this.router.navigate(['/app/affiliate/dashboard']),
      error: () => { this.submitting = false; this.error = 'Failed to save. Try again.'; }
    });
  }

  channelLabel(ch: AffiliatePromotionLinkItem): string {
    if (ch.channelType === 'Social' && ch.platform) return `${ch.channelType} (${ch.platform})`;
    return ch.channelType;
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
  }
}
