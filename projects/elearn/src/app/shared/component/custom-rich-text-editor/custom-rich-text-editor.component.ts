import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { EditorToolbarComponent } from './editor-toolbar/editor-toolbar.component';
import {
  BlockFormat,
  EditorCommand,
  EditorSnapshot,
  ToolbarState
} from './models/editor-types';
import { RichTextCommandService } from './services/rich-text-command.service';
import { RichTextHistoryService } from './services/rich-text-history.service';
import { SelectionManagerService } from './services/selection-manager.service';
import { sanitizeEditorHtml, stripHtmlToText } from './utils/html-sanitizer.util';
import { isEditorHtmlEmpty } from './utils/content-converter.util';

@Component({
  selector: 'app-custom-rich-text-editor',
  standalone: true,
  imports: [CommonModule, EditorToolbarComponent],
  templateUrl: './custom-rich-text-editor.component.html',
  styleUrls: ['./custom-rich-text-editor.component.scss'],
  providers: [
    SelectionManagerService,
    RichTextCommandService,
    RichTextHistoryService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomRichTextEditorComponent),
      multi: true
    }
  ]
})
export class CustomRichTextEditorComponent
  implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor
{
  @Input() title = '';
  @Input() html = '';
  @Input() titlePlaceholder = 'Title';
  @Input() bodyPlaceholder = 'Write hear';
  @Input() readonly = false;
  @Input() showTitle = true;
  /** Reduces min-height for shorter fields (e.g. answer options). */
  @Input() compact = false;
  /** When false, title area is hidden and only body is edited. */
  @Input() uploadImage?: (file: File) => Observable<string>;

  @Output() titleChange = new EventEmitter<string>();
  @Output() htmlChange = new EventEmitter<string>();
  @Output() uploadInProgressChange = new EventEmitter<boolean>();

  @ViewChild('titleEl') titleEl?: ElementRef<HTMLDivElement>;
  @ViewChild('bodyEl') bodyEl?: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  toolbarState: ToolbarState = {
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    blockFormat: 'p',
    canUndo: false,
    canRedo: false
  };

  private activeField: 'title' | 'body' = 'body';
  private historyTimer: ReturnType<typeof setTimeout> | null = null;
  private imageUploadSub?: Subscription;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private disabled = false;

  constructor(
    private selection: SelectionManagerService,
    private commands: RichTextCommandService,
    private history: RichTextHistoryService
  ) {}

