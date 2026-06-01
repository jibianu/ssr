import { Injectable } from '@angular/core';
import { EditorSnapshot } from '../models/editor-types';

const MAX_HISTORY = 80;

@Injectable()
export class RichTextHistoryService {
  private undoStack: EditorSnapshot[] = [];
  private redoStack: EditorSnapshot[] = [];
  private lastPushed: EditorSnapshot | null = null;

  reset(initial: EditorSnapshot): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastPushed = { ...initial };
  }

  push(snapshot: EditorSnapshot): void {
    if (!this.lastPushed) {
      this.lastPushed = { ...snapshot };
      return;
    }
    if (
      this.lastPushed.titleHtml === snapshot.titleHtml &&
      this.lastPushed.bodyHtml === snapshot.bodyHtml
    ) {
      return;
    }
    this.undoStack.push({ ...this.lastPushed });
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.lastPushed = { ...snapshot };
  }

  undo(current: EditorSnapshot): EditorSnapshot | null {
    if (!this.undoStack.length) return null;
    this.redoStack.push({ ...current });
    const prev = this.undoStack.pop()!;
    this.lastPushed = { ...prev };
    return prev;
  }

  redo(current: EditorSnapshot): EditorSnapshot | null {
    if (!this.redoStack.length) return null;
    this.undoStack.push({ ...current });
    const next = this.redoStack.pop()!;
    this.lastPushed = { ...next };
    return next;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
