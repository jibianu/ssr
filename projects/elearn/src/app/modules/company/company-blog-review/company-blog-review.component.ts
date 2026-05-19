import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { BlogRejectModalComponent } from '../../adminapp/blog/blog-reject-modal/blog-reject-modal.component';
import { CompanyBlogApiService } from '../company-blog-api.service';

@Component({
  selector: 'app-company-blog-review',
  templateUrl: './company-blog-review.component.html',
  styleUrls: ['./company-blog-review.component.scss'],
  standalone: true,
  imports: [CommonModule, BlogRejectModalComponent]
})
export class CompanyBlogReviewComponent implements OnInit, OnDestroy {
  blogs: any[] = [];
  loading = true;
  loadError: string | null = null;
  private sub = new Subscription();

  constructor(
    private companyBlogApi: CompanyBlogApiService,
    private sharedService: SharedService,
    private modalService: NgbModal,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Blog');
    this.fetchBlogs();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  statusLabel(status: number): string {
    switch (status) {
      case 0:
        return 'Draft';
      case 1:
        return 'Pending review';
      case 2:
        return 'Published';
      case 3:
        return 'Rejected';
      default:
        return String(status);
    }
  }

  fetchBlogs(): void {
    this.loading = true;
    this.loadError = null;
    this.sub.add(
      this.companyBlogApi.listBlogs(1, 500).subscribe({
        next: (res) => {
          this.blogs = (res?.results || []).map((b: any) => ({
            id: b.id || b.Id,
            title: b.title || b.Title,
            canonicalUrl: b.canonicalUrl || b.CanonicalUrl,
            categoryName: (b.category && (b.category.name || b.category.Name)) || '—',
            authorName: b.authorName || b.AuthorName || '—',
            wordCount: b.wordCount ?? b.WordCount ?? 0,
            status: b.status ?? b.Status ?? 0,
            submittedDate: b.submittedDate ?? b.SubmittedDate ?? null,
            publishedDate: b.publishedDate ?? b.PublishedDate ?? null,
            createdOn: b.createdOn || b.CreatedOn
          }));
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err?.status === 401 || err?.status === 404) {
            this.loadError =
              'Blog API is not available yet. Restart the API after pulling latest backend changes.';
          } else {
            this.loadError = 'Unable to load trainer blogs.';
          }
        }
      })
    );
  }

  approve(item: any): void {
    this.sub.add(
      this.companyBlogApi.publishBlog(item.id).subscribe({
        next: () => {
          this.toasterService.showSuccess('Blog published. It will appear on the public site.');
          this.fetchBlogs();
        },
        error: () => this.toasterService.showError('Failed to publish blog.')
      })
    );
  }

  openRejectModal(item: any): void {
    const ref = this.modalService.open(BlogRejectModalComponent);
    ref.result.then(
      (reason: string) => {
        if (reason != null) {
          this.sub.add(
            this.companyBlogApi.rejectBlog(item.id, reason).subscribe({
              next: () => {
                this.toasterService.showSuccess('Blog rejected. The trainer can edit and resubmit.');
                this.fetchBlogs();
              },
              error: () => this.toasterService.showError('Failed to reject blog.')
            })
          );
        }
      },
      () => {}
    );
  }

  canPublishOrReject(item: any): boolean {
    return item.status === 1;
  }
}
