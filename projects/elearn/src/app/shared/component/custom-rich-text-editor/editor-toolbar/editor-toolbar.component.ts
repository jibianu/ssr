import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BlockFormat,
  BLOCK_FORMAT_LABELS,
  EditorCommand,
  ToolbarState
} from '../models/editor-types';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-toolbar.component.html',
  styleUrls: ['./editor-toolbar.component.scss']
})
export class EditorToolbarComponent {
  @Input() state: ToolbarState = {
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
  @Input() disabled = false;
  @Input() imageEnabled = true;

  @Output() command = new EventEmitter<EditorCommand>();
  @Output() formatBlock = new EventEmitter<BlockFormat>();

  readonly formatOptions: BlockFormat[] = ['p', 'h1', 'h2', 'h3'];
  readonly formatLabels = BLOCK_FORMAT_LABELS;

  onCommand(cmd: EditorCommand, event: MouseEvent): void {
    event.preventDefault();
    if (this.disabled) return;
    this.command.emit(cmd);
  }

  onFormatChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BlockFormat;
    this.formatBlock.emit(value);
  }
}
