import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { DOCUMENT } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent } from '../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { SearchBlogComponent } from '../../../../shared/modals/search-blog/search-blog.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { resolveAdminAppSegment } from '../../../../core/helpers/app-url.helper';

interface BlogListItem {
  id: string;
  title: string;
  canonicalUrl: string;
  categoryId: string;
  categoryName: string;
  authorId: string | null;
  authorName: string;
  wordCount: number;
  createdOn: string;
  updatedOn: string;
  isDeleted: boolean;
  status: number;
  submittedDate: string | null;
  publishedDate: string | null;
  rejectionReason: string | null;
}

interface BlogListStats {
  total: number;
  published: number;
  drafts: number;
  unpublished: number;
}

@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.scss'],
  standalone: false
})
export class BlogListComponent implements OnInit, OnDestroy {

  blogs: BlogListItem[] = [];
  categories: any[] = [];
  authors: { id: string; name: string }[] = [];
  authorList: string[] = [];
  loading = true;
  loadError: string | null = null;
  txtRoute: string;

  searchTerm = '';
  filterCategoryId = '';
  filterAuthor = '';
  filterAuthorId = '';
  filterDateFrom = '';
  filterDateTo = '';
  statusFilter: number | null = null;
  searchTags: { value: string; searchBy: string }[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizeOptions = [10, 25, 50, 100];

  stats: BlogListStats | null = null;

  readonly statusOptions = [
    { value: null, label: 'All Status' },
    { value: 0, label: 'Draft' },
    { value: 1, label: 'Pending Review' },
    { value: 2, label: 'Published' },
    { value: 3, label: 'Rejected' }
  ];

  private sub = new Subscription();
  private searchInput$ = new Subject<string>();
  private loadRequest$ = new Subject<void>();
  private syncingFromQuery = false;

  hasBlogPermission = false;
  hasPendingBlogRequest = false;

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Blog List');
    this.txtRoute = resolveAdminAppSegment(this.document.location?.pathname || '');
    this.sharedService.showBlogListToolbar.next(this.txtRoute !== 'trainer');
    this.sub.add(
      this.sharedService.blogListFilterClick$.subscribe(() => this.openFilterModal())
    );
    this.sharedService.topbarPrimaryAction.next({
      routerLink: `/app/${this.txtRoute}/blog/add`,
      label: 'Add Blog',
      icon: 'fa-plus',
      ...(this.txtRoute === 'trainer' ? { contentType: 'Blog' as const } : {})
    });

    this.setupSearchDebounce();
    this.setupLoadPipeline();

    if (this.txtRoute === 'trainer') {
      this.sub.add(
        this.appService.getMyContentPermissions().subscribe({
          next: (list) => {
            this.hasBlogPermission = (Array.isArray(list) ? list : []).some((p: string) => (p || '').toLowerCase() === 'blog');
          },
          error: () => { this.hasBlogPermission = false; }
        })
      );
      this.sub.add(
        this.appService.getMyPendingPermissionRequests().subscribe({
          next: (list) => {
            this.hasPendingBlogRequest = (Array.isArray(list) ? list : [])
              .some((r: { contentType?: string }) => (r?.contentType || '').toLowerCase() === 'blog');
          },
          error: () => { this.hasPendingBlogRequest = false; }
        })
      );
    }

    this.fetchCategories();
    this.fetchAuthors();

    this.sub.add(
      this.route.queryParams.subscribe((params) => {
        this.readStateFromQueryParams(params);
        this.loadBlogs();
      })
    );
  }

