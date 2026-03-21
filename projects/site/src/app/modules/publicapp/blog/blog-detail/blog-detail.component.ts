import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, signal, computed, Input, PLATFORM_ID, HostListener, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogService, BlogDetailDto, LoopMarketingContentDto } from '../blog.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SubscribePopupComponent } from '../subscribe-popup/subscribe-popup.component';
import { PublicAppService } from '../../publicapp.service';
import { FormsModule } from '@angular/forms';
import { fixUtf8Mojibake } from '../../../../shared/utils/fix-mojibake';
import { FixMojibakePipe } from '../../../../shared/pipes/fix-mojibake.pipe';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SubscribePopupComponent, FixMojibakePipe],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements OnInit, OnChanges, OnDestroy {
  private blogService = inject(BlogService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  private publicAppService = inject(PublicAppService);
  private cdr = inject(ChangeDetectorRef);

  /** When set, use this slug instead of route params (e.g. when embedded in slug-resolver). */
  @Input() set slugInput(value: string | null) {
    this._slugInput.set(value ?? '');
  }
  private _slugInput = signal('');
  /** When set (e.g. slugPageResolver / SSR), use API response without a second GET. */
  @Input() prefetchedBlog: BlogDetailDto | null = null;
  blog = signal<BlogDetailDto | null>(null);
  loading = signal(true);
  notFound = signal(false);
  showSubscribePopup = signal(false);
  newsletterEmail = '';
  isSubscribingSidebar = false;
  newsletterMessage = '';
  isSubscribedSidebar = false;
  /** Persisted so the sidebar form stays hidden after subscribe (same browser). */
  private readonly newsletterSidebarSubscribedKey = 'newsletter_sidebar_subscribed';
  activeSection = signal('');
  /** Offset from viewport top (px) — headings above this line count as "passed" for TOC active state. */
  private readonly tocScrollSpyOffsetPx = 100;
  private tocScrollRafId = 0;
  sidebarStopMode = signal(false);
  sidebarBottomPx = signal(0);
  /** Loop Marketing content for current blog category (same as original blog). */
  loopMarketingContent = signal<LoopMarketingContentDto | null>(null);
  placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjMwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CbG9nIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

  sanitizedContent = computed<SafeHtml>(() => {
    const b = this.blog();
    const content = b?.content ? fixUtf8Mojibake(b.content) : '';
    return content ? this.sanitizer.bypassSecurityTrustHtml(content) : '';
  });

  /** Title with mojibake fixed for display. */
  displayTitle = computed(() => {
    const b = this.blog();
    return b?.title ? fixUtf8Mojibake(b.title) : '';
  });

  sanitizedSections = computed(() => {
    const b = this.blog();
    if (!b?.blogSections?.length) return [];
    return b.blogSections.map(s => ({
      ...s,
      title: fixUtf8Mojibake(s.title) || s.title,
      sanitizedContent: s.content
        ? this.sanitizer.bypassSecurityTrustHtml(fixUtf8Mojibake(s.content))
        : ''
    }));
  });

  ngOnInit(): void {
    if (this.prefetchedBlog) {
      this.applyBlogData(this.prefetchedBlog);
      return;
    }
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
      this.syncNewsletterSidebarSubscribedFromStorage();
      this.setupSubscribePopup();
      // Initial sync for sticky/fixed sidebar behavior
      setTimeout(() => this.updateSidebarPosition(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prefetchedBlog']?.currentValue && this.prefetchedBlog) {
      this.applyBlogData(this.prefetchedBlog);
      return;
    }
    if (changes['slugInput'] && this._slugInput()) {
      this.loadBySlug(this._slugInput());
    }
  }

  ngOnDestroy(): void {
    this.cancelTocScrollSpyRaf();
  }

  private applyBlogData(data: BlogDetailDto | null): void {
    this.blog.set(data ?? null);
    this.notFound.set(!data);
    this.loading.set(false);
    this.activeSection.set('');
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.updateSidebarPosition();
        this.scheduleTocScrollSpyUpdate();
      }, 0);
    }
    const categoryId = data?.category?.id ?? null;
    this.blogService.getLoopMarketingByCategory(categoryId).subscribe({
      next: (content) => {
        const normalized = this.normalizeLoopMarketingContent(content);
        const hasContent =
          normalized &&
          ((normalized.title ?? '').trim() !== '' ||
            (normalized.description ?? '').trim() !== '' ||
            (normalized.brand ?? '').trim() !== '');
        this.loopMarketingContent.set(hasContent ? normalized : null);
        this.cdr.markForCheck();
      }
    });
  }

  private loadBySlug(slug: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.activeSection.set('');
    this.loopMarketingContent.set(null);
    this.blogService.getBlogBySlug(slug).subscribe({
      next: (data) => {
        this.applyBlogData(data ?? null);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateSidebarPosition();
    this.scheduleTocScrollSpyUpdate();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateSidebarPosition();
    this.scheduleTocScrollSpyUpdate();
  }

  /** Throttled: which section is in view → updates `activeSection` and scrolls the TOC list if needed. */
  private scheduleTocScrollSpyUpdate(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') return;
    if (!this.sanitizedSections().length) return;
    if (this.tocScrollRafId) return;
    this.tocScrollRafId = window.requestAnimationFrame(() => {
      this.tocScrollRafId = 0;
      this.updateActiveSectionFromScroll();
    });
  }

  private cancelTocScrollSpyRaf(): void {
    if (typeof window !== 'undefined' && this.tocScrollRafId) {
      window.cancelAnimationFrame(this.tocScrollRafId);
      this.tocScrollRafId = 0;
    }
  }

  /**
   * Last section whose top edge is at or above the spy line is considered active
   * (standard “scroll spy” behavior for long articles).
   */
  private updateActiveSectionFromScroll(): void {
    if (!isPlatformBrowser(this.platformId) || typeof document === 'undefined') return;
    const sections = this.sanitizedSections();
    if (!sections.length) return;

    const ids = sections.map((s) => this.sectionId(s.title));
    let activeId = ids[0];
    const offset = this.tocScrollSpyOffsetPx;

    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= offset) {
        activeId = id;
      }
    }

    if (this.activeSection() !== activeId) {
      this.activeSection.set(activeId);
      this.scrollTocActiveLinkIntoView(activeId);
    }
  }

  /** Keeps the active item visible inside the scrollable TOC list. */
  private scrollTocActiveLinkIntoView(sectionId: string): void {
    if (!sectionId || typeof document === 'undefined') return;
    const anchor = document.querySelector(
      `ul.blog-toc__list a.toc-link[href="#${sectionId}"]`
    ) as HTMLElement | null;
    anchor?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  /**
   * Sidebar behavior:
   * - Desktop: fixed at 90px under header while scrolling.
   * - When near lower boundary (related section/footer), switch to bottom-constrained mode.
   * - Mobile/tablet: disable fixed behavior.
   */
  private updateSidebarPosition(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || typeof document === 'undefined') return;
    const aside = document.querySelector('.blog-aside') as HTMLElement | null;
    const sidebarCol = document.querySelector('.blog-sidebar') as HTMLElement | null;
    const container = document.querySelector('.blog-container') as HTMLElement | null;
    if (!aside || !sidebarCol || !container) return;

    // Disable on mobile/tablet
    if (window.innerWidth <= 992) {
      this.sidebarStopMode.set(false);
      this.sidebarBottomPx.set(0);
      aside.style.position = 'static';
      aside.style.top = 'auto';
      aside.style.bottom = 'auto';
      aside.style.left = 'auto';
      aside.style.width = 'auto';
      return;
    }

    const fixedTop = 80;
    const buffer = 20;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    const sidebarHeight = aside.getBoundingClientRect().height;
    const sidebarLeft = sidebarCol.getBoundingClientRect().left;
    const sidebarWidth = 320;

    // Stop target priority: related section -> footer -> end of blog container
    const stopTarget = (document.querySelector('.related-courses-wrapper') as HTMLElement | null)
      || (document.querySelector('.related-posts-section') as HTMLElement | null)
      || (document.querySelector('app-public-footer') as HTMLElement | null);
    const stopTop = stopTarget
      ? stopTarget.getBoundingClientRect().top + scrollTop
      : container.getBoundingClientRect().bottom + scrollTop;

    const sidebarBottomIfFixed = scrollTop + fixedTop + sidebarHeight;
    const shouldStop = sidebarBottomIfFixed >= (stopTop - buffer);

    if (shouldStop) {
      const bottomValue = Math.max(0, window.innerHeight - (stopTop - scrollTop) + buffer);
      this.sidebarStopMode.set(true);
      this.sidebarBottomPx.set(bottomValue);
      aside.style.position = 'fixed';
      aside.style.top = 'auto';
      aside.style.bottom = `${bottomValue}px`;
      aside.style.left = `${sidebarLeft}px`;
      aside.style.width = `${sidebarWidth}px`;
    } else {
      this.sidebarStopMode.set(false);
      this.sidebarBottomPx.set(0);
      aside.style.position = 'fixed';
      aside.style.top = `${fixedTop}px`;
      aside.style.bottom = 'auto';
      aside.style.left = `${sidebarLeft}px`;
      aside.style.width = `${sidebarWidth}px`;
    }
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

  /** Scroll to section when Table of Contents link is clicked. */
  scrollToSection(event: Event, sectionTitle: string): void {
    event.preventDefault();
    const id = this.sectionId(sectionTitle);
    if (!id || typeof document === 'undefined') return;
    this.activeSection.set(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => this.scrollTocActiveLinkIntoView(id), 0);
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

  /** Restore “already subscribed” UI without showing the form again. */
  private syncNewsletterSidebarSubscribedFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    // Sidebar key, or popup flow already marked user as subscribed
    if (
      localStorage.getItem(this.newsletterSidebarSubscribedKey) === 'true' ||
      localStorage.getItem('user_subscribed') === 'true'
    ) {
      this.isSubscribedSidebar = true;
      this.newsletterMessage = '';
      this.cdr.markForCheck();
    }
  }

  subscribeNewsletterSidebar(): void {
    if (!this.newsletterEmail?.trim() || this.isSubscribingSidebar) return;
    this.isSubscribingSidebar = true;
    this.newsletterMessage = '';
    const slug = this.blog()?.canonicalUrl || undefined;
    this.publicAppService.subscribeNewsletter(this.newsletterEmail, { source: 'blog-sidebar', blogSlug: slug }).pipe(
      finalize(() => {
        this.isSubscribingSidebar = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res) => {
        if (res?.success) {
          this.isSubscribedSidebar = true;
          this.newsletterMessage = res.message || 'Thank you for subscribing!';
          this.newsletterEmail = '';
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.newsletterSidebarSubscribedKey, 'true');
            localStorage.setItem('user_subscribed', 'true');
          }
        } else {
          this.newsletterMessage = (res as any)?.error || 'Something went wrong.';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.newsletterMessage = 'Something went wrong. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }
}
