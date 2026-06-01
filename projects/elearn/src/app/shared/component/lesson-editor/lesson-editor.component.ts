import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import {
  LessonContent,
  LessonBlock,
  LessonBlockType,
  TextBlock,
  VideoBlock,
  QuizBlock,
  AssignmentBlock,
  generateBlockId,
  EMPTY_LESSON_CONTENT,
  parseLessonContent,
  serializeLessonContent
} from '../../models/lesson-content.model';
import { BlockSelectionService } from './block-selection.service';

export type LessonEditorMode = 'author' | 'preview' | 'student';

@Component({
    selector: 'app-lesson-editor',
    templateUrl: './lesson-editor.component.html',
    styleUrls: ['./lesson-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
    providers: [BlockSelectionService]
})
export class LessonEditorComponent {
  @Input() set content(value: LessonContent | string | null | undefined) {
    this._lessonContent = typeof value === 'string' ? parseLessonContent(value) : (value || { ...EMPTY_LESSON_CONTENT });
    this._lessonContent.blocks = this._lessonContent.blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    this.maybeAutoStartTextBlock();
    this.cdr.markForCheck();
  }
  get lessonContent(): LessonContent {
    return this._lessonContent;
  }

  @Input() mode: LessonEditorMode = 'author';
  /** When set, only these block types are shown in toolbar and rendered (e.g. ['text'] for question answer fields). */
  @Input() allowedBlockTypes?: LessonBlockType[];
  /** When true and author mode with text-only blocks, starts with one empty text block. */
  @Input() autoStartTextBlock = false;
  /** Placeholder for empty text blocks in author mode. */
  @Input() textPlaceholder?: string;
  /** Optional: (file) => Observable<url>. Enables inline + block image upload in text blocks. */
  @Input() uploadImage?: (file: File) => import('rxjs').Observable<string>;
  /** Optional: (url) => Observable<void>. Enables block image delete from S3. */
  @Input() deleteImage?: (url: string) => import('rxjs').Observable<unknown>;
  @Output() contentChange = new EventEmitter<LessonContent>();
  @Output() jsonChange = new EventEmitter<string>();
  /** Emits true when any block image upload is in progress (disable Update button). */
  @Output() uploadInProgressChange = new EventEmitter<boolean>();

  _lessonContent: LessonContent = { ...EMPTY_LESSON_CONTENT };
  private _uploadCount = 0;
  private _autoStartApplied = false;

  constructor(
    private cdr: ChangeDetectorRef,
    public blockSelection: BlockSelectionService
  ) {}

  /** Arrow function to maintain `this` binding when passed to child components */
  onUploadStateChange = (inProgress: boolean): void => {
    this._uploadCount += inProgress ? 1 : -1;
    if (this._uploadCount < 0) this._uploadCount = 0;
    this.uploadInProgressChange.emit(this._uploadCount > 0);
  };

  get blocks(): LessonBlock[] {
    const sorted = this.lessonContent.blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.allowedBlockTypes?.length) {
      return sorted.filter(b => this.allowedBlockTypes!.includes(b.type));
    }
    return sorted;
  }

  isBlockTypeAllowed(type: LessonBlockType): boolean {
    if (!this.allowedBlockTypes?.length) return true;
    return this.allowedBlockTypes.includes(type);
  }

  get isAuthorMode(): boolean {
    return this.mode === 'author';
  }

  private maybeAutoStartTextBlock(): void {
    if (
      this._autoStartApplied ||
      !this.autoStartTextBlock ||
      this.mode !== 'author' ||
      this._lessonContent.blocks.length > 0
    ) {
      return;
    }
    const textOnly =
      !this.allowedBlockTypes?.length ||
      (this.allowedBlockTypes.length === 1 && this.allowedBlockTypes[0] === 'text');
    if (!textOnly) return;
    this._autoStartApplied = true;
    this.addBlock('text');
  }

  addBlock(type: LessonBlockType): void {
    if (this.allowedBlockTypes?.length && !this.allowedBlockTypes.includes(type)) return;
    const order = this.lessonContent.blocks.length;
    const id = generateBlockId();
    let block: LessonBlock;
    switch (type) {
      case 'text':
        block = { id, type: 'text', sortOrder: order, content: '', imageUrl: null };
        break;
      case 'video':
        block = { id, type: 'video', sortOrder: order, url: '' };
        break;
      case 'quiz':
        block = { id, type: 'quiz', sortOrder: order };
        break;
      case 'assignment':
        block = { id, type: 'assignment', sortOrder: order, instructions: '' };
        break;
      default:
        return;
    }
    this._lessonContent.blocks = [...this.lessonContent.blocks, block];
    this.emitChange();
    this.cdr.markForCheck();
  }

  removeBlock(blockId: string): void {
    this._lessonContent.blocks = this.lessonContent.blocks.filter(b => b.id !== blockId);
    this.reorderSortOrders();
    this.emitChange();
    this.cdr.markForCheck();
  }

  updateBlock(blockId: string, patch: Partial<LessonBlock>): void {
    const idx = this.lessonContent.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const block = this.lessonContent.blocks[idx];
    const updated = { ...block, ...patch } as LessonBlock;
    this._lessonContent.blocks = this.lessonContent.blocks.slice();
    this._lessonContent.blocks[idx] = updated;
    this.emitChange();
    this.cdr.markForCheck();
  }

  onTextContentChange(blockId: string, content: string): void {
    this.updateBlock(blockId, { content } as Partial<TextBlock>);
  }

  onTextImageUrlChange(blockId: string, imageUrl: string | null): void {
    this.updateBlock(blockId, { imageUrl: imageUrl ?? undefined } as Partial<TextBlock>);
  }

  private reorderSortOrders(): void {
    this._lessonContent.blocks.forEach((b, i) => { b.sortOrder = i; });
  }

  private emitChange(): void {
    let blocks = this.lessonContent.blocks;
    if (this.allowedBlockTypes?.length) {
      blocks = blocks.filter(b => this.allowedBlockTypes!.includes(b.type));
    }
    const content = { ...this.lessonContent, blocks };
    this.contentChange.emit(content);
    this.jsonChange.emit(serializeLessonContent(content));
  }

  getJson(): string {
    return serializeLessonContent(this.lessonContent);
  }

  trackByBlockId(_index: number, block: LessonBlock): string {
    return block.id;
  }

  isTextBlock(b: LessonBlock): b is TextBlock {
    return b.type === 'text';
  }
  isVideoBlock(b: LessonBlock): b is VideoBlock {
    return b.type === 'video';
  }
  isQuizBlock(b: LessonBlock): b is QuizBlock {
    return b.type === 'quiz';
  }
  isAssignmentBlock(b: LessonBlock): b is AssignmentBlock {
    return b.type === 'assignment';
  }

  /** Clear block selection when clicking the blocks container background (not on a block) */
  onBlocksAreaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target?.classList?.contains('lesson-editor__blocks')) {
      this.blockSelection.clearActiveBlock();
    }
  }

  onFormatBlock(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select?.value) {
      this.blockSelection.formatBlockForTextBlock(select.value);
    }
  }

  onInsertLink(): void {
    this.blockSelection.insertLinkForTextBlock();
  }

  onInsertImage(): void {
    this.blockSelection.insertImageForTextBlock();
  }

  onInsertCodeBlock(): void {
    this.blockSelection.insertCodeBlockForTextBlock();
  }

  onInsertTable(): void {
    this.blockSelection.insertTableForTextBlock();
  }
}
