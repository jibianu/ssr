import { environment } from './../../../../../environments/environment';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { PublicAppService } from '../../publicapp.service';
import { AffiliateService } from '../../../affiliate/affiliate.service';
import { AuthenticationService } from '../../../auth/auth.service';

const AFFILIATE_REF_KEY = 'affiliate_ref';
const AFFILIATE_REF_DAYS = 30;

@Component({
    selector: 'app-public-course-details',
    templateUrl: './public-course-details.component.html',
    styleUrls: ['./public-course-details.component.scss'],
    standalone: false
})
export class PublicCourseDetailsComponent implements OnInit, OnDestroy {

  subscription: Subscription = new Subscription();
  courseUrl: string;
  locationUrl: string;
  courseDetails;
  private pendingAffiliateRef: string | null = null;
  Editor;
  image = '';
  isBrowser = false;
  categoryName = '';
  courseId = '';
  /** True when the promo video overlay is open (user clicked thumbnail). */
  showPromoVideoModal = false;

  /** Company logos for "Top Companies Trust Us" (design match with site). */
  companyLogos = [
    { src: 'assets/img/logo-airbnb.svg', alt: 'Partner' },
    { src: 'assets/img/logo-digitalocean.svg', alt: 'Partner' },
    { src: 'assets/img/logo-facebook.svg', alt: 'Partner' },
    { src: 'assets/img/logo-discord.svg', alt: 'Partner' },
    { src: 'assets/img/logo-intercom.svg', alt: 'Partner' },
    { src: 'assets/img/logo-twitch.svg', alt: 'Partner' }
  ];

  /** Key features from API (courseFeatures) for pricing card. */
  get courseFeaturesList(): string[] {
    const d = this.courseDetails;
    if (!d) return [];
    const list = (d as any).courseFeatures ?? (d as any).CourseFeatures;
    if (Array.isArray(list) && list.length > 0) {
      return list.map((f: any) => (f?.description ?? f?.Description ?? '')).filter(Boolean);
    }
    return [];
  }

