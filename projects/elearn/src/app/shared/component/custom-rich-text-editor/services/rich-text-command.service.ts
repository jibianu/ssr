import { Injectable } from '@angular/core';
import { BlockFormat, ToolbarState } from '../models/editor-types';
import { sanitizeEditorHtml, stripHtmlToText } from '../utils/html-sanitizer.util';
import { SelectionManagerService } from './selection-manager.service';

const INLINE_TAGS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u'
};

const BLOCK_TAGS: BlockFormat[] = ['p', 'h1', 'h2', 'h3'];

@Injectable()
export class RichTextCommandService {
  constructor(private selection: SelectionManagerService) {}

  queryToolbarState(root: HTMLElement): ToolbarState {
    const anchor = this.selection.getSelectedElement();
    const inRoot = anchor && root.contains(anchor);
    if (!inRoot) {
      return {
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
    }
    return {
      bold: !!this.selection.findAncestor(anchor, ['strong', 'b']),
      italic: !!this.selection.findAncestor(anchor, ['em', 'i']),
      underline: !!this.selection.findAncestor(anchor, ['u']),
      bulletList: !!this.selection.findAncestor(anchor, ['ul']),
      orderedList: !!this.selection.findAncestor(anchor, ['ol']),
      blockquote: !!this.selection.findAncestor(anchor, ['blockquote']),
      codeBlock: !!this.selection.findAncestor(anchor, ['pre']),
      blockFormat: this.detectBlockFormat(anchor),
      canUndo: false,
      canRedo: false
    };
  }

  applyBold(root: HTMLElement): void {
    this.toggleInline(root, INLINE_TAGS.bold);
  }

  applyItalic(root: HTMLElement): void {
    this.toggleInline(root, INLINE_TAGS.italic);
  }

  applyUnderline(root: HTMLElement): void {
    this.toggleInline(root, INLINE_TAGS.underline);
  }

  applyBulletList(root: HTMLElement): void {
    this.toggleList(root, 'ul');
  }

  applyOrderedList(root: HTMLElement): void {
    this.toggleList(root, 'ol');
  }

  applyBlockquote(root: HTMLElement): void {
    this.toggleBlockWrap(root, 'blockquote');
  }

  applyCodeBlock(root: HTMLElement): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const anchor = range.commonAncestorContainer;
    const existing = this.selection.findAncestor(anchor, ['pre']);
    if (existing) {
      this.unwrapBlock(existing, 'p');
      return;
    }
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    if (range.collapsed) {
      code.textContent = 'Code here';
      pre.appendChild(code);
      range.insertNode(pre);
    } else {
      const text = range.toString() || 'Code here';
      code.textContent = text;
      pre.appendChild(code);
      range.deleteContents();
      range.insertNode(pre);
    }
    this.placeCaretAfter(pre);
  }

