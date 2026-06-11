import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminAppService } from '../../adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';

@Component({
  selector: 'app-event-add',
  templateUrl: './event-add.component.html',
  styleUrls: ['./event-add.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class EventAddComponent implements OnInit {
  private static readonly DEFAULT_HELP_PHONE = '+91 98402 87919';
  private static readonly DEFAULT_HELP_EMAIL = 'event@oilandgasclub.com';

  form: UntypedFormGroup;
  submitted = false;
  saving = false;
  titleImageFile: File | null = null;
  titleImagePreview: string | null = null;
  titleImageUploadedUrl: string | null = null;
  videoUploading = false;
  mediaDeleting = false;
  curriculumExpanded = false;
  bonusesExpanded = false;

  constructor(
    private fb: UntypedFormBuilder,
    private appService: AdminAppService,
    private toaster: ToasterService,
    private router: Router,
    private sharedService: SharedService,
    private sanitizer: DomSanitizer
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
    this.buildForm();
  }

  private get eventsListPath(): string {
    return (this.router?.url ?? '').includes('/trainer/events') ? '/app/trainer/events' : '/app/admin/events';
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
        section: 'format',
        sortOrder: index,
        title: item.title,
        description: item.value,
        tag: '',
        amount: null,
        imageUrl: '',
        count: null
      }));
  }

  private buildSupportPayload(helpPhones: string[], helpEmails: string[]): Record<string, unknown>[] {
    const payload: Record<string, unknown>[] = [];
    let sortOrder = 0;
    const addEntry = (title: string, value: string) => {
      payload.push({
        section: 'support',
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
      addEntry('Phone', EventAddComponent.DEFAULT_HELP_PHONE);
      addEntry('Email', EventAddComponent.DEFAULT_HELP_EMAIL);
    }

    return payload;
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
      helpPhones: this.fb.array([this.fb.control(EventAddComponent.DEFAULT_HELP_PHONE)]),
      helpEmails: this.fb.array([this.fb.control(EventAddComponent.DEFAULT_HELP_EMAIL)]),
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      duration: [''],
      timing: [''],
      amount: [0, [Validators.required, Validators.min(0)]],
      allowCoupons: [false],
      applicableCouponIds: [[] as string[]],
      location: ['', Validators.required]
    });
  }

  get f() { return this.form.controls; }
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

  onTitleImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.setTitleImageFile(file);
  }

  onTitleImageDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    this.setTitleImageFile(file || null);
  }

  private setTitleImageFile(file: File | null | undefined): void {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toaster.showError('Please select an image file (PNG, JPG, SVG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toaster.showError('Image must be under 10MB.');
      return;
    }
    this.titleImageFile = file;
    this.titleImageUploadedUrl = null;
    this.titleImagePreview = null;
    const reader = new FileReader();
    reader.onload = () => { this.titleImagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removeTitleImage(): void {
    this.titleImageFile = null;
    this.titleImagePreview = null;
    this.titleImageUploadedUrl = null;
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

  removeVideo(): void {
    const url = (this.form.get('videoUrl')?.value ?? '').trim();
    if (!url) return;
    // Clear UI immediately
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

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;

    const uploadFirst = this.titleImageFile != null;
    const doCreate = (titleImageUrl: string | null) => {
      const v = this.form.value;
      let eventInfo = v.eventInfo || '';
      if (titleImageUrl) eventInfo = `${eventInfo}\n[TitleImage:${titleImageUrl}]`;
      const videoUrl = (v.videoUrl || '').trim();
      if (videoUrl) eventInfo = `${eventInfo}\n[VideoUrl:${videoUrl}]`;
      const amount = Number(v.amount);
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
        allowCoupons: !!v.allowCoupons,
        applicableCouponIds: v.applicableCouponIds || [],
        location: v.location?.trim() ?? '',
        eventDetails: [
          ...this.buildFormatPayload(v.skillLevel, v.certification, v.mode),
          ...this.buildSupportPayload(v.helpPhones, v.helpEmails)
        ]
      };
      this.appService.createEvent(payload).subscribe({
        next: () => {
          this.toaster.showSuccess('Event created successfully.');
          this.router.navigate([this.eventsListPath]);
        },
        error: (err) => {
          this.saving = false;
          const e = err?.error;
          if (err?.error != null) console.error('Event create error response:', err.error);
          const messages = e?.messages ?? e?.Messages;
          const msg = (Array.isArray(messages) ? messages.join('. ') : null)
            ?? e?.message ?? e?.Message ?? err?.message ?? 'Failed to create event.';
          this.toaster.showError(msg);
        }
      });
    };

    if (uploadFirst && this.titleImageFile) {
      this.appService.uploadEventTitleImage(this.titleImageFile).subscribe({
        next: (res) => {
          const r = res as { url?: string; Url?: string };
          const url = r?.url ?? r?.Url ?? null;
          doCreate(url);
        },
        error: (err) => {
          this.saving = false;
          this.toaster.showError(err?.error?.message ?? err?.message ?? 'Image upload failed.');
        }
      });
    } else {
      doCreate(null);
    }
  }

  goBack(): void {
    this.router.navigate([this.eventsListPath]);
  }
}