  constructor(
    private publicAppService: PublicAppService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private canonicalService: CanonicalService,
    private metadataService: MetadataService,
    private affiliateService: AffiliateService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const ref = params['ref'];
      if (ref && typeof ref === 'string' && ref.trim()) {
        this.pendingAffiliateRef = ref.trim();
      }
    });
    this.activatedRoute.params.subscribe(params => {
      // Decode so slugs like ...-(rt) from %28rt%29 are correct
      if (params.url) this.courseUrl = this.decodePathSegment(params.url);
      if (params.location) this.locationUrl = params.location;
      // When logged in but on default public route (e.g. /slug), redirect to /courses/slug so Elearn sidebar + header show
      if (this.courseUrl && (this.authService.currentToken() || this.authService.currentUser())) {
        const url = this.router.url.split('?')[0];
        if (!url.startsWith('/courses/')) {
          this.router.navigate(['/courses', this.courseUrl], { replaceUrl: true, queryParamsHandling: 'preserve' });
          return;
        }
      }
      if (this.courseUrl && this.locationUrl) {
        this.getCourseByCanonicalLocationURL(this.courseUrl, this.locationUrl);
      } else if (this.courseUrl) {
        this.getCourseBySlugOrCanonical(this.courseUrl);
      }
    });
  }

  private setAffiliateRef(code: string): void {
    try {
      localStorage.setItem(AFFILIATE_REF_KEY, code);
      const expires = new Date();
      expires.setDate(expires.getDate() + AFFILIATE_REF_DAYS);
      localStorage.setItem(AFFILIATE_REF_KEY + '_exp', expires.toISOString());
      document.cookie = `affiliate_ref=${encodeURIComponent(code)}; path=/; max-age=${AFFILIATE_REF_DAYS * 24 * 60 * 60}; SameSite=Lax`;
    } catch (_) {}
  }

  private trackAffiliateClick(code: string): void {
    const slug = (this.courseDetails?.canonicalUrl || this.courseUrl || '').toString().trim();
    const courseId = this.courseDetails?.id ? String(this.courseDetails.id) : undefined;
    this.subscription.add(
      this.affiliateService.trackClick(code, slug || undefined, courseId).subscribe({
        next: (res) => {
          if (res?.tracked) {
            this.setAffiliateRef(code);
            if (courseId) {
              try {
                localStorage.setItem('affiliate_ref_course', courseId);
                const expires = new Date();
                expires.setDate(expires.getDate() + AFFILIATE_REF_DAYS);
                localStorage.setItem('affiliate_ref_course_exp', expires.toISOString());
              } catch (_) {}
            }
          }
        },
        error: () => {},
      })
    );
  }

  /** Decode path segment so slugs with (rt) etc. from %28rt%29 are correct. */
  private decodePathSegment(segment: string): string {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }

  /** Slug-like: letters, numbers, hyphens, optional parentheses e.g. ...-(rt) */
  private static readonly SLUG_LIKE = /^[a-z0-9]+(-[a-z0-9]+)*(\([a-z0-9]+\))?$/i;

  /** Try slug first (SEO-friendly), then fallback to canonical URL. */
  getCourseBySlugOrCanonical(url: string) {
    const slugLooksLike = PublicCourseDetailsComponent.SLUG_LIKE.test(url);
    if (slugLooksLike) {
      this.subscription.add(this.publicAppService.getCourseBySlug(url).subscribe({
        next: (res: any) => {
          if (res) this.setCourseDetails(res);
          else this.subscription.add(this.publicAppService.getCourseByCanonicalURL(url).subscribe((r: any) => { if (r) this.setCourseDetails(r); }));
        },
        error: () => this.subscription.add(this.publicAppService.getCourseByCanonicalURL(url).subscribe((r: any) => { if (r) this.setCourseDetails(r); }))
      }));
    } else {
      this.subscription.add(this.publicAppService.getCourseByCanonicalURL(url).subscribe((r: any) => { if (r) this.setCourseDetails(r); }));
    }
  }

  private setCourseDetails(res: any) {
    this.courseDetails = res;
    this.categoryName = (this.courseDetails?.category) ? this.courseDetails.category.name : '';
    this.courseId = this.courseDetails.id;
    const ref = this.pendingAffiliateRef || this.activatedRoute.snapshot.queryParams['ref'];
    if (ref && typeof ref === 'string' && ref.trim()) {
      this.trackAffiliateClick(ref.trim());
      this.pendingAffiliateRef = null;
    }
    this.image = this.courseDetails.titleImageUrl;
    const slug = this.courseDetails.canonicalUrl || this.courseUrl;
    const base = (environment as { seoUrl?: string }).seoUrl || '';
    const useCoursesPath = this.router.url.split('?')[0].startsWith('/courses/');
    const canonicalPath = useCoursesPath ? 'courses/' + slug : slug;
    const fullCanonical = base ? base.replace(/\/?$/, '') + '/' + canonicalPath : canonicalPath;
    if (this.metadataService) {
      this.metadataService.updateMetadata({
        title: this.courseDetails.title,
        description: this.courseDetails.metaDescription,
        author: this.courseDetails.createdByUser?.firstname + ' ' + (this.courseDetails?.createdByUser?.lastname || ''),
        type: 'article',
        image: this.courseDetails.titleImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        time: this.courseDetails.createdOn,
        updatedTime: this.courseDetails.updatedOn,
        category: this.categoryName,
        seoUrl: fullCanonical,
        canonicalUrl: fullCanonical
      });
    }
    this.canonicalService.setCanonicalURL(fullCanonical);
  }

  getCourseByCanonicalURL(url) {
    this.subscription.add(this.publicAppService.getCourseByCanonicalURL(url).subscribe((res: any) => {
      if (res) this.setCourseDetails(res);
    }));
  }

  getCourseByCanonicalLocationURL(courseUrl, locationUrl) {
    this.subscription.add(this.publicAppService.getCourseByCanonicalLocationURL(courseUrl, locationUrl).subscribe((res: any) => {
      if (res) {
        this.courseDetails = res;
        this.courseId = this.courseDetails.id;
        let canonicalUrl = (`${this.courseUrl} ${this.locationUrl}`).split(' ').join('-');
        this.categoryName = (this.courseDetails && this.courseDetails.category) ? this.courseDetails.category.name : '';
        this.image = this.courseDetails.titleImageUrl;
        const locationSeoBase = environment.seoUrl.replace(/\/?$/, '');
        const locationFullUrl = `${locationSeoBase}/${canonicalUrl}`;
        if (this.metadataService) {
          this.metadataService.updateMetadata({
            title: this.courseDetails.title,
            description: this.courseDetails.metaDescription,
            author:
              `${this.courseDetails.createdByUser?.firstname ?? ''} ${this.courseDetails?.createdByUser?.lastname ?? ''}`.trim(),
            type: 'article',
            image: this.courseDetails.titleImageUrl,
            imageWidth: 1200,
            imageHeight: 630,
            time: this.courseDetails.createdOn,
            updatedTime: this.courseDetails.updatedOn,
            category: this.categoryName,
            seoUrl: locationFullUrl,
            canonicalUrl: locationFullUrl
          });
        }
        this.canonicalService.setCanonicalURL(locationFullUrl);
      }
    }));
  }

  /** First summary or description for hero (design match with site). */
  get courseSummaryText(): string {
    const s = this.courseDetails?.courseSummaries?.[0]?.summary ?? this.courseDetails?.description ?? '';
    return typeof s === 'string' ? s : '';
  }

  /** Price for display: amount (page/course) or discountedPrice/price (api/course). */
  get displayAmount(): number {
    const d = this.courseDetails;
    if (!d) return 99;
    const amt = (d as any).amount ?? (d as any).discountedPrice ?? (d as any).DiscountedPrice ?? (d as any).price ?? (d as any).Price;
    return Number(amt) || 99;
  }

  /** Original price for discount line (only when higher than display amount). */
  get originalAmount(): number | null {
    const d = this.courseDetails;
    if (!d) return null;
    const orig = (d as any).originalAmount ?? (d as any).OriginalAmount ?? (d as any).price ?? (d as any).Price;
    const num = Number(orig);
    return num > 0 && num > this.displayAmount ? num : null;
  }

  /** Use proxy URL for S3 promo videos to avoid CORS; return original URL for other hosts (e.g. YouTube). */
  getPromoVideoSrc(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.publicAppService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  openPromoVideo(): void {
    this.showPromoVideoModal = true;
  }

  closePromoVideo(): void {
    this.showPromoVideoModal = false;
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=ono.blog.com';
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