  applyFormatBlock(root: HTMLElement, format: BlockFormat): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const block = this.getBlockElement(range, root);
    if (!block) {
      const el = document.createElement(format);
      if (range.collapsed) {
        el.innerHTML = '<br>';
        range.insertNode(el);
      } else {
        const frag = range.extractContents();
        el.appendChild(frag);
        range.insertNode(el);
      }
      this.placeCaretEnd(el);
      return;
    }
    if (block.tagName.toLowerCase() === format) return;
    const replacement = document.createElement(format);
    while (block.firstChild) {
      replacement.appendChild(block.firstChild);
    }
    if (!replacement.childNodes.length) {
      replacement.innerHTML = '<br>';
    }
    block.replaceWith(replacement);
    this.placeCaretEnd(replacement);
  }

  applyLink(root: HTMLElement): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const url = window.prompt('Enter URL:', 'https://');
    if (!url?.trim()) return;
    const safeUrl = url.trim();
    if (range.collapsed) {
      const a = document.createElement('a');
      a.href = safeUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = safeUrl;
      range.insertNode(a);
      return;
    }
    const a = document.createElement('a');
    a.href = safeUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    try {
      range.surroundContents(a);
    } catch {
      const frag = range.extractContents();
      a.appendChild(frag);
      range.insertNode(a);
    }
  }

  insertImage(root: HTMLElement, url: string, alt = 'Image'): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    range.collapse(false);
    range.insertNode(img);
    const spacer = document.createTextNode('\u00a0');
    img.after(spacer);
    this.placeCaretAfter(spacer);
  }

  insertHtmlAtSelection(root: HTMLElement, html: string): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const clean = sanitizeEditorHtml(html);
    const tpl = document.createElement('template');
    tpl.innerHTML = clean;
    const frag = tpl.content;
    range.deleteContents();
    range.insertNode(frag);
    range.collapse(false);
    this.selection.saveSelection(root);
  }

  insertPlainTextAtSelection(root: HTMLElement, text: string): void {
    const range = this.ensureRange(root);
    if (!range) return;
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    this.selection.saveSelection(root);
  }

  private toggleInline(root: HTMLElement, tag: string): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const existing = this.selection.findAncestor(range.commonAncestorContainer, [tag, tag === 'strong' ? 'b' : tag, tag === 'em' ? 'i' : tag]);
    if (existing) {
      this.unwrapElement(existing);
      return;
    }
    const el = document.createElement(tag);
    if (range.collapsed) {
      el.appendChild(document.createTextNode('\u200b'));
      range.insertNode(el);
      this.placeCaretEnd(el);
      return;
    }
    try {
      range.surroundContents(el);
    } catch {
      const contents = range.extractContents();
      el.appendChild(contents);
      range.insertNode(el);
    }
    this.selection.saveSelection(root);
  }

  private toggleList(root: HTMLElement, listTag: 'ul' | 'ol'): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const existing = this.selection.findAncestor(range.commonAncestorContainer, [listTag]);
    if (existing) {
      this.unwrapList(existing as HTMLOListElement | HTMLUListElement);
      return;
    }
    const other = listTag === 'ul' ? 'ol' : 'ul';
    const otherList = this.selection.findAncestor(range.commonAncestorContainer, [other]);
    if (otherList) {
      const replacement = document.createElement(listTag);
      replacement.innerHTML = otherList.innerHTML;
      otherList.replaceWith(replacement);
      return;
    }
    const li = document.createElement('li');
    if (range.collapsed) {
      li.innerHTML = '<br>';
    } else {
      const frag = range.extractContents();
      li.appendChild(frag);
    }
    const list = document.createElement(listTag);
    list.appendChild(li);
    range.insertNode(list);
    this.placeCaretEnd(li);
  }

  private toggleBlockWrap(root: HTMLElement, tag: string): void {
    const range = this.ensureRange(root);
    if (!range) return;
    const existing = this.selection.findAncestor(range.commonAncestorContainer, [tag]);
    if (existing) {
      this.unwrapBlock(existing, 'p');
      return;
    }
    const block = this.getBlockElement(range, root) ?? this.wrapRangeInBlock(range, root);
    if (!block) return;
    const wrapper = document.createElement(tag);
    block.replaceWith(wrapper);
    wrapper.appendChild(block);
    this.placeCaretEnd(wrapper);
  }

  private unwrapList(list: HTMLUListElement | HTMLOListElement): void {
    const parent = list.parentNode;
    if (!parent) return;
    const items = Array.from(list.querySelectorAll(':scope > li'));
    const frag = document.createDocumentFragment();
    for (const li of items) {
      const p = document.createElement('p');
      p.innerHTML = li.innerHTML || '<br>';
      frag.appendChild(p);
    }
    list.replaceWith(frag);
  }

  private unwrapBlock(el: HTMLElement, replaceTag: string): void {
    const p = document.createElement(replaceTag);
    p.innerHTML = el.innerHTML;
    el.replaceWith(p);
    this.placeCaretEnd(p);
  }

  private unwrapElement(el: HTMLElement): void {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  }

  private wrapRangeInBlock(range: Range, root: HTMLElement): HTMLElement {
    const p = document.createElement('p');
    if (range.collapsed) {
      p.innerHTML = '<br>';
      range.insertNode(p);
    } else {
      const frag = range.extractContents();
      p.appendChild(frag);
      range.insertNode(p);
    }
    return p;
  }

  private getBlockElement(range: Range, root: HTMLElement): HTMLElement | null {
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    while (node && node !== root) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (BLOCK_TAGS.includes(tag as BlockFormat) || tag === 'li' || tag === 'blockquote' || tag === 'pre') {
          if (tag === 'li') {
            return el;
          }
          return el;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  private detectBlockFormat(anchor: HTMLElement): BlockFormat {
    const block = this.selection.findAncestor(anchor, ['h1', 'h2', 'h3', 'p']);
    const tag = block?.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      return tag;
    }
    return 'p';
  }

  private ensureRange(root: HTMLElement): Range | null {
    this.selection.restoreSelection();
    let range = this.selection.getRange(false);
    if (!range) {
      this.selection.focusEnd(root);
      range = this.selection.getRange(false);
    }
    return range;
  }

  private placeCaretEnd(el: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private placeCaretAfter(node: Node): void {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
