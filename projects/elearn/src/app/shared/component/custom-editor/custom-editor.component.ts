import {
  Component,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  forwardRef,
  ChangeDetectorRef,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Custom Rich Text Editor – same pattern as old blog editor.
 * contentEditable + execCommand, image upload, link (prompt), toolbar.
 */
@Component({
  selector: 'app-custom-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-editor.component.html',
  styleUrls: ['./custom-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomEditorComponent),
      multi: true
    }
  ]
})
export class CustomEditorComponent implements AfterViewInit, ControlValueAccessor {

  @ViewChild('editorContent', { static: false }) editorContent!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput', { static: false }) imageInput!: ElementRef<HTMLInputElement>;

  @Input() placeholder = 'Start typing...';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() uploadImageFn?: (file: File) => Promise<string>;
  @Input() showWordCount = false;
  /** Optional blog search for Link Builder internal links. (query: string) => Observable<{ title, canonicalUrl }[]> */
  @Input() blogSearchFn?: (query: string) => Observable<any[]>;

  @Output() contentChange = new EventEmitter<string>();
  @Output() imageDeleted = new EventEmitter<{ imageId: string; s3Key: string; s3Url: string }>();

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);

  /** Skip huge HTML pastes; fall back to plain text. */
  private static readonly PASTE_MAX_HTML_CHARS = 1_500_000;

  /** Whitelist for smart paste (no class / arbitrary attrs; table structure preserved). */
  private static readonly PASTE_ALLOWED_TAGS = new Set([
    'p', 'br', 'b', 'strong', 'i', 'em', 'u',
    'ul', 'ol', 'li',
    'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre',
    'img', 'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'
  ]);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  _value = '';
  _pendingValue: string | null = null;
  _isFocused = false;

  isBold = false;
  isItalic = false;
  isUnderline = false;
  isStrikethrough = false;
  isBulletList = false;
  isOrderedList = false;
  hasLink = false;
  currentHeading = '';

  private history: string[] = [];
  private historyIndex = -1;
  private maxHistorySize = 50;
  canUndo = false;
  canRedo = false;

  // Link Builder popup state (same as pre-merge blog)
  showLinkPopup = false;
  linkPopupPosition = { top: 0, left: 0 };
  selectedText = '';
  selectedRange: Range | null = null;
  linkType: 'internal' | 'external' = 'internal';
  linkUrl = '';
  linkAnchorText = '';
  linkRelAttributes: string[] = [];
  linkOpenInNewTab = true;
  blogSuggestions: any[] = [];
  isSearchingBlogs = false;
  blogSearchQuery = '';
  editingLinkElement: HTMLAnchorElement | null = null;
  internalUrlValidation: { valid: boolean; error?: string; preview?: string } = { valid: false };
  externalUrlValidation: { valid: boolean; error?: string; preview?: string } = { valid: false };

  /** Insert table popup */
  showTablePopup = false;
  tablePopupPosition = { top: 0, left: 0 };
  tableRows = 2;
  tableCols = 2;
  /** Saved selection range before opening table popup (restored on insert). */
  private tableInsertRange: Range | null = null;
  /** True when caret is inside a table cell (for add row/column tools). */
  isCaretInTable = false;

  ngAfterViewInit(): void {
    const initialContent = this._value || '<p></p>';
    this.history = [initialContent];
    this.historyIndex = 0;
    this.updateHistoryButtons();

    if (this._pendingValue !== null) {
      setTimeout(() => {
        this.setEditorContent(this._pendingValue!);
        this._pendingValue = null;
        this.cdr.markForCheck();
      }, 0);
    } else if (this._value && this._value !== '<p></p>') {
      setTimeout(() => {
        this.setEditorContent(this._value);
        this.cdr.markForCheck();
      }, 0);
    } else {
      setTimeout(() => {
        const editor = this.editorContent?.nativeElement;
        if (editor && !editor.innerHTML.trim()) {
          editor.innerHTML = '<p></p>';
        }
        this.cdr.markForCheck();
      }, 0);
    }
  }

  executeCommand(command: string, value?: string): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    try {
      if (document.execCommand(command, false, value)) {
        this.updateActiveStates();
        this.emitContentChange();
        this.saveToHistory();
        return;
      }
    } catch (_) {}
    this.executeCommandFallback(command, value);
  }

  private executeCommandFallback(command: string, value?: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const editor = this.editorContent?.nativeElement;
    if (!editor || !range.intersectsNode(editor)) return;
    try {
      switch (command) {
        case 'bold':
          this.wrapSelection(range, 'strong');
          break;
        case 'italic':
          this.wrapSelection(range, 'em');
          break;
        case 'underline':
          this.wrapSelection(range, 'u');
          break;
        case 'insertUnorderedList':
          this.insertList(range, 'ul');
          break;
        case 'insertOrderedList':
          this.insertList(range, 'ol');
          break;
        case 'createLink':
          if (value) this.insertLinkNode(range, value);
          break;
        case 'removeFormat':
          this.removeFormat(range);
          break;
      }
      this.updateActiveStates();
      this.emitContentChange();
      this.saveToHistory();
    } catch (_) {}
  }

  private wrapSelection(range: Range, tag: string): void {
    const text = range.toString();
    if (!text) return;
    const el = document.createElement(tag);
    el.textContent = text;
    range.deleteContents();
    range.insertNode(el);
  }

  private insertList(range: Range, listType: 'ul' | 'ol'): void {
    const list = document.createElement(listType);
    const li = document.createElement('li');
    li.textContent = range.toString() || 'List item';
    list.appendChild(li);
    range.deleteContents();
    range.insertNode(list);
  }

  private insertLinkNode(range: Range, url: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = range.toString() || url;
    range.deleteContents();
    range.insertNode(a);
  }

  private removeFormat(range: Range): void {
    const contents = range.extractContents();
    const text = contents.textContent || '';
    range.insertNode(document.createTextNode(text));
  }

  toggleBold(): void { this.executeCommand('bold'); }
  toggleItalic(): void { this.executeCommand('italic'); }
  toggleUnderline(): void { this.executeCommand('underline'); }
  toggleStrikethrough(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    try {
      if (document.execCommand('strikeThrough', false)) {
        this.updateActiveStates();
        this.emitContentChange();
        this.saveToHistory();
      }
    } catch (_) {}
  }
  toggleBulletList(): void { this.executeCommand('insertUnorderedList'); }
  toggleOrderedList(): void { this.executeCommand('insertOrderedList'); }
  clearFormatting(): void { this.executeCommand('removeFormat'); }

  applyHeading(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const heading = select.value;
    this.currentHeading = heading;
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    try {
      if (heading) {
        document.execCommand('formatBlock', false, heading);
      } else {
        document.execCommand('formatBlock', false, 'p');
      }
      this.updateActiveStates();
      this.emitContentChange();
      this.saveToHistory();
    } catch (_) {}
  }

  insertBlockquote(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    try {
      if (document.execCommand('formatBlock', false, 'blockquote')) {
        this.updateActiveStates();
        this.emitContentChange();
        this.saveToHistory();
      }
    } catch (_) {}
  }

  insertCode(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = range.toString() || 'code';
    const code = document.createElement('code');
    code.textContent = text;
    range.deleteContents();
    range.insertNode(code);
    this.updateActiveStates();
    this.emitContentChange();
    this.saveToHistory();
  }

  insertCodeBlock(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = range.toString() || '';
    pre.appendChild(code);
    range.deleteContents();
    range.insertNode(pre);
    this.updateActiveStates();
    this.emitContentChange();
    this.saveToHistory();
  }

  insertHorizontalRule(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    try {
      if (document.execCommand('insertHorizontalRule', false)) {
        this.emitContentChange();
        this.saveToHistory();
      }
    } catch (_) {}
  }

  /** Open insert-table popup; saves current selection for restore on confirm. */
  openTablePopup(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer)) {
        this.tableInsertRange = r.cloneRange();
      } else {
        this.tableInsertRange = this.createRangeAtEditorEnd(editor);
      }
    } else {
      this.tableInsertRange = this.createRangeAtEditorEnd(editor);
    }
    this.tableRows = 2;
    this.tableCols = 2;
    const rect = editor.getBoundingClientRect();
    this.positionTablePopup(rect);
    this.showTablePopup = true;
    this.cdr.markForCheck();
  }

  private createRangeAtEditorEnd(editor: HTMLElement): Range {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  }

  private positionTablePopup(anchorRect: DOMRect): void {
    const popupWidth = 300;
    const popupHeight = 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
    if (left < 16) left = 16;
    if (left + popupWidth > vw - 16) left = vw - popupWidth - 16;
    if (top + popupHeight > vh - 16) top = anchorRect.top - popupHeight - 8;
    if (top < 16) top = 16;
    this.tablePopupPosition = {
      top: isNaN(top) ? 80 : top,
      left: isNaN(left) ? 16 : left
    };
  }

  cancelTablePopup(): void {
    this.showTablePopup = false;
    this.tableInsertRange = null;
    this.cdr.markForCheck();
  }

  applyTableInsert(): void {
    const r = Math.floor(Number(this.tableRows));
    const c = Math.floor(Number(this.tableCols));
    const rows = Math.min(50, Math.max(1, isNaN(r) ? 2 : r));
    const cols = Math.min(50, Math.max(1, isNaN(c) ? 2 : c));
    this.insertTable(rows, cols);
    this.showTablePopup = false;
    this.tableInsertRange = null;
    this.cdr.markForCheck();
  }

  /**
   * Builds table HTML for tests / round-trip; insertion uses DOM for safety.
   */
  createTableHTML(rows: number, cols: number): string {
    const r = Math.min(50, Math.max(1, rows));
    const co = Math.min(50, Math.max(1, cols));
    let body = '';
    for (let i = 0; i < r; i++) {
      body += '<tr>';
      for (let j = 0; j < co; j++) {
        body += '<td>&nbsp;</td>';
      }
      body += '</tr>';
    }
    return `<table border="1" style="border-collapse: collapse; width: 100%;"><tbody>${body}</tbody></table>`;
  }

  /** Build table element with tbody and empty cells. */
  private createTableElement(rows: number, cols: number): HTMLTableElement {
    const r = Math.min(50, Math.max(1, rows));
    const c = Math.min(50, Math.max(1, cols));
    const table = document.createElement('table');
    table.setAttribute('border', '1');
    table.setAttribute('style', 'border-collapse: collapse; width: 100%;');
    const tbody = document.createElement('tbody');
    for (let i = 0; i < r; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < c; j++) {
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  /**
   * Insert table at saved range (or end of editor). Uses Range API; works without execCommand.
   */
  insertTable(rows: number, cols: number): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    editor.focus();

    const table = this.createTableElement(rows, cols);
    const after = document.createElement('p');
    after.innerHTML = '<br>';

    let range: Range;
    if (this.tableInsertRange) {
      range = this.tableInsertRange.cloneRange();
    } else {
      range = this.createRangeAtEditorEnd(editor);
    }

    if (!editor.contains(range.commonAncestorContainer)) {
      range = this.createRangeAtEditorEnd(editor);
    }

    try {
      range.deleteContents();
    } catch (_) {}

    const frag = document.createDocumentFragment();
    frag.appendChild(table);
    frag.appendChild(after);

    try {
      range.insertNode(frag);
    } catch (_) {
      editor.appendChild(table);
      editor.appendChild(after);
    }

    const sel = window.getSelection();
    const firstCell = table.querySelector('td');
    if (firstCell && sel) {
      const nr = document.createRange();
      nr.selectNodeContents(firstCell);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    }

    this._isFocused = true;
    this.tableInsertRange = null;
    this.updateTableCaretContext();
    this.emitContentChange();
    this.saveToHistory();
  }

  /** Optional: add row below current cell (toolbar). */
  addTableRowAfter(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const ctx = this.getTableContext();
    if (!ctx) return;
    const row = ctx.cell.parentElement as HTMLTableRowElement;
    const colCount = row.cells.length;
    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.innerHTML = '&nbsp;';
      newRow.appendChild(td);
    }
    row.parentNode?.insertBefore(newRow, row.nextSibling);
    this.emitContentChange();
    this.saveToHistory();
    this.updateTableCaretContext();
  }

  /** Optional: insert column after current cell index in every row. */
  addTableColumnAfter(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const ctx = this.getTableContext();
    if (!ctx) return;
    const colIdx = ctx.cell.cellIndex;
    const table = ctx.table;
    for (let i = 0; i < table.rows.length; i++) {
      const tr = table.rows[i];
      const ref = tr.cells[colIdx];
      const useTh = ref && ref.tagName === 'TH';
      const cell = document.createElement(useTh ? 'th' : 'td');
      cell.innerHTML = '&nbsp;';
      if (ref?.nextSibling) {
        tr.insertBefore(cell, ref.nextSibling);
      } else if (ref) {
        tr.appendChild(cell);
      } else {
        tr.appendChild(cell);
      }
    }
    this.emitContentChange();
    this.saveToHistory();
    this.updateTableCaretContext();
  }

  private getTableContext(): { table: HTMLTableElement; cell: HTMLTableCellElement } | null {
    const editor = this.editorContent?.nativeElement;
    if (!editor || !this.isBrowser) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          const table = el.closest('table');
          if (table && editor.contains(table)) {
            return { table: table as HTMLTableElement, cell: el as HTMLTableCellElement };
          }
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  private updateTableCaretContext(): void {
    this.isCaretInTable = !!this.getTableContext();
    this.cdr.markForCheck();
  }

  /** Insert link – opens Link Builder popup (same as pre-merge blog). */
  insertLink(): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (range) {
        const linkEl = this.findLinkInRange(range);
        if (linkEl) {
          this.editExistingLink(linkEl);
          return;
        }
      }
      this.showLinkPopupForNewLink();
      return;
    }
    const range = selection.getRangeAt(0);
    const linkEl = this.findLinkInRange(range);
    if (linkEl) {
      this.editExistingLink(linkEl);
      return;
    }
    const selectedText = range.toString().trim();
    if (selectedText.length === 0) {
      this.showLinkPopupForNewLink();
      return;
    }
    this.showLinkPopupForSelection(range, selectedText);
  }

  private showLinkPopupForNewLink(): void {
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    const selection = window.getSelection();
    let rect: DOMRect;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      rect = range.getBoundingClientRect();
      this.selectedRange = range;
    } else {
      rect = editor.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      this.selectedRange = range;
    }
    this.selectedText = '';
    this.linkAnchorText = '';
    this.linkUrl = '';
    this.linkType = 'internal';
    this.linkRelAttributes = [];
    this.linkOpenInNewTab = false;
    this.editingLinkElement = null;
    this.blogSuggestions = [];
    this.blogSearchQuery = '';
    this.internalUrlValidation = { valid: false };
    this.externalUrlValidation = { valid: false };
    this.applyAutoSeoSettings();
    this.positionLinkPopup(rect);
    this.showLinkPopup = true;
    this.cdr.markForCheck();
  }

  private showLinkPopupForSelection(range: Range, selectedText: string): void {
    this.selectedText = selectedText;
    this.selectedRange = range.cloneRange();
    this.linkAnchorText = selectedText;
    this.linkUrl = '';
    this.linkType = 'internal';
    this.linkRelAttributes = [];
    this.linkOpenInNewTab = false;
    this.editingLinkElement = null;
    this.blogSuggestions = [];
    this.blogSearchQuery = selectedText;
    this.internalUrlValidation = { valid: false };
    this.externalUrlValidation = { valid: false };
    this.applyAutoSeoSettings();
    if (this.blogSearchFn && selectedText.length >= 2) this.searchBlogs(selectedText);
    const rect = range.getBoundingClientRect();
    this.positionLinkPopup(rect);
    this.showLinkPopup = true;
    this.cdr.markForCheck();
  }

  private positionLinkPopup(rect: DOMRect): void {
    const popupWidth = 420;
    const popupHeight = 500;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = rect.top - popupHeight - 15;
    let left = rect.left + (rect.width / 2) - (popupWidth / 2);
    if (top < 20) top = rect.bottom + 15;
    if (left < 20) left = 20;
    else if (left + popupWidth > vw - 20) left = vw - popupWidth - 20;
    if (top + popupHeight > vh - 20) top = vh - popupHeight - 20;
    if (top < 20) top = 20;
    top = isNaN(top) ? 100 : Math.max(20, Math.min(top, vh - 100));
    left = isNaN(left) ? 100 : Math.max(20, Math.min(left, vw - 100));
    this.linkPopupPosition = { top, left };
  }

  cancelLink(): void {
    this.showLinkPopup = false;
    this.selectedRange = null;
    this.editingLinkElement = null;
    this.blogSuggestions = [];
    this.cdr.markForCheck();
  }

  searchBlogs(query: string): void {
    if (!this.blogSearchFn || !query || query.length < 2) {
      this.blogSuggestions = [];
      this.isSearchingBlogs = false;
      return;
    }
    this.isSearchingBlogs = true;
    this.cdr.markForCheck();
    this.blogSearchFn(query).pipe(
      map((results: any[]) => (results || []).slice(0, 10).map(item => ({
        title: item.title || item.name || '',
        url: item.canonicalUrl || item.url || item.slug || item.id || '',
        canonicalUrl: item.canonicalUrl || item.url || item.slug || item.id || '',
        description: item.description || item.metaDescription || ''
      }))),
      catchError(() => of([]))
    ).subscribe(results => {
      this.blogSuggestions = results;
      this.isSearchingBlogs = false;
      this.cdr.markForCheck();
    });
  }

  onLinkTypeChange(type: 'internal' | 'external'): void {
    this.linkType = type;
    if (type === 'internal' && this.linkUrl.startsWith('http')) this.linkUrl = '';
    this.internalUrlValidation = { valid: false };
    this.externalUrlValidation = { valid: false };
    if (this.linkUrl) {
      if (type === 'internal') this.validateInternalUrl();
      else this.validateExternalUrl();
    }
    this.applyAutoSeoSettings();
    if (type === 'internal' && this.selectedText && this.selectedText.length >= 2 && this.blogSearchFn)
      this.searchBlogs(this.selectedText);
    this.cdr.markForCheck();
  }

  selectBlog(blog: any): void {
    const canonicalUrl = blog.canonicalUrl || blog.url || blog.id || '';
    this.linkUrl = canonicalUrl.replace(/^\/?blog\//i, '').replace(/^\//, '');
    this.linkAnchorText = this.selectedText || blog.title || '';
    this.linkType = 'internal';
    this.validateInternalUrl();
    this.cdr.markForCheck();
  }

  onManualUrlInput(event: any): void {
    const url = typeof event === 'string' ? event : (event?.target?.value || '');
    this.linkUrl = url.trim();
    this.validateInternalUrl();
    this.cdr.markForCheck();
  }

  onBlogSearchInput(value: any): void {
    const query = typeof value === 'string' ? value.trim() : (value?.target?.value || '').trim();
    this.blogSearchQuery = query;
    if (query.length >= 2 && this.blogSearchFn) this.searchBlogs(query);
    this.cdr.markForCheck();
  }

  onExternalUrlInput(event: any): void {
    const url = typeof event === 'string' ? event : (event?.target?.value || '');
    this.linkUrl = url.trim();
    this.validateExternalUrl();
    this.cdr.markForCheck();
  }

  validateInternalUrl(): void {
    if (!this.linkUrl || this.linkUrl.trim() === '') {
      this.internalUrlValidation = { valid: false };
      return;
    }
    const trimmed = this.linkUrl.trim();
    let normalized = trimmed.replace(/^\/?blog\//i, '').replace(/^\/+|\/+$/g, '');
    if (normalized.length === 0) {
      this.internalUrlValidation = { valid: false, error: 'URL cannot be empty' };
      return;
    }
    if (/[<>"']/.test(normalized)) {
      this.internalUrlValidation = { valid: false, error: 'URL contains invalid characters' };
      return;
    }
    this.internalUrlValidation = { valid: true, preview: `/blog/${normalized}` };
  }

  validateExternalUrl(): void {
    if (!this.linkUrl || this.linkUrl.trim() === '') {
      this.externalUrlValidation = { valid: false };
      return;
    }
    const trimmed = this.linkUrl.trim();
    try {
      let urlToValidate = trimmed;
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))
        urlToValidate = 'https://' + trimmed;
      const urlObj = new URL(urlToValidate);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        this.externalUrlValidation = { valid: false, error: 'Only HTTP and HTTPS allowed.' };
        return;
      }
      this.externalUrlValidation = { valid: true, preview: trimmed.startsWith('http') ? trimmed : urlObj.href };
    } catch {
      this.externalUrlValidation = { valid: false, error: 'Invalid URL (e.g. https://example.com)' };
    }
  }

  applyAutoSeoSettings(): void {
    if (this.linkType === 'external') {
      if (!this.linkRelAttributes.includes('nofollow')) this.linkRelAttributes.push('nofollow');
      this.linkOpenInNewTab = true;
    }
  }

  toggleRelAttribute(attr: 'nofollow' | 'sponsored' | 'ugc'): void {
    const i = this.linkRelAttributes.indexOf(attr);
    if (i > -1) this.linkRelAttributes.splice(i, 1);
    else this.linkRelAttributes.push(attr);
    this.cdr.markForCheck();
  }

  removeLink(): void {
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    let linkEl: HTMLAnchorElement | null = this.editingLinkElement;
    if (!linkEl && this.selectedRange) linkEl = this.findLinkInRange(this.selectedRange);
    if (!linkEl) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) linkEl = this.findLinkInRange(sel.getRangeAt(0));
    }
    if (linkEl && linkEl.parentNode) {
      const fragment = document.createDocumentFragment();
      while (linkEl.firstChild) fragment.appendChild(linkEl.firstChild);
      linkEl.parentNode.replaceChild(fragment, linkEl);
      this.editingLinkElement = null;
      this.emitContentChange();
      this.saveToHistory();
      this.cancelLink();
      editor.focus();
    }
    this.cdr.markForCheck();
  }

  applyLink(): void {
    if (!this.selectedRange) {
      alert('No text selected. Please select text to link.');
      return;
    }
    if (!this.linkUrl) {
      alert('Please enter a URL.');
      return;
    }
    if (!this.linkAnchorText?.trim()) {
      const t = this.selectedRange.toString().trim();
      if (t) this.linkAnchorText = t;
      else {
        alert('Please enter anchor text or select text to link.');
        return;
      }
    }
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (this.editingLinkElement) {
      const parent = this.editingLinkElement.parentNode;
      if (parent) {
        const textContent = this.editingLinkElement.textContent || '';
        const textNode = document.createTextNode(textContent);
        parent.replaceChild(textNode, this.editingLinkElement);
        const newRange = document.createRange();
        newRange.selectNodeContents(textNode);
        this.selectedRange = newRange;
        this.editingLinkElement = null;
      }
    }
    let sanitizedUrl: string;
    if (this.linkType === 'internal') {
      this.validateInternalUrl();
      if (!this.internalUrlValidation.valid) {
        alert(this.internalUrlValidation.error || 'Please enter a valid internal blog URL.');
        return;
      }
      sanitizedUrl = this.internalUrlValidation.preview || `/blog/${this.linkUrl.replace(/^\/?blog\//i, '').replace(/^\/+|\/+$/g, '')}`;
    } else {
      this.validateExternalUrl();
      if (!this.externalUrlValidation.valid) {
        alert(this.externalUrlValidation.error || 'Invalid URL.');
        return;
      }
      sanitizedUrl = this.linkUrl.trim();
      if (!sanitizedUrl.startsWith('http')) sanitizedUrl = 'https://' + sanitizedUrl;
    }
    const relAttrs = this.linkType === 'external'
      ? ['noopener', 'noreferrer', 'nofollow', ...this.linkRelAttributes.filter(a => a !== 'nofollow' && (a === 'sponsored' || a === 'ugc'))]
      : ['noopener', 'noreferrer', ...this.linkRelAttributes];
    const rel = [...new Set(relAttrs)].join(' ');
    const link = document.createElement('a');
    link.href = sanitizedUrl;
    link.textContent = this.linkAnchorText;
    link.target = this.linkOpenInNewTab ? '_blank' : '_self';
    link.rel = rel;
    const contents = this.selectedRange.extractContents();
    if (contents.childNodes.length > 0 && contents.childNodes[0].nodeType !== Node.TEXT_NODE)
      link.appendChild(contents);
    else
      link.textContent = this.linkAnchorText;
    this.selectedRange.insertNode(link);
    const newRange = document.createRange();
    newRange.setStartAfter(link);
    newRange.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    this.emitContentChange();
    this.saveToHistory();
    this.cancelLink();
    this.cdr.markForCheck();
  }

  private findLinkInRange(range: Range): HTMLAnchorElement | null {
    let node: Node | null = range.startContainer;
    const editor = this.editorContent?.nativeElement;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName.toLowerCase() === 'a' && el.hasAttribute('href'))
          return el as HTMLAnchorElement;
      }
      node = node.parentNode;
    }
    const common = range.commonAncestorContainer;
    if (common.nodeType === Node.ELEMENT_NODE) {
      const el = common as HTMLElement;
      if (el.tagName.toLowerCase() === 'a' && el.hasAttribute('href'))
        return el as HTMLAnchorElement;
    }
    return null;
  }

  private editExistingLink(linkElement: HTMLAnchorElement): void {
    const href = linkElement.getAttribute('href') || '';
    const anchorText = linkElement.textContent || '';
    const target = linkElement.getAttribute('target');
    const rel = linkElement.getAttribute('rel') || '';
    let linkType: 'internal' | 'external' = (linkElement.getAttribute('data-link-type') as any) === 'external' ? 'external' : 'internal';
    let url = href;
    if (href.startsWith('/blog/')) {
      url = href.substring(6);
      linkType = 'internal';
    } else if (href.startsWith('blog/')) {
      url = href.substring(5);
      linkType = 'internal';
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      url = href;
      linkType = 'external';
    } else if (href.startsWith('/')) {
      url = href.substring(1);
      linkType = 'internal';
    }
    this.linkRelAttributes = [];
    if (rel.toLowerCase().includes('nofollow')) this.linkRelAttributes.push('nofollow');
    if (rel.toLowerCase().includes('sponsored')) this.linkRelAttributes.push('sponsored');
    if (rel.toLowerCase().includes('ugc')) this.linkRelAttributes.push('ugc');
    this.linkType = linkType;
    this.linkUrl = url;
    this.linkAnchorText = anchorText.trim();
    this.linkOpenInNewTab = target === '_blank';
    this.applyAutoSeoSettings();
    if (linkType === 'internal') this.validateInternalUrl();
    else this.validateExternalUrl();
    this.editingLinkElement = linkElement;
    const range = document.createRange();
    range.selectNodeContents(linkElement);
    this.selectedRange = range;
    this.selectedText = anchorText.trim();
    const rect = linkElement.getBoundingClientRect();
    this.positionLinkPopup(rect);
    this.showLinkPopup = true;
    this.cdr.markForCheck();
  }

  insertImage(): void {
    if (this.disabled || this.readonly) return;
    if (this.uploadImageFn) {
      this.imageInput?.nativeElement?.click();
    } else {
      const url = window.prompt('Enter image URL:');
      if (url?.trim()) this.insertImageAtCursor(url.trim());
    }
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }
    if (this.uploadImageFn) {
      this.uploadImageFn(file)
        .then((imageUrl) => {
          this.insertImageAtCursor(imageUrl);
          input.value = '';
        })
        .catch(() => {
          alert('Failed to upload image.');
          input.value = '';
        });
    } else {
      const objectUrl = URL.createObjectURL(file);
      this.insertImageAtCursor(objectUrl);
      input.value = '';
    }
  }

  private insertImageAtCursor(imageUrl: string): void {
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    if (!this._isFocused) editor.focus();
    const selection = window.getSelection();
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Uploaded image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '10px 0';
    img.setAttribute('contenteditable', 'false');
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(img);
      const newRange = document.createRange();
      newRange.setStartAfter(img);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      editor.appendChild(img);
      editor.appendChild(document.createElement('br'));
    }
    this.emitContentChange();
    this.saveToHistory();
    this.cdr.markForCheck();
  }

  undo(): void {
    if (!this.canUndo || this.historyIndex <= 0) return;
    this.historyIndex--;
    this.setEditorContentWithoutHistory(this.history[this.historyIndex]);
    this.updateHistoryButtons();
  }

  redo(): void {
    if (!this.canRedo || this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.setEditorContentWithoutHistory(this.history[this.historyIndex]);
    this.updateHistoryButtons();
  }

  private saveToHistory(): void {
    const html = this.getEditorHTML();
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    if (this.history.length > 0 && this.history[this.history.length - 1] === html) return;
    this.history.push(html);
    if (this.history.length > this.maxHistorySize) this.history.shift();
    else this.historyIndex++;
    this.updateHistoryButtons();
  }

  private setEditorContentWithoutHistory(html: string): void {
    const editor = this.editorContent?.nativeElement;
    if (!editor) return;
    editor.innerHTML = this.sanitizeHtml(html);
    this.stampPastedTablesForPresentation(editor);
    this._value = html;
    this.onChange(html);
    this.contentChange.emit(html);
    this.cdr.markForCheck();
  }

  private updateHistoryButtons(): void {
    this.canUndo = this.historyIndex > 0;
    this.canRedo = this.historyIndex < this.history.length - 1;
    this.cdr.markForCheck();
  }

  onContentInput(): void {
    this.emitContentChange();
    this.updateActiveStates();
  }

  /**
   * Smart paste: strip Word/web cruft, whitelist tags/attrs, insert at selection.
   * If clipboard provides HTML, never fall back to plain text (keeps tables).
   */
  onPaste(event: ClipboardEvent): void {
    if (!this.isBrowser || this.disabled || this.readonly) return;
    event.preventDefault();
    event.stopPropagation();

    const cd = event.clipboardData;
    if (!cd) return;

    const html = cd.getData('text/html');
    const plain = cd.getData('text/plain') ?? '';

    const htmlTrimmed = (html || '').trim();
    if (htmlTrimmed.length > 0) {
      const rawToClean =
        htmlTrimmed.length > CustomEditorComponent.PASTE_MAX_HTML_CHARS
          ? htmlTrimmed.slice(0, CustomEditorComponent.PASTE_MAX_HTML_CHARS)
          : htmlTrimmed;

      let cleaned = this.cleanPastedHTML(rawToClean);
      if (!cleaned.trim()) {
        cleaned = this.fallbackCleanPasteKeepTables(rawToClean);
      }
      if (cleaned.trim()) {
        this.insertSanitizedHTMLAtCursor(cleaned);
      }
      return;
    }

    const tabTable = this.plainToHtmlTableIfTabDelimited(plain);
    if (tabTable) {
      this.insertSanitizedHTMLAtCursor(tabTable);
      return;
    }
    const spaceTable = this.plainToHtmlTableBlocksIfSpaceDelimited(plain);
    if (spaceTable) {
      this.insertSanitizedHTMLAtCursor(spaceTable);
      return;
    }
    this.insertPastedPlainAsParagraphs(plain);
  }

  /**
   * Sanitize pasted HTML: remove scripts/styles/Word noise; keep structural tags only;
   * only href (a) and src (img) attributes.
   */
  cleanPastedHTML(html: string): string {
    if (!html || !this.isBrowser) return '';
    let stripped = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\?xml[\s\S]*?\?>/gi, '');

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(stripped, 'text/html');
      doc.querySelectorAll('script,style,meta,link,title,noscript,iframe,object,embed,head').forEach(n => n.remove());

      const body = doc.body;
      if (!body) return '';

      this.convertLayoutDivsToSemanticTables(body);
      this.convertUnstyledDivRowGridsToTables(body);
      this.convertConsecutiveParagraphSpaceColumnsToTables(body);
      this.convertParagraphsWithBrRowsToTables(body);

      const output = document.createElement('div');
      const children = Array.from(body.childNodes);
      for (const child of children) {
        this.sanitizePasteSubtree(child, output);
      }

      let result = output.innerHTML.trim();
      result = this.postProcessPastedHtmlString(result);
      return result;
    } catch {
      return '';
    }
  }

  /**
   * If whitelist walk yields empty HTML, keep DOM structure (tables, divs) but strip
   * class/style/on* and unsafe URLs so paste still has a grid instead of plain text.
   */
  private fallbackCleanPasteKeepTables(html: string): string {
    if (!html || !this.isBrowser) return '';
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script,style,meta,link,title,noscript,iframe,object,embed').forEach(n => n.remove());
      const body = doc.body;
      if (!body) return '';

      this.convertLayoutDivsToSemanticTables(body);
      this.convertUnstyledDivRowGridsToTables(body);
      this.convertConsecutiveParagraphSpaceColumnsToTables(body);

      const removeEls: Element[] = [];
      body.querySelectorAll('*').forEach((el: Element) => {
        const tag = el.tagName.toLowerCase();
        if (['script', 'style', 'meta', 'link', 'iframe', 'object', 'embed'].includes(tag)) {
          removeEls.push(el);
          return;
        }
        const attrs = Array.from(el.attributes);
        for (const a of attrs) {
          const name = a.name.toLowerCase();
          if (name === 'style' || name === 'class' || name.startsWith('on') || name.startsWith('xmlns')) {
            el.removeAttribute(a.name);
            continue;
          }
          if (tag === 'a' && name === 'href') {
            const ok = this.sanitizePasteHref(el.getAttribute('href'));
            if (!ok) el.removeAttribute('href');
          }
        }
        if (tag === 'img') {
          const ok = this.sanitizePasteImgSrc(el.getAttribute('src'));
          if (!ok) removeEls.push(el);
        }
      });
      removeEls.forEach(n => n.remove());

      let result = body.innerHTML.trim();
      result = this.postProcessPastedHtmlString(result);
      return result;
    } catch {
      return '';
    }
  }

  /**
   * Many sites use div+flex or display:table instead of <table>. Unwrapping those divs
   * flattens columns; convert to real tables while style attributes are still present.
   */
  private convertLayoutDivsToSemanticTables(root: HTMLElement): void {
    if (!this.isBrowser) return;
    const styledDivs = Array.from(root.querySelectorAll('div[style]')) as HTMLElement[];
    styledDivs.sort((a, b) => this.pasteElementDepth(b) - this.pasteElementDepth(a));

    for (const div of styledDivs) {
      if (!div.isConnected) continue;
      const st = div.getAttribute('style') || '';
      const table = this.tryBuildTableFromLayoutDiv(div, st);
      if (table && table.rows.length > 0) {
        div.parentNode!.replaceChild(table, div);
      }
    }
  }

  /**
   * Row-major div grids without inline style (clipboard often drops classes/CSS):
   * container > div > div+ div+ … same column count → table.
   */
  private convertUnstyledDivRowGridsToTables(root: HTMLElement): void {
    if (!this.isBrowser) return;
    const divs = Array.from(root.querySelectorAll('div')) as HTMLElement[];
    divs.sort((a, b) => this.pasteElementDepth(b) - this.pasteElementDepth(a));
    for (const div of divs) {
      if (!div.isConnected) continue;
      const table = this.tryUnstyledDivRowMajorAsTable(div);
      if (table && table.rows.length >= 2) {
        div.parentNode!.replaceChild(table, div);
      }
    }
  }

  private tryUnstyledDivRowMajorAsTable(container: HTMLElement): HTMLTableElement | null {
    const rowEls = Array.from(container.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement && c.tagName === 'DIV'
    );
    if (rowEls.length < 2 || rowEls.length > 200) return null;
    const colCounts = rowEls.map(
      r =>
        Array.from(r.children).filter(
          n => n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'DIV'
        ).length
    );
    const m = colCounts[0];
    if (m < 2 || m > 16) return null;
    if (!colCounts.every(c => c === m)) return null;
    if ((container.textContent || '').trim().length < 60) return null;
    const tbody = document.createElement('tbody');
    for (const row of rowEls) {
      const tr = document.createElement('tr');
      for (const cell of Array.from(row.children) as HTMLElement[]) {
        if (!(cell instanceof HTMLElement) || cell.tagName !== 'DIV') continue;
        const td = document.createElement('td');
        this.movePasteChildNodes(cell, td);
        tr.appendChild(td);
      }
      if (tr.cells.length) tbody.appendChild(tr);
    }
    if (tbody.rows.length < 2) return null;
    const table = document.createElement('table');
    table.appendChild(tbody);
    return table;
  }

  /** Consecutive <p> lines with 2+ spaces / NBSP between columns (Word, web export). */
  private convertConsecutiveParagraphSpaceColumnsToTables(root: HTMLElement): void {
    if (!this.isBrowser) return;
    let node: ChildNode | null = root.firstChild;
    while (node) {
      if (node.nodeType !== Node.ELEMENT_NODE || (node as HTMLElement).tagName !== 'P') {
        node = node.nextSibling;
        continue;
      }
      const run: HTMLParagraphElement[] = [];
      let cur: ChildNode | null = node;
      while (cur && cur.nodeType === Node.ELEMENT_NODE && (cur as HTMLElement).tagName === 'P') {
        run.push(cur as HTMLParagraphElement);
        cur = cur.nextSibling;
      }
      if (run.length >= 2) {
        const table = this.tryParagraphRunAsSpaceColumnTable(run);
        if (table) {
          const parent = run[0].parentNode!;
          parent.insertBefore(table, run[0]);
          run.forEach(p => p.remove());
          node = table.nextSibling;
          continue;
        }
      }
      node = cur ?? node.nextSibling;
    }
  }

  /** One <p> with <br>-separated lines and space columns (common Word/web export). */
  private convertParagraphsWithBrRowsToTables(root: HTMLElement): void {
    const ps = Array.from(root.querySelectorAll('p'));
    for (const p of ps) {
      if (!p.isConnected || !/<br\s*\/?>/i.test(p.innerHTML)) continue;
      const lines = (p.innerText || '')
        .split(/\n/)
        .map(l => l.replace(/\s+$/, '').trim())
        .filter(l => l.length > 0);
      if (lines.length < 2) continue;
      const rows = lines.map(l => this.splitLineIntoSpaceColumns(l));
      const lens = rows.map(r => r.length);
      if (new Set(lens).size !== 1) continue;
      const c = lens[0];
      if (c < 2 || c > 12) continue;
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      for (const cells of rows) {
        const tr = document.createElement('tr');
        for (const cell of cells) {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      p.parentNode?.replaceChild(table, p);
    }
  }

  private tryParagraphRunAsSpaceColumnTable(ps: HTMLParagraphElement[]): HTMLTableElement | null {
    const rows = ps.map(p => this.splitLineIntoSpaceColumns(p.textContent || ''));
    const lens = rows.map(r => r.length);
    if (new Set(lens).size !== 1) return null;
    const cols = lens[0];
    if (cols < 2 || cols > 12 || rows.length < 2) return null;
    const tbody = document.createElement('tbody');
    for (const cells of rows) {
      const tr = document.createElement('tr');
      for (const c of cells) {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    const table = document.createElement('table');
    table.appendChild(tbody);
    return table;
  }

  /** 2+ spaces / tabs between column gutters (single line). */
  private splitLineIntoSpaceColumns(line: string): string[] {
    const t = line
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
      .trim();
    if (!t) return [];
    return t
      .split(/[ \t]{2,}/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private pasteElementDepth(el: HTMLElement): number {
    let d = 0;
    for (let n: HTMLElement | null = el; n; n = n.parentElement) d++;
    return d;
  }

  private tryBuildTableFromLayoutDiv(div: HTMLElement, st: string): HTMLTableElement | null {
    if (/\bdisplay\s*:\s*(?:table|inline-table)\b/i.test(st)) {
      return this.pasteTableFromCssTable(div);
    }
    const isFlex = /\bdisplay\s*:\s*(?:flex|inline-flex)\b/i.test(st);
    if (!isFlex) return null;
    const isColumn = /\bflex-direction\s*:\s*column\b/i.test(st);
    const kids = Array.from(div.children) as HTMLElement[];
    if (isColumn) {
      return this.pasteTableFromFlexColumn(div);
    }
    // flex-direction row (default): either one row of columns, or many row-wrappers each with cells
    if (kids.length >= 2 && kids.length <= 80) {
      const subLens = kids.map(k => k.children.length);
      const minSub = Math.min(...subLens);
      const maxSub = Math.max(...subLens);
      if (minSub >= 2 && maxSub === minSub) {
        return this.pasteTableFromAlignedBlockRows(kids);
      }
    }
    if (kids.length === 1 && kids[0].children.length >= 2 && kids[0].children.length <= 12) {
      return this.pasteTableFromSingleFlexRow(Array.from(kids[0].children) as HTMLElement[]);
    }
    return this.pasteTableFromSingleFlexRow(kids);
  }

  private pasteTableFromCssTable(container: HTMLElement): HTMLTableElement | null {
    const tbody = document.createElement('tbody');
    for (const child of Array.from(container.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const cst = child.getAttribute('style') || '';
      const isRow =
        /\bdisplay\s*:\s*table-row\b/i.test(cst) ||
        (child.tagName.toLowerCase() === 'div' &&
          Array.from(child.children).every(ch => {
            if (!(ch instanceof HTMLElement)) return false;
            const s = ch.getAttribute('style') || '';
            return /\bdisplay\s*:\s*table-cell\b/i.test(s);
          }) &&
          child.children.length >= 2);

      if (isRow && child.tagName.toLowerCase() === 'div') {
        const tr = document.createElement('tr');
        for (const cell of Array.from(child.children)) {
          if (!(cell instanceof HTMLElement)) continue;
          const td = document.createElement('td');
          this.movePasteChildNodes(cell, td);
          tr.appendChild(td);
        }
        if (tr.cells.length) tbody.appendChild(tr);
      } else {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        this.movePasteChildNodes(child, td);
        tr.appendChild(td);
        tbody.appendChild(tr);
      }
    }
    if (tbody.rows.length === 0) return null;
    const table = document.createElement('table');
    table.appendChild(tbody);
    return table;
  }

  /** Each block is one <tr> with the same number of cell divs (flex row of row groups). */
  private pasteTableFromAlignedBlockRows(rowContainers: HTMLElement[]): HTMLTableElement | null {
    const tbody = document.createElement('tbody');
    for (const row of rowContainers) {
      const cells = Array.from(row.children) as HTMLElement[];
      if (cells.length < 2) return null;
      const tr = document.createElement('tr');
      for (const cell of cells) {
        const td = document.createElement('td');
        this.movePasteChildNodes(cell, td);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    if (tbody.rows.length < 2) return null;
    const table = document.createElement('table');
    table.appendChild(tbody);
    return table;
  }

  /** Single flex row: N siblings → one <tr> (avoid nav chips: need length or text). */
  private pasteTableFromSingleFlexRow(children: HTMLElement[]): HTMLTableElement | null {
    if (children.length < 2 || children.length > 24) return null;
    const textLen = children.reduce((s, c) => s + (c.textContent || '').trim().length, 0);
    if (children.length === 2 && textLen < 100) return null;
    const tr = document.createElement('tr');
    for (const c of children) {
      const td = document.createElement('td');
      this.movePasteChildNodes(c, td);
      tr.appendChild(td);
    }
    const tbody = document.createElement('tbody');
    tbody.appendChild(tr);
    const table = document.createElement('table');
    table.appendChild(tbody);
    return table;
  }

  /** Flex column: each child is a row with 2+ cells. */
  private pasteTableFromFlexColumn(container: HTMLElement): HTMLTableElement | null {
    const rows = Array.from(container.children) as HTMLElement[];
    if (rows.length < 2) return null;
    const tbody = document.createElement('tbody');
    for (const row of rows) {
      if (!(row instanceof HTMLElement)) continue;
      const cells = Array.from(row.children) as HTMLElement[];
      if (cells.length < 2) continue;
      const tr = document.createElement('tr');
      for (const cell of cells) {
        const td = document.createElement('td');
        this.movePasteChildNodes(cell, td);
        tr.appendChild(td);
      }
      if (tr.cells.length) tbody.appendChild(tr);
    }
    if (tbody.rows.length < 2) return null;
    const table = document.createElement('table');
    table.appendChild(tbody);
    return table;
  }

  private movePasteChildNodes(from: HTMLElement, to: HTMLElement): void {
    while (from.firstChild) {
      to.appendChild(from.firstChild);
    }
  }

  /** Plain paste with consistent tabs → HTML table (no clipboard HTML from source). */
  private plainToHtmlTableIfTabDelimited(plain: string): string | null {
    const lines = plain.split(/\r?\n/).map(l => l.replace(/\s+$/, ''));
    const nonEmpty = lines.filter(l => l.length > 0);
    if (nonEmpty.length < 2) return null;
    const rows = nonEmpty.map(l => l.split('\t'));
    const maxCols = Math.max(...rows.map(r => r.length));
    if (maxCols < 2) return null;
    const parts: string[] = ['<table><tbody>'];
    for (const r of rows) {
      parts.push('<tr>');
      for (let i = 0; i < maxCols; i++) {
        const cell = r[i] ?? '';
        parts.push(`<td>${this.escapeHtmlPlain(cell)}</td>`);
      }
      parts.push('</tr>');
    }
    parts.push('</tbody></table>');
    return parts.join('');
  }

  /**
   * Plain paste: runs of lines where columns are separated by 2+ spaces (no tabs / no HTML).
   */
  private plainToHtmlTableBlocksIfSpaceDelimited(plain: string): string | null {
    const rawLines = plain.split(/\r?\n/);
    const segments: string[] = [];
    let anyTable = false;
    let i = 0;
    while (i < rawLines.length) {
      while (i < rawLines.length && !rawLines[i].trim()) i++;
      if (i >= rawLines.length) break;
      const run: string[] = [];
      while (i < rawLines.length && rawLines[i].trim()) {
        run.push(rawLines[i].replace(/\s+$/, ''));
        i++;
      }
      const tableHtml = this.tryPlainLinesAsSpaceTable(run);
      if (tableHtml) {
        segments.push(tableHtml);
        anyTable = true;
      } else {
        segments.push(run.map(l => `<p>${this.escapeHtmlPlain(l)}</p>`).join(''));
      }
    }
    if (!anyTable) return null;
    return segments.join('');
  }

  private tryPlainLinesAsSpaceTable(lines: string[]): string | null {
    if (lines.length < 2) return null;
    const rows = lines.map(l => this.splitLineIntoSpaceColumns(l));
    const lens = rows.map(r => r.length);
    if (new Set(lens).size !== 1) return null;
    const c = lens[0];
    if (c < 2 || c > 12) return null;
    const parts: string[] = ['<table><tbody>'];
    for (const cells of rows) {
      parts.push('<tr>');
      for (const cell of cells) {
        parts.push(`<td>${this.escapeHtmlPlain(cell)}</td>`);
      }
      parts.push('</tr>');
    }
    parts.push('</tbody></table>');
    return parts.join('');
  }

  private postProcessPastedHtmlString(html: string): string {
    return html
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
      .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  }

  private sanitizePasteSubtree(node: Node, out: HTMLElement | DocumentFragment): void {
    if (node.nodeType === Node.TEXT_NODE) {
      out.appendChild(document.createTextNode(node.textContent || ''));
      return;
    }
    if (node.nodeType === Node.COMMENT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (
      tag === 'script' ||
      tag === 'style' ||
      tag === 'meta' ||
      tag === 'link' ||
      tag === 'title' ||
      tag === 'iframe' ||
      tag === 'object' ||
      tag === 'embed'
    ) {
      return;
    }

    if (tag.startsWith('o:') || tag.startsWith('v:') || tag.startsWith('w:') || tag === 'font') {
      Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, out));
      return;
    }

    if (tag === 'span') {
      Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, out));
      return;
    }

    if (tag === 'div') {
      const blockChildTags = new Set([
        'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'table', 'blockquote', 'pre', 'hr',
        'li', 'tr', 'td', 'th', 'thead', 'tfoot', 'tbody'
      ]);
      const hasBlockChild = Array.from(el.children).some(c =>
        blockChildTags.has(c.tagName.toLowerCase())
      );
      if (hasBlockChild) {
        Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, out));
      } else {
        const p = document.createElement('p');
        Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, p));
        if (p.childNodes.length) out.appendChild(p);
      }
      return;
    }

    if (tag === 'br') {
      out.appendChild(document.createElement('br'));
      return;
    }

    if (!CustomEditorComponent.PASTE_ALLOWED_TAGS.has(tag)) {
      Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, out));
      return;
    }

    const newEl = document.createElement(tag);
    if (tag === 'a') {
      const href = this.sanitizePasteHref(el.getAttribute('href'));
      if (!href) {
        Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, out));
        return;
      }
      newEl.setAttribute('href', href);
    } else if (tag === 'img') {
      const src = this.sanitizePasteImgSrc(el.getAttribute('src'));
      if (!src) return;
      newEl.setAttribute('src', src);
    } else {
      this.copyPasteSafeTableAttributes(tag, el, newEl);
    }

    Array.from(el.childNodes).forEach(c => this.sanitizePasteSubtree(c, newEl));

    if (tag === 'img' && !newEl.getAttribute('src')) return;

    out.appendChild(newEl);
  }

  /** Allowed on paste: colspan/rowspan/width on cells; border/width on table; width on col. No class/style. */
  private copyPasteSafeTableAttributes(tag: string, from: HTMLElement, to: HTMLElement): void {
    if (tag === 'table') {
      const border = from.getAttribute('border');
      if (border != null && /^[0-9]{1,2}$/.test(border.trim())) {
        to.setAttribute('border', border.trim());
      }
      const w = from.getAttribute('width');
      if (w && this.isSafePasteWidthValue(w)) to.setAttribute('width', w.trim());
      return;
    }
    if (tag === 'td' || tag === 'th') {
      const cs = from.getAttribute('colspan');
      const rs = from.getAttribute('rowspan');
      if (cs && /^[1-9]\d{0,2}$/.test(cs.trim())) to.setAttribute('colspan', cs.trim());
      if (rs && /^[1-9]\d{0,2}$/.test(rs.trim())) to.setAttribute('rowspan', rs.trim());
      const w = from.getAttribute('width');
      if (w && this.isSafePasteWidthValue(w)) to.setAttribute('width', w.trim());
      return;
    }
    if (tag === 'col') {
      const w = from.getAttribute('width');
      if (w && this.isSafePasteWidthValue(w)) to.setAttribute('width', w.trim());
    }
  }

  private isSafePasteWidthValue(v: string): boolean {
    const s = v.trim();
    if (s.length > 20) return false;
    return /^\d{1,4}%$|^\d{1,4}px$|^\d{1,4}$/.test(s);
  }

  private sanitizePasteHref(href: string | null): string | null {
    if (!href) return null;
    const t = href.trim().replace(/\s+/g, '');
    const lower = t.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
      return null;
    }
    return href.trim();
  }

  private sanitizePasteImgSrc(src: string | null): string | null {
    if (!src) return null;
    const t = src.trim();
    if (t.length > 2_000_000) return null;
    const lower = t.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return null;
    return t;
  }

  private escapeHtmlPlain(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Plain-text paste: one <p> per line, blank lines as empty paragraphs. */
  private insertPastedPlainAsParagraphs(plain: string): void {
    if (!plain) return;
    const escaped = this.escapeHtmlPlain(plain);
    const lines = escaped.split(/\r?\n/);
    const parts = lines.map(line => (line.length === 0 ? '<p><br></p>' : `<p>${line}</p>`));
    this.insertSanitizedHTMLAtCursor(parts.join(''));
  }

  /**
   * Insert cleaned HTML at the current selection; cursor after inserted block; sync form + undo.
   */
  private insertSanitizedHTMLAtCursor(html: string): void {
    const editor = this.editorContent?.nativeElement;
    if (!editor || !this.isBrowser) return;

    const trimmed = (html || '').trim();
    if (!trimmed) return;

    editor.focus();

    const safe = this.sanitizeHtml(trimmed);
    const probe = document.createElement('div');
    probe.innerHTML = safe;
    const plainProbe = (probe.textContent || '').replace(/\u00a0/g, ' ').trim();
    const hasStructural = /<(table|tbody|thead|tfoot|tr|td|th|img|ul|ol|li|blockquote|pre|h[1-6])/i.test(safe);
    if (!plainProbe && !hasStructural) return;

    const sel = window.getSelection();
    if (!sel) return;

    let range: Range;
    if (sel.rangeCount === 0) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    } else {
      range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
    }

    range.deleteContents();

    const fragment = range.createContextualFragment(safe);
    const inserted = Array.from(fragment.childNodes);

    try {
      range.insertNode(fragment);
    } catch {
      inserted.forEach(n => editor.appendChild(n));
    }

    for (const n of inserted) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        this.stampPastedTablesForPresentation(n as HTMLElement);
      }
    }

    const last = inserted[inserted.length - 1];
    const newRange = document.createRange();
    if (last && editor.contains(last)) {
      newRange.setStartAfter(last);
    } else {
      newRange.selectNodeContents(editor);
      newRange.collapse(false);
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    this._isFocused = true;
    this.updateTableCaretContext();
    this.emitContentChange();
    this.saveToHistory();
    this.updateActiveStates();
    this.cdr.markForCheck();
  }

  /**
   * Inline borders/layout so tables are visible even when emulated encapsulation
   * skips component CSS for dynamically inserted nodes (same issue as links).
   */
  private stampPastedTablesForPresentation(root: HTMLElement): void {
    const list: HTMLTableElement[] =
      root.tagName === 'TABLE'
        ? [root as HTMLTableElement]
        : Array.from(root.querySelectorAll('table'));
    for (const table of list) {
      if (!table.style.borderCollapse) table.style.borderCollapse = 'collapse';
      if (!table.style.width) table.style.width = '100%';
      if (!table.style.margin) table.style.margin = '10px 0';
      if (!table.getAttribute('border')) table.setAttribute('border', '1');
      table.querySelectorAll('td').forEach(cell => {
        const c = cell as HTMLElement;
        if (!c.style.border) c.style.border = '1px solid #c7d2fe';
        if (!c.style.padding) c.style.padding = '10px 12px';
        if (!c.style.verticalAlign) c.style.verticalAlign = 'top';
        if (!c.style.textAlign) c.style.textAlign = 'left';
      });
      table.querySelectorAll('th').forEach(cell => {
        const c = cell as HTMLElement;
        if (!c.style.padding) c.style.padding = '10px 12px';
        if (!c.style.verticalAlign) c.style.verticalAlign = 'top';
        if (!c.style.textAlign) c.style.textAlign = 'left';
      });
    }
  }

  onFocus(): void {
    this._isFocused = true;
    this.onTouched();
    this.updateTableCaretContext();
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this._isFocused = false;
    this.cdr.markForCheck();
  }

  onKeyUp(): void {
    this.updateActiveStates();
    this.updateTableCaretContext();
  }
  onMouseUp(): void {
    this.updateActiveStates();
    this.updateTableCaretContext();
  }

  getPlainText(): string {
    const editor = this.editorContent?.nativeElement;
    return editor ? (editor.textContent || editor.innerText || '') : '';
  }

  getWordCount(): number {
    const t = this.getPlainText().trim();
    return t ? t.split(/\s+/).length : 0;
  }

  getCharCount(): number {
    return this.getPlainText().length;
  }

  private getEditorHTML(): string {
    const editor = this.editorContent?.nativeElement;
    if (!editor) return '';
    const html = editor.innerHTML.trim();
    if (!html) return '<p></p>';
    return this.sanitizeHtml(html) || '<p></p>';
  }

  /**
   * Strip scripts, iframes, and inline event handlers. Keeps table structure (table/tbody/tr/td/th) and safe content.
   */
  private sanitizeHtml(html: string): string {
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/\s+on\w+\s*=\s*(?:[^\s"'>]+|"[^"]*"|'[^']*')/gi, '');
    return cleaned || '<p></p>';
  }

  private emitContentChange(): void {
    const html = this.getEditorHTML();
    this._value = html;
    this.onChange(html);
    this.contentChange.emit(html);
    this.cdr.markForCheck();
  }

  private updateActiveStates(): void {
    if (!this.isBrowser) return;
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        this.resetActiveStates();
        this.cdr.markForCheck();
        return;
      }
      const range = selection.getRangeAt(0);
      const editor = this.editorContent?.nativeElement;
      if (!editor || !range.intersectsNode(editor)) {
        this.resetActiveStates();
        this.cdr.markForCheck();
        return;
      }
      let node: Node | null = range.commonAncestorContainer;
      this.resetActiveStates();
      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          if (tag === 'strong' || tag === 'b') this.isBold = true;
          if (tag === 'em' || tag === 'i') this.isItalic = true;
          if (tag === 'u') this.isUnderline = true;
          if (tag === 's' || tag === 'strike') this.isStrikethrough = true;
          if (tag === 'ul') this.isBulletList = true;
          if (tag === 'ol') this.isOrderedList = true;
          if (tag === 'a') this.hasLink = true;
          if (tag.match(/^h[1-6]$/)) this.currentHeading = tag;
        }
        node = node.parentNode;
      }
      if (typeof document.queryCommandState === 'function') {
        this.isBold = this.isBold || document.queryCommandState('bold');
        this.isItalic = this.isItalic || document.queryCommandState('italic');
        this.isUnderline = this.isUnderline || document.queryCommandState('underline');
        this.isStrikethrough = this.isStrikethrough || document.queryCommandState('strikeThrough');
      }
    } catch (_) {
      this.resetActiveStates();
    }
    this.cdr.markForCheck();
  }

  private resetActiveStates(): void {
    this.isBold = false;
    this.isItalic = false;
    this.isUnderline = false;
    this.isStrikethrough = false;
    this.isBulletList = false;
    this.isOrderedList = false;
    this.hasLink = false;
    this.currentHeading = '';
  }

  // ControlValueAccessor
  writeValue(value: string | null | undefined): void {
    const normalized = (value != null && typeof value === 'string' && value.trim() !== '')
      ? value.trim() : '<p></p>';
    this._value = normalized;
    const editor = this.editorContent?.nativeElement;
    if (editor) {
      this.setEditorContent(normalized);
      this._pendingValue = null;
    } else {
      this._pendingValue = normalized;
      setTimeout(() => {
        const ed = this.editorContent?.nativeElement;
        if (ed && this._pendingValue === normalized) {
          this.setEditorContent(normalized);
          this._pendingValue = null;
          this.cdr.markForCheck();
        }
      }, 10);
    }
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    const editor = this.editorContent?.nativeElement;
    if (editor) editor.contentEditable = (isDisabled || this.readonly) ? 'false' : 'true';
    this.cdr.markForCheck();
  }

  private setEditorContent(html: string): void {
    if (!this.isBrowser) return;
    const editor = this.editorContent?.nativeElement;
    if (!editor) {
      this._pendingValue = html;
      return;
    }
    const sanitized = this.sanitizeHtml(html) || '<p></p>';
    if (editor.innerHTML.trim() === sanitized.trim()) return;
    editor.innerHTML = sanitized;
    this.stampPastedTablesForPresentation(editor);
    this.cdr.markForCheck();
  }
}