  ngAfterViewInit(): void {
    this.syncDomFromInputs();
    this.history.reset(this.snapshot());
    this.refreshToolbar();
    this.resizeBody();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['html'] || changes['title']) && this.bodyEl) {
      this.syncDomFromInputs();
    }
  }

  ngOnDestroy(): void {
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.imageUploadSub?.unsubscribe();
  }

  writeValue(value: string | null): void {
    this.html = value ?? '';
    if (this.bodyEl) {
      this.bodyEl.nativeElement.innerHTML = this.html;
      this.resizeBody();
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.readonly = isDisabled;
  }

  get isEditable(): boolean {
    return !this.readonly && !this.disabled;
  }

  @HostListener('document:selectionchange')
  onSelectionChange(): void {
    this.refreshToolbar();
  }

  onTitleFocus(): void {
    this.activeField = 'title';
    this.selection.setActiveRoot(this.titleEl?.nativeElement ?? null);
    this.selection.saveSelection(this.titleEl?.nativeElement);
  }

  onBodyFocus(): void {
    this.activeField = 'body';
    this.selection.setActiveRoot(this.bodyEl?.nativeElement ?? null);
    this.selection.saveSelection(this.bodyEl?.nativeElement);
  }

  onTitleInput(): void {
    const plain = this.titleEl?.nativeElement?.textContent?.trim() ?? '';
    this.title = plain;
    this.titleChange.emit(plain);
    this.scheduleHistory();
  }

  onBodyInput(): void {
    this.emitBodyChange();
    this.resizeBody();
    this.scheduleHistory();
  }

  onFieldBlur(): void {
    this.onTouched();
    this.pushHistoryNow();
  }

  onToolbarCommand(cmd: EditorCommand): void {
    if (!this.isEditable) return;
    const root = this.getActiveRoot();
    if (!root) return;
    this.selection.restoreSelection();

    switch (cmd) {
      case 'bold':
        this.commands.applyBold(root);
        break;
      case 'italic':
        this.commands.applyItalic(root);
        break;
      case 'underline':
        this.commands.applyUnderline(root);
        break;
      case 'bulletList':
        this.commands.applyBulletList(root);
        break;
      case 'orderedList':
        this.commands.applyOrderedList(root);
        break;
      case 'blockquote':
        this.commands.applyBlockquote(root);
        break;
      case 'codeBlock':
        this.commands.applyCodeBlock(root);
        break;
      case 'link':
        this.commands.applyLink(root);
        break;
      case 'image':
        this.triggerImageUpload();
        break;
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
    }

    if (cmd !== 'undo' && cmd !== 'redo' && cmd !== 'image') {
      this.emitBodyChange();
      this.scheduleHistory();
    }
    this.refreshToolbar();
    root.focus();
  }

  onFormatBlock(format: BlockFormat): void {
    if (!this.isEditable) return;
    const root = this.getActiveRoot();
    if (!root) return;
    this.selection.restoreSelection();
    this.commands.applyFormatBlock(root, format);
    this.emitBodyChange();
    this.scheduleHistory();
    this.refreshToolbar();
    root.focus();
  }

  onTitlePaste(event: ClipboardEvent): void {
    this.handlePaste(event, this.titleEl?.nativeElement, false);
  }

  onBodyPaste(event: ClipboardEvent): void {
    this.handlePaste(event, this.bodyEl?.nativeElement, true);
  }

  onBodyKeydown(event: KeyboardEvent): void {
    if (!this.isEditable) return;
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        this.onToolbarCommand('bold');
      } else if (key === 'i') {
        event.preventDefault();
        this.onToolbarCommand('italic');
      } else if (key === 'u') {
        event.preventDefault();
        this.onToolbarCommand('underline');
      } else if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.onToolbarCommand('undo');
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        this.onToolbarCommand('redo');
      }
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.uploadImage || !this.bodyEl) return;

    this.uploadInProgressChange.emit(true);
    this.imageUploadSub?.unsubscribe();
    this.imageUploadSub = this.uploadImage(file)
      .pipe(finalize(() => this.uploadInProgressChange.emit(false)))
      .subscribe({
        next: (url) => {
          if (url) {
            this.selection.setActiveRoot(this.bodyEl!.nativeElement);
            this.commands.insertImage(this.bodyEl!.nativeElement, url, file.name);
            this.emitBodyChange();
            this.scheduleHistory();
            this.refreshToolbar();
          }
        }
      });
  }

  get titleEmpty(): boolean {
    return !(this.titleEl?.nativeElement?.textContent?.trim());
  }

  get bodyEmpty(): boolean {
    return isEditorHtmlEmpty(this.bodyEl?.nativeElement?.innerHTML);
  }

  private getActiveRoot(): HTMLElement | null {
    if (this.activeField === 'title' && this.showTitle) {
      return this.titleEl?.nativeElement ?? null;
    }
    return this.bodyEl?.nativeElement ?? null;
  }

  private triggerImageUpload(): void {
    this.activeField = 'body';
    this.selection.setActiveRoot(this.bodyEl?.nativeElement ?? null);
    this.imageInput?.nativeElement?.click();
  }

  private handlePaste(event: ClipboardEvent, root: HTMLElement | undefined, rich: boolean): void {
    if (!this.isEditable || !root) return;
    event.preventDefault();
    const data = event.clipboardData;
    if (!data) return;

    const html = data.getData('text/html');
    const text = data.getData('text/plain');
    this.selection.setActiveRoot(root);
    this.selection.saveSelection(root);

    if (rich && html) {
      this.commands.insertHtmlAtSelection(root, html);
    } else {
      this.commands.insertPlainTextAtSelection(root, text);
    }

    if (root === this.bodyEl?.nativeElement) {
      this.emitBodyChange();
      this.resizeBody();
    } else {
      this.onTitleInput();
    }
    this.scheduleHistory();
  }

  private emitBodyChange(): void {
    const raw = this.bodyEl?.nativeElement?.innerHTML ?? '';
    const clean = sanitizeEditorHtml(raw);
    if (clean !== this.html) {
      this.html = clean;
      this.htmlChange.emit(clean);
      this.onChange(clean);
    }
  }

  private syncDomFromInputs(): void {
    if (this.titleEl && this.showTitle) {
      const el = this.titleEl.nativeElement;
      if ((el.textContent ?? '').trim() !== (this.title ?? '').trim()) {
        el.textContent = this.title ?? '';
      }
    }
    if (this.bodyEl) {
      const el = this.bodyEl.nativeElement;
      const next = this.html || '';
      if (el.innerHTML !== next) {
        el.innerHTML = next || '';
      }
    }
    this.resizeBody();
  }

  private snapshot(): EditorSnapshot {
    return {
      titleHtml: this.titleEl?.nativeElement?.innerHTML ?? '',
      bodyHtml: this.bodyEl?.nativeElement?.innerHTML ?? ''
    };
  }

  private scheduleHistory(): void {
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => this.pushHistoryNow(), 400);
  }

  private pushHistoryNow(): void {
    this.history.push(this.snapshot());
    this.refreshToolbar();
  }

  private undo(): void {
    const current = this.snapshot();
    const prev = this.history.undo(current);
    if (!prev) return;
    this.applySnapshot(prev);
  }

  private redo(): void {
    const current = this.snapshot();
    const next = this.history.redo(current);
    if (!next) return;
    this.applySnapshot(next);
  }

  private applySnapshot(snapshot: EditorSnapshot): void {
    if (this.titleEl && this.showTitle) {
      this.titleEl.nativeElement.innerHTML = snapshot.titleHtml;
      this.title = stripHtmlToText(snapshot.titleHtml);
      this.titleChange.emit(this.title);
    }
    if (this.bodyEl) {
      this.bodyEl.nativeElement.innerHTML = snapshot.bodyHtml;
      this.emitBodyChange();
      this.resizeBody();
    }
    this.refreshToolbar();
  }

  private refreshToolbar(): void {
    const root = this.getActiveRoot() ?? this.bodyEl?.nativeElement;
    if (!root) return;
    const state = this.commands.queryToolbarState(root);
    state.canUndo = this.history.canUndo;
    state.canRedo = this.history.canRedo;
    this.toolbarState = state;
  }

  private resizeBody(): void {
    const el = this.bodyEl?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    const min = this.compact ? 90 : 200;
    el.style.height = `${Math.max(min, el.scrollHeight)}px`;
  }
}
