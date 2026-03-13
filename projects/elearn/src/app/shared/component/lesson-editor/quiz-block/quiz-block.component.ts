import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QuizBlock } from '../../../models/lesson-content.model';

export type QuizBlockMode = 'author' | 'preview' | 'student';

@Component({
    selector: 'app-quiz-block',
    templateUrl: './quiz-block.component.html',
    styleUrls: ['./quiz-block.component.scss'],
    standalone: false
})
export class QuizBlockComponent {
  @Input() block: QuizBlock;
  @Input() mode: QuizBlockMode = 'author';
  @Output() blockChange = new EventEmitter<Partial<QuizBlock>>();

  onQuizIdChange(value: string): void {
    this.blockChange.emit({ quizId: value || undefined });
  }

  onTitleChange(value: string): void {
    this.blockChange.emit({ title: value });
  }

  onInstructionsChange(value: string): void {
    this.blockChange.emit({ instructions: value });
  }

  get isEditable(): boolean {
    return this.mode === 'author';
  }
}
