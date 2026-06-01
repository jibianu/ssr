import { Injectable } from '@angular/core';

/**
 * Saves and restores Selection/Range across toolbar interactions
 * (buttons steal focus from contenteditable).
 */
@Injectable()
export class SelectionManagerService {
  private savedRange: Range | null = null;
  private activeRoot: HTMLElement | null = null;

  setActiveRoot(root: HTMLElement | null): void {
    this.activeRoot = root;
  }

  saveSelection(root?: HTMLElement): void {
    const el = root ?? this.activeRoot;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el) {
      return;
    }
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) {
      return;
    }
    this.savedRange = range.cloneRange();
  }

  restoreSelection(): boolean {
    if (!this.savedRange) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(this.savedRange);
    return true;
  }

  getRange(preferSaved = true): Range | null {
    if (preferSaved && this.savedRange) {
      return this.savedRange.cloneRange();
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (this.activeRoot && !this.activeRoot.contains(range.commonAncestorContainer)) {
      return null;
    }
    return range.cloneRange();
  }

  focusEnd(root: HTMLElement): void {
    root.focus();
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    this.saveSelection(root);
  }

  findAncestor(node: Node | null, tagNames: string[]): HTMLElement | null {
    let current: Node | null = node;
    const tags = tagNames.map((t) => t.toUpperCase());
    while (current && current !== this.activeRoot) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as HTMLElement;
        if (tags.includes(el.tagName)) {
          return el;
        }
      }
      current = current.parentNode;
    }
    return null;
  }

  getSelectedElement(): HTMLElement | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    return node?.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : (node?.parentElement ?? null);
  }
}
