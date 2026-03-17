import { Component, OnInit, OnChanges, SimpleChanges, inject, signal, computed, Input, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogService, BlogDetailDto, LoopMarketingContentDto } from '../blog.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SubscribePopupComponent } from '../subscribe-popup/subscribe-popup.component';
import { PublicAppService } from '../../publicapp.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SubscribePopupComponent],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements OnInit, OnChanges {
  private blogService = inject(BlogService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  private publicAppService = inject(PublicAppService);

  /** When set, use this slug instead of route params (e.g. when embedded in slug-resolver). */
  @Input() set slugInput(value: string | null) {
    this._slugInput.set(value ?? '');
  }
  private _slugInput = signal('');
  blog = signal<BlogDetailDto | null>(null);
  loading = signal(true);
  notFound = signal(false);
  showSubscribePopup = signal(false);
  newsletterEmail = '';
  isSubscribingSidebar = false;
  newsletterMessage = '';
  isSubscribedSidebar = false;
  activeSection = signal('');
  /** Loop Marketing content for current blog category (same as original blog). */
  loopMarketingContent = signal<LoopMarketingContentDto | null>(null);
  placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjMwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CbG9nIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

  sanitizedContent = computed<SafeHtml>(() => {
    const b = this.blog();
    return b?.content ? this.sanitizer.bypassSecurityTrustHtml(b.content) : '';
  });

  sanitizedSections = computed(() => {
    const b = this.blog();
    if (!b?.blogSections?.length) return [];
    return b.blogSections.map(s => ({
      ...s,
      sanitizedContent: s.content ? this.sanitizer.bypassSecurityTrustHtml(s.content) : ''
    }));
  });

  ngOnInit(): void {
    const slugFromInput = this._slugInput();
    if (slugFromInput) {
      this.loadBySlug(slugFromInput);
    } else {
      this.route.params.subscribe(params => {
        const slug = params['slug'] || this._slugInput();
        if (!slug) {
          this.loading.set(false);
          return;
        }
        this.loadBySlug(slug);
      });
    }
    if (isPlatformBrowser(this.platformId)) {
      this.setupSubscribePopup();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slugInput'] && this._slugInput()) {
      this.loadBySlug(this._slugInput());
    }
  }

  private loadBySlug(slug: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.loopMarketingContent.set(null);
    this.blogService.getBlogBySlug(slug).subscribe({
        next: (data) => {
          this.blog.set(data ?? null);
          this.notFound.set(!data);
          this.loading.set(false);
          const categoryId = data?.category?.id ?? null;
          this.blogService.getLoopMarketingByCategory(categoryId).subscribe({
            next: (content) => {
              const normalized = this.normalizeLoopMarketingContent(content);
              this.loopMarketingContent.set(normalized?.title?.trim() ? normalized : null);
            }
          });
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        }
      });
  }

  /** Normalize API response (PascalCase or camelCase) to camelCase for template. */
  private normalizeLoopMarketingContent(raw: any): LoopMarketingContentDto | null {
    if (!raw) return null;
    return {
      id: raw.id ?? raw.Id,
      categoryId: raw.categoryId ?? raw.CategoryId ?? null,
      title: raw.title ?? raw.Title ?? '',
      description: raw.description ?? raw.Description ?? '',
      brand: raw.brand ?? raw.Brand ?? '',
      graphicText: raw.graphicText ?? raw.GraphicText ?? '',
      expressFeature: raw.expressFeature ?? raw.ExpressFeature ?? '',
      tailorFeature: raw.tailorFeature ?? raw.TailorFeature ?? '',
      amplifyFeature: raw.amplifyFeature ?? raw.AmplifyFeature ?? '',
      evolveFeature: raw.evolveFeature ?? raw.EvolveFeature ?? '',
      downloadButtonText: raw.downloadButtonText ?? raw.DownloadButtonText ?? '',
      learnMoreText: raw.learnMoreText ?? raw.LearnMoreText ?? '',
      downloadUrl: raw.downloadUrl ?? raw.DownloadUrl ?? '',
      learnMoreUrl: raw.learnMoreUrl ?? raw.LearnMoreUrl ?? ''
    };
  }

  downloadPromptLibrary(): void {
    const content = this.loopMarketingContent();
    const url = content?.downloadUrl?.trim();
    if (url) {
      window.open(url, '_blank');
    } else {
      window.open('/courses', '_blank');
    }
  }

  /** Show only user name (part before @); never full email as author label. */
  getAuthorDisplayName(name: string | null | undefined): string {
    if (!name) return '';
    return name.includes('@') ? name.slice(0, name.indexOf('@')).trim() || name : name;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  onImgError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el) el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjMwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CbG9nIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  }

  /** URL-safe id for section (TOC anchor). */
  sectionId(title: string): string {
    if (!title) return '';
    return title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'section';
  }

  private setupSubscribePopup(): void {
    if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') return;
    if (localStorage.getItem('user_subscribed') === 'true') return;
    if (sessionStorage.getItem('subscribe_popup_shown') === 'true') return;
    const lastShown = localStorage.getItem('subscribe_popup_last_shown');
    if (lastShown) {
      const days = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }
    const showAfter = () => {
      if (this.showSubscribePopup()) return;
      sessionStorage.setItem('subscribe_popup_shown', 'true');
      localStorage.setItem('subscribe_popup_last_shown', Date.now().toString());
      this.showSubscribePopup.set(true);
    };
    setTimeout(showAfter, 30000);
    if (typeof window !== 'undefined') {
      window.addEventListener('closeSubscribePopup', () => {
        this.showSubscribePopup.set(false);
      });
    }
  }

  closeSubscribePopup(): void {
    this.showSubscribePopup.set(false);
  }

  getNormalizedUrl(slug: string): string {
    if (typeof window === 'undefined' || !slug) return '';
    const base = window.location.origin;
    return `${base}/${encodeURIComponent(slug)}`;
  }

  getFacebookShareUrl(): string {
    const b = this.blog();
    if (!b?.canonicalUrl) return '#';
    const url = encodeURIComponent(this.getNormalizedUrl(b.canonicalUrl));
    const title = encodeURIComponent(b.title || '');
    return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`;
  }

  getTwitterShareUrl(): string {
    const b = this.blog();
    if (!b?.canonicalUrl) return '#';
    const url = encodeURIComponent(this.getNormalizedUrl(b.canonicalUrl));
    const text = encodeURIComponent(b.title || '');
    return `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
  }

  getLinkedInShareUrl(): string {
    const b = this.blog();
    if (!b?.canonicalUrl) return '#';
    const url = encodeURIComponent(this.getNormalizedUrl(b.canonicalUrl));
    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }

  shareUrl(): void {
    const b = this.blog();
    if (!b?.canonicalUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const url = this.getNormalizedUrl(b.canonicalUrl);
    navigator.clipboard.writeText(url).then(() => {
      this.newsletterMessage = 'Link copied to clipboard!';
      setTimeout(() => { this.newsletterMessage = ''; }, 2000);
    });
  }

  subscribeNewsletterSidebar(): void {
    if (!this.newsletterEmail?.trim() || this.isSubscribingSidebar) return;
    this.isSubscribingSidebar = true;
    this.newsletterMessage = '';
    this.publicAppService.subscribeNewsletter(this.newsletterEmail).subscribe({
      next: (res) => {
        this.isSubscribingSidebar = false;
        if (res?.success) {
          this.isSubscribedSidebar = true;
          this.newsletterMessage = 'Thank you for subscribing!';
          this.newsletterEmail = '';
        } else {
          this.newsletterMessage = (res as any)?.error || 'Something went wrong.';
        }
      },
      error: () => {
        this.isSubscribingSidebar = false;
        this.newsletterMessage = 'Something went wrong. Please try again.';
      }
    });
  }
}
