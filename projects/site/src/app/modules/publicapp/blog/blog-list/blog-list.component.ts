import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BlogService, BlogListItemDto, PagedBlogResponse, AuthorProfileDto, AuthorSocialLinkDto } from '../blog.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.scss']
})
export class BlogListComponent implements OnInit, OnDestroy {
  private blogService = inject(BlogService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  blogs = signal<BlogListItemDto[]>([]);
  categories = signal<{ id: string; name: string }[]>([]);
  totalRecords = signal(0);
  pageNumber = signal(1);
  pageSize = 18;
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedCategory = signal('');
  selectedAuthorId = signal('');
  selectedSearch = signal('');
  placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDY4IiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDY4IiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNHB4Ij5CbG9nIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  /** Fetched author/trainer profile for "posts by author" header (display name, photo, bio, website). */
  authorProfile = signal<AuthorProfileDto | null>(null);

  totalPages = computed(() => Math.ceil((this.totalRecords() || 0) / this.pageSize) || 1);
  hasBlogs = computed(() => this.filteredBlogs().length > 0);
  categoryNames = computed(() => this.categories().map(c => c.name));
  /** When filtering by author: prefer profile display name (First + Last), else first result's authorName. Never show email as name. */
  authorFilterName = computed(() => {
    const profile = this.authorProfile();
    let name = profile?.displayName;
    if (!name && this.selectedAuthorId()) {
      const list = this.blogs();
      name = list[0]?.authorName ?? '';
    }
    if (!name) return '';
    return name.includes('@') ? name.slice(0, name.indexOf('@')).trim() || name : name;
  });
  /** Display list: when server-side search is active we show blogs() as-is; otherwise filter by local searchQuery. */
  filteredBlogs = computed(() => {
    let list = this.blogs();
    const q = (this.searchQuery() || '').toLowerCase().trim();
    const cat = (this.selectedCategory() || '').trim();
    if (cat) list = list.filter(b => (b?.category?.name || '') === cat);
    if (q) list = list.filter(b => (b?.title || '').toLowerCase().includes(q));
    return list;
  });

  ngOnInit(): void {
    this.blogService.getCategories().subscribe(list => {
      this.categories.set((list || []).map(c => ({ id: c.id, name: c.name || '' })));
    });
    this.route.queryParams.subscribe(q => {
      const page = Math.max(1, parseInt(q['page'] || '1', 10) || 1);
      const category = (q['category'] ?? '').trim();
      const authorId = (q['author'] ?? '').trim();
      const search = (q['search'] ?? '').trim();
      this.pageNumber.set(page);
      this.selectedCategory.set(category);
      this.selectedAuthorId.set(authorId);
      this.selectedSearch.set(search);
      this.searchQuery.set(search);
      this.authorProfile.set(null);
      if (authorId) {
        this.blogService.getAuthorProfile(authorId).subscribe(profile => this.authorProfile.set(profile ?? null));
      }
      this.loadPage(page, category || undefined, authorId || undefined, search || undefined);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPage(page: number, category?: string, authorId?: string, search?: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.blogService.getBlogs(page, this.pageSize, category, authorId, search).subscribe({
      next: (res: PagedBlogResponse) => {
        const raw = res.results || [];
        this.blogs.set(raw.map((item: any) => ({
          ...item,
          authorId: item.authorId ?? item.AuthorId ?? undefined,
        })));
        this.totalRecords.set(res.totalNumberOfRecords || 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load blogs');
        this.loading.set(false);
      }
    });
  }

  retryLoad(): void {
    this.loadPage(
      this.pageNumber(),
      this.selectedCategory() || undefined,
      this.selectedAuthorId() || undefined,
      this.selectedSearch() || undefined
    );
  }

  pageChange(page: number): void {
    this.applyFilters({ page });
  }

  private applyFilters(overrides: { page?: number; category?: string; author?: string; search?: string } = {}): void {
    const page = overrides.page ?? this.pageNumber();
    const cat = overrides.category !== undefined ? overrides.category : this.selectedCategory();
    const authorId = overrides.author !== undefined ? overrides.author : this.selectedAuthorId();
    const search = overrides.search !== undefined ? overrides.search : this.selectedSearch();
    const q: Record<string, string | number> = { page };
    if (cat) q['category'] = cat;
    if (authorId) q['author'] = authorId;
    if (search) q['search'] = search;
    this.router.navigate([], { queryParams: q, queryParamsHandling: '' });
  }

  trackByBlogId(_i: number, b: BlogListItemDto): string {
    return b?.id || '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getBlogRoute(slug: string): string {
    return slug ? `/${encodeURIComponent(slug)}` : '/blog';
  }

  /** Show only user name (part before @); never full email as author label. */
  getAuthorDisplayName(name: string | null | undefined): string {
    if (!name) return '';
    return name.includes('@') ? name.slice(0, name.indexOf('@')).trim() || name : name;
  }

  /** Normalize link from API (camelCase or PascalCase). */
  private normLink(l: any): { platform: string; url: string } {
    const url = (l?.url ?? l?.Url ?? '').trim();
    const platform = (l?.platform ?? l?.Platform ?? '').trim() || 'Other';
    return { platform, url };
  }

  /** Raw social links array from profile (handles camelCase and PascalCase from API). */
  private getAuthorSocialLinksRaw(): { platform: string; url: string }[] {
    const p = this.authorProfile();
    const links = p?.socialLinks ?? (p as any)?.SocialLinks ?? (p as any)?.socialLinks;
    if (!Array.isArray(links)) return [];
    return links.map((l: any) => this.normLink(l)).filter(l => l.url.length > 0);
  }

  /** True if author has email, website, or any social link to show. */
  hasAuthorSocialLinks(): boolean {
    const p = this.authorProfile();
    if (!p) return false;
    if ((p.email ?? (p as any).Email ?? '').toString().trim()) return true;
    if ((p.website ?? (p as any).Website ?? '').toString().trim()) return true;
    return this.getAuthorSocialLinksRaw().length > 0;
  }

  /** Social links with non-empty URL for template (platform + url). */
  getAuthorSocialLinks(): { platform: string; url: string }[] {
    return this.getAuthorSocialLinksRaw();
  }

  /** Whether socialLinks array already contains this URL (avoid duplicating website). */
  hasSocialLinkWithUrl(url: string): boolean {
    const u = (url ?? '').trim();
    if (!u) return false;
    return this.getAuthorSocialLinksRaw().some(l => l.url === u);
  }

  /** Email from profile (camelCase or PascalCase). */
  authorEmail(): string {
    const p = this.authorProfile();
    return (p?.email ?? (p as any)?.Email ?? '').toString().trim() || '';
  }

  /** Website from profile (camelCase or PascalCase). */
  authorWebsite(): string {
    const p = this.authorProfile();
    return (p?.website ?? (p as any)?.Website ?? '').toString().trim() || '';
  }

  /** Font Awesome icon class: prefer URL to pick icon so LinkedIn URL always shows LinkedIn button. */
  getSocialIconClass(platform: string, url?: string): string {
    const u = (url ?? '').toLowerCase();
    if (u.includes('linkedin.com')) return 'fa fa-linkedin';
    if (u.includes('facebook.com') || u.includes('fb.com')) return 'fa fa-facebook';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'fa fa-youtube-play';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'fa fa-twitter';
    const p = (platform ?? '').toLowerCase();
    if (p === 'facebook') return 'fa fa-facebook';
    if (p === 'linkedin') return 'fa fa-linkedin';
    if (p === 'youtube') return 'fa fa-youtube-play';
    if (p === 'x' || p === 'twitter') return 'fa fa-twitter';
    if (p === 'website') return 'fa fa-globe';
    return 'fa fa-link';
  }

  onImgError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el) el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDY4IiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDY4IiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QmxvZyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  onSearchChangeValue(value: string): void {
    this.searchQuery.set(value ?? '');
    this.debouncedSearch(value ?? '');
  }

  /** Debounced: update URL with search term so server-side search runs. */
  private searchSubject = new Subject<string>();
  private debouncedSearch(value: string): void {
    this.searchSubject.next(value.trim());
  }

  constructor() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.selectedSearch.set(term);
      this.applyFilters({ search: term, page: 1 });
    });
  }

  onCategoryFilterChange(value: string): void {
    const cat = (value ?? '').trim();
    this.selectedCategory.set(cat);
    this.applyFilters({ category: cat, page: 1 });
  }
}
