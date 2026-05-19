import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-publish-course-modal',
  templateUrl: './publish-course-modal.component.html',
  styleUrls: ['./publish-course-modal.component.scss'],
  standalone: false
})
export class PublishCourseModalComponent implements OnInit, OnChanges {

  @Input() courseId: string;
  @Input() courseTitle: string = '';
  @Input() slug: string = '';
  /** Current: visible on Elearn LMS */
  @Input() isPublished: boolean = false;
  /** Current: visible on Public marketing (if not provided, defaults to isPublished) */
  @Input() showOnPublicListing: boolean | null = null;

  /** Checkbox: show on Elearn LMS course page */
  showOnLms = false;
  /** Checkbox: show on Public marketing course page */
  showOnPublic = false;

  /** When true, save via company-tenant API (organization LMS; public marketing not used). */
  @Input() companyTenant = false;

  isPublishing = false;
  isSuccess = false;
  errorMessage: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private appService: AdminAppService
  ) {}

  ngOnInit(): void {
    this.initCheckboxes(); // in case inputs were set before open (e.g. by parent)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isPublished'] || changes['showOnPublicListing'] || changes['courseId'] || changes['companyTenant']) {
      this.initCheckboxes();
    }
  }

  initCheckboxes(): void {
    this.showOnLms = this.isPublished;
    if (this.companyTenant) {
      this.showOnPublic = false;
      return;
    }
    // When LMS is on, default Public to on (publish = both). Only show Public unchecked when it was explicitly false and we're not changing behavior on open.
    this.showOnPublic = this.showOnLms ? true : (this.showOnPublicListing === true);
  }

  /** When LMS is checked, also check Public (publish to both). When LMS is unchecked, uncheck Public (Public requires LMS). */
  onLmsChange(checked: boolean): void {
    if (this.companyTenant) {
      this.showOnPublic = false;
      return;
    }
    if (checked) {
      this.showOnPublic = true;
    } else {
      this.showOnPublic = false;
    }
  }

  get publicCoursePageUrl(): string {
    const base = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl || '';
    const origin = typeof base === 'string' && base.trim() !== '' ? base.trim().replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin) return '';
    // Public site: course detail is /{slug} or /{id} (backend accepts Guid as slug)
    const path = (this.slug && this.slug.trim()) ? encodeURIComponent(this.slug.trim()) : encodeURIComponent(this.courseId || '');
    return path ? `${origin}/${path}` : `${origin}/courses`;
  }

  get publicCoursesListUrl(): string {
    const base = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl || '';
    const origin = typeof base === 'string' && base.trim() !== '' ? base.trim().replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');
    return origin ? `${origin}/courses` : '';
  }

  execute(): void {
    if (!this.courseId || this.isPublishing) return;
    this.isPublishing = true;
    this.errorMessage = null;
    const showPublic = this.companyTenant ? false : this.showOnPublic;
    const req$ = this.companyTenant
      ? this.appService.setCompanyCourseVisibility(this.courseId, { showOnLms: this.showOnLms, showOnPublic: showPublic })
      : this.appService.setCourseVisibility(this.courseId, this.showOnLms, this.showOnPublic);
    req$.subscribe({
      next: () => {
        this.isPublishing = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isPublishing = false;
        this.errorMessage = err?.error?.message || err?.message || 'Failed to update visibility. Please try again.';
      }
    });
  }

  get canSave(): boolean {
    return true; // Allow saving both unchecked (unpublish from both)
  }

  close(): void {
    this.activeModal.close(this.isSuccess ? 'updated' : null);
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}
