import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { Subscription } from 'rxjs';
import { BlogRejectModalComponent } from '../blog-reject-modal/blog-reject-modal.component';

@Component({
  selector: 'app-blog-review',
  templateUrl: './blog-review.component.html',
  styleUrls: ['./blog-review.component.scss'],
  standalone: false
})
export class BlogReviewComponent implements OnInit, OnDestroy {
  blogs: any[] = [];
  loading = true;
  loadError: string | null = null;
  private sub = new Subscription();

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private modalService: NgbModal,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Blog Review');
    this.fetchPending();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  fetchPending(): void {
    this.loading = true;
    this.loadError = null;
    this.sub.add(
      this.appService.getPendingReviewBlogs(1, 500).subscribe({
        next: (res) => {
          this.blogs = (res?.results || []).map((b: any) => ({
            id: b.id || b.Id,
            title: b.title || b.Title,
            canonicalUrl: b.canonicalUrl || b.CanonicalUrl,
            categoryName: (b.category && (b.category.name || b.category.Name)) || '—',
            authorName: b.authorName || b.AuthorName || '—',
            wordCount: b.wordCount ?? b.WordCount ?? 0,
            submittedDate: b.submittedDate ?? b.SubmittedDate ?? null,
            createdOn: b.createdOn || b.CreatedOn
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Unable to load blogs pending review.';
        }
      })
    );
  }

  approve(item: any): void {
    this.sub.add(
      this.appService.approveBlog(item.id).subscribe({
        next: () => {
          this.toasterService.showSuccess('Blog approved and published.');
          this.fetchPending();
        },
        error: () => this.toasterService.showError('Failed to approve blog.')
      })
    );
  }

  openRejectModal(item: any): void {
    const ref = this.modalService.open(BlogRejectModalComponent);
    ref.result.then(
      (reason: string) => {
        if (reason != null) {
          this.sub.add(
            this.appService.rejectBlog(item.id, reason).subscribe({
              next: () => {
                this.toasterService.showSuccess('Blog rejected. Author can edit and resubmit.');
                this.fetchPending();
              },
              error: () => this.toasterService.showError('Failed to reject blog.')
            })
          );
        }
      },
      () => {}
    );
  }
}
