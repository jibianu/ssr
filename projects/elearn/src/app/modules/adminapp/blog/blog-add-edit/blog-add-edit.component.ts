import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
export class BlogAddEditComponent implements OnInit {

  id: string | null = null;
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
    return this.appService.getAdminBlogs(1, 20, query.trim()).pipe(
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
    @Inject(DOCUMENT) private document: Document
  ) {
    this.txtRoute = this.getAppSegmentFromRoute();
  }

  /** Derive app segment (admin | trainer | management) from current URL so post-save navigates to the same area. */
  private getAppSegmentFromRoute(): string {
    const url = this.router.url;
    const segments = url.split('/').filter(Boolean);
    const appIndex = segments.indexOf('app');
    if (appIndex >= 0 && segments.length > appIndex + 1) {
      const segment = segments[appIndex + 1];
      if (segment === 'admin' || segment === 'trainer' || segment === 'management') {
        return segment;
      }
    }
    return this.document.location.href.includes('management') ? 'management' : (this.document.location.href.includes('trainer') ? 'trainer' : 'admin');
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.sharedService.certificateName.next(this.id ? 'Edit Blog' : 'Add Blog');
    this.appService.getAdminBlogCategories().subscribe({
      next: (list) => this.categories = list || []
    });
    if (this.id) {
      this.loading = true;
      this.appService.getAdminBlogById(this.id).subscribe({
        next: (b) => {
          this.title = b?.title ?? b?.Title ?? '';
          this.canonicalUrl = b?.canonicalUrl ?? b?.CanonicalUrl ?? '';
          this.content = b?.content ?? b?.Content ?? '';
          this.metaDescription = b?.metaDescription ?? b?.MetaDescription ?? '';
          this.categoryId = (b?.categoryId ?? b?.CategoryId ?? '') ? String(b.categoryId || b.CategoryId) : '';
          this.titleImgUrl = b?.titleImgUrl ?? b?.TitleImgUrl ?? '';
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
        },
        error: () => this.loading = false
      });
    } else {
      this.blogSections = [{ title: '', content: '', sequenceNumber: 1 }];
    }
  }

  onContentChange(): void {
    this.updateWordCount();
  }

  onSectionContentChange(): void {
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

  removeSection(index: number): void {
    this.blogSections.splice(index, 1);
    this.blogSections.forEach((s, i) => s.sequenceNumber = i + 1);
  }

  save(): void {
    if (!this.title?.trim() || !this.canonicalUrl?.trim() || !this.categoryId) {
      this.toasterService.showError('Title, URL slug and Category are required.');
      return;
    }
    const blogSectionsPayload = this.blogSections
      .filter(s => (s.title || '').trim() || (s.content || '').replace(/<[^>]*>/g, '').trim())
      .map((s, i) => ({
        id: s.id || undefined,
        title: (s.title || '').trim() || 'Untitled Section',
        content: s.content || '',
        sequenceNumber: i + 1
      }));
    const body = {
      title: this.title.trim(),
      canonicalUrl: this.canonicalUrl.trim(),
      content: this.content || '',
      metaDescription: this.metaDescription || '',
      categoryId: this.categoryId,
      titleImgUrl: this.titleImgUrl || null,
      showOnDashboard: this.showOnDashboard,
      blogSections: blogSectionsPayload
    };
    this.saving = true;
    if (this.id) {
      this.appService.updateBlog(this.id, body).subscribe({
        next: () => {
          this.toasterService.showSuccess(this.txtRoute === 'trainer' ? 'Draft saved.' : 'Blog updated.');
          this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
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

  /** Trainer: submit blog for admin review. Only for Draft (0) or Rejected (3). */
  submitForReview(): void {
    if (!this.id) return;
    if (this.blogStatus !== 0 && this.blogStatus !== 3) {
      this.toasterService.showSuccess('This blog is already submitted or published.');
      return;
    }
    this.submittingForReview = true;
    this.appService.submitBlogForReview(this.id).subscribe({
      next: () => {
        this.toasterService.showSuccess('Blog submitted for review.');
        this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
      },
      error: () => {
        this.submittingForReview = false;
        this.toasterService.showError('Failed to submit for review.');
      }
    });
  }

  /** True when trainer can show "Submit for Review" (existing blog in Draft or Rejected). */
  get canSubmitForReview(): boolean {
    return this.txtRoute === 'trainer' && !!this.id && (this.blogStatus === 0 || this.blogStatus === 3);
  }

  cancel(): void {
    this.router.navigate(['/app', this.txtRoute, 'blog', 'list']);
  }
}
