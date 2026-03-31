import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent } from '../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { SearchBlogComponent } from '../../../../shared/modals/search-blog/search-blog.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { resolveAdminAppSegment } from '../../../../core/helpers/app-url.helper';

@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.scss'],
  standalone: false
})
export class BlogListComponent implements OnInit, OnDestroy {

  blogs: any[] = [];
  allBlogs: any[] = [];
  categories: any[] = [];
  loading = true;
  /** Set when blog list API fails (e.g. 401/404); show message instead of generic "No blogs found". */
  loadError: string | null = null;
  txtRoute: string;
  searchTerm = '';
  filterCategoryId = '';
  filterAuthor = '';
  /** When set (e.g. from User tab "View posts"), filter list to this author only. */
  filterAuthorId = '';
  filterDateFrom = '';
  filterDateTo = '';
  /** Blog status filter: null = all, 1 = Pending Review (trainer requested review). */
  statusFilter: number | null = null;
  searchTags: { value: string; searchBy: string }[] = [];
  private sub = new Subscription();
  /** Trainer: has Blog content permission (show Add New Blog in empty state). */
  hasBlogPermission = false;
  /** Trainer: has pending Blog permission request (show "Requested" message in empty state). */
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
    /** Show Filter button in topbar only for admin/management, not for trainer. */
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
    const authorId = this.route.snapshot.queryParams['authorId'];
    if (authorId) this.filterAuthorId = authorId;
    if (this.txtRoute === 'trainer') {
      this.appService.getMyContentPermissions().subscribe({
        next: (list) => {
          this.hasBlogPermission = (Array.isArray(list) ? list : []).some((p: string) => (p || '').toLowerCase() === 'blog');
        },
        error: () => { this.hasBlogPermission = false; }
      });
      this.appService.getMyPendingPermissionRequests().subscribe({
        next: (list) => {
          this.hasPendingBlogRequest = (Array.isArray(list) ? list : [])
            .some((r: { contentType?: string }) => (r?.contentType || '').toLowerCase() === 'blog');
        },
        error: () => { this.hasPendingBlogRequest = false; }
      });
    }
    this.fetchCategories();
    this.fetchBlogs();
  }

  ngOnDestroy(): void {
    this.sharedService.showBlogListToolbar.next(false);
    this.sharedService.topbarPrimaryAction.next(null);
    this.sub.unsubscribe();
  }

  openFilterModal(): void {
    const modalRef = this.modalService.open(SearchBlogComponent, {
      windowClass: 'modal-right search-filter-sidebar',
      scrollable: true,
      backdrop: true,
      keyboard: true
    });
    modalRef.componentInstance.categories = this.categories || [];
    modalRef.componentInstance.authorList = this.uniqueAuthors || [];
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
        this.filterAuthorId = '';
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
        this.applyFilters();
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
    this.applyFilters();
  }

  fetchCategories(): void {
    this.sub.add(
      this.appService.getAdminBlogCategories().subscribe({
        next: (list) => this.categories = list || [],
        error: () => this.categories = []
      })
    );
  }

  fetchBlogs(): void {
    this.loading = true;
    this.loadError = null;
    this.sub.add(
      this.appService.getAdminBlogs(1, 500).subscribe({
        next: (res) => {
          this.allBlogs = (res?.results || []).map((b: any) => ({
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
          }));
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          const status = err?.status;
          if (status === 401) {
            this.loadError = 'Your session may have expired. Please log in again.';
          } else if (status === 403) {
            this.loadError = 'You do not have permission to view blogs.';
          } else if (status === 404 || status === 0) {
            this.loadError = 'Blog API is not available. Check that the backend is running and the URL is correct.';
          } else {
            this.loadError = 'Unable to load blogs. Please try again later.';
          }
        }
      })
    );
  }

  get uniqueAuthors(): string[] {
    const set = new Set<string>();
    (this.allBlogs || []).forEach(b => {
      const a = (b.authorName || '').trim();
      if (a && a !== '—') set.add(a);
    });
    return Array.from(set).sort();
  }

  applyFilters(): void {
    let list = this.allBlogs || [];
    const term = (this.searchTerm || '').toLowerCase().trim();
    if (term) {
      list = list.filter(b => (b.title || '').toLowerCase().includes(term));
    }
    if (this.statusFilter != null && this.statusFilter !== undefined) {
      list = list.filter(b => (b.status ?? 0) === this.statusFilter);
    }
    if (this.filterCategoryId) {
      list = list.filter(b => String(b.categoryId) === String(this.filterCategoryId));
    }
    if (this.filterAuthorId) {
      list = list.filter(b => String(b.authorId || '') === String(this.filterAuthorId));
    }
    if (this.filterAuthor) {
      list = list.filter(b => (b.authorName || '').trim() === this.filterAuthor);
    }
    if (this.filterDateFrom) {
      const from = new Date(this.filterDateFrom);
      list = list.filter(b => new Date(b.createdOn) >= from);
    }
    if (this.filterDateTo) {
      const to = new Date(this.filterDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(b => new Date(b.createdOn) <= to);
    }
    this.blogs = list;
  }

  viewOnSite(slug: string): void {
    if (!slug) return;
    const base = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl?.replace(/\/$/, '') || this.document.location.origin;
    this.document.location.href = `${base}/${encodeURIComponent(slug)}`;
  }

  editBlog(id: string): void {
    this.router.navigate(['/app', this.txtRoute, 'blog', 'edit', id]);
  }

  /** 0=Draft, 1=PendingReview, 2=Published, 3=Rejected */
  statusLabel(item: any): string {
    const s = item?.status ?? 0;
    if (s === 1) return 'Pending Review';
    if (s === 2) return 'Published';
    if (s === 3) return 'Rejected';
    return 'Draft';
  }

  /** Admin / management: show Publish in list for Draft or Pending Review. */
  get showPublishInList(): boolean {
    return this.txtRoute === 'admin' || this.txtRoute === 'management';
  }

  canPublishFromList(item: any): boolean {
    if (!item || item.isDeleted) return false;
    const s = item.status ?? 0;
    return s === 0 || s === 1;
  }

  canUnpublishFromList(item: any): boolean {
    if (!item || item.isDeleted) return false;
    const s = item.status ?? 0;
    return s === 2;
  }

  publishBlog(item: any): void {
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
                this.fetchBlogs();
              },
              error: () => this.toasterService.showError('Failed to publish blog.')
            })
          );
        }
      },
      () => {}
    );
  }

  unpublishBlog(item: any): void {
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
                this.fetchBlogs();
              },
              error: () => this.toasterService.showError('Failed to unpublish blog.')
            })
          );
        }
      },
      () => {}
    );
  }

  deleteBlog(item: any): void {
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Delete Blog';
    ref.componentInstance.descText = 'Are you sure you want to delete this blog?';
    ref.componentInstance.confirmStyle = 'danger';
    ref.componentInstance.confirmLabel = 'Delete';
    ref.result.then(
      (result) => {
        if (result === 'ok') {
          this.sub.add(
            this.appService.deleteBlog(item.id).subscribe({
              next: () => {
                this.toasterService.showSuccess('Blog deleted.');
                // Backend does soft-delete; in the UI we remove it immediately to match user expectation.
                const id = String(item?.id ?? '');
                this.allBlogs = (this.allBlogs || []).filter((b) => String(b?.id ?? '') !== id);
                this.applyFilters();
              },
              error: () => this.toasterService.showError('Failed to delete blog.')
            })
          );
        }
      },
      () => {}
    );
  }
}
