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

export type EventEditSectionPanel = 'curriculum' | 'bonuses' | 'salary' | 'qa' | 'organized';

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
  eventStatus = 0;
  activeSectionPanel: EventEditSectionPanel = 'curriculum';
  selectedCurriculumIndex: number | null = null;
  @ViewChild('eventReviewSidebar') eventReviewSidebarRef: TemplateRef<any>;
  @ViewChild('eventSectionSidebar') eventSectionSidebarRef: TemplateRef<any>;
  reviewSidebarModalRef: NgbModalRef;
  sectionSidebarModalRef: NgbModalRef | null = null;
  reviewHistoryList: { eventType: number; eventDate: string; message?: string | null }[] = [];
  reviewActionInProgress = false;
  /** Non-curriculum event details (image, format, organized, etc.) preserved across curriculum edits. */
  private preservedEventDetails: Record<string, unknown>[] = [];
  private readonly curriculumSection = 'curriculum';
  private readonly formatSection = 'format';
  private readonly supportSection = 'support';
  private static readonly DEFAULT_HELP_PHONE = '+91 98402 87919';
  private static readonly DEFAULT_HELP_EMAIL = 'event@oilandgasclub.com';
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
      helpPhones: this.fb.array([this.fb.control(EventEditComponent.DEFAULT_HELP_PHONE)]),
      helpEmails: this.fb.array([this.fb.control(EventEditComponent.DEFAULT_HELP_EMAIL)]),
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
  get helpPhonesArray(): FormArray { return this.form.get('helpPhones') as FormArray; }
  get helpEmailsArray(): FormArray { return this.form.get('helpEmails') as FormArray; }

  addHelpPhone(): void {
    this.helpPhonesArray.push(this.fb.control(''));
  }

  removeHelpPhone(index: number): void {
    if (this.helpPhonesArray.length > 1) {
      this.helpPhonesArray.removeAt(index);
    }
  }

  addHelpEmail(): void {
    this.helpEmailsArray.push(this.fb.control(''));
  }

  removeHelpEmail(index: number): void {
    if (this.helpEmailsArray.length > 1) {
      this.helpEmailsArray.removeAt(index);
    }
  }

  addCurriculumSection(): void {
    this.eventDetailsArray.push(this.fb.group({
      title: [''],
      description: ['']
    }));
  }

  addCurriculumSectionAndOpen(): void {
    this.addCurriculumSection();
    this.openSectionSidebar('curriculum', this.eventDetailsArray.length - 1);
  }

  getCurriculumDescription(index: number): string {
    const desc = this.eventDetailsArray.at(index)?.get('description')?.value;
    return desc != null ? String(desc).trim() : '';
  }

  /** Bullet-style preview shown under the title (course table shows content under title). */
  getCurriculumDescriptionPreview(index: number): string {
    const raw = this.getCurriculumDescription(index);
    if (!raw) return '';
    const preview = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith('•') ? line : `• ${line.replace(/^[-*]\s*/, '')}`))
      .join(' ');
    const maxLen = 140;
    return preview.length > maxLen ? `${preview.slice(0, maxLen - 3)}...` : preview;
  }

  getSectionPreview(field: 'bonuses' | 'salaryInfo' | 'organizedBy'): string {
    const value = this.form?.get(field)?.value;
    return value != null ? String(value).trim() : '';
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

  private normalizeEventDetail(d: any): Record<string, unknown> {
    return {
      section: d.section ?? d.Section ?? '',
      sortOrder: d.sortOrder ?? d.SortOrder ?? 0,
      title: d.title ?? d.Title ?? '',
      description: d.description ?? d.Description ?? '',
      tag: d.tag ?? d.Tag ?? '',
      amount: d.amount ?? d.Amount ?? null,
      imageUrl: d.imageUrl ?? d.ImageUrl ?? '',
      count: d.count ?? d.Count ?? null
    };
  }

  private patchEventDetails(details: any[]): void {
    const normalized = (details || []).map((d) => this.normalizeEventDetail(d));
    this.preservedEventDetails = normalized.filter((d) => {
      const section = ((d.section as string) || '').trim();
      return section.length > 0 && section !== this.curriculumSection;
    });
    const curriculum = normalized.filter((d) => {
      const section = ((d.section as string) || '').trim();
      return !section || section === this.curriculumSection;
    });
    const arr = this.eventDetailsArray;
    arr.clear();
    curriculum.forEach((d) => {
      arr.push(this.fb.group({
        title: [d.title],
        description: [d.description]
      }));
    });
  }

  private buildCurriculumPayload(details: any[]): Record<string, unknown>[] {
    return (details || []).map((d: any, index: number) => ({
      section: this.curriculumSection,
      sortOrder: index,
      title: d.title ?? '',
      description: d.description ?? '',
      tag: '',
      amount: null,
      imageUrl: '',
      count: null
    }));
  }

  private getFormatFieldFromDetails(details: any[], title: string): string {
    const match = (details || []).find((d) => {
      const section = (d?.section ?? d?.Section ?? '').trim();
      const itemTitle = (d?.title ?? d?.Title ?? '').trim();
      return section === this.formatSection && itemTitle === title;
    });
    return String(match?.description ?? match?.Description ?? '').trim();
  }

  private patchFormatFields(details: any[]): void {
    this.form.patchValue({
      skillLevel: this.getFormatFieldFromDetails(details, 'Level'),
      certification: this.getFormatFieldFromDetails(details, 'Certification'),
      mode: this.getFormatFieldFromDetails(details, 'Mode')
    });
  }

  private buildFormatPayload(skillLevel: string, certification: string, mode: string): Record<string, unknown>[] {
    const items = [
      { title: 'Level', value: (skillLevel ?? '').trim() },
      { title: 'Certification', value: (certification ?? '').trim() },
      { title: 'Mode', value: (mode ?? '').trim() }
    ];
    return items
      .filter((item) => item.value.length > 0)
      .map((item, index) => ({
        section: this.formatSection,
        sortOrder: index,
        title: item.title,
        description: item.value,
        tag: '',
        amount: null,
        imageUrl: '',
        count: null
      }));
  }

  private getPreservedEventDetails(): Record<string, unknown>[] {
    return this.preservedEventDetails.filter((d) => {
      const section = ((d.section as string) || '').trim();
      return section !== this.formatSection && section !== this.supportSection;
    });
  }

  private getSupportEntriesFromDetails(details: any[], title: string): string[] {
    return (details || [])
      .filter((d) => {
        const section = (d?.section ?? d?.Section ?? '').trim();
        const itemTitle = (d?.title ?? d?.Title ?? '').trim();
        return section === this.supportSection && itemTitle === title;
      })
      .sort(
        (a, b) =>
          Number(a?.sortOrder ?? a?.SortOrder ?? 0) - Number(b?.sortOrder ?? b?.SortOrder ?? 0)
      )
      .map((d) => String(d?.description ?? d?.Description ?? '').trim())
      .filter(Boolean);
  }

  private patchSupportFields(details: any[]): void {
    const phones = this.getSupportEntriesFromDetails(details, 'Phone');
    const emails = this.getSupportEntriesFromDetails(details, 'Email');
    this.helpPhonesArray.clear();
    this.helpEmailsArray.clear();
    const phoneList = phones.length ? phones : [EventEditComponent.DEFAULT_HELP_PHONE];
    const emailList = emails.length ? emails : [EventEditComponent.DEFAULT_HELP_EMAIL];
    phoneList.forEach((phone) => this.helpPhonesArray.push(this.fb.control(phone)));
    emailList.forEach((email) => this.helpEmailsArray.push(this.fb.control(email)));
  }

  private buildSupportPayload(helpPhones: string[], helpEmails: string[]): Record<string, unknown>[] {
    const payload: Record<string, unknown>[] = [];
    let sortOrder = 0;
    const addEntry = (title: string, value: string) => {
      payload.push({
        section: this.supportSection,
        sortOrder: sortOrder++,
        title,
        description: value,
        tag: '',
        amount: null,
        imageUrl: '',
        count: null
      });
    };

    (helpPhones || []).map((v) => String(v ?? '').trim()).filter(Boolean).forEach((phone) => addEntry('Phone', phone));
    (helpEmails || []).map((v) => String(v ?? '').trim()).filter(Boolean).forEach((email) => addEntry('Email', email));

    if (!payload.length) {
      addEntry('Phone', EventEditComponent.DEFAULT_HELP_PHONE);
      addEntry('Email', EventEditComponent.DEFAULT_HELP_EMAIL);
    }

    return payload;
  }

  private buildEventDetailsPayload(formValue: any): Record<string, unknown>[] {
    return [
      ...this.getPreservedEventDetails(),
      ...this.buildFormatPayload(formValue.skillLevel, formValue.certification, formValue.mode),
      ...this.buildSupportPayload(formValue.helpPhones, formValue.helpEmails),
      ...this.buildCurriculumPayload(formValue.eventDetails)
    ];
  }

  loadEvent(options?: { silent?: boolean }): void {
    if (!options?.silent) {
      this.loading = true;
    }
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
        this.patchFormatFields(details);
        this.patchSupportFields(details);
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
        if (!options?.silent) {
          this.loading = false;
        }
        this.saving = false;
      },
      error: () => {
        this.toaster.showError(options?.silent ? 'Event saved but failed to refresh.' : 'Failed to load event.');
        if (!options?.silent) {
          this.loading = false;
          this.router.navigate([this.eventsListPath]);
        }
        this.saving = false;
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

  onSubmit(onSuccess?: () => void, options?: { skipReload?: boolean }): void {
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
        eventDetails: this.buildEventDetailsPayload(v)
      };
      this.appService.updateEvent(this.eventId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.submitted = false;
          this.titleImageFile = null;
          this.toaster.showSuccess('Event updated successfully.');
          const keepSidebarOpen = options?.skipReload || !!this.sectionSidebarModalRef;
          if (keepSidebarOpen) {
            this.preservedEventDetails = this.buildEventDetailsPayload(v).filter((d) => {
              const section = ((d.section as string) || '').trim();
              return section !== this.curriculumSection;
            });
            this.form.markAsPristine();
            this.cdr.markForCheck();
          } else {
            this.loadEvent({ silent: true });
          }
          onSuccess?.();
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

  onSectionSidebarUpdate(_modal: { dismiss: (reason?: string) => void }): void {
    this.onSubmit(undefined, { skipReload: true });
  }

  onSectionSidebarCancel(modal: { dismiss: (reason?: string) => void }): void {
    modal.dismiss('cancel');
  }

  getSectionPanelTitle(section: EventEditSectionPanel): string {
    const titles: Record<EventEditSectionPanel, string> = {
      curriculum: 'Event Curriculum Information',
      bonuses: 'Event Bonuses',
      salary: 'Salary Information',
      qa: 'Questions & Answers',
      organized: 'Organized By'
    };
    return titles[section];
  }

  getCurriculumItemTitle(index: number): string {
    const title = this.eventDetailsArray.at(index)?.get('title')?.value;
    const trimmed = title != null ? String(title).trim() : '';
    return trimmed || `Information Section ${index + 1}`;
  }

  openSectionSidebar(section: EventEditSectionPanel, curriculumIndex?: number): void {
    this.activeSectionPanel = section;
    this.selectedCurriculumIndex = curriculumIndex ?? null;

    setTimeout(() => {
      if (!this.eventSectionSidebarRef) {
        this.cdr.detectChanges();
      }
      if (!this.eventSectionSidebarRef) return;

      if (this.sectionSidebarModalRef) {
        this.cdr.markForCheck();
        if (section === 'curriculum' && curriculumIndex != null) {
          setTimeout(() => this.scrollToCurriculumItem(curriculumIndex), 80);
        }
        return;
      }

      this.sectionSidebarModalRef = this.modalService.open(this.eventSectionSidebarRef, {
        size: 'xl',
        scrollable: true,
        windowClass: 'modal-right event-section-sidebar-modal curriculum-detail-modal',
        backdrop: true,
        keyboard: true
      });
      this.sectionSidebarModalRef.result.catch(() => {}).finally(() => {
        this.sectionSidebarModalRef = null;
        this.selectedCurriculumIndex = null;
      });
      this.cdr.markForCheck();

      if (section === 'curriculum' && curriculumIndex != null) {
        setTimeout(() => this.scrollToCurriculumItem(curriculumIndex), 120);
      }
    }, 0);
  }

  private scrollToCurriculumItem(index: number): void {
    const el = document.getElementById(`event-curriculum-item-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
