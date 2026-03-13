import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LessonBlockType } from '../../models/lesson-content.model';

export interface ActiveBlock {
  blockId: string;
  blockType: LessonBlockType;
}

/** Callback for text block execCommand - registered when text block is focused */
export type TextBlockExecCmdFn = (cmd: string, value?: string) => void;

export interface TextBlockEditorCallbacks {
  execCmd: TextBlockExecCmdFn;
  insertLink?: () => void;
  insertImage?: () => void;
  insertCodeBlock?: () => void;
  insertTable?: () => void;
}

@Injectable()
export class BlockSelectionService {
  private readonly activeBlock$ = new BehaviorSubject<ActiveBlock | null>(null);
  private textBlockEditor: { blockId: string; callbacks: TextBlockEditorCallbacks } | null = null;

  readonly activeBlock = this.activeBlock$.asObservable();

  get activeBlockId(): string | null {
    return this.activeBlock$.value?.blockId ?? null;
  }

  get activeBlockType(): LessonBlockType | null {
    return this.activeBlock$.value?.blockType ?? null;
  }

  setActiveBlock(blockId: string, blockType: LessonBlockType): void {
    const current = this.activeBlock$.value;
    if (current?.blockId === blockId && current?.blockType === blockType) {
      return;
    }
    if (blockType !== 'text') {
      this.clearTextBlockEditor();
    }
    this.activeBlock$.next({ blockId, blockType });
  }

  clearActiveBlock(): void {
    this.clearTextBlockEditor();
    this.activeBlock$.next(null);
  }

  /** Register text block editor when focused – enables navbar toolbar to run commands */
  registerTextBlockEditor(blockId: string, callbacks: TextBlockEditorCallbacks): void {
    this.textBlockEditor = { blockId, callbacks };
  }

  /** Unregister when text block loses focus */
  unregisterTextBlockEditor(blockId: string): void {
    if (this.textBlockEditor?.blockId === blockId) {
      this.textBlockEditor = null;
    }
  }

  private clearTextBlockEditor(): void {
    this.textBlockEditor = null;
  }

  /** Run execCommand on the active text block – called from navbar toolbar */
  execCmdForTextBlock(cmd: string, value?: string): boolean {
    if (this.textBlockEditor && this.activeBlock$.value?.blockType === 'text') {
      this.textBlockEditor.callbacks.execCmd(cmd, value);
      return true;
    }
    return false;
  }

  formatBlockForTextBlock(tag: string): boolean {
    return this.execCmdForTextBlock('formatBlock', tag);
  }

  insertLinkForTextBlock(): boolean {
    if (this.textBlockEditor?.callbacks.insertLink) {
      this.textBlockEditor.callbacks.insertLink();
      return true;
    }
    return false;
  }

  insertImageForTextBlock(): boolean {
    if (this.textBlockEditor?.callbacks.insertImage) {
      this.textBlockEditor.callbacks.insertImage();
      return true;
    }
    return false;
  }

  insertCodeBlockForTextBlock(): boolean {
    if (this.textBlockEditor?.callbacks.insertCodeBlock) {
      this.textBlockEditor.callbacks.insertCodeBlock();
      return true;
    }
    return false;
  }

  insertTableForTextBlock(): boolean {
    if (this.textBlockEditor?.callbacks.insertTable) {
      this.textBlockEditor.callbacks.insertTable();
      return true;
    }
    return false;
  }

  isTextBlockActive(blockId: string): boolean {
    const v = this.activeBlock$.value;
    return v?.blockType === 'text' && v?.blockId === blockId;
  }
}
