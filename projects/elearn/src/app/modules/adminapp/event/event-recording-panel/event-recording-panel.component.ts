import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AdminAppService } from '../../adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-event-recording-panel',
  templateUrl: './event-recording-panel.component.html',
  styleUrls: ['./event-recording-panel.component.scss'],
  standalone: false
})
export class EventRecordingPanelComponent implements OnChanges {
  @Input() eventId: string | null = null;
  @Input() occurrenceId: string | null = null;
  @Input() isCompleted = false;

  loading = false;
  saving = false;
  recordingAmount: number | null = null;
  videos: any[] = [];
  materials: any[] = [];
  uploadingVideoIndex: number | null = null;
  uploadingFileKey: string | null = null;
  videoUploadProgress: Record<number, number> = {};
  pdfUploadProgress: Record<string, number> = {};
  videoPlaybackErrors: Record<number, boolean> = {};

  constructor(
    private appService: AdminAppService,
    private toaster: ToasterService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['eventId'] || changes['occurrenceId'] || changes['isCompleted']) && this.canLoad()) {
      this.loadContent();
    }
  }

  canLoad(): boolean {
    return !!(this.eventId && this.occurrenceId && this.isCompleted);
  }

  loadContent(): void {
    if (!this.canLoad()) return;
    this.loading = true;
    this.appService.getEventRecordingContent(this.eventId!, this.occurrenceId!).subscribe({
      next: (res) => {
        this.recordingAmount = res?.recordingAmount != null ? Number(res.recordingAmount) : null;
        this.videos = (res?.videos || []).map((v: any) => this.normalizeVideo(v));
        this.materials = (res?.materials || []).map((m: any) => ({
          ...m,
          files: (m.files || []).map((f: any) => ({ ...f }))
        }));
        if (this.videos.length === 0) this.addVideo();
        if (this.materials.length === 0) this.addMaterial();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.videos = [{ title: '', description: '', videoLink: '', sortOrder: 0 }];
        this.materials = [{ title: '', description: '', sortOrder: 0, files: [] }];
      }
    });
  }

  addVideo(): void {
    this.videos.push({ title: '', description: '', videoLink: '', sortOrder: this.videos.length });
  }

  removeVideo(index: number): void {
    this.videos.splice(index, 1);
    if (this.videos.length === 0) this.addVideo();
  }

  addMaterial(): void {
    this.materials.push({ title: '', description: '', sortOrder: this.materials.length, files: [] });
  }

  removeMaterial(index: number): void {
    this.materials.splice(index, 1);
    if (this.materials.length === 0) this.addMaterial();
  }

  normalizeVideo(v: any): any {
    return {
      ...v,
      title: v.title ?? v.Title ?? '',
      description: v.description ?? v.Description ?? '',
      videoLink: (v.videoLink ?? v.VideoLink ?? '').trim(),
      id: v.id ?? v.Id
    };
  }

  videoStreamUrl(url: string): string {
    return this.appService.getVideoStreamUrl(url);
  }

  isYoutube(url: string): boolean {
    return !!url && (url.includes('youtube.com') || url.includes('youtu.be'));
  }

  onVideoPlaybackError(index: number): void {
    this.videoPlaybackErrors[index] = true;
  }

  onVideoFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingVideoIndex = index;
    this.videoUploadProgress[index] = 0;
    delete this.videoPlaybackErrors[index];
    this.appService.uploadEventVideoWithProgress(file).subscribe({
      next: (res) => {
        if (res.progress != null) {
          this.videoUploadProgress[index] = res.progress;
        }
        if (res.url) {
          this.videos[index].videoLink = res.url;
          this.toaster.showSuccess('Video uploaded. Click Save recording content.');
          this.uploadingVideoIndex = null;
          delete this.videoUploadProgress[index];
          delete this.videoPlaybackErrors[index];
          input.value = '';
        }
      },
      error: (err) => {
        this.uploadingVideoIndex = null;
        delete this.videoUploadProgress[index];
        this.toaster.showError(
          err?.error?.message ||
            err?.message ||
            'Video upload failed. If this persists, update S3 bucket CORS to allow https://oilandgasclub.com (see docs/S3-CORS-SETUP.md).'
        );
        input.value = '';
      }
    });
  }

  onPdfFileSelected(event: Event, materialIndex: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const key = `${materialIndex}-${file.name}`;
    this.uploadingFileKey = key;
    this.pdfUploadProgress[key] = 0;
    this.appService.uploadEventRecordingFileWithProgress(file).subscribe({
      next: (res) => {
        if (res.progress != null) {
          this.pdfUploadProgress[key] = res.progress;
        }
        if (res.url) {
          const mat = this.materials[materialIndex];
          if (!mat.files) mat.files = [];
          mat.files.push({
            fileName: file.name,
            fileUrl: res.url,
            fileType: file.type || 'application/pdf',
            fileSizeBytes: file.size,
            sortOrder: mat.files.length
          });
          this.uploadingFileKey = null;
          delete this.pdfUploadProgress[key];
          input.value = '';
          this.toaster.showSuccess('PDF uploaded.');
        }
      },
      error: (err) => {
        this.uploadingFileKey = null;
        delete this.pdfUploadProgress[key];
        this.toaster.showError(err?.error?.message || err?.message || 'PDF upload failed.');
        input.value = '';
      }
    });
  }

  removeFile(materialIndex: number, fileIndex: number): void {
    this.materials[materialIndex].files.splice(fileIndex, 1);
  }

  save(): void {
    if (!this.canLoad() || this.saving) return;
    const missingVideoUrl = this.videos.some(
      (v) => (v.title || '').trim() && !(v.videoLink || '').trim()
    );
    if (missingVideoUrl) {
      this.toaster.showError('A video has a title but no URL. Upload the file and wait for the URL field to fill, then save.');
      return;
    }
    this.saving = true;
    const body = {
      recordingAmount: this.recordingAmount,
      videos: this.videos
        .filter(v => (v.title || '').trim() || (v.videoLink || '').trim())
        .map((v, i) => ({
          id: v.id || null,
          title: v.title || '',
          description: v.description || '',
          videoLink: (v.videoLink || '').trim(),
          sortOrder: i
        })),
      materials: this.materials
        .filter(m => (m.title || '').trim() || (m.description || '').trim() || (m.files?.length > 0))
        .map((m, i) => ({
          id: m.id || null,
          title: m.title || '',
          description: m.description || '',
          sortOrder: i,
          files: (m.files || []).map((f: any, fi: number) => ({
            id: f.id || null,
            fileName: f.fileName || '',
            fileUrl: f.fileUrl || '',
            fileType: f.fileType || '',
            fileSizeBytes: f.fileSizeBytes || 0,
            sortOrder: fi
          }))
        }))
    };
    this.appService.saveEventRecordingContent(this.eventId!, this.occurrenceId!, body).subscribe({
      next: (res) => {
        this.saving = false;
        this.toaster.showSuccess('Recording content saved.');
        if (res) {
          this.recordingAmount = res.recordingAmount != null ? Number(res.recordingAmount) : this.recordingAmount;
          this.videos = (res.videos || this.videos).map((v: any) => this.normalizeVideo(v));
          this.materials = res.materials || this.materials;
        }
      },
      error: (err) => {
        this.saving = false;
        this.toaster.showError(err?.error?.message || 'Failed to save recording content.');
      }
    });
  }
}
