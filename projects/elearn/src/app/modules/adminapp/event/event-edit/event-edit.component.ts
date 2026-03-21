import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { SubmitForReviewModalComponent } from '../../course/course-review/submit-for-review-modal/submit-for-review-modal.component';
import { CourseApproveModalComponent } from '../../course/course-review/course-approve-modal/course-approve-modal.component';
import { CourseRejectModalComponent } from '../../course/course-review/course-reject-modal/course-reject-modal.component';

@Component({
  selector: 'app-event-edit',
  templateUrl: './event-edit.component.html',
  styleUrls: ['./event-edit.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class EventEditComponent implements OnInit, OnDestroy {
  form: UntypedFormGroup;
  eventId: string;
  loading = true;
  saving = false;
  submitted = false;
  loadedEvent: any = null;
  titleImageFile: File | null = null;
  titleImagePreview: string | null = null;
  titleImageUploadedUrl: string | null = null;
  videoUploading = false;
  mediaDeleting = false;
  curriculumExpanded = true;
  bonusesExpanded = false;
  salaryExpanded = false;
  qaExpanded = false;
  organizedByExpanded = false;
  optionsExpanded = true;
  eventStatus = 0;
  @ViewChild('eventReviewSidebar') eventReviewSidebarRef: TemplateRef<any>;
  reviewSidebarModalRef: NgbModalRef;
  reviewHistoryList: { eventType: number; eventDate: string; message?: string | null }[] = [];
  reviewActionInProgress = false;
  private sub = new Subscription();

  constructor(
    private fb: UntypedFormBuilder,
    private appService: AdminAppService,
    private toaster: ToasterService,
    private router: Router,
    private route: ActivatedRoute,
    private sharedService: SharedService,
    private sanitizer: DomSanitizer,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef
  ) {}

  /** Use backend stream proxy for S3 URLs so video plays (avoids CORS). */
  getEventVideoSrc(url: string): string {
    if (!url || typeof url !== 'string') return '';
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.appService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  /** Safe URL for video preview in the form. */
  getVideoPreviewSrc(): SafeResourceUrl {
    const url = this.form?.get('videoUrl')?.value?.trim();
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const src = this.getEventVideoSrc(url);
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Events');
    this.eventId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.eventId) {
      this.router.navigate([this.eventsListPath]);
      return;
    }
    this.buildForm();
    this.loadEvent();
    this.sub.add(
      this.sharedService.eventReviewPanelClick$.subscribe(() => this.openReviewSidebar())
    );
  }

  ngOnDestroy(): void {
    this.sharedService.eventReviewContext.next(null);
    this.sub.unsubscribe();
  }

  private get eventsListPath(): string {
    return (this.router?.url ?? '').includes('/trainer/events') ? '/app/trainer/events' : '/app/admin/events';
  }

  private buildForm(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      canonicalUrl: ['', Validators.required],
      language: ['', Validators.required],
      badge: [''],
      aboutEvent: ['', Validators.required],
      eventInfo: ['', Validators.required],
      metaDescription: [''],
      videoUrl: [''],
      skillLevel: [''],
      certification: [''],
      mode: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      duration: [''],
      timing: [''],
      amount: [0, [Validators.required, Validators.min(0)]],
      discount: [null as number | null, Validators.min(0)],
      location: ['', Validators.required],
      showOnDashboard: [false],
      registrationCompleted: [false],
      eventDetails: this.fb.array([]),
      bonuses: [''],
      salaryInfo: [''],
      qaSections: this.fb.array([]),
      organizedBy: ['']
    });
  }

  get f() { return this.form.controls; }
  get eventDetailsArray(): FormArray { return this.form.get('eventDetails') as FormArray; }
  get qaSectionsArray(): FormArray { return this.form.get('qaSections') as FormArray; }

  addCurriculumSection(): void {
    this.eventDetailsArray.push(this.fb.group({
      section: [''],
      sortOrder: [this.eventDetailsArray.length],
      title: [''],
      description: [''],
      tag: [''],
      amount: [null],
      imageUrl: [''],
      count: [null]
    }));
  }

  removeCurriculumSection(index: number): void {
    this.eventDetailsArray.removeAt(index);
  }

  addQaSection(): void {
    this.qaSectionsArray.push(this.fb.group({
      question: ['', Validators.required],
      answer: ['', Validators.required]
    }));
  }

  removeQaSection(index: number): void {
    this.qaSectionsArray.removeAt(index);
  }

  private parseQaFromEventInfo(eventInfo: string): { question: string; answer: string }[] {
    if (!eventInfo || typeof eventInfo !== 'string') return [];
    try {
      const match = eventInfo.match(/\[QAJSON\](.+)$/s);
      if (match) return JSON.parse(match[1].trim());
    } catch (_) {}
    return [];
  }

  private stripQaJsonFromEventInfo(eventInfo: string): string {
    if (!eventInfo || typeof eventInfo !== 'string') return eventInfo;
    return eventInfo.replace(/\n?\[QAJSON\][\s\S]*$/, '').trim();
  }

  private parseVideoUrlFromEventInfo(eventInfo: string): string {
    if (!eventInfo || typeof eventInfo !== 'string') return '';
    const m = eventInfo.match(/\[VideoUrl:(.+?)\]/);
    return m ? m[1].trim() : '';
  }

  private parseTitleImageFromEventInfo(eventInfo: string): string {
    if (!eventInfo || typeof eventInfo !== 'string') return '';
    const m = eventInfo.match(/\[TitleImage:(.+?)\]/);
    return m ? m[1].trim() : '';
  }

  private stripVideoUrlFromEventInfo(eventInfo: string): string {
    if (!eventInfo || typeof eventInfo !== 'string') return eventInfo;
    return eventInfo.replace(/\n?\[VideoUrl:[^\]]*\]/g, '').trim();
  }

  private stripTitleImageFromEventInfo(eventInfo: string): string {
    if (!eventInfo || typeof eventInfo !== 'string') return eventInfo;
    return eventInfo.replace(/\n?\[TitleImage:[^\]]*\]/g, '').trim();
  }

  private patchEventDetails(details: any[]): void {
    const arr = this.eventDetailsArray;
    arr.clear();
    (details || []).forEach((d: any) => {
      arr.push(this.fb.group({
        section: [d.section ?? d.Section ?? ''],
        sortOrder: [d.sortOrder ?? d.SortOrder ?? arr.length],
        title: [d.title ?? d.Title ?? ''],
        description: [d.description ?? d.Description ?? ''],
        tag: [d.tag ?? d.Tag ?? ''],
        amount: [d.amount ?? d.Amount ?? null],
        imageUrl: [d.imageUrl ?? d.ImageUrl ?? ''],
        count: [d.count ?? d.Count ?? null]
      }));
    });
  }

  loadEvent(): void {
    this.loading = true;
    this.appService.getEventById(this.eventId).subscribe({
      next: (res) => {
        this.loadedEvent = res;
        const e = res;
        const startDate = e.startDate ?? e.StartDate;
        const endDate = e.endDate ?? e.EndDate;
        this.form.patchValue({
          title: e.title ?? e.Title ?? '',
          canonicalUrl: e.canonicalUrl ?? e.CanonicalUrl ?? '',
          language: e.language ?? e.Language ?? '',
          badge: e.badge ?? e.Badge ?? '',
          aboutEvent: e.aboutEvent ?? e.AboutEvent ?? '',
          eventInfo: e.eventInfo ?? e.EventInfo ?? '',
          metaDescription: e.metaDescription ?? e.MetaDescription ?? '',
          startDate: startDate ? (typeof startDate === 'string' ? startDate.slice(0, 10) : new Date(startDate).toISOString().slice(0, 10)) : '',
          endDate: endDate ? (typeof endDate === 'string' ? endDate.slice(0, 10) : new Date(endDate).toISOString().slice(0, 10)) : '',
          duration: e.duration ?? e.Duration ?? '',
          timing: e.timeing ?? e.Timeing ?? '',
          amount: e.amount ?? e.Amount ?? 0,
          discount: e.discount ?? e.Discount ?? null,
          location: e.location ?? e.Location ?? '',
          showOnDashboard: e.showOnDashboard ?? e.ShowOnDashboard ?? false,
          registrationCompleted: e.registrationCompleted ?? e.RegistrationCompleted ?? false
        });
        const details = e.eventDetails ?? e.EventDetails ?? [];
        this.patchEventDetails(details);
        const eventInfoRaw = e.eventInfo ?? e.EventInfo ?? '';
        const qaList = this.parseQaFromEventInfo(eventInfoRaw);
        const eventInfoWithoutQa = this.stripQaJsonFromEventInfo(eventInfoRaw);
        const eventInfoWithoutVideo = this.stripVideoUrlFromEventInfo(eventInfoWithoutQa);
        const eventInfoForForm = this.stripTitleImageFromEventInfo(eventInfoWithoutVideo);
        const videoUrl = this.parseVideoUrlFromEventInfo(eventInfoRaw);
        const titleImageUrl = this.parseTitleImageFromEventInfo(eventInfoRaw) || (e.titleImageUrl ?? e.TitleImageUrl);
        this.form.patchValue({ eventInfo: eventInfoForForm, videoUrl: videoUrl || '' });
        this.qaSectionsArray.clear();
        qaList.forEach((qa: any) => {
          this.qaSectionsArray.push(this.fb.group({
            question: [qa.question ?? '', Validators.required],
            answer: [qa.answer ?? '', Validators.required]
          }));
        });
        if (titleImageUrl) this.titleImageUploadedUrl = titleImageUrl;
        this.eventStatus = e?.status ?? e?.Status ?? 0;
        this.form.markAsPristine();
        this.sharedService.eventReviewContext.next({ eventId: this.eventId, status: this.eventStatus });
        this.loading = false;
      },
      error: () => {
        this.toaster.showError('Failed to load event.');
        this.loading = false;
        this.router.navigate([this.eventsListPath]);
      }
    });
  }

  onTitleImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.toaster.showError('Please select an image file.'); return; }
    this.titleImageFile = file;
    this.titleImagePreview = null;
    const reader = new FileReader();
    reader.onload = () => { this.titleImagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removeTitleImage(): void {
    const urlToDelete = this.titleImageUploadedUrl;
    // Clear UI immediately so "Remove" always removes the visible data
    this.clearTitleImageAndStripEventInfo();
    if (urlToDelete && (urlToDelete.includes('s3.amazonaws.com') || urlToDelete.includes('s3-accelerate.amazonaws.com'))) {
      this.mediaDeleting = true;
      this.appService.deleteEventMedia(urlToDelete).subscribe({
        next: () => {
          this.mediaDeleting = false;
          this.toaster.showSuccess('Title image removed from S3.');
        },
        error: (err) => {
          this.mediaDeleting = false;
          const msg = err?.error?.message ?? err?.message ?? 'Failed to delete image from S3.';
          this.toaster.showError(msg);
        }
      });
    }
  }

  private clearTitleImageAndStripEventInfo(): void {
    this.titleImageFile = null;
    this.titleImagePreview = null;
    this.titleImageUploadedUrl = null;
    const current = this.form.get('eventInfo')?.value ?? '';
    this.form.patchValue({ eventInfo: this.stripTitleImageFromEventInfo(current) });
  }

  removeVideo(): void {
    const url = (this.form.get('videoUrl')?.value ?? '').trim();
    if (!url) return;
    // Clear UI immediately so "Remove video" always clears the visible data
    this.form.patchValue({ videoUrl: '' });
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      this.mediaDeleting = true;
      this.appService.deleteEventMedia(url).subscribe({
        next: () => {
          this.mediaDeleting = false;
          this.toaster.showSuccess('Video removed from S3.');
        },
        error: (err) => {
          this.mediaDeleting = false;
          const msg = err?.error?.message ?? err?.message ?? 'Failed to delete video from S3.';
          this.toaster.showError(msg);
        }
      });
    }
  }

  onVideoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name || '');
    if (!isVideo) {
      this.toaster.showError('Please select a video file (MP4, WebM, or MOV).');
      input.value = '';
      return;
    }
    this.videoUploading = true;
    this.appService.uploadEventVideo(file).subscribe({
      next: (res) => {
        const url = res?.url ?? (res as any)?.url;
        if (url) this.form.patchValue({ videoUrl: url });
        this.videoUploading = false;
        this.toaster.showSuccess('Video uploaded. URL saved.');
        input.value = '';
      },
      error: (err) => {
        this.videoUploading = false;
        const msg = err?.error?.message ?? err?.message ?? 'Video upload failed.';
        this.toaster.showError(msg);
        input.value = '';
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const amount = Number(v.amount);
    const qaJson = (v.qaSections || []).length ? '\n[QAJSON]' + JSON.stringify((v.qaSections || []).map((qa: any) => ({ question: qa.question ?? '', answer: qa.answer ?? '' }))) : '';
    const eventInfoMain = (v.eventInfo?.trim() ?? '') || '';
    const videoUrlPart = (v.videoUrl?.trim()) ? `\n[VideoUrl:${v.videoUrl.trim()}]` : '';

    const doUpdate = (titleImageUrl: string | null) => {
      const titleImagePart = titleImageUrl ? `\n[TitleImage:${titleImageUrl}]` : '';
      const eventInfo = eventInfoMain + titleImagePart + videoUrlPart + qaJson;
      const payload = {
        title: v.title?.trim() ?? '',
        canonicalUrl: v.canonicalUrl?.trim() ?? '',
        language: v.language?.trim() ?? '',
        badge: v.badge?.trim() || null,
        aboutEvent: v.aboutEvent?.trim() ?? '',
        eventInfo,
        metaDescription: v.metaDescription?.trim() || null,
        startDate: v.startDate ? new Date(v.startDate).toISOString() : null,
        endDate: v.endDate ? new Date(v.endDate).toISOString() : null,
        duration: v.duration?.trim() || null,
        timeing: v.timing?.trim() || null,
        amount: isNaN(amount) || amount < 0 ? 0 : amount,
        discount: v.discount != null && v.discount !== '' ? Number(v.discount) : null,
        location: v.location?.trim() ?? '',
        showOnDashboard: !!v.showOnDashboard,
        registrationCompleted: !!v.registrationCompleted,
        eventDetails: (v.eventDetails || []).map((d: any) => ({
          section: d.section ?? '',
          sortOrder: Number(d.sortOrder) || 0,
          title: d.title ?? '',
          description: d.description ?? '',
          tag: d.tag ?? '',
          amount: d.amount != null && d.amount !== '' ? Number(d.amount) : null,
          imageUrl: d.imageUrl ?? '',
          count: d.count != null && d.count !== '' ? Number(d.count) : null
        }))
      };
      this.appService.updateEvent(this.eventId, payload).subscribe({
        next: () => {
          this.toaster.showSuccess('Event updated successfully.');
          this.submitted = false;
          this.loadEvent();
        },
        error: (err) => {
          this.saving = false;
          const e = err?.error;
          const messages = e?.messages ?? e?.Messages;
          const msg = (Array.isArray(messages) ? messages.join('. ') : null) ?? e?.message ?? e?.Message ?? 'Failed to update event.';
          this.toaster.showError(msg);
        }
      });
    };

    // If user selected a new title image, upload to S3 first then save URL in DB
    if (this.titleImageFile) {
      this.appService.uploadEventTitleImage(this.titleImageFile).subscribe({
        next: (res) => {
          const r = res as { url?: string; Url?: string };
          const url = r?.url ?? r?.Url ?? null;
          doUpdate(url);
        },
        error: (err) => {
          this.saving = false;
          this.toaster.showError(err?.error?.message ?? err?.message ?? 'Image upload failed.');
        }
      });
    } else {
      doUpdate(this.titleImageUploadedUrl);
    }
  }

  onReset(): void {
    if (this.loadedEvent) {
      this.loadEvent();
      this.toaster.showSuccess('Form reset.');
    }
  }

  onCancel(): void {
    this.router.navigate([this.eventsListPath]);
  }

  openReviewSidebar(): void {
    if (!this.eventId) return;
    // Defer so ViewChild is ready and click from topbar is fully processed (trainer Events topbar Review button)
    setTimeout(() => {
      if (!this.eventReviewSidebarRef) {
        this.cdr.detectChanges();
      }
      if (!this.eventReviewSidebarRef) return;
      if (this.reviewSidebarModalRef) return; // already open
      this.loadReviewHistory();
      this.reviewSidebarModalRef = this.modalService.open(this.eventReviewSidebarRef, {
        windowClass: 'modal-right review-sidebar-modal',
        size: 'sm',
        scrollable: true,
      });
      this.reviewSidebarModalRef.result.catch(() => {}).finally(() => {
        this.reviewSidebarModalRef = null;
      });
      this.cdr.markForCheck();
    }, 0);
  }

  loadReviewHistory(): void {
    if (!this.eventId) return;
    this.sub.add(
      this.appService.getEventReviewHistory(this.eventId).subscribe({
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

  /** True if user has edited form or selected a new title image since load; enables Submit for Review when event is already approved. */
  get hasContentEdited(): boolean {
    return (this.form?.dirty === true) || !!this.titleImageFile;
  }

  /** True when Submit for Review button should be enabled: Draft/Rejected, or Approved and content edited. */
  get canSubmitForReviewFromPanel(): boolean {
    if (!this.eventId) return false;
    if (this.eventStatus === 0 || this.eventStatus === 3) return true;
    if (this.eventStatus === 2) return this.hasContentEdited;
    return false;
  }

  /** True when the Submit for Review section (button + hint) should be visible: existing event and not Pending. */
  get showSubmitForReviewSection(): boolean {
    return !!this.eventId && this.eventStatus !== 1;
  }

  get isEventPendingReview(): boolean {
    return this.eventStatus === 1;
  }

  get submitForReviewHint(): string {
    if (this.eventStatus === 1) return 'Already submitted for review. Waiting for admin.';
    if (this.eventStatus === 2) return 'Event is approved. Edit content to submit for review again.';
    return '';
  }

  get isAdminRoute(): boolean {
    return (this.router?.url ?? '').includes('/admin/');
  }

  submitForReviewFromPanel(modal: { dismiss: (r?: string) => void }): void {
    if (!this.eventId) return;
    const ref = this.modalService.open(SubmitForReviewModalComponent);
    ref.result.then(
      (message: string) => {
        this.reviewActionInProgress = true;
        this.cdr.markForCheck();
        this.appService.submitEventForReview(this.eventId, message ?? undefined).subscribe({
          next: () => {
            this.reviewActionInProgress = false;
            this.toaster.showSuccess('Event submitted for review.');
            this.sharedService.eventReviewContext.next(null);
            this.eventStatus = 1;
            this.loadReviewHistory();
            this.loadEvent();
            this.cdr.markForCheck();
            modal.dismiss('submitted');
          },
          error: () => {
            this.reviewActionInProgress = false;
            this.toaster.showError('Failed to submit for review.');
            this.cdr.markForCheck();
          }
        });
      },
      () => {}
    );
  }

  onEventReviewApproveFromPanel(modal: { dismiss: (r?: string) => void }): void {
    if (!this.eventId) return;
    const ref = this.modalService.open(CourseApproveModalComponent);
    ref.result.then(
      (approvalNote: string) => {
        this.reviewActionInProgress = true;
        this.cdr.markForCheck();
        this.appService.approveEvent(this.eventId, approvalNote || undefined).subscribe({
          next: () => {
            this.reviewActionInProgress = false;
            this.toaster.showSuccess('Event approved and published.');
            this.sharedService.eventReviewContext.next(null);
            this.cdr.markForCheck();
            modal.dismiss('approved');
            this.router.navigate([this.eventsListPath]);
          },
          error: () => {
            this.reviewActionInProgress = false;
            this.toaster.showError('Failed to approve event.');
            this.cdr.markForCheck();
          }
        });
      },
      () => {}
    );
  }

  onEventReviewRejectFromPanel(modal: { dismiss: (r?: string) => void }): void {
    if (!this.eventId) return;
    const ref = this.modalService.open(CourseRejectModalComponent);
    ref.result.then(
      (reason: string) => {
        if (reason != null) {
          this.reviewActionInProgress = true;
          this.cdr.markForCheck();
          this.appService.rejectEvent(this.eventId, reason ?? '').subscribe({
            next: () => {
              this.reviewActionInProgress = false;
              this.toaster.showSuccess('Event rejected. Author can edit and resubmit.');
              this.eventStatus = 3;
              this.loadReviewHistory();
              this.loadEvent();
              this.cdr.markForCheck();
              modal.dismiss('rejected');
            },
            error: () => {
              this.reviewActionInProgress = false;
              this.toaster.showError('Failed to reject event.');
              this.cdr.markForCheck();
            }
          });
        }
      },
      () => {}
    );
  }
}
