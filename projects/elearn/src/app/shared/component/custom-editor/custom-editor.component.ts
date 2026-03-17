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

  onFocus(): void {
    this._isFocused = true;
    this.onTouched();
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this._isFocused = false;
    this.cdr.markForCheck();
  }

  onKeyUp(): void { this.updateActiveStates(); }
  onMouseUp(): void { this.updateActiveStates(); }

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

  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '') || '<p></p>';
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
    this.cdr.markForCheck();
  }
}