  ngOnDestroy(): void {
    this.sharedService.showBlogListToolbar.next(false);
    this.sharedService.topbarPrimaryAction.next(null);
    this.searchInput$.complete();
    this.loadRequest$.complete();
    this.sub.unsubscribe();
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 0;
    return Math.max(0, Math.ceil(this.totalItems / this.pageSize));
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm?.trim() || this.filterCategoryId || this.statusFilter != null ||
      this.filterAuthor || this.filterAuthorId || this.filterDateFrom || this.filterDateTo);
  }

  get isEmptyWithoutFilters(): boolean {
    return !this.loading && !this.loadError && this.totalItems === 0 && !this.hasActiveFilters;
  }

  get isEmptyWithFilters(): boolean {
    return !this.loading && !this.loadError && this.blogs.length === 0 && this.hasActiveFilters;
  }

  private setupSearchDebounce(): void {
    this.sub.add(
      this.searchInput$.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe((term) => {
        this.searchTerm = term;
        this.pageNumber = 1;
        this.syncQueryParams();
      })
    );
  }

  private setupLoadPipeline(): void {
    this.sub.add(
      this.loadRequest$.pipe(
        tap(() => {
          this.loading = true;
          this.loadError = null;
        }),
        switchMap(() =>
          this.appService.getAdminBlogs(this.pageNumber, this.pageSize, {
            search: this.searchTerm,
            categoryId: this.filterCategoryId || undefined,
            status: this.statusFilter,
            authorId: this.resolveAuthorFilterId(),
            dateFrom: this.filterDateFrom || undefined,
            dateTo: this.filterDateTo || undefined
          }).pipe(
            finalize(() => { this.loading = false; })
          )
        )
      ).subscribe({
        next: (res) => this.handleLoadSuccess(res),
        error: (err) => this.handleLoadError(err)
      })
    );
  }

  private readStateFromQueryParams(params: Record<string, string>): void {
    this.syncingFromQuery = true;
    this.pageNumber = Math.max(1, Number(params['page']) || 1);
    this.pageSize = this.pageSizeOptions.includes(Number(params['pageSize']))
      ? Number(params['pageSize'])
      : 10;
    this.searchTerm = params['search'] || '';
    this.filterCategoryId = params['categoryId'] || '';
    this.statusFilter = params['status'] != null && params['status'] !== ''
      ? Number(params['status'])
      : null;
    if (Number.isNaN(this.statusFilter)) this.statusFilter = null;
    this.filterAuthorId = params['authorId'] || '';
    this.filterDateFrom = params['dateFrom'] || '';
    this.filterDateTo = params['dateTo'] || '';
    this.syncingFromQuery = false;
  }

  private syncQueryParams(): void {
    if (this.syncingFromQuery) return;
    const queryParams: Record<string, string | number | null> = {
      page: this.pageNumber > 1 ? this.pageNumber : null,
      pageSize: this.pageSize !== 10 ? this.pageSize : null,
      search: this.searchTerm?.trim() || null,
      categoryId: this.filterCategoryId || null,
      status: this.statusFilter != null ? this.statusFilter : null,
      authorId: this.filterAuthorId || null,
      dateFrom: this.filterDateFrom || null,
      dateTo: this.filterDateTo || null
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loadBlogs(): void {
    this.loadRequest$.next();
  }

  private resolveAuthorFilterId(): string | undefined {
    if (this.filterAuthorId) return this.filterAuthorId;
    if (this.filterAuthor) {
      const match = this.authors.find((a) => a.name === this.filterAuthor);
      return match?.id;
    }
    return undefined;
  }

  private handleLoadSuccess(res: any): void {
    const total = res?.totalNumberOfRecords ?? 0;
    const totalPages = this.pageSize > 0 ? Math.ceil(total / this.pageSize) : 0;
    if (totalPages > 0 && this.pageNumber > totalPages) {
      this.pageNumber = totalPages;
      this.syncQueryParams();
      this.loadBlogs();
      return;
    }
    if (total === 0 && this.pageNumber > 1) {
      this.pageNumber = 1;
      this.syncQueryParams();
      this.loadBlogs();
      return;
    }

    this.totalItems = total;
    this.blogs = (res?.results || []).map((b: any) => this.normalizeBlog(b));

    const s = res?.stats;
    if (s) {
      this.stats = {
        total: s.total ?? s.Total ?? 0,
        published: s.published ?? s.Published ?? 0,
        drafts: s.drafts ?? s.Drafts ?? 0,
        unpublished: s.unpublished ?? s.Unpublished ?? 0
      };
    }
  }

  private handleLoadError(err: any): void {
    this.blogs = [];
    const status = err?.status;
    if (status === 401) {
      this.loadError = 'Your session may have expired. Please log in again.';
    } else if (status === 403) {
      this.loadError = 'You do not have permission to view blogs.';
    } else if (status === 404 || status === 0) {
      this.loadError = 'Blog API is not available. Check that the backend is running and the URL is correct.';
    } else {
      this.loadError = 'Unable to load blogs. Please try again.';
    }
  }

  private normalizeBlog(b: any): BlogListItem {
    return {
      id: b.id || b.Id,
      title: b.title || b.Title,
      canonicalUrl: b.canonicalUrl || b.CanonicalUrl,
      categoryId: (b.category && (b.category.id || b.category.Id)) || '',
      categoryName: (b.category && (b.category.name || b.category.Name)) || '—',
      authorId: b.authorId ?? b.AuthorId ?? null,
      authorName: b.authorName || b.AuthorName || '—',
      wordCount: b.wordCount ?? b.WordCount ?? 0,
      createdOn: b.createdOn || b.CreatedOn,
      updatedOn: b.updatedOn || b.UpdatedOn,
      isDeleted: b.isDeleted ?? b.IsDeleted ?? false,
      status: b.status ?? b.Status ?? 0,
      submittedDate: b.submittedDate ?? b.SubmittedDate ?? null,
      publishedDate: b.publishedDate ?? b.PublishedDate ?? null,
      rejectionReason: b.rejectionReason ?? b.RejectionReason ?? null
    };
  }

  fetchCategories(): void {
    this.sub.add(
      this.appService.getAdminBlogCategories().subscribe({
        next: (list) => this.categories = list || [],
        error: () => this.categories = []
      })
    );
  }

  fetchAuthors(): void {
    this.sub.add(
      this.appService.getBlogAuthors().subscribe({
        next: (list) => {
          this.authors = (list || [])
            .map((a: { id?: string; Id?: string; name?: string; Name?: string }) => ({
              id: String(a.id || a.Id || ''),
              name: (a.name || a.Name || '').trim()
            }))
            .filter((a) => !!a.id && !!a.name);
          this.authorList = this.authors.map((a) => a.name).sort();
        },
        error: () => {
          this.authors = [];
          this.authorList = [];
        }
      })
    );
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value ?? '');
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    const term = (this.searchTerm || '').trim();
    this.searchTerm = term;
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  onSearchEscape(): void {
    if (!this.searchTerm) return;
    this.searchTerm = '';
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  onCategoryChange(categoryId: string): void {
    this.filterCategoryId = categoryId || '';
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  onStatusChange(value: string): void {
    this.statusFilter = value === '' || value == null ? null : Number(value);
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  applyToolbarFilters(): void {
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterCategoryId = '';
    this.filterAuthor = '';
    this.filterAuthorId = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.statusFilter = null;
    this.searchTags = [];
    this.pageNumber = 1;
    this.pageSize = 10;
    this.syncQueryParams();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.syncQueryParams();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  openFilterModal(): void {
    const modalRef = this.modalService.open(SearchBlogComponent, {
      windowClass: 'modal-right search-filter-sidebar',
      scrollable: true,
      backdrop: true,
      keyboard: true
    });
    modalRef.componentInstance.categories = this.categories || [];
    modalRef.componentInstance.authorList = this.authorList || [];
    modalRef.componentInstance.setInitialStatusFilter(this.statusFilter);
    modalRef.componentInstance.initialCategoryId = this.filterCategoryId || null;
    modalRef.componentInstance.initialCategoryName = this.categories?.find(
      (c: any) => String(c.id || c.Id) === String(this.filterCategoryId)
    )?.name ?? this.filterCategoryId ?? null;
    modalRef.componentInstance.initialAuthorName = this.filterAuthor || null;
    modalRef.componentInstance.initialDateFrom = this.filterDateFrom || null;
    modalRef.componentInstance.initialDateTo = this.filterDateTo || null;
    modalRef.componentInstance.setInitialFilters();
    modalRef.result.then(
      (result: { statusFilter?: number | null; statusLabel?: string | null; categoryId?: string | null; categoryName?: string | null; authorName?: string | null; dateFrom?: string | null; dateTo?: string | null }) => {
        this.statusFilter = result.statusFilter ?? null;
        this.filterCategoryId = result.categoryId ?? '';
        this.filterAuthor = result.authorName ?? '';
        if (result.authorName) {
          const match = this.authors.find((a) => a.name === result.authorName);
          this.filterAuthorId = match?.id ?? '';
        } else {
          this.filterAuthorId = '';
        }
        this.filterDateFrom = result.dateFrom ?? '';
        this.filterDateTo = result.dateTo ?? '';
        this.searchTags = [];
        if (result.statusLabel) {
          this.searchTags.push({ value: result.statusLabel, searchBy: 'status' });
        }
        if (result.categoryName) {
          this.searchTags.push({ value: result.categoryName, searchBy: 'categoryName' });
        }
        if (result.authorName) {
          this.searchTags.push({ value: result.authorName, searchBy: 'authorName' });
        }
        if (result.dateFrom) {
          this.searchTags.push({ value: result.dateFrom, searchBy: 'dateFrom' });
        }
        if (result.dateTo) {
          this.searchTags.push({ value: result.dateTo, searchBy: 'dateTo' });
        }
        this.pageNumber = 1;
        this.syncQueryParams();
      },
      () => {}
    );
  }

  onFilterTagRemoved(tag: { searchBy: string }): void {
    if (tag.searchBy === 'status') {
      this.statusFilter = null;
    } else if (tag.searchBy === 'categoryName') {
      this.filterCategoryId = '';
    } else if (tag.searchBy === 'authorName') {
      this.filterAuthor = '';
      this.filterAuthorId = '';
    } else if (tag.searchBy === 'dateFrom') {
      this.filterDateFrom = '';
    } else if (tag.searchBy === 'dateTo') {
      this.filterDateTo = '';
    }
    this.searchTags = this.searchTags.filter((t) => t.searchBy !== tag.searchBy);
    this.pageNumber = 1;
    this.syncQueryParams();
  }

  viewOnSite(slug: string, event?: Event): void {
    event?.stopPropagation();
    if (!slug) return;
    const base = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl?.replace(/\/$/, '') || this.document.location.origin;
    window.open(`${base}/${encodeURIComponent(slug)}`, '_blank', 'noopener');
  }

  copyUrl(slug: string, event: Event): void {
    event.stopPropagation();
    if (!slug) return;
    navigator.clipboard?.writeText(slug).then(
      () => this.toasterService.showSuccess('URL copied to clipboard.'),
      () => this.toasterService.showError('Unable to copy URL.')
    );
  }

  editBlog(id: string, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/app', this.txtRoute, 'blog', 'edit', id]);
  }

  statusLabel(item: BlogListItem): string {
    const s = item?.status ?? 0;
    if (s === 1) return 'Pending Review';
    if (s === 2) return 'Published';
    if (s === 3) return 'Rejected';
    return 'Draft';
  }

  statusBadgeClass(item: BlogListItem): string {
    const s = item?.status ?? 0;
    if (s === 2) return 'blog-list__status--published';
    if (s === 0) return 'blog-list__status--draft';
    if (s === 1) return 'blog-list__status--pending';
    return 'blog-list__status--rejected';
  }

  get showPublishInList(): boolean {
    return this.txtRoute === 'admin' || this.txtRoute === 'management';
  }

  canPublishFromList(item: BlogListItem): boolean {
    if (!item || item.isDeleted) return false;
    const s = item.status ?? 0;
    return s === 0 || s === 1;
  }

  canUnpublishFromList(item: BlogListItem): boolean {
    if (!item || item.isDeleted) return false;
    return (item.status ?? 0) === 2;
  }

  publishBlog(item: BlogListItem, event: Event): void {
    event.stopPropagation();
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Publish blog';
    ref.componentInstance.descText =
      (item?.status ?? 0) === 1
        ? 'Approve this post and make it live on the public site?'
        : 'This post is still a draft. Publish it now and make it live on the public site?';
    ref.componentInstance.confirmStyle = 'primary';
    ref.componentInstance.confirmLabel = 'Publish';
    ref.result.then(
      (result) => {
        if (result === 'ok') {
          this.sub.add(
            this.appService.approveBlog(item.id).subscribe({
              next: () => {
                this.toasterService.showSuccess('Blog published.');
                this.loadBlogs();
              },
              error: () => this.toasterService.showError('Failed to publish blog.')
            })
          );
        }
      },
      () => {}
    );
  }

  unpublishBlog(item: BlogListItem, event: Event): void {
    event.stopPropagation();
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Unpublish blog';
    ref.componentInstance.descText = 'Remove this post from the public site and move it back to Draft?';
    ref.componentInstance.confirmStyle = 'danger';
    ref.componentInstance.confirmLabel = 'Unpublish';
    ref.result.then(
      (result) => {
        if (result === 'ok') {
          this.sub.add(
            this.appService.unpublishBlog(item.id).subscribe({
              next: () => {
                this.toasterService.showSuccess('Blog unpublished.');
                this.loadBlogs();
              },
              error: () => this.toasterService.showError('Failed to unpublish blog.')
            })
          );
        }
      },
      () => {}
    );
  }

  deleteBlog(item: BlogListItem, event: Event): void {
    event.stopPropagation();
    const title = (item?.title || 'this blog').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Delete Blog?';
    ref.componentInstance.descText =
      `Are you sure you want to delete<br><strong>"${title}"</strong>?<br><br>This action cannot be undone.`;
    ref.componentInstance.confirmStyle = 'danger';
    ref.componentInstance.confirmLabel = 'Delete';
    ref.result.then(
      (result) => {
        if (result === 'ok') {
          this.sub.add(
            this.appService.deleteBlog(item.id).subscribe({
              next: () => {
                this.toasterService.showSuccess('Blog deleted.');
                if (this.blogs.length === 1 && this.pageNumber > 1) {
                  this.pageNumber--;
                  this.syncQueryParams();
                }
                this.loadBlogs();
              },
              error: () => this.toasterService.showError('Unable to delete blog.')
            })
          );
        }
      },
      () => {}
    );
  }
}
