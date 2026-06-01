import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  STUDY_MATERIAL_ALLOWED_EXTENSIONS,
  STUDY_MATERIAL_MAX_FILE_BYTES,
  StudyMaterialFileDto
} from '../../../models/study-material.model';
import { StudyMaterialFileService } from '../../../services/study-material-file.service';

@Component({
  selector: 'app-file-upload-panel',
  templateUrl: './file-upload-panel.component.html',
  styleUrls: ['./file-upload-panel.component.scss'],
  standalone: false
})
export class FileUploadPanelComponent {
  @Input() studyMaterialId!: string;
  @Input() files: StudyMaterialFileDto[] = [];
  @Input() readonly = false;

  @Output() filesChange = new EventEmitter<StudyMaterialFileDto[]>();
  @Output() uploadInProgressChange = new EventEmitter<boolean>();

  dragOver = false;
  uploadProgress: Record<string, number> = {};
  errorMessage = '';

  readonly allowedLabel = 'PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX (max 50 MB)';

  constructor(private fileService: StudyMaterialFileService) {}

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
    const list = e.dataTransfer?.files;
    if (list) this.handleFiles(Array.from(list));
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) this.handleFiles(Array.from(input.files));
    input.value = '';
  }

  handleFiles(fileList: File[]): void {
    if (this.readonly || !this.studyMaterialId || this.studyMaterialId === '00000000-0000-0000-0000-000000000000') {
      this.errorMessage = 'Save the section first before uploading files.';
      return;
    }
    for (const file of fileList) {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!STUDY_MATERIAL_ALLOWED_EXTENSIONS.includes(ext)) {
        this.errorMessage = `File type not allowed: ${file.name}`;
        continue;
      }
      if (file.size > STUDY_MATERIAL_MAX_FILE_BYTES) {
        this.errorMessage = `File too large: ${file.name}`;
        continue;
      }
      this.uploadOne(file);
    }
  }

  uploadOne(file: File): void {
    const key = file.name + Date.now();
    this.uploadProgress[key] = 0;
    this.uploadInProgressChange.emit(true);
    this.errorMessage = '';

    this.fileService.uploadFile(this.studyMaterialId, file).subscribe({
      next: (ev) => {
        if (ev.progress != null) this.uploadProgress[key] = ev.progress;
        if (ev.result) {
          this.files = [...this.files, ev.result];
          this.filesChange.emit(this.files);
          delete this.uploadProgress[key];
          this.uploadInProgressChange.emit(Object.keys(this.uploadProgress).length > 0);
        }
      },
      error: (err) => {
        const detail = this.extractUploadError(err);
        this.errorMessage = detail ? `Upload failed: ${file.name} — ${detail}` : `Upload failed: ${file.name}`;
        console.error('Study material file upload failed', { file: file.name, status: err?.status, error: err?.error });
        delete this.uploadProgress[key];
        this.uploadInProgressChange.emit(false);
      },
      complete: () => {
        if (this.uploadProgress[key] !== undefined) delete this.uploadProgress[key];
        this.uploadInProgressChange.emit(Object.keys(this.uploadProgress).length > 0);
      }
    });
  }

  deleteFile(file: StudyMaterialFileDto): void {
    if (!file.id || this.readonly) return;
    this.fileService.deleteFile(file.id).subscribe({
      next: () => {
        this.files = this.files.filter((f) => f.id !== file.id);
        this.filesChange.emit(this.files);
      }
    });
  }

  get progressEntries(): { name: string; pct: number }[] {
    return Object.entries(this.uploadProgress).map(([name, pct]) => ({ name, pct }));
  }

  /** Turn an HTTP error into a human-readable reason so failures are diagnosable. */
  private extractUploadError(err: any): string {
    if (!err) return '';
    switch (err.status) {
      case 0:
        return 'Network error or the file is too large for the server. Please try a smaller file or check your connection.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to upload files to this section.';
      case 404:
        return 'Section not found. Save the section first, then upload.';
      case 413:
        return 'The file is too large for the server.';
      case 504:
        return 'The upload timed out. Please try again or use a smaller file.';
    }
    const e = err.error;
    if (typeof e === 'string' && e.trim()) return e;
    if (Array.isArray(e?.messages) && e.messages.length) return e.messages.join(', ');
    if (Array.isArray(e?.Messages) && e.Messages.length) return e.Messages.join(', ');
    if (e?.message) return e.message;
    return err.message || '';
  }
}
