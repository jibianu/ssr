import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { InviteUserComponent } from 'src/app/shared/component/invite-user/invite-user.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { Location } from '@angular/common';
import { ChangeProgressComponent } from 'src/app/shared/modals/change-progress/change-progress.component';
import { PublishCourseModalComponent } from 'src/app/shared/modals/publish-course/publish-course-modal.component';

@Component({
  selector: 'app-company-dashboard',
  templateUrl: './company-dashboard.component.html',
  styleUrls: ['./company-dashboard.component.scss'],
  standalone: false,
})
export class ComapanyDashboardComponent implements OnInit, OnDestroy {
  course: any[] = [];
  students = [];
  page = 1;
  page_std = 1;
  count: number;
  count_std: number;
  tableSize = 50;
  searchTitle = '';
  tableSizes = [10, 20, 50, 100];
  subscription: Subscription = new Subscription();
  sortBy = 'Title';
  isAsc = true;
  tab = 'c';
  coursesLoading = false;

  constructor(
    private readonly appService: AdminAppService,
    private readonly modalService: NgbModal,
    private readonly toasterService: ToasterService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.fetchCourses();
    this.fetchStudents();
  }

  goBack(): void {
    this.location.back();
  }

  runCourseSearch(): void {
    this.page = 1;
    this.fetchCourses();
  }

  fetchCourses(): void {
    const obj: Record<string, string | number> = {
      'Filter.Title': (this.searchTitle || '').trim(),
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': String(this.isAsc),
      pageSize: this.tableSize,
      pageNumber: this.page,
    };
    this.coursesLoading = true;
    this.subscription.add(
      this.appService.getCompanyCourses(obj as unknown as Record<string, unknown>).subscribe({
        next: (response) => {
          this.course = response?.results ?? [];
          this.count = response?.totalNumberOfRecords ?? 0;
          this.course.forEach((x) => {
            this.getAllPricesByCourseId(x.id, (price: number) => {
              x.price = price;
            });
          });
          this.coursesLoading = false;
        },
        error: (err) => {
          this.coursesLoading = false;
          this.course = [];
          this.count = 0;
          const msg = this.extractApiErrorMessage(err);
          this.toasterService.showError(msg);
        },
      })
    );
  }

  fetchStudents(): void {
    const obj = {
      'Filters.Title': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page_std,
    };
    this.subscription.add(
      this.appService.getStudents(obj, false).subscribe({
        next: (response) => {
          this.students = response.results;
          this.count_std = response.totalNumberOfRecords;
        },
        error: () => console.log('students list error'),
      })
    );
  }

  pageChanged(event: number): void {
    this.page = event;
    this.fetchCourses();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchCourses();
  }

  getCourseProgress(item: any): number {
    if (!item) return 0;
    const p =
      item.courseCreationProgress ??
      item.CourseCreationProgress ??
      item['courseCreationProgress'] ??
      item['CourseCreationProgress'];
    const n = Number(p);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  }

  isPendingReview(item: any): boolean {
    if (!item) return false;
    const s = item.status ?? item.Status;
    const n = typeof s === 'number' ? s : Number(s);
    return Number.isFinite(n) && n === 1;
  }

  courseId(item: any): string {
    const id = item?.id ?? item?.Id;
    return id != null ? String(id) : '';
  }

  openPublishUnpublishModal(item: {
    id: string;
    title?: string;
    slug?: string;
    isPublished?: boolean;
    showOnPublicListing?: boolean | null;
    ShowOnPublicListing?: boolean | null;
  }): void {
    const modalRef = this.modalService.open(PublishCourseModalComponent);
    modalRef.componentInstance.courseId = item.id;
    modalRef.componentInstance.courseTitle = item.title || '';
    modalRef.componentInstance.slug = item.slug || '';
    modalRef.componentInstance.isPublished = !!item.isPublished;
    const showOnPublic = item.showOnPublicListing ?? item.ShowOnPublicListing;
    modalRef.componentInstance.showOnPublicListing = showOnPublic;
    modalRef.componentInstance.companyTenant = true;
    modalRef.componentInstance.initCheckboxes();
    modalRef.result.then(
      (result) => {
        if (result === 'updated') {
          this.toasterService.showSuccess('Course visibility updated.');
          this.fetchCourses();
        }
      },
      () => {}
    );
  }

  approveReview(item: any): void {
    const id = this.courseId(item);
    if (!id) return;
    this.subscription.add(
      this.appService.approveCompanyCourseReview(id).subscribe({
        next: () => {
          this.toasterService.showSuccess('Course approved and published.');
          this.fetchCourses();
        },
        error: (err) => this.toasterService.showError(this.extractApiErrorMessage(err)),
      })
    );
  }

  changeProgress(id: string, progress: number): void {
    const modalRef = this.modalService.open(ChangeProgressComponent);
    modalRef.componentInstance.selectedProgress = progress ?? 0;
    modalRef.result.then((x) => {
      if (x == null) return;
      this.subscription.add(
        this.appService.updateCompanyCourseProgress(id, x).subscribe({
          next: () => {
            this.course.forEach((z) => {
              if (z.id === id) {
                z.courseCreationProgress = x;
                z.isCompleted = x === 100;
              }
            });
            this.toasterService.showSuccess('Progress updated.');
          },
          error: (err) => this.toasterService.showError(this.extractApiErrorMessage(err)),
        })
      );
    });
  }

  deleteCourse(id: any): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Course Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?';
    modalRef.result.then(
      (result) => {
        if (result !== 'ok') return;
        setTimeout(() => {
          (document.activeElement as HTMLElement | null)?.blur?.();
          this.subscription.add(
            this.appService.deleteCompanyCourse(String(id)).subscribe({
              next: () => {
                this.toasterService.showSuccess('Course deleted successfully');
                this.page = 1;
                this.fetchCourses();
              },
              error: (err) => this.toasterService.showError(this.extractApiErrorMessage(err)),
            })
          );
        }, 0);
      },
      () => {}
    );
  }

  private extractApiErrorMessage(error: unknown): string {
    const fallback = 'Something went wrong';
    const err = error as { error?: unknown; message?: string } | undefined;
    const body = err?.error;
    if (body == null) {
      return typeof err?.message === 'string' && err.message ? err.message : fallback;
    }
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as { Messages?: string[]; messages?: string[]; message?: string };
        return parsed.Messages?.[0] ?? parsed.messages?.[0] ?? parsed.message ?? body;
      } catch {
        return body;
      }
    }
    if (typeof body === 'object' && body !== null) {
      const o = body as { Messages?: string[]; messages?: string[]; message?: string };
      return o.Messages?.[0] ?? o.messages?.[0] ?? (typeof o.message === 'string' ? o.message : null) ?? fallback;
    }
    return fallback;
  }

  getAllPricesByCourseId(id: string, callback: (n: number) => void): void {
    this.appService.getCoursePrices(id).subscribe({
      next: (res: any) => {
        const price = res?.[0]?.discountedPrice ?? 0;
        callback(price);
      },
      error: () => callback(0),
    });
  }

  gotToCurriculumList(item: unknown): void {
    localStorage.setItem('course', JSON.stringify(item));
  }

  sortByHeading(value: string): void {
    this.sortBy = value;
    this.isAsc = !this.isAsc;
    this.fetchCourses();
  }

  trackByCourseId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  InviteUser(): void {
    this.modalService.open(InviteUserComponent, { windowClass: 'modal-right' });
  }
}
