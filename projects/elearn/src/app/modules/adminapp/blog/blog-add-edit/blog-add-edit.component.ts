import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';
import { Observable, firstValueFrom, of, Subscription } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { resolveAdminAppSegment } from '../../../../core/helpers/app-url.helper';
import { BlogRejectModalComponent } from '../blog-reject-modal/blog-reject-modal.component';
import { SubmitForReviewModalComponent } from '../../course/course-review/submit-for-review-modal/submit-for-review-modal.component';
import { CourseApproveModalComponent } from '../../course/course-review/course-approve-modal/course-approve-modal.component';
import { ConfirmationModalComponent } from '../../../../shared/component/confirmation-modal/confirmation-modal.component';

export interface BlogSectionModel {
  id?: string;
  title: string;
  content: string;
  sequenceNumber: number;
}

@Component({
  selector: 'app-blog-add-edit',
  templateUrl: './blog-add-edit.component.html',
  styleUrls: ['./blog-add-edit.component.scss'],
  standalone: false
})
export class BlogAddEditComponent implements OnInit, OnDestroy {

  id: string | null = null;
  private sub = new Subscription();
  title = '';
  canonicalUrl = '';
  content = '';
  metaDescription = '';
  categoryId = '';
  titleImgUrl = '';
  showOnDashboard = false;
  categories: any[] = [];
  loading = false;
  saving = false;
  txtRoute: string;
  blogSections: BlogSectionModel[] = [];

  totalWordCount = 0;
  originalContentCount = 0;
  aiGeneratedCount = 0;
  duplicateContentCount = 0;
  totalContentInstances = 0;
  /** Blog status: 0=Draft, 1=PendingReview, 2=Published, 3=Rejected. Used for trainer workflow. */
  blogStatus: number | null = null;
  /** Admin rejection reason when status = Rejected (trainer can edit and resubmit). */
  rejectionReason: string | null = null;
  submittingForReview = false;
  /** Snapshot of content when blog was loaded; used to detect edits so "Submit for Review" can be enabled when approved. */
  private contentSnapshot: { title: string; content: string; categoryId: string; canonicalUrl: string; metaDescription: string; titleImgUrl: string; showOnDashboard: boolean; sectionsJson: string } | null = null;
  /** Set true when user triggers any content change (fallback when snapshot compare misses editor updates). */
  private contentEditDetected = false;
  /** Set true after saving an approved blog so Submit for Review in sidebar stays enabled until they submit. */
  justSavedCanResubmit = false;
  @ViewChild('blogReviewSidebar') blogReviewSidebarRef: TemplateRef<any>;
  reviewSidebarModalRef: NgbModalRef;
  reviewHistoryList: { eventType: number; eventDate: string; message?: string | null }[] = [];
  reviewActionInProgress = false;

  /** Featured/header image upload in progress. */
  featuredImageUploading = false;
  /** Featured/header image delete in progress (S3 + DB). */
  featuredImageDeleting = false;
  /** Soft-delete entire blog in progress. */
  deleting = false;
  /** Header (topbar) publish/unpublish/delete in progress. */
  headerActionInProgress = false;
  /** Hide preview when URL fails to load (broken link). */
  featuredImageBroken = false;

  /** Image upload for custom editor (same API as curriculum upload). */
  uploadImageFn = (file: File) =>
    firstValueFrom(
      this.appService.uploadImage(file).pipe(
        map((res: any) => res?.url || res?.Url || res?.documentPath || '')
      )
    );

  /** Blog search for Link Builder internal links (same as pre-merge blog). */
  searchBlogsForLink = (query: string): Observable<any[]> => {
    if (!query || query.trim().length < 2) return of([]);
    return this.appService.getAdminBlogs(1, 20, { search: query.trim() }).pipe(
      map((res: any) => {
        const list = res?.results ?? res?.data ?? res?.items ?? res;
        return Array.isArray(list) ? list : [];
      }),
      catchError(() => of([]))
    );
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appService: AdminAppService,
    private sharedService: SharedService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.txtRoute = this.getAppSegmentFromRoute();
  }

