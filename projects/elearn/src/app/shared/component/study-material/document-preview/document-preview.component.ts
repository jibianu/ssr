import { Component, Input } from '@angular/core';
import { StudyMaterialFileDto, isPdfType, officeEmbedUrl } from '../../../models/study-material.model';

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.scss'],
  standalone: false
})
export class DocumentPreviewComponent {
  @Input() file!: StudyMaterialFileDto;
  /** Student reading: inline PDF pages, no toolbar, no download. */
  @Input() readingMode: 'inline' | 'panel' = 'inline';
  @Input() allowDownload = false;

  get previewSrc(): string {
    if (!this.file?.fileUrl) return '';
    if (this.file.previewUrl && !isPdfType(this.file.fileType)) {
      return this.file.previewUrl;
    }
    if (isPdfType(this.file.fileType)) {
      return this.file.fileUrl;
    }
    return officeEmbedUrl(this.file.fileUrl);
  }

  get isPdf(): boolean {
    return isPdfType(this.file?.fileType);
  }

  get useInlinePdf(): boolean {
    return this.readingMode === 'inline' && this.isPdf;
  }

  get iconClass(): string {
    const t = (this.file?.fileType || '').toLowerCase();
    if (t === 'pdf') return 'fa-file-pdf-o';
    if (t === 'ppt' || t === 'pptx') return 'fa-file-powerpoint-o';
    if (t === 'doc' || t === 'docx') return 'fa-file-word-o';
    if (t === 'xls' || t === 'xlsx') return 'fa-file-excel-o';
    return 'fa-file-o';
  }
}
