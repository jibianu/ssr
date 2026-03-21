import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { Subscription } from 'rxjs';
import { CourseRejectModalComponent } from './course-reject-modal/course-reject-modal.component';
import { CourseApproveModalComponent } from './course-approve-modal/course-approve-modal.component';

@Component({
  selector: 'app-course-review',
  templateUrl: './course-review.component.html',
  styleUrls: ['./course-review.component.scss'],
  standalone: false
})
export class CourseReviewComponent implements OnInit, OnDestroy {
  courses: any[] = [];
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
    this.sharedService.certificateName.next('Course Review');
    this.fetchPending();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  fetchPending(): void {
    this.loading = true;
    this.loadError = null;
    this.sub.add(
      this.appService.getPendingReviewCourses(1, 500).subscribe({
        next: (res) => {
          this.courses = (res?.results || []).map((c: any) => ({
            id: c.id || c.Id,
            title: c.title || c.Title,
            categoryName: (c.category && (c.category.name || c.category.Name)) || '—',
            authorName: c.authorName ?? c.AuthorName ?? this.formatAuthor(c.createdByUser || c.CreatedByUser) ?? '—',
            submittedDate: c.submittedDate ?? c.SubmittedDate ?? null,
            createdOn: c.createdOn || c.CreatedOn
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Unable to load courses pending review.';
        }
      })
    );
  }

  approve(item: any): void {
    const ref = this.modalService.open(CourseApproveModalComponent);
    ref.result.then(
      (approvalNote: string) => {
        this.sub.add(
          this.appService.approveCourse(item.id, approvalNote || undefined).subscribe({
            next: () => {
              this.toasterService.showSuccess('Course approved and published.');
              this.fetchPending();
            },
            error: () => this.toasterService.showError('Failed to approve course.')
          })
        );
      },
      () => {}
    );
  }

  private formatAuthor(user: { firstName?: string; lastName?: string; FirstName?: string; LastName?: string } | null): string {
    if (!user) return '';
    const first = user.firstName ?? user.FirstName ?? '';
    const last = user.lastName ?? user.LastName ?? '';
    return [first, last].filter(Boolean).join(' ').trim() || '';
  }

  openRejectModal(item: any): void {
    const ref = this.modalService.open(CourseRejectModalComponent);
    ref.result.then(
      (reason: string) => {
        if (reason != null) {
          this.sub.add(
            this.appService.rejectCourse(item.id, reason).subscribe({
              next: () => {
                this.toasterService.showSuccess('Course rejected. Author can edit and resubmit.');
                this.fetchPending();
              },
              error: () => this.toasterService.showError('Failed to reject course.')
            })
          );
        }
      },
      () => {}
    );
  }
}
