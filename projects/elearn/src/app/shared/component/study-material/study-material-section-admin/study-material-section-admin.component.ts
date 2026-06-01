import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { StudyMaterialFileDto } from '../../../models/study-material.model';
import { studyMaterialDescriptionToHtml } from '../../custom-rich-text-editor/utils/content-converter.util';
import { ToasterService } from '../../toaster/toaster.service';

export interface StudyMaterialSectionSnapshot {
  title: string;
  description: string;
  contentFormat: string;
}

@Component({
  selector: 'app-study-material-section-admin',
  templateUrl: './study-material-section-admin.component.html',
  styleUrls: ['./study-material-section-admin.component.scss'],
  standalone: false
})
export class StudyMaterialSectionAdminComponent {
  @Input() sectionForm!: UntypedFormGroup;
  @Input() index = 0;
  @Input() sectionKey = '';
  @Input() savedOnce = false;
  @Input() uploadImage?: (file: File) => Observable<string>;

  @Output() remove = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<StudyMaterialSectionSnapshot>();
  @Output() archive = new EventEmitter<void>();
  @Output() uploadInProgressChange = new EventEmitter<boolean>();

  showPreview = false;
  previewAfterSaveOnly = true;
  copyFeedback = '';

  constructor(private toaster: ToasterService) {}

  get files(): StudyMaterialFileDto[] {
    return this.sectionForm?.get('files')?.value || [];
  }

  set files(v: StudyMaterialFileDto[]) {
    this.sectionForm?.patchValue({ files: v });
  }

  get sectionId(): string {
    return this.sectionForm?.get('id')?.value;
  }

  /** Normalizes legacy JSON block content to HTML for the custom editor. */
  get editorHtml(): string {
    return studyMaterialDescriptionToHtml(this.sectionForm?.get('description')?.value);
  }

  get canShowInlinePreview(): boolean {
    return this.savedOnce && (this.showPreview || !this.previewAfterSaveOnly);
  }

  togglePreview(event: Event): void {
    event.stopPropagation();
    if (!this.savedOnce && this.previewAfterSaveOnly) return;
    this.showPreview = !this.showPreview;
  }

  onHtmlChange(html: string): void {
    this.sectionForm.patchValue({ description: html, contentFormat: 'html' });
  }

  getDescriptionContent(): string {
    return this.editorHtml;
  }

  async copySectionContent(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    const title = (this.sectionForm.get('title')?.value || '').trim();
    const html = this.getDescriptionContent();
    const plain = this.htmlToPlainText(html);
    const text = title ? `${title}\n\n${plain}` : plain;

    if (!text.trim()) {
      this.toaster.showError('Nothing to copy — add content first.');
      return;
    }

    const copied = await this.writeClipboard(text, title, html);
    if (copied) {
      this.copyFeedback = 'Copied!';
      this.toaster.showSuccess('Section content copied to clipboard');
      setTimeout(() => (this.copyFeedback = ''), 2000);
    } else {
      this.toaster.showError('Could not copy. Select text and use Ctrl+C, or allow clipboard access.');
    }
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }

  onDuplicate(event: Event): void {
    event.stopPropagation();
    this.duplicate.emit({
      title: this.sectionForm.get('title')?.value || '',
      description: this.getDescriptionContent(),
      contentFormat: this.sectionForm.get('contentFormat')?.value || 'html'
    });
  }

  onArchive(event: Event): void {
    event.stopPropagation();
    this.archive.emit();
  }

  private htmlToPlainText(html: string): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  }

  private async writeClipboard(text: string, title: string, html: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([title ? `<h2>${title}</h2>${html}` : html], { type: 'text/html' });
        const textBlob = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob
          })
        ]);
        return true;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fallback below */
    }
    return this.legacyCopy(text);
  }

  private legacyCopy(text: string): boolean {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