  /** Derive app segment (admin | trainer | management) from current URL so post-save navigates to the same area. */
  private getAppSegmentFromRoute(): string {
    const fromRouter = resolveAdminAppSegment(this.router.url || '');
    if (fromRouter !== 'admin') {
      return fromRouter;
    }
    return resolveAdminAppSegment(this.document.location?.pathname || '');
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.sharedService.certificateName.next(this.id ? 'Edit Blog' : 'Add Blog');
    this.appService.getAdminBlogCategories().subscribe({
      next: (list) => this.categories = list || []
    });
    if (this.id) {
      // Set context immediately so topbar Review button shows (same as course page); update with real status when blog loads.
      this.sharedService.blogReviewContext.next({ blogId: this.id, status: 0 });
      this.loading = true;
      this.appService.getAdminBlogById(this.id).subscribe({
        next: (b) => {
          this.title = b?.title ?? b?.Title ?? '';
          this.canonicalUrl = b?.canonicalUrl ?? b?.CanonicalUrl ?? '';
          this.content = b?.content ?? b?.Content ?? '';
          this.metaDescription = b?.metaDescription ?? b?.MetaDescription ?? '';
          this.categoryId = (b?.categoryId ?? b?.CategoryId ?? '') ? String(b.categoryId || b.CategoryId) : '';
          this.titleImgUrl = b?.titleImgUrl ?? b?.TitleImgUrl ?? '';
          this.featuredImageBroken = false;
          this.showOnDashboard = b?.showOnDashboard ?? b?.ShowOnDashboard ?? false;
          const sections = b?.blogSections ?? b?.BlogSections ?? [];
          this.blogSections = (Array.isArray(sections) ? sections : []).map((s: any, i: number) => ({
            id: s.id || s.Id,
            title: s.title ?? s.Title ?? '',
            content: s.content ?? s.Content ?? '',
            sequenceNumber: s.sequenceNumber ?? s.SequenceNumber ?? (i + 1)
          })).sort((a: any, b: any) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          if (this.blogSections.length === 0) {
            this.blogSections = [{ title: '', content: '', sequenceNumber: 1 }];
          }
          this.blogStatus = b?.status ?? b?.Status ?? 0;
          this.rejectionReason = b?.rejectionReason ?? b?.RejectionReason ?? null;
          this.loading = false;
          this.updateWordCount();
          this.saveContentSnapshot();
          this.sharedService.blogReviewContext.next({ blogId: this.id, status: this.blogStatus ?? 0 });
          if (this.txtRoute === 'admin' && this.id && (this.blogStatus === 0 || this.blogStatus === 1)) {
            this.sharedService.topbarBlogReviewActions.next({ blogId: this.id });
          }
        },
        error: () => {
          this.loading = false;
          this.sharedService.blogReviewContext.next(null);
        }
      });
      this.sub.add(
        this.sharedService.blogReviewPanelClick$.subscribe(() => this.openReviewSidebar())
      );
      this.sub.add(
        this.sharedService.blogSubmitForReviewClick$.subscribe(() => this.submitForReview())
      );
      this.sub.add(
        this.sharedService.blogTopbarPublishClick$.subscribe(() => this.publishFromTopbar())
      );
      this.sub.add(
        this.sharedService.blogTopbarUnpublishClick$.subscribe(() => this.unpublishFromTopbar())
      );
      this.sub.add(
        this.sharedService.blogTopbarDeleteClick$.subscribe(() => this.confirmDeleteBlog())
      );
      this.sub.add(
        this.sharedService.blogReviewApproveClick$.subscribe(() => {
          if (!this.id) return;
          const ref = this.modalService.open(CourseApproveModalComponent);
          ref.result.then(
            (approvalNote: string) => {
              this.appService.approveBlog(this.id!, approvalNote || undefined).subscribe({
                next: () => {
                  this.toasterService.showSuccess('Blog approved and published.');
                  this.sharedService.topbarBlogReviewActions.next(null);
                  this.sharedService.blogReviewContext.next(null);
                  this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
                },
                error: () => this.toasterService.showError('Failed to approve blog.')
              });
            },
            () => {}
          );
        })
      );
      this.sub.add(
        this.sharedService.blogReviewRejectClick$.subscribe(() => {
          if (!this.id) return;
          const ref = this.modalService.open(BlogRejectModalComponent);
          ref.result.then(
            (reason: string) => {
              this.appService.rejectBlog(this.id!, reason ?? '').subscribe({
                next: () => {
                  this.toasterService.showSuccess('Blog rejected. Author can edit and resubmit.');
                  this.sharedService.topbarBlogReviewActions.next(null);
                  this.sharedService.blogReviewContext.next(null);
                  this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
                },
                error: () => this.toasterService.showError('Failed to reject blog.')
              });
            },
            () => {}
          );
        })
      );
    } else {
      this.sharedService.blogReviewContext.next(null);
      this.sharedService.topbarBlogReviewActions.next(null);
      this.blogSections = [{ title: '', content: '', sequenceNumber: 1 }];
    }
  }

  private sectionsToJson(): string {
    return JSON.stringify((this.blogSections || []).map(s => ({ title: s.title, content: s.content, sequenceNumber: s.sequenceNumber })));
  }

  private saveContentSnapshot(): void {
    this.contentSnapshot = {
      title: this.title,
      content: this.content,
      categoryId: this.categoryId,
      canonicalUrl: this.canonicalUrl,
      metaDescription: this.metaDescription,
      titleImgUrl: this.titleImgUrl,
      showOnDashboard: this.showOnDashboard,
      sectionsJson: this.sectionsToJson()
    };
  }

  /** True if user has edited content since load; used to enable Submit for Review when blog is already approved. */
  get hasContentEdited(): boolean {
    if (this.contentEditDetected) return true;
    if (!this.contentSnapshot) return false;
    const categoryMatch = String(this.categoryId || '') === String(this.contentSnapshot.categoryId || '');
    return !categoryMatch
      || this.title !== this.contentSnapshot.title
      || this.content !== this.contentSnapshot.content
      || this.canonicalUrl !== this.contentSnapshot.canonicalUrl
      || this.metaDescription !== this.contentSnapshot.metaDescription
      || this.titleImgUrl !== this.contentSnapshot.titleImgUrl
      || this.showOnDashboard !== this.contentSnapshot.showOnDashboard
      || this.sectionsToJson() !== this.contentSnapshot.sectionsJson;
  }

  /** Call when user edits any field so Submit for Review enables even if snapshot compare is delayed (e.g. rich text). */
  markContentEdited(): void {
    this.contentEditDetected = true;
    this.cdr.markForCheck();
  }

  onFeaturedUrlChange(_value: string): void {
    this.featuredImageBroken = false;
    this.markContentEdited();
  }

  onFeaturedFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toasterService.showError('Please choose an image file (JPEG, PNG, WebP, or GIF).');
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.toasterService.showError('Image must be 5 MB or smaller.');
      return;
    }
    this.featuredImageUploading = true;
    this.featuredImageBroken = false;
    this.appService.uploadImage(file).pipe(
      finalize(() => {
        this.featuredImageUploading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res: any) => {
        const url = res?.url ?? res?.Url ?? res?.documentPath ?? '';
        if (url) {
          this.titleImgUrl = typeof url === 'string' ? url : String(url);
          this.markContentEdited();
        } else {
          this.toasterService.showError('Upload finished but no image URL was returned.');
        }
      },
      error: () => this.toasterService.showError('Failed to upload image. Check your connection and try again.')
    });
  }

  /**
   * Clear header image: save null TitleImgUrl to DB first (so removal always works even if S3 delete fails).
   * S3 delete is best-effort (may fail without DeleteImage permission or for non-bucket URLs).
   */
  deleteFeaturedImage(): void {
    const urlToDelete = (this.titleImgUrl || '').trim();
    if (!urlToDelete) {
      this.featuredImageBroken = false;
      return;
    }
    if (this.featuredImageUploading || this.featuredImageDeleting) return;

    this.featuredImageDeleting = true;
    this.cdr.markForCheck();

    const clearUi = () => {
      this.titleImgUrl = '';
      this.featuredImageBroken = false;
      this.markContentEdited();
    };

    const finishDeleting = () => {
      this.featuredImageDeleting = false;
      this.cdr.markForCheck();
    };

    /** Best-effort S3 removal — must not block UI/DB success. */
    const tryDeleteFromStorage = () => {
      this.appService.deleteImage(urlToDelete).pipe(catchError(() => of(null))).subscribe();
    };

    // Draft not saved yet: only clear local state; still try storage delete for uploaded URLs.
    if (!this.id) {
      clearUi();
      tryDeleteFromStorage();
      this.toasterService.showSuccess('Image removed.');
      finishDeleting();
      return;
    }

    const body = this.buildSaveBody();
    if (!body) {
      this.toasterService.showError('Title, URL slug and Category are required.');
      finishDeleting();
      return;
    }
    body.titleImgUrl = null;
    this.appService.updateBlog(this.id, body as any).subscribe({
      next: () => {
        clearUi();
        this.toasterService.showSuccess('Header image removed.');
        this.saveContentSnapshot();
        tryDeleteFromStorage();
        finishDeleting();
      },
      error: () => {
        this.toasterService.showError('Failed to remove image from blog. Please try again.');
        finishDeleting();
      }
    });
  }

  onContentChange(): void {
    this.markContentEdited();
    this.updateWordCount();
  }

  onSectionContentChange(): void {
    this.markContentEdited();
    this.updateWordCount();
  }

  countWordsInHtml(html: string): number {
    if (!html) return 0;
    const text = this.stripHtmlTags(html);
    const words = text.trim().replace(/\s+/g, ' ').split(' ').filter(w => w.length > 0);
    return words.length;
  }

  stripHtmlTags(html: string): string {
    if (!html) return '';
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = html;
      return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
    }
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  updateWordCount(): void {
    let total = this.countWordsInHtml(this.content);
    (this.blogSections || []).forEach(s => {
      total += this.countWordsInHtml(s.content || '');
    });
    this.totalWordCount = total;
    this.updateContentOriginalitySummary();
  }

  updateContentOriginalitySummary(): void {
    let original = 0, aiGenerated = 0, duplicate = 0;
    const allContent: string[] = [];

    const mainText = this.stripHtmlTags(this.content || '');
    if (mainText.trim().length > 10) allContent.push(mainText);

    (this.blogSections || []).forEach(s => {
      const text = this.stripHtmlTags(s.content || '');
      if (text.trim().length > 10) allContent.push(text);
    });

    allContent.forEach((text, idx) => {
      const result = this.detectContentType(text, allContent, idx);
      if (result === 'ai-generated') aiGenerated += 1;
      else if (result === 'duplicate') duplicate += 1;
      else original += 1;
    });

    this.originalContentCount = original;
    this.aiGeneratedCount = aiGenerated;
    this.duplicateContentCount = duplicate;
    this.totalContentInstances = original + aiGenerated + duplicate;
  }

  private detectContentType(content: string, allContent: string[], currentIndex: number): 'original' | 'ai-generated' | 'duplicate' {
    for (let i = 0; i < allContent.length; i++) {
      if (i !== currentIndex && this.calculateSimilarity(content, allContent[i]) > 0.8) {
        return 'duplicate';
      }
    }
    if (this.detectAIPatterns(content)) return 'ai-generated';
    return 'original';
  }

  private detectAIPatterns(content: string): boolean {
    const text = content.toLowerCase();
    const aiPatterns = [
      /(?:^|\s)(?:in conclusion|furthermore|moreover|additionally|it is important to note)(?:\s|$)/gi,
      /(?:^|\s)(?:one must|it is imperative|it is crucial|it is essential)(?:\s|$)/gi,
      /(?:^|\s)(?:in order to|with the aim of|for the purpose of)(?:\s|$)/gi
    ];
    let patternCount = 0;
    aiPatterns.forEach(p => { const m = text.match(p); if (m) patternCount += m.length; });
    const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
    if (totalWords < 1) return false;
    if (patternCount / totalWords > 0.05 && patternCount >= 3) return true;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 5) {
      const lengths = sentences.map(s => s.trim().length);
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((s, len) => s + Math.pow(len - avg, 2), 0) / lengths.length;
      if (Math.sqrt(variance) < avg * 0.3 && avg > 50) return true;
    }
    const pronouns = (text.match(/\b(i|me|my|we|us|our|you|your)\b/gi) || []).length;
    if (pronouns / totalWords < 0.01 && totalWords > 200) return true;
    return false;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    const norm = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const w1 = new Set(norm(text1).split(/\s+/).filter(w => w.length > 2));
    const w2 = new Set(norm(text2).split(/\s+/).filter(w => w.length > 2));
    const inter = new Set([...w1].filter(x => w2.has(x)));
    const union = new Set([...w1, ...w2]);
    return union.size === 0 ? 0 : inter.size / union.size;
  }

  getOriginalPercentage(): number {
    return this.totalContentInstances === 0 ? 0 : Math.round((this.originalContentCount / this.totalContentInstances) * 100);
  }
  getAIGeneratedPercentage(): number {
    return this.totalContentInstances === 0 ? 0 : Math.round((this.aiGeneratedCount / this.totalContentInstances) * 100);
  }
  getDuplicatePercentage(): number {
    return this.totalContentInstances === 0 ? 0 : Math.round((this.duplicateContentCount / this.totalContentInstances) * 100);
  }

  addSection(): void {
    const nextSeq = this.blogSections.length + 1;
    this.blogSections.push({ title: '', content: '', sequenceNumber: nextSeq });
  }

  addSectionFromBottom(): void {
    this.addSection();
    this.markContentEdited();
    // Let Angular render the new section, then scroll near the bottom of the list.
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }, 50);
  }

  removeSection(index: number): void {
    this.blogSections.splice(index, 1);
    this.blogSections.forEach((s, i) => s.sequenceNumber = i + 1);
  }

  /** Build save payload; returns null if validation fails. */
  private buildSaveBody(): { title: string; canonicalUrl: string; content: string; metaDescription: string; categoryId: string; titleImgUrl: string | null; showOnDashboard: boolean; blogSections: any[] } | null {
    if (!this.title?.trim() || !this.canonicalUrl?.trim() || !this.categoryId) return null;
    const blogSectionsPayload = this.blogSections
      .filter(s => (s.title || '').trim() || (s.content || '').replace(/<[^>]*>/g, '').trim())
      .map((s, i) => ({
        id: s.id || undefined,
        title: (s.title || '').trim() || 'Untitled Section',
        content: s.content || '',
        sequenceNumber: i + 1
      }));
    return {
      title: this.title.trim(),
      canonicalUrl: this.canonicalUrl.trim(),
      content: this.content || '',
      metaDescription: this.metaDescription || '',
      categoryId: this.categoryId,
      titleImgUrl: this.titleImgUrl || null,
      showOnDashboard: this.showOnDashboard,
      blogSections: blogSectionsPayload
    };
  }

  save(): void {
    const body = this.buildSaveBody();
    if (!body) {
      this.toasterService.showError('Title, URL slug and Category are required.');
      return;
    }
    this.saving = true;
    if (this.id) {
      this.appService.updateBlog(this.id, body as any).subscribe({
        next: () => {
          this.saving = false;
          this.toasterService.showSuccess(this.txtRoute === 'trainer' ? 'Draft saved.' : 'Blog updated.');
          this.saveContentSnapshot();
          if (this.blogStatus === 2) this.justSavedCanResubmit = true;
          this.cdr.markForCheck();
        },
        error: () => { this.saving = false; this.toasterService.showError('Failed to update blog.'); }
      });
    } else {
      this.appService.createBlog(body).subscribe({
        next: () => {
          this.toasterService.showSuccess(this.txtRoute === 'trainer' ? 'Blog saved as draft.' : 'Blog created.');
          this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
        },
        error: () => { this.saving = false; this.toasterService.showError('Failed to create blog.'); }
      });
    }
  }

  /** Trainer: save current data then submit blog for admin review (opens modal for optional message). */
  submitForReview(): void {
    if (!this.id) return;
    if (this.blogStatus === 1) {
      this.toasterService.showSuccess('This blog is already submitted for review. Waiting for admin.');
      return;
    }
    if (this.blogStatus === 2 && !this.hasContentEdited && !this.justSavedCanResubmit) {
      this.toasterService.showSuccess('Edit content to submit for review again.');
      return;
    }
    const body = this.buildSaveBody();
    if (!body) {
      this.toasterService.showError('Title, URL slug and Category are required. Save your changes first.');
      return;
    }
    this.submittingForReview = true;
    this.cdr.markForCheck();
    this.appService.updateBlog(this.id, body as any).subscribe({
      next: () => {
        const ref = this.modalService.open(SubmitForReviewModalComponent);
        ref.result.then(
          (message: string) => {
            this.appService.submitBlogForReview(this.id!, message ?? undefined).subscribe({
              next: () => {
                this.submittingForReview = false;
                this.justSavedCanResubmit = false;
                this.toasterService.showSuccess('Blog saved and submitted for review.');
                this.blogStatus = 1;
                this.saveContentSnapshot();
                this.sharedService.blogReviewContext.next({ blogId: this.id!, status: 1 });
                this.loadReviewHistory();
                this.cdr.markForCheck();
              },
              error: () => {
                this.submittingForReview = false;
                this.toasterService.showError('Failed to submit for review.');
                this.cdr.markForCheck();
              }
            });
          },
          () => {
            this.submittingForReview = false;
            this.cdr.markForCheck();
          }
        );
      },
      error: () => {
        this.submittingForReview = false;
        this.toasterService.showError('Failed to save. Fix errors and try again.');
        this.cdr.markForCheck();
      }
    });
  }

  openReviewSidebar(): void {
    if (!this.blogReviewSidebarRef || !this.id) return;
    this.loadReviewHistory();
    this.reviewSidebarModalRef = this.modalService.open(this.blogReviewSidebarRef, {
      windowClass: 'modal-right review-sidebar-modal',
      size: 'sm',
      scrollable: true,
    });
    this.reviewSidebarModalRef.result.catch(() => {});
    this.cdr.markForCheck();
  }

  loadReviewHistory(): void {
    if (!this.id) return;
    this.sub.add(
      this.appService.getBlogReviewHistory(this.id).subscribe({
        next: (list) => {
          this.reviewHistoryList = Array.isArray(list) ? list : [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.reviewHistoryList = [];
          this.cdr.markForCheck();
        }
      })
    );
  }

  /** True when Submit for Review button in sidebar should be enabled: Draft/Rejected, or Approved and (content edited or just saved). */
  get canSubmitForReviewFromPanel(): boolean {
    if (!this.id) return false;
    if (this.blogStatus === 0 || this.blogStatus === 3) return true;
    if (this.blogStatus === 2) return this.hasContentEdited || this.justSavedCanResubmit;
    return false;
  }

  /** True when the Submit for Review section (button + hint) should be visible: existing blog and not Pending. */
  get showSubmitForReviewSection(): boolean {
    return !!this.id && this.blogStatus !== 1;
  }

  get isBlogPendingReview(): boolean {
    return this.blogStatus === 1;
  }

  get submitForReviewHint(): string {
    if (this.blogStatus === 1) return 'Already submitted for review. Waiting for admin.';
    if (this.blogStatus === 2) return 'Blog is approved. Edit content to submit for review again.';
    return '';
  }

  submitForReviewFromPanel(modal: { dismiss: (r?: string) => void }): void {
    if (!this.id) return;
    const body = this.buildSaveBody();
    if (!body) {
      this.toasterService.showError('Title, URL slug and Category are required. Save your changes first.');
      return;
    }
    this.reviewActionInProgress = true;
    this.cdr.markForCheck();
    this.appService.updateBlog(this.id, body).subscribe({
      next: () => {
        const ref = this.modalService.open(SubmitForReviewModalComponent);
        ref.result.then(
          (message: string) => {
            this.appService.submitBlogForReview(this.id!, message ?? undefined).subscribe({
              next: () => {
                this.reviewActionInProgress = false;
                this.justSavedCanResubmit = false;
                this.toasterService.showSuccess('Blog saved and submitted for review.');
                this.blogStatus = 1;
                this.saveContentSnapshot();
                this.sharedService.blogReviewContext.next({ blogId: this.id!, status: 1 });
                this.sharedService.topbarBlogReviewActions.next(null);
                this.loadReviewHistory();
                this.cdr.markForCheck();
                modal.dismiss('submitted');
              },
              error: () => {
                this.reviewActionInProgress = false;
                this.toasterService.showError('Failed to submit for review.');
                this.cdr.markForCheck();
              }
            });
          },
          () => {
            this.reviewActionInProgress = false;
            this.cdr.markForCheck();
          }
        );
      },
      error: () => {
        this.reviewActionInProgress = false;
        this.toasterService.showError('Failed to save. Fix errors and try again.');
        this.cdr.markForCheck();
      }
    });
  }

  onBlogReviewApproveFromPanel(modal: { dismiss: (r?: string) => void }): void {
    if (!this.id) return;
    const ref = this.modalService.open(CourseApproveModalComponent);
    ref.result.then(
      (approvalNote: string) => {
        this.reviewActionInProgress = true;
        this.cdr.markForCheck();
        this.appService.approveBlog(this.id!, approvalNote || undefined).subscribe({
          next: () => {
            this.reviewActionInProgress = false;
            this.toasterService.showSuccess('Blog approved and published.');
            this.sharedService.topbarBlogReviewActions.next(null);
            this.sharedService.blogReviewContext.next(null);
            this.cdr.markForCheck();
            modal.dismiss('approved');
            this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
          },
          error: () => {
            this.reviewActionInProgress = false;
            this.toasterService.showError('Failed to approve blog.');
            this.cdr.markForCheck();
          }
        });
      },
      () => {}
    );
  }

  onBlogReviewRejectFromPanel(modal: { dismiss: (r?: string) => void }): void {
    if (!this.id) return;
    const ref = this.modalService.open(BlogRejectModalComponent);
    ref.result.then(
      (reason: string) => {
        if (reason != null) {
          this.reviewActionInProgress = true;
          this.cdr.markForCheck();
          this.appService.rejectBlog(this.id!, reason ?? '').subscribe({
            next: () => {
              this.reviewActionInProgress = false;
              this.toasterService.showSuccess('Blog rejected. Author can edit and resubmit.');
              this.sharedService.topbarBlogReviewActions.next(null);
              this.blogStatus = 3;
              this.loadReviewHistory();
              this.cdr.markForCheck();
              modal.dismiss('rejected');
            },
            error: () => {
              this.reviewActionInProgress = false;
              this.toasterService.showError('Failed to reject blog.');
              this.cdr.markForCheck();
            }
          });
        }
      },
      () => {}
    );
  }

  /** True when trainer can submit: existing blog, and (Draft/Rejected or Approved with edits). */
  get canSubmitForReview(): boolean {
    if (this.txtRoute !== 'trainer' || !this.id) return false;
    if (this.blogStatus === 0 || this.blogStatus === 3) return true;
    if (this.blogStatus === 2) return this.hasContentEdited;
    return false;
  }

  ngOnDestroy(): void {
    this.sharedService.topbarBlogReviewActions.next(null);
    this.sharedService.blogReviewContext.next(null);
    this.sub.unsubscribe();
  }

  cancel(): void {
    this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
  }

  /** Delete this blog (soft-delete on server), then return to the list. */
  confirmDeleteBlog(): void {
    if (!this.id || this.deleting) return;
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Delete Blog';
    ref.componentInstance.descText =
      'Are you sure you want to delete this blog? It will be removed from the site.';
    ref.componentInstance.confirmStyle = 'danger';
    ref.componentInstance.confirmLabel = 'Delete';
    ref.result.then(
      (result) => {
        if (result !== 'ok' || !this.id) return;
        this.deleting = true;
        this.sharedService.blogTopbarBusy$.next(true);
        this.cdr.markForCheck();
        this.sub.add(
          this.appService.deleteBlog(this.id).subscribe({
            next: () => {
              this.toasterService.showSuccess('Blog deleted.');
              this.sharedService.blogTopbarBusy$.next(false);
              this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
            },
            error: () => {
              this.toasterService.showError('Failed to delete blog.');
              this.deleting = false;
              this.sharedService.blogTopbarBusy$.next(false);
              this.cdr.markForCheck();
            }
          })
        );
      },
      () => {}
    );
  }

  /** Publish blog (admin/management only) – mirrors Blog List behavior. */
  private publishFromTopbar(): void {
    if (!this.id || this.headerActionInProgress) return;
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Publish blog';
    ref.componentInstance.descText =
      (this.blogStatus ?? 0) === 1
        ? 'Approve this post and make it live on the public site?'
        : 'This post is still a draft. Publish it now and make it live on the public site?';
    ref.componentInstance.confirmStyle = 'primary';
    ref.componentInstance.confirmLabel = 'Publish';
    ref.result.then(
      (result) => {
        if (result !== 'ok' || !this.id) return;
        this.headerActionInProgress = true;
        this.sharedService.blogTopbarBusy$.next(true);
        this.cdr.markForCheck();
        this.sub.add(
          this.appService.approveBlog(this.id).subscribe({
            next: () => {
              this.toasterService.showSuccess('Blog published.');
              this.blogStatus = 2;
              this.sharedService.blogReviewContext.next({ blogId: this.id!, status: 2 });
              this.loadReviewHistory();
              this.headerActionInProgress = false;
              this.sharedService.blogTopbarBusy$.next(false);
              this.cdr.markForCheck();
            },
            error: () => {
              this.toasterService.showError('Failed to publish blog.');
              this.headerActionInProgress = false;
              this.sharedService.blogTopbarBusy$.next(false);
              this.cdr.markForCheck();
            }
          })
        );
      },
      () => {}
    );
  }

  /** Unpublish blog (admin/management only): Published → Draft. */
  private unpublishFromTopbar(): void {
    if (!this.id || this.headerActionInProgress) return;
    const ref = this.modalService.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Unpublish blog';
    ref.componentInstance.descText = 'Remove this post from the public site and move it back to Draft?';
    ref.componentInstance.confirmStyle = 'danger';
    ref.componentInstance.confirmLabel = 'Unpublish';
    ref.result.then(
      (result) => {
        if (result !== 'ok' || !this.id) return;
        this.headerActionInProgress = true;
        this.sharedService.blogTopbarBusy$.next(true);
        this.cdr.markForCheck();
        this.sub.add(
          this.appService.unpublishBlog(this.id).subscribe({
            next: () => {
              this.toasterService.showSuccess('Blog unpublished.');
              this.blogStatus = 0;
              this.sharedService.blogReviewContext.next({ blogId: this.id!, status: 0 });
              this.loadReviewHistory();
              this.headerActionInProgress = false;
              this.sharedService.blogTopbarBusy$.next(false);
              this.cdr.markForCheck();
            },
            error: () => {
              this.toasterService.showError('Failed to unpublish blog.');
              this.headerActionInProgress = false;
              this.sharedService.blogTopbarBusy$.next(false);
              this.cdr.markForCheck();
            }
          })
        );
      },
      () => {}
    );
  }
}
