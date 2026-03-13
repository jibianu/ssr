import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AssignmentBlock } from '../../../models/lesson-content.model';

export type AssignmentBlockMode = 'author' | 'preview' | 'student';

@Component({
    selector: 'app-assignment-block',
    templateUrl: './assignment-block.component.html',
    styleUrls: ['./assignment-block.component.scss'],
    standalone: false
})
export class AssignmentBlockComponent {
  @Input() block: AssignmentBlock;
  @Input() mode: AssignmentBlockMode = 'author';
  @Output() blockChange = new EventEmitter<Partial<AssignmentBlock>>();

  onTitleChange(value: string): void {
    this.blockChange.emit({ title: value });
  }

  onInstructionsChange(value: string): void {
    this.blockChange.emit({ instructions: value });
  }

  onAllowFileUploadChange(checked: boolean): void {
    this.blockChange.emit({ allowFileUpload: checked });
  }

  onAllowExternalLinkChange(checked: boolean): void {
    this.blockChange.emit({ allowExternalLink: checked });
  }

  get isEditable(): boolean {
    return this.mode === 'author';
  }
}
