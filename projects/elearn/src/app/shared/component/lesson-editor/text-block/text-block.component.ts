import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Observable, TimeoutError } from 'rxjs';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TextBlock } from '../../../models/lesson-content.model';
import { ToasterService } from '../../toaster/toaster.service';
import { BlockSelectionService } from '../block-selection.service';

// All image formats allowed - no restrictions

export type TextBlockMode = 'author' | 'preview' | 'student';

@Component({
    selector: 'app-text-block',
    templateUrl: './text-block.component.html',
    styleUrls: ['./text-block.component.scss'],
    standalone: false
})
export class TextBlockComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() block: TextBlock;
  @Input() mode: TextBlockMode = 'author';
  /** Optional: (file) => Observable<url>. When provided, enables inline + block image upload. */
  @Input() uploadImage?: (file: File) => Observable<string>;
  /** Optional: (url) => Observable<void>. When provided, enables block image delete from S3. */
  @Input() deleteImage?: (url: string) => Observable<unknown>;
  /** Optional: callback when upload starts/stops (for disabling Update button). */
  @Input() onUploadStateChange?: (inProgress: boolean) => void;
  @Output() contentChange = new EventEmitter<string>();
  @Output() imageUrlChange = new EventEmitter<string | null>();

  @ViewChild('editableEl') editableEl: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput: ElementRef<HTMLInputElement>;
  @ViewChild('blockImageInput') blockImageInput: ElementRef<HTMLInputElement>;

  uploadingBlockImage = false;

  private mutationObserver: MutationObserver | null = null;

  constructor(
    private toasterService: ToasterService,
    private blockSelection: BlockSelectionService
  ) {}

  ngAfterViewInit(): void {
    if (this.mode === 'author' && this.editableEl?.nativeElement) {
      const el = this.editableEl.nativeElement;
      if (el.getAttribute('contenteditable') !== 'true') {
        this.syncContentToElement();
        this.setupContentEditable();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['block'] && this.mode === 'author' && this.editableEl?.nativeElement) {
      const el = this.editableEl.nativeElement;
      if (el.getAttribute('contenteditable') === 'true') {
        const newContent = this.block?.content ?? '';
        if (el.innerHTML !== newContent) {
          this.syncContentToElement();
        }
      }
    }
  }

  private syncContentToElement(): void {
    const el = this.editableEl?.nativeElement;
    if (el) {
      el.innerHTML = this.block?.content ?? '';
    }
  }

  private setupContentEditable(): void {
    const el = this.editableEl?.nativeElement;
    if (!el) return;
    el.contentEditable = 'true';
    el.addEventListener('input', this.onInput);
    el.addEventListener('focus', this.onFocus);
    el.addEventListener('blur', this.onBlur);
    this.mutationObserver = new MutationObserver(() => this.emitContent());
    this.mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });
  }

  private onInput = (): void => {
    this.emitContent();
  };

  private onFocus = (): void => {
    const id = this.block?.id;
    if (id) {
      this.blockSelection.setActiveBlock(id, 'text');
      this.blockSelection.registerTextBlockEditor(id, {
        execCmd: (cmd, value) => this.execCmd(cmd, value),
        insertLink: () => this.insertLink(),
        insertImage: this.uploadImage ? () => this.insertImage() : undefined,
        insertCodeBlock: () => this.insertCodeBlock(),
        insertTable: () => this.insertTable()
      });
    }
  };

  private onBlur = (): void => {
    this.emitContent();
    const id = this.block?.id;
    if (id) {
      this.blockSelection.unregisterTextBlockEditor(id);
      this.blockSelection.clearActiveBlock();
    }
  };

  private emitContent(): void {
    const html = this.editableEl?.nativeElement?.innerHTML ?? '';
    this.contentChange.emit(html);
  }

  private getEditableEl(): HTMLDivElement | null {
    return this.editableEl?.nativeElement ?? null;
  }

  execCmd(cmd: string, value?: string): void {
    const el = this.getEditableEl();
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, value ?? null);
    this.emitContent();
  }

  formatBlock(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const tag = select.value;
    this.execCmd('formatBlock', tag);
  }

  insertLink(): void {
    const url = prompt('Enter URL:', 'https://');
    if (url) this.execCmd('createLink', url);
  }

  insertImage(): void {
    this.imageInput?.nativeElement?.click();
  }

  triggerBlockImageInput(): void {
    const input = this.blockImageInput?.nativeElement;
    if (input) {
      input.click();
    } else {
      console.error('Block image input not found');
      this.toasterService.showError('Cannot open file selector. Please try again.');
    }
  }

  onImageFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !this.uploadImage) return;
    this.uploadImage(file).subscribe({
      next: (url) => {
        if (url) {
          const el = this.getEditableEl();
          if (el) {
            el.focus();
            const safeUrl = url.replace(/"/g, '&quot;');
            document.execCommand('insertHTML', false, `<img src="${safeUrl}" alt="Image" style="max-width:100%;height:auto;" />`);
            this.emitContent();
          }
        }
        input.value = '';
      },
      error: () => { input.value = ''; }
    });
  }

  onBlockImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      console.warn('No file selected');
      return;
    }
    if (!this.uploadImage) {
      this.toasterService.showError('Upload not configured.');
      console.error('uploadImage function not provided');
      return;
    }
    // No file type or size restrictions - all formats and sizes allowed
    this.uploadingBlockImage = true;
    this.onUploadStateChange?.(true);
    this.uploadImage(file).pipe(
      timeout(120000), // 2 minute timeout for larger files
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.toasterService.showError('Upload timed out. Please try again.');
        } else {
          console.error('Image upload error:', err);
          this.toasterService.showError('Image upload failed. Please try again.');
        }
        return of(null);
      }),
      finalize(() => {
        this.uploadingBlockImage = false;
        this.onUploadStateChange?.(false);
        input.value = '';
      })
    ).subscribe({
      next: (url) => {
        if (url) {
          this.imageUrlChange.emit(url);
        }
      }
    });
  }

  deleteBlockImage(): void {
    const url = this.block?.imageUrl;
    if (!url) return;
    if (!this.deleteImage) {
      this.imageUrlChange.emit(null);
      return;
    }
    this.deleteImage(url).subscribe({
      next: () => this.imageUrlChange.emit(null),
      error: () => this.toasterService.showError('Failed to delete image.')
    });
  }

  insertBlockquote(): void {
    this.execCmd('formatBlock', 'blockquote');
  }

  insertCodeBlock(): void {
    const el = this.getEditableEl();
    if (!el) return;
    el.focus();
    const html = '<pre><code>Code here</code></pre>';
    document.execCommand('insertHTML', false, html);
    this.emitContent();
  }

  insertTable(): void {
    const el = this.getEditableEl();
    if (!el) return;
    el.focus();
    const html = '<table class="table table-bordered"><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></table>';
    document.execCommand('insertHTML', false, html);
    this.emitContent();
  }

  ngOnDestroy(): void {
    const el = this.editableEl?.nativeElement;
    if (el) {
      el.removeEventListener('input', this.onInput);
      el.removeEventListener('focus', this.onFocus);
      el.removeEventListener('blur', this.onBlur);
    }
    if (this.block?.id) {
      this.blockSelection.unregisterTextBlockEditor(this.block.id);
      this.blockSelection.clearActiveBlock();
    }
    this.mutationObserver?.disconnect();
  }

  get isEditable(): boolean {
    return this.mode === 'author';
  }
}
